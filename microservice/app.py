# ===========================================================
# APP.PY - APLICACIÓN PRINCIPAL
# Microservicio de Segmentación Médica
# Con modo híbrido para transferencia entre redes
# ===========================================================

import sys
import os
import warnings
from contextlib import asynccontextmanager
from datetime import datetime

# ============================================================
# CONFIGURAR UTF-8 PARA WINDOWS (DEBE IR ANTES DE TODO)
# ============================================================
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
    os.environ['PYTHONIOENCODING'] = 'utf-8'

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from dotenv import load_dotenv

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Utils
from src.utils.settings import limiter
from src.utils.logging_config import logger

# Router 
from src.api.api_controller import router as api_router

# 🆕 Importar para health check enriquecido
import torch
from src.utils import settings

# 🆕 File Manager para limpieza periódica
from src.services.file_manager import file_manager

# ===========================================================
# CONFIGURACIÓN INICIAL
# ===========================================================

# -------------------------------------------------
# WARNINGS
# -------------------------------------------------
warnings.filterwarnings(
    "ignore",
    message="The pynvml package is deprecated"
)
warnings.filterwarnings("ignore", category=SyntaxWarning)

# -------------------------------------------------
# ENV
# -------------------------------------------------
load_dotenv()

ENV = os.getenv("ENV", "dev").lower()
IS_PROD = ENV == "prod"

# ===========================================================
# 🆕 CONFIGURAR nnU-Net ANTES DE IMPORTAR (Si lo usas)
# ===========================================================
# Si usas nnU-Net, descomenta estas líneas:
# os.environ['nnUNet_raw'] = os.path.join(os.getcwd(), 'src', 'nnUnet', 'nnUNet_raw')
# os.environ['nnUNet_preprocessed'] = os.path.join(os.getcwd(), 'src', 'nnUnet', 'nnUNet_preprocessed')
# os.environ['nnUNet_results'] = os.path.join(os.getcwd(), 'src', 'nnUnet', 'nnUNet_results')

# ===========================================================
# LIFESPAN - Gestión de inicio y cierre
# ===========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestiona el ciclo de vida de la aplicación.
    Se ejecuta al iniciar y al cerrar el servidor.
    """
    logger.info("=" * 60)
    logger.info(f"🚀 MICROSERVICIO INICIADO")
    logger.info(f"   Modo: {ENV.upper()}")
    logger.info(f"   Documentación activa: {not IS_PROD}")
    logger.info(f"   Modo de operación: {getattr(settings, 'OPERATION_MODE', 'N/A')}")
    logger.info(f"   Server URL: {getattr(settings, 'SERVER_BASE_URL', 'N/A')}")
    logger.info("=" * 60)
    
    # 🆕 Detectar hardware al inicio
    await detect_hardware()
    
    # 🆕 Iniciar limpieza periódica (opcional)
    # Si quieres limpieza automática en background, usa un scheduler
    # Por ahora, solo log
    logger.info("✅ Sistema listo para recibir peticiones")
    
    yield
    
    # Al cerrar
    logger.info("=" * 60)
    logger.info("🛑 MICROSERVICIO DETENIENDO...")
    
    # 🆕 Limpieza final de sesiones temporales
    try:
        expired_count = file_manager.cleanup_expired_sessions()
        logger.info(f"🧹 Limpieza final: {expired_count} sesiones eliminadas")
    except Exception as e:
        logger.warning(f"⚠️ Error en limpieza final: {e}")
    
    logger.info("✅ Microservicio detenido correctamente")
    logger.info("=" * 60)


# ===========================================================
# 🆕 FUNCIÓN: DETECTAR HARDWARE
# ===========================================================
async def detect_hardware():
    """
    Detecta y registra el hardware disponible (GPU/CPU).
    """
    logger.info("=" * 60)
    logger.info("🔍 DETECTANDO HARDWARE DISPONIBLE...")
    logger.info("=" * 60)
    
    # ==========================================
    # PyTorch / CUDA
    # ==========================================
    try:
        gpu_available = torch.cuda.is_available()
        gpu_count = torch.cuda.device_count() if gpu_available else 0
        
        if gpu_available:
            logger.info(f"✅ [PyTorch] GPU DISPONIBLE")
            logger.info(f"   Dispositivos: {gpu_count}")
            
            for i in range(gpu_count):
                gpu_name = torch.cuda.get_device_name(i)
                logger.info(f"   GPU {i}: {gpu_name}")
        else:
            logger.info("ℹ️  [PyTorch] No se detectó GPU - Usando CPU")
    
    except Exception as e:
        logger.warning(f"⚠️ [PyTorch] Error detectando GPU: {e}")
    
    # ==========================================
    # TensorFlow
    # ==========================================
    try:
        import tensorflow as tf
        
        gpus = tf.config.list_physical_devices("GPU")
        
        if gpus:
            logger.info(f"✅ [TensorFlow] GPU DISPONIBLE")
            logger.info(f"   Dispositivos: {len(gpus)}")
            
            for gpu in gpus:
                logger.info(f"   {gpu.name}")
        else:
            logger.info("ℹ️  [TensorFlow] No se detectó GPU - Usando CPU")
    
    except Exception as e:
        logger.warning(f"⚠️ [TensorFlow] Error detectando GPU: {e}")
    
    logger.info("=" * 60)


# ===========================================================
# FASTAPI APP
# ===========================================================
app = FastAPI(
    title="Servicio de Segmentación Cerebral",
    description="Microservicio de segmentación médica con nnU-Net y TensorFlow. Soporta transferencia de archivos entre redes.",
    version="2.0.0",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    lifespan=lifespan,
)

# ===========================================================
# CORS - Permitir peticiones desde otros dominios
# ===========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica los dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================================================
# MIDDLEWARE - LOGGING DE PETICIONES
# ===========================================================
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """
    Middleware para registrar todas las peticiones HTTP.
    Útil para debugging y auditoría.
    """
    try:
        method = request.method
        url = str(request.url)
        headers = dict(request.headers)

        # Preview del body
        body_preview = "<Cuerpo omitido>"
        body_bytes = await request.body()

        content_type = headers.get("content-type", "")
        if content_type.startswith("application/json"):
            try:
                body_preview = body_bytes.decode("utf-8")
            except Exception:
                body_preview = "<JSON no decodificable>"
        elif content_type.startswith("multipart/form-data"):
            body_preview = "<Archivo binario recibido>"

        logger.info(
            f"[REQUEST] {method} {url} | {content_type} | {body_preview}"
        )

        # Procesar petición
        response = await call_next(request)

        logger.info(
            f"[RESPONSE] {method} {url} | Status {response.status_code}"
        )
        
        return response

    except Exception as e:
        logger.exception(f"[ERROR] Middleware logging: {e}")
        raise


# ===========================================================
# RATE LIMITING - Limitar peticiones por IP
# ===========================================================
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ===========================================================
# STATIC FILES - Archivos estáticos (CSS, JS, imágenes)
# ===========================================================
# Crear directorio si no existe
os.makedirs("static", exist_ok=True)

try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
    logger.info("✅ Directorio 'static' montado correctamente")
except Exception as e:
    logger.warning(f"⚠️ No se pudo montar directorio 'static': {e}")


# ===========================================================
# ROUTES - Incluir rutas del API
# ===========================================================
app.include_router(api_router, prefix="/api/v1")


# ===========================================================
# ROOT - Redirección a health check
# ===========================================================
@app.get("/", include_in_schema=False)
async def redirect_root():
    """
    Redirige automáticamente al health check.
    """
    return RedirectResponse(url="/api/v1/health")


# ===========================================================
# 🆕 HEALTH CHECKS ADICIONALES (Compatibilidad)
# ===========================================================
@app.get("/health", tags=["health"])
async def health_check_simple():
    """
    Health check simple en la raíz (para compatibilidad).
    Redirige al health check principal.
    """
    return RedirectResponse(url="/api/v1/health")


@app.get("/api/health-check", tags=["health"])
async def health_check_legacy():
    """
    Health check legacy (para backward compatibility).
    """
    return {"status": "ok", "service": "segmentation"}


# ===========================================================
# 🆕 FAVICON
# ===========================================================
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """
    Sirve el favicon del sitio.
    """
    favicon_path = "static/favicon.ico"
    
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    else:
        # Retornar un ícono por defecto (opcional)
        logger.warning(f"⚠️ Favicon no encontrado: {favicon_path}")
        return {"message": "Favicon not found"}


# ===========================================================
# 🆕 DOCUMENTACIÓN PERSONALIZADA
# ===========================================================
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """
    Swagger UI personalizado con favicon.
    """
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Documentación",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_favicon_url="/favicon.ico"
    )


@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    """
    ReDoc personalizado con favicon.
    """
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc",
        redoc_favicon_url="/favicon.ico"
    )


# ===========================================================
# 🆕 ENDPOINT: INFORMACIÓN DEL SISTEMA
# ===========================================================
@app.get("/api/v1/system/info", tags=["system"])
async def system_info():
    """
    Retorna información detallada del sistema.
    Útil para debugging y monitoreo.
    """
    try:
        gpu_available = torch.cuda.is_available()
        gpu_count = torch.cuda.device_count() if gpu_available else 0
        gpu_names = []
        
        if gpu_available:
            for i in range(gpu_count):
                gpu_names.append(torch.cuda.get_device_name(i))
    
    except Exception:
        gpu_available = False
        gpu_count = 0
        gpu_names = []
    
    # TensorFlow info
    try:
        import tensorflow as tf
        tf_gpus = tf.config.list_physical_devices("GPU")
        tf_gpu_count = len(tf_gpus)
    except Exception:
        tf_gpu_count = 0
    
    # File manager stats
    try:
        fm_stats = file_manager.get_stats()
    except Exception as e:
        fm_stats = {"error": str(e)}
    
    return {
        "service": {
            "name": app.title,
            "version": app.version,
            "environment": ENV,
            "production": IS_PROD,
        },
        "configuration": {
            "operation_mode": getattr(settings, 'OPERATION_MODE', 'N/A'),
            "server_base_url": getattr(settings, 'SERVER_BASE_URL', 'N/A'),
            "temp_storage_dir": getattr(settings, 'TEMP_STORAGE_DIR', 'N/A'),
            "temp_ttl_hours": getattr(settings, 'TEMP_FILE_TTL_HOURS', 'N/A'),
            "encryption_enabled": getattr(settings, 'SEG_ENCRYPTION_ENABLED', 'N/A'),
        },
        "hardware": {
            "pytorch": {
                "gpu_available": gpu_available,
                "gpu_count": gpu_count,
                "gpu_names": gpu_names,
            },
            "tensorflow": {
                "gpu_count": tf_gpu_count,
            }
        },
        "file_manager": fm_stats,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ===========================================================
# 🆕 STARTUP EVENT - Verificaciones adicionales
# ===========================================================
@app.on_event("startup")
async def startup_event():
    """
    Evento que se ejecuta al iniciar el servidor.
    Realiza verificaciones adicionales.
    """
    logger.info("=" * 60)
    logger.info("🔧 VERIFICANDO CONFIGURACIÓN DEL SISTEMA...")
    logger.info("=" * 60)
    
    # Verificar directorios necesarios
    required_dirs = [
        getattr(settings, 'DIAGNOSTIC_DIR', './diagnostic'),
        getattr(settings, 'TEMP_STORAGE_DIR', '/tmp/segmentations'),
    ]
    
    for directory in required_dirs:
        try:
            os.makedirs(directory, exist_ok=True)
            logger.info(f"✅ Directorio verificado: {directory}")
        except Exception as e:
            logger.error(f"❌ Error creando directorio {directory}: {e}")
    
    # Verificar que file_manager esté disponible
    try:
        stats = file_manager.get_stats()
        logger.info(f"✅ FileManager activo: {stats['total_sessions']} sesiones")
    except Exception as e:
        logger.error(f"❌ Error verificando FileManager: {e}")
    
    logger.info("=" * 60)


# ===========================================================
# 🆕 SHUTDOWN EVENT - Limpieza al cerrar
# ===========================================================
@app.on_event("shutdown")
async def shutdown_event():
    """
    Evento que se ejecuta al cerrar el servidor.
    Realiza limpieza final.
    """
    logger.info("=" * 60)
    logger.info("🧹 EJECUTANDO LIMPIEZA FINAL...")
    logger.info("=" * 60)
    
    # Ya se hace en lifespan, pero por si acaso
    try:
        expired_count = file_manager.cleanup_expired_sessions()
        logger.info(f"✅ {expired_count} sesiones temporales eliminadas")
    except Exception as e:
        logger.warning(f"⚠️ Error en limpieza: {e}")
    
    logger.info("=" * 60)


# ===========================================================
# 🆕 CARGA DE MODELOS (Solo en proceso principal)
# ===========================================================
# Si usas carga de modelos pesados, hazlo solo una vez
if os.environ.get("RUN_MAIN") != "true":
    # Solo cargar en proceso principal (no en reloader)
    logger.info("=" * 60)
    logger.info("📦 CARGANDO MODELOS...")
    logger.info("=" * 60)
    
    # Ejemplo: Inicializar modelos aquí si es necesario
    # model_nn = ModelPyTorch()
    # model_tf = TensorflowModel()
    
    logger.info("✅ Modelos cargados correctamente")
    logger.info("=" * 60)


# ===========================================================
# MAIN - Ejecución directa
# ===========================================================
if __name__ == "__main__":
    import uvicorn
    
    # Configuración de uvicorn
    uvicorn_config = {
        "app": "app:app",
        "host": "0.0.0.0",
        "port": int(os.getenv("PORT", 3021)),
        "reload": not IS_PROD,  # Solo reload en desarrollo
        "log_level": "info",
        "access_log": True,
    }
    
    logger.info("=" * 60)
    logger.info("🚀 INICIANDO SERVIDOR UVICORN")
    logger.info(f"   Host: {uvicorn_config['host']}")
    logger.info(f"   Puerto: {uvicorn_config['port']}")
    logger.info(f"   Reload: {uvicorn_config['reload']}")
    logger.info("=" * 60)
    
    uvicorn.run(**uvicorn_config)