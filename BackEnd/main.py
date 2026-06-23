# ==================================================================
# ARCHIVO PRINCIPAL DEL BACKEND - SISTEMA MÉDICO DE IMÁGENES
# ==================================================================

import os
import asyncio
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

# Routers
from app.api.images import router as image_router
from app.api.patients import router as patient_router
from app.api.diagnosis import router as diagnosis_router
from app.api.upload import router as upload_router

# Microservicio
from app.services.segmentation_health import (
    check_segmentation_service_sync,
    check_segmentation_service
)

# DB
from app.database.init_db import init_db

# ==================================================================
# CONFIGURACIÓN
# ==================================================================

load_dotenv()

app = FastAPI(
    title="Backend - Diagnóstico de Imágenes Médicas",
    description="API para subir imágenes médicas, segmentarlas y consultar diagnósticos.",
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)

# ==================================================================
# CORS (IMPORTANTE: antes de montar rutas/StaticFiles)
# ==================================================================

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://172.16.229.184:3000",
    "http://172.16.230.135:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ==================================================================
# EVENTO DE INICIO
# ==================================================================

@app.on_event("startup")
async def startup_event():
    print("=======================================================")
    print("🚀 Backend iniciado - Diagnóstico de Imágenes Médicas")

    # Check del microservicio
    health = check_segmentation_service_sync()
    if health.get("disponible"):
        print("✅ Microservicio de segmentación disponible")
    else:
        print("⚠️ Microservicio de segmentación NO disponible")

    # Ejecutar init_db() opcional
    print("🛠 Ejecutando init_db()...")
    try:
        if os.getenv("INIT_DB", "false").lower() == "true":
            init_db()
            print("✅ Base de datos sincronizada correctamente")
        else:
            print("⚠ INIT_DB=false → No se sincronizará la base de datos")
    except Exception as e:
        print(f"❌ Error al sincronizar BD: {e}")

    print("=======================================================")

# ==================================================================
# HEALTH CHECK
# ==================================================================

@app.get("/api/health-check/", tags=["Health"])
async def health_check():
    """Health check básico del backend"""
    return {"status": "ok"}

@app.get("/api/v1/health", tags=["Health"])
async def health_v1():
    """Health check compatible con estándar v1"""
    return {
        "status": "ok",
        "service": "backend",
        "version": "1.0.0",
        "timestamp": "2026-02-09T23:59:00Z"
    }

@app.get("/api/segmentation/health", tags=["Health"])
async def segmentation_health():
    """Verifica estado del microservicio de segmentación"""
    return await check_segmentation_service()

# ==================================================================
# STATIC FILES
# ==================================================================

app.mount("/static", StaticFiles(directory="app/static/"), name="static")

@app.get("/favicon.ico")
async def favicon():
    return FileResponse("app/static/favicon.ico")

# ==================================================================
# IMÁGENES (STATIC) con CORS explícito
# ==================================================================

IMAGE_DIR = os.getenv("IMAGE_BASE_DIR", "")

if IMAGE_DIR and os.path.exists(IMAGE_DIR):
    from starlette.responses import Response

    class CORSEnabledStaticFiles(StaticFiles):
        async def get_response(self, path, scope):
            response: Response = await super().get_response(path, scope)
            # Aquí puedes poner origin específico si quieres más seguridad.
            # Para desarrollo, dejamos "*" SOLO para static.
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return response

    app.mount("/images", CORSEnabledStaticFiles(directory=IMAGE_DIR), name="images")

# ==================================================================
# DOCUMENTACIÓN CUSTOM
# ==================================================================

@app.get("/docs", include_in_schema=False)
async def custom_docs():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title="Documentación API – Diagnóstico"
    )

@app.get("/redoc", include_in_schema=False)
async def custom_redoc():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title="ReDoc – Diagnóstico de Imágenes"
    )

# ==================================================================
# ROUTERS
# ==================================================================

app.include_router(image_router, prefix="/api/images", tags=["Images"])
app.include_router(patient_router, prefix="/api/patients", tags=["Patients"])
app.include_router(diagnosis_router, prefix="/api/diagnosis", tags=["Diagnosis"])
app.include_router(upload_router)

# ==================================================================
# RUTA RAÍZ
# ==================================================================

@app.get("/")
def root():
    return {"message": "Backend operativo para diagnóstico de imágenes médicas"}