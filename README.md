 🏥 Medical AI Diagnosis Platform - Backend API

Backend API built with FastAPI for managing users, medical images, diagnoses, and integration with AI-powered medical imaging services.

🚀 Overview

This repository contains the core backend service of a Medical AI Platform designed to support brain tumor diagnosis workflows through medical image analysis.

The backend acts as the central orchestration layer between:

Clinical users
Medical image storage
AI inference services
Diagnostic reports
Database persistence
🏗️ System Architecture

The platform follows a distributed architecture:

Frontend (Web Application)
            │
            ▼
      Backend API
        (FastAPI)
            │
 ┌──────────┼──────────┐
 │          │          │
 ▼          ▼          ▼
Database  Storage  AI Microservice
(MySQL)   Images   Segmentation Engine
                      (UNet3D)

The backend is responsible for:

User management
Authentication and authorization
Medical image management
Diagnostic workflow orchestration
Communication with AI services
Persistence of results and metadata
🧠 Core Features
User Management
User registration
Authentication
Profile management
Role-based access support
Medical Image Management
Upload medical images
Store metadata
File validation
Image retrieval
Diagnosis Management
Create diagnosis requests
Track diagnosis history
Retrieve AI-generated results
Generate structured reports
AI Integration
Integration with external AI microservices
Medical image processing workflows
Inference request management
Result aggregation
⚙️ Technology Stack
Backend
FastAPI
Python 3.12
Database
MySQL
SQLAlchemy ORM
Alembic Migrations
Infrastructure
Docker
GitHub Actions (planned)
AI Integration
TensorFlow
PyTorch
Medical Imaging Pipelines
📁 Project Structure
Backend/
│
├── main.py
├── requirements.txt
├── .env
│
└── app/
    ├── api/
    │   ├── users.py
    │   ├── images.py
    │   └── diagnosis.py
    │
    ├── controllers/
    │   ├── user_controller.py
    │   ├── image_controller.py
    │   └── diagnosis_controller.py
    │
    ├── core/
    │   └── config.py
    │
    ├── database/
    │   ├── repository.py
    │   └── migrations/
    │
    ├── models/
    │   ├── base.py
    │   ├── image.py
    │   └── diagnosis.py
    │
    ├── storage/
    │   └── image_storage.py
    │
    └── ai/
        └── diagnosis_model.py
🔧 Installation
Clone Repository
git clone https://github.com/Mateo-Bravo/medical-ai-backend.git

cd medical-ai-backend
Create Virtual Environment
python -m venv .venv

Windows:

.venv\Scripts\activate

Linux/Mac:

source .venv/bin/activate
Install Dependencies
pip install -r requirements.txt
🔐 Environment Variables

Create a .env file:

DATABASE_URL=mysql+pymysql://user:password@host:3306/database

INIT_DB=true

SECRET_KEY=your_secret_key

IMAGE_BASE_DIR=../../Datasets/Web/Imagenes

MODEL_BASE_DIR=../../Datasets/Web/ModelosEntrenados
🚀 Running the Application

Development:

uvicorn main:app --reload

Production:

uvicorn main:app --host 0.0.0.0 --port 8000
🌐 API Endpoints
Health Check
GET /health

Response:

{
  "status": "healthy"
}
Users
GET     /api/v1/users
POST    /api/v1/users
GET     /api/v1/users/{id}
PUT     /api/v1/users/{id}
DELETE  /api/v1/users/{id}
Images
GET     /api/v1/images
POST    /api/v1/images
GET     /api/v1/images/{id}
DELETE  /api/v1/images/{id}
Diagnosis
POST    /api/v1/diagnosis
GET     /api/v1/diagnosis/{id}
GET     /api/v1/diagnosis/history
🗄️ Database Design

Main entities:

Users

Stores platform users and authentication data.

Images

Stores uploaded medical image metadata.

Diagnosis

Stores AI-generated diagnostic results and associated information.

🧠 AI Workflow

The backend coordinates the complete diagnosis process:

Upload MRI Image
        │
        ▼
Store Metadata
        │
        ▼
Send Request
to AI Microservice
        │
        ▼
Receive Prediction
        │
        ▼
Persist Results
        │
        ▼
Return Diagnostic Report
🐳 Docker Support

Build image:

docker build -t medical-ai-backend .

Run container:

docker run -p 8000:8000 medical-ai-backend
📈 Future Enhancements
JWT Authentication
Role-Based Access Control (RBAC)
Audit Logging
Redis Caching
Kubernetes Deployment
CI/CD Pipelines
API Rate Limiting
Observability and Metrics
