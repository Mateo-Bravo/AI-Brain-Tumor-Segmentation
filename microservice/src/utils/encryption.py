#encryption.py

from pathlib import Path
from typing import Any, Dict
import json
import logging

from cryptography.fernet import Fernet, InvalidToken
from src.core.config import SEG_ENCRYPTION_KEY

logger = logging.getLogger(__name__)

# ============================================================
# CLAVE MAESTRA (compartida entre microservicios)
# ============================================================

def _get_master_fernet() -> Fernet:
    """
    Construye un Fernet a partir de la clave maestra.

    SEG_ENCRYPTION_KEY debe ser una key válida de Fernet
    (32 bytes base64 urlsafe), por ejemplo generada con:

        from cryptography.fernet import Fernet
        print(Fernet.generate_key().decode())

    y luego puesta en el .env.
    """

    raw_key = SEG_ENCRYPTION_KEY

    if not raw_key:
        logger.error(
            "❌ SEG_ENCRYPTION_KEY no está configurada. "
            "No se puede construir el Fernet maestro."
        )
        raise RuntimeError("SEG_ENCRYPTION_KEY no está configurada")

    # Limpiar espacios / saltos de línea que puedan venir del .env
    key_str = raw_key.strip()

    # Pequeño preview seguro (no mostramos toda la key)
    if len(key_str) >= 8:
        preview = f"{key_str[:4]}...{key_str[-4:]}"
    else:
        preview = key_str

    logger.info(
        "🔑 Construyendo Fernet maestro para encriptación de segmentación. "
        f"len={len(key_str)}, preview={preview!r}"
    )

    try:
        f = Fernet(key_str)
    except Exception as e:
        logger.error(
            "❌ La clave en SEG_ENCRYPTION_KEY NO es válida para Fernet. "
            f"len={len(key_str)}, preview={preview!r}, "
            f"error={type(e).__name__}: {e}"
        )
        raise

    return f


# ============================================================
# MANEJO DE CLAVES EFÍMERAS (una por segmentación)
# ============================================================

def generate_ephemeral_key() -> bytes:
    """
    Genera una clave efímera (DEK) para una segmentación.
    Es una key Fernet (32 bytes base64 urlsafe).
    """
    eph_key = Fernet.generate_key()
    logger.debug("🧬 Clave efímera generada para una nueva segmentación.")
    return eph_key


def wrap_key(ephemeral_key: bytes) -> str:
    """
    Cifra la clave efímera con la clave maestra.
    Devuelve un string (token Fernet) apto para enviar por JSON.
    """
    master = _get_master_fernet()
    wrapped = master.encrypt(ephemeral_key)
    logger.debug("🔐 Clave efímera envuelta con la clave maestra.")
    return wrapped.decode("utf-8")


def unwrap_key(wrapped_key: str) -> bytes:
    """
    Desencripta la clave efímera usando la clave maestra.

    :param wrapped_key: token devuelto por wrap_key (string)
    :return: clave efímera original (bytes)
    """
    master = _get_master_fernet()
    try:
        eph = master.decrypt(wrapped_key.encode("utf-8"))
        logger.debug("🔓 Clave efímera desencriptada correctamente con la clave maestra.")
        return eph
    except InvalidToken:
        logger.error(
            "❌ Error al desencriptar la clave efímera (wrapped_key inválida o corrupta)."
        )
        raise


def get_ephemeral_fernet(ephemeral_key: bytes) -> Fernet:
    """
    Construye un Fernet a partir de una clave efímera.
    """
    logger.debug("🧬 Construyendo Fernet a partir de clave efímera.")
    return Fernet(ephemeral_key)


# ============================================================
# CIFRADO / DESCIFRADO DE BYTES
# ============================================================

def encrypt_bytes_with_ephemeral(data: bytes) -> Dict[str, str]:
    """
    Cifra bytes con una clave efímera:

      - Genera eph_key (clave efímera)
      - Cifra data con eph_key -> ciphertext (token Fernet)
      - Envuelve eph_key con la clave maestra -> wrapped_key

    Devuelve un dict:
      {
        "ciphertext": "<token_fernet_en_texto>",
        "wrapped_key": "<token_fernet_con_eph_key>"
      }

    Ambos campos son strings, listos para meter en un JSON.
    """
    logger.debug("▶️ Iniciando cifrado de bytes con clave efímera.")
    eph_key = generate_ephemeral_key()
    eph_fernet = get_ephemeral_fernet(eph_key)

    ciphertext = eph_fernet.encrypt(data)        # bytes (base64 urlsafe)
    wrapped_key = wrap_key(eph_key)              # string

    logger.info(
        "✅ Cifrado de bytes completado con clave efímera. "
        "Se generó wrapped_key asociada a este payload."
    )
    return {
        "ciphertext": ciphertext.decode("utf-8"),
        "wrapped_key": wrapped_key,
    }


def decrypt_bytes_with_wrapped(ciphertext: str, wrapped_key: str) -> bytes:
    """
    Desencripta bytes usando:

      - ciphertext: token Fernet (string) devuelto por encrypt_bytes_with_ephemeral
      - wrapped_key: clave efímera envuelta con la master (string)

    Devuelve los bytes originales.
    """
    logger.debug("▶️ Iniciando desencriptado de bytes con wrapped_key.")
    eph_key = unwrap_key(wrapped_key)
    eph_fernet = get_ephemeral_fernet(eph_key)

    try:
        data = eph_fernet.decrypt(ciphertext.encode("utf-8"))
        logger.info("✅ Desencriptado de bytes completado correctamente.")
        return data
    except InvalidToken:
        logger.error(
            "❌ Error al desencriptar bytes: ciphertext inválido o no corresponde a la wrapped_key."
        )
        raise


# ============================================================
# CIFRADO / DESCIFRADO DE ARCHIVOS
# ============================================================

def encrypt_file_with_ephemeral(path: Path) -> Dict[str, str]:
    """
    Cifra un archivo en disco con una clave efímera.

    Flujo:
      - Lee el archivo original en bytes (ej: tumor.nii.gz)
      - Genera clave efímera y cifra el contenido directamente
      - Escribe un archivo .enc con el token Fernet BINARIO (robusto, sin conversiones)
      - Borra el archivo original

    :param path: ruta del archivo original (ej: /out/tumor.nii.gz)

    :return: dict con:
      {
        "enc_filename": "tumor.nii.gz.enc",
        "wrapped_key": "<token_fernet_con_eph_key>"
      }
    """
    logger.info(f"▶️ Iniciando cifrado de archivo de segmentación: {path}")
    if not path.exists():
        logger.error(
            f"❌ Archivo de segmentación no encontrado para cifrado: {path}. "
            "Posible pérdida o desvío del paquete antes de encriptar."
        )
        raise FileNotFoundError(f"Archivo no encontrado: {path}")

    data = path.read_bytes()
    
    # Cifrar directamente sin intermediarios
    eph_key = generate_ephemeral_key()
    eph_fernet = get_ephemeral_fernet(eph_key)
    ciphertext_bytes = eph_fernet.encrypt(data)  # bytes puros del token Fernet
    wrapped_key = wrap_key(eph_key)              # clave efímera envuelta

    enc_path = Path(str(path) + ".enc")  # mismo nombre + .enc

    # Guardar DIRECTAMENTE como bytes BINARIOS (sin decodificar a UTF-8 intermedia)
    # Esto evita cualquier corrupción por normalización de caracteres o newlines
    enc_path.write_bytes(ciphertext_bytes)

    # Borramos el archivo original en claro
    try:
        path.unlink(missing_ok=True)
        logger.info(
            f"✅ Archivo cifrado creado: {enc_path.name}. "
            f"Archivo original en claro eliminado: {path.name}"
        )
    except OSError as e:
        logger.warning(
            f"⚠️ No se pudo eliminar el archivo original en claro {path}: {e}"
        )

    return {
        "enc_filename": enc_path.name,
        "wrapped_key": wrapped_key,
    }


def decrypt_file_with_wrapped(
    enc_path: Path,
    wrapped_key: str,
    output_path: Path,
) -> Path:
    """
    Desencripta un archivo .enc usando la wrapped_key y escribe
    el archivo original en output_path.

    :param enc_path: ruta al archivo cifrado (ej: tumor.nii.gz.enc)
    :param wrapped_key: token de la clave efímera envuelta
    :param output_path: ruta donde se escribirá el archivo en claro (ej: tumor.nii.gz)

    :return: Path al archivo desencriptado (output_path)
    """
    logger.info(
        f"▶️ Iniciando desencriptado de archivo de segmentación cifrado: {enc_path}"
    )

    if not enc_path.exists():
        logger.error(
            f"❌ Archivo cifrado no encontrado: {enc_path}. "
            "Posible pérdida o desvío del paquete durante el transporte o almacenamiento."
        )
        raise FileNotFoundError(f"Archivo cifrado no encontrado: {enc_path}")

    # Leer como BINARIO DIRECTO (el ciphertext está en bytes puros)
    ciphertext_bytes = enc_path.read_bytes()
    
    # Desencriptar directamente con los bytes
    eph_key = unwrap_key(wrapped_key)
    eph_fernet = get_ephemeral_fernet(eph_key)

    try:
        raw = eph_fernet.decrypt(ciphertext_bytes)
        logger.info("✅ Desencriptado de bytes completado correctamente.")
    except InvalidToken:
        logger.error(
            "❌ No se pudo desencriptar el archivo: "
            "wrapped_key no corresponde o el contenido está corrupto."
        )
        raise

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(raw)

    logger.info(
        f"✅ Archivo de segmentación desencriptado correctamente en: {output_path}"
    )
    return output_path


# ============================================================
# OPCIONAL: CIFRAR / DESCIFRAR JSON (dict)
# ============================================================

def encrypt_dict_with_ephemeral(payload: Dict[str, Any]) -> Dict[str, str]:
    """
    Cifra un dict (JSON) con clave efímera.
    Devuelve lo mismo que encrypt_bytes_with_ephemeral.
    """
    logger.debug("▶️ Iniciando cifrado de dict (JSON) con clave efímera.")
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    return encrypt_bytes_with_ephemeral(data)


def decrypt_dict_with_wrapped(ciphertext: str, wrapped_key: str) -> Dict[str, Any]:
    """
    Desencripta un dict (JSON) cifrado con encrypt_dict_with_ephemeral.
    """
    logger.debug("▶️ Iniciando desencriptado de dict (JSON) con wrapped_key.")
    raw = decrypt_bytes_with_wrapped(ciphertext, wrapped_key)
    logger.info("✅ Dict (JSON) desencriptado correctamente.")
    return json.loads(raw.decode("utf-8"))
