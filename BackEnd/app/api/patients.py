# app/api/patients.py
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database.repository import get_db
from app.controllers import patient_controller
from app.models.patient import Patient

router = APIRouter()

# ============================================================
# 🔧 Helper para transformar el modelo en un diccionario limpio
# ============================================================
def model_to_dict(obj: Patient) -> Dict[str, Any]:
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


# ============================================================
# 📌 LISTAR TODOS LOS PACIENTES
# ============================================================
@router.get("/", response_model=List[Dict[str, Any]])
def read_patients(db: Session = Depends(get_db)):
    patients = patient_controller.get_patients(db)
    return [model_to_dict(p) for p in patients]


# ============================================================
# 📌 CREAR PACIENTE
# ============================================================
@router.post("/", response_model=Dict[str, Any])
def create_patient(patient: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    db_patient = patient_controller.create_patient(db, patient)
    return model_to_dict(db_patient)


# ============================================================
# 📌 CRUD POR ID AUTOINCREMENTADO
# ============================================================
@router.get("/by-id/{id}", response_model=Dict[str, Any])
def read_patient_by_id(id: int, db: Session = Depends(get_db)):
    db_patient = patient_controller.get_patient_by_id(db, id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return model_to_dict(db_patient)


@router.put("/by-id/{id}", response_model=Dict[str, Any])
def update_patient_by_id(id: int, patient: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    db_patient = patient_controller.update_patient_by_id(db, id, patient)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return model_to_dict(db_patient)


@router.delete("/by-id/{id}", response_model=Dict[str, Any])
def delete_patient_by_id(id: int, db: Session = Depends(get_db)):
    db_patient = patient_controller.delete_patient_by_id(db, id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return model_to_dict(db_patient)


# ============================================================
# 📌 CRUD POR identity_id (cédula o código del paciente)
# ============================================================
@router.get("/by-identity/{identity_id}", response_model=Dict[str, Any])
def read_patient_by_identity(identity_id: str, db: Session = Depends(get_db)):
    db_patient = patient_controller.get_patient_by_identity(db, identity_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return model_to_dict(db_patient)


@router.put("/by-identity/{identity_id}", response_model=Dict[str, Any])
def update_patient_by_identity(identity_id: str, patient: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    db_patient = patient_controller.update_patient_by_identity(db, identity_id, patient)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return model_to_dict(db_patient)


@router.delete("/by-identity/{identity_id}", response_model=Dict[str, Any])
def delete_patient_by_identity(identity_id: str, db: Session = Depends(get_db)):
    db_patient = patient_controller.delete_patient_by_identity(db, identity_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return model_to_dict(db_patient)
