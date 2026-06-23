# src/monitoring/request_tracker.py

import threading

class RequestTracker:
    """
    Contador de solicitudes activas por microservicio.
    Permite incrementar y decrementar.
    Thread-safe usando Lock.
    """
    def __init__(self):
        self.counts = {}
        self.lock = threading.Lock()

    def increment(self, key: str):
        """Incrementa el contador para un servicio"""
        with self.lock:
            self.counts[key] = self.counts.get(key, 0) + 1

    def decrement(self, key: str):
        """Decrementa el contador para un servicio"""
        with self.lock:
            if key in self.counts:
                self.counts[key] = max(0, self.counts[key] - 1)

    def get_count(self, key: str) -> int:
        """Retorna el número de solicitudes activas"""
        with self.lock:
            return self.counts.get(key, 0)

# Singleton listo para usar en todo el proyecto
request_tracker = RequestTracker()
