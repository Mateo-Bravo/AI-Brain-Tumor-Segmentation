import pydicom
import numpy as np
import os

def load_dicom_series(folder_path: str) -> np.ndarray:
    slices = [pydicom.dcmread(os.path.join(folder_path, f)) for f in os.listdir(folder_path) if f.endswith(".dcm")]
    slices.sort(key=lambda x: float(x.ImagePositionPatient[2]))
    image = np.stack([s.pixel_array for s in slices])
    return image