# app/models/diagnosis.py

from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.repository import Base

class Diagnosis(Base):
    __tablename__ = "diagnosis"

    # =========================================================
    # Identificación
    # =========================================================
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Relación REAL con imagen
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)

    # Usuario lógico (SIN ForeignKey)
    user_id = Column(Integer, nullable=False)

    # =========================================================
    # Información del archivo
    # =========================================================
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    format = Column(String(50), nullable=True)

    # =========================================================
    # Información del paciente (opcional)
    # =========================================================
    patient_id = Column(Integer, nullable=True)
    identity_id = Column(String(100), nullable=True)
    full_name = Column(String(255), nullable=True)

    # =========================================================
    # Resultado de segmentación
    # =========================================================
    success = Column(Boolean, default=False)
    segmentation_path = Column(Text, nullable=True)

    unique_classes = Column(String(50), nullable=True)
    num_classes_detected = Column(Integer, nullable=True)
    elapsed_time = Column(Float, nullable=True)

    model = Column(String(255), nullable=True)
    output_shape = Column(String(100), nullable=True)

    num_classes = Column(Integer, nullable=True)
    total_params = Column(Integer, nullable=True)

    mask_shape = Column(String(50), nullable=True)
    mask_3d_shape = Column(String(50), nullable=True)
    original_shape = Column(String(50), nullable=True)

    total_pixeles = Column(Integer, nullable=True)
    pixeles_con_lesion = Column(Integer, nullable=True)
    pixeles_sin_lesion = Column(Integer, nullable=True)
    porcentaje_lesion = Column(Float, nullable=True)

    estado = Column(String(100), nullable=True)

    # =========================================================
    # ✅ NUEVO: CAMPOS PARA DESENCRIPTAR (ENVELOPE)
    # =========================================================
    segmentation_wrapped_key = Column(Text, nullable=True)
    segmentation_path_encrypted = Column(Text, nullable=True)

    # =========================================================
    # Clases de segmentación
    # =========================================================

    # Clase 0 - No Tumor
    clase_0_nombre = Column(String(100), nullable=True)
    clase_0_sigla = Column(String(50), nullable=True)
    clase_0_color = Column(String(10), nullable=True)
    clase_0_descripcion = Column(String(255), nullable=True)
    clase_0_pixeles = Column(Integer, nullable=True)
    clase_0_porcentaje = Column(Float, nullable=True)

    # Clase 1 - Necrotic core
    clase_1_nombre = Column(String(100), nullable=True)
    clase_1_sigla = Column(String(50), nullable=True)
    clase_1_color = Column(String(10), nullable=True)
    clase_1_descripcion = Column(String(255), nullable=True)
    clase_1_pixeles = Column(Integer, nullable=True)
    clase_1_porcentaje = Column(Float, nullable=True)

    # Clase 2 - Edema
    clase_2_nombre = Column(String(100), nullable=True)
    clase_2_sigla = Column(String(50), nullable=True)
    clase_2_color = Column(String(10), nullable=True)
    clase_2_descripcion = Column(String(255), nullable=True)
    clase_2_pixeles = Column(Integer, nullable=True)
    clase_2_porcentaje = Column(Float, nullable=True)

    # Clase 3 - Enhancing tumor
    clase_3_nombre = Column(String(100), nullable=True)
    clase_3_sigla = Column(String(50), nullable=True)
    clase_3_color = Column(String(10), nullable=True)
    clase_3_descripcion = Column(String(255), nullable=True)
    clase_3_pixeles = Column(Integer, nullable=True)
    clase_3_porcentaje = Column(Float, nullable=True)

    # =========================================================
    # Fechas
    # =========================================================
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # =========================================================
    # Relaciones ORM
    # =========================================================
    image = relationship("Image", back_populates="diagnoses")
