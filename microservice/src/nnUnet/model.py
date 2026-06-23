"""
Modelo nnU-Net v2 optimizado para CPU / GPU.

Compatible con:
- device=cpu
- device=gpu
- device=auto

Optimizado para Windows + FastAPI + Postman.
"""

import torch
import logging
from pathlib import Path
import os
import multiprocessing

# -------------------------------------------------------
# CONTROL DE THREADS (IMPORTANTE PARA WINDOWS)
# -------------------------------------------------------

os.environ["NNUNETV2_NUM_CPUS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

multiprocessing.set_start_method("spawn", force=True)

# -------------------------------------------------------

from nnunetv2.inference.predict_from_raw_data import nnUNetPredictor
from src.utils.device import torch_device_from_user

logger = logging.getLogger(__name__)

# -------------------------------------------------------
# RUTA BASE DEL MODELO
# -------------------------------------------------------

MODEL_BASE = Path(
    r"C:\micro\models\nnUNet\nnUNet_results\Dataset001_BrainTumor\nnUNetTrainer__nnUNetPlans__3d_fullres"
).resolve()


class ModelPyTorch:

    _model_cache = {}

    # -------------------------------------------------------

    def __init__(self, device="auto"):

        self.device = torch_device_from_user(device)

        if self.device.type == "cuda" and not torch.cuda.is_available():
            logger.warning("⚠ GPU solicitada pero no disponible → usando CPU")
            self.device = torch.device("cpu")

        logger.info(f"🧠 Dispositivo seleccionado → {self.device}")

        self.model_folder = MODEL_BASE
        self.predictor = None

        self._validate_model()
        self._load_model()

    # -------------------------------------------------------
    # VALIDAR ESTRUCTURA
    # -------------------------------------------------------

    def _validate_model(self):

        fold = self.model_folder / "fold_0"
        checkpoint = fold / "checkpoint_best.pth"
        plans = self.model_folder / "plans.json"
        dataset = self.model_folder / "dataset.json"

        if not self.model_folder.exists():
            raise FileNotFoundError(f"❌ Carpeta modelo no existe: {self.model_folder}")

        if not fold.exists():
            raise FileNotFoundError(f"❌ Falta carpeta fold_0 en: {self.model_folder}")

        if not checkpoint.exists():
            raise FileNotFoundError(f"❌ Falta checkpoint_best.pth en: {checkpoint}")

        if not plans.exists():
            raise FileNotFoundError("❌ Falta plans.json")

        if not dataset.exists():
            raise FileNotFoundError("❌ Falta dataset.json")

        logger.info("✔ Estructura del modelo validada")

    # -------------------------------------------------------
    # CARGAR MODELO
    # -------------------------------------------------------

    def _load_model(self):

        cache_key = str(self.device)

        if cache_key in ModelPyTorch._model_cache:
            logger.info("⚡ Usando modelo en cache")
            self.predictor = ModelPyTorch._model_cache[cache_key]
            return

        logger.info("🚀 Cargando modelo nnU-Net...")

        perform_on_device = self.device.type == "cuda"

        predictor = nnUNetPredictor(
            tile_step_size=0.5,
            use_gaussian=True,
            use_mirroring=True,
            perform_everything_on_device=perform_on_device,
            device=self.device,
            verbose=False,
            verbose_preprocessing=False,
            allow_tqdm=False,
        )

        predictor.initialize_from_trained_model_folder(
            str(self.model_folder),
            use_folds=(0,),
            checkpoint_name="checkpoint_best.pth",
        )

        self.predictor = predictor

        ModelPyTorch._model_cache[cache_key] = predictor

        logger.info(f"✅ Modelo cargado en {self.device}")

    # -------------------------------------------------------
    # INFERENCIA PRINCIPAL
    # -------------------------------------------------------

    def predict_from_files(self, input_files, output_files, **kwargs):

        if self.predictor is None:
            raise RuntimeError("❌ Predictor no inicializado")

        logger.info(f"🧠 Ejecutando inferencia con → {self.device}")

        fixed_inputs = []

        for case in input_files:

            cleaned = []

            for f in case:

                path = f.strip()

                if not os.path.exists(path):
                    raise FileNotFoundError(f"❌ Archivo no encontrado: {path}")

                cleaned.append(path)

            fixed_inputs.append(cleaned)

        return self.predictor.predict_from_files(
            fixed_inputs,
            output_files,
            save_probabilities=kwargs.get("save_probabilities", False),
            overwrite=kwargs.get("overwrite", True),
            num_processes_preprocessing=kwargs.get("num_processes_preprocessing", 1),
            num_processes_segmentation_export=kwargs.get(
                "num_processes_segmentation_export", 1
            ),
        )

    # -------------------------------------------------------
    # INFO DEL MODELO
    # -------------------------------------------------------

    def get_info(self):

        return {
            "device": str(self.device),
            "model_folder": str(self.model_folder),
            "model": "nnUNet v2",
        }