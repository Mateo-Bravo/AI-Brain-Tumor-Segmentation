# app/api/diagnosis.py

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.repository import get_db
from app.models.diagnosis import Diagnosis
from app.models.image import Image
from app.controllers.diagnosis_controller import (
    get_diagnoses_by_user,
    run_nnunet_and_save_diagnosis
)

import os
import glob
from typing import Optional

# ✅ cargar .env si existe
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

router = APIRouter()
DEFAULT_USER_ID = 1


# -----------------------------
# Helpers
# -----------------------------
def _is_nifti(path: str) -> bool:
    p = (path or "").lower()
    return p.endswith(".nii") or p.endswith(".nii.gz")


def _normalize_image_dir(image: Image) -> Optional[str]:
    """
    image.path puede ser:
    - carpeta
    - path completo al archivo
    - path "virtual" (igual devolvemos dirname)
    """
    if not image or not image.path:
        return None

    if os.path.isdir(image.path):
        return image.path

    if os.path.isfile(image.path):
        return os.path.dirname(image.path)

    return os.path.dirname(image.path)


def _basename_without_niigz(name: str) -> str:
    """
    BraTS.nii.gz -> BraTS
    BraTS.nii -> BraTS
    """
    if not name:
        return ""
    n = name
    if n.lower().endswith(".nii.gz"):
        return n[:-7]
    if n.lower().endswith(".nii"):
        return n[:-4]
    return os.path.splitext(n)[0]


def _try_find_segmented_from_disk(image: Image) -> Optional[str]:
    """
    Fallback: busca segmentación en la carpeta del estudio.
    Acepta:
    - *.nii / *.nii.gz
    - *.nii.gz.enc (cifrado)
    """
    if not image:
        return None

    image_dir = _normalize_image_dir(image)
    if not image_dir:
        return None

    base = _basename_without_niigz(image.filename or "")

    patterns = [
        # segmentados típicos
        os.path.join(image_dir, f"*{base}*seg*.nii*"),
        os.path.join(image_dir, f"*{base}*segment*.nii*"),
        os.path.join(image_dir, f"*{base}*seg*.enc"),
        os.path.join(image_dir, f"*{base}*segment*.enc"),

        # fallback por nombre
        os.path.join(image_dir, f"*{base}*.nii*"),
        os.path.join(image_dir, f"*{base}*.enc"),

        # último fallback: cualquier cosa que parezca seg
        os.path.join(image_dir, "*seg*.nii*"),
        os.path.join(image_dir, "*segment*.nii*"),
        os.path.join(image_dir, "*seg*.enc"),
        os.path.join(image_dir, "*segment*.enc"),
    ]

    candidates = []
    for pat in patterns:
        candidates += glob.glob(pat)

    candidates = [c for c in candidates if os.path.isfile(c)]
    if not candidates:
        return None

    seg_first = [
        c for c in candidates
        if ("seg" in os.path.basename(c).lower() or "segment" in os.path.basename(c).lower())
    ]
    return seg_first[0] if seg_first else candidates[0]


def _resolve_segmentation_path(db: Session, image_id: int) -> str:
    """
    Orden de prioridad:
    1) diagnosis.segmentation_path / output_path_storage / output_path (si existe y está en disco)
    2) image.processed_path (si existe y está en disco)
    3) búsqueda en carpeta del estudio (fallback)
    """
    diagnosis = db.query(Diagnosis).filter(Diagnosis.image_id == image_id).first()

    if diagnosis:
        for attr in ["segmentation_path", "output_path_storage", "output_path"]:
            val = getattr(diagnosis, attr, None)
            if val and os.path.isfile(val):
                return val

    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    processed = getattr(image, "processed_path", None)
    if processed and os.path.isfile(processed):
        return processed

    inferred = _try_find_segmented_from_disk(image)
    if inferred:
        return inferred

    raise HTTPException(status_code=404, detail="No se encontró segmentación para esta imagen")


def _get_wrapped_key_from_db(db: Session, image_id: int) -> Optional[str]:
    """
    Busca el wrapped_key en Diagnosis.
    Debes tener columna diagnosis.segmentation_wrapped_key para que funcione.
    """
    diagnosis = db.query(Diagnosis).filter(Diagnosis.image_id == image_id).first()
    if not diagnosis:
        return None

    for attr in ["segmentation_wrapped_key", "wrapped_key", "enc_wrapped_key"]:
        val = getattr(diagnosis, attr, None)
        if val and isinstance(val, str) and val.strip():
            return val.strip()
    return None


def _get_master_key() -> Optional[str]:
    """
    ✅ La master key debe ser EXACTAMENTE la misma que usa el micro.
    En tu micro se llama: SEG_ENCRYPTION_KEY
    """
    return (
        os.getenv("SEG_ENCRYPTION_KEY")
        or os.getenv("SEGMENTATION_MASTER_KEY")
        or os.getenv("FERNET_MASTER_KEY")
        or os.getenv("MASTER_KEY")
    )


# ============================================================
# 🧠 Obtener diagnósticos (SIN JWT)
# ============================================================
@router.get("/", summary="Obtener diagnósticos del usuario fijo (ID = 1)")
def get_my_diagnoses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    diagnoses = get_diagnoses_by_user(db, DEFAULT_USER_ID)

    return {
        "user_id": DEFAULT_USER_ID,
        "total": len(diagnoses),
        "diagnoses": [
            {
                "id": d.id,
                "image_id": d.image_id,
                "filename": d.filename,
                "patient_id": d.patient_id,
                "full_name": d.full_name,
                "success": d.success,
                "model": d.model,
                "elapsed_time": d.elapsed_time,
                "estado": d.estado,
                "porcentaje_lesion": d.porcentaje_lesion,
                "num_classes_detected": d.num_classes_detected,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in diagnoses[skip: skip + limit]
        ]
    }


# ============================================================
# 🧠 Ejecutar segmentación nnU-Net (SIN JWT)
# ============================================================
@router.post("/run-nnunet/{image_id}", summary="Ejecutar segmentación nnU-Net")
async def run_nnunet(
    image_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        result = await run_nnunet_and_save_diagnosis(
            db=db,
            image_id=image_id,
            user_id=DEFAULT_USER_ID,
            file=file
        )
        return {"message": "Segmentación nnU-Net ejecutada correctamente", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 🧠 Obtener original + segmentación (SIN JWT)
# ============================================================
@router.get("/view-both/{image_id}")
async def get_original_and_segmentation(image_id: int, db: Session = Depends(get_db)):

    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    seg_path = _resolve_segmentation_path(db, image_id)

    return {
        "image_id": image.id,
        "filename": image.filename,
        "original": {
            "path": image.path,
            "filename": image.filename,
            "download_url": f"/api/diagnosis/download-original/{image.id}"
        },
        "segmentation": {
            "path": seg_path,
            "filename": os.path.basename(seg_path) if seg_path else None,
            "download_url": f"/api/diagnosis/download-segmented/{image.id}"
        },
        "metadata": {
            "upload_date": image.upload_date.isoformat() if getattr(image, "upload_date", None) else None,
            "processing_date": image.processing_date.isoformat() if getattr(image, "processing_date", None) else None,
            "modality": getattr(image, "modality", None),
            "body_part": getattr(image, "body_part", None),
            "format": getattr(image, "format", None)
        }
    }


# ============================================================
# 📥 Descargar ORIGINAL (SIN JWT)
# ============================================================
@router.get("/download-original/{image_id}")
async def download_original_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    if image.path and os.path.isfile(image.path):
        full_path = image.path
        filename = os.path.basename(full_path)
    else:
        full_path = os.path.join(image.path or "", image.filename or "")
        filename = image.filename or os.path.basename(full_path)

    if not os.path.isfile(full_path):
        base = (image.filename or "").replace(".nii.gz", "")
        pattern = os.path.join(image.path or "", f"*{base}*")
        matches = [p for p in glob.glob(pattern) if os.path.isfile(p)]
        if not matches:
            raise HTTPException(status_code=404, detail="Archivo original no encontrado en disco")
        full_path = matches[0]
        filename = os.path.basename(full_path)

    return FileResponse(full_path, filename=filename, media_type="application/octet-stream")


# ============================================================
# 📥 Descargar SEGMENTACIÓN RAW (enc o nii)
# ============================================================
@router.get("/download-segmented-raw/{image_id}")
async def download_segmented_raw(image_id: int, db: Session = Depends(get_db)):
    seg_path = _resolve_segmentation_path(db, image_id)
    if not os.path.isfile(seg_path):
        raise HTTPException(status_code=404, detail=f"Archivo no encontrado: {seg_path}")
    return FileResponse(seg_path, filename=os.path.basename(seg_path), media_type="application/octet-stream")


# ============================================================
# ✅ ENDPOINT PERFECTO: SEGMENTACIÓN DESENCRIPTADA SIN TEMPORALES
#   - Envelope decrypt (wrapped_key)
#   - No crea seg_dec_*
#   - No llena el disco
# ============================================================
@router.get("/download-segmented/{image_id}")
async def download_segmented_decrypted(
    image_id: int,
    wrapped_key: Optional[str] = Query(None, description="wrapped_key si no está en BD"),
    db: Session = Depends(get_db)
):
    from cryptography.fernet import Fernet, InvalidToken
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    seg_path = _resolve_segmentation_path(db, image_id)
    if not os.path.isfile(seg_path):
        raise HTTPException(status_code=404, detail="Archivo segmentado no encontrado")

    # 1) Si NO está cifrado -> devolver directo
    if not seg_path.lower().endswith(".enc"):
        return FileResponse(seg_path, filename=os.path.basename(seg_path), media_type="application/octet-stream")

    # 2) Master key (MISMA DEL MICRO)
    master_key = _get_master_key()
    if not master_key:
        raise HTTPException(
            status_code=500,
            detail="Falta SEG_ENCRYPTION_KEY en el .env del backend (debe ser igual a la del microservicio)."
        )

    # 3) wrapped_key: query -> BD
    if not wrapped_key:
        wrapped_key = _get_wrapped_key_from_db(db, image_id)

    # 4) leer bytes cifrados
    try:
        with open(seg_path, "rb") as f:
            enc_bytes = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo leer el archivo cifrado: {str(e)}")

    # 5) desencriptar en memoria (SIN escribir a disco)
    try:
        if wrapped_key:
            # envelope: master -> data_key -> payload
            fernet_master = Fernet(master_key.encode("utf-8"))
            data_key = fernet_master.decrypt(wrapped_key.encode("utf-8"))  # bytes (44)
            fernet_data = Fernet(data_key)
            plain_bytes = fernet_data.decrypt(enc_bytes)
        else:
            # fallback: cifrado directo con master (solo si tu micro fuera así)
            fernet = Fernet(master_key.encode("utf-8"))
            plain_bytes = fernet.decrypt(enc_bytes)

    except InvalidToken:
        raise HTTPException(
            status_code=500,
            detail="No se pudo desencriptar: token inválido (SEG_ENCRYPTION_KEY incorrecta o wrapped_key incorrecto/no guardado)."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error desencriptando segmentación: {str(e)}")

    # 6) nombre de descarga correcto (quita .enc)
    out_name = os.path.basename(seg_path)
    if out_name.lower().endswith(".enc"):
        out_name = out_name[:-4]  # quita ".enc"

    # 7) stream en memoria + headers (no temporales)
    bio = BytesIO(plain_bytes)
    bio.seek(0)

    headers = {
        "Content-Disposition": f'attachment; filename="{out_name}"'
    }

    return StreamingResponse(
        bio,
        media_type="application/octet-stream",
        headers=headers
    )


# ============================================================
# 🔍 Obtener image + urls (SIN JWT)
# ============================================================
@router.get("/with-diagnosis/{image_id}")
async def get_image_with_diagnosis(image_id: int, db: Session = Depends(get_db)):

    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    diagnosis = db.query(Diagnosis).filter(Diagnosis.image_id == image_id).first()

    return {
        "image": {
            "id": image.id,
            "original_url": f"/api/diagnosis/download-original/{image.id}",
            "segmented_url": f"/api/diagnosis/download-segmented/{image.id}",
            "segmented_raw_url": f"/api/diagnosis/download-segmented-raw/{image.id}",
        },
        "diagnosis": None if not diagnosis else {
            "id": diagnosis.id,
            "estado": diagnosis.estado,
            "porcentaje_lesion": diagnosis.porcentaje_lesion,
            "elapsed_time": diagnosis.elapsed_time,
            "model": diagnosis.model,
        }
    }
