# app/services/segmentation_client.py
"""
Cliente para comunicarse con el microservicio de segmentación.
MODO HÍBRIDO: Soporta respuesta directa (local) y descarga diferida (remoto).
Soporta autenticación opcional con API Key.
"""

import logging
import httpx
from pathlib import Path
from typing import Dict, Optional
import os

from app.services.encryption_service import encrypt_file_for_upload, decrypt_file_with_wrapped

logger = logging.getLogger(__name__)


class SegmentationClient:
    """
    Cliente HTTP para el microservicio de segmentación con MODO HÍBRIDO.
    
    MODO LOCAL: El microservicio retorna ruta de archivo directamente
    MODO REMOTO: El microservicio retorna URL de descarga
    """
    
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: int = 300,
        auto_encrypt: bool = True
    ):
        """
        Inicializa el cliente de segmentación.
        
        Args:
            base_url: URL base del microservicio (ej: http://localhost:3020)
            api_key: API Key para autenticación (opcional)
            timeout: Timeout en segundos (default: 300 = 5 minutos)
            auto_encrypt: Si encripta automáticamente archivos antes de enviar
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.auto_encrypt = auto_encrypt
        
        logger.info("=" * 60)
        logger.info("🔧 SegmentationClient inicializado")
        logger.info(f"   URL: {self.base_url}")
        if self.api_key:
            logger.info(f"   API Key: {self.api_key[:10]}... ✅")
        else:
            logger.info(f"   API Key: No configurado (modo sin autenticación)")
        logger.info(f"   Timeout: {self.timeout}s")
        logger.info(f"   Auto-encrypt: {self.auto_encrypt}")
        logger.info("=" * 60)
    
    def _get_headers(self) -> Dict[str, str]:
        """Genera headers para las peticiones. Incluye API Key si está configurado."""
        headers = {}
        if self.api_key:
            headers['X-API-Key'] = self.api_key
            logger.debug("🔑 Header X-API-Key incluido")
        else:
            logger.debug("ℹ️ Sin autenticación (X-API-Key no enviado)")
        return headers
    
    async def predict(
        self,
        image_path: str | Path,
        output_dir: str | Path,
        model: str = None,
        auto_encrypt: bool = True
    ) -> Dict:
        """
        Ejecuta predicción con el microservicio de segmentación.
        
        Args:
            image_path: Ruta de la imagen a procesar
            output_dir: Directorio donde guardar resultado
            model: Modelo a usar ('tensorflow' o 'nnUNet'). Si None, usa default_model
            auto_encrypt: Si encripta antes de enviar
        
        Returns:
            Diccionario con resultados de la predicción
        """
        # Si no se especifica modelo, usar el por defecto
        if model is None:
            model = getattr(self, 'default_model', 'tensorflow')
        
        image_path = Path(image_path)
        output_dir = Path(output_dir)
        
        if not image_path.exists():
            raise FileNotFoundError(f"Imagen no encontrada: {image_path}")
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("=" * 60)
        logger.info("🚀 INICIANDO PREDICCIÓN")
        logger.info(f"   Imagen: {image_path.name}")
        logger.info(f"   Modelo: {model}")
        logger.info(f"   Output dir: {output_dir}")
        logger.info("=" * 60)
        
        # ================================================
        # PASO 1: ENCRIPTAR IMAGEN (si está habilitado)
        # ================================================
        wrapped_key = None
        file_data = None
        filename = image_path.name
        
        if auto_encrypt:
            logger.info("🔐 ENCRIPTANDO ARCHIVO ANTES DE ENVIAR...")
            
            try:
                encrypted_data, wrapped_key = encrypt_file_for_upload(str(image_path))
                file_data = encrypted_data
                filename = f"{image_path.name}.enc"
                
                logger.info(f"✅ Archivo encriptado: {filename}")
                logger.info(f"   Tamaño: {len(file_data)} bytes")
                logger.info(f"   Wrapped key: {wrapped_key[:50]}...")
            
            except Exception as e:
                logger.error(f"❌ Error encriptando archivo: {e}")
                raise
        else:
            with open(image_path, 'rb') as f:
                file_data = f.read()
            
            logger.info("📄 Enviando archivo SIN ENCRIPTAR")
        
        # ================================================
        # PASO 2: ENVIAR A MICROSERVICIO
        # ================================================
        endpoint = f"{self.base_url}/api/v1/predict/{model}"
        
        logger.info(f"📤 Enviando a: {endpoint}")
        
        # Preparar headers (incluye API Key si existe)
        headers = self._get_headers()
        
        # Preparar form-data (enviar ambos campos para compatibilidad)
        files = {
            'file': (filename, file_data, 'application/octet-stream'),
            'image': (filename, file_data, 'application/octet-stream')
        }
        
        data = {
            'output_dir': str(output_dir.resolve())
        }
        
        if wrapped_key:
            data['wrapped_key'] = wrapped_key
        
        # Enviar request
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                logger.info("⏳ Esperando respuesta del microservicio...")
                
                response = await client.post(
                    endpoint,
                    files=files,
                    data=data,
                    headers=headers
                )
                
                response.raise_for_status()
                result = response.json()
                
                logger.info("✅ Respuesta recibida del microservicio")
                
                # 🔍 DEBUG: Ver estructura de respuesta
                logger.info("=" * 60)
                logger.info("🔍 DEBUG: RESPUESTA DEL MICROSERVICIO")
                logger.info(f"   JSON completo: {result}")
                logger.info(f"   Keys disponibles: {list(result.keys())}")
                if 'encryption' in result:
                    logger.info(f"   encryption: {result['encryption']}")
                else:
                    logger.info("   ⚠️ No hay campo 'encryption' en respuesta")
                logger.info("=" * 60)
            
            except httpx.TimeoutException:
                logger.error(f"❌ Timeout después de {self.timeout}s")
                raise
            
            except httpx.HTTPStatusError as e:
                logger.error(f"❌ Error HTTP {e.response.status_code}")
                logger.error(f"   Respuesta: {e.response.text}")
                raise
            
            except Exception as e:
                logger.error(f"❌ Error en request: {e}")
                raise
        
        # ================================================
        # PASO 3: DETECTAR MODO Y PROCESAR RESPUESTA
        # ================================================
        encryption_info = result.get('encryption', {})
        delivery_method = encryption_info.get('delivery_method', 'unknown')
        
        logger.info(f"📊 Modo de entrega detectado: {delivery_method}")
        
        if delivery_method == 'direct_path':
            logger.info("🏠 MODO LOCAL: Archivo en filesystem compartido")
            segmentation_file = await self._process_local_mode(
                result=result,
                output_dir=output_dir,
                model=model
            )
        
        elif delivery_method == 'deferred_download':
            logger.info("🌐 MODO REMOTO: Descargando archivo...")
            segmentation_file = await self._process_remote_mode(
                result=result,
                output_dir=output_dir,
                model=model
            )
        
        else:
            logger.warning(f"⚠️ Modo desconocido: {delivery_method}")
            logger.warning("   Intentando modo local como fallback...")
            segmentation_file = await self._process_local_mode(
                result=result,
                output_dir=output_dir,
                model=model
            )
        
        # Actualizar resultado con ruta final
        result['segmentation_path'] = str(segmentation_file)
        result['filename'] = segmentation_file.name
        
        logger.info("=" * 60)
        logger.info("✅ PREDICCIÓN COMPLETADA")
        logger.info(f"   Archivo: {segmentation_file.name}")
        logger.info(f"   Ruta: {segmentation_file}")
        logger.info("=" * 60)
        
        return result
    
    async def _process_local_mode(
        self,
        result: Dict,
        output_dir: Path,
        model: str
    ) -> Path:
        """Procesa respuesta en MODO LOCAL (archivo en filesystem)."""
        logger.info("🏠 Procesando MODO LOCAL...")
        
        # Obtener ruta del archivo encriptado
        if model == "tensorflow":
            enc_path_str = result.get('segmentation_path_encrypted')
        else:  # nnUNet
            enc_filename = result.get('segmentation_file_encrypted')
            if enc_filename:
                enc_path_str = str(output_dir / enc_filename)
            else:
                enc_path_str = None
        
        if not enc_path_str:
            raise ValueError("No se encontró ruta de archivo en respuesta local")
        
        enc_path = Path(enc_path_str)
        
        if not enc_path.exists():
            raise FileNotFoundError(f"Archivo no encontrado: {enc_path}")
        
        logger.info(f"📁 Archivo encontrado: {enc_path}")
        logger.info(f"   Tamaño: {enc_path.stat().st_size} bytes")
        
        # Desencriptar archivo
        wrapped_key = result.get('segmentation_wrapped_key') or result.get('wrapped_key')
        
        if not wrapped_key:
            raise ValueError("No se encontró wrapped_key en respuesta")
        
        # Nombre del archivo desencriptado
        output_filename = enc_path.name.replace('.enc', '')
        output_path = output_dir / output_filename
        
        logger.info("🔓 Desencriptando archivo...")
        
        decrypt_file_with_wrapped(
            enc_path=enc_path,
            wrapped_key=wrapped_key,
            output_path=output_path
        )
        
        logger.info(f"✅ Archivo desencriptado: {output_path.name}")
        
        # Eliminar archivo encriptado
        try:
            enc_path.unlink()
            logger.info("🗑️ Archivo encriptado eliminado")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo eliminar archivo encriptado: {e}")
        
        return output_path
    
    async def _process_remote_mode(
        self,
        result: Dict,
        output_dir: Path,
        model: str
    ) -> Path:
        """Procesa respuesta en MODO REMOTO (descarga HTTP)."""
        logger.info("🌐 Procesando MODO REMOTO...")
        
        download_url = result.get('download_url')

        if not download_url:
            raise ValueError("No se encontró download_url en respuesta remota")

        # Si es relativa
        if download_url.startswith('/'):
            download_url = f"{self.base_url}{download_url}"
        else:
            # 🔥 FIX PRO: normalizar host
            from urllib.parse import urlparse
            parsed = urlparse(download_url)
            base_host = urlparse(self.base_url).netloc
            download_url = f"{parsed.scheme}://{base_host}{parsed.path}"

        logger.info(f"📥 URL de descarga (normalizada): {download_url}")
        
        headers = self._get_headers()
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                logger.info("⏳ Descargando archivo...")
                
                response = await client.get(download_url, headers=headers)
                response.raise_for_status()
                
                encrypted_data = response.content
                
                logger.info(f"✅ Archivo descargado ({len(encrypted_data)} bytes)")
            
            except Exception as e:
                logger.error(f"❌ Error descargando archivo: {e}")
                raise
        
        enc_filename = result.get('encrypted_filename', 'temp.nii.gz.enc')
        temp_enc_path = output_dir / f"temp_{enc_filename}"
        
        with open(temp_enc_path, 'wb') as f:
            f.write(encrypted_data)
        
        logger.info(f"💾 Archivo temporal: {temp_enc_path.name}")
        
        wrapped_key = result.get('wrapped_key')
        
        if not wrapped_key:
            raise ValueError("No se encontró wrapped_key en respuesta remota")
        
        output_filename = enc_filename.replace('.enc', '')
        output_path = output_dir / output_filename
        
        logger.info("🔓 Desencriptando archivo descargado...")
        
        decrypt_file_with_wrapped(
            enc_path=temp_enc_path,
            wrapped_key=wrapped_key,
            output_path=output_path
        )
        
        logger.info(f"✅ Archivo desencriptado: {output_path.name}")
        
        try:
            temp_enc_path.unlink()
            logger.info("🗑️ Archivo temporal eliminado")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo eliminar temporal: {e}")
        
        session_id = result.get('session_id')
        
        if session_id:
            await self._cleanup_remote_session(session_id)
        
        return output_path
    
    async def _cleanup_remote_session(self, session_id: str):
        """Limpia sesión en el servidor remoto."""
        cleanup_url = f"{self.base_url}/api/v1/cleanup/{session_id}"
        
        logger.info(f"🗑️ Limpiando servidor remoto: {session_id}")
        
        headers = self._get_headers()
        
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.delete(cleanup_url, headers=headers)
                
                if response.status_code == 200:
                    logger.info("✅ Servidor remoto limpiado correctamente")
                elif response.status_code == 404:
                    logger.warning("⚠️ Sesión no encontrada en servidor")
                else:
                    logger.warning(f"⚠️ Limpieza retornó código {response.status_code}")
            
            except Exception as e:
                logger.warning(f"⚠️ Error limpiando servidor remoto: {e}")


# ================================================================
# INSTANCIA SINGLETON DEL CLIENTE
# ================================================================

SEGMENTATION_SERVICE_URL = os.getenv(
    "SEGMENTATION_SERVICE_URL",
    "http://127.0.0.1:3020/api/v1/predict/tensorflow"
)

API_KEY = os.getenv("API_KEY", None)
SEGMENTATION_TIMEOUT = int(os.getenv("SEGMENTATION_TIMEOUT", "300"))
SEGMENTATION_AUTO_ENCRYPT = os.getenv("SEGMENTATION_AUTO_ENCRYPT", "true").lower() == "true"

# Extraer modelo de la URL
if "/predict/" in SEGMENTATION_SERVICE_URL:
    parts = SEGMENTATION_SERVICE_URL.split("/predict/")
    base_url = parts[0].rsplit("/api", 1)[0]
    default_model = parts[1] if len(parts) > 1 else "tensorflow"
else:
    base_url = SEGMENTATION_SERVICE_URL
    default_model = "tensorflow"

logger.info("=" * 60)
logger.info("🔧 Configuración detectada:")
logger.info(f"   Base URL: {base_url}")
logger.info(f"   Modelo por defecto: {default_model}")
logger.info("=" * 60)

# Crear instancia singleton
segmentation_client = SegmentationClient(
    base_url=base_url,
    api_key=API_KEY,
    timeout=SEGMENTATION_TIMEOUT,
    auto_encrypt=SEGMENTATION_AUTO_ENCRYPT
)

# Guardar modelo por defecto
segmentation_client.default_model = default_model

logger.info("=" * 60)
logger.info("✅ SegmentationClient singleton creado")
logger.info(f"   Base URL: {base_url}")
logger.info(f"   Modelo: {default_model}")
if API_KEY:
    logger.info(f"   API Key: {API_KEY[:10]}... ✅")
else:
    logger.info(f"   API Key: No configurado")
logger.info(f"   Timeout: {SEGMENTATION_TIMEOUT}s")
logger.info(f"   Auto-encrypt: {SEGMENTATION_AUTO_ENCRYPT}")
logger.info("=" * 60)