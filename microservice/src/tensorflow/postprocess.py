# app/tensorflow/postprocess.py
import numpy as np
import cv2
import logging
from skimage.transform import resize
import nibabel as nib
import os

logger = logging.getLogger(__name__)

def postprocess_output(output, original_shape=(256, 256), threshold=0.5, return_3d=False, reference_nifti=None, save_path=None):
    """
    Postprocesa la salida del modelo TensorFlow a máscara de segmentación
    
    Soporta:
    - Predicciones 2D: (H, W) o (H, W, C)
    - Predicciones 3D: (D, H, W) o (D, H, W, C)
    - Con batch dimension: (1, ...) o sin ella
    
    Args:
        output (np.ndarray): Salida del modelo
        original_shape (tuple): Forma original de la imagen (alto, ancho) o (alto, ancho, profundidad)
        threshold (float): Umbral para clasificación binaria (0-1)
        return_3d (bool): Si True, retorna máscara 3D; si False, retorna slice 2D
        reference_nifti (str): Ruta del NIfTI original (para preservar geometría)
        save_path (str): Ruta donde guardar la máscara NIfTI
    """
    try:
        logger.debug(f"Postprocesando salida. Forma inicial: {output.shape}, return_3d: {return_3d}")
        
        mask_3d = None
        
        # Remover batch dimension si existe
        if len(output.shape) == 5:
            output = output[0]
        elif len(output.shape) == 4:
            if output.shape[0] == 1 and output.shape[1] > 1:
                output = output[0]
        
        logger.debug(f"Forma después de remover batch: {output.shape}")
        
        # Manejar predicciones 3D
        if len(output.shape) == 4:
            logger.debug(f"Detectado 3D: {output.shape}")
            
            if output.shape[3] > 1:
                # Multi-clase
                logger.debug(f"Detectado multi-clase 3D: {output.shape[3]} clases")
                
                # DEBUG: Ver probabilidades de cada canal ANTES de argmax
                logger.debug("=" * 60)
                logger.debug("ANÁLISIS DE PROBABILIDADES POR CANAL (ANTES de argmax)")
                logger.debug("=" * 60)
                for c in range(output.shape[3]):
                    min_val = np.min(output[:, :, :, c])
                    max_val = np.max(output[:, :, :, c])
                    mean_val = np.mean(output[:, :, :, c])
                    count_high = np.count_nonzero(output[:, :, :, c] > 0.3)
                    logger.debug(f"Canal {c}: min={min_val:.6f}, max={max_val:.6f}, mean={mean_val:.6f}, píxeles > 0.3: {count_high}")
                logger.debug("=" * 60)
                
                # Aplicar argmax
                mask_3d = np.argmax(output, axis=3).astype(np.uint8)  # (D, H, W)
                
                # DEBUG: Ver clases después de argmax
                unique_after_argmax = np.unique(mask_3d)
                logger.debug("CLASES DETECTADAS (DESPUÉS de argmax):")
                for clase in sorted(unique_after_argmax):
                    count = np.count_nonzero(mask_3d == clase)
                    pct = (count / mask_3d.size) * 100
                    logger.debug(f"  Clase {clase}: {count} píxeles ({pct:.2f}%)")
            else:
                # Single channel
                logger.debug("Detectado single channel 3D")
                mask_3d = output[:, :, :, 0]
                if mask_3d.max() > 1:
                    mask_3d = (mask_3d > threshold).astype(np.uint8)
            
            logger.debug(f"Máscara 3D generada: {mask_3d.shape}")
            
            # Si se solicita 3D, redimensionar y retornar
            if return_3d:
                logger.debug(f"Redimensionando máscara 3D de {mask_3d.shape} a {original_shape}")

                if len(original_shape) == 3:
                    target_shape = original_shape
                else:
                    target_shape = (
                        original_shape[0],
                        original_shape[1],
                        mask_3d.shape[2]
                    )

                logger.debug(f"Target shape: {target_shape}")

                # DEBUG: Clases ANTES de redimensionar
                unique_before_resize = np.unique(mask_3d)
                logger.debug(f"Clases ANTES de redimensionar: {sorted(unique_before_resize)}")
                for clase in sorted(unique_before_resize):
                    count = np.count_nonzero(mask_3d == clase)
                    logger.debug(f"  Clase {clase}: {count} píxeles")

                # 🔧 Reemplazo crítico: usar resize con order=0
                mask_3d = resize(
                    mask_3d,
                    target_shape,
                    order=0,               # nearest neighbor, no mezcla clases
                    preserve_range=True,
                    anti_aliasing=False
                ).astype(np.uint8)

                logger.debug(f"Máscara 3D redimensionada a: {mask_3d.shape}")

                # DEBUG: Clases DESPUÉS de redimensionar
                unique_after_resize = np.unique(mask_3d)
                logger.debug(f"Clases DESPUÉS de redimensionar: {sorted(unique_after_resize)}")
                for clase in sorted(unique_after_resize):
                    count = np.count_nonzero(mask_3d == clase)
                    pct = (count / mask_3d.size) * 100
                    logger.debug(f"  Clase {clase}: {count} píxeles ({pct:.2f}%)")
                logger.debug("=" * 60)

                # PRESERVAR GEOMETRÍA NIfTI --------------------
                if reference_nifti and save_path:
                    try:
                        ref_img = nib.load(reference_nifti)
                        affine = ref_img.affine
                        header = ref_img.header.copy()
                        header.set_qform(affine)
                        header.set_sform(affine)
                        header['pixdim'] = ref_img.header['pixdim']

                        nifti_mask = nib.Nifti1Image(mask_3d.astype(np.uint8), affine, header)
                        nib.save(nifti_mask, save_path)
                        logger.info(f"Máscara NIfTI guardada con geometría preservada: {save_path}")
                    except Exception as geo_err:
                        logger.warning(f"No se pudo preservar geometría NIfTI: {geo_err}")
                # ----------------------------------------------------------------

                return mask_3d
            
            # Si se solicita 2D, extraer slice del medio
            middle_idx = mask_3d.shape[0] // 2
            mask = mask_3d[middle_idx, :, :]
            logger.debug(f"Slice 3D extraído en índice {middle_idx}: {mask.shape}")
        
        # Manejar predicciones 2D
        elif len(output.shape) == 3:
            logger.debug(f"Detectado 2D con canales: {output.shape}")
            
            if output.shape[2] > 1:
                mask = np.argmax(output, axis=2).astype(np.uint8)
            else:
                logger.debug("Detectado single channel 2D")
                mask = output[:, :, 0]
                if mask.max() > 1:
                    mask = (mask > threshold).astype(np.uint8)
        
        elif len(output.shape) == 2:
            logger.debug("Detectado 2D sin canales")
            mask = output.astype(np.uint8)
        
        else:
            raise ValueError(f"Shape no válido: {output.shape}. Esperado (H, W), (H, W, C), (D, H, W, C)")
        
        logger.debug(f"Máscara pre-resize: {mask.shape}, dtype: {mask.dtype}")
        
        # Redimensionar a forma original (para 2D)
        if len(original_shape) >= 2:
            target_shape = original_shape[:2] if len(original_shape) > 2 else original_shape
            logger.debug(f"Redimensionando 2D de {mask.shape} a {target_shape}")
            mask = cv2.resize(
                mask, 
                (target_shape[1], target_shape[0]),
                interpolation=cv2.INTER_NEAREST
            )
        
        unique_final = np.unique(mask)
        logger.debug(f"Máscara final 2D: {mask.shape}")
        logger.debug(f"Clases finales: {sorted(unique_final.tolist())}")
        for clase in sorted(unique_final):
            count = np.count_nonzero(mask == clase)
            pct = (count / mask.size) * 100
            logger.debug(f"  Clase {clase}: {count} píxeles ({pct:.4f}%)")
        
        return mask
    
    except ValueError as e:
        logger.error(f"Error de validación en postprocess: {e}")
        raise
    
    except Exception as e:
        logger.error(f"Error durante postprocesamiento: {e}", exc_info=True)
        raise
