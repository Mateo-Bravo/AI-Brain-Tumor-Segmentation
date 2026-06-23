# app/models/patient.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database.repository import Base
from datetime import datetime, timezone

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    identity_id = Column(String(50), nullable=True, unique=False)
    clinical_history = Column(String(50), nullable=True, unique=False)
    full_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(String(10), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), unique=True, nullable=True)
    address = Column(String(255), nullable=True)

    # ❌ ELIMINADO user_id y relación hacia User (no existe modelo User en el backend)
    # user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relación correcta hacia Image
    images = relationship("Image", cascade="all, delete", back_populates="patient")

    def __repr__(self):
        return (
            f"<Patient(id={self.id}, identity_id='{self.identity_id}', "
            f"clinical_history='{self.clinical_history}', full_name='{self.full_name}', "
            f"age={self.age}, sex='{self.sex}', phone='{self.phone}', email='{self.email}')>"
        )
