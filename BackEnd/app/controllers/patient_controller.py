# app/controllers/patient_controller.py
from sqlalchemy.orm import Session
from app.models.patient import Patient
from fastapi import HTTPException, status
from app.storage.image_storage import delete_patient_directory

# ============================================================
# CRUD general
# ============================================================

def get_patients(db: Session):
    return db.query(Patient).all()


def create_patient(db: Session, patient_data: dict):
    
    db_patient = Patient(**patient_data)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


# ============================================================
# CRUD por ID autogenerado
# ============================================================

def get_patient_by_id(db: Session, id: int):
    return db.query(Patient).filter(Patient.id == id).first()

def update_patient_by_id(db: Session, id: int, update_data: dict):
    db_patient = get_patient_by_id(db, id)
    if not db_patient:
        return None
    for key, value in update_data.items():
        setattr(db_patient, key, value)
    db.commit()
    db.refresh(db_patient)
    return db_patient


# ============================================================
# CRUD por identity_id
# ============================================================

def get_patient_by_identity(db: Session, identity_id: str):
    return db.query(Patient).filter(Patient.identity_id == identity_id).first()

def update_patient_by_identity(db: Session, identity_id: str, update_data: dict):
    db_patient = get_patient_by_identity(db, identity_id)
    if not db_patient:
        return None
    for key, value in update_data.items():
        setattr(db_patient, key, value)
    db.commit()
    db.refresh(db_patient)
    return db_patient


def delete_patient_by_id(db: Session, id: int):
    db_patient = get_patient_by_id(db, id)
    if not db_patient:
        return None

    # Datos necesarios para borrar carpeta
    user_id = db_patient.user_id
    user_name = db_patient.user.full_name        # <-- tomado del modelo User
    patient_id = db_patient.id
    patient_full_name = db_patient.full_name

    # 1️⃣ Borrar carpeta física
    delete_patient_directory(user_id, user_name, patient_id, patient_full_name)

    # 2️⃣ Borrar registro de la BD
    db.delete(db_patient)
    db.commit()

    return db_patient
