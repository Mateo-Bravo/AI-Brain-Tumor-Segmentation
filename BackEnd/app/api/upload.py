from fastapi import APIRouter, UploadFile, File, Request, HTTPException
import os
from pathlib import Path
import httpx

router = APIRouter()

# ============================================================
# CONFIG
# ============================================================

# Carpeta donde se guardan las segmentaciones recibidas (en el BACKEND)
SAVE_DIR = os.getenv("RECEIVED_SEGMENTATIONS_DIR", "received_segmentations")
Path(SAVE_DIR).mkdir(parents=True, exist_ok=True)

# URL del microservicio (tu PC servidor). EJ:
# MICROSERVICE_URL=http://172.16.233.119:3020/api/v1/segment/nnunet
MICROSERVICE_URL = os.getenv("MICROSERVICE_URL", "").strip()

# Timeout razonable para redes internas
HTTP_TIMEOUT = float(os.getenv("MICRO_HTTP_TIMEOUT", "120"))  # segundos


@router.post("/upload")
async def upload_segmentation(request: Request, file: UploadFile = File(...)):
    # Capturar IP del cliente que sube al backend (por si lo quieres loguear)
    client_ip = request.client.host if request.client else "unknown"
    print(f"[INFO] Archivo subido desde IP: {client_ip}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No se recibió nombre de archivo")

    # Guardar el archivo recibido en disco
    file_path = os.path.join(SAVE_DIR, file.filename)

    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        print(f"[INFO] Archivo guardado: {file.filename} -> {file_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo guardar el archivo: {e}")

    # Log opcional
    try:
        log_path = os.path.join(SAVE_DIR, "client_ips.log")
        with open(log_path, "a", encoding="utf-8") as log_file:
            log_file.write(f"{file.filename} -> {client_ip}\n")
    except Exception:
        pass

    # Si no quieres reenviar al microservicio, puedes devolver aquí
    # (pero tu objetivo es reenviar para segmentar)
    if not MICROSERVICE_URL:
        return {
            "status": "ok",
            "file": file.filename,
            "path": file_path,
            "client_ip": client_ip,
            "microservice_result": {
                "status": "skipped",
                "detail": "MICROSERVICE_URL no configurada en el ENV"
            },
        }

    # Reenviar al microservicio
    # NOTA: si lo que mandas es una imagen para segmentar, se manda como 'file'
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            # Enviar el archivo como bytes (no hace falta re-open)
            files = {
                "file": (file.filename, content, file.content_type or "application/octet-stream")
            }
            data = {
                "client_ip": client_ip
            }

            resp = await client.post(MICROSERVICE_URL, files=files, data=data)
            resp.raise_for_status()

            # Intentar JSON, si no, texto
            try:
                microservice_result = resp.json()
            except Exception:
                microservice_result = {"status": "ok", "raw": resp.text}

    except httpx.HTTPStatusError as e:
        print(f"[ERROR] Microservicio respondió error: {e.response.status_code} - {e.response.text}")
        microservice_result = {
            "status": "error",
            "detail": f"Microservicio status={e.response.status_code}",
            "body": e.response.text,
        }
    except Exception as e:
        print(f"[ERROR] No se pudo enviar al microservicio: {e}")
        microservice_result = {"status": "error", "detail": str(e)}

    return {
        "status": "ok",
        "file": file.filename,
        "path": file_path,
        "client_ip": client_ip,
        "microservice_result": microservice_result,
    }
