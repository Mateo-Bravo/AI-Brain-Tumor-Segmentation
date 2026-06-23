# src/nnUnet/predict.py

"""
Predictor de nnU-Net usando pipeline oficial + StorageManager
Carga lazy del modelo (CPU/GPU) y análisis completo de la segmentación.
"""

import logging
import shutil
import time
from pathlib import Path

import nibabel as nib
import numpy as np
from scipy import ndimage
from scipy.ndimage import binary_erosion

from src.nnUnet.model import ModelPyTorch
from src.utils.settings import RESULTS_DIR

logger = logging.getLogger(__name__)


# =====================================================
# CONVERTIR TIPOS NUMPY → TIPOS PYTHON
# =====================================================
def convert_to_python_types(obj):

    if isinstance(obj, dict):
        return {k: convert_to_python_types(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [convert_to_python_types(v) for v in obj]

    if isinstance(obj, np.integer):
        return int(obj)

    if isinstance(obj, np.floating):
        return float(obj)

    if isinstance(obj, np.bool_):
        return bool(obj)

    if isinstance(obj, np.ndarray):
        return obj.tolist()

    return obj


# =====================================================
# PREDICTOR NNUNET
# =====================================================
class PytorchPredictor:

    _instance = None

    def __new__(cls):

        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False

        return cls._instance

    def __init__(self):

        if self._initialized:
            return

        self.models = {}
        self._initialized = True

        logger.info("PytorchPredictor creado (lazy models CPU/GPU)")

    # =================================================
    # CARGA DE MODELO
    # =================================================
    def _ensure_model_loaded(self, device="auto"):
        
        logger.info("Warmup del modelo")

        import torch

        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"

        device = device.lower()

        if device == "gpu":
            device = "cuda"

        if device not in ["cpu", "cuda"]:
            raise ValueError(f"Device inválido: {device}")

        if device not in self.models:

            logger.info(f"🚀 Cargando modelo nnU-Net en {device}")

            model = ModelPyTorch(device=device)

            self.models[device] = model

        return self.models[device]

    # =================================================
    # PREDICCIÓN
    # =================================================
    def predict(
        self,
        input_path,
        file_format=".nii.gz",
        original_filename=None,
        user_dir=None,
        device="auto"
    ):

        start_time = time.time()

        input_path = Path(input_path)

        if not input_path.exists():
            raise FileNotFoundError(input_path)

        model = self._ensure_model_loaded(device)

        logger.info(f"🧠 Ejecutando inferencia con modelo → {model.device}")

        # =================================================
        # RUTAS
        # =================================================

        seg_dir = Path("app/outputs/segmentations")
        seg_dir.mkdir(parents=True, exist_ok=True)

        base_name = (
            (original_filename or input_path.stem)
            .replace(".nii.gz", "")
            .replace(".nii", "")
        )

        temp_output_path = seg_dir / f"{base_name}-seg-temp.nii.gz"

        # =================================================
        # EJECUTAR NNUNET
        # =================================================

        model.predict_from_files(
            input_files=[[str(input_path)]],
            output_files=[str(temp_output_path)],
            overwrite=True,
            save_probabilities=False,
            num_processes_preprocessing=1,
            num_processes_segmentation_export=1
        )

        if not temp_output_path.exists():
            raise RuntimeError("nnU-Net no generó el archivo de salida")

        # =================================================
        # CARGAR SEGMENTACIÓN
        # =================================================

        seg_img = nib.load(str(temp_output_path))
        seg_data = seg_img.get_fdata().astype(np.uint8)

        unique_labels = np.unique(seg_data)

        seg_shape = list(seg_data.shape)

        total_voxels = seg_data.size

        # =================================================
        # GUARDAR RESULTADO FINAL
        # =================================================

        output_dir = Path(user_dir) if user_dir else Path(RESULTS_DIR)

        output_dir.mkdir(parents=True, exist_ok=True)

        final_seg_path = output_dir / f"{base_name}-seg.nii.gz"

        shutil.copy2(temp_output_path, final_seg_path)

        try:
            temp_output_path.unlink()
        except Exception:
            pass

        logger.info(f"💾 Segmentación guardada en: {final_seg_path}")

        # =================================================
        # INFORMACIÓN DE CLASES
        # =================================================

        class_info = {
            0: ("No Tumor", "No Tumor", "#000000", "No visible tumor"),
            1: ("Necrotic core", "NCR", "#0000FF", "Núcleo necrótico"),
            2: ("Edema", "ED", "#00FF00", "Edema"),
            3: ("Enhancing tumor", "ET", "#FF0000", "Tumor con contraste"),
        }

        class_details = {}

        for label in unique_labels:

            label = int(label)

            mask = seg_data == label

            count = int(mask.sum())

            pct = round((count / total_voxels) * 100, 3)

            name, sigla, color, desc = class_info.get(
                label,
                (f"Clase {label}", f"C{label}", "#FFFFFF", "")
            )

            detail = {
                "nombre": name,
                "sigla": sigla,
                "color": color,
                "descripcion": desc,
                "pixeles": count,
                "porcentaje": pct
            }

            if label > 0 and count > 0:

                coords = np.argwhere(mask)

                minc, maxc = coords.min(0), coords.max(0)

                dims = (maxc - minc + 1).tolist()

                bb_vol = int(np.prod(dims))

                fill_ratio = round(count / bb_vol, 3)

                detail.update({
                    "dimensiones_d_h_w": dims,
                    "volumen_bounding_box": bb_vol,
                    "ratio_relleno": fill_ratio
                })

            class_details[str(label)] = detail

        # =================================================
        # ANÁLISIS GLOBAL
        # =================================================

        tumor_mask = seg_data > 0

        total_tumor = int(tumor_mask.sum())

        total_sin_lesion = int(total_voxels - total_tumor)

        labeled_tumor, num_lesions = ndimage.label(tumor_mask)

        lesion_sizes = sorted(
            [int((labeled_tumor == i).sum()) for i in range(1, num_lesions + 1)],
            reverse=True
        )

        # =================================================
        # FORMA Y BORDES
        # =================================================

        forma_info = {}
        bordes_info = {}

        if total_tumor > 0:

            coords = np.argwhere(tumor_mask)

            center = coords.mean(0)

            minc, maxc = coords.min(0), coords.max(0)

            dims = (maxc - minc + 1)

            elong = round(max(dims) / min(dims), 2) if min(dims) > 0 else 0

            forma_info = {
                "centro": [round(c, 1) for c in center],
                "dimensiones_d_h_w": dims.tolist(),
                "alargamiento": elong,
                "muy_alargada": elong > 3
            }

            eroded = binary_erosion(tumor_mask)

            border = tumor_mask & ~eroded

            border_voxels = int(border.sum())

            smoothness = round(border_voxels / total_tumor, 3)

            bordes_info = {
                "pixeles_borde": border_voxels,
                "suavidad": smoothness,
                "bordes_suaves": smoothness < 0.30
            }

        # =================================================
        # VALIDACIÓN
        # =================================================

        validacion = {
            "tiene_lesion": total_tumor > 0,
            "no_muy_pequena": total_tumor > 100,
            "no_muy_grande": total_tumor < total_voxels * 0.5,
            "forma_normal": forma_info.get("alargamiento", 0) < 3,
            "bordes_suaves": bordes_info.get("bordes_suaves", True),
            "lesion_unica": num_lesions == 1,
        }

        validacion["PASÓ"] = all([
            validacion["tiene_lesion"],
            validacion["no_muy_pequena"],
            validacion["no_muy_grande"],
            validacion["forma_normal"],
            validacion["bordes_suaves"]
        ])

        # =================================================
        # PARÁMETROS DEL MODELO
        # =================================================

        try:
            total_params = sum(
                p.numel() for p in model.predictor.network.parameters()
            )
        except Exception:
            total_params = None

        elapsed_time = round(time.time() - start_time, 3)

        # =================================================
        # RESULTADO FINAL
        # =================================================

        result = {

            "success": True,
            "status": "success",
            "message": "Predicción completada exitosamente",

            "model": "nnUNet",
            "device": str(model.device),

            "segmentation_file": final_seg_path.name,
            "output_path": str(final_seg_path),

            "elapsed_time": elapsed_time,

            "unique_classes": [int(x) for x in unique_labels],
            "num_classes_detected": int(len(unique_labels)),

            "class_details": class_details,

            "mask_shape": seg_shape,
            "mask_3d_shape": seg_shape,
            "original_shape": seg_shape,

            "model_info": {
                "output_shape": str(seg_shape),
                "num_classes": 4,
                "total_params": total_params
            },

            "metrics": {

                "cantidad_pixeles": {
                    "total": int(total_voxels),
                    "con_lesion": total_tumor,
                    "sin_lesion": total_sin_lesion,
                    "porcentaje_lesion": round((total_tumor / total_voxels) * 100, 2) if total_voxels else 0
                },

                "lesiones": {
                    "cantidad": int(num_lesions),
                    "todas": lesion_sizes[:10]
                },

                "forma": forma_info,
                "bordes": bordes_info,
                "validacion": validacion,
                "estado": "COMPLETADA"
            }
        }

        return convert_to_python_types(result)