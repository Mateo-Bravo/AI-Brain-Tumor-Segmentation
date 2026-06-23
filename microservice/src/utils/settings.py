import os
import torch
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address
from pathlib import Path

# ============================================================
# CARGA DE ENTORNO
# ============================================================
load_dotenv()

# ============================================================
# DEVICE (CPU / GPU)
# ============================================================
def torch_device_from_user(device_str: str | None = None) -> torch.device:
    if not device_str or device_str == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    device_str = device_str.lower().strip()
    if device_str == "cpu":
        return torch.device("cpu")
    if device_str in {"gpu", "cuda"}:
        return torch.device("cuda")
    if ":" in device_str:
        return torch.device(device_str)
    return torch.device("cpu")

DEFAULT_DEVICE = torch_device_from_user(os.getenv("DEVICE", "auto"))

# ============================================================
# ENTORNO
# ============================================================
ENV = os.getenv("ENV", "dev")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 3020))

# ============================================================
# LOGGING
# ============================================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_PATH = os.getenv("LOG_PATH", "logs/app.log")
Path(LOG_PATH).parent.mkdir(parents=True, exist_ok=True)

# ============================================================
# TENSORFLOW
# ============================================================
TF_MODEL_PATH = os.getenv(
    "TF_MODEL_PATH",
    "models/modelUnet3D_3_multi_scale_input.h5"
)
TF_INPUT_SIZE = tuple(
    map(int, os.getenv("TF_INPUT_SIZE", "128x128x128").split("x"))
)
TF_BATCH_SIZE = int(os.getenv("TF_BATCH_SIZE", 1))
os.environ["TF_CPP_MIN_LOG_LEVEL"] = os.getenv("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ["TF_ENABLE_ONEDNN_OPTS"] = os.getenv("TF_ENABLE_ONEDNN_OPTS", "0")

# ============================================================
# PYTORCH
# ============================================================
PYTORCH_MODEL_PATH = os.getenv(
    "PYTORCH_MODEL_PATH",
    "models/checkpoint_best.pth"
)

# ============================================================
# nnU-Net v2
# ============================================================
NNUNET_RAW          = Path(os.getenv("nnUNet_raw",          "app/nnUnet/nnUNet_raw"))
NNUNET_PREPROCESSED = Path(os.getenv("nnUNet_preprocessed", "app/nnUnet/nnUNet_preprocessed"))
NNUNET_RESULTS      = Path(os.getenv("nnUNet_results",      "app/nnUnet/nnUNet_results"))
for p in [NNUNET_RAW, NNUNET_PREPROCESSED, NNUNET_RESULTS]:
    p.mkdir(parents=True, exist_ok=True)

# ============================================================
# DIRECTORIOS DE SALIDA
# ============================================================
RESULTS_DIR = Path(os.getenv("RESULTS_DIR", "results"))
TEMP_DIR = Path(os.getenv("TEMP_DIR", "temp"))
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# BASE DE DATOS
# ============================================================
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/segmentation_db"
)

# ============================================================
# SEGURIDAD
# ============================================================
API_KEY = os.getenv("API_KEY")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 150))
ALLOWED_EXTENSIONS = {
    ".nii", ".nii.gz", ".dcm", ".npy",
    ".png", ".jpg", ".jpeg"
}

# ============================================================
# RATE LIMITING
# ============================================================
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["5/minute"]
)