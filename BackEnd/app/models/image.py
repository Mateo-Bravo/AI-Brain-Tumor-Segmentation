# app/models/image.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy import func
from app.database.repository import Base

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Datos básicos del archivo
    filename = Column(String(255), nullable=False)
    path = Column(String(200), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(100), nullable=False)
    format = Column(String(50), nullable=True)

    # Fechas
    upload_date = Column(DateTime, default=func.now())
    processing_date = Column(DateTime, nullable=True)

    # Relación con usuario (ya no existe modelo User, pero mantenemos el campo)
    user_id = Column(Integer, nullable=False)

    # Relación con paciente
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=True)

    # 🆕 Motivo clínico del estudio
    clinical_reason = Column(Text, nullable=True)

    # Metadata médica general
    modality = Column(String(50), nullable=True)
    body_part = Column(String(100), nullable=True)
    scan_type = Column(String(100), nullable=True)
    is_processed = Column(Boolean, default=False)

    # Metadata 3D específica
    dimensions = Column(String(50), nullable=True)
    voxel_spacing = Column(String(50), nullable=True)
    orientation = Column(String(50), nullable=True)
    bit_depth = Column(Integer, nullable=True)
    num_slices = Column(Integer, nullable=True)
    study_date = Column(DateTime, nullable=True)
    series_description = Column(String(255), nullable=True)
    scan_metadata = Column(Text, nullable=True)

    # Relaciones (SIN USER)
    diagnoses = relationship("Diagnosis", back_populates="image", cascade="all, delete-orphan")
    patient = relationship("Patient", back_populates="images")

    def __repr__(self):
        return f"<Image {self.filename} (User {self.user_id}, Patient {self.patient_id})>"

    def to_dict(self):
        """Convierte el objeto Image a un diccionario para respuestas API"""
        return {
            "id": self.id,
            "filename": self.filename,
            "path": self.path,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "format": self.format,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "processing_date": self.processing_date.isoformat() if self.processing_date else None,
            "user_id": self.user_id,
            "patient_id": self.patient_id,
            "clinical_reason": self.clinical_reason,
            "modality": self.modality,
            "body_part": self.body_part,
            "scan_type": self.scan_type,
            "is_processed": self.is_processed,
            "dimensions": self.dimensions,
            "voxel_spacing": self.voxel_spacing,
            "orientation": self.orientation,
            "bit_depth": self.bit_depth,
            "num_slices": self.num_slices,
            "study_date": self.study_date.isoformat() if self.study_date else None,
            "series_description": self.series_description,
            "scan_metadata": self.scan_metadata,
        }
