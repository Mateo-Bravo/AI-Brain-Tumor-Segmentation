#segmentation_receiver/receiver.py

from fastapi import FastAPI, UploadFile, File
import os

app = FastAPI()

SAVE_DIR = "received_segmentations"
os.makedirs(SAVE_DIR, exist_ok=True)

@app.post("/upload")
async def upload_segmentation(file: UploadFile = File(...)):
    file_path = os.path.join(SAVE_DIR, file.filename)
    print(f"Archivo recibido: {file.filename} → {file_path}")
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return {"status": "ok", "file": file.filename, "path": file_path}