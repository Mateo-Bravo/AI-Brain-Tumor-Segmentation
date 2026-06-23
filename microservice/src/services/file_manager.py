# app/services/file_manager.py
"""
Gestor de archivos temporales para descarga diferida.
Solo se usa en MODO REMOTO.
"""

import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

from src.core.config import TEMP_STORAGE_DIR, TEMP_FILE_TTL_HOURS

logger = logging.getLogger(__name__)


class FileManager:
    """
    Gestiona archivos temporales para descarga diferida.
    
    Estructura de directorios:
    /tmp/segmentations/
    ├── session_abc123/
    │   ├── archivo.nii.gz.enc
    │   └── file_xyz789_metadata.json
    └── session_def456/
        └── ...
    """
    
    def __init__(self):
        """Inicializa el gestor de archivos"""
        self.storage_dir = Path(TEMP_STORAGE_DIR)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"📂 FileManager inicializado: {self.storage_dir}")
    
    def create_session(self) -> str:
        """
        Crea una sesión única para almacenar archivos.
        
        Returns:
            session_id: ID único de la sesión (ej: session_abc123def456)
        """
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        session_dir = self.storage_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"📁 Nueva sesión creada: {session_id}")
        logger.info(f"   Directorio: {session_dir}")
        
        return session_id
    
    def save_file(
        self, 
        session_id: str, 
        file_path: Path, 
        metadata: Dict = None
    ) -> str:
        """
        Guarda un archivo en la sesión y genera metadata.
        
        Args:
            session_id: ID de la sesión
            file_path: Ruta del archivo a guardar
            metadata: Metadata opcional del archivo
        
        Returns:
            file_id: ID único del archivo (ej: file_xyz789abc012)
        
        Raises:
            FileNotFoundError: Si la sesión no existe
        """
        session_dir = self.storage_dir / session_id
        
        if not session_dir.exists():
            logger.error(f"❌ Sesión no encontrada: {session_id}")
            raise FileNotFoundError(f"Sesión no encontrada: {session_id}")
        
        # Generar ID único para el archivo
        file_id = f"file_{uuid.uuid4().hex[:12]}"
        filename = file_path.name
        
        # VERIFICAR SI EL ARCHIVO YA ESTÁ EN EL DIRECTORIO DE SESIÓN
        dest_path = session_dir / filename
        
        # Si el archivo ya está en el directorio de sesión, NO copiarlo
        if file_path.resolve() == dest_path.resolve():
            logger.info(f"✅ Archivo ya está en directorio de sesión: {filename}")
            logger.info(f"   No se requiere copia")
        else:
            # Copiar archivo a directorio de sesión
            shutil.copy2(file_path, dest_path)
            logger.info(f"💾 Archivo copiado a sesión")
            logger.info(f"   Origen: {file_path}")
            logger.info(f"   Destino: {dest_path}")
        
        # Guardar metadata
        if metadata:
            import json
            metadata_path = session_dir / f"{file_id}_metadata.json"
            
            full_metadata = {
                **metadata,
                'file_id': file_id,
                'filename': filename,
                'file_size': dest_path.stat().st_size,
                'created_at': datetime.now().isoformat(),
                'expires_at': (
                    datetime.now() + timedelta(hours=TEMP_FILE_TTL_HOURS)
                ).isoformat()
            }
            
            with open(metadata_path, 'w') as f:
                json.dump(full_metadata, f, indent=2)
            
            logger.info(f"📝 Metadata guardada: {metadata_path.name}")
        
        logger.info(f"✅ Archivo registrado: {file_id}")
        
        return file_id
    
    def get_file_path(self, session_id: str, file_id: str) -> Optional[Path]:
        """
        Obtiene la ruta de un archivo por su ID.
        
        Args:
            session_id: ID de la sesión
            file_id: ID del archivo
        
        Returns:
            Path del archivo o None si no existe
        """
        session_dir = self.storage_dir / session_id
        
        if not session_dir.exists():
            logger.warning(f"⚠️ Sesión no encontrada: {session_id}")
            return None
        
        # Buscar archivo con ese file_id en metadata
        import json
        
        for metadata_file in session_dir.glob("*_metadata.json"):
            try:
                with open(metadata_file, 'r') as f:
                    meta = json.load(f)
                    
                    if meta.get('file_id') == file_id:
                        file_path = session_dir / meta['filename']
                        
                        if file_path.exists():
                            logger.info(f"✅ Archivo encontrado: {file_path.name}")
                            logger.info(f"   Tamaño: {file_path.stat().st_size} bytes")
                            return file_path
                        else:
                            logger.warning(f"⚠️ Metadata existe pero archivo no: {file_path}")
                            return None
            
            except Exception as e:
                logger.warning(f"⚠️ Error leyendo metadata {metadata_file.name}: {e}")
                continue
        
        logger.warning(f"❌ Archivo no encontrado: {file_id} en sesión {session_id}")
        return None
    
    def delete_session(self, session_id: str) -> bool:
        """
        Elimina una sesión completa con todos sus archivos.
        
        Args:
            session_id: ID de la sesión
        
        Returns:
            True si se eliminó exitosamente, False si no existe
        """
        session_dir = self.storage_dir / session_id
        
        if not session_dir.exists():
            logger.warning(f"⚠️ Sesión ya no existe: {session_id}")
            return False
        
        try:
            # Contar archivos antes de eliminar
            files_count = len(list(session_dir.glob("*")))
            
            # Eliminar directorio completo
            shutil.rmtree(session_dir)
            
            logger.info(f"🗑️ Sesión eliminada: {session_id}")
            logger.info(f"   Archivos eliminados: {files_count}")
            
            return True
        
        except Exception as e:
            logger.error(f"❌ Error al eliminar sesión {session_id}: {e}")
            return False
    
    def cleanup_expired_sessions(self) -> int:
        """
        Limpia sesiones expiradas (TTL superado).
        
        Returns:
            Número de sesiones eliminadas
        """
        import json
        
        now = datetime.now()
        expired_count = 0
        
        logger.info("🧹 Iniciando limpieza de sesiones expiradas...")
        
        for session_dir in self.storage_dir.glob("session_*"):
            try:
                # Leer metadata del primer archivo para verificar expiración
                metadata_files = list(session_dir.glob("*_metadata.json"))
                
                if not metadata_files:
                    # Sin metadata, verificar tiempo de modificación del directorio
                    mtime = datetime.fromtimestamp(session_dir.stat().st_mtime)
                    age_hours = (now - mtime).total_seconds() / 3600
                    
                    if age_hours > TEMP_FILE_TTL_HOURS:
                        shutil.rmtree(session_dir)
                        expired_count += 1
                        logger.info(
                            f"🗑️ Sesión expirada eliminada (sin metadata): {session_dir.name} "
                            f"(edad: {age_hours:.1f}h)"
                        )
                    continue
                
                # Leer primera metadata
                with open(metadata_files[0], 'r') as f:
                    meta = json.load(f)
                    expires_at = datetime.fromisoformat(meta['expires_at'])
                    
                    if now > expires_at:
                        files_count = len(list(session_dir.glob("*")))
                        shutil.rmtree(session_dir)
                        expired_count += 1
                        
                        age = now - expires_at
                        logger.info(
                            f"🗑️ Sesión expirada eliminada: {session_dir.name} "
                            f"(expiró hace {age.total_seconds() / 3600:.1f}h, "
                            f"{files_count} archivos)"
                        )
            
            except Exception as e:
                logger.warning(f"⚠️ Error al verificar sesión {session_dir.name}: {e}")
        
        if expired_count > 0:
            logger.info(f"✅ Limpieza completada: {expired_count} sesiones eliminadas")
        else:
            logger.info("✅ Limpieza completada: No hay sesiones expiradas")
        
        return expired_count
    
    def get_storage_stats(self) -> Dict:
        """
        Obtiene estadísticas del almacenamiento temporal.
        
        Returns:
            Diccionario con estadísticas
        """
        import json
        
        total_sessions = 0
        total_files = 0
        total_size = 0
        expired_sessions = 0
        
        now = datetime.now()
        
        for session_dir in self.storage_dir.glob("session_*"):
            total_sessions += 1
            
            # Contar archivos y tamaño
            for file_path in session_dir.glob("*"):
                if not file_path.name.endswith("_metadata.json"):
                    total_files += 1
                    total_size += file_path.stat().st_size
            
            # Verificar si está expirada
            metadata_files = list(session_dir.glob("*_metadata.json"))
            if metadata_files:
                try:
                    with open(metadata_files[0], 'r') as f:
                        meta = json.load(f)
                        expires_at = datetime.fromisoformat(meta['expires_at'])
                        
                        if now > expires_at:
                            expired_sessions += 1
                except:
                    pass
        
        return {
            'total_sessions': total_sessions,
            'total_files': total_files,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'expired_sessions': expired_sessions,
            'storage_dir': str(self.storage_dir),
            'ttl_hours': TEMP_FILE_TTL_HOURS
        }


# ================================================================
# Instancia singleton
# ================================================================
file_manager = FileManager()