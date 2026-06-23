/**
 * 🎨 useImageProcessing.js
 *
 * Composable para procesamiento de imágenes médicas
 *
 * Funcionalidades:
 * - Procesamiento de imágenes 2D (slices)
 * - Aplicación de filtros (contraste, brillo, nitidez, etc.)
 * - Ajuste de Window/Level (ventana médica)
 * - Normalización de datos
 * - Conversión de formatos
 * - Uso de Web Workers para procesamiento pesado
 * - Cache de imágenes procesadas
 *
 * @author Richard - Sistema de Procesamiento de Imágenes Médicas
 */

import { computed, ref } from 'vue'
import { useImageProcessingWorker } from './useImageProcessingWorker'

/**
 * Composable para procesamiento de imágenes médicas
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para procesamiento de imágenes
 */
export function useImageProcessing(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    useWorker: options.useWorker !== false,      // Usar Web Worker
    enableCache: options.enableCache !== false,   // Habilitar cache
    maxCacheSize: options.maxCacheSize || 50,     // Máximo de imágenes en cache
    autoNormalize: options.autoNormalize !== false // Auto-normalización
  }

  // ============================================
  // 🎯 WEB WORKER
  // ============================================

  const imageProcessingWorker = config.useWorker ? useImageProcessingWorker() : null

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Estado de procesamiento
   */
  const isProcessing = ref(false)
  const processingProgress = ref(0)
  const processingMessage = ref('')

  /**
   * Parámetros de Window/Level
   */
  const windowLevel = ref({
    window: 255,
    level: 128
  })

  /**
   * Parámetros de ajuste de imagen
   */
  const imageAdjustments = ref({
    brightness: 0,        // -100 a 100
    contrast: 0,          // -100 a 100
    gamma: 1.0,           // 0.1 a 3.0
    sharpness: 0,         // 0 a 100
    invert: false         // Invertir colores
  })

  /**
   * Rango de datos del volumen
   */
  const dataRange = ref({
    min: 0,
    max: 255,
    originalMin: 0,
    originalMax: 255
  })

  /**
   * Cache de imágenes procesadas
   */
  const imageCache = new Map()

  /**
   * Historial de operaciones
   */
  const operationHistory = ref([])

  /**
   * Imagen original (backup para resetear)
   */
  const originalImageData = ref(null)

  /**
   * Imágenes originales por vista (para filtros)
   */
  const originalImagesByView = ref({
    axial: null,
    coronal: null,
    sagittal: null
  })

  /**
   * Estado de filtros activos
   */
  const activeFilters = ref({
    windowLevel: true,
    brightness: false,
    contrast: false,
    gamma: false,
    sharpness: false,
    invert: false
  })

  /**
   * Control de debounce para filtros
   */
  const filterDebounceTimer = ref(null)
  const isFilterProcessing = ref(false)

  // ============================================
  // 🎨 FUNCIONES DE PROCESAMIENTO BÁSICO
  // ============================================

  /**
   * Aplica Window/Level a los datos de imagen
   * @param {Uint8Array|Float32Array} data - Datos de la imagen
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} windowWidth - Ancho de ventana
   * @param {number} windowCenter - Centro de ventana
   * @returns {Uint8ClampedArray} Datos procesados
   */
  function applyWindowLevel(data, width, height, windowWidth, windowCenter) {
    const output = new Uint8ClampedArray(width * height * 4)
    const min = windowCenter - windowWidth / 2
    const max = windowCenter + windowWidth / 2
    const range = max - min

    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      let normalized = 0

      if (range > 0) {
        normalized = ((value - min) / range) * 255
        normalized = Math.max(0, Math.min(255, normalized))
      }

      const idx = i * 4
      output[idx] = normalized     // R
      output[idx + 1] = normalized // G
      output[idx + 2] = normalized // B
      output[idx + 3] = 255        // A
    }

    return output
  }

  /**
   * Normaliza datos entre 0-255
   * @param {Uint8Array|Float32Array} data - Datos a normalizar
   * @param {number} min - Valor mínimo
   * @param {number} max - Valor máximo
   * @returns {Uint8ClampedArray} Datos normalizados
   */
  function normalizeData(data, min, max) {
    const range = max - min
    const normalized = new Uint8ClampedArray(data.length)

    if (range === 0) {
      normalized.fill(128)
      return normalized
    }

    for (let i = 0; i < data.length; i++) {
      normalized[i] = Math.round(((data[i] - min) / range) * 255)
    }

    return normalized
  }

  /**
   * Aplica brillo a la imagen
   * @param {ImageData} imageData - Datos de imagen
   * @param {number} brightness - Valor de brillo (-100 a 100)
   * @returns {ImageData} Imagen procesada
   */
  function applyBrightness(imageData, brightness) {
    const data = new Uint8ClampedArray(imageData.data)
    const adjustment = (brightness / 100) * 255

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + adjustment))     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment)) // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment)) // B
    }

    return new ImageData(data, imageData.width, imageData.height)
  }

  /**
   * Aplica contraste a la imagen
   * @param {ImageData} imageData - Datos de imagen
   * @param {number} contrast - Valor de contraste (-100 a 100)
   * @returns {ImageData} Imagen procesada
   */
  function applyContrast(imageData, contrast) {
    const data = new Uint8ClampedArray(imageData.data)
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128))
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128))
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128))
    }

    return new ImageData(data, imageData.width, imageData.height)
  }

  /**
   * Aplica corrección gamma
   * @param {ImageData} imageData - Datos de imagen
   * @param {number} gamma - Valor gamma (0.1 a 3.0)
   * @returns {ImageData} Imagen procesada
   */
  function applyGamma(imageData, gamma) {
    const data = new Uint8ClampedArray(imageData.data)

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.pow(data[i] / 255, gamma) * 255
      data[i + 1] = Math.pow(data[i + 1] / 255, gamma) * 255
      data[i + 2] = Math.pow(data[i + 2] / 255, gamma) * 255
    }

    return new ImageData(data, imageData.width, imageData.height)
  }

  /**
   * Invierte los colores de la imagen
   * @param {ImageData} imageData - Datos de imagen
   * @returns {ImageData} Imagen invertida
   */
  function invertColors(imageData) {
    const data = new Uint8ClampedArray(imageData.data)

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]         // R
      data[i + 1] = 255 - data[i + 1] // G
      data[i + 2] = 255 - data[i + 2] // B
    }

    return new ImageData(data, imageData.width, imageData.height)
  }

  /**
   * Aplica filtro de nitidez (sharpness)
   * @param {ImageData} imageData - Datos de imagen
   * @param {number} amount - Cantidad de nitidez (0 a 100)
   * @returns {ImageData} Imagen procesada
   */
  function applySharpness(imageData, amount) {
    if (amount === 0) return imageData

    const width = imageData.width
    const height = imageData.height
    const data = imageData.data
    const output = new Uint8ClampedArray(data.length)

    // Kernel de nitidez (sharpen)
    const factor = amount / 100
    const kernel = [
      0, -factor, 0,
      -factor, 1 + 4 * factor, -factor,
      0, -factor, 0
    ]

    // Aplicar convolución
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB
          let sum = 0

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c
              const kernelIdx = (ky + 1) * 3 + (kx + 1)
              sum += data[idx] * kernel[kernelIdx]
            }
          }

          const idx = (y * width + x) * 4 + c
          output[idx] = Math.max(0, Math.min(255, sum))
        }
        output[(y * width + x) * 4 + 3] = 255 // Alpha
      }
    }

    return new ImageData(output, width, height)
  }

  // ============================================
  // 🔄 FUNCIONES DE PROCESAMIENTO COMBINADO
  // ============================================

  /**
   * Procesa una imagen con todos los ajustes activos
   * @param {ImageData} imageData - Imagen original
   * @param {Object} adjustments - Ajustes a aplicar
   * @returns {ImageData} Imagen procesada
   */
  function processImage(imageData, adjustments = imageAdjustments.value) {
    let processed = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )

    // Aplicar ajustes en orden
    if (adjustments.brightness !== 0 && activeFilters.value.brightness) {
      processed = applyBrightness(processed, adjustments.brightness)
    }

    if (adjustments.contrast !== 0 && activeFilters.value.contrast) {
      processed = applyContrast(processed, adjustments.contrast)
    }

    if (adjustments.gamma !== 1.0 && activeFilters.value.gamma) {
      processed = applyGamma(processed, adjustments.gamma)
    }

    if (adjustments.sharpness > 0 && activeFilters.value.sharpness) {
      processed = applySharpness(processed, adjustments.sharpness)
    }

    if (adjustments.invert && activeFilters.value.invert) {
      processed = invertColors(processed)
    }

    return processed
  }

  /**
   * Procesa una imagen usando Web Worker (async)
   * @param {ImageData} imageData - Imagen a procesar
   * @param {Object} adjustments - Ajustes
   * @returns {Promise<ImageData>} Imagen procesada
   */
  async function processImageAsync(imageData, adjustments = imageAdjustments.value) {
    if (!config.useWorker || !imageProcessingWorker) {
      return processImage(imageData, adjustments)
    }

    try {
      isProcessing.value = true
      processingMessage.value = 'Procesando imagen...'

      const result = await imageProcessingWorker.processImage(imageData, adjustments)

      return result
    } catch (error) {
      console.error('❌ Error procesando imagen con worker:', error)
      // Fallback a procesamiento síncrono
      return processImage(imageData, adjustments)
    } finally {
      isProcessing.value = false
      processingMessage.value = ''
    }
  }

  // ============================================
  // 💾 FUNCIONES DE CACHE
  // ============================================

  /**
   * Genera clave única para el cache
   * @param {string} view - Vista
   * @param {number} slice - Índice de slice
   * @param {Object} params - Parámetros de procesamiento
   * @returns {string} Clave del cache
   */
  function generateCacheKey(view, slice, params) {
    return `${view}_${slice}_${JSON.stringify(params)}`
  }

  /**
   * Obtiene imagen del cache
   * @param {string} key - Clave del cache
   * @returns {ImageData|null} Imagen cacheada o null
   */
  function getCachedImage(key) {
    if (!config.enableCache) return null
    return imageCache.get(key) || null
  }

  /**
   * Guarda imagen en el cache
   * @param {string} key - Clave del cache
   * @param {ImageData} imageData - Imagen a cachear
   */
  function setCachedImage(key, imageData) {
    if (!config.enableCache) return

    // Limitar tamaño del cache
    if (imageCache.size >= config.maxCacheSize) {
      const firstKey = imageCache.keys().next().value
      imageCache.delete(firstKey)
    }

    imageCache.set(key, imageData)
  }

  /**
   * Limpia el cache completamente
   */
  function clearCache() {
    imageCache.clear()
    console.log('🧹 Cache de imágenes limpiado')
  }

  /**
   * Limpia cache de una vista específica
   * @param {string} view - Vista a limpiar
   */
  function clearViewCache(view) {
    const keysToDelete = []

    for (const key of imageCache.keys()) {
      if (key.startsWith(`${view}_`)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => imageCache.delete(key))
    console.log(`🧹 Cache limpiado para vista: ${view}`)
  }

  // ============================================
  // 🎯 FUNCIONES DE WINDOW/LEVEL
  // ============================================

  /**
   * Actualiza los valores de Window/Level
   * @param {number} window - Ancho de ventana
   * @param {number} level - Centro de ventana
   */
  function updateWindowLevel(window, level) {
    windowLevel.value.window = Math.max(1, window)
    windowLevel.value.level = level

    // Limpiar cache al cambiar window/level
    if (config.enableCache) {
      clearCache()
    }

    addToHistory('windowLevel', { window, level })
  }

  /**
   * Resetea Window/Level a valores por defecto
   */
  function resetWindowLevel() {
    windowLevel.value.window = dataRange.value.originalMax - dataRange.value.originalMin
    windowLevel.value.level = (dataRange.value.originalMax + dataRange.value.originalMin) / 2

    clearCache()
    addToHistory('resetWindowLevel', {})
  }

  /**
   * Presets comunes de Window/Level para imágenes médicas
   */
  const windowLevelPresets = {
    brain: { window: 80, level: 40, name: 'Cerebro' },
    bone: { window: 2000, level: 300, name: 'Hueso' },
    lung: { window: 1500, level: -600, name: 'Pulmón' },
    liver: { window: 150, level: 30, name: 'Hígado' },
    soft: { window: 400, level: 40, name: 'Tejido Blando' },
    default: { window: 255, level: 128, name: 'Por Defecto' }
  }

  /**
   * Aplica un preset de Window/Level
   * @param {string} presetName - Nombre del preset
   */
  function applyWindowLevelPreset(presetName) {
    const preset = windowLevelPresets[presetName]
    if (preset) {
      updateWindowLevel(preset.window, preset.level)
      console.log(`🎨 Preset aplicado: ${preset.name}`)
    }
  }

  // ============================================
  // 🔧 FUNCIONES DE AJUSTE
  // ============================================

  /**
   * Actualiza un ajuste específico
   * @param {string} adjustmentType - Tipo de ajuste
   * @param {number|boolean} value - Valor
   */
  function updateAdjustment(adjustmentType, value) {
    if (adjustmentType in imageAdjustments.value) {
      imageAdjustments.value[adjustmentType] = value
      activeFilters.value[adjustmentType] = true

      clearCache()
      addToHistory(adjustmentType, { value })
    }
  }

  /**
   * Resetea todos los ajustes a valores por defecto
   */
  function resetAdjustments() {
    imageAdjustments.value = {
      brightness: 0,
      contrast: 0,
      gamma: 1.0,
      sharpness: 0,
      invert: false
    }

    Object.keys(activeFilters.value).forEach(key => {
      if (key !== 'windowLevel') {
        activeFilters.value[key] = false
      }
    })

    clearCache()
    addToHistory('resetAdjustments', {})
  }

  /**
   * Aplica ajustes con debounce para evitar procesamiento excesivo
   * @param {Function} callback - Función a ejecutar
   * @param {number} delay - Retraso en ms
   */
  function applyAdjustmentsDebounced(callback, delay = 300) {
    if (filterDebounceTimer.value) {
      clearTimeout(filterDebounceTimer.value)
    }

    filterDebounceTimer.value = setTimeout(() => {
      callback()
      filterDebounceTimer.value = null
    }, delay)
  }

  // ============================================
  // 📜 FUNCIONES DE HISTORIAL
  // ============================================

  /**
   * Añade una operación al historial
   * @param {string} operation - Nombre de la operación
   * @param {Object} params - Parámetros
   */
  function addToHistory(operation, params) {
    operationHistory.value.push({
      operation,
      params,
      timestamp: Date.now()
    })

    // Limitar historial a 50 operaciones
    if (operationHistory.value.length > 50) {
      operationHistory.value.shift()
    }
  }

  /**
   * Limpia el historial de operaciones
   */
  function clearHistory() {
    operationHistory.value = []
  }

  // ============================================
  // 💾 FUNCIONES DE BACKUP/RESTORE
  // ============================================

  /**
   * Guarda la imagen original para poder resetear
   * @param {ImageData} imageData - Imagen original
   * @param {string} view - Vista (opcional)
   */
  function saveOriginalImage(imageData, view = null) {
    if (view) {
      originalImagesByView.value[view] = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      )
    } else {
      originalImageData.value = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      )
    }
  }

  /**
   * Obtiene la imagen original guardada
   * @param {string} view - Vista (opcional)
   * @returns {ImageData|null} Imagen original
   */
  function getOriginalImage(view = null) {
    if (view) {
      return originalImagesByView.value[view]
    }
    return originalImageData.value
  }

  /**
   * Restaura la imagen a su estado original
   * @param {string} view - Vista (opcional)
   * @returns {ImageData|null} Imagen original restaurada
   */
  function restoreOriginalImage(view = null) {
    const original = getOriginalImage(view)
    if (original) {
      resetAdjustments()
      resetWindowLevel()
      return new ImageData(
        new Uint8ClampedArray(original.data),
        original.width,
        original.height
      )
    }
    return null
  }

  // ============================================
  // 🔍 FUNCIONES DE ANÁLISIS
  // ============================================

  /**
   * Calcula estadísticas de la imagen
   * @param {Uint8Array|Float32Array} data - Datos de imagen
   * @returns {Object} Estadísticas {min, max, mean, std}
   */
  function calculateStatistics(data) {
    let min = Infinity
    let max = -Infinity
    let sum = 0

    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      min = Math.min(min, value)
      max = Math.max(max, value)
      sum += value
    }

    const mean = sum / data.length

    // Calcular desviación estándar
    let variance = 0
    for (let i = 0; i < data.length; i++) {
      variance += Math.pow(data[i] - mean, 2)
    }
    const std = Math.sqrt(variance / data.length)

    return { min, max, mean, std }
  }

  /**
   * Calcula el histograma de la imagen
   * @param {Uint8Array|Float32Array} data - Datos de imagen
   * @param {number} bins - Número de bins
   * @returns {Array} Histograma
   */
  function calculateHistogram(data, bins = 256) {
    const histogram = new Array(bins).fill(0)
    const stats = calculateStatistics(data)
    const range = stats.max - stats.min
    const binSize = range / bins

    for (let i = 0; i < data.length; i++) {
      const binIndex = Math.min(
        bins - 1,
        Math.floor((data[i] - stats.min) / binSize)
      )
      histogram[binIndex]++
    }

    return histogram
  }

  /**
   * Actualiza el rango de datos del volumen
   * @param {number} min - Valor mínimo
   * @param {number} max - Valor máximo
   */
  function updateDataRange(min, max) {
    dataRange.value.min = min
    dataRange.value.max = max
    dataRange.value.originalMin = min
    dataRange.value.originalMax = max

    // Actualizar window/level por defecto
    windowLevel.value.window = max - min
    windowLevel.value.level = (max + min) / 2
  }

  // ============================================
  // 🎬 FUNCIONES DE INICIALIZACIÓN
  // ============================================

  /**
   * Inicializa el composable de procesamiento
   */
  async function initialize() {
    console.log('🎬 Inicializando procesamiento de imágenes...')

    if (config.useWorker && imageProcessingWorker) {
      await imageProcessingWorker.initializeWorker()
    }

    console.log('✅ Procesamiento de imágenes inicializado')
  }

  /**
   * Limpia recursos del composable
   */
  function cleanup() {
    console.log('🧹 Limpiando procesamiento de imágenes...')

    clearCache()
    clearHistory()

    if (filterDebounceTimer.value) {
      clearTimeout(filterDebounceTimer.value)
    }

    if (imageProcessingWorker && imageProcessingWorker.terminateWorker) {
      imageProcessingWorker.terminateWorker()
    }

    console.log('✅ Procesamiento de imágenes limpiado')
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Verifica si hay ajustes activos
   */
  const hasActiveAdjustments = computed(() => {
    return imageAdjustments.value.brightness !== 0 ||
      imageAdjustments.value.contrast !== 0 ||
      imageAdjustments.value.gamma !== 1.0 ||
      imageAdjustments.value.sharpness > 0 ||
      imageAdjustments.value.invert
  })

  /**
   * Tamaño del cache
   */
  const cacheSize = computed(() => imageCache.size)

  /**
   * Porcentaje de uso del cache
   */
  const cacheUsagePercent = computed(() =>
    (cacheSize.value / config.maxCacheSize) * 100
  )

  /**
   * Estado del procesamiento
   */
  const processingState = computed(() => ({
    isProcessing: isProcessing.value || isFilterProcessing.value,
    progress: processingProgress.value,
    message: processingMessage.value
  }))

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    isProcessing,
    processingProgress,
    processingMessage,
    windowLevel,
    imageAdjustments,
    dataRange,
    activeFilters,
    originalImageData,
    originalImagesByView,
    isFilterProcessing,
    operationHistory,

    // Funciones de procesamiento básico
    applyWindowLevel,
    normalizeData,
    applyBrightness,
    applyContrast,
    applyGamma,
    invertColors,
    applySharpness,

    // Funciones de procesamiento combinado
    processImage,
    processImageAsync,

    // Funciones de cache
    generateCacheKey,
    getCachedImage,
    setCachedImage,
    clearCache,
    clearViewCache,

    // Funciones de Window/Level
    updateWindowLevel,
    resetWindowLevel,
    applyWindowLevelPreset,
    windowLevelPresets,

    // Funciones de ajuste
    updateAdjustment,
    resetAdjustments,
    applyAdjustmentsDebounced,

    // Funciones de historial
    addToHistory,
    clearHistory,

    // Funciones de backup/restore
    saveOriginalImage,
    getOriginalImage,
    restoreOriginalImage,

    // Funciones de análisis
    calculateStatistics,
    calculateHistogram,
    updateDataRange,

    // Funciones de inicialización
    initialize,
    cleanup,

    // Computed properties
    hasActiveAdjustments,
    cacheSize,
    cacheUsagePercent,
    processingState
  }
}
