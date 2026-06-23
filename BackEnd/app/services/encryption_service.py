"""
Servicio de encriptación para el backend.
Usa la MISMA lógica que el microservicio (Fernet + clave efímera).
"""

from pathlib import Path
from typing import Dict, Tuple
import logging
from cryptography.fernet import Fernet
import os

logger = logging.getLogger(__name__)

# ============================================================
# CLAVE MAESTRA (debe ser la MISMA que en el microservicio)
# ============================================================

def _get_master_key() -> bytes:
    """
    Obtiene la clave maestra desde el .env.
    Debe ser la MISMA que SEG_ENCRYPTION_KEY del microservicio.
    """
    master_key = os.getenv("SEG_ENCRYPTION_KEY")
    
    if not master_key:
        raise RuntimeError("SEG_ENCRYPTION_KEY no está configurada en .env")
    
    return master_key.strip().encode('utf-8')


def _get_master_fernet() -> Fernet:
    """Construye un Fernet con la clave maestra."""
    key = _get_master_key()
    return Fernet(key)


# ============================================================
# ENCRIPTACIÓN DE ARCHIVOS (MISMA LÓGICA QUE MICROSERVICIO)
# ============================================================

def encrypt_file_for_upload(file_path: str) -> Tuple[bytes, str]:
    """
    Encripta un archivo para subirlo al microservicio.
    
    Flujo (IGUAL que encrypt_file_with_ephemeral del microservicio):
    1. Lee archivo original
    2. Genera clave efímera
    3. Encripta con clave efímera
    4. Envuelve clave efímera con clave maestra
    
    Args:
        file_path: Ruta al archivo a encriptar
    
    Returns:
        Tupla de (encrypted_data, wrapped_key)
        - encrypted_data: bytes del archivo encriptado (listo para enviar)
        - wrapped_key: string con la clave efímera envuelta
    """
    logger.info(f"🔐 Encriptando archivo para upload: {file_path}")
    
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
    
    # Leer archivo original
    original_data = path.read_bytes()
    logger.info(f"   Tamaño original: {len(original_data)} bytes")
    
    # 1. Generar clave efímera
    ephemeral_key = Fernet.generate_key()
    logger.debug("   🧬 Clave efímera generada")
    
    # 2. Encriptar datos con clave efímera
    ephemeral_fernet = Fernet(ephemeral_key)
    encrypted_data = ephemeral_fernet.encrypt(original_data)
    logger.info(f"   Tamaño encriptado: {len(encrypted_data)} bytes")
    
    # 3. Envolver clave efímera con clave maestra
    master_fernet = _get_master_fernet()
    wrapped_key = master_fernet.encrypt(ephemeral_key).decode('utf-8')
    logger.debug("   🔑 Clave efímera envuelta con clave maestra")
    
    logger.info(f"✅ Archivo encriptado correctamente")
    logger.info(f"   Overhead: {len(encrypted_data) - len(original_data)} bytes")
    
    return encrypted_data, wrapped_key


def encrypt_bytes_for_upload(data: bytes) -> Tuple[bytes, str]:
    """
    Encripta bytes directamente (sin leer de archivo).
    
    Args:
        data: bytes a encriptar
    
    Returns:
        Tupla de (encrypted_data, wrapped_key)
    """
    logger.info(f"🔐 Encriptando bytes para upload: {len(data)} bytes")
    
    # 1. Generar clave efímera
    ephemeral_key = Fernet.generate_key()
    
    # 2. Encriptar datos
    ephemeral_fernet = Fernet(ephemeral_key)
    encrypted_data = ephemeral_fernet.encrypt(data)
    
    # 3. Envolver clave efímera
    master_fernet = _get_master_fernet()
    wrapped_key = master_fernet.encrypt(ephemeral_key).decode('utf-8')
    
    logger.info(f"✅ Bytes encriptados: {len(encrypted_data)} bytes")
    
    return encrypted_data, wrapped_key


# ============================================================
# 🆕 DESENCRIPTACIÓN DE ARCHIVOS (PARA CLIENTE)
# ============================================================

def decrypt_file_with_wrapped(
    enc_path: Path | str,
    wrapped_key: str,
    output_path: Path | str
) -> None:
    """
    Desencripta un archivo usando una clave envuelta (wrapped key).
    
    Flujo:
    1. Desenvolver clave efímera con clave maestra
    2. Desencriptar archivo con clave efímera
    3. Guardar archivo desencriptado
    
    Args:
        enc_path: Ruta del archivo encriptado (.enc)
        wrapped_key: Clave efímera envuelta en base64
        output_path: Ruta donde guardar el archivo desencriptado
    
    Raises:
        ValueError: Si la clave maestra no está configurada
        FileNotFoundError: Si el archivo encriptado no existe
    """
    logger.info(f"🔓 Desencriptando archivo: {enc_path}")
    
    enc_path = Path(enc_path)
    output_path = Path(output_path)
    
    if not enc_path.exists():
        raise FileNotFoundError(f"Archivo encriptado no encontrado: {enc_path}")
    
    # 1. Desenvolver clave efímera con clave maestra
    master_fernet = _get_master_fernet()
    ephemeral_key = master_fernet.decrypt(wrapped_key.encode('utf-8'))
    logger.debug("   🔑 Clave efímera desenvuelta")
    
    # 2. Desencriptar archivo con clave efímera
    ephemeral_fernet = Fernet(ephemeral_key)
    
    with open(enc_path, 'rb') as f:
        encrypted_data = f.read()
    
    logger.info(f"   Tamaño encriptado: {len(encrypted_data)} bytes")
    
    decrypted_data = ephemeral_fernet.decrypt(encrypted_data)
    logger.info(f"   Tamaño desencriptado: {len(decrypted_data)} bytes")
    
    # 3. Guardar archivo desencriptado
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'wb') as f:
        f.write(decrypted_data)
    
    logger.info(f"✅ Archivo desencriptado guardado: {output_path}")


def decrypt_bytes_with_wrapped(
    encrypted_data: bytes,
    wrapped_key: str
) -> bytes:
    """
    Desencripta bytes directamente usando una clave envuelta.
    
    Args:
        encrypted_data: bytes encriptados
        wrapped_key: Clave efímera envuelta en base64
    
    Returns:
        bytes desencriptados
    """
    logger.info(f"🔓 Desencriptando bytes: {len(encrypted_data)} bytes")
    
    # 1. Desenvolver clave efímera
    master_fernet = _get_master_fernet()
    ephemeral_key = master_fernet.decrypt(wrapped_key.encode('utf-8'))
    
    # 2. Desencriptar datos
    ephemeral_fernet = Fernet(ephemeral_key)
    decrypted_data = ephemeral_fernet.decrypt(encrypted_data)
    
    logger.info(f"✅ Bytes desencriptados: {len(decrypted_data)} bytes")
    
    return decrypted_data


# ============================================================
# HELPER: Verificar que las claves coincidan
# ============================================================

def verify_encryption_key_match() -> bool:
    """
    Verifica que la clave maestra esté configurada correctamente.
    
    Returns:
        True si la clave está configurada
    """
    try:
        _get_master_fernet()
        logger.info("✅ Clave de encriptación configurada correctamente")
        return True
    except Exception as e:
        logger.error(f"❌ Error en configuración de encriptación: {e}")
        return False