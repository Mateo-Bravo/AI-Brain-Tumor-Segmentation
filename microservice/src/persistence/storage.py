from pathlib import Path
import shutil

class StorageManager:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, source: Path, filename: str) -> Path:
        target = self.base_dir / filename
        shutil.copy(source, target)
        return target

    def ensure_dir(self, subdir: str) -> Path:
        path = self.base_dir / subdir
        path.mkdir(parents=True, exist_ok=True)
        return path
