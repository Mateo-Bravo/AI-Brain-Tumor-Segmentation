# 🤝 Contribuir al Backend

API REST para diagnóstico médico con IA. Backend consume microservicios de modelos desarrollados por tesistas.

---

## 👥 Equipo

- **Tech Lead:** Richard Guaman
- **Tesistas:** Microservicios de modelos IA
- **Colaboradores:** Desarrolladores backend

---

## 🔄 Workflow

```bash
# Crear rama
git checkout develop
git checkout -b feature/nueva-funcionalidad

# Desarrollar
git add .
git commit -m "feat: agregar nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# Crear Merge Request hacia develop
```

### Convenciones commits

- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `docs:` documentación
- `test:` pruebas

---

## 🔗 Microservicios IA

El tesistas deben implementar:

```http
POST /model/predict       # Predicción del modelo
GET  /model/health        # Estado del servicio
```

El backend consume estos servicios desde `app/services/ai_service.py`

---

## 📋 Code Review

- [ ] Código sigue estándares Python/FastAPI
- [ ] Pruebas incluidas y pasan
- [ ] Integración con microservicios funciona
- [ ] Validaciones de seguridad implementadas

---
