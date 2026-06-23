import tensorflow as tf
from pathlib import Path

# Ir dos niveles arriba para encontrar la carpeta models
MODEL_PATH = Path(__file__).parent.parent / 'models' / 'checkpoint_best.pth'

print(f"Buscando modelo en: {MODEL_PATH}")
print(f"¿Existe?: {MODEL_PATH.exists()}")

if MODEL_PATH.exists():
    model = tf.keras.models.load_model(str(MODEL_PATH))
    print("\n=== INFORMACIÓN DEL MODELO ===")
    print(f"Output shape: {model.output_shape}")
    print(f"Número de clases: {model.output_shape[-1]}")
    print("\n=== RESUMEN DEL MODELO ===")
    model.summary()
else:
    print("Archivo no encontrado")