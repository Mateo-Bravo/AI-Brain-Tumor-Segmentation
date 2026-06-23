# Verificar la Carga del .env
# Para asegurarnos de que el .env está siendo cargado correctamente, ejecuta este script rápido:
# Ejecuta el script: python3 app/database/test_env.py

import os
from dotenv import load_dotenv

load_dotenv()

print("DATABASE_URL:", os.getenv("DATABASE_URL"))
