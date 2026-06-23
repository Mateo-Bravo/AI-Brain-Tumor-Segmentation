# app/api_controller.py
"""
Rutas de la API para segmentación de imágenes médicas
CON MODO HÍBRIDO (Local + Remoto)
ADAPTADO PARA FUNCIONAR EN EL PROYECTO DEL ESTUDIANTE
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List
import logging
import tempfile
import os

from datetime import datetime
import torch
from src.nnUnet.predict import PytorchPredictor
from src.tensorflow.predict import TensorflowPredictor
from src.utils.resource_monitor import ResourceMonitor
from src.utils.request_tracker import request_tracker
from src.utils.path_utils import validate_output_dir_local
from src.utils.system_monitor import get_system_resources
from src.core.config import (
    PYTORCH_DEVICE,
    TENSORFLOW_DEVICE,
    RESOURCE_MODE,
    GLOBAL_DEVICE,
    TENSORFLOW_GPU_ID,
    SEG_ENCRYPTION_ENABLED,
    OPERATION_MODE,
    SERVER_BASE_URL,
    TEMP_STORAGE_DIR,
)
# ================================================================
# ADAPTACIÓN: módulo de encriptación
# ================================================================
from src.utils.encryption import encrypt_file_with_ephemeral, decrypt_file_with_wrapped

# ================================================================
# ADAPTACIÓN: gestor de archivos temporales
# ================================================================
from src.services.file_manager import file_manager
from src.utils import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# 🔹 Instancias singleton de los predictores
pytorch_predictor = PytorchPredictor()
tensorflow_predictor = TensorflowPredictor()


def validate_output_dir_local(output_dir: str | None) -> str:
    """
    Valida y prepara el directorio de salida en modo LOCAL.
    Retorna la ruta absoluta como string.
    """

    if not output_dir or not output_dir.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error": "OUTPUT_DIR_MISSING",
                "message": (
                    "output_dir es obligatorio en modo LOCAL."
                ),
                "example": {
                    "output_dir": "C:\\segmentaciones"
                },
            },
        )

    seg_dir = Path(output_dir).expanduser()
    seg_dir.mkdir(parents=True, exist_ok=True)

    return str(seg_dir.resolve())


# ================================================================
# FUNCIÓN HELPER: DETECTAR MODO DE OPERACIÓN
# ================================================================
def detect_operation_mode(request: Request) -> str:
    """
    Detecta si el cliente es local o remoto.

    Returns:
        'local' o 'remote'
    """
    if OPERATION_MODE == "local":
        return "local"
    elif OPERATION_MODE == "remote":
        return "remote"
    elif OPERATION_MODE == "auto":
        # Detectar por IP del cliente
        client_host = request.client.host

        # IPs locales
        local_ips = ["127.0.0.1", "localhost", "::1"]

        if client_host in local_ips:
            logger.info(f" Modo LOCAL detectado (cliente: {client_host})")
            return "local"
        else:
            logger.info(f" Modo REMOTO detectado (cliente: {client_host})")
            return "remote"
    else:
        logger.warning(f" OPERATION_MODE inválido: {OPERATION_MODE}, usando 'auto'")
        return "auto"


# ================================================================
# FUNCIÓN HELPER: DESENCRIPTACIÓN DE ENTRADA
# ================================================================
def handle_incoming_file(
    file: UploadFile,
    wrapped_key: str | None,
    suffix: str
) -> tuple[str, bool]:
    """
    Maneja archivos entrantes, encriptados o en claro.

    Args:
        file: Archivo subido
        wrapped_key: Clave envuelta (si el archivo está encriptado)
        suffix: Extensión esperada (.nii.gz o .nii)

    Returns:
        Tupla de (ruta_archivo_desencriptado, fue_encriptado)
    """
    is_encrypted = False
    tmp_path = None

    # =============================================
    # CASO 1: ARCHIVO ENCRIPTADO
    # =============================================
    if wrapped_key or file.filename.endswith('.enc'):
        is_encrypted = True
        logger.info("Archivo ENCRIPTADO detectado")

        if not wrapped_key:
            raise HTTPException(
                400,
                "Se detectó un archivo encriptado (.enc) pero no se proporcionó wrapped_key"
            )

        # Guardar archivo encriptado temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix=".enc") as tmp_enc:
            tmp_enc.write(file.file.read())
            enc_path = tmp_enc.name

        logger.info(f"Archivo encriptado guardado temporalmente: {enc_path}")
        logger.info(f" Wrapped key recibido: {wrapped_key[:50]}...")

        # Crear ruta temporal para archivo desencriptado
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_dec:
            tmp_path = tmp_dec.name

        logger.info(f" Desencriptando archivo...")

        try:
            # DESENCRIPTAR
            decrypt_file_with_wrapped(
                enc_path=Path(enc_path),
                wrapped_key=wrapped_key,
                output_path=Path(tmp_path)
            )

            # Eliminar archivo encriptado temporal
            os.unlink(enc_path)

            logger.info(f"✅ Archivo desencriptado exitosamente: {tmp_path}")

        except Exception as e:
            # Limpiar archivos temporales
            if os.path.exists(enc_path):
                os.unlink(enc_path)
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

            logger.error(f" Error al desencriptar archivo: {e}")
            raise HTTPException(
                400,
                f"Error al desencriptar archivo: {str(e)}"
            )

    # =============================================
    # CASO 2: ARCHIVO EN CLARO
    # =============================================
    else:
        logger.info(" Archivo SIN ENCRIPTAR (en claro)")

        # Guardar archivo directamente
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name

        logger.info(f" Archivo guardado: {tmp_path}")

    return tmp_path, is_encrypted


# ================================================================
#  ENDPOINT nnU-Net (PyTorch) — INDIVIDUAL
# ================================================================
@router.post("/predict/nnUNet")
async def predict_nnunet(
    request: Request,
    image: UploadFile = File(...),
    output_dir: str | None = Form(None),
    wrapped_key: str | None = Form(None),
):
    """
    Endpoint para segmentación con nnU-Net v2.

    - MODO LOCAL: guarda en output_dir y retorna ruta
    - MODO REMOTO: guarda en sesión temporal y retorna URL
    """

    tmp_path: str | None = None
    monitor: ResourceMonitor | None = None

    request_tracker.increment("nnunet")
    mode = detect_operation_mode(request)

    try:
        # -------------------------------------------------
        # Validación básica
        # -------------------------------------------------
        if not image.filename:
            raise HTTPException(400, "No se recibió archivo")

        original_filename = image.filename

        logger.info("============================================================")
        logger.info(f"Archivo recibido (nnU-Net): {original_filename}")
        logger.info(f"Modo de operación: {mode.upper()}")
        logger.info(f"Wrapped key presente: {bool(wrapped_key)}")
        logger.info(f"Encriptación activada: {SEG_ENCRYPTION_ENABLED}")
        logger.info("============================================================")

        # -------------------------------------------------
        # Validar extensión
        # -------------------------------------------------
        filename_lower = original_filename.lower()
        if filename_lower.endswith(".enc"):
            filename_lower = filename_lower[:-4]

        if filename_lower.endswith(".nii.gz"):
            suffix = ".nii.gz"
        elif filename_lower.endswith(".nii"):
            suffix = ".nii"
        else:
            raise HTTPException(
                400,
                "Formato no soportado. Solo se aceptan archivos .nii o .nii.gz",
            )

        # -------------------------------------------------
        # Manejo de archivo (encriptado o no)
        # -------------------------------------------------
        tmp_path, was_encrypted = handle_incoming_file(
            file=image,
            wrapped_key=wrapped_key,
            suffix=suffix,
        )

        logger.info(f"Archivo temporal: {tmp_path}")
        logger.info(f"Encriptado de entrada: {was_encrypted}")

        # -------------------------------------------------
        # Directorio de salida según modo
        # -------------------------------------------------
        session_id = None

        if mode == "local":
            target_output_dir = validate_output_dir_local(output_dir)
            logger.info(f"🏠 MODO LOCAL → {target_output_dir}")
        else:
            session_id = file_manager.create_session()
            session_dir = Path(TEMP_STORAGE_DIR) / session_id
            session_dir.mkdir(parents=True, exist_ok=True)
            target_output_dir = str(session_dir.resolve())

            logger.info(f"🌐 MODO REMOTO → sesión {session_id}")
            logger.info(f"   Dir temporal: {target_output_dir}")

        # -------------------------------------------------
        # Monitoreo de recursos
        # -------------------------------------------------
        monitor = ResourceMonitor(0.5)
        monitor.start()

        # -------------------------------------------------
        # Predicción nnU-Net
        # -------------------------------------------------
        logger.info("🚀 Ejecutando segmentación nnU-Net...")

        result = pytorch_predictor.predict(
            input_path=Path(tmp_path),
            file_format=suffix,
            original_filename=original_filename.replace(".enc", ""),
            user_dir=target_output_dir,
        )

        # -------------------------------------------------
        # Encriptar resultado si aplica
        # -------------------------------------------------
        if SEG_ENCRYPTION_ENABLED:
            seg_filename = result.get("segmentation_file")

            if not seg_filename:
                logger.warning(
                    "Resultado nnU-Net no contiene 'segmentation_file'"
                )
            else:
                seg_path = Path(target_output_dir) / seg_filename

                enc_info = encrypt_file_with_ephemeral(seg_path)
                enc_filename = enc_info["enc_filename"]
                wrapped_key_out = enc_info["wrapped_key"]
                enc_path = Path(target_output_dir) / enc_filename

                if mode == "local":
                    result["segmentation_file_encrypted"] = enc_filename
                    result["segmentation_wrapped_key"] = wrapped_key_out
                    result["segmentation_file"] = None
                    result["encryption"] = {
                        "enabled": True,
                        "algorithm": "Fernet-envelope",
                        "input_was_encrypted": was_encrypted,
                        "mode": "local",
                        "delivery_method": "direct_path",
                    }
                else:
                    file_id = file_manager.save_file(
                        session_id=session_id,
                        file_path=enc_path,
                        metadata={
                            "original_filename": original_filename,
                            "model": "nnunet",
                            "encrypted": True,
                            "wrapped_key": wrapped_key_out,
                        },
                    )

                    download_url = (
                        f"{SERVER_BASE_URL}/api/v1/download/"
                        f"{session_id}/{file_id}"
                    )

                    result.update(
                        {
                            "session_id": session_id,
                            "file_id": file_id,
                            "download_url": download_url,
                            "encrypted_filename": enc_filename,
                            "wrapped_key": wrapped_key_out,
                            "encryption": {
                                "enabled": True,
                                "algorithm": "Fernet-envelope",
                                "input_was_encrypted": was_encrypted,
                                "mode": "remote",
                                "delivery_method": "deferred_download",
                            },
                        }
                    )

                    result.pop("segmentation_file", None)
                    result.pop("segmentation_file_encrypted", None)
                    result.pop("segmentation_wrapped_key", None)

        else:
            result.setdefault(
                "encryption",
                {"enabled": False, "input_was_encrypted": was_encrypted},
            )

        result["estado"] = "COMPLETADA"
        logger.info("✅ Segmentación nnU-Net completada")

        return result

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("❌ ERROR EN ENDPOINT nnU-Net")
        raise HTTPException(500, str(e))

    finally:
        if monitor:
            monitor.stop()

        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

        request_tracker.decrement("nnunet")


# ================================================================
#  ENDPOINT nnU-Net (PyTorch) — BATCH
# ================================================================
@router.post("/predict/nnUNet/batch")
async def predict_nnunet_batch(
    request: Request,
    images: List[UploadFile] = File(...),
    output_dir: str | None = Form(None),
    wrapped_key: str | None = Form(None),
    device: str = Form("auto"),
):
    """
    Endpoint BATCH para segmentación con nnU-Net v2.
    Procesa múltiples imágenes en un solo request.

    - MODO LOCAL: guarda en output_dir y retorna rutas
    - MODO REMOTO: guarda en sesiones temporales y retorna URLs

    Parámetros:
    - images:      Lista de archivos .nii / .nii.gz (o .enc)
    - output_dir:  Directorio de salida (solo modo LOCAL)
    - wrapped_key: Clave envuelta compartida (si todas las imágenes
                   están encriptadas con la misma clave)

    Retorna:
    - results: lista con el resultado individual de cada imagen
    - summary: totales de éxito / error
    """
    mode = detect_operation_mode(request)
    request_tracker.increment("nnunet")

    logger.info("============================================================")
    logger.info(f"BATCH nnU-Net — {len(images)} imágenes recibidas")
    logger.info(f"Modo de operación: {mode.upper()}")
    logger.info(f"Wrapped key presente: {bool(wrapped_key)}")
    logger.info(f"Encriptación activada: {SEG_ENCRYPTION_ENABLED}")
    logger.info("============================================================")

    results = []
    success_count = 0
    error_count = 0

    for idx, image in enumerate(images):
        tmp_path: str | None = None
        monitor: ResourceMonitor | None = None

        logger.info(f"--- Procesando imagen {idx + 1}/{len(images)}: {image.filename}")

        try:
            # --------------------------------------------------
            # Validación básica
            # --------------------------------------------------
            if not image.filename:
                raise ValueError("El archivo no tiene nombre")

            original_filename = image.filename

            # --------------------------------------------------
            # Validar extensión
            # --------------------------------------------------
            filename_lower = original_filename.lower()
            if filename_lower.endswith(".enc"):
                filename_lower = filename_lower[:-4]

            if filename_lower.endswith(".nii.gz"):
                suffix = ".nii.gz"
            elif filename_lower.endswith(".nii"):
                suffix = ".nii"
            else:
                raise ValueError(
                    "Formato no soportado. Solo se aceptan archivos .nii o .nii.gz"
                )

            # --------------------------------------------------
            # Manejo de archivo (encriptado o no)
            # --------------------------------------------------
            tmp_path, was_encrypted = handle_incoming_file(
                file=image,
                wrapped_key=wrapped_key,
                suffix=suffix,
            )

            logger.info(f"  Archivo temporal: {tmp_path}")
            logger.info(f"  Encriptado de entrada: {was_encrypted}")

            # --------------------------------------------------
            # Directorio de salida según modo
            # --------------------------------------------------
            session_id = None

            if mode == "local":
                target_output_dir = validate_output_dir_local(output_dir)
                logger.info(f"  🏠 MODO LOCAL → {target_output_dir}")
            else:
                session_id = file_manager.create_session()
                session_dir = Path(TEMP_STORAGE_DIR) / session_id
                session_dir.mkdir(parents=True, exist_ok=True)
                target_output_dir = str(session_dir.resolve())
                logger.info(f"  🌐 MODO REMOTO → sesión {session_id}")

            # --------------------------------------------------
            # Monitoreo de recursos
            # --------------------------------------------------
            monitor = ResourceMonitor(0.5)
            monitor.start()

            # --------------------------------------------------
            # Predicción nnU-Net
            # --------------------------------------------------
            logger.info(f"  ⚙️ Device solicitado: {device}")
            logger.info(f"  🚀 Ejecutando segmentación nnU-Net...")

            result = pytorch_predictor.predict(
                input_path=Path(tmp_path),
                file_format=suffix,
                original_filename=original_filename.replace(".enc", ""),
                user_dir=target_output_dir,
                device=device
            )

            # --------------------------------------------------
            # Encriptar resultado si aplica
            # --------------------------------------------------
            if SEG_ENCRYPTION_ENABLED:
                seg_filename = result.get("segmentation_file")

                if not seg_filename:
                    logger.warning(
                        f"  Resultado nnU-Net no contiene 'segmentation_file' para {original_filename}"
                    )
                else:
                    seg_path = Path(target_output_dir) / seg_filename
                    enc_info = encrypt_file_with_ephemeral(seg_path)
                    enc_filename = enc_info["enc_filename"]
                    wrapped_key_out = enc_info["wrapped_key"]
                    enc_path = Path(target_output_dir) / enc_filename

                    if mode == "local":
                        result["segmentation_file_encrypted"] = enc_filename
                        result["segmentation_wrapped_key"] = wrapped_key_out
                        result["segmentation_file"] = None
                        result["encryption"] = {
                            "enabled": True,
                            "algorithm": "Fernet-envelope",
                            "input_was_encrypted": was_encrypted,
                            "mode": "local",
                            "delivery_method": "direct_path",
                        }
                    else:
                        file_id = file_manager.save_file(
                            session_id=session_id,
                            file_path=enc_path,
                            metadata={
                                "original_filename": original_filename,
                                "model": "nnunet",
                                "encrypted": True,
                                "wrapped_key": wrapped_key_out,
                            },
                        )

                        download_url = (
                            f"{SERVER_BASE_URL}/api/v1/download/"
                            f"{session_id}/{file_id}"
                        )

                        result.update(
                            {
                                "session_id": session_id,
                                "file_id": file_id,
                                "download_url": download_url,
                                "encrypted_filename": enc_filename,
                                "wrapped_key": wrapped_key_out,
                                "encryption": {
                                    "enabled": True,
                                    "algorithm": "Fernet-envelope",
                                    "input_was_encrypted": was_encrypted,
                                    "mode": "remote",
                                    "delivery_method": "deferred_download",
                                },
                            }
                        )

                        result.pop("segmentation_file", None)
                        result.pop("segmentation_file_encrypted", None)
                        result.pop("segmentation_wrapped_key", None)

            else:
                result.setdefault(
                    "encryption",
                    {"enabled": False, "input_was_encrypted": was_encrypted},
                )

            result["estado"] = "COMPLETADA"
            result["filename"] = original_filename
            result["index"] = idx

            results.append(result)
            success_count += 1

            logger.info(f"  ✅ Imagen {idx + 1} completada")

        except HTTPException as e:
            error_count += 1
            logger.error(f"  ❌ Error HTTP en imagen {idx + 1} ({image.filename}): {e.detail}")
            results.append(
                {
                    "index": idx,
                    "filename": image.filename,
                    "estado": "ERROR",
                    "error": e.detail,
                    "status_code": e.status_code,
                }
            )

        except Exception as e:
            error_count += 1
            logger.exception(f"  ❌ Error inesperado en imagen {idx + 1} ({image.filename})")
            results.append(
                {
                    "index": idx,
                    "filename": image.filename,
                    "estado": "ERROR",
                    "error": str(e),
                }
            )

        finally:
            if monitor:
                monitor.stop()

            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    request_tracker.decrement("nnunet")

    logger.info("============================================================")
    logger.info(f"BATCH nnU-Net FINALIZADO — OK: {success_count} | ERROR: {error_count}")
    logger.info("============================================================")

    return {
        "model": "nnunet",
        "total": len(images),
        "success": success_count,
        "errors": error_count,
        "results": results,
    }


# ================================================================
#  ENDPOINT TensorFlow (U-Net 3D) — INDIVIDUAL
# ================================================================
@router.post("/predict/tensorflow")
async def predict_tensorflow(
    request: Request,
    image: UploadFile = File(...),
    output_dir: str | None = Form(None),
    wrapped_key: str | None = Form(None),
):
    """
    Endpoint para segmentación con TensorFlow U-Net 3D.

    - MODO LOCAL: guarda en output_dir y retorna ruta
    - MODO REMOTO: guarda en sesión temporal y retorna URL
    """

    tmp_path: str | None = None
    monitor: ResourceMonitor | None = None

    request_tracker.increment("tensorflow")
    mode = detect_operation_mode(request)

    try:
        # -------------------------------------------------
        # Validación básica
        # -------------------------------------------------
        if not image.filename:
            raise HTTPException(400, "No se recibió archivo")

        original_filename = image.filename
        logger.info("============================================================")
        logger.info(f"Archivo recibido (TensorFlow): {original_filename}")
        logger.info(f"Modo de operación: {mode.upper()}")
        logger.info(f"Wrapped key presente: {bool(wrapped_key)}")
        logger.info(f"Encriptación activada: {SEG_ENCRYPTION_ENABLED}")
        logger.info("============================================================")

        # -------------------------------------------------
        # Validar extensión
        # -------------------------------------------------
        filename_lower = original_filename.lower()
        if filename_lower.endswith(".enc"):
            filename_lower = filename_lower[:-4]

        if filename_lower.endswith(".nii.gz"):
            suffix = ".nii.gz"
        elif filename_lower.endswith(".nii"):
            suffix = ".nii"
        else:
            raise HTTPException(
                400,
                "Formato no soportado. Solo se aceptan archivos .nii o .nii.gz",
            )

        # -------------------------------------------------
        # Manejo de archivo (encriptado o no)
        # -------------------------------------------------
        tmp_path, was_encrypted = handle_incoming_file(
            file=image,
            wrapped_key=wrapped_key,
            suffix=suffix,
        )

        logger.info(f"Archivo temporal: {tmp_path}")
        logger.info(f"Encriptado de entrada: {was_encrypted}")

        # -------------------------------------------------
        # Directorio de salida según modo
        # -------------------------------------------------
        session_id = None

        if mode == "local":
            target_output_dir = validate_output_dir_local(output_dir)
            logger.info(f"🏠 MODO LOCAL → {target_output_dir}")
        else:
            session_id = file_manager.create_session()
            session_dir = Path(TEMP_STORAGE_DIR) / session_id
            session_dir.mkdir(parents=True, exist_ok=True)
            target_output_dir = str(session_dir.resolve())

            logger.info(f"🌐 MODO REMOTO → sesión {session_id}")
            logger.info(f"   Dir temporal: {target_output_dir}")

        # -------------------------------------------------
        # Monitoreo de recursos
        # -------------------------------------------------
        monitor = ResourceMonitor(0.5)
        monitor.start()

        # -------------------------------------------------
        # Predicción TensorFlow
        # -------------------------------------------------
        logger.info("🚀 Ejecutando segmentación TensorFlow...")

        result = tensorflow_predictor.predict(
            image_path=tmp_path,
            output_dir=target_output_dir,
            file_format=suffix,
            original_filename=original_filename.replace(".enc", ""),
        )

        # -------------------------------------------------
        # Encriptar resultado si aplica
        # -------------------------------------------------
        if SEG_ENCRYPTION_ENABLED:
            seg_path_str = result.get("segmentation_path")

            if not seg_path_str:
                logger.warning(
                    "Resultado TensorFlow no contiene 'segmentation_path'"
                )
            else:
                seg_path = Path(seg_path_str)

                enc_info = encrypt_file_with_ephemeral(seg_path)
                enc_filename = enc_info["enc_filename"]
                wrapped_key_out = enc_info["wrapped_key"]
                enc_path = Path(target_output_dir) / enc_filename

                if mode == "local":
                    result["segmentation_path_encrypted"] = str(enc_path)
                    result["segmentation_wrapped_key"] = wrapped_key_out
                    result["segmentation_path"] = None
                    result["encryption"] = {
                        "enabled": True,
                        "algorithm": "Fernet-envelope",
                        "input_was_encrypted": was_encrypted,
                        "mode": "local",
                        "delivery_method": "direct_path",
                    }
                else:
                    file_id = file_manager.save_file(
                        session_id=session_id,
                        file_path=enc_path,
                        metadata={
                            "original_filename": original_filename,
                            "model": "tensorflow",
                            "encrypted": True,
                            "wrapped_key": wrapped_key_out,
                        },
                    )

                    download_url = (
                        f"{SERVER_BASE_URL}/api/v1/download/"
                        f"{session_id}/{file_id}"
                    )

                    result.update(
                        {
                            "session_id": session_id,
                            "file_id": file_id,
                            "download_url": download_url,
                            "encrypted_filename": enc_filename,
                            "wrapped_key": wrapped_key_out,
                            "encryption": {
                                "enabled": True,
                                "algorithm": "Fernet-envelope",
                                "input_was_encrypted": was_encrypted,
                                "mode": "remote",
                                "delivery_method": "deferred_download",
                            },
                        }
                    )

                    result.pop("segmentation_path", None)
                    result.pop("segmentation_path_encrypted", None)
                    result.pop("segmentation_wrapped_key", None)

        else:
            result.setdefault(
                "encryption",
                {"enabled": False, "input_was_encrypted": was_encrypted},
            )

        result["estado"] = "COMPLETADA"
        logger.info("✅ Segmentación TensorFlow completada")

        return result

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("❌ ERROR EN ENDPOINT TensorFlow")
        raise HTTPException(500, str(e))

    finally:
        if monitor:
            monitor.stop()

        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

        request_tracker.decrement("tensorflow")


# ================================================================
#  ENDPOINT TensorFlow (U-Net 3D) — BATCH
# ================================================================
@router.post("/predict/tensorflow/batch")
async def predict_tensorflow_batch(
    request: Request,
    images: List[UploadFile] = File(...),
    output_dir: str | None = Form(None),
    wrapped_key: str | None = Form(None),
):
    """
    Endpoint BATCH para segmentación con TensorFlow U-Net 3D.
    Procesa múltiples imágenes en un solo request.

    - MODO LOCAL: guarda en output_dir y retorna rutas
    - MODO REMOTO: guarda en sesiones temporales y retorna URLs

    Parámetros:
    - images:      Lista de archivos .nii / .nii.gz (o .enc)
    - output_dir:  Directorio de salida (solo modo LOCAL)
    - wrapped_key: Clave envuelta compartida (si todas las imágenes
                   están encriptadas con la misma clave)

    Retorna:
    - results: lista con el resultado individual de cada imagen
    - summary: totales de éxito / error
    """
    mode = detect_operation_mode(request)
    request_tracker.increment("tensorflow")

    logger.info("============================================================")
    logger.info(f"BATCH TensorFlow — {len(images)} imágenes recibidas")
    logger.info(f"Modo de operación: {mode.upper()}")
    logger.info(f"Wrapped key presente: {bool(wrapped_key)}")
    logger.info(f"Encriptación activada: {SEG_ENCRYPTION_ENABLED}")
    logger.info("============================================================")

    results = []
    success_count = 0
    error_count = 0

    for idx, image in enumerate(images):
        tmp_path: str | None = None
        monitor: ResourceMonitor | None = None

        logger.info(f"--- Procesando imagen {idx + 1}/{len(images)}: {image.filename}")

        try:
            # --------------------------------------------------
            # Validación básica
            # --------------------------------------------------
            if not image.filename:
                raise ValueError("El archivo no tiene nombre")

            original_filename = image.filename

            # --------------------------------------------------
            # Validar extensión
            # --------------------------------------------------
            filename_lower = original_filename.lower()
            if filename_lower.endswith(".enc"):
                filename_lower = filename_lower[:-4]

            if filename_lower.endswith(".nii.gz"):
                suffix = ".nii.gz"
            elif filename_lower.endswith(".nii"):
                suffix = ".nii"
            else:
                raise ValueError(
                    "Formato no soportado. Solo se aceptan archivos .nii o .nii.gz"
                )

            # --------------------------------------------------
            # Manejo de archivo (encriptado o no)
            # --------------------------------------------------
            tmp_path, was_encrypted = handle_incoming_file(
                file=image,
                wrapped_key=wrapped_key,
                suffix=suffix,
            )

            logger.info(f"  Archivo temporal: {tmp_path}")
            logger.info(f"  Encriptado de entrada: {was_encrypted}")

            # --------------------------------------------------
            # Directorio de salida según modo
            # --------------------------------------------------
            session_id = None

            if mode == "local":
                target_output_dir = validate_output_dir_local(output_dir)
                logger.info(f"  🏠 MODO LOCAL → {target_output_dir}")
            else:
                session_id = file_manager.create_session()
                session_dir = Path(TEMP_STORAGE_DIR) / session_id
                session_dir.mkdir(parents=True, exist_ok=True)
                target_output_dir = str(session_dir.resolve())
                logger.info(f"  🌐 MODO REMOTO → sesión {session_id}")

            # --------------------------------------------------
            # Monitoreo de recursos
            # --------------------------------------------------
            monitor = ResourceMonitor(0.5)
            monitor.start()

            # --------------------------------------------------
            # Predicción TensorFlow
            # --------------------------------------------------
            logger.info(f"  🚀 Ejecutando segmentación TensorFlow...")

            result = tensorflow_predictor.predict(
                image_path=tmp_path,
                output_dir=target_output_dir,
                file_format=suffix,
                original_filename=original_filename.replace(".enc", ""),
            )

            # --------------------------------------------------
            # Encriptar resultado si aplica
            # --------------------------------------------------
            if SEG_ENCRYPTION_ENABLED:
                seg_path_str = result.get("segmentation_path")

                if not seg_path_str:
                    logger.warning(
                        f"  Resultado TensorFlow no contiene 'segmentation_path' para {original_filename}"
                    )
                else:
                    seg_path = Path(seg_path_str)
                    enc_info = encrypt_file_with_ephemeral(seg_path)
                    enc_filename = enc_info["enc_filename"]
                    wrapped_key_out = enc_info["wrapped_key"]
                    enc_path = Path(target_output_dir) / enc_filename

                    if mode == "local":
                        result["segmentation_path_encrypted"] = str(enc_path)
                        result["segmentation_wrapped_key"] = wrapped_key_out
                        result["segmentation_path"] = None
                        result["encryption"] = {
                            "enabled": True,
                            "algorithm": "Fernet-envelope",
                            "input_was_encrypted": was_encrypted,
                            "mode": "local",
                            "delivery_method": "direct_path",
                        }
                    else:
                        file_id = file_manager.save_file(
                            session_id=session_id,
                            file_path=enc_path,
                            metadata={
                                "original_filename": original_filename,
                                "model": "tensorflow",
                                "encrypted": True,
                                "wrapped_key": wrapped_key_out,
                            },
                        )

                        download_url = (
                            f"{SERVER_BASE_URL}/api/v1/download/"
                            f"{session_id}/{file_id}"
                        )

                        result.update(
                            {
                                "session_id": session_id,
                                "file_id": file_id,
                                "download_url": download_url,
                                "encrypted_filename": enc_filename,
                                "wrapped_key": wrapped_key_out,
                                "encryption": {
                                    "enabled": True,
                                    "algorithm": "Fernet-envelope",
                                    "input_was_encrypted": was_encrypted,
                                    "mode": "remote",
                                    "delivery_method": "deferred_download",
                                },
                            }
                        )

                        result.pop("segmentation_path", None)
                        result.pop("segmentation_path_encrypted", None)
                        result.pop("segmentation_wrapped_key", None)

            else:
                result.setdefault(
                    "encryption",
                    {"enabled": False, "input_was_encrypted": was_encrypted},
                )

            result["estado"] = "COMPLETADA"
            result["filename"] = original_filename
            result["index"] = idx

            results.append(result)
            success_count += 1

            logger.info(f"  ✅ Imagen {idx + 1} completada")

        except HTTPException as e:
            error_count += 1
            logger.error(f"  ❌ Error HTTP en imagen {idx + 1} ({image.filename}): {e.detail}")
            results.append(
                {
                    "index": idx,
                    "filename": image.filename,
                    "estado": "ERROR",
                    "error": e.detail,
                    "status_code": e.status_code,
                }
            )

        except Exception as e:
            error_count += 1
            logger.exception(f"  ❌ Error inesperado en imagen {idx + 1} ({image.filename})")
            results.append(
                {
                    "index": idx,
                    "filename": image.filename,
                    "estado": "ERROR",
                    "error": str(e),
                }
            )

        finally:
            if monitor:
                monitor.stop()

            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    request_tracker.decrement("tensorflow")

    logger.info("============================================================")
    logger.info(f"BATCH TensorFlow FINALIZADO — OK: {success_count} | ERROR: {error_count}")
    logger.info("============================================================")

    return {
        "model": "tensorflow",
        "total": len(images),
        "success": success_count,
        "errors": error_count,
        "results": results,
    }


# ================================================================
# ENDPOINT: DESCARGAR ARCHIVO ENCRIPTADO (Solo modo remoto)
# CON LIMPIEZA AUTOMÁTICA DESPUÉS DE ENVIAR
# ================================================================
@router.get("/download/{session_id}/{file_id}")
async def download_encrypted_file(
    session_id: str,
    file_id: str
):
    """
    Descarga un archivo encriptado por su session_id y file_id.
    BORRA LA SESIÓN AUTOMÁTICAMENTE después de enviar el archivo.

    Args:
        session_id: ID de la sesión
        file_id: ID del archivo

    Returns:
        Archivo encriptado (.enc)
    """
    from fastapi import BackgroundTasks
    from fastapi.responses import Response

    logger.info("=" * 60)
    logger.info(f"DESCARGA DE ARCHIVO ENCRIPTADO")
    logger.info(f"   Session ID: {session_id}")
    logger.info(f"   File ID: {file_id}")
    logger.info("=" * 60)

    # Buscar archivo
    file_path = file_manager.get_file_path(session_id, file_id)

    if not file_path or not file_path.exists():
        logger.error(f"Archivo no encontrado: {session_id}/{file_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Archivo no encontrado: {file_id}"
        )

    logger.info(f"Archivo encontrado: {file_path}")
    logger.info(f"   Tamaño: {file_path.stat().st_size} bytes")

    # ================================================
    # LEER ARCHIVO EN MEMORIA
    # ================================================
    try:
        with open(file_path, 'rb') as f:
            file_content = f.read()

        logger.info(f"Archivo cargado en memoria: {len(file_content)} bytes")
    except Exception as e:
        logger.error(f"Error leyendo archivo: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al leer archivo: {str(e)}"
        )

    # ================================================
    # FUNCIÓN DE LIMPIEZA (se ejecuta después de enviar)
    # ================================================
    def cleanup_after_send():
        """Elimina la sesión completa después de enviar."""
        try:
            logger.info(f"🧹 Iniciando limpieza automática de sesión: {session_id}")
            success = file_manager.delete_session(session_id)

            if success:
                logger.info(f"Sesión eliminada automáticamente: {session_id}")
            else:
                logger.warning(f"Sesión no encontrada durante limpieza: {session_id}")
        except Exception as e:
            logger.error(f"Error en limpieza automática: {e}")

    # ================================================
    # CREAR BACKGROUND TASK PARA LIMPIEZA
    # ================================================
    background_tasks = BackgroundTasks()
    background_tasks.add_task(cleanup_after_send)

    # ================================================
    # RETORNAR ARCHIVO CON LIMPIEZA AUTOMÁTICA
    # ================================================
    logger.info(f"Enviando archivo con limpieza automática programada")

    return Response(
        content=file_content,
        media_type="application/octet-stream",
        headers={
            'Content-Disposition': f'attachment; filename="{file_path.name}"'
        },
        background=background_tasks
    )


# ================================================================
# ENDPOINT: LIMPIAR SESIÓN (Solo modo remoto)
# ================================================================
@router.delete("/cleanup/{session_id}")
async def cleanup_session(session_id: str):
    """
    Elimina una sesión completa con todos sus archivos.

    Args:
        session_id: ID de la sesión a eliminar
    """
    logger.info("=" * 60)
    logger.info(f"LIMPIEZA DE SESIÓN")
    logger.info(f"   Session ID: {session_id}")
    logger.info("=" * 60)

    success = file_manager.delete_session(session_id)

    if success:
        logger.info(f"Sesión eliminada: {session_id}")
        return {
            "success": True,
            "message": f"Sesión {session_id} eliminada correctamente",
            "status": "deleted"
        }
    else:
        logger.info(f"Sesión ya limpiada: {session_id}")
        return {
            "success": True,
            "message": f"Sesión {session_id} ya fue limpiada",
            "status": "already_cleaned"
        }


# ================================================================
# ENDPOINT: LIMPIEZA MANUAL DE ARCHIVOS EXPIRADOS
# ================================================================
@router.post("/maintenance/cleanup")
async def run_maintenance_cleanup():
    """
    Ejecuta limpieza manual de archivos expirados.
    Puede ser llamado por un cron job o manualmente.
    """
    logger.info("=" * 60)
    logger.info("🧹 LIMPIEZA MANUAL DE ARCHIVOS EXPIRADOS")
    logger.info("=" * 60)

    try:
        expired_count = file_manager.cleanup_expired_sessions()

        logger.info(f"Limpieza completada: {expired_count} sesiones eliminadas")

        return {
            "success": True,
            "sessions_deleted": expired_count,
            "message": f"Se eliminaron {expired_count} sesiones expiradas"
        }
    except Exception as e:
        logger.error(f"Error en limpieza: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al ejecutar limpieza: {str(e)}"
        )


# ================================================================
#  HEALTH CHECK
# ================================================================
@router.get("/health", tags=["health"])
async def health_check():
    """
    Health check público sin autenticación.
    Expone:
    - Modo de recursos (AUTO / MANUAL)
    - Devices configurados por config
    - Info básica de GPU
    - Info de modelos si exponen get_info()
    - Estado de la encriptación de segmentaciones
    - Modo de operación (local/remote/auto)
    """
    try:
        gpu_available = torch.cuda.is_available()
        gpu_count = torch.cuda.device_count() if gpu_available else 0
    except Exception:
        gpu_available = False
        gpu_count = 0

    # Info opcional de los modelos si tienen get_info()
    nnunet_info = {}
    try:
        if hasattr(pytorch_predictor, "get_info"):
            nnunet_info = pytorch_predictor.get_info()
        elif hasattr(pytorch_predictor, "model") and hasattr(pytorch_predictor.model, "get_info"):
            nnunet_info = pytorch_predictor.model.get_info()
    except Exception as e:
        logger.warning(f"⚠️ No se pudo obtener info de nnUNet: {e}")

    tf_info = {}
    try:
        if hasattr(tensorflow_predictor, "get_info"):
            tf_info = tensorflow_predictor.get_info()
        elif hasattr(tensorflow_predictor, "model") and hasattr(tensorflow_predictor.model, "get_info"):
            tf_info = tensorflow_predictor.model.get_info()
    except Exception as e:
        logger.warning(f"⚠️ No se pudo obtener info de TensorFlow: {e}")

    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + "Z",

        # 🔧 Configuración de recursos
        "resource_mode": RESOURCE_MODE,
        "global_device": str(GLOBAL_DEVICE),

        # Devices configurados desde config
        "pytorch_device": str(PYTORCH_DEVICE),
        "tensorflow_device": str(TENSORFLOW_DEVICE),
        "tensorflow_gpu_id": TENSORFLOW_GPU_ID,

        # Estado de GPU
        "gpu_available": gpu_available,
        "gpu_count": gpu_count,

        # Modo de operación
        "operation_mode": OPERATION_MODE,
        "server_base_url": SERVER_BASE_URL,

        # Estado de encriptación
        "encryption": {
            "enabled": SEG_ENCRYPTION_ENABLED,
            "mode": "bidirectional" if SEG_ENCRYPTION_ENABLED else "disabled",
        },

        # Info de modelos (si está disponible)
        "models": {
            "nnunet": nnunet_info,
            "tensorflow": tf_info,
        },
    }


# ================================================================
#  ENDPOINT DE DESENCRIPTACIÓN MANUAL (Utilidad)
# ================================================================
@router.post("/decrypt/segmentation")
async def decrypt_segmentation(
    encrypted_file: UploadFile = File(...),
    wrapped_key: str = Form(...),
    output_dir: str | None = Form(None),
):
    """
    Desencripta un archivo de segmentación cifrado.

    *Parámetros:*
    - encrypted_file: Archivo .enc a desencriptar (subir archivo)
    - wrapped_key: Token de clave efímera envuelta (devuelto en la predicción)
    - output_dir: Directorio donde guardar el archivo desencriptado (opcional)

    *Devuelve:*
    - Ruta del archivo desencriptado
    - Información sobre la desencriptación
    """
    logger.info("=" * 60)
    logger.info("NUEVA PETICIÓN - DESENCRIPTACIÓN DE SEGMENTACIÓN")
    logger.info("=" * 60)
    logger.info(f"Archivo encriptado recibido: {encrypted_file.filename}")
    logger.info(f"Desencriptación activada: {SEG_ENCRYPTION_ENABLED}")

    if not SEG_ENCRYPTION_ENABLED:
        logger.error("La encriptación está deshabilitada en el servidor")
        raise HTTPException(
            status_code=403,
            detail="La desencriptación no está habilitada en este servidor (SEG_ENCRYPTION_ENABLED=false)",
        )

    try:
        # Validar extensión
        if not encrypted_file.filename.endswith(".enc"):
            logger.error(f"Archivo no es .enc: {encrypted_file.filename}")
            raise HTTPException(
                status_code=400,
                detail="El archivo debe tener extensión .enc",
            )

        # Determinar ruta de salida
        if output_dir:
            target_output_dir = Path(output_dir)
        else:
            # ADAPTACIÓN: usar DIAGNOSTIC_DIR si existe, sino outputs/segmentations
            diagnostic_dir = getattr(settings, 'DIAGNOSTIC_DIR', 'outputs/segmentations')
            target_output_dir = Path(diagnostic_dir)

        target_output_dir.mkdir(parents=True, exist_ok=True)

        # Guardar archivo encriptado temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix=".enc") as tmp:
            content = await encrypted_file.read()
            tmp.write(content)
            enc_path = Path(tmp.name)

        logger.info(f"✓ Archivo temporal guardado: {enc_path}")

        # Nombre del archivo desencriptado (quitar .enc)
        original_filename = encrypted_file.filename[:-4]  # quita ".enc"
        output_path = target_output_dir / original_filename

        logger.info(f"Directorio de salida: {target_output_dir}")
        logger.info(f"Nombre original: {original_filename}")

        # DESENCRIPTAR
        logger.info("Iniciando desencriptación...")
        decrypt_file_with_wrapped(
            enc_path=enc_path,
            wrapped_key=wrapped_key,
            output_path=output_path,
        )

        # Limpiar archivo temporal
        enc_path.unlink()

        logger.info(f"Desencriptación completada: {output_path}")

        return {
            "status": "success",
            "decrypted_file": original_filename,
            "decrypted_path": str(output_path),
            "file_size": output_path.stat().st_size,
            "decryption": {
                "enabled": True,
                "algorithm": "Fernet-envelope",
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 60)
        logger.error("ERROR EN DESENCRIPTACIÓN")
        logger.error("=" * 60)
        logger.error(f"Error: {e}")
        import traceback

        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=f"Error al desencriptar: {str(e)}",
        )