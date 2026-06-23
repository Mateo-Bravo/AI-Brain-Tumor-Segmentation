# ==================================================================
# CONFIGURACIÓN PRINCIPAL DEL BACKEND - VARIABLES DE ENTORNO
# ==================================================================
# Este archivo centraliza toda la configuración del backend del
# sistema médico de imágenes, incluyendo:
# - Conexión a base de datos MySQL remota
# - Configuración SMTP para envío de emails
# - Rutas de almacenamiento de imágenes y modelos ML
# - Claves de seguridad y tokens JWT
# - URLs del frontend para integración
# ==================================================================

# Importaciones necesarias
import os                    # Para manejo de variables de entorno
from dotenv import load_dotenv  # Para cargar archivo .env

# ===== CARGA DE VARIABLES DE ENTORNO =====
# Construir ruta al archivo .env (ubicado en raíz del proyecto)
env_path = os.path.join(os.path.dirname(__file__), '../../.env')

# Cargar variables desde el archivo .env
load_dotenv(env_path)

# ===== CONFIGURACIÓN DE BASE DE DATOS =====
# URL de conexión a la base de datos MySQL externa
# Formato: mysql://usuario:password@host:puerto/nombre_db
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no está configurado en .env")

# ===== CONFIGURACIÓN DE ALMACENAMIENTO =====
# Directorio base para almacenar imágenes médicas subidas
IMAGE_BASE_DIR = os.getenv("IMAGE_BASE_DIR")
if not IMAGE_BASE_DIR:
    raise ValueError("IMAGE_BASE_DIR no está configurado en .env")

# ===== CONFIGURACIÓN DE MODELOS DE MACHINE LEARNING =====
# Nota: MODEL_PATH individual fue reemplazado por MODEL_BASE_DIR
# # Ruta base para los modelos entrenados (DEPRECADO)
# MODEL_PATH = os.getenv("MODEL_PATH")
# if not MODEL_PATH:
#     raise ValueError("MODEL_PATH no está configurado en .env")

# Directorio base que contiene todos los modelos entrenados
MODEL_BASE_DIR = os.getenv("MODEL_BASE_DIR")
if not MODEL_BASE_DIR:
    raise ValueError("MODEL_BASE_DIR no está configurado en .env")

# ===== CONFIGURACIÓN DE SEGURIDAD =====
# Clave secreta para firmar tokens JWT y cifrado de sesiones
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY no está configurado en .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ===== TIEMPOS DE EXPIRACIÓN DE TOKENS =====
VERIFICATION_TOKEN_EXPIRE_MINUTES_ADMINISTRATOR = 30  # 30 minutos para verificar cuentas de administradores
VERIFICATION_TOKEN_EXPIRE_MINUTES_DOCTOR = 10  # 10 minutos para verificar cuentas de médicos
RESET_PASSWORD_TOKEN_EXPIRE_MINUTES = 15  # 15 minutos para reset de contraseña

# ===== TIEMPOS DE LIMPIEZA DE CUENTAS NO VERIFICADAS (1 minuto después de expiración) =====
CLEANUP_UNVERIFIED_ADMINISTRATOR_MINUTES = VERIFICATION_TOKEN_EXPIRE_MINUTES_ADMINISTRATOR + 1  # 31 minutos
CLEANUP_UNVERIFIED_DOCTOR_MINUTES = VERIFICATION_TOKEN_EXPIRE_MINUTES_DOCTOR + 1  # 11 minutos
CLEANUP_RESET_PASSWORD_MINUTES = RESET_PASSWORD_TOKEN_EXPIRE_MINUTES + 1  # 16 minutos

# ===== INTERVALO DEL SCHEDULER DE LIMPIEZA =====
# Ejecutar cada 5 minutos para limpiar tokens y cuentas expiradas
CLEANUP_SCHEDULER_INTERVAL_MINUTES = 5

# Inicializar la base de datos al iniciar el servidor
INIT_DB = os.getenv("INIT_DB", "false").lower() == "true"

# ==================== CONFIGURACIÓN DE EMAIL ====================
# Configuración SMTP para envío de emails
MAIL_USERNAME = os.getenv("MAIL_USERNAME")  # tu-email@gmail.com
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")  # tu-app-password
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)  # Email remitente
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))  # Puerto SMTP
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")  # Servidor SMTP
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Sistema Médico")  # Nombre del remitente
MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "true").lower() == "true"
MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "false").lower() == "true"

# URL base del frontend para verificación
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ==================== CONFIGURACIÓN DE ADMIN VALIDADOR ====================
# Email del administrador que valida nuevas cuentas de administradores
ADMIN_VALIDATOR_EMAIL = os.getenv("ADMIN_VALIDATOR_EMAIL", "alfonsovictor123castro@gmail.com")