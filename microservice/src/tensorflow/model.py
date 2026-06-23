# src/tensorflow/model.py
import tensorflow as tf
import logging
import os
from src.utils.device import tf_device_from_user

logger = logging.getLogger(__name__)


class ModelTensorFlow:
    _instance = None

    def __new__(cls, model_path=None, device=None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_path=None, device=None):
        if self._initialized:
            return
        self._initialized = True
        self.model = None
        self.model_path = model_path or os.getenv("TF_MODEL_PATH")
        self.device = device
        self._load_model()

    def _load_model(self):
        try:
            if not self.model_path:
                raise RuntimeError("TF_MODEL_PATH no definido")

            path = os.path.abspath(self.model_path)
            if not os.path.exists(path):
                raise RuntimeError(f"Modelo TensorFlow no existe: {path}")

            tf_device = tf_device_from_user(self.device)

            # 🔍 LOG DE HARDWARE
            gpus = tf.config.list_physical_devices("GPU")
            if gpus:
                logger.info(f"[HARDWARE] TensorFlow GPUs detectadas: {gpus}")
            else:
                logger.info("[HARDWARE] TensorFlow usará CPU (no se detectó GPU)")

            logger.info(f"[TensorFlow] Device solicitado: {tf_device or 'AUTO'}")
            logger.info(f"[TensorFlow] Cargando modelo Keras (.h5) desde: {path}")

            with tf.device(tf_device):
                self.model = tf.keras.models.load_model(
                    path,
                    compile=False
                )

            logger.info("[TensorFlow] Modelo TensorFlow cargado correctamente (.h5)")

        except Exception as e:
            logger.exception("[TensorFlow] Error cargando modelo")
            raise RuntimeError(f"Error cargando modelo TensorFlow: {str(e)}")

    def predict(self, image_array):
        if self.model is None:
            raise RuntimeError("Modelo TensorFlow no está cargado")

        tf_device = tf_device_from_user(self.device)

        try:
            # ✅ Ejecutar predicción en el mismo dispositivo donde están los pesos
            with tf.device(tf_device):
                return self.model.predict(image_array, verbose=0)
        except Exception as e:
            # ✅ Si falla en GPU (conflicto CPU/GPU), fallback a CPU
            logger.warning(f"⚠️ Predicción en {tf_device} falló: {e}")
            logger.warning("🔄 Reintentando en CPU:0...")
            with tf.device('/CPU:0'):
                return self.model.predict(image_array, verbose=0)