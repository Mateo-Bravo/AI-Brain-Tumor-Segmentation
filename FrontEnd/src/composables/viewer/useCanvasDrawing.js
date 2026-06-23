// composables/viewer/useCanvasDrawing.js
import { reactive } from 'vue'

/**
 * 🎨 Composable para dibujo en canvas 2D
 *
 * Maneja todas las operaciones de dibujo en canvas 2D:
 * - Dibujo de vistas médicas (axial, coronal, sagital)
 * - Aplicación de window/level
 * - Renderizado de segmentación
 * - Dibujo de crosshairs
 * - Dibujo de mediciones
 * - Soporte para zoom
 * - Optimizaciones de rendimiento
 */
export function useCanvasDrawing() {
  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Pool de canvas temporales para optimización
   */
  const canvasPool = {
    pool: [],
    getCanvas(width, height) {
      let canvas = this.pool.find(c => c.width === width && c.height === height)
      if (!canvas) {
        canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        this.pool.push(canvas)
      }
      return canvas
    },
    releaseCanvas(canvas) {
      // Canvas se mantiene en el pool para reutilización
    },
    clear() {
      this.pool = []
    }
  }

  /**
   * Configuración de renderizado
   */
  const renderConfig = reactive({
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'high'
  })

  /**
   * Colores para segmentación
   */
  const segmentationColors = {
    50: { r: 255, g: 0, b: 0 },    // Necrotic core - Rojo
    150: { r: 0, g: 255, b: 0 },   // Edema - Verde
    250: { r: 0, g: 0, b: 255 }    // Enhancing tumor - Azul
  }

  // ============================================
  // 🎨 FUNCIONES PRINCIPALES DE DIBUJO
  // ============================================

  /**
   * Dibuja la vista principal seleccionada
   *
   * @param {HTMLCanvasElement} canvas - Canvas donde dibujar
   * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal')
   * @param {TypedArray} volumeData - Datos volumétricos
   * @param {number} width - Ancho del volumen
   * @param {number} height - Alto del volumen
   * @param {number} depth - Profundidad del volumen
   * @param {number} sliceIndex - Índice del slice actual
   * @param {Function} applyWindowLevel - Función para aplicar window/level
   * @param {Object} options - Opciones adicionales
   */
  function drawMainView(
    canvas,
    viewType,
    volumeData,
    width,
    height,
    depth,
    sliceIndex,
    applyWindowLevel,
    options = {}
  ) {
    if (!volumeData || !canvas) {
      console.warn('⚠️ drawMainView: Datos o canvas no disponibles')
      return
    }

    // Validar dimensiones del canvas
    if (canvas.width <= 0 || canvas.height <= 0) {
      console.warn(`⚠️ Canvas con tamaño inválido: ${canvas.width}x${canvas.height}`)
      return
    }

    const ctx = canvas.getContext('2d')

    // Resetear transformaciones
    ctx.resetTransform()
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Obtener dimensiones según la vista
    const { w, h, imageData } = createSliceImageData(
      ctx,
      viewType,
      volumeData,
      width,
      height,
      depth,
      sliceIndex,
      applyWindowLevel,
      options.showSegmentation || false,
      options.currentModality || 'default'
    )

    if (!imageData) {
      ctx.restore()
      return
    }

    // Aplicar mejoras si están habilitadas
    let finalImageData = imageData
    if (options.imageEnhancementEnabled && options.applyImageEnhancements) {
      finalImageData = options.applyImageEnhancements(imageData)
    }

    // Crear canvas temporal para el slice
    const tempCanvas = canvasPool.getCanvas(w, h)
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(finalImageData, 0, 0)

    // Calcular escalado para ajustar al canvas
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    // Configurar calidad de renderizado
    if (options.imageEnhancementEnabled) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    } else {
      ctx.imageSmoothingEnabled = false
    }

    // Aplicar zoom si está configurado
    ctx.save()
    if (options.zoomLevel && options.zoomLevel !== 1) {
      applyZoomTransform(
        ctx,
        options.zoomLevel,
        options.zoomOrigin || { x: canvasWidth / 2, y: canvasHeight / 2 },
        options.zoomTranslate || { x: 0, y: 0 }
      )
    }

    // Calcular posición y tamaño de la imagen
    const { offsetX, offsetY, scaledW, scaledH } = calculateImageLayout(
      w, h, canvasWidth, canvasHeight
    )

    // Aplicar corrección de orientación (flip vertical)
    ctx.save()
    ctx.translate(offsetX + scaledW / 2, offsetY + scaledH / 2)
    ctx.scale(1, -1)
    ctx.drawImage(tempCanvas, -scaledW / 2, -scaledH / 2, scaledW, scaledH)
    ctx.restore()

    // Dibujar crosshairs si están habilitados
    if (options.showCrosshairs && options.crosshairPositions) {
      drawCrosshairs(
        ctx,
        canvasWidth,
        canvasHeight,
        offsetX,
        offsetY,
        scaledW,
        scaledH,
        viewType,
        options.crosshairPositions,
        options.crosshairColor || '#00FF00'
      )
    }

    // Dibujar mediciones si están disponibles
    if (options.measurements && options.measurements.length > 0) {
      drawMeasurements(
        ctx,
        canvasWidth,
        canvasHeight,
        options.measurements,
        viewType,
        sliceIndex
      )
    }

    // Restaurar estados
    ctx.restore()
    ctx.restore()

    // Liberar canvas temporal
    canvasPool.releaseCanvas(tempCanvas)
  }

  /**
   * Dibuja una vista con zoom aplicado
   *
   * @param {HTMLCanvasElement} canvas - Canvas donde dibujar
   * @param {string} viewType - Tipo de vista
   * @param {TypedArray} volumeData - Datos volumétricos
   * @param {Object} dimensions - Dimensiones del volumen {width, height, depth}
   * @param {number} sliceIndex - Índice del slice
   * @param {Object} zoomConfig - Configuración de zoom {level, origin, translate}
   * @param {Function} applyWindowLevel - Función para window/level
   * @param {Object} options - Opciones adicionales
   */
  function drawViewWithZoom(
    canvas,
    viewType,
    volumeData,
    dimensions,
    sliceIndex,
    zoomConfig,
    applyWindowLevel,
    options = {}
  ) {
    if (!volumeData || !canvas) {
      console.warn(`⚠️ drawViewWithZoom(${viewType}): Datos no disponibles`)
      return
    }

    const ctx = canvas.getContext('2d')
    ctx.resetTransform()
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Aplicar transformaciones de zoom
    if (zoomConfig.level !== 1) {
      ctx.translate(zoomConfig.translate.x, zoomConfig.translate.y)
      ctx.translate(zoomConfig.origin.x, zoomConfig.origin.y)
      ctx.scale(zoomConfig.level, zoomConfig.level)
      ctx.translate(-zoomConfig.origin.x, -zoomConfig.origin.y)
    }

    // Dibujar la vista específica
    drawSpecificView(
      ctx,
      canvas,
      viewType,
      volumeData,
      dimensions,
      sliceIndex,
      applyWindowLevel,
      options
    )

    ctx.restore()
  }

  /**
   * Dibuja una vista específica (axial, coronal, sagital)
   *
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D
   * @param {HTMLCanvasElement} canvas - Canvas
   * @param {string} viewType - Tipo de vista
   * @param {TypedArray} volumeData - Datos volumétricos
   * @param {Object} dimensions - Dimensiones {width, height, depth}
   * @param {number} sliceIndex - Índice del slice
   * @param {Function} applyWindowLevel - Función window/level
   * @param {Object} options - Opciones adicionales
   */
  function drawSpecificView(
    ctx,
    canvas,
    viewType,
    volumeData,
    dimensions,
    sliceIndex,
    applyWindowLevel,
    options = {}
  ) {
    const { width, height, depth } = dimensions
    let w, h, imageData

    switch (viewType) {
      case 'axial':
        ({ w, h, imageData } = createAxialSlice(
          ctx,
          volumeData,
          width,
          height,
          depth,
          sliceIndex,
          applyWindowLevel,
          options
        ))
        break

      case 'coronal':
        ({ w, h, imageData } = createCoronalSlice(
          ctx,
          volumeData,
          width,
          height,
          depth,
          sliceIndex,
          applyWindowLevel,
          options
        ))
        break

      case 'sagittal':
        ({ w, h, imageData } = createSagittalSlice(
          ctx,
          volumeData,
          width,
          height,
          depth,
          sliceIndex,
          applyWindowLevel,
          options
        ))
        break

      default:
        console.warn(`⚠️ Vista desconocida: ${viewType}`)
        return
    }

    if (imageData) {
      // Aplicar corrección de orientación
      ctx.save()
      ctx.scale(1, -1)
      ctx.translate(0, -canvas.height)
      ctx.putImageData(imageData, 0, 0)
      ctx.restore()
    }
  }

  // ============================================
  // 🎯 FUNCIONES DE CREACIÓN DE SLICES
  // ============================================

  /**
   * Crea ImageData para cualquier tipo de vista
   */
  function createSliceImageData(
    ctx,
    viewType,
    volumeData,
    width,
    height,
    depth,
    sliceIndex,
    applyWindowLevel,
    showSegmentation,
    currentModality
  ) {
    switch (viewType) {
      case 'axial':
        return createAxialSlice(ctx, volumeData, width, height, depth, sliceIndex, applyWindowLevel, { showSegmentation, currentModality })
      case 'coronal':
        return createCoronalSlice(ctx, volumeData, width, height, depth, sliceIndex, applyWindowLevel, { showSegmentation, currentModality })
      case 'sagittal':
        return createSagittalSlice(ctx, volumeData, width, height, depth, sliceIndex, applyWindowLevel, { showSegmentation, currentModality })
      default:
        return { w: 0, h: 0, imageData: null }
    }
  }

  /**
   * Crea slice axial (vista desde arriba)
   */
  function createAxialSlice(
    ctx,
    volumeData,
    width,
    height,
    depth,
    sliceIndex,
    applyWindowLevel,
    options = {}
  ) {
    const w = width
    const h = height
    const imageData = ctx.createImageData(w, h)

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = x + y * width + sliceIndex * width * height
        let value = volumeData[idx] || 0
        const pixelIndex = (x + y * w) * 4

        if (options.showSegmentation || options.currentModality === 'seg') {
          applySegmentationColor(imageData.data, pixelIndex, value)
        } else {
          value = applyWindowLevel(value)
          imageData.data[pixelIndex] = value
          imageData.data[pixelIndex + 1] = value
          imageData.data[pixelIndex + 2] = value
        }

        imageData.data[pixelIndex + 3] = 255
      }
    }

    return { w, h, imageData }
  }

  /**
   * Crea slice coronal (vista frontal)
   */
  function createCoronalSlice(
    ctx,
    volumeData,
    width,
    height,
    depth,
    sliceIndex,
    applyWindowLevel,
    options = {}
  ) {
    const w = width
    const h = depth
    const imageData = ctx.createImageData(w, h)

    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const idx = x + sliceIndex * width + z * width * height
        let value = volumeData[idx] || 0
        const pixelIndex = (x + z * w) * 4

        if (options.showSegmentation || options.currentModality === 'seg') {
          applySegmentationColor(imageData.data, pixelIndex, value)
        } else {
          value = applyWindowLevel(value)
          imageData.data[pixelIndex] = value
          imageData.data[pixelIndex + 1] = value
          imageData.data[pixelIndex + 2] = value
        }

        imageData.data[pixelIndex + 3] = 255
      }
    }

    return { w, h, imageData }
  }

  /**
   * Crea slice sagital (vista lateral)
   */
  function createSagittalSlice(
    ctx,
    volumeData,
    width,
    height,
    depth,
    sliceIndex,
    applyWindowLevel,
    options = {}
  ) {
    const w = height
    const h = depth
    const imageData = ctx.createImageData(w, h)

    for (let z = 0; z < h; z++) {
      for (let y = 0; y < w; y++) {
        const idx = sliceIndex + y * width + z * width * height
        let value = volumeData[idx] || 0
        const pixelIndex = (y + z * w) * 4

        if (options.showSegmentation || options.currentModality === 'seg') {
          applySegmentationColor(imageData.data, pixelIndex, value)
        } else {
          value = applyWindowLevel(value)
          imageData.data[pixelIndex] = value
          imageData.data[pixelIndex + 1] = value
          imageData.data[pixelIndex + 2] = value
        }

        imageData.data[pixelIndex + 3] = 255
      }
    }

    return { w, h, imageData }
  }

  // ============================================
  // 🎨 FUNCIONES DE DIBUJO AUXILIARES
  // ============================================

  /**
   * Dibuja crosshairs en el canvas
   *
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D
   * @param {number} canvasWidth - Ancho del canvas
   * @param {number} canvasHeight - Alto del canvas
   * @param {number} offsetX - Offset X de la imagen
   * @param {number} offsetY - Offset Y de la imagen
   * @param {number} imgWidth - Ancho de la imagen escalada
   * @param {number} imgHeight - Alto de la imagen escalada
   * @param {string} viewType - Tipo de vista
   * @param {Object} crosshairPositions - Posiciones de crosshairs {x, y}
   * @param {string} color - Color de los crosshairs
   */
  function drawCrosshairs(
    ctx,
    canvasWidth,
    canvasHeight,
    offsetX = 0,
    offsetY = 0,
    imgWidth = canvasWidth,
    imgHeight = canvasHeight,
    viewType = null,
    crosshairPositions = null,
    color = '#00FF00'
  ) {
    ctx.save()

    ctx.strokeStyle = color

    // Adaptar grosor de línea según tamaño del canvas
    const baseLineWidth = Math.min(canvasWidth, canvasHeight) / 200
    ctx.lineWidth = Math.max(1, Math.min(3, baseLineWidth))

    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.8

    // Calcular posición central
    let centerX, centerY
    if (viewType && crosshairPositions && crosshairPositions[viewType]) {
      centerX = offsetX + imgWidth * crosshairPositions[viewType].x
      centerY = offsetY + imgHeight * crosshairPositions[viewType].y
    } else {
      centerX = offsetX + imgWidth / 2
      centerY = offsetY + imgHeight / 2
    }

    ctx.beginPath()

    // Línea vertical
    ctx.moveTo(centerX, offsetY)
    ctx.lineTo(centerX, offsetY + imgHeight)

    // Línea horizontal
    ctx.moveTo(offsetX, centerY)
    ctx.lineTo(offsetX + imgWidth, centerY)

    ctx.stroke()

    ctx.restore()
  }

  /**
   * Dibuja crosshairs interactivos
   *
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D
   * @param {HTMLCanvasElement} canvas - Canvas
   * @param {string} viewType - Tipo de vista
   * @param {Object} crosshairsData - Datos de crosshairs {x, y, visible}
   * @param {Object} config - Configuración {color, hoverColor, lineWidth, opacity}
   * @param {boolean} isHovering - Si el mouse está sobre el crosshair
   */
  function drawInteractiveCrosshairs(
    ctx,
    canvas,
    viewType,
    crosshairsData,
    config,
    isHovering = false
  ) {
    if (!crosshairsData.visible) return

    ctx.save()

    ctx.strokeStyle = isHovering ? config.hoverColor : config.color
    ctx.lineWidth = config.lineWidth
    ctx.globalAlpha = isHovering ? config.hoverOpacity : config.opacity
    ctx.setLineDash(config.dashPattern || [5, 3])

    // Calcular posición en canvas
    const scaleX = canvas.width / getViewWidth(viewType)
    const scaleY = canvas.height / getViewHeight(viewType)

    const canvasX = crosshairsData.x * scaleX
    const canvasY = crosshairsData.y * scaleY

    // Dibujar líneas
    ctx.beginPath()
    ctx.moveTo(canvasX, 0)
    ctx.lineTo(canvasX, canvas.height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, canvasY)
    ctx.lineTo(canvas.width, canvasY)
    ctx.stroke()

    // Dibujar cursor central
    const cursorSize = config.cursorSize || 10
    ctx.setLineDash([])
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(canvasX - cursorSize, canvasY - cursorSize)
    ctx.lineTo(canvasX + cursorSize, canvasY + cursorSize)
    ctx.moveTo(canvasX - cursorSize, canvasY + cursorSize)
    ctx.lineTo(canvasX + cursorSize, canvasY - cursorSize)
    ctx.stroke()

    ctx.restore()
  }

  /**
   * Dibuja mediciones en el canvas
   *
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D
   * @param {number} canvasWidth - Ancho del canvas
   * @param {number} canvasHeight - Alto del canvas
   * @param {Array} measurements - Array de mediciones
   * @param {string} viewType - Tipo de vista
   * @param {number} currentSlice - Slice actual
   */
  function drawMeasurements(
    ctx,
    canvasWidth,
    canvasHeight,
    measurements,
    viewType,
    currentSlice
  ) {
    ctx.save()

    measurements.forEach((measurement, index) => {
      // Solo dibujar mediciones de la vista y slice actual
      if (measurement.view !== viewType || measurement.slice !== currentSlice) {
        return
      }

      if (measurement.points.length !== 2) return

      const p1 = measurement.points[0]
      const p2 = measurement.points[1]

      // Convertir coordenadas relativas a píxeles
      const px1 = {
        x: p1.x * canvasWidth,
        y: p1.y * canvasHeight
      }
      const px2 = {
        x: p2.x * canvasWidth,
        y: p2.y * canvasHeight
      }

      // Determinar color según si es medición actual o guardada
      const isCurrentMeasurement = index === measurements.length - 1
      const color = isCurrentMeasurement ? 'red' : '#ff6b6b'

      // Dibujar línea
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px1.x, px1.y)
      ctx.lineTo(px2.x, px2.y)
      ctx.stroke()

      // Dibujar puntos
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(px1.x, px1.y, 3, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(px2.x, px2.y, 3, 0, 2 * Math.PI)
      ctx.fill()

      // Dibujar etiqueta
      const midX = (px1.x + px2.x) / 2
      const midY = (px1.y + px2.y) / 2

      let measureText = `${measurement.distance} px`
      if (measurement.distanceMm) {
        measureText += ` (${measurement.distanceMm} mm)`
      }

      ctx.font = isCurrentMeasurement ? '12px Arial' : '10px Arial'
      ctx.fillStyle = 'white'
      ctx.strokeStyle = 'black'
      ctx.lineWidth = 3

      const textWidth = ctx.measureText(measureText).width

      // Fondo
      ctx.fillStyle = isCurrentMeasurement ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 107, 107, 0.8)'
      ctx.fillRect(midX - textWidth / 2 - 3, midY - 15, textWidth + 6, 15)

      // Texto
      ctx.strokeText(measureText, midX - textWidth / 2, midY - 5)
      ctx.fillStyle = 'white'
      ctx.fillText(measureText, midX - textWidth / 2, midY - 5)
    })

    ctx.restore()
  }

  // ============================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Aplica color de segmentación a un píxel
   */
  function applySegmentationColor(dataArray, pixelIndex, value) {
    const color = segmentationColors[value]

    if (color) {
      dataArray[pixelIndex] = color.r
      dataArray[pixelIndex + 1] = color.g
      dataArray[pixelIndex + 2] = color.b
    } else {
      // Fondo negro
      dataArray[pixelIndex] = 0
      dataArray[pixelIndex + 1] = 0
      dataArray[pixelIndex + 2] = 0
    }
  }

  /**
   * Aplica transformación de zoom
   */
  function applyZoomTransform(ctx, zoomLevel, zoomOrigin, zoomTranslate) {
    ctx.translate(zoomTranslate.x, zoomTranslate.y)
    ctx.translate(zoomOrigin.x, zoomOrigin.y)
    ctx.scale(zoomLevel, zoomLevel)
    ctx.translate(-zoomOrigin.x, -zoomOrigin.y)
  }

  /**
   * Calcula el layout de la imagen en el canvas
   */
  function calculateImageLayout(imageW, imageH, canvasW, canvasH) {
    const scaleX = canvasW / imageW
    const scaleY = canvasH / imageH
    const scale = Math.min(scaleX, scaleY)

    const scaledW = imageW * scale
    const scaledH = imageH * scale
    const offsetX = (canvasW - scaledW) / 2
    const offsetY = (canvasH - scaledH) / 2

    return { offsetX, offsetY, scaledW, scaledH, scale }
  }

  /**
   * Obtiene el ancho de una vista específica
   */
  function getViewWidth(viewType) {
    // Esta función necesitaría acceso a las dimensiones del volumen
    // Se debe pasar como parámetro o usar un store compartido
    return 256 // Placeholder
  }

  /**
   * Obtiene el alto de una vista específica
   */
  function getViewHeight(viewType) {
    // Esta función necesitaría acceso a las dimensiones del volumen
    // Se debe pasar como parámetro o usar un store compartido
    return 256 // Placeholder
  }

  /**
   * Limpia el pool de canvas
   */
  function clearCanvasPool() {
    canvasPool.clear()
    console.log('🧹 Pool de canvas limpiado')
  }

  // ============================================
  // 📤 RETURN - EXPORTAR TODO
  // ============================================

  return {
    // Estado reactivo
    renderConfig,
    segmentationColors,

    // Funciones principales
    drawMainView,
    drawViewWithZoom,
    drawSpecificView,

    // Funciones de creación de slices
    createSliceImageData,
    createAxialSlice,
    createCoronalSlice,
    createSagittalSlice,

    // Funciones de dibujo auxiliares
    drawCrosshairs,
    drawInteractiveCrosshairs,
    drawMeasurements,

    // Funciones auxiliares
    applySegmentationColor,
    applyZoomTransform,
    calculateImageLayout,
    clearCanvasPool,

    // Pool de canvas
    canvasPool
  }
}
