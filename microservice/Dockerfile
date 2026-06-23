FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Instalar Python 3.10 y dependencias del sistema
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-dev \
    python3-pip \
    build-essential \
    git \
    wget \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Crear enlace simbólico para python3 (Python 3.10 ya viene por defecto en Ubuntu 22.04)
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1

# Crear directorio de la app
WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Actualizar pip y instalar dependencias
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir -r requirements.txt

# PARCHE CRÍTICO: Arreglar el import de GradScaler en nnunetv2
RUN sed -i 's/from torch import GradScaler/from torch.cuda.amp import GradScaler/g' \
    /usr/local/lib/python3.10/dist-packages/nnunetv2/training/nnUNetTrainer/nnUNetTrainer.py || true

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p /app/models /app/results /app/logs

# Exponer puerto
EXPOSE 3020

# Comando por defecto
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3020"]