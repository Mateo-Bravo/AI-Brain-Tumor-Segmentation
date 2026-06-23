# Machine Learning Medical Image Cancer - Modelos de Segmentación

Microservicio de **segmentación automática de tumores cerebrales** en imágenes de resonancia magnética (MRI), implementado mediante modelos de **Deep Learning UNet3D** optimizados para entornos clínicos e investigación biomédica.

Este sistema permite la **detección y delimitación de regiones tumorales**, genera **máscaras segmentadas en 3D** y produce un **reporte estructurado JSON** con información anatómica, computacional y técnica.
Este microservicio implementa un sistema de análisis comparativo que procesa imágenes DICOM de resonancia magnética cerebral utilizando modelos UNet3D preentrenados para generar segmentaciones coloreadas que identifican diferentes tipos de tejido: 
- **Rojo**: Tumor sólido 
- **Amarillo**: Edema peritumoral 
- **Azul**: Núcleo necrótico del tumor

---

## Índice

1. [Descripción General](#-descripción-general)  
2. [Características Principales](#-características-principales)  
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)  
4. [Flujo de Procesamiento](#-flujo-de-procesamiento)  
5. [API Reference](#-api-reference)  
6. [Estructura del Proyecto](#-estructura-del-proyecto)  
7. [Requisitos Técnicos](#-requisitos-técnicos)  
8. [Ejecución](#-ejecución)  
9. [Monitoreo y Logging](#-monitoreo-y-logging)  
10. [Métricas Clave](#-métricas-clave)  
11. [Buenas Prácticas y Escalabilidad](#-buenas-prácticas-y-escalabilidad)  
12. [Contacto](#-contacto)  
13. [Citación Académica](#-citación-académica)  

---

## Descripción General

El microservicio ejecuta un flujo completo de **procesamiento, inferencia y análisis cuantitativo** de volúmenes cerebrales en formato NIfTI o DICOM, utilizando el modelo preentrenado:

> **`modelUnet3D_3_multi_scale_input.h5`**

El modelo se entrena sobre el dataset **BraTS (Brain Tumor Segmentation Challenge)** y permite identificar las siguientes regiones anatómicas:

| Clase | Descripción | Sigla | Color |
|:------|:-------------|:------|:------|
| 1 | Núcleo necrótico del tumor | NCR | Azul `#0000FF` |
| 2 | Tumor sólido (realce tumoral) | ET | Rojo `#FF0000` |
| 3 | Edema peritumoral | ED | Amarillo `#FFFF00` |

---

## Características Principales

- **Segmentación 3D multiclase** con arquitectura **UNet3D multi-scale input**
- **Preprocesamiento automático** de imágenes médicas (.nii, .nii.gz, DICOM)
- **Postprocesamiento morfológico** para refinamiento de máscaras
- **Cálculo de métricas volumétricas** y proporciones por clase
- **API RESTful (FastAPI)** para integración con otros servicios
- **Monitoreo en tiempo real** de CPU, GPU y memoria (`psutil`, `pynvml`)
- **Logging estructurado y validación robusta**
- **Compatibilidad con Docker y Kubernetes**

- **Procesamiento DICOM**: Manejo nativo de archivos de imágenes médicas 
- **Segmentación 3D**: Utilización de modelos UNet3D para análisis volumétrico 
- **API RESTful**: Interfaz HTTP para integración con otros sistemas 
- **Containerización**: Deployment mediante Docker y Kubernetes 
- **Escalabilidad**: Procesamiento distribuido con balanceeo de carga 
- **Monitoreo**: Métricas de rendimiento y health checks integrados

---

## Arquitectura del Sistema



```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Cliente     │───▶│Backend (FastAPI) │───▶│  Microservicio  │
│   (Frontend)    │    │   - API REST     │    │  Segmentación   │
│                 │    │   - Validación   │    │                 │
│                 │    │   - Envío a IA   │    │                 │
│                 │    │   - Gestión usr  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Modelo UNet3D  │
                                               │  Preentrenado   │
                                               └─────────────────┘
```
![alt text](user_journey.png)

## Flujo de Solicitud
```
┌────────────────────────────┐
│ Cliente / UI               │
│ (Web o Sistema Médico)     │
└────────────┬───────────────┘
             │
             │ Solicitud (HTTP POST /segment)
             ▼
┌────────────────────────────┐
│ Controller API             │
│ FastAPI - Validation Layer │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│ Service Layer              │
│ - Gestión de modelo        │
│ - Flujo de inferencia      │
│ - Manejo de errores        │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│ Inference                  │
│ - Preprocessing (.nii/.dcm)│
│ - Modelo UNet3D            │
│ - Postprocessing (mask)    │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│ Utils                      │
│ - Métricas                 │
│ - Colores / mapas          │
│ - Recursos del sistema     │
└────────────────────────────┘
```
## Componentes Principales

- Cliente (Frontend)
Interfaz web o aplicación médica.
Permite al usuario cargar imágenes médicas (.nii, .dcm).
Envía solicitudes al backend para procesar la segmentación.

- Backend
API REST: punto central de comunicación con el cliente.
Validación de entradas: asegura la integridad de los datos médicos.
Envío a IA / Microservicio: despacha la solicitud al módulo de inferencia.

- Microservicio de Segmentación
Recibe las solicitudes del backend.
Procesa las imágenes con el modelo UNet3D preentrenado.
Retorna la máscara segmentada y métricas de rendimiento.

## Módulos Internos

| Módulo             | Descripción                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| **Controller API** | Controlador principal en FastAPI. Maneja endpoints `/segment` y validaciones. |
| **Service Layer**  | Encapsula la lógica de negocio, gestión del modelo e inferencia.              |
| **Inference**      | Pipeline completo de preprocesamiento, ejecución y postprocesamiento.         |
| **Utils**          | Funciones auxiliares para métricas, colores, y recursos del sistema.          |


## Flujo de Procesamiento

1. **Carga del archivo** → DICOM o NIfTI  
2. **Preprocesamiento** → normalización y redimensionamiento a `128×128×128`  
3. **Inferencia** → modelo UNet3D (`modelUnet3D_3_multi_scale_input.h5`)  
4. **Postprocesamiento** → limpieza morfológica, filtrado por clases  
5. **Cálculo de métricas** → volumen, bounding box, proporciones  
6. **Generación del JSON estructurado**  
7. **Registro y monitoreo** del rendimiento del sistema  

---

## API Reference

### **POST /api/v1/segment**

Procesa una imagen médica y retorna la segmentación junto al reporte estructurado.

**Ejemplo de Request**
```bash
curl -X POST "http://localhost:8000/api/v1/segment" \
     -F "file=@BraTS-GLI-00003-000-t1c.nii.gz" \
     -F "output_type=mask"

```
**Response:**
```json
  {
    "message": "Segmentación completada",
    "segmentation_file": {
        "success": true,
        "timestamp": "2025-10-31T17:30:12Z",
        "elapsed_time": 2.768,
        "segmentation_file": "results\\temp_BraTS-GLI-00000-000-t1c_segmented.nii.gz",
        "unique_classes": [
            0,
            1,
            2,
            3
        ],
        "num_classes_detected": 4,
        "class_details": {
            "0": {
                "nombre": "No Tumor",
                "sigla": "No Tumor",
                "color": "#000000",
                "descripcion": "No visible tumor",
                "pixeles": 8872761,
                "porcentaje": 99.381,
                "dimensiones_d_h_w": [
                    240,
                    240,
                    155
                ],
                "volumen_bounding_box": 8928000,
                "ratio_relleno": 0.994,
                "color_nombre": "Negro"
            },
            "1": {
                "nombre": "Necrotic core",
                "sigla": "NCR",
                "color": "#0000FF",
                "descripcion": "Núcleo necrótico",
                "pixeles": 11010,
                "porcentaje": 0.123,
                "dimensiones_d_h_w": [
                    28,
                    36,
                    33
                ],
                "volumen_bounding_box": 33264,
                "ratio_relleno": 0.331,
                "color_nombre": "Azul"
            },
            "2": {
                "nombre": "Edema",
                "sigla": "ED",
                "color": "#00FF00",
                "descripcion": "Edema",
                "pixeles": 35334,
                "porcentaje": 0.396,
                "dimensiones_d_h_w": [
                    58,
                    81,
                    46
                ],
                "volumen_bounding_box": 216108,
                "ratio_relleno": 0.164,
                "color_nombre": "Verde"
            },
            "3": {
                "nombre": "Enhancing tumor",
                "sigla": "ET",
                "color": "#FF0000",
                "descripcion": "Tumor con contraste",
                "pixeles": 5049,
                "porcentaje": 0.057,
                "dimensiones_d_h_w": [
                    38,
                    43,
                    35
                ],
                "volumen_bounding_box": 57190,
                "ratio_relleno": 0.088,
                "color_nombre": "Rojo"
            }
        },
        "metrics": {
            "segmented_voxels": 108255
        },
        "estado": "✓ PREDICCIÓN VÁLIDA",
        "message": "Segmentación completada",
        "recursos": {
            "timestamp": "2025-10-31T17:30:13.122054Z",
            "hostname": "MATEO",
            "os": "Windows 11",
            "python_version": "3.12.3",
            "tensorflow_version": "2.20.0",
            "CPU (%)": 12.6,
            "RAM (GB)": "15.78/31.71 (49.8%)",
            "GPU(s)": [
                {
                    "gpu_index": 0,
                    "gpu_name": "NVIDIA GeForce RTX 3060 Laptop GPU",
                    "gpu_utilization (%)": 41,
                    "gpu_memory (GB)": "0.20/6.00",
                    "gpu_memory_used_gb": 0.2,
                    "gpu_memory_total_gb": 6.0,
                    "gpu_load_pct": 41
                }
            ]
        },
        "elapsed_time_total": 8.517
    }
}
```


## Requisitos Técnicos

### Hardware
- **GPU**: NVIDIA RTX 3060 o superior (mínimo 6GB VRAM)
- **RAM**: 16GB mínimo, 32GB recomendado
- **Storage**: 10GB para modelos y cache

### Software
- Python 3.12.3
- Docker 20.10+
- CUDA 11.2+ (para GPU support)
- TensorFlow 2.15+
- FastAPI 0.110+
- Psutil, Pynvml, Nibabel, Scipy

## Instalación

### Método 1: Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://gitlab.com/brain-cancer-group/machine-learning-medical-image-cancer-modelos-segmentacion.git
cd machine-learning-medical-image-cancer-modelos-segmentacion

# Construir la imagen
docker build -t segmentacion-microservice .

# Ejecutar el contenedor
docker run -p 8080:8080 --gpus all segmentacion-microservice
```

### Método 2: Instalación Local

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar el servicio
python app.py
```

## Configuración

### Variables de Entorno

```bash
# Configuración del servidor
PORT=8080
HOST=0.0.0.0
DEBUG=False

# Configuración del modelo
MODEL_PATH=/models/unet3d_brain_segmentation.h5
MODEL_INPUT_SIZE=128,128,128
BATCH_SIZE=1

# Configuración de GPU
CUDA_VISIBLE_DEVICES=0
TF_FORCE_GPU_ALLOW_GROWTH=true

# Configuración de cache
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Configuración de base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/segmentation_db
```

## API Reference

### Endpoints Principales

#### POST /api/v1/segment

Procesa una imagen DICOM y retorna la segmentación coloreada.

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/segment \
  -H "Content-Type: multipart/form-data" \
  -F "dicom_file=@brain_scan.dcm" \
  -F "options={\"output_format\":\"rgb\",\"confidence_threshold\":0.5}"
```

**Response:**
```json
{
  "status": "success",
  "task_id": "seg_12345",
  "processing_time": 2.34,
  "results": {
    "segmentation_url": "/results/seg_12345_colored.nii.gz",
    "metadata": {
      "tumor_volume_mm3": 15420.5,
      "edema_volume_mm3": 8750.2,
      "necrotic_volume_mm3": 2100.8,
      "confidence_score": 0.92
    },
    "statistics": {
      "tumor_pixels": 1542,
      "edema_pixels": 875,
      "necrotic_pixels": 210,
      "total_brain_pixels": 98765
    }
  }
}
```

#### GET /api/v1/segment/{task_id}

Obtiene el estado y resultados de una tarea de segmentación.

**Response:**
```json
{
  "task_id": "seg_12345",
  "status": "completed",
  "created_at": "2025-01-15T10:30:00Z",
  "completed_at": "2025-01-15T10:32:34Z",
  "results": {
    "segmentation_url": "/results/seg_12345_colored.nii.gz",
    "thumbnail_url": "/results/seg_12345_thumb.png"
  }
}
```

#### GET /api/v1/health

Health check del servicio.

**Response:**
```json
{
    "status": "ok",
    "message": "Servicio activo",
    "timestamp": "2025-10-31T17:56:04.534526Z",
    "resources": {
        "timestamp": "2025-10-31T17:56:04.511765Z",
        "hostname": "MATEO",
        "os": "Windows 11",
        "python_version": "3.12.3",
        "tensorflow_version": "2.20.0",
        "CPU (%)": 9.0,
        "RAM (GB)": "13.33/31.71 (42.0%)",
        "GPU(s)": [
            {
                "gpu_index": 0,
                "gpu_name": "NVIDIA GeForce RTX 3060 Laptop GPU",
                "gpu_utilization (%)": 42,
                "gpu_memory (GB)": "0.24/6.00",
                "gpu_memory_used_gb": 0.24,
                "gpu_memory_total_gb": 6.0,
                "gpu_load_pct": 42
            }
        ]
    }
}
```

### Códigos de Estado

- `200`: Procesamiento exitoso
- `202`: Tarea aceptada, procesando
- `400`: Error en los datos de entrada
- `500`: Error interno del servidor
- `503`: Servicio temporalmente no disponible

## Estructura del Proyecto

```
machine-learning-medical-image-cancer-modelos-segmentacion/
│
├── app.py                         # Punto de entrada principal (FastAPI)
├── requirements.txt                # Dependencias
├── Dockerfile                      # Imagen base (TensorFlow + FastAPI)
├── src/
│   ├── controllers/                # Controladores HTTP (endpoints)
│   ├── services/                   # Lógica de negocio y gestión de modelos
│   ├── inference/
│   │   ├── preprocessing.py        # Carga y normalización de volúmenes
│   │   ├── postprocessing.py       # Limpieza y métricas de máscaras
│   │   └── model.py                # Carga del modelo UNet3D
│   ├── utils/                      # Monitoreo, métricas, logs
│   └── config/                     # Configuración y constantes globales
└── models/
    └── modelUnet3D_3_multi_scale_input.h5

```

## Uso del Microservicio

### Ejemplo Básico

```python
import requests
import json

# Cargar imagen DICOM
with open('brain_scan.dcm', 'rb') as f:
    files = {'dicom_file': f}
    options = {'output_format': 'rgb', 'confidence_threshold': 0.7}
    
    response = requests.post(
        'http://localhost:8080/api/v1/segment',
        files=files,
        data={'options': json.dumps(options)}
    )
    
    result = response.json()
    print(f"Segmentación completada: {result['task_id']}")
```

### Integración con Frontend (Vue.js)

```javascript
// segmentationService.js
export class SegmentationService {
  async processImage(dicomFile, options = {}) {
    const formData = new FormData();
    formData.append('dicom_file', dicomFile);
    formData.append('options', JSON.stringify(options));
    
    const response = await fetch('/api/v1/segment', {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  }
  
  async getResults(taskId) {
    const response = await fetch(`/api/v1/segment/${taskId}`);
    return await response.json();
  }
}
```

## Desarrollo

### Setup de Desarrollo

```bash
# Instalar dependencias de desarrollo
pip install -r requirements-dev.txt

# Ejecutar tests
pytest tests/ -v

# Ejecutar linting
flake8 src/
black src/

# Ejecutar con hot reload
uvicorn app:app --reload --host 0.0.0.0 --port 8080
```

### Testing

```bash
# Tests unitarios
pytest tests/unit/ -v

# Tests de integración
pytest tests/integration/ -v

# Tests de carga
locust -f tests/load/locustfile.py
```

## Deployment

### Docker Compose (Desarrollo)

```yaml
version: '3.8'
services:
  segmentacion:
    build: .
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Kubernetes (Producción)

```bash
# Aplicar manifests
kubectl apply -f kubernetes/

# Verificar deployment
kubectl get pods -l app=segmentacion-microservice

# Verificar logs
kubectl logs -f deployment/segmentacion-microservice
```

## Monitoreo y Métricas

### Métricas Disponibles

- **Latencia**: Tiempo de procesamiento por imagen
- **Throughput**: Imágenes procesadas por minuto
- **Precisión**: Score de confianza del modelo
- **Recursos**: Uso de GPU y memoria

### Prometheus Metrics

```
# HELP segmentation_requests_total Total number of segmentation requests
# TYPE segmentation_requests_total counter
segmentation_requests_total{status="success"} 1250

# HELP segmentation_duration_seconds Time spent processing segmentation
# TYPE segmentation_duration_seconds histogram
segmentation_duration_seconds_bucket{le="1.0"} 450
segmentation_duration_seconds_bucket{le="2.0"} 890
segmentation_duration_seconds_bucket{le="5.0"} 1200

```

## Buenas Prácticas y Escalabilidad

Uso de TF_FORCE_GPU_ALLOW_GROWTH=True para optimizar VRAM

Rate limiting con slowapi

Circuit breaker para fallos de inferencia con pybreaker

Cache temporal en Redis (opcional)

Compatible con Kubernetes y Docker Compose

## Monitoreo y Logging
- System Monitor (utils/system_monitor.py)
    Uso de CPU, RAM y GPU
    Temperatura y VRAM utilizada
    Tiempos de inferencia

- Logging estructurado
    Registro de predicciones, métricas y errores
    Integración con slowapi y pybreaker

## Troubleshooting

### Problemas Comunes

**Error: CUDA out of memory**
```bash
# Solución: Reducir batch size
export BATCH_SIZE=1
# O usar CPU fallback
export CUDA_VISIBLE_DEVICES=""
```

**Error: Model not found**
```bash
# Verificar que el modelo esté en la ubicación correcta
ls -la /models/
# Descargar modelo si es necesario
wget -O /models/unet3d_brain.h5 https://example.com/model.h5
```

**Rendimiento lento**
```bash
# Verificar GPU disponible
nvidia-smi
# Optimizar TensorFlow
export TF_FORCE_GPU_ALLOW_GROWTH=true
export TF_GPU_MEMORY_GROWTH=true
```

## Contribución

1. Fork el repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## Contacto.

- **Equipo de Desarrollo**: brain-cancer-group@university.edu
- **Issues**: [GitLab Issues](https://gitlab.com/brain-cancer-group/machine-learning-medical-image-cancer-modelos-segmentacion/issues)
- **Documentación**: [Wiki del Proyecto](https://gitlab.com/brain-cancer-group/machine-learning-medical-image-cancer-modelos-segmentacion/wiki)