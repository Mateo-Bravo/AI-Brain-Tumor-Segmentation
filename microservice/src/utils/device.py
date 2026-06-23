# src/utils/device.py
import torch
import tensorflow as tf
from typing import Optional


# =====================================================================
# Normalización de strings: gpu / cuda / cpu / auto
# =====================================================================
def normalize_device_str(device: Optional[str]) -> Optional[str]:
    """
    Normaliza un string device ingresado por el usuario.

    Entradas aceptadas:
        "cpu"
        "gpu", "gpu0", "gpu:0", "gpu:1"
        "cuda", "cuda:0", "cuda:1"
        "auto", None

    Retorna:
        "cpu"
        "gpu:0"
        "gpu:1"
        None   (para auto-selección)
    """
    if device is None:
        return None

    s = str(device).strip().lower()

    # Auto → None
    if s in ("auto", "", "none"):
        return None

    # CPU
    if s == "cpu":
        return "cpu"

    # GPU formats:
    # gpu
    if s == "gpu":
        return "gpu:0"

    # gpu0  → gpu:0
    if s.startswith("gpu") and ":" not in s:
        try:
            idx = int(s.replace("gpu", ""))
        except:
            idx = 0
        return f"gpu:{idx}"

    # gpu:0
    if s.startswith("gpu:"):
        try:
            idx = int(s.split(":")[1])
        except:
            idx = 0
        return f"gpu:{idx}"

    # cuda → gpu:0
    if s == "cuda":
        return "gpu:0"

    # cuda:1 → gpu:1
    if s.startswith("cuda:"):
        try:
            idx = int(s.split(":")[1])
        except:
            idx = 0
        return f"gpu:{idx}"

    return None



# =====================================================================
# TensorFlow device mapping
# =====================================================================
def tf_device_from_user(device: Optional[str]) -> str:
    """
    Devuelve el device string para TensorFlow:

    - ""  → usar automático
    - "/CPU:0"
    - "/GPU:0"
    - "/GPU:1"
    """
    nd = normalize_device_str(device)

    # Auto
    if nd is None:
        return ""

    if nd == "cpu":
        return "/CPU:0"

    if nd.startswith("gpu:"):
        idx = nd.split(":")[1]
        return f"/GPU:{idx}"

    return ""  # fallback



# =====================================================================
# PyTorch device mapping
# =====================================================================
def torch_device_from_user(device: Optional[str]) -> torch.device:
    """
    Convierte un device string de usuario en torch.device:
        - auto: cuda si disponible → cpu
        - cpu → torch.device("cpu")
        - gpu:x → torch.device("cuda:x") (si existe)
    """
    nd = normalize_device_str(device)

    # AUTO mode
    if nd is None:
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # CPU
    if nd == "cpu":
        return torch.device("cpu")

    # GPU:x
    if nd.startswith("gpu:"):
        idx = int(nd.split(":")[1])

        # Validar GPU disponible
        if torch.cuda.is_available() and idx < torch.cuda.device_count():
            return torch.device(f"cuda:{idx}")

        # Fallback seguro
        return torch.device("cpu")

    # fallback final
    return torch.device("cpu")
