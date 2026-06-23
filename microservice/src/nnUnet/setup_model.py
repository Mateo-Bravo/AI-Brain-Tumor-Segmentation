# app/nnUnet/setup_model.py

import torch
import json
from pathlib import Path
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NnUNetModelSetup:
    """
    Auto-setup para nnU-Net v2 con un checkpoint suelto.
    Crea la estructura esperada + checkpoint_best + checkpoint_final
    y extrae plans.json y dataset.json.
    """

    def __init__(self, checkpoint_path, output_base="models/nnUNet/nnUNet_results"):
        # Convertir a Ruta absoluta real y normalizada
        self.checkpoint_path = Path(checkpoint_path).resolve()

        logger.info(f"🛠 Recibido checkpoint: {checkpoint_path}")
        logger.info(f"📍 Ruta absoluta normalizada: {self.checkpoint_path}")

        self.output_base = Path(output_base).resolve()

        # Nombres estándar nnU-Net v2
        self.dataset_name = "Dataset001_BrainTumor"
        self.trainer_name = "nnUNetTrainer__nnUNetPlans__3d_fullres"
        self.fold = 0
        self.skip_copy = False

    # ----------------------------------------------------------------------

    def setup(self):
        logger.info("⚙️ Iniciando setup nnU-Net...")

        if not self._verify_checkpoint():
            return False

        self._create_structure()

        if not self._copy_and_fix_checkpoint():
            return False

        self._extract_configs()

        logger.info("✅ Modelo nnU-Net configurado correctamente.")
        return True

    # ----------------------------------------------------------------------

    def _verify_checkpoint(self):
        """Verifica que el checkpoint existe y no está vacío."""

        logger.info(f"🔍 Verificando checkpoint en: {self.checkpoint_path}")

        if not self.checkpoint_path.exists():
            logger.error(f"❌ Checkpoint no encontrado en: {self.checkpoint_path}")
            return False

        size_mb = self.checkpoint_path.stat().st_size / (1024 ** 2)
        if size_mb < 1:
            logger.error("❌ Checkpoint encontrado pero está vacío o corrupto.")
            return False

        logger.info(f"📦 Checkpoint OK ({size_mb:.1f} MB)")
        return True

    # ----------------------------------------------------------------------

    def _create_structure(self):
        """Crea la estructura estándar nnU-Net."""

        self.target_folder = self.output_base / self.dataset_name / self.trainer_name
        self.fold_folder = self.target_folder / f"fold_{self.fold}"

        logger.info(f"📁 Creando estructura en: {self.fold_folder}")

        self.fold_folder.mkdir(parents=True, exist_ok=True)

        if (self.fold_folder / "checkpoint_best.pth").exists():
            logger.info("✔️ Estructura ya configurada. Saltando copias.")
            self.skip_copy = True

    # ----------------------------------------------------------------------

    def _copy_and_fix_checkpoint(self):
        if self.skip_copy:
            return True

        best_ckpt = self.fold_folder / "checkpoint_best.pth"
        final_ckpt = self.fold_folder / "checkpoint_final.pth"

        try:
            logger.info(f"📥 Cargando checkpoint original desde: {self.checkpoint_path}")

            checkpoint = torch.load(self.checkpoint_path, map_location="cpu", weights_only=False)

            # Normalizar nombre
            checkpoint["trainer_name"] = "nnUNetTrainer"

            logger.info("💾 Guardando checkpoint_best.pth y checkpoint_final.pth...")

            torch.save(checkpoint, best_ckpt)
            torch.save(checkpoint, final_ckpt)

            self.checkpoint_data = checkpoint

            logger.info("🧩 Checkpoint exportado: best + final")
            return True

        except Exception as e:
            logger.error(f"❌ Error copiando checkpoint: {e}")
            return False

    # ----------------------------------------------------------------------

    def _extract_configs(self):
        if self.skip_copy:
            return True

        init_args = self.checkpoint_data.get("init_args")
        if not init_args:
            logger.warning("⚠️ init_args no está disponible. No se generarán JSON.")
            return True

        # Extraer plans.json
        if "plans" in init_args:
            with open(self.target_folder / "plans.json", "w") as f:
                json.dump(init_args["plans"], f, indent=2)
            logger.info("📄 plans.json generado.")

        # Extraer dataset.json
        if "dataset_json" in init_args:
            with open(self.target_folder / "dataset.json", "w") as f:
                json.dump(init_args["dataset_json"], f, indent=2)
            logger.info("📄 dataset.json generado.")

    # ----------------------------------------------------------------------

    def get_target_folder(self):
        return str(self.target_folder)


# ----------------------------------------------------------------------
# Función para usar desde FastAPI
# ----------------------------------------------------------------------

def setup_model_from_env():
    # Detectar .env en la raíz del proyecto
    project_root = Path(__file__).resolve().parents[2]
    env_file = project_root / ".env"

    logger.info(f"🔧 Cargando .env desde: {env_file}")

    load_dotenv(env_file)

    model_path = os.getenv("PYTORCH_MODEL_PATH")
    if not model_path:
        logger.error("❌ Falta PYTORCH_MODEL_PATH en .env")
        return None

    # Ruta EXACTA sin concatenar strings
    checkpoint_path = Path(model_path).expanduser().resolve()

    logger.info(f"📍 PYTORCH_MODEL_PATH → {checkpoint_path}")

    setup = NnUNetModelSetup(checkpoint_path)

    return setup.get_target_folder() if setup.setup() else None


# ----------------------------------------------------------------------
# Standalone execution
# ----------------------------------------------------------------------
if __name__ == "__main__":
    folder = setup_model_from_env()
    if folder:
        print("Modelo configurado en:", folder)
