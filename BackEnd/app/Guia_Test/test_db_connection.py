# Verificar la Conexión en Python: Antes de ejecutar el script, confirmemos que la conexión está activa en Python.
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as connection:
        print("Conectado a la base de datos remota.")
        result = connection.execute(text("SHOW TABLES;"))
        tables = result.fetchall()
        print("Tablas existentes:", tables)
except Exception as e:
    print(f"Error al conectar a la base de datos: {e}")
