# app/services/segmentation_health.py

import httpx
import os
from typing import Dict

# Leer de variable de entorno (con fallback)
SEGMENTATION_SERVICE = os.getenv("SEGMENTATION_SERVICE") or os.getenv("NNUNET_SERVICE_URL", "http://localhost:3020")

async def check_segmentation_service() -> Dict[str, any]:
    """
    Verifica si el microservicio de segmentación está disponible.
    
    Returns:
        Dict con status, disponible (bool), y mensaje
    """
    if not SEGMENTATION_SERVICE:
        return {
            "disponible": False,
            "status": "not_configured",
            "mensaje": "Variable SEGMENTATION_SERVICE no configurada",
            "url": None
        }
    
    # 🔴 IMPORTANTE: Agregar /api/v1/health
    health_url = f"{SEGMENTATION_SERVICE}/api/v1/health"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(health_url)
            
            if response.status_code == 200:
                return {
                    "disponible": True,
                    "status": "online",
                    "mensaje": "Microservicio de segmentación disponible",
                    "url": SEGMENTATION_SERVICE,
                    "health_data": response.json()  # 🆕 Info adicional
                }
            else:
                return {
                    "disponible": False,
                    "status": "error",
                    "mensaje": f"Microservicio respondió con código {response.status_code}",
                    "url": SEGMENTATION_SERVICE
                }
                
    except httpx.ConnectError:
        return {
            "disponible": False,
            "status": "offline",
            "mensaje": "No se pudo conectar al microservicio de segmentación",
            "url": SEGMENTATION_SERVICE,
            "health_url": health_url  # 🆕 Para debug
        }
    except httpx.TimeoutException:
        return {
            "disponible": False,
            "status": "timeout",
            "mensaje": "Timeout al conectar con el microservicio",
            "url": SEGMENTATION_SERVICE
        }
    except Exception as e:
        return {
            "disponible": False,
            "status": "error",
            "mensaje": f"Error inesperado: {str(e)}",
            "url": SEGMENTATION_SERVICE
        }


def check_segmentation_service_sync() -> Dict[str, any]:
    """
    Versión sincrónica para usar en startup de FastAPI.
    """
    if not SEGMENTATION_SERVICE:
        return {
            "disponible": False,
            "status": "not_configured",
            "mensaje": "❌ Variable SEGMENTATION_SERVICE no configurada",
            "url": None
        }
    
    import requests
    
    # 🔴 IMPORTANTE: Agregar /api/v1/health
    health_url = f"{SEGMENTATION_SERVICE}/api/v1/health"
    
    try:
        response = requests.get(health_url, timeout=5)
        
        if response.status_code == 200:
            return {
                "disponible": True,
                "status": "online",
                "mensaje": "✅ Microservicio de segmentación disponible",
                "url": SEGMENTATION_SERVICE,
                "health_data": response.json()  # 🆕 Info adicional
            }
        else:
            return {
                "disponible": False,
                "status": "error",
                "mensaje": f"⚠️ Microservicio respondió con código {response.status_code}",
                "url": SEGMENTATION_SERVICE
            }
            
    except requests.exceptions.ConnectionError:
        return {
            "disponible": False,
            "status": "offline",
            "mensaje": "❌ No se pudo conectar al microservicio de segmentación",
            "url": SEGMENTATION_SERVICE,
            "health_url": health_url  # 🆕 Para debug
        }
    except requests.exceptions.Timeout:
        return {
            "disponible": False,
            "status": "timeout",
            "mensaje": "⏱️ Timeout al conectar con el microservicio",
            "url": SEGMENTATION_SERVICE
        }
    except Exception as e:
        return {
            "disponible": False,
            "status": "error",
            "mensaje": f"❌ Error inesperado: {str(e)}",
            "url": SEGMENTATION_SERVICE
        }