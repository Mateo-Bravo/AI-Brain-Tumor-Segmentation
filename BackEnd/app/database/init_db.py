# Archivo de Creación de Tablas: Base.metadata.create_all()
import os
import sys
import logging

logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Agregar el directorio raíz al PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.database.repository import engine, Base, get_db
from app.models.image import Image
from app.models.diagnosis import Diagnosis

from sqlalchemy import text, inspect


def check_and_add_missing_columns():
    """Detectar y agregar automáticamente nuevas columnas"""
    updated_tables = []
    new_columns = []
    try:
        with next(get_db()) as db:
            inspector = inspect(engine)
            
            # Verificar cada tabla
            for table_name, table in Base.metadata.tables.items():
                # Obtener columnas existentes en la base de datos
                try:
                    existing_columns = {col['name'] for col in inspector.get_columns(table_name)}
                except:
                    # Si la tabla no existe, se creará con create_all()
                    continue
                
                # Obtener columnas definidas en el modelo
                model_columns = {col.name for col in table.columns}
                
                # Encontrar columnas faltantes
                missing_columns = model_columns - existing_columns
                
                if missing_columns:
                    new_columns.append(f"{table_name}: {missing_columns}")
                    
                    # Agregar cada columna faltante
                    for column_name in missing_columns:
                        column = table.columns[column_name]
                        
                        # Construir el tipo de columna
                        column_type = str(column.type)
                        
                        # Determinar si es nullable
                        nullable = "NULL" if column.nullable else "NOT NULL"
                        
                        # Determinar valor por defecto
                        default_value = ""
                        if column.default is not None:
                            if hasattr(column.default, 'arg'):
                                if column.default.arg is True:
                                    default_value = "DEFAULT TRUE"
                                elif column.default.arg is False:
                                    default_value = "DEFAULT FALSE"
                                elif isinstance(column.default.arg, str):
                                    default_value = f"DEFAULT '{column.default.arg}'"
                                else:
                                    default_value = f"DEFAULT {column.default.arg}"
                        elif not column.nullable:
                            # Si no es nullable y no tiene default, agregar un default apropiado
                            if 'VARCHAR' in column_type or 'TEXT' in column_type:
                                default_value = "DEFAULT ''"
                            elif 'INT' in column_type:
                                default_value = "DEFAULT 0"
                            elif 'BOOLEAN' in column_type:
                                default_value = "DEFAULT FALSE"
                        
                        # Construir y ejecutar el ALTER TABLE
                        alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} {nullable} {default_value};"
                        db.execute(text(alter_sql))
                        
                    db.commit()
                    updated_tables.append(table_name)
                    
        # Mostrar resumen al final
        if new_columns:
            print(f"   ➕ Columnas agregadas: {', '.join(new_columns)}")
                    
    except Exception as e:
        print(f"❌ Error al verificar columnas: {str(e)}")


def init_db():
    """Crear las tablas y agregar columnas faltantes automáticamente"""
    try:
        
        # Primero crear las tablas básicas (si no existen)
        Base.metadata.create_all(bind=engine)
        
        # Luego verificar y agregar columnas faltantes
        check_and_add_missing_columns()
        
        print("✅ Base de datos sincronizada correctamente")
        
    except Exception as e:
        print(f"❌ Error al crear las tablas: {str(e)}")


if __name__ == "__main__":
    init_db()  # Crear tablas y sincronizar columnas automáticamente