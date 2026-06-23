# app/storage/image_storage.py
import os
import imghdr
from io import BytesIO
import pydicom
import gzip
import zipfile
from typing import Union, Tuple, Dict, Any
from app.core.config import IMAGE_BASE_DIR
import hashlib
from datetime import datetime
import shutil


class FileSaveError(Exception):
    pass

def is_dicom(file_data: bytes) -> bool:
    """
    Verifica si el archivo es un DICOM válido.
    """
    try:
        ds = pydicom.dcmread(BytesIO(file_data))
        print(f"DICOM Metadata: Patient Name: {ds.PatientName}")
        return True
    except Exception as e:
        print(f"Error al validar DICOM: {str(e)}")
        return False

def is_nifti(file_data: bytes, filename: str) -> bool:
    """
    Verifica si el archivo es NIfTI válido (.nii, .nii.gz)
    """
    try:
        if filename.endswith('.nii.gz'):
            with gzip.GzipFile(fileobj=BytesIO(file_data)) as gz_file:
                gz_file.read(4)
            return True
        elif filename.endswith('.nii'):
            return file_data[:4] in [b'n+1\x00', b'ni1\x00']
        return False
    except:
        return False

def is_valid_zip(file_data: bytes) -> bool:
    """
    Verifica si es un archivo ZIP válido.
    """
    try:
        with zipfile.ZipFile(BytesIO(file_data)) as zip_file:
            return zip_file.testzip() is None
    except:
        return False

def save_medical_image(image_data: bytes, filename: str, user_id: int, user_name: str, patient_id: int, patient_name: str) -> Tuple[str, int, str]:
    """
    Guarda una imagen médica dentro de la estructura:
    /IMAGE_BASE_DIR/user_{id}_{nombre}/patient_{id}_{nombre}/archivo
    
    ✅ El archivo se guarda en el disco con la ruta completa
    ✅ En la BD se guarda: user_{id}_{nombre}/patient_{id}_{nombre} + file_size + file_type
    
    Returns:
        Tuple[str, int, str]: (ruta_relativa, file_size, file_type)
    """
    # Sanitizar nombres
    safe_user_name = user_name.replace(" ", "_").replace("/", "_")
    safe_patient_name = patient_name.replace(" ", "_").replace("/", "_")

    # Crear estructura de carpetas
    user_dir = os.path.join(IMAGE_BASE_DIR, f"{user_id}_{safe_user_name}")
    patient_dir = os.path.join(user_dir, f"{patient_id}_{safe_patient_name}")
    os.makedirs(patient_dir, exist_ok=True)

    # Generar nombre único con timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name, ext = os.path.splitext(filename)
    unique_filename = f"{timestamp}_{name}{ext}"

    absolute_file_path = os.path.join(patient_dir, unique_filename)
    file_size = len(image_data)
    file_type = "application/octet-stream"  # Valor por defecto
    
    try:
        # 1. Validar y guardar DICOM
        if filename.lower().endswith(".dcm") or is_dicom(image_data):
            file_type = "application/dicom"
            with open(absolute_file_path, "wb") as file:
                file.write(image_data)
            print(f"Archivo DICOM guardado: {absolute_file_path}")
        
        # 2. Validar y guardar NIfTI
        elif filename.endswith(('.nii', '.nii.gz')) and is_nifti(image_data, filename):
            file_type = "application/x-nifti" if filename.endswith('.nii') else "application/x-nifti-gz"
            with open(absolute_file_path, "wb") as file:
                file.write(image_data)
            print(f"Archivo NIfTI guardado: {absolute_file_path}")
        
        # 3. Validar y guardar ZIP
        elif filename.endswith('.zip') and is_valid_zip(image_data):
            file_type = "application/zip"
            with open(absolute_file_path, "wb") as file:
                file.write(image_data)
            print(f"Archivo ZIP médico guardado: {absolute_file_path}")
        
        # 4. Validar imágenes comunes
        else:
            detected_type = imghdr.what(None, image_data)
            if detected_type in ["jpeg", "png", "gif", "bmp"]:
                file_type = f"image/{detected_type}"
                with open(absolute_file_path, "wb") as file:
                    file.write(image_data)
                print(f"Imagen común guardada: {absolute_file_path}")
            else:
                raise FileSaveError(f"Formato de archivo médico no válido: {filename}")
        
        # ✅ Devolver: ruta absoluta de carpeta, tamaño del archivo, tipo de archivo
        return (patient_dir, file_size, file_type)
        
    except Exception as e:
        if os.path.exists(absolute_file_path):
            os.remove(absolute_file_path)
        raise FileSaveError(f"Error al guardar archivo médico '{filename}': {str(e)}")

def delete_image_file(file_path: str) -> bool:
    """ 
    Elimina un archivo del storage local.
    
    Args:
        file_path (str): Ruta relativa del archivo
        
    Returns:
        bool: True si se eliminó correctamente
    """
    try:
        print(f"🗑️ Intentando eliminar archivo: {file_path}")
        
        absolute_path = os.path.join(IMAGE_BASE_DIR, file_path)
        print(f"📁 Ruta absoluta calculada: {absolute_path}")
        
        if not os.path.exists(absolute_path):
            print(f"⚠️ Archivo no encontrado: {absolute_path}")
            return False
        
        if not os.path.isfile(absolute_path):
            print(f"La ruta no es un archivo: {absolute_path}")
            return False
        
        os.remove(absolute_path)
        print(f"✅ Archivo eliminado exitosamente: {absolute_path}")
        
        if os.path.exists(absolute_path):
            print(f"El archivo aún existe después de eliminación: {absolute_path}")
            return False
        
        return True
        
    except PermissionError as e:
        print(f"Error de permisos eliminando {file_path}: {str(e)}")
        return False
    except FileNotFoundError:
        print(f"Archivo no encontrado (ya eliminado): {file_path}")
        return True
    except Exception as e:
        print(f"Error inesperado eliminando {file_path}: {str(e)}")
        return False

import shutil

def delete_patient_directory(user_id: int, user_name: str, patient_id: int, patient_full_name: str) -> bool:
    """
    Elimina completamente la carpeta del paciente:
    IMAGE_BASE_DIR/userId_userName/patientId_patientFullName/
    """

    safe_user_name = user_name.replace(" ", "_").replace("/", "_")
    safe_patient_name = patient_full_name.replace(" ", "_").replace("/", "_")

    user_dir = os.path.join(IMAGE_BASE_DIR, f"{user_id}_{safe_user_name}")
    patient_dir = os.path.join(user_dir, f"{patient_id}_{safe_patient_name}")

    try:
        # 🧽 Eliminar carpeta del paciente
        if os.path.exists(patient_dir):
            shutil.rmtree(patient_dir)
            print(f"🗑️ Carpeta del paciente eliminada: {patient_dir}")

        # 🧽 Borrar carpeta de usuario si quedó vacía
        if os.path.exists(user_dir) and not os.listdir(user_dir):
            shutil.rmtree(user_dir)
            print(f"🗑️ Carpeta del usuario eliminada: {user_dir}")

        return True

    except Exception as e:
        print(f"❌ Error eliminando directorio del paciente: {str(e)}")
        return False

def delete_user_directory(user_id: int, user_full_name: str) -> bool:
    """
    Elimina completamente la carpeta de un usuario:
    IMAGE_BASE_DIR/userId_userFullName/
    """

    safe_user_name = user_full_name.replace(" ", "_").replace("/", "_")

    user_dir = os.path.join(IMAGE_BASE_DIR, f"{user_id}_{safe_user_name}")

    try:
        if os.path.exists(user_dir):
            shutil.rmtree(user_dir)
            print(f"🗑️ Carpeta de usuario eliminada: {user_dir}")

        return True

    except Exception as e:
        print(f"❌ Error eliminando directorio del usuario: {str(e)}")
        return False

def rename_user_directory(user_id: int, old_full_name: str, new_full_name: str) -> bool:
    """
    Renombra la carpeta del usuario cuando cambia su full_name.
    """
    try:
        safe_old = old_full_name.replace(" ", "_").replace("/", "_")
        safe_new = new_full_name.replace(" ", "_").replace("/", "_")

        old_path = os.path.join(IMAGE_BASE_DIR, f"{user_id}_{safe_old}")
        new_path = os.path.join(IMAGE_BASE_DIR, f"{user_id}_{safe_new}")

        # Si no existe la carpeta, no renombramos
        if not os.path.exists(old_path):
            print(f"⚠️ Carpeta del usuario no existe, no se renombra: {old_path}")
            return False

        os.rename(old_path, new_path)
        print(f"🔄 Carpeta renombrada: {old_path} → {new_path}")
        return True

    except Exception as e:
        print(f"❌ Error renombrando carpeta de usuario: {str(e)}")
        return False

def cleanup_empty_directories(user_id: int) -> None:
    """
    Limpia directorios vacíos después de eliminar archivos.
    """
    try:
        user_dir = os.path.join(IMAGE_BASE_DIR, f"user_{user_id}")
        
        if os.path.exists(user_dir) and os.path.isdir(user_dir):
            if not os.listdir(user_dir):
                print(f"🧹 Eliminando directorio de usuario vacío: {user_dir}")
                os.rmdir(user_dir)
            else:
                for item in os.listdir(user_dir):
                    item_path = os.path.join(user_dir, item)
                    if os.path.isdir(item_path) and not os.listdir(item_path):
                        os.rmdir(item_path)
                        print(f"🧹 Eliminando directorio de paciente vacío: {item_path}")
                
    except Exception as e:
        print(f"⚠️ Error limpiando directorios vacíos para user_{user_id}: {str(e)}")

def delete_extracted_zip_files(original_path: str, user_id: int) -> bool:
    """
    Elimina la carpeta completa de archivos extraídos de un ZIP.
    """
    try:
        import shutil
        from pathlib import Path
        
        zip_filename = Path(original_path).stem
        extracted_dir = os.path.join(IMAGE_BASE_DIR, f"user_{user_id}", "extracted", zip_filename)
        
        print(f"🗂️ Buscando carpeta extraída: {extracted_dir}")
        
        if os.path.exists(extracted_dir):
            shutil.rmtree(extracted_dir)
            print(f"✅ Carpeta extraída eliminada: {extracted_dir}")
            return True
        else:
            print(f"ℹ️ Carpeta extraída no existe: {extracted_dir}")
            return True
            
    except Exception as e:
        print(f"❌ Error eliminando carpeta extraída: {str(e)}")
        return False

def delete_processed_image(processed_path: str) -> bool:
    """
    Elimina un archivo procesado del sistema de almacenamiento.
    """
    absolute_path = os.path.join(IMAGE_BASE_DIR, "processed", os.path.basename(processed_path))
    
    try:
        if os.path.exists(absolute_path):
            os.remove(absolute_path)
            print(f"Archivo procesado eliminado: {absolute_path}")
            return True
        return False
    except Exception as e:
        print(f"Error al eliminar archivo procesado {absolute_path}: {str(e)}")
        return False

def save_processed_image(original_path: str, processed_data: bytes, filename: str) -> str:
    """
    Guarda una versión procesada de la imagen en subdirectorio 'processed'
    
    Returns:
        str: ruta_relativa
    """
    processed_dir = os.path.join(IMAGE_BASE_DIR, "processed")
    os.makedirs(processed_dir, exist_ok=True)
    
    if not filename:
        filename = os.path.basename(original_path)
    
    absolute_processed_path = os.path.join(processed_dir, filename)
    
    try:
        with open(absolute_processed_path, "wb") as file:
            file.write(processed_data)
        
        print(f"Imagen procesada guardada: {absolute_processed_path}")
        
        relative_path = os.path.relpath(absolute_processed_path, IMAGE_BASE_DIR)
        return relative_path
        
    except Exception as e:
        print(f"Error al guardar imagen procesada: {str(e)}")
        raise FileSaveError(f"Error al guardar imagen procesada: {str(e)}")

def save_image(image_data: bytes, filename: str) -> str:
    """
    Función legacy - usa save_medical_image para soporte extendido
    """
    return save_medical_image(image_data, filename)

def extract_medical_metadata(file_data: bytes, filename: str) -> Dict[str, Any]:
    """
    Extrae metadata específica de archivos médicos.
    """
    metadata = {
        'filename': filename,
        'file_size': len(file_data),
        'checksum': hashlib.sha256(file_data).hexdigest(),
        'extraction_date': datetime.now().isoformat(),
        'modality': None,
        'body_part': None,
        'scan_type': None,
        'patient_info': None,
        'dimensions': None,
        'is_medical_file': False,
        'file_format': None
    }
    
    try:
        if filename.lower().endswith(".dcm") or is_dicom(file_data):
            ds = pydicom.dcmread(BytesIO(file_data))
            metadata.update({
                'modality': getattr(ds, 'Modality', None),
                'body_part': getattr(ds, 'BodyPartExamined', None),
                'scan_type': getattr(ds, 'ScanningSequence', None),
                'patient_info': {
                    'name': str(getattr(ds, 'PatientName', '')),
                    'id': getattr(ds, 'PatientID', None),
                    'age': getattr(ds, 'PatientAge', None),
                    'sex': getattr(ds, 'PatientSex', None)
                },
                'dimensions': f"{getattr(ds, 'Rows', '')}x{getattr(ds, 'Columns', '')}",
                'is_medical_file': True,
                'file_format': 'DICOM'
            })
        
        elif filename.endswith(('.nii', '.nii.gz')):
            metadata.update({
                'modality': 'MRI',
                'is_medical_file': True,
                'file_format': 'NIfTI'
            })
            
            try:
                if filename.endswith('.nii.gz'):
                    header_data = gzip.decompress(file_data)[:348]
                else:
                    header_data = file_data[:348]
                
                if len(header_data) >= 348:
                    dim = []
                    for i in range(8):
                        dim_val = int.from_bytes(header_data[40+i*2:42+i*2], byteorder='little')
                        dim.append(dim_val)
                    
                    metadata['nifti_info'] = {
                        'dimensions': dim[1:dim[0]+1] if dim[0] > 0 else [],
                        'is_compressed': filename.endswith('.nii.gz')
                    }
            except Exception as e:
                metadata['nifti_extraction_error'] = str(e)
        
        elif filename.endswith('.zip'):
            try:
                with zipfile.ZipFile(BytesIO(file_data)) as zip_file:
                    medical_files = 0
                    total_size = 0
                    files_info = []
                    
                    for file_info in zip_file.filelist:
                        if not file_info.is_dir():
                            total_size += file_info.file_size
                            files_info.append({
                                'filename': file_info.filename,
                                'size': file_info.file_size
                            })
                            
                            if any(file_info.filename.lower().endswith(ext) 
                                  for ext in ['.nii', '.nii.gz', '.dcm']):
                                medical_files += 1
                    
                    metadata.update({
                        'is_medical_file': medical_files > 0,
                        'file_format': 'ZIP',
                        'zip_info': {
                            'total_files': len(files_info),
                            'medical_files_count': medical_files,
                            'total_uncompressed_size': total_size,
                            'files': files_info[:5]
                        }
                    })
            except Exception as e:
                metadata['zip_extraction_error'] = str(e)
        
        else:
            detected_type = imghdr.what(None, file_data)
            if detected_type:
                metadata.update({
                    'file_format': detected_type.upper(),
                    'is_medical_file': False
                })
        
        inferred_info = infer_from_filename(filename)
        if inferred_info:
            metadata['inferred_metadata'] = inferred_info
            if not metadata['modality'] and inferred_info.get('modality'):
                metadata['modality'] = inferred_info['modality']
            if not metadata['body_part'] and inferred_info.get('body_part'):
                metadata['body_part'] = inferred_info['body_part']
            
    except Exception as e:
        print(f"Error extrayendo metadata: {str(e)}")
        metadata['extraction_error'] = str(e)
        metadata['file_format'] = filename.split('.')[-1].upper() if '.' in filename else 'UNKNOWN'
    
    return metadata

def infer_from_filename(filename: str) -> Dict[str, Any]:
    """
    Infiere modalidad y parte del cuerpo desde el nombre del archivo.
    """
    filename_lower = filename.lower()
    
    modality_patterns = {
        'CT': ['ct', 'computed', 'tomography'],
        'MRI': ['mri', 'magnetic', 'resonance', 'fmri'],
        'PET': ['pet', 'positron', 'emission'],
        'X-Ray': ['xray', 'radiography', 'chest'],
        'Ultrasound': ['ultrasound', 'echo', 'doppler'],
        'Mammography': ['mammo', 'breast']
    }
    
    body_part_patterns = {
        'Brain': ['brain', 'head', 'cerebro', 'cranial'],
        'Chest': ['chest', 'thorax', 'lung', 'pulmonary'],
        'Abdomen': ['abdomen', 'abdominal', 'liver', 'kidney'],
        'Pelvis': ['pelvis', 'pelvic', 'bladder'],
        'Spine': ['spine', 'spinal', 'vertebral'],
        'Extremities': ['arm', 'leg', 'hand', 'foot', 'knee']
    }
    
    detected_modality = None
    detected_body_part = None
    
    for modality, patterns in modality_patterns.items():
        if any(pattern in filename_lower for pattern in patterns):
            detected_modality = modality
            break
    
    for body_part, patterns in body_part_patterns.items():
        if any(pattern in filename_lower for pattern in patterns):
            detected_body_part = body_part
            break
    
    if detected_modality or detected_body_part:
        return {
            'modality': detected_modality,
            'body_part': detected_body_part,
            'confidence': 'low'
        } 
    
    return {}

def image_exists(file_path: str) -> bool:
    """
    Verifica si un archivo de imagen existe en el sistema de almacenamiento.
    """
    absolute_path = os.path.join(IMAGE_BASE_DIR, file_path)
    return os.path.exists(absolute_path)

def get_image_url(file_path: str) -> str:
    """
    Genera la URL para acceder a un archivo de imagen.
    """
    from app.core.config import settings
    return f"{settings.BASE_URL}/api/images/file/{file_path}"