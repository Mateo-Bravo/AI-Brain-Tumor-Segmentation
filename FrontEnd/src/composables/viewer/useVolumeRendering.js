// composables/viewer/useVolumeRendering.js
import { computed, reactive } from 'vue'

/**
 * 🧊 Composable para manejo de datos volumétricos y renderizado 3D
 *
 * Centraliza toda la información del volumen médico (DICOM/NIfTI):
 * - Datos del volumen y dimensiones
 * - Slices actuales para cada vista
 * - Configuración de window/level
 * - Funciones de procesamiento y renderizado
 */
export function useVolumeRendering() {
  // ============================================
  // 📊 DATOS VOLUMÉTRICOS PRINCIPALES
  // ============================================

  /**
   * Datos volumétricos brutos (Float32Array o similar)
   * Contiene los valores de intensidad de cada vóxel del volumen 3D
   */
  let volumeData = null

  /**
   * Dimensiones del volumen
   * - width: Ancho (eje X)
   * - height: Alto (eje Y)
   * - depth: Profundidad (eje Z)
   */
  let width = 0
  let height = 0
  let depth = 0

  /**
   * Rango de valores originales en los datos
   * - originalDataMin: Valor mínimo en el volumen original
   * - originalDataMax: Valor máximo en el volumen original
   */
  let originalDataMin = 0
  let originalDataMax = 255

  // ============================================
  // 🎚️ SLICES ACTUALES (CORTES 2D)
  // ============================================

  /**
   * Índices de los slices actuales para cada vista
   * - axial: Slice horizontal (vista desde arriba)
   * - coronal: Slice frontal (vista de frente)
   * - sagittal: Slice lateral (vista de lado)
   */
  const currentSlices = reactive({
    axial: 0,
    coronal: 0,
    sagittal: 0
  })

  // ============================================
  // 🌗 WINDOW/LEVEL (BRILLO Y CONTRASTE)
  // ============================================

  /**
   * Configuración de ventana y nivel para visualización
   * - window: Rango de intensidades visibles (contraste)
   * - level: Punto central del rango (brillo)
   *
   * Similar a los controles de Window/Level en visores DICOM profesionales
   */
  const windowLevel = reactive({
    window: 255,  // Rango de valores visibles
    level: 128    // Centro del rango
  })

  // ============================================
  // 📋 METADATOS DEL VOLUMEN
  // ============================================

  /**
   * Información sobre el tipo de datos cargado
   */
  const volumeMetadata = reactive({
    dataType: '',           // 'uint8', 'uint16', 'int16', 'float32', etc.
    modalityType: 't1n',    // 't1n', 't2', 'flair', etc.
    isNormalized: false,    // Si los datos fueron normalizados
    hasIssues: false,       // Si se detectaron problemas
    issueType: '',          // Tipo de problema detectado
    patientName: '',        // Nombre del paciente
    studyDate: '',          // Fecha del estudio
    description: ''         // Descripción adicional
  })

  /**
   * Estado de carga del volumen
   */
  const volumeLoadingState = reactive({
    isLoading: false,
    progress: 0,
    message: '',
    error: null
  })

  // ============================================
  // 💡 COMPUTED - PROPIEDADES DERIVADAS
  // ============================================

  /**
   * Indica si hay datos volumétricos cargados
   */
  const hasVolumeData = computed(() => {
    return volumeData !== null && width > 0 && height > 0 && depth > 0
  })

  /**
   * Número total de vóxeles en el volumen
   */
  const totalVoxels = computed(() => {
    return width * height * depth
  })

  /**
   * Tamaño aproximado en memoria (MB)
   */
  const volumeSizeInMB = computed(() => {
    if (!volumeData) return 0
    const bytesPerVoxel = volumeData.BYTES_PER_ELEMENT || 4
    const totalBytes = totalVoxels.value * bytesPerVoxel
    return (totalBytes / (1024 * 1024)).toFixed(2)
  })

  /**
   * Slice central para cada vista (punto de inicio recomendado)
   */
  const centerSlices = computed(() => {
    return {
      axial: Math.floor(depth / 2),
      coronal: Math.floor(height / 2),
      sagittal: Math.floor(width / 2)
    }
  })

  /**
   * Límites de slices para cada vista
   */
  const sliceLimits = computed(() => {
    return {
      axial: { min: 0, max: depth - 1 },
      coronal: { min: 0, max: height - 1 },
      sagittal: { min: 0, max: width - 1 }
    }
  })

  /**
   * Información del rango actual de window/level
   */
  const windowLevelRange = computed(() => {
    const half = windowLevel.window / 2
    return {
      min: windowLevel.level - half,
      max: windowLevel.level + half,
      center: windowLevel.level
    }
  })

  // ============================================
  // 🔧 FUNCIONES DE CARGA Y CONFIGURACIÓN
  // ============================================

  /**
   * Carga un nuevo volumen de datos
   *
   * @param {TypedArray} data - Datos volumétricos (Float32Array, Uint16Array, etc.)
   * @param {number} w - Ancho del volumen
   * @param {number} h - Alto del volumen
   * @param {number} d - Profundidad del volumen
   * @param {Object} metadata - Metadatos opcionales del volumen
   */
  function loadVolumeData(data, w, h, d, metadata = {}) {
    console.log('🧊 Cargando datos volumétricos...')

    volumeLoadingState.isLoading = true
    volumeLoadingState.progress = 0
    volumeLoadingState.message = 'Inicializando volumen...'
    volumeLoadingState.error = null

    try {
      // Validar datos
      if (!data || w <= 0 || h <= 0 || d <= 0) {
        throw new Error('Datos o dimensiones inválidas')
      }

      // Asignar datos
      volumeData = data
      width = w
      height = h
      depth = d

      volumeLoadingState.progress = 30
      volumeLoadingState.message = 'Calculando estadísticas...'

      // Calcular rango de datos
      calculateDataRange()

      volumeLoadingState.progress = 60
      volumeLoadingState.message = 'Configurando window/level...'

      // Configurar window/level inicial
      configureInitialWindowLevel(metadata.dataType)

      volumeLoadingState.progress = 80
      volumeLoadingState.message = 'Inicializando slices...'

      // Inicializar slices al centro
      resetSlicesToCenter()

      // Guardar metadatos
      if (metadata) {
        Object.assign(volumeMetadata, metadata)
      }

      volumeLoadingState.progress = 100
      volumeLoadingState.message = 'Volumen cargado exitosamente'
      volumeLoadingState.isLoading = false

      console.log('✅ Volumen cargado:', {
        dimensions: `${width}x${height}x${depth}`,
        voxels: totalVoxels.value.toLocaleString(),
        size: `${volumeSizeInMB.value} MB`,
        dataRange: `${originalDataMin} - ${originalDataMax}`,
        windowLevel: { ...windowLevel }
      })

      return true

    } catch (error) {
      console.error('❌ Error cargando volumen:', error)
      volumeLoadingState.error = error.message
      volumeLoadingState.isLoading = false
      return false
    }
  }

  /**
   * Calcula el rango mínimo y máximo de los datos volumétricos
   */
  function calculateDataRange() {
    if (!volumeData) return

    let min = Infinity
    let max = -Infinity

    // Muestreo para volúmenes muy grandes (cada 100 vóxeles)
    const sampleRate = totalVoxels.value > 1000000 ? 100 : 1

    for (let i = 0; i < volumeData.length; i += sampleRate) {
      const value = volumeData[i]
      if (value < min) min = value
      if (value > max) max = value
    }

    originalDataMin = min
    originalDataMax = max

    console.log('📊 Rango de datos calculado:', { min, max })
  }

  /**
   * Configura window/level inicial según el tipo de dato
   *
   * @param {string} dataType - Tipo de dato ('uint8', 'uint16', 'int16', 'float32', etc.)
   */
  function configureInitialWindowLevel(dataType = 'uint8') {
    console.log(`🔧 Configurando window/level para datatype: ${dataType}`)

    // Los datos ya vienen normalizados a 0-255, independientemente del tipo original
    windowLevel.window = 255
    windowLevel.level = 128

    console.log(`📊 Window/Level configurado: window=${windowLevel.window}, level=${windowLevel.level}`)
  }

  /**
   * Resetea los slices a sus posiciones centrales
   */
  function resetSlicesToCenter() {
    currentSlices.axial = centerSlices.value.axial
    currentSlices.coronal = centerSlices.value.coronal
    currentSlices.sagittal = centerSlices.value.sagittal

    console.log('🎯 Slices reseteados al centro:', { ...currentSlices })
  }

  /**
   * Limpia los datos volumétricos y libera memoria
   */
  function clearVolumeData() {
    console.log('🧹 Limpiando datos volumétricos...')

    volumeData = null
    width = 0
    height = 0
    depth = 0
    originalDataMin = 0
    originalDataMax = 255

    currentSlices.axial = 0
    currentSlices.coronal = 0
    currentSlices.sagittal = 0

    windowLevel.window = 255
    windowLevel.level = 128

    volumeMetadata.dataType = ''
    volumeMetadata.modalityType = 't1n'
    volumeMetadata.isNormalized = false
    volumeMetadata.hasIssues = false
    volumeMetadata.issueType = ''

    console.log('✅ Datos volumétricos limpiados')
  }

  // ============================================
  // 🎚️ FUNCIONES DE WINDOW/LEVEL
  // ============================================

  /**
   * Aplica window/level a un valor de intensidad
   * Convierte el valor original a un valor de 0-255 para visualización
   *
   * @param {number} value - Valor de intensidad original
   * @returns {number} - Valor mapeado a rango 0-255
   */
  function applyWindowLevel(value) {
    const half = windowLevel.window / 2
    const min = windowLevel.level - half
    const max = windowLevel.level + half

    // Fuera del rango visible
    if (value <= min) return 0
    if (value >= max) return 255

    // CORRECCIÓN ESPECIAL PARA DATOS FLOAT32 NORMALIZADOS
    if (windowLevel.window < 1) {
      const normalized = Math.max(0, Math.min(1, (value - min) / windowLevel.window))
      return Math.round(normalized * 255)
    }

    // Mapeo lineal dentro del rango
    const normalized = (value - min) / windowLevel.window
    const scaled = normalized * 255

    return Math.max(0, Math.min(255, Math.round(scaled)))
  }

  /**
   * Actualiza el window (contraste)
   *
   * @param {number} newWindow - Nuevo valor de window
   */
  function updateWindow(newWindow) {
    windowLevel.window = Math.max(1, Math.min(255, newWindow))
    console.log(`🌗 Window actualizado: ${windowLevel.window}`)
  }

  /**
   * Actualiza el level (brillo)
   *
   * @param {number} newLevel - Nuevo valor de level
   */
  function updateLevel(newLevel) {
    windowLevel.level = Math.max(0, Math.min(255, newLevel))
    console.log(`🌗 Level actualizado: ${windowLevel.level}`)
  }

  /**
   * Actualiza window y level simultáneamente
   *
   * @param {number} newWindow - Nuevo valor de window
   * @param {number} newLevel - Nuevo valor de level
   */
  function updateWindowLevel(newWindow, newLevel) {
    windowLevel.window = Math.max(1, Math.min(255, newWindow))
    windowLevel.level = Math.max(0, Math.min(255, newLevel))
    console.log(`🌗 Window/Level actualizado: ${windowLevel.window}/${windowLevel.level}`)
  }

  /**
   * Resetea window/level a valores por defecto
   */
  function resetWindowLevel() {
    windowLevel.window = 255
    windowLevel.level = 128
    console.log('🔄 Window/Level reseteado a valores por defecto')
  }

  /**
   * Aplica preset de window/level (por ejemplo, para diferentes tejidos)
   *
   * @param {string} preset - Nombre del preset ('brain', 'bone', 'lung', etc.)
   */
  function applyWindowLevelPreset(preset) {
    const presets = {
      default: { window: 255, level: 128 },
      brain: { window: 80, level: 40 },
      bone: { window: 2000, level: 400 },
      lung: { window: 1500, level: -600 },
      soft: { window: 400, level: 60 },
      liver: { window: 150, level: 30 }
    }

    const selectedPreset = presets[preset] || presets.default
    windowLevel.window = selectedPreset.window
    windowLevel.level = selectedPreset.level

    console.log(`🎨 Preset aplicado: ${preset} (${windowLevel.window}/${windowLevel.level})`)
  }

  // ============================================
  // 🎯 FUNCIONES DE NAVEGACIÓN DE SLICES
  // ============================================

  /**
   * Cambia a un slice específico en una vista
   *
   * @param {string} view - Vista ('axial', 'coronal', 'sagittal')
   * @param {number} sliceIndex - Índice del slice
   */
  function goToSlice(view, sliceIndex) {
    const limits = sliceLimits.value[view]

    if (!limits) {
      console.warn(`⚠️ Vista desconocida: ${view}`)
      return
    }

    // Aplicar límites
    const clampedSlice = Math.max(limits.min, Math.min(limits.max, sliceIndex))
    currentSlices[view] = clampedSlice

    console.log(`🎯 Slice ${view} cambiado a: ${clampedSlice}`)
  }

  /**
   * Avanza al siguiente slice
   *
   * @param {string} view - Vista ('axial', 'coronal', 'sagittal')
   */
  function nextSlice(view) {
    const limits = sliceLimits.value[view]
    if (currentSlices[view] < limits.max) {
      currentSlices[view]++
    }
  }

  /**
   * Retrocede al slice anterior
   *
   * @param {string} view - Vista ('axial', 'coronal', 'sagittal')
   */
  function previousSlice(view) {
    const limits = sliceLimits.value[view]
    if (currentSlices[view] > limits.min) {
      currentSlices[view]--
    }
  }

  // ============================================
  // 📐 FUNCIONES DE ACCESO A DATOS
  // ============================================

  /**
   * Obtiene el valor de un vóxel en coordenadas 3D
   *
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {number} z - Coordenada Z
   * @returns {number} - Valor del vóxel
   */
  function getVoxelValue(x, y, z) {
    if (!volumeData) return 0

    // Validar límites
    if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) {
      return 0
    }

    // Calcular índice en el array 1D
    const index = z * width * height + y * width + x
    return volumeData[index]
  }

  /**
   * Obtiene un slice completo de datos
   *
   * @param {string} view - Vista ('axial', 'coronal', 'sagittal')
   * @param {number} sliceIndex - Índice del slice
   * @returns {TypedArray} - Datos del slice
   */
  function getSliceData(view, sliceIndex) {
    if (!volumeData) return null

    let sliceData

    switch (view) {
      case 'axial':
        // Slice XY a profundidad Z
        sliceData = new Float32Array(width * height)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const volumeIndex = sliceIndex * width * height + y * width + x
            sliceData[y * width + x] = volumeData[volumeIndex]
          }
        }
        break

      case 'coronal':
        // Slice XZ a altura Y
        sliceData = new Float32Array(width * depth)
        for (let z = 0; z < depth; z++) {
          for (let x = 0; x < width; x++) {
            const volumeIndex = z * width * height + sliceIndex * width + x
            sliceData[z * width + x] = volumeData[volumeIndex]
          }
        }
        break

      case 'sagittal':
        // Slice YZ a ancho X
        sliceData = new Float32Array(height * depth)
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            const volumeIndex = z * width * height + y * width + sliceIndex
            sliceData[z * height + y] = volumeData[volumeIndex]
          }
        }
        break

      default:
        console.warn(`⚠️ Vista desconocida: ${view}`)
        return null
    }

    return sliceData
  }

  /**
   * Obtiene las dimensiones del slice para una vista específica
   *
   * @param {string} view - Vista ('axial', 'coronal', 'sagittal')
   * @returns {Object} - { width, height } del slice
   */
  function getSliceDimensions(view) {
    switch (view) {
      case 'axial':
        return { width, height }
      case 'coronal':
        return { width, height: depth }
      case 'sagittal':
        return { width: height, height: depth }
      default:
        return { width: 0, height: 0 }
    }
  }

  // ============================================
  // 📤 RETURN - EXPORTAR TODO
  // ============================================

  return {
    // Datos volumétricos (como getter/setter para acceso controlado)
    getVolumeData: () => volumeData,
    setVolumeData: (data) => { volumeData = data },

    // Dimensiones
    getWidth: () => width,
    getHeight: () => height,
    getDepth: () => depth,
    getDimensions: () => ({ width, height, depth }),

    // Rango de datos originales
    getOriginalDataMin: () => originalDataMin,
    getOriginalDataMax: () => originalDataMax,
    getOriginalDataRange: () => ({ min: originalDataMin, max: originalDataMax }),

    // Estados reactivos
    currentSlices,
    windowLevel,
    volumeMetadata,
    volumeLoadingState,

    // Computed
    hasVolumeData,
    totalVoxels,
    volumeSizeInMB,
    centerSlices,
    sliceLimits,
    windowLevelRange,

    // Funciones de carga
    loadVolumeData,
    clearVolumeData,
    calculateDataRange,
    configureInitialWindowLevel,
    resetSlicesToCenter,

    // Funciones de window/level
    applyWindowLevel,
    updateWindow,
    updateLevel,
    updateWindowLevel,
    resetWindowLevel,
    applyWindowLevelPreset,

    // Funciones de navegación
    goToSlice,
    nextSlice,
    previousSlice,

    // Funciones de acceso a datos
    getVoxelValue,
    getSliceData,
    getSliceDimensions
  }
}
