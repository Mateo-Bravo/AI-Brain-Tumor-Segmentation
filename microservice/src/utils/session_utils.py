# -*- coding: utf-8 -*-
from fastapi import Request

async def detect_operation_mode(request: Request) -> str:
    """
    Detecta modo de operación:
    - local: si se envía output_dir
    - remote: si no se envía
    """
    try:
        form = await request.form()
        output_dir = form.get("output_dir")
        if output_dir and output_dir.strip():
            return "local"
        return "remote"
    except Exception:
        return "remote"
