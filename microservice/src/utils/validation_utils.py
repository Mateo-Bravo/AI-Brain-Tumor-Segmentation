import os
import magic 
import re
import bleach
from src.utils.settings import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB
from fastapi import HTTPException

# ================================
# Sanitización de inputs maliciosos
# ================================

def sanitize_input(value: str) -> str:
    """Elimina etiquetas HTML o caracteres sospechosos de una cadena."""
    if not value:
        return ""
    cleaned = bleach.clean(value, strip=True)
    cleaned = re.sub(r"[<>\"';]", "", cleaned)
    return cleaned.strip()

def get_file_extension_from_name(filename: str) -> str:
    """
    Retorna la extensión correcta, manejando extensiones dobles como .nii.gz
    """
    name = filename.lower()
    if name.endswith(".nii.gz"):
        return ".nii.gz"
    # os.path.splitext en minúsculas
    return os.path.splitext(name)[1].lower()

def sanitize_filename(filename: str) -> str:
    """
    Verifica que el nombre del archivo no tenga patrones maliciosos y devuelve
    una versión segura del mismo (sin caracteres raros).
    """
    if not filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo vacío")

    base = os.path.basename(filename)
    ext = get_file_extension_from_name(base)

    # Validar extensión permitida
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Extensión de archivo no permitida")

    # Buscar intentos de traversal o scripts (../, /, \, <, >, script, ;, |, &, $)
    if re.search(r"(\.\.|/|\\|<|>|script|;|\||&|\$)", base, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Nombre de archivo sospechoso")

    # Limpiar nombre (permitir letras, números, punto, guion y guion bajo)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return safe_name

def validate_input_file(file_path: str):
    """
    Valida extensión, tipo MIME y tamaño del archivo.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"El archivo {file_path} no existe.")

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Formato no soportado: {ext}. Soportados: {ALLOWED_EXTENSIONS}")

    # Validar tipo MIME
    mime = magic.Magic(mime=True).from_file(file_path)
    if mime not in ALLOWED_MIME_TYPES:
        raise ValueError(f"Tipo MIME no permitido: {mime}. Permitidos: {ALLOWED_MIME_TYPES}")
    
    # Validar extensión
    if file_path.lower().endswith(tuple(ALLOWED_EXTENSIONS)) is False:
        raise ValueError(f"Formato no soportado: {file_path}. Soportados: {ALLOWED_EXTENSIONS}")

    # Validar tamaño
    size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise ValueError(f"Archivo demasiado grande ({size_mb:.2f} MB). Máximo: {MAX_FILE_SIZE_MB} MB.")

    return True