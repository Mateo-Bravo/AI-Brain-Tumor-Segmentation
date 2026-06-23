# app/controllers/diagnosis_controller.py

from sqlalchemy.orm import Session
from app.models.diagnosis import Diagnosis
from typing import Optional, Any, Dict
import httpx
import os
import json
from pathlib import Path
from urllib.parse import urlparse

# ============================================================
# CONFIG (POR ENV para Red1/Red2)
# ============================================================

# Ej: http://172.16.233.119:3020/api/v1
NNUNET_SERVICE_URL = os.getenv("NNUNET_SERVICE_URL", "").strip()

# Ej: http://172.16.233.119:3020
# Se usa para normalizar download_url si el micro devuelve localhost
NNUNET_DOWNLOAD_BASE_URL = os.getenv("NNUNET_DOWNLOAD_BASE_URL", "").strip()

# Carpeta local donde el BACKEND guardará el .enc (en la PC donde corre el backend)
RECEIVED_SEGMENTATIONS_DIR = os.getenv("RECEIVED_SEGMENTATIONS_DIR", "received_segmentations").strip()
Path(RECEIVED_SEGMENTATIONS_DIR).mkdir(parents=True, exist_ok=True)

# API KEY (misma del microservicio)
NNUNET_API_KEY = os.getenv("API_KEY")

if not NNUNET_API_KEY:
    raise RuntimeError(
        "API_KEY no está definida en el .env del backend. "
        "Debe ser la misma que usa el microservicio."
    )

if not NNUNET_SERVICE_URL:
    raise RuntimeError(
        "NNUNET_SERVICE_URL no está definida en el .env del backend. "
        "Ej: NNUNET_SERVICE_URL=http://172.16.233.119:3020/api/v1"
    )

# ============================================================
# HELPERS
# ============================================================

def _json_str(value) -> Optional[str]:
    """Convierte listas/dicts a string JSON para columnas String/Text en SQLAlchemy."""
    if value is None:
        return None
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return str(value)

def _first_present(d: dict, keys: list) -> Optional[object]:
    """Devuelve el primer valor no nulo existente para una lista de keys."""
    for k in keys:
        v = d.get(k)
        if v is not None:
            return v
    return None

def _unique_classes_to_str(unique_classes) -> Optional[str]:
    """Convierte unique_classes (lista) a '0,1,2,3' para tu columna String(50)."""
    if unique_classes is None:
        return None
    if isinstance(unique_classes, list):
        return ",".join(str(x) for x in unique_classes)
    return str(unique_classes)

def _cd(class_details: dict, k: int, field: str, default=None):
    """Extrae campos de class_details['0'..'3']."""  # noqa
    try:
        obj = class_details.get(str(k)) or {}
        return obj.get(field, default)
    except Exception:
        return default

def _normalize_download_url(download_url: str) -> str:
    """
    Si el micro devuelve http://localhost:8000/... o localhost:3020,
    lo reemplazamos por NNUNET_DOWNLOAD_BASE_URL si está configurado.
    """
    if not download_url:
        return download_url

    if not NNUNET_DOWNLOAD_BASE_URL:
        return download_url

    try:
        u = urlparse(download_url)
        base = urlparse(NNUNET_DOWNLOAD_BASE_URL)
        # Conserva path/query del download_url, reemplaza host/port/scheme
        fixed = f"{base.scheme}://{base.netloc}{u.path}"
        if u.query:
            fixed += f"?{u.query}"
        return fixed
    except Exception:
        return download_url

async def _download_encrypted_file(download_url: str, save_as: Path) -> None:
    """
    Descarga el .enc desde el microservicio y lo guarda en disco (PC del backend).
    """
    save_as.parent.mkdir(parents=True, exist_ok=True)

    async with httpx.AsyncClient(timeout=600) as client:
        r = await client.get(download_url)
        r.raise_for_status()
        save_as.write_bytes(r.content)

# ============================================================
# GUARDAR DIAGNÓSTICO
# ============================================================

def save_diagnosis(
    db: Session,
    image_id: int,
    user_id: int,
    filename: str,
    file_size: Optional[int] = None,
    format: Optional[str] = None,
    patient_id: Optional[int] = None,
    identity_id: Optional[str] = None,
    full_name: Optional[str] = None,
    success: bool = False,
    segmentation_path: Optional[str] = None,
    unique_classes: Optional[str] = None,
    num_classes_detected: Optional[int] = None,
    elapsed_time: Optional[float] = None,
    model: Optional[str] = None,
    output_shape: Optional[str] = None,
    num_classes: Optional[int] = None,
    total_params: Optional[int] = None,
    mask_shape: Optional[str] = None,
    mask_3d_shape: Optional[str] = None,
    original_shape: Optional[str] = None,
    total_pixeles: Optional[int] = None,
    pixeles_con_lesion: Optional[int] = None,
    pixeles_sin_lesion: Optional[int] = None,
    porcentaje_lesion: Optional[float] = None,
    estado: Optional[str] = None,

    # ✅ ENVELOPE
    segmentation_wrapped_key: Optional[str] = None,
    segmentation_path_encrypted: Optional[str] = None,

    # Clase 0..3
    clase_0_nombre: Optional[str] = None,
    clase_0_sigla: Optional[str] = None,
    clase_0_color: Optional[str] = None,
    clase_0_descripcion: Optional[str] = None,
    clase_0_pixeles: Optional[int] = None,
    clase_0_porcentaje: Optional[float] = None,

    clase_1_nombre: Optional[str] = None,
    clase_1_sigla: Optional[str] = None,
    clase_1_color: Optional[str] = None,
    clase_1_descripcion: Optional[str] = None,
    clase_1_pixeles: Optional[int] = None,
    clase_1_porcentaje: Optional[float] = None,

    clase_2_nombre: Optional[str] = None,
    clase_2_sigla: Optional[str] = None,
    clase_2_color: Optional[str] = None,
    clase_2_descripcion: Optional[str] = None,
    clase_2_pixeles: Optional[int] = None,
    clase_2_porcentaje: Optional[float] = None,

    clase_3_nombre: Optional[str] = None,
    clase_3_sigla: Optional[str] = None,
    clase_3_color: Optional[str] = None,
    clase_3_descripcion: Optional[str] = None,
    clase_3_pixeles: Optional[int] = None,
    clase_3_porcentaje: Optional[float] = None,
) -> Diagnosis:

    diagnosis = Diagnosis(
        image_id=image_id,
        user_id=user_id,
        filename=filename,
        file_size=file_size,
        format=format,
        patient_id=patient_id,
        identity_id=identity_id,
        full_name=full_name,
        success=success,
        segmentation_path=segmentation_path,
        unique_classes=unique_classes,
        num_classes_detected=num_classes_detected,
        elapsed_time=elapsed_time,
        model=model,
        output_shape=output_shape,
        num_classes=num_classes,
        total_params=total_params,
        mask_shape=mask_shape,
        mask_3d_shape=mask_3d_shape,
        original_shape=original_shape,
        total_pixeles=total_pixeles,
        pixeles_con_lesion=pixeles_con_lesion,
        pixeles_sin_lesion=pixeles_sin_lesion,
        porcentaje_lesion=porcentaje_lesion,
        estado=estado,

        segmentation_wrapped_key=segmentation_wrapped_key,
        segmentation_path_encrypted=segmentation_path_encrypted,

        clase_0_nombre=clase_0_nombre,
        clase_0_sigla=clase_0_sigla,
        clase_0_color=clase_0_color,
        clase_0_descripcion=clase_0_descripcion,
        clase_0_pixeles=clase_0_pixeles,
        clase_0_porcentaje=clase_0_porcentaje,

        clase_1_nombre=clase_1_nombre,
        clase_1_sigla=clase_1_sigla,
        clase_1_color=clase_1_color,
        clase_1_descripcion=clase_1_descripcion,
        clase_1_pixeles=clase_1_pixeles,
        clase_1_porcentaje=clase_1_porcentaje,

        clase_2_nombre=clase_2_nombre,
        clase_2_sigla=clase_2_sigla,
        clase_2_color=clase_2_color,
        clase_2_descripcion=clase_2_descripcion,
        clase_2_pixeles=clase_2_pixeles,
        clase_2_porcentaje=clase_2_porcentaje,

        clase_3_nombre=clase_3_nombre,
        clase_3_sigla=clase_3_sigla,
        clase_3_color=clase_3_color,
        clase_3_descripcion=clase_3_descripcion,
        clase_3_pixeles=clase_3_pixeles,
        clase_3_porcentaje=clase_3_porcentaje,
    )

    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)
    return diagnosis

# ============================================================
# CONSULTAS
# ============================================================

def get_diagnosis_by_id(db: Session, diagnosis_id: int) -> Optional[Diagnosis]:
    return db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id).first()

def get_diagnoses_by_user(db: Session, user_id: int):
    return db.query(Diagnosis).filter(Diagnosis.user_id == user_id).all()

def get_diagnoses_by_image(db: Session, image_id: int):
    return db.query(Diagnosis).filter(Diagnosis.image_id == image_id).all()

# ============================================================
# 🔥 LLAMAR MICROSERVICIO nnU-Net Y GUARDAR DIAGNÓSTICO
# ============================================================

async def run_nnunet_and_save_diagnosis(
    db: Session,
    image_id: int,
    user_id: int,
    file
):
    """
    Flujo RED1->RED2 con guardado LOCAL en el backend:

    1) POST al microservicio (nnU-Net)
    2) Si viene download_url + wrapped_key => descargar .enc y guardarlo en RECEIVED_SEGMENTATIONS_DIR
    3) Guardar en BD:
        - segmentation_path_encrypted (ruta local del backend)
        - segmentation_wrapped_key
        - demás métricas/shapes
    """

    # 1) Llamar microservicio
    async with httpx.AsyncClient(timeout=1800) as client:
        response = await client.post(
            f"{NNUNET_SERVICE_URL}/segment/nnunet",
            headers={"x-api-key": NNUNET_API_KEY},
            files={
                "file": (file.filename, await file.read(), "application/octet-stream")
            },
            data={
                # IMPORTANTE:
                # - En modo REMOTO el micro NO debería necesitar output_dir.
                # - Si lo mandas, que sea opcional.
                # Si tu micro falla si no se manda, déjalo, pero mejor es no depender.
                # "output_dir": "app/storage/segmentations"
            }
        )

    if response.status_code != 200:
        raise Exception(f"Error en microservicio nnU-Net: {response.text}")

    result = response.json() or {}

    # 2) Obtener campos de “delivery”
    download_url = _first_present(result, ["download_url"])
    wrapped_key = _first_present(result, ["segmentation_wrapped_key", "wrapped_key"])
    encrypted_filename = _first_present(result, ["encrypted_filename", "enc_filename", "filename"])

    local_enc_path_str = None

    # Si micro devolvió descarga diferida, bajamos y guardamos en la PC del backend (cliente)
    if download_url and encrypted_filename:
        fixed_url = _normalize_download_url(str(download_url))
        local_enc_path = Path(RECEIVED_SEGMENTATIONS_DIR) / str(encrypted_filename)

        await _download_encrypted_file(fixed_url, local_enc_path)

        local_enc_path_str = str(local_enc_path.resolve())

        # Guardamos también dentro del result para trazabilidad
        result["download_url_fixed"] = fixed_url
        result["saved_local_encrypted_path"] = local_enc_path_str

    # 3) Mapeo robusto para BD
    segmentation_path = _first_present(result, [
        "output_path", "segmentation_path", "output_path_user", "segmentation_file", "segmentation_file_path"
    ])

    elapsed_time = _first_present(result, ["elapsed_time", "elapsed_time_total"])
    unique_classes_str = _unique_classes_to_str(_first_present(result, ["unique_classes"]))
    num_classes_detected = _first_present(result, ["num_classes_detected"])

    output_shape = _first_present(result, ["output_shape"])
    num_classes = _first_present(result, ["num_classes", "num_classes_detected"])
    total_params = _first_present(result, ["total_params"])
    mask_shape = _first_present(result, ["mask_shape"])
    mask_3d_shape = _first_present(result, ["mask_3d_shape", "mask_3dshape"])
    original_shape = _first_present(result, ["original_shape"])

    output_shape_s = _json_str(output_shape)
    mask_shape_s = _json_str(mask_shape)
    mask_3d_shape_s = _json_str(mask_3d_shape)
    original_shape_s = _json_str(original_shape)

    total_pixeles = None
    pixeles_con_lesion = None
    pixeles_sin_lesion = None
    porcentaje_lesion = None
    try:
        cantidad = (result.get("metrics", {}) or {}).get("cantidad_pixeles", {}) or {}
        total_pixeles = cantidad.get("total")
        pixeles_con_lesion = cantidad.get("con_lesion")
        pixeles_sin_lesion = cantidad.get("sin_lesion")
        porcentaje_lesion = cantidad.get("porcentaje_lesion")
    except Exception:
        pass

    class_details = result.get("class_details") or {}

    # ✅ envelope final para BD:
    # - preferimos el archivo guardado localmente (PC backend cliente)
    # - si no hubo descarga, usamos lo que venga del micro
    segmentation_path_encrypted = (
        local_enc_path_str
        or _first_present(result, ["segmentation_path_encrypted", "output_path_encrypted"])
    )

    # 4) Guardar BD
    diagnosis = save_diagnosis(
        db=db,
        image_id=image_id,
        user_id=user_id,
        filename=file.filename,
        success=bool(result.get("success", True)),

        segmentation_path=str(segmentation_path) if segmentation_path is not None else None,
        elapsed_time=float(elapsed_time) if elapsed_time is not None else None,
        model=str(_first_present(result, ["model"])) if _first_present(result, ["model"]) is not None else "nnU-Net",
        estado=str(_first_present(result, ["estado", "status"])) if _first_present(result, ["estado", "status"]) is not None else "COMPLETADO",

        unique_classes=unique_classes_str,
        num_classes_detected=int(num_classes_detected) if num_classes_detected is not None else None,

        output_shape=output_shape_s,
        num_classes=int(num_classes) if num_classes is not None else None,
        total_params=int(total_params) if total_params is not None else 0,
        mask_shape=mask_shape_s,
        mask_3d_shape=mask_3d_shape_s,
        original_shape=original_shape_s,

        total_pixeles=int(total_pixeles) if total_pixeles is not None else None,
        pixeles_con_lesion=int(pixeles_con_lesion) if pixeles_con_lesion is not None else None,
        pixeles_sin_lesion=int(pixeles_sin_lesion) if pixeles_sin_lesion is not None else None,
        porcentaje_lesion=float(porcentaje_lesion) if porcentaje_lesion is not None else None,

        # 🔐 ENVELOPE
        segmentation_wrapped_key=str(wrapped_key) if wrapped_key is not None else None,
        segmentation_path_encrypted=str(segmentation_path_encrypted) if segmentation_path_encrypted is not None else None,

        # clases 0..3
        clase_0_nombre=_cd(class_details, 0, "nombre"),
        clase_0_sigla=_cd(class_details, 0, "sigla"),
        clase_0_color=_cd(class_details, 0, "color"),
        clase_0_descripcion=_cd(class_details, 0, "descripcion"),
        clase_0_pixeles=_cd(class_details, 0, "pixeles"),
        clase_0_porcentaje=_cd(class_details, 0, "porcentaje"),

        clase_1_nombre=_cd(class_details, 1, "nombre"),
        clase_1_sigla=_cd(class_details, 1, "sigla"),
        clase_1_color=_cd(class_details, 1, "color"),
        clase_1_descripcion=_cd(class_details, 1, "descripcion"),
        clase_1_pixeles=_cd(class_details, 1, "pixeles"),
        clase_1_porcentaje=_cd(class_details, 1, "porcentaje"),

        clase_2_nombre=_cd(class_details, 2, "nombre"),
        clase_2_sigla=_cd(class_details, 2, "sigla"),
        clase_2_color=_cd(class_details, 2, "color"),
        clase_2_descripcion=_cd(class_details, 2, "descripcion"),
        clase_2_pixeles=_cd(class_details, 2, "pixeles"),
        clase_2_porcentaje=_cd(class_details, 2, "porcentaje"),

        clase_3_nombre=_cd(class_details, 3, "nombre"),
        clase_3_sigla=_cd(class_details, 3, "sigla"),
        clase_3_color=_cd(class_details, 3, "color"),
        clase_3_descripcion=_cd(class_details, 3, "descripcion"),
        clase_3_pixeles=_cd(class_details, 3, "pixeles"),
        clase_3_porcentaje=_cd(class_details, 3, "porcentaje"),
    )

    return {
        "diagnosis_id": diagnosis.id,
        "segmentation_result": result,
        "saved_local_encrypted_path": local_enc_path_str,
    }
