# app/controllers/image_controller.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.image import Image
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import func, Integer
from app.storage.image_storage import delete_image_file
import json


# -------------------
# Crear imagen (SIN USER)
# -------------------
def create_image(
    db: Session,
    filename: str,
    path: str,
    file_size: int,
    file_type: str,
    user_id: int,   # ahora siempre será 1
    format: Optional[str] = None,
    modality: Optional[str] = None,
    body_part: Optional[str] = None,
    scan_type: Optional[str] = None,
    scan_metadata: Optional[Dict[str, Any]] = None,
    dimensions: Optional[str] = None,
    voxel_spacing: Optional[str] = None,
    orientation: Optional[str] = None,
    bit_depth: Optional[int] = None,
    num_slices: Optional[int] = None,
    patient_id: Optional[str] = None,
    clinical_reason: Optional[str] = None,
    study_date: Optional[datetime] = None,
    series_description: Optional[str] = None
) -> Image:
    """Crea un nuevo registro de imagen en la base de datos."""

    # ❗ YA NO HAY USER — Se elimina la validación
    # Se permite user_id=1 directamente

    try:
        scan_metadata_str = (
            json.dumps(scan_metadata)
            if isinstance(scan_metadata, dict)
            else scan_metadata
        )

        new_image = Image(
            filename=filename,
            path=path,
            file_size=file_size,
            file_type=file_type,
            format=format,
            user_id=user_id,   # siempre 1
            modality=modality,
            body_part=body_part,
            scan_type=scan_type,
            is_processed=False,
            scan_metadata=scan_metadata_str,
            dimensions=dimensions,
            voxel_spacing=voxel_spacing,
            orientation=orientation,
            bit_depth=bit_depth,
            num_slices=num_slices,
            patient_id=patient_id,
            clinical_reason=clinical_reason,
            study_date=study_date,
            series_description=series_description,
            processing_date=None
        )

        db.add(new_image)
        db.commit()
        db.refresh(new_image)
        return new_image

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar la imagen: {str(e)}"
        )


# -------------------
# Obtener imágenes
# -------------------
def get_image_by_id(image_id: int, db: Session) -> Optional[Image]:
    return db.query(Image).filter(Image.id == image_id).first()


def get_user_image(image_id: int, user_id: int, db: Session) -> Image:
    image = db.query(Image).filter(Image.id == image_id, Image.user_id == user_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagen no encontrada o no tienes permisos para acceder a ella."
        )
    return image


def get_images_by_user(user_id: int, db: Session, skip: int = 0, limit: int = 100) -> List[Image]:
    return db.query(Image).filter(Image.user_id == user_id).offset(skip).limit(limit).all()


def get_all_images(db: Session, skip: int = 0, limit: int = 100) -> List[Image]:
    return db.query(Image).offset(skip).limit(limit).all()


# -------------------
# Actualizar imagen
# -------------------
def update_image(
    db: Session,
    image_id: int,
    user_id: int,
    modality: Optional[str] = None,
    body_part: Optional[str] = None,
    scan_type: Optional[str] = None,
    processed_path: Optional[str] = None,
    is_processed: Optional[bool] = None,
    dimensions: Optional[str] = None,
    voxel_spacing: Optional[str] = None,
    orientation: Optional[str] = None,
    bit_depth: Optional[int] = None,
    num_slices: Optional[int] = None,
    scan_metadata: Optional[Dict[str, Any]] = None,
    format: Optional[str] = None,
    patient_id: Optional[str] = None,
    clinical_reason: Optional[str] = None
) -> Image:
    """Actualizar metadata de una imagen."""
    image = get_user_image(image_id, user_id, db)

    try:
        if modality is not None:
            image.modality = modality
        if body_part is not None:
            image.body_part = body_part
        if scan_type is not None:
            image.scan_type = scan_type
        if processed_path is not None:
            image.processed_path = processed_path
        if is_processed is not None:
            image.is_processed = is_processed
            if is_processed and not image.processing_date:
                image.processing_date = func.now()
        if dimensions is not None:
            image.dimensions = dimensions
        if voxel_spacing is not None:
            image.voxel_spacing = voxel_spacing
        if orientation is not None:
            image.orientation = orientation
        if bit_depth is not None:
            image.bit_depth = bit_depth
        if num_slices is not None:
            image.num_slices = num_slices
        if scan_metadata is not None:
            image.scan_metadata = (
                json.dumps(scan_metadata) if isinstance(scan_metadata, dict) else scan_metadata
            )
        if format is not None:
            image.format = format
        if patient_id is not None:
            image.patient_id = patient_id

        db.commit()
        db.refresh(image)
        return image

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar la imagen: {str(e)}"
        )


# -------------------
# Eliminar imagen
# -------------------
def delete_image(image_id: int, user_id: int, db: Session) -> Dict[str, Any]:
    image = get_user_image(image_id, user_id, db)

    files_deleted, errors = [], []

    try:
        if image.path:
            if delete_image_file(image.path):
                files_deleted.append(f"Original: {image.path}")
            else:
                errors.append(f"No se pudo eliminar: {image.path}")

        if image.processed_path:
            if delete_image_file(image.processed_path):
                files_deleted.append(f"Processed: {image.processed_path}")
            else:
                errors.append(f"No se pudo eliminar: {image.processed_path}")

        db.delete(image)
        db.commit()
        files_deleted.append(f"Database record ID: {image_id}")

        return {
            "message": "Imagen y archivos asociados eliminados",
            "image_id": image_id,
            "filename": image.filename,
            "files_deleted": files_deleted,
            "errors": errors if errors else None
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la imagen: {str(e)}"
        )


# -------------------
# Procesamiento AI
# -------------------
def update_image_processing_result(
    db: Session,
    image_id: int,
    processed_path: str,
    diagnosis_data: Dict[str, Any],
    model_version: str
) -> Image:
    image = get_image_by_id(image_id, db)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagen no encontrada."
        )

    try:
        image.processed_path = processed_path
        image.is_processed = True
        image.processing_date = func.now()

        metadata = image.scan_metadata or {}
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        metadata["ai_diagnosis"] = diagnosis_data
        metadata["diagnosis_date"] = datetime.now().isoformat()
        metadata["model_version"] = model_version
        image.scan_metadata = json.dumps(metadata)

        db.commit()
        db.refresh(image)
        return image

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar resultados de AI: {str(e)}"
        )


# -------------------
# Metadata y estadísticas
# -------------------
def get_image_metadata(image_id: int, user_id: int, db: Session) -> Dict[str, Any]:
    image = get_user_image(image_id, user_id, db)
    metadata = image.scan_metadata or {}
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    return metadata


def get_user_image_stats(user_id: int, db: Session) -> Dict[str, Any]:
    from sqlalchemy import distinct

    stats = db.query(
        func.count(Image.id).label("total_images"),
        func.sum(Image.file_size).label("total_storage"),
        func.count(distinct(Image.modality)).label("unique_modalities"),
        func.count(distinct(Image.body_part)).label("unique_body_parts"),
        func.sum(func.cast(Image.is_processed, Integer)).label("processed_images")
    ).filter(Image.user_id == user_id).first()

    return {
        "total_images": stats.total_images or 0,
        "total_storage_mb": round((stats.total_storage or 0) / (1024 * 1024), 2),
        "unique_modalities": stats.unique_modalities or 0,
        "unique_body_parts": stats.unique_body_parts or 0,
        "processed_images": stats.processed_images or 0,
        "pending_images": (stats.total_images or 0) - (stats.processed_images or 0)
    }


def search_images(
    db: Session,
    user_id: int,
    modality: Optional[str] = None,
    body_part: Optional[str] = None,
    is_processed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Image]:
    query = db.query(Image).filter(Image.user_id == user_id)

    if modality:
        query = query.filter(Image.modality.ilike(f"%{modality}%"))
    if body_part:
        query = query.filter(Image.body_part.ilike(f"%{body_part}%"))
    if is_processed is not None:
        query = query.filter(Image.is_processed == is_processed)

    return query.offset(skip).limit(limit).all()
