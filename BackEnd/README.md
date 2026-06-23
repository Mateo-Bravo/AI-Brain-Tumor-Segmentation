# Sistema de Diagnóstico Médico con IA

API Backend desarrollada con FastAPI para diagnóstico médico utilizando Machine Learning e imágenes médicas.

## 📋 Descripción

Este proyecto es un sistema web completo que utiliza inteligencia artificial para el diagnóstico médico a través del análisis de imágenes. El backend está construido con FastAPI y se conecta a una base de datos MySQL externa para gestionar usuarios, imágenes y diagnósticos.

## 🏗️ Arquitectura del Proyecto

```
Proyecto_RN/Machine-Learning-Medical-Image-Cancer/
│
├── Datasets/                           # Datos y recursos del proyecto
│   └── Web/
│       ├── Imagenes/                   # Imágenes para diagnóstico médico
│       └── ModelosEntrenados/          # Modelos de IA pre-entrenados
│
└── Sistema_Web/
    │
    ├── Backend/                        # API Backend (FastAPI)
    │   ├── .venv/                      # Entorno virtual de Python
    │   ├── main.py                     # Punto de entrada de la aplicación
    │   ├── .env                        # Variables de entorno
    │   ├── .gitignore                  # Archivos ignorados por Git
    │   ├── README.md                   # Este archivo
    │   ├── requirements.txt            # Dependencias de Python
    │   │
    │   └── app/                        # Código principal
    │       ├── __init__.py
    │       │
    │       ├── api/                    # Endpoints/Routers de la API
    │       │   ├── __init__.py
    │       │   ├── users.py            # Gestión de usuarios
    │       │   ├── images.py           # Gestión de imágenes
    │       │   └── diagnosis.py        # Endpoints de diagnóstico IA
    │       │
    │       ├── controllers/            # Lógica de negocio
    │       │   ├── __init__.py
    │       │   ├── user_controller.py
    │       │   ├── image_controller.py
    │       │   └── diagnosis_controller.py
    │       │
    │       ├── core/                   # Configuración central
    │       │   ├── __init__.py
    │       │   └── config.py           # Configuraciones globales
    │       │
    │       ├── database/               # Gestión de base de datos
    │       │   ├── __init__.py
    │       │   ├── repository.py       # Operaciones CRUD
    │       │   └── migrations/         # Migraciones con Alembic
    │       │
    │       ├── models/                 # Modelos de datos (ORM)
    │       │   ├── __init__.py
    │       │   ├── base.py            # Modelo base
    │       │   ├── image.py           # Modelo de imágenes
    │       │   └── diagnosis.py       # Modelo de diagnósticos
    │       │
    │       ├── storage/                # Gestión de archivos
    │       │   ├── __init__.py
    │       │   └── image_storage.py   # Almacenamiento de imágenes
    │       │
    │       ├── ai/                     # Módulo de Inteligencia Artificial
    │       │   ├── __init__.py
    │       │   └── diagnosis_model.py # Modelo de diagnóstico IA
    │       │
    │       └── static/                 # Archivos estáticos (CSS, JS, etc.)
    │
    └── Frontend/                       # Frontend Vue.js (próximamente)
```

## 🛠️ Instalación y Configuración

### Prerequisitos

- Python 3.12.3
- MySQL Server
- Git

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd Machine-Learning-Medical-Image-Cancer/Sistema_Web/Backend
```

### 2. Crear la Estructura de Directorios

```bash
# Crear todas las carpetas del proyecto
mkdir -p app/api
mkdir -p app/controllers
mkdir -p app/core
mkdir -p app/database/migrations
mkdir -p app/models
mkdir -p app/storage
mkdir -p app/ai
mkdir -p app/static

# Crear archivos principales
touch app/api/users.py
touch app/api/images.py
touch app/api/diagnosis.py
touch app/controllers/user_controller.py
touch app/controllers/image_controller.py
touch app/controllers/diagnosis_controller.py
touch app/core/config.py
touch app/database/repository.py
touch app/models/base.py
touch app/models/image.py
touch app/models/diagnosis.py
touch app/storage/image_storage.py
touch app/ai/diagnosis_model.py

# Crear archivos de configuración
touch .env
touch .gitignore
touch requirements.txt
```

### 3. Crear y Activar Entorno Virtual

```bash
# Crear entorno virtual
python -m venv .venv

# Activar entorno virtual
# En Linux/macOS:
source .venv/bin/activate

# En Windows:
.venv\Scripts\activate
```

### 4. Instalar Dependencias

```bash
pip install fastapi uvicorn python-decouple sqlalchemy pymysql python-multipart
```

### 5. Configurar Variables de Entorno

Crear el archivo `.env` con la siguiente configuración:

```bash
# Información de conexión a la base de datos remota
DATABASE_URL=mysql+pymysql://usuario:contraseña@host:puerto/nombre_base_datos

# Inicializar la base de datos al arrancar la aplicación
INIT_DB=true

# Clave secreta para JWT y otras operaciones
SECRET_KEY=tu_clave_secreta_aqui

# Directorio base para almacenar imágenes (ruta relativa desde Backend/)
IMAGE_BASE_DIR=../../Datasets/Web/Imagenes

# Directorio base para modelos de IA (ruta relativa desde Backend/)
MODEL_BASE_DIR=../../Datasets/Web/ModelosEntrenados
```
##  Issues

- Estructura archivo .env Backend Issues #98

## 🚀 Ejecución

### Desarrollo

```bash
# Activar entorno virtual
source .venv/bin/activate

# Ejecutar servidor de desarrollo
uvicorn main:app --reload
```

### Producción

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🌐 Endpoints de la API

Una vez ejecutado el servidor, puedes acceder a:

- **API Base**: http://127.0.0.1:8000

### Rutas Principales

- `GET /` - Mensaje de bienvenida
- `GET /health` - Estado de la aplicación
- `/api/v1/users` - Gestión de usuarios
- `/api/v1/images` - Gestión de imágenes
- `/api/v1/diagnosis` - Diagnósticos con IA

## 🗄️ Base de Datos

### Configuración MySQL

- **Host**: Tu servidor MySQL
- **Usuario**: Tu usuario de base de datos
- **Base de datos**: diagnosis_db
- **Tablas principales**:
  - `users` - Información de usuarios
  - `images` - Metadatos de imágenes médicas
  - `diagnosis` - Resultados de diagnósticos

### Inicialización

La base de datos se inicializa automáticamente si `INIT_DB=true` en el archivo `.env`.

## 🤖 Inteligencia Artificial

El sistema utiliza modelos de Machine Learning pre-entrenados ubicados en:
- `../../Datasets/Web/ModelosEntrenados/`

Las imágenes para análisis se almacenan en:
- `../../Datasets/Web/Imagenes/`

## 📁 Gestión de Archivos

### Estructura de Archivos de Configuración

```bash
Backend/
├── .env                    # Variables de entorno (NO subir a Git)
├── .gitignore             # Archivos ignorados
├── requirements.txt       # Dependencias Python
└── main.py               # Punto de entrada FastAPI
```



## 🔧 Tecnologías Utilizadas

- **FastAPI** - Framework web moderno para APIs
- **SQLAlchemy** - ORM para base de datos
- **MySQL** - Base de datos relacional
- **Python-decouple** - Gestión de variables de entorno
- **Uvicorn** - Servidor ASGI
- **TensorFlow/PyTorch** - Para modelos de IA (próximamente)

## 📄 Licencia

Este proyecto es de uso exclusivo para **estudio e investigación**. No está permitida la distribución, comercialización o uso fuera del ámbito académico sin autorización expresa del autor.

## 👨‍💻 Autor

**Richard** - Desarrollador Principal

---

**¿Problemas o sugerencias?** Abre un issue en el repositorio o contacta al equipo de desarrollo...