import os
import nibabel as nib
import numpy as np
import pydicom
from PIL import Image
from src.utils.dicom_utils import load_dicom_series

def convert_to_nii(input_path: str) -> str:
    """
    Convierte imágenes (.dcm, .npy, .png, .jpg, directorios DICOM) a formato NIfTI (.nii.gz)
    """
    ext = os.path.splitext(input_path)[1].lower()

    # Directorio DICOM
    if os.path.isdir(input_path):
        img = load_dicom_series(input_path)
        affine = np.eye(4)
        out_path = os.path.join(input_path, "converted_from_dicom.nii.gz")
        nib.save(nib.Nifti1Image(img, affine), out_path)
        return out_path

    elif ext in [".nii", ".gz"]:
        return input_path

    elif ext == ".npy":
        data = np.load(input_path)
        affine = np.eye(4)
        out_path = input_path.replace(".npy", ".nii.gz")
        nib.save(nib.Nifti1Image(data, affine), out_path)
        return out_path

    elif ext == ".dcm":
        ds = pydicom.dcmread(input_path)
        img = ds.pixel_array.astype(np.float32)
        affine = np.eye(4)
        out_path = input_path.replace(".dcm", ".nii.gz")
        nib.save(nib.Nifti1Image(img, affine), out_path)
        return out_path

    elif ext in [".png", ".jpg", ".jpeg"]:
        img = np.array(Image.open(input_path).convert("L"), dtype=np.float32)
        affine = np.eye(4)
        out_path = input_path + ".nii.gz"
        nib.save(nib.Nifti1Image(img, affine), out_path)
        return out_path

    else:
        raise ValueError(f"Formato de archivo no soportado: {ext}")
