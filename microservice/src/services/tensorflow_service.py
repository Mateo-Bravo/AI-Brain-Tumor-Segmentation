import uuid
import os
import asyncio
import logging
from datetime import datetime
from fastapi import UploadFile

from src.tensorflow.predict import TensorflowPredictor

logger = logging.getLogger(__name__)

# ===============================
# Configuración
# ===============================
RESULTS_DIR = "Diagnosticos"
os.makedirs(RESULTS_DIR, exist_ok=True)

TASKS = {}
_predictor = None


# ===============================
# Singleton del predictor
# ===============================
def get_predictor() -> TensorflowPredictor:
    global _predictor
    if _predictor is None:
        logger.info("[TF SERVICE] Inicializando TensorflowPredictor (singleton)")
        _predictor = TensorflowPredictor()
    return _predictor


# ===============================
# Encolar tarea
# ===============================
async def enqueue_task(
    file: UploadFile,
    options: dict | None = None,
    webhook_url: str | None = None
):
    task_id = f"tf_{uuid.uuid4().hex[:8]}"
    temp_path = os.path.join(RESULTS_DIR, f"{task_id}_{file.filename}")

    # Guardar archivo
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    TASKS[task_id] = {
        "task_id": task_id,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "completed_at": None,
        "result": None,
    }

    logger.info(f"[TF TASK] Encolada {task_id}")
    asyncio.create_task(_process_task(task_id, temp_path, options, webhook_url))

    return task_id


# ===============================
# Procesar tarea
# ===============================
async def _process_task(
    task_id: str,
    file_path: str,
    options: dict | None,
    webhook_url: str | None
):
    try:
        TASKS[task_id]["status"] = "running"
        predictor = get_predictor()

        result = await asyncio.to_thread(
            predictor.predict,
            image_path=file_path,
            original_filename=os.path.basename(file_path),
            output_dir=RESULTS_DIR
        )

        TASKS[task_id].update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat() + "Z",
            "result": result
        })

        logger.info(f"[TF TASK OK] {task_id}")

        # Webhook opcional
        if webhook_url:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.post(webhook_url, json={
                    "task_id": task_id,
                    "status": "completed"
                })

    except Exception as e:
        logger.error(f"[TF TASK ERROR] {task_id}: {e}", exc_info=True)
        TASKS[task_id].update({
            "status": "error",
            "completed_at": datetime.utcnow().isoformat() + "Z",
            "result": {"error": str(e)}
        })


# ===============================
# Estado de tarea
# ===============================
async def get_task_status(task_id: str):
    return TASKS.get(task_id)
