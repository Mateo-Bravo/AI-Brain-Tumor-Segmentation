# Sistema Web Worker para Procesamiento Médico

## Descripción General

Este sistema implementa Web Workers para procesamiento de archivos médicos en segundo plano, evitando el bloqueo de la interfaz de usuario durante operaciones intensivas como:

- Procesamiento de archivos NIfTI (.nii, .nii.gz)
- Extracción y procesamiento de archivos ZIP
- Normalización de datos volumétricos
- Corrección de orientación de imágenes médicas

## Arquitectura del Sistema

### 1. Web Worker (`src/workers/medicalDataWorker.js`)

**Funcionalidades principales:**

- **Parseo NIfTI**: Procesa archivos de imagen médica en formato NIfTI
- **Extracción ZIP**: Maneja archivos comprimidos que contienen múltiples modalidades
- **Normalización**: Optimiza datos volumétricos para visualización
- **Progreso en tiempo real**: Reporta el estado del procesamiento

**Características técnicas:**

- Soporte para descompresión con pako (archivos .gz)
- Manejo de errores robusto
- Sistema de progreso con callbacks
- Procesamiento asíncrono sin bloqueo

### 2. Composable Vue (`src/composables/useMedicalWorker.js`)

**API reactiva:**

```javascript
const {
  isWorkerReady, // Estado del worker
  isProcessing, // Indicador de procesamiento activo
  processingProgress, // Progreso actual (0-100)
  processingMessage, // Mensaje descriptivo
  processNiftiFile, // Procesar archivo NIfTI
  processZipFile, // Procesar archivo ZIP
  getTaskResult, // Obtener resultados de tarea
} = useMedicalWorker()
```

**Gestión de estado:**

- Estado reactivo con Vue 3 Composition API
- Historial de tareas ejecutadas
- Callbacks de éxito y error personalizables
- Limpieza automática de recursos

### 3. Integración en el Dashboard

**Procesamiento híbrido:**

- **Worker disponible**: Procesamiento en background con indicadores de progreso
- **Fallback tradicional**: Procesamiento síncrono si el worker falla
- **Compatibilidad**: Mantiene toda la funcionalidad existente

## Flujo de Procesamiento

### Archivo NIfTI Individual

1. Usuario selecciona modalidad
2. Sistema verifica disponibilidad del worker
3. **Con Worker**:
   - Envía archivo al worker
   - Muestra progreso en tiempo real
   - Procesa resultado al completar
4. **Sin Worker**: Procesamiento tradicional directo

### Archivo ZIP (Múltiples Modalidades)

1. Usuario carga archivo ZIP
2. **Con Worker**:
   - Extracción paralela en background
   - Progreso de extracción visible
   - Procesamiento de cada modalidad extraída
3. **Sin Worker**: Extracción secuencial tradicional

## Beneficios del Sistema

### Rendimiento

- **No bloqueo de UI**: La interfaz permanece responsiva
- **Procesamiento paralelo**: Múltiples tareas simultáneas
- **Memoria optimizada**: Gestión eficiente de recursos

### Experiencia de Usuario

- **Indicadores visuales**: Progreso y estado en tiempo real
- **Feedback inmediato**: Mensajes descriptivos del progreso
- **Compatibilidad garantizada**: Fallback automático

### Escalabilidad

- **Arquitectura modular**: Fácil extensión de funcionalidades
- **Gestión de tareas**: Sistema de colas para múltiples operaciones
- **Monitoreo**: Estadísticas y logs de rendimiento

## Implementación Visual

### Indicador de Progreso

```vue
<div v-if="isProcessing" class="worker-progress">
  <div class="progress-text">
    <span>{{ processingMessage }}</span>
    <span>{{ processingProgress }}%</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
  </div>
  <div class="worker-status">
    <svg class="spinner">...</svg>
    Web Worker procesando...
  </div>
</div>
```

### Estilos CSS

- **Verde**: Indica procesamiento del worker (diferente del rojo de upload)
- **Spinner animado**: Feedback visual de actividad
- **Transiciones suaves**: Progress bar con animaciones fluidas

## Compatibilidad y Fallbacks

### Detección de Capacidades

```javascript
if (isWorkerReady.value && modality.originalFile) {
  // Usar Web Worker
} else {
  // Procesamiento tradicional
}
```

### Manejo de Errores

- Worker no disponible → Fallback automático
- Error de procesamiento → Recuperación graceful
- Timeout de operación → Cancelación y limpieza

## Futuras Mejoras

### Funcionalidades Pendientes

- [ ] Cache de resultados procesados
- [ ] Compresión de datos en tránsito
- [ ] Procesamiento incremental de volúmenes grandes
- [ ] Múltiples workers para procesamiento paralelo

### Optimizaciones

- [ ] Transferable Objects para mejor rendimiento
- [ ] Web Assembly para operaciones matemáticas complejas
- [ ] Service Worker para persistencia offline

## Uso y Configuración

### Requisitos

- Navegador moderno con soporte Web Workers
- Conexión a CDN para librerías (pako)
- Vue 3 con Composition API

### Configuración

```javascript
// Configuración automática al importar el composable
import { useMedicalWorker } from '@/composables/useMedicalWorker'
```

### Monitoreo

```javascript
// Obtener estadísticas del worker
const stats = getWorkerStats()
console.log('Tareas completadas:', stats.completedTasks)
```

---

**Nota**: Este sistema mejora significativamente la experiencia de usuario al procesar archivos médicos grandes, manteniendo la interfaz responsiva y proporcionando feedback visual del progreso en tiempo real.
