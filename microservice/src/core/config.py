# app/core/config.py
"""
Configuracion central de dispositivos (CPU / GPU) y rutas de modelos.

- Modo AUTO: decide solo entre GPU o CPU segun lo que realmente vea PyTorch.
- Modo MANUAL: tu eliges por .env que device usa cada modelo.
- Modo de Operacion: Detecta automaticamente modo local vs remoto
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# ------------------------------------------------------------
# 1) Cargar .env
# ------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(env_path)

# ------------------------------------------------------------
# 1.1) Exportar variables requeridas por nnU-Net al entorno del sistema
# ------------------------------------------------------------
for _nnunet_var in ("nnUNet_raw", "nnUNet_preprocessed", "nnUNet_results"):
    _val = os.getenv(_nnunet_var)
    if _val:
        _path = Path(_val)
        if not _path.is_absolute():
            _path = BASE_DIR / _path
        os.environ[_nnunet_var] = str(_path)
        _path.mkdir(parents=True, exist_ok=True)
        logger.info(f"{_nnunet_var} => {_path}")
    else:
        logger.warning(f"{_nnunet_var} no definida en .env")

# ------------------------------------------------------------
# 2) Leer variables crudas
# ------------------------------------------------------------
RESOURCE_MODE = os.getenv("RESOURCE_MODE", "AUTO").strip().upper()
DEVICE_RAW = os.getenv("DEVICE", "auto").strip()

PYTORCH_DEVICE_RAW = os.getenv("PYTORCH_DEVICE", "").strip()
TENSORFLOW_DEVICE_RAW = os.getenv("TENSORFLOW_DEVICE", "").strip()

PYTORCH_MODEL_PATH = os.getenv(
    "PYTORCH_MODEL_PATH",
    str(BASE_DIR / "app" / "models" / "checkpoint_best.pth")
)

TENSORFLOW_MODEL_PATH = os.getenv(
    "TENSORFLOW_MODEL_PATH",
    str(BASE_DIR / "app" / "models" / "modelUnet3D_3_multi_scale_input.h5")
)

# Rutas nnU-Net resueltas (para uso interno si se necesitan)
NNUNET_RAW = os.environ.get("nnUNet_raw", "")
NNUNET_PREPROCESSED = os.environ.get("nnUNet_preprocessed", "")
NNUNET_RESULTS = os.environ.get("nnUNet_results", "")

# ------------------------------------------------------------
# 2.1) Configuracion de encriptacion
# ------------------------------------------------------------
SEG_ENCRYPTION_ENABLED = os.getenv("SEG_ENCRYPTION_ENABLED", "false").strip().lower() == "true"
SEG_ENCRYPTION_KEY = os.getenv("SEG_ENCRYPTION_KEY", "").strip()

if SEG_ENCRYPTION_ENABLED:
    if not SEG_ENCRYPTION_KEY:
        logger.warning(
            "SEG_ENCRYPTION_ENABLED=true pero SEG_ENCRYPTION_KEY no esta configurada. "
            "La encriptacion fallara hasta que configures la clave maestra."
        )
    else:
        logger.info("Encriptacion de segmentacion ACTIVADA (clave maestra cargada).")
else:
    logger.info("Encriptacion de segmentacion DESACTIVADA (SEG_ENCRYPTION_ENABLED=false).")

# ------------------------------------------------------------
# 2.2) Configuracion de MODO DE OPERACION (Local/Remoto)
# ------------------------------------------------------------
OPERATION_MODE = os.getenv("OPERATION_MODE", "auto").strip().lower()  # auto, local, remote

# Para modo REMOTO: almacenamiento temporal
TEMP_STORAGE_DIR = os.getenv("TEMP_STORAGE_DIR", "/tmp/segmentations")
TEMP_FILE_TTL_HOURS = int(os.getenv("TEMP_FILE_TTL_HOURS", "24"))

# URL base del servidor (para construir URLs de descarga)
SERVER_BASE_URL = os.getenv("SERVER_BASE_URL", "http://localhost:3020")

# Crear directorio temporal si no existe
Path(TEMP_STORAGE_DIR).mkdir(parents=True, exist_ok=True)

# ------------------------------------------------------------
# 3) Integramos PyTorch para detectar GPU
# ------------------------------------------------------------
try:
    import torch
except Exception as e:
    torch = None
    logger.warning(f"No se pudo importar torch: {e}")


def _log_torch_env():
    """Log de diagnostico sobre lo que ve PyTorch."""
    if torch is None:
        logger.warning("PyTorch no esta disponible; se usara CPU.")
        return

    try:
        logger.info("===== Diagnostico PyTorch / CUDA =====")
        logger.info(f"torch.__version__          : {torch.__version__}")
        logger.info(f"torch.version.cuda         : {getattr(torch.version, 'cuda', None)}")
        logger.info(f"torch.cuda.is_available()  : {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            logger.info(f"torch.cuda.device_count()  : {torch.cuda.device_count()}")
            for idx in range(torch.cuda.device_count()):
                logger.info(f" - GPU {idx}: {torch.cuda.get_device_name(idx)}")
        logger.info("======================================")
    except Exception as e:
        logger.warning(f"Error al inspeccionar entorno CUDA: {e}")


def _gpu_count() -> int:
    if torch is None:
        return 0
    try:
        return int(torch.cuda.device_count())
    except Exception:
        return 0


def _normalize_device(value: str | None):
    """
    Normaliza strings como:
      - None, ''      -> None
      - 'cpu'         -> 'cpu'
      - 'auto'        -> 'auto'
      - 'cuda'        -> 'cuda:0'
      - 'cuda:1'      -> 'cuda:1'
    """
    if not value:
        return None
    v = value.strip().lower()
    if v in ("none", ""):
        return None
    if v == "auto":
        return "auto"
    if v == "cpu":
        return "cpu"
    if v.startswith("cuda"):
        if ":" in v:
            base, idx = v.split(":", 1)
            try:
                idx_int = int(idx)
            except ValueError:
                idx_int = 0
        else:
            idx_int = 0
        return f"cuda:{idx_int}"
    logger.warning(f"Valor de device desconocido '{value}', se usara CPU.")
    return "cpu"


def _validate_gpu_device(device: str | None, *, who: str) -> str:
    """
    Si el device es cuda:x, validar que exista esa GPU.
    Si no hay GPUs o el indice no existe -> fallback.
    """
    if device is None:
        return "cpu"
    if device == "cpu":
        return "cpu"

    if device.startswith("cuda"):
        count = _gpu_count()
        if count == 0:
            logger.warning(
                f"{who}: se pidio {device} pero NO hay GPUs visibles "
                f"(torch.cuda.device_count()==0). -> usando CPU."
            )
            return "cpu"
        try:
            idx = int(device.split(":", 1)[1])
        except Exception:
            idx = 0
        if idx < 0 or idx >= count:
            logger.warning(
                f"{who}: se pidio {device} pero solo hay {count} GPU(s). "
                "-> usando cuda:0."
            )
            return "cuda:0"
        return f"cuda:{idx}"

    return device


# ------------------------------------------------------------
# 4) Resolucion de dispositivos segun modo
# ------------------------------------------------------------
def _resolve_global_device() -> str:
    """
    Device base cuando se usa RESOURCE_MODE=AUTO o como fallback.
    """
    dev = _normalize_device(DEVICE_RAW)

    # Log diagnostico una sola vez
    _log_torch_env()

    if dev == "auto":
        if torch is not None:
            try:
                if torch.cuda.is_available() and _gpu_count() > 0:
                    logger.info("AUTO: GPU disponible -> usando cuda:0")
                    return "cuda:0"
            except Exception as e:
                logger.warning(f"Error comprobando CUDA en AUTO: {e}")
        logger.info("AUTO: sin GPU -> usando CPU")
        return "cpu"

    dev_valid = _validate_gpu_device(dev, who="GLOBAL_DEVICE")
    logger.info(f"GLOBAL_DEVICE resuelto a: {dev_valid}")
    return dev_valid or "cpu"


GLOBAL_DEVICE = _resolve_global_device()


def _resolve_pytorch_device() -> str:
    if RESOURCE_MODE == "MANUAL" and PYTORCH_DEVICE_RAW:
        dev = _normalize_device(PYTORCH_DEVICE_RAW)
        dev = _validate_gpu_device(dev, who="PYTORCH_DEVICE")
        return dev or "cpu"
    return GLOBAL_DEVICE


def _resolve_tensorflow_device() -> str:
    if RESOURCE_MODE == "MANUAL" and TENSORFLOW_DEVICE_RAW:
        dev = _normalize_device(TENSORFLOW_DEVICE_RAW)
        dev = _validate_gpu_device(dev, who="TENSORFLOW_DEVICE")
        return dev or "cpu"
    return GLOBAL_DEVICE


PYTORCH_DEVICE = _resolve_pytorch_device()
TENSORFLOW_DEVICE = _resolve_tensorflow_device()

# ID simple para TensorFlow (lo que usas en CUDA_VISIBLE_DEVICES)
if TENSORFLOW_DEVICE.startswith("cuda"):
    try:
        TENSORFLOW_GPU_ID = TENSORFLOW_DEVICE.split(":", 1)[1]
    except Exception:
        TENSORFLOW_GPU_ID = "0"
else:
    TENSORFLOW_GPU_ID = ""

# ------------------------------------------------------------
# 5) Logs resumen finales
# ------------------------------------------------------------
logger.info("=" * 60)
logger.info("CONFIGURACION DEL MICROSERVICIO")
logger.info("=" * 60)
logger.info(f"RESOURCE_MODE              : {RESOURCE_MODE}")
logger.info(f"DEVICE_RAW                 : {DEVICE_RAW}")
logger.info(f"GLOBAL_DEVICE              : {GLOBAL_DEVICE}")
logger.info(f"PYTORCH_DEVICE (final)     : {PYTORCH_DEVICE}")
logger.info(f"TENSORFLOW_DEVICE (final)  : {TENSORFLOW_DEVICE}")
logger.info(f"TENSORFLOW_GPU_ID          : {TENSORFLOW_GPU_ID}")
logger.info("-" * 60)
logger.info(f"PYTORCH_MODEL_PATH         : {PYTORCH_MODEL_PATH}")
logger.info(f"TENSORFLOW_MODEL_PATH      : {TENSORFLOW_MODEL_PATH}")
logger.info("-" * 60)
logger.info(f"nnUNet_raw                 : {NNUNET_RAW}")
logger.info(f"nnUNet_preprocessed        : {NNUNET_PREPROCESSED}")
logger.info(f"nnUNet_results             : {NNUNET_RESULTS}")
logger.info("-" * 60)
logger.info(f"SEG_ENCRYPTION_ENABLED     : {SEG_ENCRYPTION_ENABLED}")
logger.info(f"SEG_ENCRYPTION_KEY_PRESENT : {bool(SEG_ENCRYPTION_KEY)}")
logger.info("-" * 60)
logger.info(f"OPERATION_MODE             : {OPERATION_MODE}")
logger.info(f"TEMP_STORAGE_DIR           : {TEMP_STORAGE_DIR}")
logger.info(f"TEMP_FILE_TTL_HOURS        : {TEMP_FILE_TTL_HOURS}")
logger.info(f"SERVER_BASE_URL            : {SERVER_BASE_URL}")
logger.info("=" * 60)