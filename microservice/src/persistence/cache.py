import os
import hashlib
import json
import redis

from src.utils.settings import settings


# =====================================================
#  CACHÉ EN MEMORIA PARA MODELOS (evita recarga)
# =====================================================
class ModelCache:
    _models = {}

    @classmethod
    def get(cls, model_name):
        return cls._models.get(model_name)

    @classmethod
    def set(cls, model_name, model):
        cls._models[model_name] = model

    @classmethod
    def clear(cls):
        cls._models.clear()

    @classmethod
    def all(cls):
        return list(cls._models.keys())


# =====================================================
#  CACHÉ DE RESULTADOS (ARCHIVOS SEGMENTADOS)
# =====================================================

RESULTS_DIR = settings.RESULTS_DIR
os.makedirs(RESULTS_DIR, exist_ok=True)


def file_sha256(path: str) -> str:
    """Genera SHA256 de un archivo para identificarlo sin ambigüedad."""
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def cached_mask_path(file_hash: str) -> str:
    """Ruta donde se guardará la máscara de segmentación cacheada."""
    return os.path.join(RESULTS_DIR, f"{file_hash}_segmented.nii.gz")


def has_cached_mask(file_hash: str) -> bool:
    """Verifica si existe una máscara cacheada en disco."""
    return os.path.exists(cached_mask_path(file_hash))


# =====================================================
#  CACHÉ GLOBAL REDIS (OPCIONAL)
# =====================================================

REDIS_URL = settings.REDIS_URL
CACHE_TTL = settings.CACHE_TTL

try:
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()  # Test rápido
    redis_available = True
except Exception:
    r = None
    redis_available = False


def cache_set(key, value, ttl=CACHE_TTL):
    """Guarda valores JSON en Redis, si está disponible."""
    if not redis_available:
        return False

    try:
        r.set(key, json.dumps(value), ex=ttl)
        return True
    except Exception:
        return False


def cache_get(key):
    """Obtiene valores JSON desde Redis, si está disponible."""
    if not redis_available:
        return None

    try:
        data = r.get(key)
        return json.loads(data) if data else None
    except Exception:
        return None
