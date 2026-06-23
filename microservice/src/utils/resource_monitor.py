import threading
import psutil
import time

class ResourceMonitor:
    def __init__(self, threshold: float = 1.0, interval: float = 1.0):
        """
        threshold: porcentaje máximo de uso de CPU/RAM permitido
        interval: cada cuántos segundos chequear recursos
        """
        self.threshold = threshold
        self.interval = interval
        self._running = False
        self._thread = None

    def _monitor(self):
        while self._running:
            cpu = psutil.cpu_percent()
            ram = psutil.virtual_memory().percent
            print(f"[ResourceMonitor] CPU: {cpu}%, RAM: {ram}%")
            if cpu > self.threshold*100 or ram > self.threshold*100:
                print(f"[ResourceMonitor] ¡Alerta! Umbral excedido")
            time.sleep(self.interval)

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._monitor, daemon=True)
            self._thread.start()
            print(f"ResourceMonitor iniciado con threshold={self.threshold}")

    def stop(self):
        if self._running:
            self._running = False
            self._thread.join()
            print("ResourceMonitor detenido")
