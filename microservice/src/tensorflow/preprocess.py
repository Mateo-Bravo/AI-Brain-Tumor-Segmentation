# app/tensorflow/preprocess.py
import numpy as np
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def preprocess_image(image_path, image_size=(128, 128, 128)):
    """
    Preprocesa la imagen y retorna tanto el array como las dimensiones originales
    
    Returns:
        tuple: (image_array, original_shape)
    """
    try:
        image_path_obj = Path(image_path)
        file_ext = image_path_obj.suffix.lower()
        filename = str(image_path_obj.name).lower()
        
        # FORMATO DICOM
        if file_ext == '.dcm':
            logger.info(f"Procesando DICOM: {image_path}")
            try:
                import pydicom
            except ImportError:
                raise ImportError("pydicom no está instalado. Instala con: pip install pydicom")
            
            dicom_file = pydicom.dcmread(image_path)
            image = dicom_file.pixel_array
            
            logger.info(f"Forma DICOM: {image.shape}")
            original_shape = image.shape
            
            # Si es multi-frame, tomar primer frame
            if len(image.shape) == 3:
                image = image[0]
                original_shape = image.shape
            
            # Normalizar a [0, 1]
            image_min = image.min()
            image_max = image.max()
            if image_max > image_min:
                image = (image - image_min) / (image_max - image_min)
            else:
                image = np.zeros_like(image)
            
            # Redimensionar
            import cv2
            image = (image * 255).astype(np.uint8)
            image = cv2.resize(image, (image_size[1], image_size[0]))
            image = image.astype(np.float32) / 255.0
            
            # Convertir a 3 canales
            image = np.stack([image, image, image], axis=2)
            image_array = np.expand_dims(image, axis=0)
            
            logger.info(f"DICOM preprocesado: {image_array.shape}")
            return image_array, original_shape
        
        # FORMATO NIfTI
        elif file_ext in ['.gz', '.nii'] or filename.endswith('.nii.gz'):
            logger.info(f"Procesando NIfTI: {image_path}")
            try:
                import nibabel as nib
            except ImportError:
                raise ImportError("nibabel no está instalado. Instala con: pip install nibabel")
            
            nifti = nib.load(image_path)
            image_data = nifti.get_fdata()
            
            logger.info(f"Forma NIfTI original: {image_data.shape}")
            original_shape = image_data.shape
            
            # Procesar volumen 3D completo
            if len(image_data.shape) == 3:
                logger.info(f"Procesando volumen 3D: {image_data.shape}")
                
                # Normalizar a [0, 1]
                image_min = image_data.min()
                image_max = image_data.max()
                if image_max > image_min:
                    image_data = (image_data - image_min) / (image_max - image_min)
                else:
                    image_data = np.zeros_like(image_data)
                
                # Redimensionar volumen 3D a (128, 128, 128)
                from scipy import ndimage
                
                zoom_factors = (
                    image_size[0] / image_data.shape[0],
                    image_size[1] / image_data.shape[1],
                    image_size[2] / image_data.shape[2]
                )
                logger.debug(f"Zoom factors: {zoom_factors}")
                image_data = ndimage.zoom(image_data, zoom_factors, order=1)
                logger.info(f"Volumen redimensionado a: {image_data.shape}")
                
                # Convertir a rango [0, 255]
                image_data = (image_data * 255).astype(np.uint8)
                image_data = image_data.astype(np.float32) / 255.0
                
                # Agregar dimensión de batch
                image_array = np.expand_dims(image_data, axis=0)  # (1, 128, 128, 128)
                logger.info(f"Array preprocesado: {image_array.shape}")
                return image_array, original_shape
            
            elif len(image_data.shape) == 2:
                logger.info("Imagen 2D detectada, expandiendo a 3D")
                # Expandir a 3D
                image_data = np.expand_dims(image_data, axis=2)
                image_data = np.repeat(image_data, image_size[2], axis=2)
                
                # Normalizar
                image_min = image_data.min()
                image_max = image_data.max()
                if image_max > image_min:
                    image_data = (image_data - image_min) / (image_max - image_min)
                
                # Redimensionar
                from scipy import ndimage
                zoom_factors = (
                    image_size[0] / image_data.shape[0],
                    image_size[1] / image_data.shape[1],
                    image_size[2] / image_data.shape[2]
                )
                image_data = ndimage.zoom(image_data, zoom_factors, order=1)
                
                image_data = (image_data * 255).astype(np.uint8)
                image_data = image_data.astype(np.float32) / 255.0
                
                image_array = np.expand_dims(image_data, axis=0)
                logger.info(f"Imagen 2D convertida a 3D: {image_array.shape}")
                return image_array, original_shape
            
            else:
                raise ValueError(f"Formato no soportado. Dimensiones: {image_data.shape}")
        
        else:
            raise ValueError(f"Formato no soportado: {file_ext}. Usa .dcm o .nii.gz")
    
    except Exception as e:
        logger.error(f"Error preprocesando: {e}", exc_info=True)
        raise