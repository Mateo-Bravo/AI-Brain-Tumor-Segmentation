import psutil
import pynvml
import platform
import tensorflow as tf
from datetime import datetime

def get_system_resources():
    """
    Devuelve un resumen detallado de los recursos del sistema:
    CPU, RAM y GPU (si está disponible).
    Compatible con entornos TensorFlow + NVIDIA.
    """
    try:
        # --- CPU ---
        cpu_percent = psutil.cpu_percent(interval=0.5)

        # --- RAM ---
        ram = psutil.virtual_memory()
        ram_used = ram.used / (1024 ** 3)
        ram_total = ram.total / (1024 ** 3)
        ram_percent = ram.percent

        info = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "hostname": platform.node(),
            "os": f"{platform.system()} {platform.release()}",
            "python_version": platform.python_version(),
            "tensorflow_version": tf.__version__,
            "CPU (%)": round(cpu_percent, 1),
            "RAM (GB)": f"{ram_used:.2f}/{ram_total:.2f} ({ram_percent:.1f}%)",
        }

        # --- GPU (si existe) ---
        try:
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()

            if device_count > 0:
                gpus = []
                for i in range(device_count):
                    handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                    name = pynvml.nvmlDeviceGetName(handle)
                    if isinstance(name, bytes):
                        name = name.decode("utf-8")

                    mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)

                    gpus.append({
                        "gpu_index": i,
                        "gpu_name": name,
                        "gpu_utilization (%)": util.gpu,
                        "gpu_memory (GB)": f"{mem_info.used / 1024**3:.2f}/{mem_info.total / 1024**3:.2f}",
                        "gpu_memory_used_gb": round(mem_info.used / 1024**3, 2),
                        "gpu_memory_total_gb": round(mem_info.total / 1024**3, 2),
                        "gpu_load_pct": round(util.gpu, 1)
                    })

                info["GPU(s)"] = gpus
            else:
                info["GPU(s)"] = "No se detectó GPU o falta CUDA/NVIDIA driver."

        except Exception as gpu_error:
            info["GPU(s)"] = f"Error al consultar GPU: {gpu_error}"

        finally:
            try:
                pynvml.nvmlShutdown()
            except:
                pass

        return info

    except Exception as e:
        return {
            "error": f"Error al obtener información del sistema: {str(e)}"
        }