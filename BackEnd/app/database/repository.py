# Configuracion del Repositorio SQLAlchemy

import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

# ===== SILENCIAR LOGS DE SQL EN CONSOLA =====
# Configurar el nivel de logging de SQLAlchemy para ocultar consultas SQL
# Opciones: DEBUG, INFO, WARNING, ERROR, CRITICAL
# Con WARNING solo se mostrarán advertencias y errores, no las consultas SQL
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Verificar que DATABASE_URL esté configurado
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no está configurado o es nulo.")

# print(f"Conectando a la base de datos en: {DATABASE_URL}")

# Crear el motor de conexión
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Crear la sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Crear la base de los modelos
Base = declarative_base()

# Función para obtener la sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
