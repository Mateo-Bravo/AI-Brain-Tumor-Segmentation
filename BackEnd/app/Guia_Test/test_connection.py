# Verificacion de Conexion - test_connection.py
# Ejecuta el script: python3 app/database/test_connection.py

import sys
import os
# Agregar el directorio raíz del proyecto al PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.database.repository import get_db
from sqlalchemy.orm import Session
from sqlalchemy import text  # ✅ CORREGIDO: era 'textgit'

def check_connection(db: Session):
    try:
        # Usar text() para la consulta SQL  # ✅ CORREGIDO: era 'SQLvc'
        result = db.execute(text("SELECT DATABASE();"))
        for row in result:
            print(f"Conectado a la base de datos: {row[0]}")
    except Exception as e:
        print(f"Error al conectar con la base de datos: {str(e)}")

def main():
    with next(get_db()) as db:
        check_connection(db)

if __name__ == "__main__":
    main()