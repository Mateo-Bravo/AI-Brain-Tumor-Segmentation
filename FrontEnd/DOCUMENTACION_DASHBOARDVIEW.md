# 📋 Documentación Técnica - DashboardView.vue

## 🏥 Sistema de Visualización Médica 3D

**Autor:** Universidad Católica de Cuenca - Posgrado  
**Versión:** 1.0.0  
**Fecha:** Octubre 2025  
**Archivo:** `src/views/dashboard/DashboardView.vue` (~22,000 líneas)

---

## 📚 Librerías y Dependencias Principales

### 🎨 Frontend Framework
- **Vue 3** (Composition API) - Framework reactivo principal
  - `ref`, `reactive`, `computed`, `watch`
  - `onMounted`, `onUnmounted`, `nextTick`
  - `markRaw` - Optimización para objetos Three.js

### 🧠 Procesamiento de Imágenes Médicas
- **nifti-reader-js** - Lectura de archivos NIfTI (.nii, .nii.gz)
- **JSZip** - Extracción de archivos comprimidos
- **pako** - Descompresión GZIP para archivos .nii.gz

### 🎮 Renderizado 3D
- **Three.js** - Motor de renderizado WebGL
  - `Scene`, `Camera`, `WebGLRenderer`
  - `OrbitControls` - Control de cámara orbital
  - Shaders personalizados (Ray Casting Volumétrico)

### 💾 Almacenamiento
- **IndexedDB** (vía `localforage`) - Persistencia local de estudios
- **Blobs** - Almacenamiento de imágenes binarias

### ⚡ Web Workers
- **Custom Workers** - Procesamiento paralelo
  - `medicalDataWorker.js` - Procesamiento de datos médicos
  - `imageProcessingWorker.js` - Filtros y mejoras de imagen
  - `aiAnalysisWorker.js` - Análisis con IA (preparado para ML)

### 🛠️ Utilidades
- **Vue Router** - Navegación entre vistas
- **Custom Composables**:
  - `useAIWorker()` - Gestión de análisis IA
  - `useImageProcessing()` - Procesamiento de imágenes
  - `useMedicalWorker()` - Operaciones médicas especializadas

---

## 🏗️ Arquitectura del Sistema

### 📐 Estructura de Componentes

```
DashboardView.vue
├── 🎯 MÓDULO DE CARGA
│   ├── handleFileUpload()          - Carga de archivos (.nii, .dcm, .zip)
│   ├── handleZipArchive()          - Procesamiento de archivos ZIP
│   ├── loadModalityFile()          - Carga de modalidades individuales
│   ├── processNIFTI()              - Procesamiento de datos NIfTI
│   └── getModalityType()           - Detección automática de modalidades
│
├── 🖼️ MÓDULO DE VISTAS NORMALES
│   ├── drawMainView()              - Renderizado vista principal
│   ├── drawAxialView()             - Vista axial (horizontal)
│   ├── drawCoronalView()           - Vista coronal (frontal)
│   ├── drawSagittalView()          - Vista sagital (lateral)
│   └── drawCrosshairs()            - Líneas de referencia cruzadas
│
├── 🎮 MÓDULO DE 4 VISTAS (QUAD VIEW)
│   ├── toggleQuadView()            - Activar/desactivar modo cuadrante
│   ├── initQuadView3D()            - Inicialización vista 3D en cuadrante
│   ├── renderQuadView3D()          - Renderizado 3D sincronizado
│   ├── coordinateThreeSystems()    - Coordinación entre sistemas 3D
│   └── cleanupQuadViews()          - Limpieza de recursos
│
├── 🌐 MÓDULO DE VISTA 3D
│   ├── initThreeJS()               - Inicialización Three.js
│   ├── createVolumeMesh3D()        - Creación de malla volumétrica
│   ├── updateVolumeShader()        - Actualización de shaders
│   ├── animate3D()                 - Loop de animación 3D
│   └── reset3DView()               - Resetear cámara y controles
│
├── 🎨 MÓDULO DE PROCESAMIENTO
│   ├── applySharpening()           - Filtro de nitidez
│   ├── applyDenoising()            - Reducción de ruido
│   ├── applyEdgeDetection()        - Detección de bordes
│   ├── applyHistogramEqualization()- Ecualización de histograma
│   └── updateImageWithWebWorkerFilters() - Aplicación con Workers
│
├── 🔧 MÓDULO DE HERRAMIENTAS
│   ├── toggleZoom()                - Activar/desactivar zoom
│   ├── handleWheelZoom()           - Zoom con rueda del mouse
│   ├── toggleMeasure()             - Herramienta de medición
│   ├── toggleCrosshairs()          - Mostrar/ocultar crosshairs
│   └── handleCrosshairDrag()       - Arrastre de crosshairs
│
└── 💾 MÓDULO DE PERSISTENCIA
    ├── savePatientStudy()          - Guardar estudio completo
    ├── saveMedicalImage()          - Guardar imagen médica
    ├── createThumbnail()           - Crear miniaturas
    └── loadSavedImage()            - Cargar estudio guardado
```

---

## 🎯 Funcionalidades Principales

### 1️⃣ SISTEMA DE VISTAS NORMALES

#### 📊 Características
- **Vista Única Principal**: Muestra una modalidad a la vez
- **3 Planos Anatómicos**:
  - 🔵 **Axial** (Horizontal) - Corte transversal
  - 🟢 **Coronal** (Frontal) - Corte frontal
  - 🔴 **Sagital** (Lateral) - Corte lateral
  
#### 🛠️ Funciones Clave

```javascript
// Renderizado principal de vistas 2D
function drawMainView() {
  // 1. Obtener canvas y contexto
  // 2. Aplicar zoom y transformaciones
  // 3. Extraer slice según orientación
  // 4. Aplicar window/level
  // 5. Dibujar crosshairs si están activos
  // 6. Dibujar mediciones si existen
}

// Navegación de slices
function handleSliceNavigation(event) {
  // - Rueda del mouse: cambiar slice
  // - Validación de límites (0 - depth/height/width)
  // - Notificación visual del cambio
  // - Actualización automática de display
}

// Control de zoom focal
function handleWheelZoom(event) {
  // - Zoom centrado en posición del mouse
  // - Rango: 0.5x - 10x
  // - Mantiene punto focal durante zoom
}
```

#### 🎨 Crosshairs Personalizables
```javascript
const crosshairPositions = reactive({
  axial: { x: 0.5, y: 0.5 },    // Posiciones en porcentaje
  coronal: { x: 0.5, y: 0.5 },
  sagittal: { x: 0.5, y: 0.5 }
})

// Arrastre de crosshairs con Ctrl+Click
function handleCrosshairDragMove(event, viewType) {
  // - Detectar Ctrl+Click
  // - Calcular posición relativa (0.0 - 1.0)
  // - Actualizar posición del crosshair
  // - Redibujar vista en tiempo real
}
```

---

### 2️⃣ SISTEMA DE 4 VISTAS (QUAD VIEW)

#### 📊 Características
- **4 Canvas Independientes**:
  1. 🔵 Vista Axial (superior izquierda)
  2. 🟢 Vista Coronal (superior derecha)
  3. 🔴 Vista Sagital (inferior izquierda)
  4. 🌐 Vista 3D (inferior derecha)

#### 🔄 Sincronización
- **Crosshairs Interactivos**: Sincronizados entre las 3 vistas 2D
- **Navegación Independiente**: Cada vista puede navegar sus slices
- **Zoom Individual**: Cada cuadrante mantiene su nivel de zoom
- **Vista 3D Integrada**: Renderizado volumétrico en tiempo real

#### 🛠️ Funciones Clave

```javascript
// Activación del modo 4 vistas
async function toggleQuadView() {
  if (!quadViewActive.value) {
    // ACTIVAR
    quadViewActive.value = true
    await nextTick()
    
    // 1. Auto-activar modo maximizado
    if (!allCollapsed.value) {
      handleActivateMaximized()
    }
    
    // 2. Renderizar vistas 2D
    await Promise.all([
      drawAxialView(),
      drawCoronalView(),
      drawSagittalView()
    ])
    
    // 3. Inicializar vista 3D
    await initQuadView3D()
    
  } else {
    // DESACTIVAR
    cleanupQuadViews()
    quadViewActive.value = false
    
    // Auto-desactivar modo maximizado
    if (allCollapsed.value) {
      toggleCenterExpansion()
    }
  }
}

// Inicialización de vista 3D en cuadrante
function initQuadView3D() {
  // 1. Verificar canvas disponible
  // 2. Crear renderer independiente
  // 3. Crear escena y cámara dedicadas
  // 4. Copiar volumeMesh desde vista 3D principal
  // 5. Configurar controles OrbitControls
  // 6. Iniciar loop de animación
}

// Coordinación entre sistemas 3D
function coordinateThreeSystems() {
  // Sincroniza:
  // - Renderer principal (vista 3D completa)
  // - Renderer de cuadrante (vista 3D en quad)
  // - Previene conflictos de recursos
  // - Optimiza rendimiento
}
```

#### ⚡ Optimizaciones
- **LOD Adaptativo**: Ajusta calidad según distancia de cámara
- **Debounce**: Evita renderizados excesivos
- **Cleanup**: Liberación automática de recursos WebGL
- **Canvas Pool**: Reutilización de contextos 2D

---

### 3️⃣ SISTEMA DE VISTA 3D (RENDERIZADO VOLUMÉTRICO)

#### 🎨 Tecnología
- **Ray Casting Volumétrico**: Técnica de renderizado directo de volumen
- **Shaders GLSL**: Procesamiento en GPU
- **Transfer Functions**: Mapeo de densidades a colores
- **Adaptive Steps**: Calidad dinámica según zoom

#### 📊 Características
- **Rotación 360°**: Control orbital completo
- **Zoom Dinámico**: Ajuste de distancia de cámara
- **Colores Personalizables**: 6 presets + colores custom
- **Clipping Planes**: Corte selectivo en X, Y, Z
- **Brightness/Contrast**: Ajuste en tiempo real
- **Opacity Control**: Transparencia volumétrica

#### 🛠️ Funciones Clave

```javascript
// Inicialización de Three.js
function initThreeJS() {
  // 1. Crear renderer WebGL
  renderer = new THREE.WebGLRenderer({
    canvas: threeCanvas.value,
    antialias: true,
    alpha: true
  })
  
  // 2. Crear escena
  scene = new THREE.Scene()
  
  // 3. Configurar cámara perspectiva
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
  camera.position.set(0, 0, 3)
  
  // 4. Añadir controles orbitales
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
}

// Creación de malla volumétrica
function createVolumeMesh3D() {
  // 1. Crear textura 3D desde volumeData
  volumeTexture = new THREE.DataTexture3D(
    volumeData,
    width, height, depth
  )
  
  // 2. Crear geometría (cubo unitario)
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  
  // 3. Crear material con shader personalizado
  const material = new THREE.ShaderMaterial({
    uniforms: {
      volumeTexture: { value: volumeTexture },
      steps: { value: adaptiveSteps.value },
      opacity: { value: opacity3D.value },
      threshold: { value: threshold3D.value },
      brightness: { value: brightness3D.value },
      contrast: { value: contrast3D.value },
      lowColor: { value: lowColor.value },
      midColor: { value: midColor.value },
      highColor: { value: highColor.value },
      clipping: { value: new THREE.Vector3(
        clippingX.value,
        clippingY.value,
        clippingZ.value
      )}
    },
    vertexShader: volumeVertexShader,
    fragmentShader: volumeFragmentShader,
    side: THREE.BackSide,
    transparent: true
  })
  
  // 4. Crear mesh y añadir a escena
  volumeMesh = new THREE.Mesh(geometry, material)
  scene.add(volumeMesh)
}

// Loop de animación 3D
function animate3D() {
  animationId = requestAnimationFrame(animate3D)
  
  // 1. Actualizar controles
  if (controls) controls.update()
  
  // 2. Actualizar steps adaptativos
  updateAdaptiveSteps()
  
  // 3. Renderizar escena
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
  
  // 4. Actualizar FPS counter
  updatePerformanceMetrics()
}

// Sistema de Steps Adaptativos (LOD)
function updateAdaptiveSteps() {
  if (!zoomStepsEnabled.value) return
  
  const distance = camera.position.distanceTo(volumeMesh.position)
  
  // Normalizar distancia (0 = cerca, 1 = lejos)
  const normalized = (distance - minZoomDistance.value) / 
                     (maxZoomDistance.value - minZoomDistance.value)
  
  const zoomFactor = 1 - normalized
  
  // Interpolar steps: cerca = más steps (mejor calidad)
  const targetSteps = Math.round(
    minStepsZoom.value + zoomFactor * 
    (maxStepsZoom.value - minStepsZoom.value)
  )
  
  // Suavizado para evitar saltos bruscos
  currentSmoothedSteps.value += 
    (targetSteps - currentSmoothedSteps.value) * 0.1
  
  // Actualizar shader
  if (volumeMesh?.material?.uniforms) {
    volumeMesh.material.uniforms.steps.value = 
      Math.round(currentSmoothedSteps.value)
  }
}
```

#### 🎨 Presets de Color

```javascript
const colorPresets = [
  {
    name: 'Médico Clásico',
    colors: { 
      low: [0, 0, 1],      // Azul
      mid: [0, 1, 0],      // Verde
      high: [1, 0, 0]      // Rojo
    }
  },
  {
    name: 'Escala de Grises',
    colors: { 
      low: [0, 0, 0],      // Negro
      mid: [0.5, 0.5, 0.5], // Gris
      high: [1, 1, 1]      // Blanco
    }
  },
  {
    name: 'Térmico',
    colors: { 
      low: [0, 0, 0],      // Negro
      mid: [1, 0, 0],      // Rojo
      high: [1, 1, 0]      // Amarillo
    }
  },
  // ... 3 presets adicionales
]
```

---

## 🎨 Sistema de Procesamiento de Imágenes

### ⚡ Web Workers (Procesamiento Paralelo)

#### 🛠️ Filtros Disponibles

```javascript
const webWorkerSettings = reactive({
  // 1. Nitidez (Sharpening)
  sharpening: {
    enabled: false,
    strength: 1.0,    // 0.0 - 3.0
    radius: 1.0       // 0.5 - 3.0
  },
  
  // 2. Reducción de Ruido (Denoising)
  denoising: {
    enabled: false,
    strength: 0.5,    // 0.0 - 1.0
    threshold: 10     // 0 - 50
  },
  
  // 3. Detección de Bordes
  edgeDetection: {
    enabled: false,
    threshold: 100,   // 0 - 255
    method: 'sobel'   // 'sobel' | 'canny' | 'laplacian'
  },
  
  // 4. Mejora Médica (Específico para imágenes médicas)
  medicalEnhancement: {
    enabled: false,
    preset: 'brain',  // 'brain' | 'bone' | 'soft_tissue'
    contrast: 1.2,    // 0.5 - 2.0
    brightness: 0.1   // -1.0 - 1.0
  },
  
  // 5. Ecualización de Histograma
  histogramEqualization: {
    enabled: false
  }
})
```

#### 🔄 Aplicación de Filtros

```javascript
async function updateImageWithWebWorkerFilters() {
  // 1. Verificar si hay filtros activos
  const hasActiveFilters = Object.values(webWorkerSettings)
    .some(setting => setting.enabled)
  
  if (!hasActiveFilters) {
    restoreOriginalImage()
    return
  }
  
  // 2. Guardar imagen original (si no existe)
  if (!originalImagesByView.value[viewType]) {
    saveOriginalImageForView(viewType)
  }
  
  // 3. Obtener ImageData del canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  
  // 4. Enviar a Web Worker para procesamiento
  const processedData = await imageProcessingWorker.applyFilters(
    imageData,
    webWorkerSettings
  )
  
  // 5. Actualizar canvas con resultado
  ctx.putImageData(processedData, 0, 0)
}
```

---

## 💾 Sistema de Persistencia

### 🗄️ IndexedDB Storage

```javascript
const DB_NAME = '3DViewerDB'
const STORE_NAME = 'patientImages'

// Estructura de datos guardados
{
  studyId: 'unique-id',
  patientData: {
    name: string,
    age: number,
    gender: string,
    medicalHistory: string
  },
  modality: 'T1N' | 'T1C' | 'T2W' | 'T2F',
  imageBlob: Blob,          // Imagen procesada
  thumbnail: Blob,          // Miniatura 200x200
  metadata: {
    dimensions: [width, height, depth],
    pixelSpacing: [x, y, z],
    orientation: string,
    timestamp: Date
  },
  measurements: Array,      // Mediciones guardadas
  appliedFilters: Object    // Filtros aplicados
}
```

### 💾 Funciones de Guardado

```javascript
// Guardar estudio completo
async function savePatientStudy() {
  // 1. Validar datos del paciente
  // 2. Generar ID único
  // 3. Crear thumbnail
  // 4. Capturar estado actual (modalidad, filtros, etc.)
  // 5. Guardar en IndexedDB
  // 6. Notificar éxito/error
}

// Crear miniatura
function createThumbnail(canvas) {
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = 200
  thumbCanvas.height = 200
  
  const ctx = thumbCanvas.getContext('2d')
  ctx.drawImage(canvas, 0, 0, 200, 200)
  
  return thumbCanvas.toDataURL('image/png')
}
```

---

## 🔧 Herramientas Interactivas

### 📏 Sistema de Mediciones

```javascript
const measurements = ref([])

// Estructura de medición
{
  view: 'axial' | 'coronal' | 'sagittal',
  slice: number,
  points: [
    { x: number, y: number },  // Punto inicial
    { x: number, y: number }   // Punto final
  ],
  distancePx: number,           // Distancia en píxeles
  distanceMm: number,           // Distancia en milímetros
  timestamp: Date
}

// Calcular distancia física
function calculatePhysicalDistance(dx, dy, pixDims) {
  const dxMm = dx * pixDims[0]
  const dyMm = dy * pixDims[1]
  return Math.sqrt(dxMm * dxMm + dyMm * dyMm)
}
```

### 🔍 Sistema de Zoom

```javascript
// Zoom focal (centrado en mouse)
function handleWheelZoom(event) {
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  // Calcular nuevo zoom
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.5, Math.min(10, zoomLevel.value * delta))
  
  // Ajustar translación para mantener punto focal
  const scaleChange = newZoom / zoomLevel.value
  zoomTranslate.value.x = mouseX - (mouseX - zoomTranslate.value.x) * scaleChange
  zoomTranslate.value.y = mouseY - (mouseY - zoomTranslate.value.y) * scaleChange
  
  zoomLevel.value = newZoom
  updateDisplay()
}
```

---

## 📊 Formato de Archivos Soportados

### 📁 NIfTI (Neuroimaging Informatics Technology Initiative)

#### Extensiones
- `.nii` - NIfTI sin comprimir
- `.nii.gz` - NIfTI comprimido con GZIP

#### Tipos de Datos Soportados
| Código | Tipo | Uso |
|--------|------|-----|
| 2 | Uint8 | Imágenes de 8 bits |
| 4 | Int16 | Imágenes médicas estándar (BRATS) |
| 8 | Int32 | Imágenes de 32 bits enteros |
| 16 | Float32 | Imágenes con valores flotantes |
| 64 | Float64 | Doble precisión |
| 512 | Uint16 | 16 bits sin signo |

#### Modalidades Médicas Reconocidas
```javascript
// Patrones BraTS estándar
-t1n.nii    → T1 Native (sin contraste)
-t1c.nii    → T1 Contrast (con contraste)
-t2w.nii    → T2 Weighted
-t2f.nii    → T2 FLAIR
-seg.nii    → Segmentación

// Patrones BraTS-GLI
_t1.nii     → T1 Native
_t1ce.nii   → T1 Contrast Enhanced
_t2.nii     → T2 Weighted
_flair.nii  → FLAIR
_seg.nii    → Segmentación

// Fallback
*.nii       → T1N (por defecto para nombres genéricos)
```

### 📦 ZIP Archives
- **Extracción automática** de archivos .nii/.nii.gz
- **Agrupación por caso** (BraTS-GLI-XXXXX-XXX)
- **Detección automática** de modalidades

### 🏥 DICOM (preparado, no implementado)
- `.dcm` - Digital Imaging and Communications in Medicine

---

## ⚡ Optimizaciones de Rendimiento

### 🚀 Técnicas Implementadas

#### 1. Canvas Pool
```javascript
const canvasPool = {
  pool: [],
  maxSize: 5,
  
  acquire() {
    return this.pool.pop() || document.createElement('canvas')
  },
  
  release(canvas) {
    if (this.pool.length < this.maxSize) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      this.pool.push(canvas)
    }
  }
}
```

#### 2. Render Debouncing
```javascript
const renderDebounce = {
  timeout: null,
  delay: 16, // ~60fps
  
  schedule(callback) {
    if (this.timeout) clearTimeout(this.timeout)
    this.timeout = setTimeout(callback, this.delay)
  }
}
```

#### 3. LOD Adaptativo (Level of Detail)
- **Zoom Out**: Menos steps → Mayor velocidad
- **Zoom In**: Más steps → Mayor calidad
- **Transición Suave**: Interpolación gradual de steps
- **Rango**: 128 steps (lejano) - 1024 steps (cercano)

#### 4. Web Workers
- **Procesamiento paralelo** de filtros de imagen
- **No bloquea UI** durante operaciones pesadas
- **Múltiples workers** para diferentes tareas

#### 5. Cleanup Automático
```javascript
function cleanupQuadViews() {
  // Liberar renderer
  if (renderer3DQuad.value) {
    renderer3DQuad.value.dispose()
    renderer3DQuad.value = null
  }
  
  // Liberar texturas
  if (volumeTexture) {
    volumeTexture.dispose()
    volumeTexture = null
  }
  
  // Liberar materiales
  if (volumeMesh?.material) {
    volumeMesh.material.dispose()
  }
  
  // Liberar geometrías
  if (volumeMesh?.geometry) {
    volumeMesh.geometry.dispose()
  }
}
```

---

## 🎮 Controles y Atajos de Teclado

### ⌨️ Shortcuts Principales

| Tecla | Acción | Contexto |
|-------|--------|----------|
| `F11` | Pantalla completa | Global |
| `R` | Reset zoom | Vista con zoom activo |
| `Q` | Toggle 4 vistas | Con imagen cargada |
| `C` | Toggle crosshairs | Vistas 2D |
| `M` | Toggle mediciones | Vistas 2D |
| `Z` | Toggle zoom | Vistas 2D |
| `Ctrl + Click` | Arrastrar crosshair | Vistas 2D |
| `Mouse Wheel` | Navegar slices / Zoom | Según modo activo |
| `Click + Arrastrar` | Rotar 3D | Vista 3D |
| `Right Click + Arrastrar` | Pan 3D | Vista 3D |

---

## 🐛 Manejo de Errores y Edge Cases

### 🛡️ Validaciones Implementadas

#### Archivos Problemáticos
```javascript
// Detección de archivos float32 con problemas
if (datatypeCode === 16) {
  // Corregir NaN e infinitos
  let nanCount = 0
  for (let i = 0; i < imageArray.length; i++) {
    if (isNaN(imageArray[i]) || !isFinite(imageArray[i])) {
      imageArray[i] = 0
      nanCount++
    }
  }
  
  if (nanCount > imageArray.length * 0.01) {
    hasProblematicData.value = true
    console.warn('Archivo con datos inválidos detectado')
  }
}
```

#### Orientación Automática
```javascript
// Detección y corrección de orientación
function detectNiftiOrientation(header) {
  // 1. Intentar leer qform/sform
  // 2. Analizar códigos de transformación
  // 3. Calcular orientación (RAS, LPS, etc.)
  // 4. Determinar si necesita corrección
  
  return {
    orientation: 'RAS',
    needsCorrection: true,
    method: 'qform',
    confidence: 'high'
  }
}
```

#### Límites de Slices
```javascript
function validateSliceIndex(slice, max) {
  return Math.max(0, Math.min(max - 1, slice))
}
```

---

## 📈 Métricas de Rendimiento

### 📊 Monitoreo Implementado

```javascript
const performanceInfo3D = ref({
  fps: 0,           // Frames por segundo
  memoryMB: 0,      // Memoria usada (MB)
  renderTime: 0,    // Tiempo de renderizado (ms)
  steps: 0          // Steps actuales de ray casting
})

function updatePerformanceMetrics() {
  const now = performance.now()
  frameCount++
  
  if (now >= lastTime + 1000) {
    performanceInfo3D.value.fps = Math.round(
      frameCount * 1000 / (now - lastTime)
    )
    frameCount = 0
    lastTime = now
    
    // Memoria (si está disponible)
    if (performance.memory) {
      performanceInfo3D.value.memoryMB = Math.round(
        performance.memory.usedJSHeapSize / (1024 * 1024)
      )
    }
  }
}
```

---

## 🔮 Características Futuras (Preparadas)

### 🤖 Integración con IA (Estructura lista)

```javascript
// Variables para segmentación IA
const showIASegmentation3D = ref(false)
const aiSegmentationOpacity = ref(0.7)
const aiAnalysisResults = ref({
  tumorVolume: 0,
  tumorPosition: { x: 0, y: 0, z: 0 },
  confidence: 0,
  findings: []
})

// Colores para diferentes tipos de tumores
const aiSegmentationColors = ref({
  tumor: new THREE.Vector3(1.0, 0.2, 0.2),      // Rojo
  edema: new THREE.Vector3(1.0, 0.8, 0.0),      // Amarillo
  necrosis: new THREE.Vector3(0.8, 0.0, 0.8),   // Magenta
  enhancing: new THREE.Vector3(0.0, 1.0, 0.5)   // Verde
})
```

---

## 📝 Conclusiones

### ✅ Fortalezas del Sistema
1. **Arquitectura Modular**: Separación clara de responsabilidades
2. **Optimización Avanzada**: LOD, Web Workers, Canvas Pool
3. **Flexibilidad**: Soporte múltiples formatos y modalidades
4. **Experiencia de Usuario**: Controles intuitivos y feedback visual
5. **Escalabilidad**: Preparado para integración con IA

### 🎯 Casos de Uso
- **Diagnóstico Médico**: Visualización de resonancias magnéticas
- **Planificación Quirúrgica**: Mediciones precisas pre-operatorias
- **Investigación**: Análisis de datos médicos volumétricos
- **Educación**: Herramienta didáctica para estudiantes de medicina

### 📊 Estadísticas del Código
- **Líneas de código**: ~22,000
- **Funciones principales**: ~150+
- **Componentes reactivos**: ~80+
- **Shaders GLSL**: 2 (vertex + fragment)
- **Web Workers**: 3

---

**Documentación generada**: Octubre 2025  
**Universidad Católica de Cuenca** - Posgrado en Tecnologías de la Información  
**Versión**: 1.0.0
