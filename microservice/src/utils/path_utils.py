# -*- coding: utf-8 -*-
from pathlib import Path

def validate_output_dir_local(output_dir: str) -> str:
    """
    Valida y crea el directorio de salida indicado por el usuario.
    """
    path = Path(output_dir).expanduser().resolve()
    path.mkdir(parents=True, exist_ok=True)
    return str(path)
