import logging
from logging.handlers import RotatingFileHandler
import os
import sys
from datetime import datetime

# ===============================
# CONFIGURACIÓN UTF-8 PARA WINDOWS
# ===============================
# Esto debe ir ANTES de crear los handlers
if sys.platform == "win32":
    try:
        # Reconfigurar stdout y stderr con UTF-8
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        # Python < 3.7
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')

# ===============================
# HANDLER PERSONALIZADO SEGURO PARA UTF-8
# ===============================
class SafeStreamHandler(logging.StreamHandler):
    """
    StreamHandler que maneja correctamente errores de encoding UTF-8.
    Especialmente útil en Windows donde cp1252 puede causar problemas con emojis.
    """
    def __init__(self, stream=None):
        super().__init__(stream)
        # Forzar UTF-8 en el stream si es posible
        if hasattr(self.stream, 'reconfigure'):
            try:
                self.stream.reconfigure(encoding='utf-8', errors='replace')
            except Exception:
                pass
    
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            # Intentar escribir normalmente
            stream.write(msg + self.terminator)
            self.flush()
        except UnicodeEncodeError:
            # Si falla con UTF-8, reemplazar caracteres problemáticos
            try:
                msg_safe = self.format(record)
                # Reemplazar caracteres no ASCII con '?'
                msg_safe = msg_safe.encode('ascii', errors='replace').decode('ascii')
                stream.write(msg_safe + self.terminator)
                self.flush()
            except Exception:
                # Último recurso: ignorar el error
                self.handleError(record)

# ===============================
# CONFIGURACIÓN GENERAL DE LOGGING
# ===============================

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Archivo de log principal
LOG_FILE = os.path.join(LOG_DIR, "app.log")

# Configuración del logger raíz
logger = logging.getLogger("app_logger")
logger.setLevel(logging.INFO)

# Evitar duplicación de handlers
if not logger.handlers:
    # Handler de rotación (máx. 5 MB, 5 archivos)
    # El archivo siempre usa UTF-8
    file_handler = RotatingFileHandler(
        LOG_FILE, 
        maxBytes=5_000_000, 
        backupCount=5,
        encoding='utf-8'  # ✅ Asegurar UTF-8 en archivos
    )
    
    # Handler de consola con manejo seguro de UTF-8
    console_handler = SafeStreamHandler()

    # Formatter con UTF-8
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)


def log_request(request, body: str):
    """
    Guarda detalles de una solicitud HTTP.
    """
    logger.info(
        f"[REQUEST] {request.method} {request.url.path} | "
        f"Client: {request.client.host} | Body: {body[:300]}..."
    )


def log_response(request, status_code: int, response_time: float):
    """
    Guarda detalles de la respuesta HTTP.
    """
    logger.info(
        f"[RESPONSE] {request.method} {request.url.path} | "
        f"Status: {status_code} | Time: {response_time:.3f}s"
    )


def log_error(context: str, error: Exception):
    """
    Guarda errores con su contexto.
    """
    logger.error(f"[ERROR] {context}: {str(error)}", exc_info=True)


def log_audit(action: str, user: str = "system", details: dict = None):
    """
    Guarda una acción de auditoría (Audit trail).
    """
    ts = datetime.utcnow().isoformat()
    logger.info(f"[AUDIT] {ts} | user={user} | action={action} | details={details}")