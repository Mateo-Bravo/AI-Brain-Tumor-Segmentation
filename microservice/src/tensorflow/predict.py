import logging
import time
from pathlib import Path
from datetime import datetime

import numpy as np
import tensorflow as tf

from src.tensorflow.model import ModelTensorFlow
from src.tensorflow.preprocess import preprocess_image
from src.tensorflow.postprocess import postprocess_output

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Mapeo de clases para segmentación de tumores cerebrales
# ---------------------------------------------------------
CLASS_MAPPING = {
    0: {"nombre": "No Tumor", "sigla": "No Tumor", "color": "#000000", "descripcion": "No visible tumor"},
    1: {"nombre": "Necrotic core", "sigla": "NCR", "color": "#0000FF", "descripcion": "Núcleo necrótico"},
    2: {"nombre": "Edema", "sigla": "ED", "color": "#00FF00", "descripcion": "Edema"},
    3: {"nombre": "Enhancing tumor", "sigla": "ET", "color": "#FF0000", "descripcion": "Tumor con contraste"}
}


class TensorflowPredictor:
    def __init__(self):
        self.device = self._configure_device()
        self.model = ModelTensorFlow()

    def _configure_device(self):
        """
        Detecta automáticamente GPU.
        Usa GPU si existe, fallback limpio a CPU.
        """
        try:
            gpus = tf.config.list_physical_devices("GPU")

            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)

                logger.info(f"[TENSORFLOW] GPU activa: {gpus[0].name}")
                return "GPU"

            # Forzar CPU si no hay GPU
            tf.config.set_visible_devices([], "GPU")
            logger.info("[TENSORFLOW] No se detectó GPU, usando CPU")
            return "CPU"

        except Exception as e:
            logger.warning(f"[TENSORFLOW] Error configurando GPU, fallback a CPU: {e}")
            tf.config.set_visible_devices([], "GPU")
            return "CPU"

    def predict(
        self,
        image_path,
        file_format=None,
        original_filename=None,
        output_dir="Diagnosticos",
        subfolder=None,
        custom_name=None
    ):
        """
        Realiza predicción y guarda el resultado en la carpeta indicada.
        """

        try:
            start_time = time.time()

            # -----------------------------
            # Validación de archivo
            # -----------------------------
            if not Path(image_path).exists():
                return {
                    "success": False,
                    "error": f"Archivo no encontrado: {image_path}",
                    "model": "TensorFlow_UNet3D"
                }

            logger.info(f"Predicción TensorFlow ({self.device}): {image_path}")

            # -----------------------------
            # Cargar headers originales
            # -----------------------------
            original_nifti = None
            try:
                import nibabel as nib
                if Path(image_path).suffix.lower() in [".gz", ".nii"] or str(image_path).endswith(".nii.gz"):
                    original_nifti = nib.load(image_path)
            except Exception as e:
                logger.warning(f"No se pudieron cargar headers originales: {e}")

            # -----------------------------
            # Preprocesamiento
            # -----------------------------
            image_array, original_shape = preprocess_image(image_path)

            # -----------------------------
            # Inferencia
            # -----------------------------
            output = self.model.predict(image_array)

            # -----------------------------
            # Postprocesamiento
            # -----------------------------
            mask_2d = postprocess_output(output, original_shape[:2], return_3d=False)
            mask_3d = postprocess_output(output, original_shape, return_3d=True)

            elapsed_time = time.time() - start_time
            unique_classes = np.unique(mask_3d).tolist()

            # -----------------------------
            # 📁 Gestión de directorios
            # -----------------------------
            base_dir = Path(output_dir)
            if subfolder:
                base_dir = base_dir / subfolder
            base_dir.mkdir(parents=True, exist_ok=True)

            # -----------------------------
            # 📄 Nombre final del archivo
            # -----------------------------
            if custom_name:
                final_name = custom_name
            else:
                final_name = Path(original_filename or image_path).stem
                if final_name.endswith(".nii"):
                    final_name = final_name[:-4]

            seg_filename = f"{final_name}-seg.nii.gz"
            seg_path = base_dir / seg_filename

            # -----------------------------
            # 💾 Guardar NIfTI
            # -----------------------------
            try:
                import nibabel as nib

                mask_3d_uint8 = mask_3d.astype(np.uint8)

                if original_nifti is not None:
                    nifti_img = nib.Nifti1Image(
                        mask_3d_uint8,
                        original_nifti.affine,
                        original_nifti.header
                    )
                else:
                    nifti_img = nib.Nifti1Image(mask_3d_uint8, np.eye(4))

                nib.save(nifti_img, str(seg_path))

            except Exception as e:
                logger.warning(f"Error guardando máscara NIfTI: {e}")
                seg_path = None

            # -----------------------------
            # 📊 Métricas y resultado
            # -----------------------------
            metrics = extract_metrics(mask_3d, mask_2d)
            model_info = get_model_info(self.model.model)

            class_details = {}
            for clase in unique_classes:
                cinfo = CLASS_MAPPING.get(clase, {}).copy()

                if str(clase) in metrics.get("por_clase", {}):
                    cinfo.update(metrics["por_clase"][str(clase)])

                class_details[str(clase)] = cinfo

            return {
                "success": True,
                "device": self.device,
                "unique_classes": unique_classes,
                "num_classes_detected": len(unique_classes),
                "elapsed_time": round(elapsed_time, 3),
                "model": "UNet-3D-MultiScale",
                "segmentation_path": str(seg_path) if seg_path else None,  
                "model_info": model_info,
                "class_details": class_details,
                "mask_shape": list(mask_2d.shape),
                "mask_3d_shape": list(mask_3d.shape),
                "original_shape": list(original_shape),
                "metrics": metrics,
            }

        except Exception as e:
            logger.error(f"Error durante predicción TensorFlow: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "model": "TensorFlow_UNet3D"
            }


# ---------------------------------------------------------
# Funciones auxiliares
# ---------------------------------------------------------

def get_model_info(model):
    try:
        output_shape = model.output_shape
        num_classes = output_shape[-1] if output_shape else 0

        return {
            "output_shape": str(output_shape),
            "num_classes": int(num_classes),
            "total_params": int(model.count_params()) if hasattr(model, "count_params") else 0
        }

    except Exception:
        return {
            "output_shape": "Unknown",
            "num_classes": 0,
            "total_params": 0
        }


def extract_metrics(mask_3d, mask_2d):
    """
    Extrae métricas de la segmentación incluyendo píxeles por clase
    """
    from scipy import ndimage

    metrics = {}

    total_3d = int(mask_3d.size)
    foreground_3d = int(np.sum(mask_3d > 0))
    percentage_3d = float((foreground_3d / total_3d * 100)) if total_3d > 0 else 0.0

    metrics["cantidad_pixeles"] = {
        "total": total_3d,
        "con_lesion": foreground_3d,
        "sin_lesion": total_3d - foreground_3d,
        "porcentaje_lesion": round(percentage_3d, 2)
    }

    # 🆕 AGREGADO: Calcular píxeles por clase individual
    class_stats = {}
    unique_classes = np.unique(mask_3d)
    
    for clase in sorted(unique_classes):
        pixels_clase = int(np.sum(mask_3d == clase))
        pct_clase = float((pixels_clase / total_3d * 100))
        class_stats[str(clase)] = {
            "pixeles": pixels_clase,
            "porcentaje": round(pct_clase, 2)
        }

    metrics["por_clase"] = class_stats
    metrics["estado"] = "COMPLETADA"

    return metrics