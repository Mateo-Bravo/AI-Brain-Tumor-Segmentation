import zipfile
import os

def compress_results(file_paths, output_name="segmentation_results.zip"):
    """
    Comprime los archivos de salida en un .zip.
    """
    zip_path = os.path.join("results", output_name)
    os.makedirs("results", exist_ok=True)
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for f in file_paths:
            if os.path.exists(f):
                zipf.write(f, os.path.basename(f))
    return zip_path