# app/api/images.py

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import Optional, Any
import json
import os
import glob
from datetime import datetime
from fastapi.responses import FileResponse

from app.controllers.image_controller import (
    create_image as create_image_record,
    get_images_by_user,
    get_user_image
)
from app.storage.image_storage import save_medical_image, extract_medical_metadata
from app.database.repository import get_db
from app.models.image import Image
from app.models.patient import Patient

# Segmentación
from app.services.segmentation_client import segmentation_client
from app.controllers.diagnosis_controller import save_diagnosis

router = APIRouter()

MAX_FILE_SIZE = 500 * 1024 * 1024

ALLOWED_MIME_TYPES = [
    "image/png", "image/jpeg", "image/gif",
    "application/dicom", "application/octet-stream", "application/x-dicom",
    "application/zip", "application/gzip", "application/x-nifti",
    "application/x-gzip"
]


# ============================================================
# ✅ HELPERS (IMPORTANTES PARA QUE NO QUEDE NULL)
# ============================================================

def _parse_unique_classes(val):
    """
    El micro puede devolver:
    - "0,1,2,3" (string)
    - [0,1,2,3] (lista)
    - None
    """
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return []
        return [x.strip() for x in s.split(",") if x.strip() != ""]
    return []


def _json_str(v: Any, default: str = "[]") -> str:
    """
    Convierte listas/dicts/números a string JSON.
    Esto es CRÍTICO porque tus columnas son String(100)/String(50).
    """
    if v is None:
        return default
    try:
        # Si ya es string, lo devolvemos tal cual
        if isinstance(v, str):
            s = v.strip()
            return s if s else default
        return json.dumps(v, ensure_ascii=False)
    except Exception:
        # fallback
        return str(v) if v is not None else default


def _to_int(v: Any, default: int = 0) -> int:
    try:
        if v is None:
            return default
        return int(v)
    except Exception:
        return default


def _to_float(v: Any, default: float = 0.0) -> float:
    try:
        if v is None:
            return default
        return float(v)
    except Exception:
        return default


# ============================================================
# 📤 SUBIR IMAGEN (user_id = 1 SIEMPRE)
# ============================================================
@router.post("/upload/", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    modality: Optional[str] = Form(None),
    body_part: Optional[str] = Form(None),
    scan_type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    patient_id: Optional[str] = Form(None),
    clinical_reason: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    USER_ID = 1  # usuario fijo

    # Leer archivo
    file_data = await file.read()

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(415, f"Formato no soportado: {file.content_type}")

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(400, "Archivo mayor a 500MB")

    # Validar paciente
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Paciente no encontrado")

    # Guardar imagen física
    file_path, file_size, file_type = save_medical_image(
        file_data, file.filename, USER_ID, "Usuario Fijo", patient_id, patient.full_name
    )

    # Extraer metadata
    medical_metadata = extract_medical_metadata(file_data, file.filename)

    final_modality = modality or medical_metadata.get("modality")
    final_body_part = body_part or medical_metadata.get("body_part")
    final_scan_type = scan_type or medical_metadata.get("scan_type")

    if description:
        medical_metadata["user_description"] = description
        medical_metadata["description_date"] = datetime.now().isoformat()

    # Determinar formato
    if file.filename.lower().endswith((".nii", ".nii.gz")):
        file_format = "NIfTI"
    elif file.content_type in ["application/dicom", "application/x-dicom"]:
        file_format = "DICOM"
    else:
        file_format = file.content_type.split("/")[-1].upper()

    # Crear registro en BD
    new_image = create_image_record(
        db=db,
        filename=file.filename,
        path=file_path,
        file_size=file_size,
        file_type=file_type,
        format=file_format,
        user_id=USER_ID,
        modality=final_modality,
        body_part=final_body_part,
        scan_type=final_scan_type,
        scan_metadata=json.dumps(medical_metadata),
        dimensions=medical_metadata.get("dimensions"),
        voxel_spacing=medical_metadata.get("voxel_spacing"),
        orientation=medical_metadata.get("orientation"),
        bit_depth=medical_metadata.get("bit_depth"),
        num_slices=medical_metadata.get("num_slices"),
        patient_id=patient.id,
        clinical_reason=clinical_reason,
        study_date=medical_metadata.get("study_date"),
        series_description=medical_metadata.get("series_description"),
    )

    # ============================================================
    # 🧠 SEGMENTACIÓN AUTOMÁTICA (solo NIfTI)
    # ============================================================
    segmentation_info = None

    if file_format == "NIfTI":
        try:
            # Buscar el archivo que acabas de guardar
            pattern = os.path.join(file_path, f"*{file.filename}")
            matching = glob.glob(pattern)
            if not matching:
                raise FileNotFoundError("Archivo no encontrado después de guardar.")
            full_image_path = matching[0]

            print(f"📤 Enviando imagen al microservicio: {full_image_path}")

            # output_dir: carpeta del paciente/consulta (como ya lo tienes)
            segmentation_result = await segmentation_client.predict(
                image_path=full_image_path,
                output_dir=file_path
            )

            print("📥 Respuesta completa del microservicio:")
            print(json.dumps(segmentation_result, indent=2, default=str))

            if not segmentation_result:
                raise RuntimeError("El microservicio devolvió una respuesta vacía.")

            # ============================================================
            # ✅ MAPEO DE PATHS
            # ============================================================
            seg_path_enc = segmentation_result.get("segmentation_path_encrypted")
            seg_path_plain = segmentation_result.get("segmentation_path") or segmentation_result.get("output_path")

            best_path = seg_path_enc or seg_path_plain
            if not best_path:
                raise RuntimeError(
                    "El microservicio no devolvió ni segmentation_path_encrypted ni segmentation_path/output_path."
                )

            # unique_classes
            unique_classes_raw = segmentation_result.get("unique_classes")
            unique_classes_list = _parse_unique_classes(unique_classes_raw)

            metrics = segmentation_result.get("metrics") or {}
            class_details = segmentation_result.get("class_details") or {}

            elapsed_time = (
                segmentation_result.get("elapsed_time_total")
                or segmentation_result.get("elapsed_time")
                or None
            )

            model_name = segmentation_result.get("model") or segmentation_result.get("framework") or "nnU-Net-V2"

            # ============================================================
            # ✅ EXTRAER CLASES
            # ============================================================
            porcentaje_lesion = _to_float(segmentation_result.get("porcentaje_lesion"), 0.0)

            # Clase 0
            clase_0 = class_details.get("0", {})
            clase_0_pixeles = _to_int(segmentation_result.get("clase_0_pixeles") or clase_0.get("pixeles"), 0)

            # Clase 1
            clase_1 = class_details.get("1", {})
            clase_1_pixeles = _to_int(segmentation_result.get("clase_1_pixeles") or clase_1.get("pixeles"), 0)

            # Clase 2
            clase_2 = class_details.get("2", {})
            clase_2_pixeles = _to_int(segmentation_result.get("clase_2_pixeles") or clase_2.get("pixeles"), 0)

            # Clase 3
            clase_3 = class_details.get("3", {})
            clase_3_pixeles = _to_int(segmentation_result.get("clase_3_pixeles") or clase_3.get("pixeles"), 0)

            total_pixeles = clase_0_pixeles + clase_1_pixeles + clase_2_pixeles + clase_3_pixeles
            pixeles_con_lesion = clase_1_pixeles + clase_2_pixeles + clase_3_pixeles
            pixeles_sin_lesion = clase_0_pixeles

            # ============================================================
            # ✅ LOS 6 CAMPOS (FORZAR STRING + DEFAULT)
            # ============================================================
            # OJO: Tus columnas son String => aquí SIEMPRE guardamos string
            output_shape_s = _json_str(segmentation_result.get("output_shape"), default="[]")
            mask_shape_s = _json_str(segmentation_result.get("mask_shape"), default="[]")
            mask_3d_shape_s = _json_str(segmentation_result.get("mask_3d_shape"), default="[]")
            original_shape_s = _json_str(segmentation_result.get("original_shape"), default="[]")

            # total_params y num_classes son int
            total_params_i = _to_int(segmentation_result.get("total_params"), 0)

            # Si el micro no manda num_classes, lo forzamos a 4 en nnU-Net
            num_classes_i = _to_int(segmentation_result.get("num_classes"), 4)

            # DEBUG: lo que se va a guardar (importantísimo)
            print("🧪 DEBUG CAMPOS 6 ANTES DE GUARDAR:")
            print("output_shape =", output_shape_s)
            print("mask_shape =", mask_shape_s)
            print("mask_3d_shape =", mask_3d_shape_s)
            print("original_shape =", original_shape_s)
            print("num_classes =", num_classes_i)
            print("total_params =", total_params_i)

            # ============================================================
            # ✅ OBJETO PARA FRONT
            # ============================================================
            segmentation_info = {
                "success": segmentation_result.get("success", True),
                "image_id": new_image.id,
                "message": segmentation_result.get("message", "Segmentación completada"),
                "estado": segmentation_result.get("estado", "PREDICCIÓN COMPLETADA"),
                "download_url": f"/api/diagnosis/download-segmented/{new_image.id}",
                "output_path": best_path,
                "output_path_storage": best_path,
                "elapsed_time": elapsed_time,
                "model": model_name,
                "num_classes_detected": segmentation_result.get("num_classes_detected"),
                "unique_classes": unique_classes_list,
                "class_details": class_details,
                "metrics": metrics,
                "enc_filename": segmentation_result.get("enc_filename"),
                "segmentation_wrapped_key": segmentation_result.get("segmentation_wrapped_key"),
                "segmentation_path_encrypted": seg_path_enc,
            }

            # ============================================================
            # ✅ ACTUALIZAR IMAGE
            # ============================================================
            new_image.processed_path = best_path
            new_image.is_processed = True
            new_image.processing_date = datetime.now()
            db.commit()
            db.refresh(new_image)

            # ============================================================
            # ✅ GUARDAR DIAGNOSIS (AQUÍ ESTÁ EL FIX REAL)
            # ============================================================
            save_diagnosis(
                db=db,
                image_id=new_image.id,
                user_id=USER_ID,
                filename=file.filename,
                file_size=file_size,
                format=file_format,
                patient_id=patient.id,
                identity_id=patient.identity_id,
                full_name=patient.full_name,
                success=True,

                segmentation_path=best_path,
                segmentation_wrapped_key=segmentation_result.get("segmentation_wrapped_key"),
                segmentation_path_encrypted=seg_path_enc,

                unique_classes=",".join(map(str, unique_classes_list)),
                num_classes_detected=_to_int(segmentation_result.get("num_classes_detected"), 0),
                elapsed_time=_to_float(elapsed_time, 0.0),
                model=model_name,

                # ✅ 6 CAMPOS (YA NO QUEDAN NULL POR TIPO)
                output_shape=output_shape_s,
                num_classes=num_classes_i,
                total_params=total_params_i,
                mask_shape=mask_shape_s,
                mask_3d_shape=mask_3d_shape_s,
                original_shape=original_shape_s,

                total_pixeles=total_pixeles,
                pixeles_con_lesion=pixeles_con_lesion,
                pixeles_sin_lesion=pixeles_sin_lesion,
                porcentaje_lesion=porcentaje_lesion,
                estado=segmentation_result.get("estado", "COMPLETADO"),

                # Clase 0
                clase_0_nombre=clase_0.get("nombre"),
                clase_0_sigla=clase_0.get("sigla"),
                clase_0_color=clase_0.get("color"),
                clase_0_descripcion=clase_0.get("descripcion"),
                clase_0_pixeles=clase_0_pixeles,
                clase_0_porcentaje=_to_float(clase_0.get("porcentaje"), 0.0),

                # Clase 1
                clase_1_nombre=clase_1.get("nombre"),
                clase_1_sigla=clase_1.get("sigla"),
                clase_1_color=clase_1.get("color"),
                clase_1_descripcion=clase_1.get("descripcion"),
                clase_1_pixeles=clase_1_pixeles,
                clase_1_porcentaje=_to_float(clase_1.get("porcentaje"), 0.0),

                # Clase 2
                clase_2_nombre=clase_2.get("nombre"),
                clase_2_sigla=clase_2.get("sigla"),
                clase_2_color=clase_2.get("color"),
                clase_2_descripcion=clase_2.get("descripcion"),
                clase_2_pixeles=clase_2_pixeles,
                clase_2_porcentaje=_to_float(clase_2.get("porcentaje"), 0.0),

                # Clase 3
                clase_3_nombre=clase_3.get("nombre"),
                clase_3_sigla=clase_3.get("sigla"),
                clase_3_color=clase_3.get("color"),
                clase_3_descripcion=clase_3.get("descripcion"),
                clase_3_pixeles=clase_3_pixeles,
                clase_3_porcentaje=_to_float(clase_3.get("porcentaje"), 0.0),
            )

            print("✅ Diagnóstico guardado (incluye 6 campos)")

        except Exception as e:
            print(f"❌ Error en segmentación: {e}")
            import traceback
            print(traceback.format_exc())
            segmentation_info = {"success": False, "error": str(e)}

    # ============================================================
    # 🔑 RESPUESTA FINAL AL FRONTEND
    # ============================================================
    response_data = {
        "message": "Imagen subida correctamente",
        "image_id": new_image.id,
        "filename": new_image.filename,
        "format": new_image.format,
        "patient": {
            "id": patient.id,
            "identity_id": patient.identity_id,
            "full_name": patient.full_name
        },
        "segmentation": segmentation_info
    }

    print("📤 Respuesta final al frontend:")
    print(json.dumps(response_data, indent=2, default=str))

    return response_data


# ============================================================
# 📥 Obtener imágenes del usuario fijo (1)
# ============================================================
@router.get("/user/images")
def get_user_images(db: Session = Depends(get_db)):
    images = get_images_by_user(1, db)

    return {
        "total": len(images),
        "images": [
            {
                "id": img.id,
                "filename": img.filename,
                "processed_path": img.processed_path,
                "format": img.format
            }
            for img in images
        ]
    }


# ============================================================
# 📑 Obtener imagen por ID
# ============================================================
@router.get("/{image_id}")
def get_image(image_id: int, db: Session = Depends(get_db)):

    image = get_user_image(image_id, 1, db)

    metadata = {}
    if image.scan_metadata:
        try:
            metadata = json.loads(image.scan_metadata)
        except Exception:
            metadata = {"raw": image.scan_metadata}

    return {"image": image, "metadata": metadata}


# ============================================================
# 📥 Descargar imagen
# ============================================================
@router.get("/download/{image_id}")
async def download_image(image_id: int, db: Session = Depends(get_db)):

    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(404, "Imagen no encontrada")

    full_path = os.path.join(image.path, image.filename)

    if not os.path.exists(full_path):
        pattern = os.path.join(image.path, f"*{image.filename}")
        files = glob.glob(pattern)
        if not files:
            raise HTTPException(404, "Archivo inexistente")
        full_path = files[0]

    return FileResponse(full_path, filename=image.filename)


# ============================================================
# 📄 Listar TODAS las imágenes
# ============================================================
@router.get("/")
def get_all_images(db: Session = Depends(get_db)):
    images = db.query(Image).all()

    return {
        "total": len(images),
        "images": [
            {
                "id": img.id,
                "filename": img.filename,
                "path": img.path,
                "patient_id": img.patient_id,
                "user_id": img.user_id
            }
            for img in images
        ]
    }
