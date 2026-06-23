// composables/viewer/useImageControls.js
import { reactive, ref } from 'vue'

/**
 * 🎛️ Composable para controles de imagen médica
 *
 * Maneja todos los controles y ajustes de imagen:
 * - Window/Level (visualización médica)
 * - Filtros de mejora (sharpening, denoising, edge detection)
 * - Ajustes de contraste y brillo
 * - Ecualización de histograma
 * - Contraste adaptativo (CLAHE)
 * - Presets de ajustes
 */
export function useImageControls() {
  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Configuración de Window/Level
   * Fundamental para visualización médica DICOM
   */
  const windowLevel = reactive({
    window: 400,    // Ancho de la ventana (rango de valores visibles)
    level: 40,      // Centro de la ventana (valor central)
    min: 0,         // Valor mínimo del rango de datos
    max: 255        // Valor máximo del rango de datos
  })

  /**
   * Configuración de mejoras de imagen
   */
  const enhancementSettings = reactive({
    enabled: ref(false),
    sharpening: ref(0),         // 0-1
    denoising: ref(0),          // 0-1
    contrast: ref(1.0),         // 0.5-2.0
    brightness: ref(1.0),       // 0.5-2.0
    adaptiveContrast: ref(false),
    histogramEqualization: ref(false),
    edgeDetection: ref(false),
    edgeMethod: ref('sobel'),   // 'sobel' o 'laplacian'
    edgeThreshold: ref(100)     // 0-255
  })

  /**
   * Presets de configuración
   */
  const presets = ref([
    {
      name: 'Normal',
      settings: {
        sharpening: 0,
        denoising: 0,
        contrast: 1.0,
        brightness: 1.0,
        adaptiveContrast: false,
        histogramEqualization: false
      }
    },
    {
      name: 'Nitidez Alta',
      settings: {
        sharpening: 0.7,
        denoising: 0.2,
        contrast: 1.2,
        brightness: 1.0,
        adaptiveContrast: false,
        histogramEqualization: false
      }
    },
    {
      name: 'Contraste Mejorado',
      settings: {
        sharpening: 0.3,
        denoising: 0.1,
        contrast: 1.5,
        brightness: 1.0,
        adaptiveContrast: true,
        histogramEqualization: true
      }
    },
    {
      name: 'Reducción Ruido',
      settings: {
        sharpening: 0,
        denoising: 0.6,
        contrast: 1.0,
        brightness: 1.0,
        adaptiveContrast: false,
        histogramEqualization: false
      }
    }
  ])

  /**
   * Presets de Window/Level para modalidades médicas
   */
  const windowLevelPresets = ref([
    { name: 'Soft Tissue', window: 400, level: 40 },
    { name: 'Lung', window: 1500, level: -600 },
    { name: 'Bone', window: 2000, level: 300 },
    { name: 'Brain', window: 80, level: 40 },
    { name: 'Liver', window: 150, level: 30 },
    { name: 'Custom', window: 400, level: 40 }
  ])

  const selectedPreset = ref(0)
  const selectedWindowLevelPreset = ref(0)

  /**
   * Estadísticas de rendimiento
   */
  const performanceStats = reactive({
    lastProcessingTime: 0,
    averageProcessingTime: 0,
    processCount: 0
  })

  // ============================================
  // 🎛️ WINDOW/LEVEL
  // ============================================

  /**
   * Aplica window/level a un valor de píxel
   * Esta es la función fundamental para visualización médica
   *
   * @param {number} value - Valor del píxel original
   * @returns {number} - Valor ajustado (0-255)
   */
  function applyWindowLevel(value) {
    const half = windowLevel.window / 2
    const min = windowLevel.level - half
    const max = windowLevel.level + half

    // Optimización: early exit para valores fuera de rango
    if (value <= min) return 0
    if (value >= max) return 255

    // Manejo especial para datos float32 normalizados
    if (windowLevel.window < 1) {
      const normalized = Math.max(0, Math.min(1, (value - min) / windowLevel.window))
      return Math.round(normalized * 255)
    }

    // Cálculo estándar con precisión
    const normalized = (value - min) / windowLevel.window
    const scaled = normalized * 255

    return Math.max(0, Math.min(255, Math.round(scaled)))
  }

  /**
   * Establece window/level automáticamente basado en datos
   *
   * @param {TypedArray} volumeData - Datos del volumen
   * @param {number} percentile - Percentil para calcular rango (default: 0.02)
   */
  function autoWindowLevel(volumeData, percentile = 0.02) {
    if (!volumeData || volumeData.length === 0) return

    // Muestreo para mejor rendimiento en volúmenes grandes
    const sampleSize = Math.min(10000, volumeData.length)
    const step = Math.max(1, Math.floor(volumeData.length / sampleSize))
    const samples = []

    for (let i = 0; i < volumeData.length; i += step) {
      samples.push(volumeData[i])
    }

    // Ordenar muestras
    samples.sort((a, b) => a - b)

    // Calcular percentiles
    const lowIndex = Math.floor(samples.length * percentile)
    const highIndex = Math.floor(samples.length * (1 - percentile))

    const minValue = samples[lowIndex]
    const maxValue = samples[highIndex]

    // Actualizar window/level
    windowLevel.window = maxValue - minValue
    windowLevel.level = (maxValue + minValue) / 2
    windowLevel.min = minValue
    windowLevel.max = maxValue

    console.log(`🎯 Auto Window/Level: window=${windowLevel.window.toFixed(1)}, level=${windowLevel.level.toFixed(1)}`)
  }

  /**
   * Aplica un preset de window/level
   *
   * @param {number} presetIndex - Índice del preset
   */
  function applyWindowLevelPreset(presetIndex) {
    const preset = windowLevelPresets.value[presetIndex]
    if (!preset) return

    windowLevel.window = preset.window
    windowLevel.level = preset.level
    selectedWindowLevelPreset.value = presetIndex

    console.log(`🎯 Preset aplicado: ${preset.name} (W:${preset.window}, L:${preset.level})`)
  }

  /**
   * Resetea window/level a valores por defecto
   */
  function resetWindowLevel() {
    windowLevel.window = 400
    windowLevel.level = 40
    selectedWindowLevelPreset.value = 0
    console.log('🔄 Window/Level reseteado')
  }

  // ============================================
  // 🎨 MEJORAS DE IMAGEN
  // ============================================

  /**
   * Aplica todas las mejoras configuradas a una imagen
   *
   * @param {ImageData} imageData - Datos de la imagen
   * @returns {ImageData} - Imagen mejorada
   */
  function applyImageEnhancements(imageData) {
    if (!enhancementSettings.enabled.value) {
      return imageData
    }

    const startTime = performance.now()
    const imageSize = imageData.width * imageData.height
    const isLargeImage = imageSize > (400 * 400)

    console.log('🎨 Aplicando mejoras de imagen...')
    console.log(`📏 Tamaño: ${imageData.width}x${imageData.height}`)
    console.log(`⚡ Modo: ${isLargeImage ? 'OPTIMIZADO' : 'COMPLETO'}`)

    let enhanced = imageData

    // Aplicar mejoras según tamaño de imagen
    if (isLargeImage) {
      // Modo optimizado para imágenes grandes
      if (enhancementSettings.histogramEqualization.value) {
        enhanced = applyHistogramEqualization(enhanced)
      }

      if (enhancementSettings.contrast.value !== 1.0 ||
        enhancementSettings.brightness.value !== 1.0) {
        enhanced = applyContrastBrightness(
          enhanced,
          enhancementSettings.contrast.value,
          enhancementSettings.brightness.value
        )
      }

      if (enhancementSettings.sharpening.value > 0) {
        enhanced = applySharpeningFilter(
          enhanced,
          enhancementSettings.sharpening.value * 0.7,
          true // modo rápido
        )
      }
    } else {
      // Modo completo para imágenes normales
      if (enhancementSettings.histogramEqualization.value) {
        enhanced = applyHistogramEqualization(enhanced)
      }

      if (enhancementSettings.denoising.value > 0) {
        enhanced = applyDenoising(enhanced, enhancementSettings.denoising.value)
      }

      if (enhancementSettings.sharpening.value > 0) {
        enhanced = applySharpeningFilter(
          enhanced,
          enhancementSettings.sharpening.value,
          false // modo completo
        )
      }

      if (enhancementSettings.contrast.value !== 1.0 ||
        enhancementSettings.brightness.value !== 1.0) {
        enhanced = applyContrastBrightness(
          enhanced,
          enhancementSettings.contrast.value,
          enhancementSettings.brightness.value
        )
      }

      if (enhancementSettings.adaptiveContrast.value) {
        enhanced = applyAdaptiveContrast(enhanced)
      }
    }

    // Edge detection si está habilitado
    if (enhancementSettings.edgeDetection.value) {
      enhanced = applyEdgeDetection(
        enhanced,
        enhancementSettings.edgeThreshold.value,
        enhancementSettings.edgeMethod.value
      )
    }

    // Actualizar estadísticas
    const endTime = performance.now()
    const processingTime = endTime - startTime

    performanceStats.lastProcessingTime = processingTime
    performanceStats.processCount++
    performanceStats.averageProcessingTime =
      (performanceStats.averageProcessingTime * (performanceStats.processCount - 1) + processingTime) /
      performanceStats.processCount

    console.log(`✨ Mejoras aplicadas en ${processingTime.toFixed(2)}ms`)

    return enhanced
  }

  // ============================================
  // 🔪 FILTROS INDIVIDUALES
  // ============================================

  /**
   * Aplica filtro de sharpening (nitidez)
   *
   * @param {ImageData} imageData - Datos de imagen
   * @param {number} strength - Intensidad (0-1)
   * @param {boolean} fastMode - Usar modo rápido
   * @returns {ImageData} - Imagen con filtro aplicado
   */
  function applySharpeningFilter(imageData, strength, fastMode = false) {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height

    const totalPixels = width * height
    const isVeryLargeImage = totalPixels > (512 * 512)

    if (fastMode || isVeryLargeImage) {
      // Modo rápido con kernel simple
      const multiplier = strength * 1.5
      const step = isVeryLargeImage ? Math.max(2, Math.floor(width / 256)) : (width > 512 ? 2 : 1)

      for (let y = step; y < height - step; y += step) {
        for (let x = step; x < width - step; x += step) {
          for (let c = 0; c < 3; c++) {
            const centerIdx = (y * width + x) * 4 + c
            const centerValue = imageData.data[centerIdx]

            // Kernel de 5 puntos
            const topIdx = ((y - step) * width + x) * 4 + c
            const bottomIdx = ((y + step) * width + x) * 4 + c
            const leftIdx = (y * width + (x - step)) * 4 + c
            const rightIdx = (y * width + (x + step)) * 4 + c

            const laplacian = 4 * centerValue
              - imageData.data[topIdx]
              - imageData.data[bottomIdx]
              - imageData.data[leftIdx]
              - imageData.data[rightIdx]

            const enhanced = centerValue + multiplier * laplacian
            data[centerIdx] = Math.max(0, Math.min(255, enhanced))

            // Rellenar píxeles intermedios
            if (step > 1 && x + 1 < width) {
              data[(y * width + (x + 1)) * 4 + c] = data[centerIdx]
            }
          }
        }
      }
    } else {
      // Modo completo con kernel agresivo
      const multiplier = strength * 2
      const kernel = [
        -multiplier, -multiplier, -multiplier,
        -multiplier, 1 + 8 * multiplier, -multiplier,
        -multiplier, -multiplier, -multiplier
      ]

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) {
            let sum = 0
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const idx = ((y + ky) * width + (x + kx)) * 4 + c
                const kernelIdx = (ky + 1) * 3 + (kx + 1)
                sum += imageData.data[idx] * kernel[kernelIdx]
              }
            }
            const idx = (y * width + x) * 4 + c
            data[idx] = Math.max(0, Math.min(255, sum))
          }
        }
      }
    }

    return new ImageData(data, width, height)
  }

  /**
   * Aplica reducción de ruido (denoising)
   *
   * @param {ImageData} imageData - Datos de imagen
   * @param {number} strength - Intensidad (0-1)
   * @returns {ImageData} - Imagen con ruido reducido
   */
  function applyDenoising(imageData, strength) {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height

    // Kernel gaussiano
    const kernel = [
      1, 2, 1,
      2, 4, 2,
      1, 2, 1
    ]
    const kernelSum = 16

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c
              const kernelIdx = (ky + 1) * 3 + (kx + 1)
              sum += imageData.data[idx] * kernel[kernelIdx]
            }
          }
          const idx = (y * width + x) * 4 + c
          const smoothed = sum / kernelSum
          const original = imageData.data[idx]
          data[idx] = original * (1 - strength) + smoothed * strength
        }
      }
    }

    return new ImageData(data, width, height)
  }

  /**
   * Aplica detección de bordes
   *
   * @param {ImageData} imageData - Datos de imagen
   * @param {number} threshold - Umbral (0-255)
   * @param {string} method - Método: 'sobel' o 'laplacian'
   * @returns {ImageData} - Imagen con bordes detectados
   */
  function applyEdgeDetection(imageData, threshold = 100, method = 'sobel') {
    const { width, height, data } = imageData
    const output = new Uint8ClampedArray(data.length)

    // Convertir a escala de grises
    const grayData = new Array(width * height)
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      grayData[Math.floor(i / 4)] = gray
    }

    if (method === 'sobel') {
      const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
      const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let gx = 0, gy = 0

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = (y + ky) * width + (x + kx)
              const kernelIdx = (ky + 1) * 3 + (kx + 1)

              gx += grayData[idx] * sobelX[kernelIdx]
              gy += grayData[idx] * sobelY[kernelIdx]
            }
          }

          const magnitude = Math.sqrt(gx * gx + gy * gy)
          const edge = magnitude > threshold ? 255 : 0

          const outputIdx = (y * width + x) * 4
          output[outputIdx] = edge
          output[outputIdx + 1] = edge
          output[outputIdx + 2] = edge
          output[outputIdx + 3] = 255
        }
      }
    } else if (method === 'laplacian') {
      const laplacian = [0, -1, 0, -1, 4, -1, 0, -1, 0]

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let sum = 0

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = (y + ky) * width + (x + kx)
              const kernelIdx = (ky + 1) * 3 + (kx + 1)
              sum += grayData[idx] * laplacian[kernelIdx]
            }
          }

          const edge = Math.abs(sum) > threshold ? 255 : 0

          const outputIdx = (y * width + x) * 4
          output[outputIdx] = edge
          output[outputIdx + 1] = edge
          output[outputIdx + 2] = edge
          output[outputIdx + 3] = 255
        }
      }
    }

    // Llenar bordes con negro
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          const idx = (y * width + x) * 4
          output[idx] = 0
          output[idx + 1] = 0
          output[idx + 2] = 0
          output[idx + 3] = 255
        }
      }
    }

    return new ImageData(output, width, height)
  }

  /**
   * Aplica ajustes de contraste y brillo
   *
   * @param {ImageData} imageData - Datos de imagen
   * @param {number} contrast - Factor de contraste (0.5-2.0)
   * @param {number} brightness - Factor de brillo (0.5-2.0)
   * @returns {ImageData} - Imagen ajustada
   */
  function applyContrastBrightness(imageData, contrast, brightness) {
    const data = new Uint8ClampedArray(imageData.data)

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let value = data[i + c]

        // Aplicar contraste y brillo
        value = (value - 128) * contrast + 128 + (brightness - 1) * 128

        data[i + c] = Math.max(0, Math.min(255, Math.round(value)))
      }
    }

    return new ImageData(data, imageData.width, imageData.height)
  }

  /**
   * Aplica ecualización de histograma
   *
   * @param {ImageData} imageData - Datos de imagen
   * @returns {ImageData} - Imagen con histograma ecualizado
   */
  function applyHistogramEqualization(imageData) {
    const data = new Uint8ClampedArray(imageData.data)
    const histogram = new Array(256).fill(0)

    // Calcular histograma de luminancia
    for (let i = 0; i < data.length; i += 4) {
      const luminance = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      )
      histogram[luminance]++
    }

    // Calcular CDF
    const cdf = new Array(256)
    cdf[0] = histogram[0]
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i]
    }

    const totalPixels = imageData.width * imageData.height

    // Aplicar ecualización
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.round((cdf[data[i]] / totalPixels) * 255)
      const g = Math.round((cdf[data[i + 1]] / totalPixels) * 255)
      const b = Math.round((cdf[data[i + 2]] / totalPixels) * 255)

      data[i] = Math.max(0, Math.min(255, r))
      data[i + 1] = Math.max(0, Math.min(255, g))
      data[i + 2] = Math.max(0, Math.min(255, b))
    }

    return new ImageData(data, imageData.width, imageData.height)
  }

  /**
   * Aplica contraste adaptativo (CLAHE simplificado)
   *
   * @param {ImageData} imageData - Datos de imagen
   * @returns {ImageData} - Imagen con contraste mejorado
   */
  function applyAdaptiveContrast(imageData) {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height

    const tileSize = 32

    for (let tileY = 0; tileY < height; tileY += tileSize) {
      for (let tileX = 0; tileX < width; tileX += tileSize) {
        const endY = Math.min(tileY + tileSize, height)
        const endX = Math.min(tileX + tileSize, width)

        // Calcular histograma local
        const histogram = new Array(256).fill(0)
        let totalPixels = 0

        for (let y = tileY; y < endY; y++) {
          for (let x = tileX; x < endX; x++) {
            const idx = (y * width + x) * 4
            const gray = Math.round(
              0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
            )
            histogram[gray]++
            totalPixels++
          }
        }

        // Crear función de mapeo
        const cdf = new Array(256).fill(0)
        cdf[0] = histogram[0]
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + histogram[i]
        }

        // Aplicar mejora
        for (let y = tileY; y < endY; y++) {
          for (let x = tileX; x < endX; x++) {
            const idx = (y * width + x) * 4
            for (let c = 0; c < 3; c++) {
              const value = data[idx + c]
              const enhanced = Math.round((cdf[value] / totalPixels) * 255)
              // Mezclar con original
              data[idx + c] = Math.round(value * 0.7 + enhanced * 0.3)
            }
          }
        }
      }
    }

    return new ImageData(data, width, height)
  }

  // ============================================
  // 🎯 PRESETS Y UTILIDADES
  // ============================================

  /**
   * Aplica un preset de mejoras
   *
   * @param {number} presetIndex - Índice del preset
   */
  function applyPreset(presetIndex) {
    const preset = presets.value[presetIndex]
    if (!preset) return

    Object.assign(enhancementSettings, preset.settings)
    selectedPreset.value = presetIndex

    console.log(`🎨 Preset aplicado: ${preset.name}`)
  }

  /**
   * Resetea todas las mejoras a valores por defecto
   */
  function resetEnhancements() {
    enhancementSettings.sharpening.value = 0
    enhancementSettings.denoising.value = 0
    enhancementSettings.contrast.value = 1.0
    enhancementSettings.brightness.value = 1.0
    enhancementSettings.adaptiveContrast.value = false
    enhancementSettings.histogramEqualization.value = false
    enhancementSettings.edgeDetection.value = false
    selectedPreset.value = 0

    console.log('🔄 Mejoras reseteadas')
  }

  /**
   * Habilita/deshabilita mejoras de imagen
   *
   * @param {boolean} enabled - Estado deseado
   */
  function toggleEnhancements(enabled) {
    enhancementSettings.enabled.value = enabled
    console.log(`🎨 Mejoras ${enabled ? 'habilitadas' : 'deshabilitadas'}`)
  }

  // ============================================
  // 📤 RETURN - EXPORTAR TODO
  // ============================================

  return {
    // Estado
    windowLevel,
    enhancementSettings,
    presets,
    windowLevelPresets,
    selectedPreset,
    selectedWindowLevelPreset,
    performanceStats,

    // Window/Level
    applyWindowLevel,
    autoWindowLevel,
    applyWindowLevelPreset,
    resetWindowLevel,

    // Mejoras de imagen
    applyImageEnhancements,
    toggleEnhancements,

    // Filtros individuales
    applySharpeningFilter,
    applyDenoising,
    applyEdgeDetection,
    applyContrastBrightness,
    applyHistogramEqualization,
    applyAdaptiveContrast,

    // Presets y utilidades
    applyPreset,
    resetEnhancements
  }
}
