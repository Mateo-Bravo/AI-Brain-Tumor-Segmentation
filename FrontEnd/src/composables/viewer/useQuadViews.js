/**
 * 🔲 useQuadViews.js
 *
 * Composable para gestión de vista cuádruple (4 vistas 2D simultáneas)
 *
 * Funcionalidades:
 * - Gestión de 4 vistas 2D: Axial, Coronal, Sagital y vista personalizada
 * - Layout responsive de cuadrantes 2D
 * - Sincronización entre vistas mediante crosshairs
 * - Renderizado independiente por cuadrante
 * - Gestión de canvas 2D múltiples
 * - Navegación de slices por vista
 * - Redimensionamiento automático
 * - Interacción independiente por cuadrante
 *
 * @author Richard - Sistema de Cuatro Vistas 2D del Visor Médico
 */

import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

/**
 * Composable para gestión de cuatro vistas 2D simultáneas
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para manejo de cuatro vistas 2D
 */
export function useQuadViews(options = {}) {

  // ============================================
  // 📦 OPCIONES Y CONFIGURACIÓN
  // ============================================

  const config = {
    enableSync: options.enableSync !== false,        // Sincronización entre vistas
    defaultLayout: options.defaultLayout || 'quad',  // 'quad', 'row', 'column'
    padding: options.padding || 5,                   // Padding entre cuadrantes (px)
    backgroundColor: options.backgroundColor || '#1a1a1a',
    showLabels: options.showLabels !== false,        // Mostrar etiquetas de vista
    showCrosshairs: options.showCrosshairs !== false // Mostrar crosshairs
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Estado de activación de la vista cuádruple
   */
  const quadViewActive = ref(false)

  /**
   * Referencias a los canvas de cada cuadrante
   */
  const canvasRefs = reactive({
    axial: ref(null),
    coronal: ref(null),
    sagittal: ref(null),
    custom: ref(null)  // Vista personalizada (puede ser otra orientación)
  })

  /**
   * Contextos 2D de los canvas
   */
  const canvasContexts = reactive({
    axial: null,
    coronal: null,
    sagittal: null,
    custom: null
  })

  /**
   * Dimensiones de cada cuadrante
   */
  const quadrantDimensions = reactive({
    axial: { width: 0, height: 0 },
    coronal: { width: 0, height: 0 },
    sagittal: { width: 0, height: 0 },
    custom: { width: 0, height: 0 }
  })

  /**
   * Índices de slices actuales para cada vista
   */
  const currentSlices = reactive({
    axial: 0,
    coronal: 0,
    sagittal: 0,
    custom: 0
  })

  /**
   * Límites de slices para cada vista (según dimensiones del volumen)
   */
  const sliceLimits = reactive({
    axial: { min: 0, max: 0 },
    coronal: { min: 0, max: 0 },
    sagittal: { min: 0, max: 0 },
    custom: { min: 0, max: 0 }
  })

  /**
   * Contenedor principal de las cuatro vistas
   */
  const quadViewContainer = ref(null)

  /**
   * Estado de carga de cada vista
   */
  const loadingState = reactive({
    axial: false,
    coronal: false,
    sagittal: false,
    custom: false
  })

  /**
   * Configuración del layout de cuadrantes
   */
  const layoutConfig = reactive({
    columns: 2,
    rows: 2,
    gap: config.padding,
    mode: config.defaultLayout // 'quad', 'row', 'column', 'custom'
  })

  /**
   * Estado de visibilidad de cada cuadrante
   */
  const quadrantVisibility = reactive({
    axial: true,
    coronal: true,
    sagittal: true,
    custom: true
  })

  /**
   * Cuadrante actualmente enfocado
   */
  const focusedQuadrant = ref(null)

  /**
   * Estado de hover sobre cuadrantes
   */
  const quadrantHover = reactive({
    axial: false,
    coronal: false,
    sagittal: false,
    custom: false
  })

  /**
   * Configuración de zoom por cuadrante
   */
  const quadrantZoom = reactive({
    axial: 1.0,
    coronal: 1.0,
    sagittal: 1.0,
    custom: 1.0
  })

  /**
   * Configuración de pan (desplazamiento) por cuadrante
   */
  const quadrantPan = reactive({
    axial: { x: 0, y: 0 },
    coronal: { x: 0, y: 0 },
    sagittal: { x: 0, y: 0 },
    custom: { x: 0, y: 0 }
  })

  /**
   * Dimensiones del volumen de datos
   */
  const volumeDimensions = reactive({
    width: 0,   // X
    height: 0,  // Y
    depth: 0    // Z
  })

  /**
   * Datos del volumen
   */
  const volumeData = ref(null)

  /**
   * ImageData cacheado por vista y slice
   */
  const imageCache = new Map()

  /**
   * Configuración visual
   */
  const visualConfig = reactive({
    interpolation: 'linear', // 'nearest', 'linear'
    showGrid: false,
    gridSpacing: 50,
    showRuler: false,
    showInfo: true
  })

  // ============================================
  // 🎨 FUNCIONES DE LAYOUT Y DIMENSIONES
  // ============================================

  /**
   * Calcula las dimensiones de cada cuadrante basado en el contenedor
   */
  function calculateQuadrantDimensions() {
    if (!quadViewContainer.value) {
      console.warn('⚠️ Contenedor de cuatro vistas no disponible')
      return
    }

    const container = quadViewContainer.value
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const gap = layoutConfig.gap

    let quadWidth, quadHeight

    switch (layoutConfig.mode) {
      case 'quad':
        // Layout 2x2
        quadWidth = Math.floor((containerWidth - gap * 3) / 2)
        quadHeight = Math.floor((containerHeight - gap * 3) / 2)
        layoutConfig.columns = 2
        layoutConfig.rows = 2
        break

      case 'row':
        // Layout 1x4 (fila)
        quadWidth = Math.floor((containerWidth - gap * 5) / 4)
        quadHeight = Math.floor(containerHeight - gap * 2)
        layoutConfig.columns = 4
        layoutConfig.rows = 1
        break

      case 'column':
        // Layout 4x1 (columna)
        quadWidth = Math.floor(containerWidth - gap * 2)
        quadHeight = Math.floor((containerHeight - gap * 5) / 4)
        layoutConfig.columns = 1
        layoutConfig.rows = 4
        break

      default:
        // Layout 2x2 por defecto
        quadWidth = Math.floor((containerWidth - gap * 3) / 2)
        quadHeight = Math.floor((containerHeight - gap * 3) / 2)
        layoutConfig.columns = 2
        layoutConfig.rows = 2
    }

    // Actualizar dimensiones para todas las vistas
    Object.keys(quadrantDimensions).forEach(view => {
      quadrantDimensions[view].width = quadWidth
      quadrantDimensions[view].height = quadHeight
    })

    console.log('📐 Dimensiones de cuadrantes calculadas:', {
      container: { width: containerWidth, height: containerHeight },
      quadrant: { width: quadWidth, height: quadHeight },
      layout: layoutConfig.mode
    })
  }

  /**
   * Redimensiona todos los canvas al tamaño de sus cuadrantes
   */
  function resizeAllCanvases() {
    Object.keys(canvasRefs).forEach(view => {
      const canvas = canvasRefs[view].value
      if (canvas) {
        const dim = quadrantDimensions[view]
        canvas.width = dim.width
        canvas.height = dim.height

        // Actualizar contexto
        const ctx = canvas.getContext('2d')
        canvasContexts[view] = ctx

        // Configurar interpolación
        if (ctx) {
          ctx.imageSmoothingEnabled = visualConfig.interpolation === 'linear'
        }
      }
    })

    console.log('🔄 Todos los canvas redimensionados')
  }

  /**
   * Calcula la posición de un cuadrante en el layout
   * @param {string} quadrant - Nombre del cuadrante
   * @returns {Object} {x, y, width, height} en píxeles
   */
  function getQuadrantPosition(quadrant) {
    const gap = layoutConfig.gap
    const dim = quadrantDimensions[quadrant]

    // Orden de las vistas: axial, coronal, sagittal, custom
    const viewOrder = ['axial', 'coronal', 'sagittal', 'custom']
    const index = viewOrder.indexOf(quadrant)

    let x, y

    switch (layoutConfig.mode) {
      case 'quad':
        // Grid 2x2
        x = (index % 2) * (dim.width + gap) + gap
        y = Math.floor(index / 2) * (dim.height + gap) + gap
        break

      case 'row':
        // Fila horizontal
        x = index * (dim.width + gap) + gap
        y = gap
        break

      case 'column':
        // Columna vertical
        x = gap
        y = index * (dim.height + gap) + gap
        break

      default:
        // Grid 2x2 por defecto
        x = (index % 2) * (dim.width + gap) + gap
        y = Math.floor(index / 2) * (dim.height + gap) + gap
    }

    return {
      x,
      y,
      width: dim.width,
      height: dim.height
    }
  }

  /**
   * Cambia el modo de layout
   * @param {string} mode - Modo de layout ('quad', 'row', 'column')
   */
  function changeLayoutMode(mode) {
    if (['quad', 'row', 'column'].includes(mode)) {
      layoutConfig.mode = mode
      calculateQuadrantDimensions()
      resizeAllCanvases()
      console.log(`📐 Layout cambiado a: ${mode}`)
    }
  }

  // ============================================
  // 🎬 INICIALIZACIÓN Y LIMPIEZA
  // ============================================

  /**
   * Inicializa la vista cuádruple
   */
  async function initializeQuadView() {
    console.log('🎬 Inicializando vista cuádruple 2D...')

    try {
      quadViewActive.value = true

      await nextTick()

      // Calcular dimensiones
      calculateQuadrantDimensions()

      // Redimensionar canvas
      resizeAllCanvases()

      console.log('✅ Vista cuádruple 2D inicializada correctamente')

      return true
    } catch (error) {
      console.error('❌ Error inicializando vista cuádruple:', error)
      return false
    }
  }

  /**
   * Limpia recursos de la vista cuádruple
   */
  function cleanupQuadView() {
    console.log('🧹 Limpiando vista cuádruple 2D...')

    // Limpiar contextos de canvas
    Object.keys(canvasContexts).forEach(view => {
      const ctx = canvasContexts[view]
      if (ctx) {
        const canvas = canvasRefs[view].value
        if (canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
      canvasContexts[view] = null
    })

    // Limpiar cache
    clearImageCache()

    quadViewActive.value = false

    console.log('✅ Vista cuádruple 2D limpiada')
  }

  /**
   * Desactiva la vista cuádruple y vuelve a vista individual
   */
  function deactivateQuadView() {
    cleanupQuadView()
    quadViewActive.value = false
  }

  // ============================================
  // 🖼️ FUNCIONES DE RENDERIZADO
  // ============================================

  /**
   * Actualiza el volumen de datos
   * @param {Uint8Array|Float32Array} data - Datos del volumen
   * @param {number} width - Ancho (X)
   * @param {number} height - Alto (Y)
   * @param {number} depth - Profundidad (Z)
   */
  function updateVolumeData(data, width, height, depth) {
    volumeData.value = data
    volumeDimensions.width = width
    volumeDimensions.height = height
    volumeDimensions.depth = depth

    // Actualizar límites de slices
    sliceLimits.axial.max = depth - 1
    sliceLimits.coronal.max = height - 1
    sliceLimits.sagittal.max = width - 1
    sliceLimits.custom.max = Math.max(width, height, depth) - 1

    // Centrar slices iniciales
    currentSlices.axial = Math.floor(depth / 2)
    currentSlices.coronal = Math.floor(height / 2)
    currentSlices.sagittal = Math.floor(width / 2)
    currentSlices.custom = Math.floor(depth / 2)

    // Limpiar cache al cambiar datos
    clearImageCache()

    console.log('📦 Volumen actualizado:', { width, height, depth })
  }

  /**
   * Extrae un slice del volumen según la orientación
   * @param {string} orientation - Orientación ('axial', 'coronal', 'sagittal')
   * @param {number} sliceIndex - Índice del slice
   * @returns {Uint8Array|null} Datos del slice
   */
  function extractSlice(orientation, sliceIndex) {
    if (!volumeData.value) return null

    const { width, height, depth } = volumeDimensions
    let sliceData

    switch (orientation) {
      case 'axial':
        // Slice XY en índice Z
        if (sliceIndex < 0 || sliceIndex >= depth) return null
        sliceData = new Uint8Array(width * height)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const volIndex = sliceIndex * width * height + y * width + x
            sliceData[y * width + x] = volumeData.value[volIndex]
          }
        }
        break

      case 'coronal':
        // Slice XZ en índice Y
        if (sliceIndex < 0 || sliceIndex >= height) return null
        sliceData = new Uint8Array(width * depth)
        for (let z = 0; z < depth; z++) {
          for (let x = 0; x < width; x++) {
            const volIndex = z * width * height + sliceIndex * width + x
            sliceData[z * width + x] = volumeData.value[volIndex]
          }
        }
        break

      case 'sagittal':
        // Slice YZ en índice X
        if (sliceIndex < 0 || sliceIndex >= width) return null
        sliceData = new Uint8Array(height * depth)
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            const volIndex = z * width * height + y * width + sliceIndex
            sliceData[z * height + y] = volumeData.value[volIndex]
          }
        }
        break

      default:
        return null
    }

    return sliceData
  }

  /**
   * Convierte slice data a ImageData
   * @param {Uint8Array} sliceData - Datos del slice
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @returns {ImageData} ImageData
   */
  function sliceToImageData(sliceData, width, height) {
    const imageData = new ImageData(width, height)
    const data = imageData.data

    for (let i = 0; i < sliceData.length; i++) {
      const value = sliceData[i]
      const idx = i * 4
      data[idx] = value     // R
      data[idx + 1] = value // G
      data[idx + 2] = value // B
      data[idx + 3] = 255   // A
    }

    return imageData
  }

  /**
   * Renderiza una vista específica
   * @param {string} view - Vista a renderizar ('axial', 'coronal', 'sagittal', 'custom')
   */
  function renderView(view) {
    const ctx = canvasContexts[view]
    const canvas = canvasRefs[view].value

    if (!ctx || !canvas || !volumeData.value) {
      return
    }

    const sliceIndex = currentSlices[view]

    // Buscar en cache
    const cacheKey = `${view}_${sliceIndex}`
    let imageData = imageCache.get(cacheKey)

    if (!imageData) {
      // Extraer slice
      let sliceData
      let sliceWidth, sliceHeight

      switch (view) {
        case 'axial':
          sliceData = extractSlice('axial', sliceIndex)
          sliceWidth = volumeDimensions.width
          sliceHeight = volumeDimensions.height
          break
        case 'coronal':
          sliceData = extractSlice('coronal', sliceIndex)
          sliceWidth = volumeDimensions.width
          sliceHeight = volumeDimensions.depth
          break
        case 'sagittal':
          sliceData = extractSlice('sagittal', sliceIndex)
          sliceWidth = volumeDimensions.height
          sliceHeight = volumeDimensions.depth
          break
        case 'custom':
          // Por defecto, igual que axial
          sliceData = extractSlice('axial', sliceIndex)
          sliceWidth = volumeDimensions.width
          sliceHeight = volumeDimensions.height
          break
        default:
          return
      }

      if (!sliceData) return

      // Convertir a ImageData
      imageData = sliceToImageData(sliceData, sliceWidth, sliceHeight)

      // Cachear
      imageCache.set(cacheKey, imageData)
    }

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Aplicar transformaciones (zoom y pan)
    ctx.save()

    const zoom = quadrantZoom[view]
    const pan = quadrantPan[view]

    // Centrar en el canvas
    const offsetX = (canvas.width - imageData.width * zoom) / 2 + pan.x
    const offsetY = (canvas.height - imageData.height * zoom) / 2 + pan.y

    // Dibujar imagen escalada
    ctx.imageSmoothingEnabled = visualConfig.interpolation === 'linear'

    // Crear canvas temporal para la imagen
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(imageData, 0, 0)

    // Dibujar en el canvas principal con zoom
    ctx.drawImage(
      tempCanvas,
      0, 0, imageData.width, imageData.height,
      offsetX, offsetY, imageData.width * zoom, imageData.height * zoom
    )

    ctx.restore()

    // Dibujar elementos adicionales
    if (config.showLabels) {
      drawViewLabel(ctx, view)
    }

    if (visualConfig.showInfo) {
      drawViewInfo(ctx, view)
    }

    if (visualConfig.showGrid) {
      drawGrid(ctx)
    }
  }

  /**
   * Renderiza todas las vistas visibles
   */
  function renderAllViews() {
    Object.keys(canvasRefs).forEach(view => {
      if (quadrantVisibility[view]) {
        renderView(view)
      }
    })
  }

  /**
   * Dibuja la etiqueta de la vista
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {string} view - Vista
   */
  function drawViewLabel(ctx, view) {
    const labels = {
      axial: 'AXIAL (Z)',
      coronal: 'CORONAL (Y)',
      sagittal: 'SAGITAL (X)',
      custom: 'CUSTOM'
    }

    ctx.save()
    ctx.fillStyle = quadrantHover[view] ? '#00FF00' : '#FFFFFF'
    ctx.font = 'bold 14px Arial'
    ctx.fillText(labels[view], 10, 20)
    ctx.restore()
  }

  /**
   * Dibuja información de la vista (slice actual, zoom, etc.)
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {string} view - Vista
   */
  function drawViewInfo(ctx, view) {
    const canvas = canvasRefs[view].value
    if (!canvas) return

    const sliceIndex = currentSlices[view]
    const maxSlice = sliceLimits[view].max
    const zoom = quadrantZoom[view]

    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(canvas.width - 120, canvas.height - 50, 110, 40)

    ctx.fillStyle = '#00FF00'
    ctx.font = '11px monospace'
    ctx.fillText(`Slice: ${sliceIndex + 1}/${maxSlice + 1}`, canvas.width - 115, canvas.height - 30)
    ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, canvas.width - 115, canvas.height - 15)
    ctx.restore()
  }

  /**
   * Dibuja una grilla de referencia
   * @param {CanvasRenderingContext2D} ctx - Contexto
   */
  function drawGrid(ctx) {
    const canvas = ctx.canvas
    const spacing = visualConfig.gridSpacing

    ctx.save()
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)'
    ctx.lineWidth = 1

    // Líneas verticales
    for (let x = 0; x < canvas.width; x += spacing) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    // Líneas horizontales
    for (let y = 0; y < canvas.height; y += spacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    ctx.restore()
  }

  // ============================================
  // 🎯 NAVEGACIÓN DE SLICES
  // ============================================

  /**
   * Navega a un slice específico
   * @param {string} view - Vista
   * @param {number} sliceIndex - Índice del slice
   */
  function goToSlice(view, sliceIndex) {
    const min = sliceLimits[view].min
    const max = sliceLimits[view].max

    // Validar límites
    if (sliceIndex < min || sliceIndex > max) {
      console.warn(`⚠️ Slice ${sliceIndex} fuera de límites [${min}, ${max}]`)
      return
    }

    currentSlices[view] = sliceIndex

    // Re-renderizar vista
    renderView(view)
  }

  /**
   * Navega al siguiente slice
   * @param {string} view - Vista
   */
  function nextSlice(view) {
    const current = currentSlices[view]
    const max = sliceLimits[view].max

    if (current < max) {
      goToSlice(view, current + 1)
    }
  }

  /**
   * Navega al slice anterior
   * @param {string} view - Vista
   */
  function previousSlice(view) {
    const current = currentSlices[view]
    const min = sliceLimits[view].min

    if (current > min) {
      goToSlice(view, current - 1)
    }
  }

  /**
   * Navega con delta (rueda del mouse)
   * @param {string} view - Vista
   * @param {number} delta - Delta de navegación
   */
  function navigateSliceByDelta(view, delta) {
    const direction = delta > 0 ? 1 : -1

    if (direction > 0) {
      nextSlice(view)
    } else {
      previousSlice(view)
    }
  }

  // ============================================
  // 🔍 ZOOM Y PAN
  // ============================================

  /**
   * Aplica zoom a una vista
   * @param {string} view - Vista
   * @param {number} zoomDelta - Delta de zoom
   * @param {number} centerX - Centro X del zoom (opcional)
   * @param {number} centerY - Centro Y del zoom (opcional)
   */
  function applyZoom(view, zoomDelta, centerX = null, centerY = null) {
    const currentZoom = quadrantZoom[view]
    let newZoom = currentZoom * (1 + zoomDelta * 0.1)

    // Limitar zoom entre 0.1x y 10x
    newZoom = Math.max(0.1, Math.min(10, newZoom))

    quadrantZoom[view] = newZoom

    // Si se proporciona centro, ajustar pan para mantener el punto bajo el cursor
    if (centerX !== null && centerY !== null) {
      const zoomRatio = newZoom / currentZoom
      const canvas = canvasRefs[view].value
      if (canvas) {
        const centerXRel = centerX - canvas.width / 2
        const centerYRel = centerY - canvas.height / 2

        quadrantPan[view].x -= centerXRel * (zoomRatio - 1)
        quadrantPan[view].y -= centerYRel * (zoomRatio - 1)
      }
    }

    renderView(view)
  }

  /**
   * Resetea zoom a 1.0
   * @param {string} view - Vista
   */
  function resetZoom(view) {
    quadrantZoom[view] = 1.0
    quadrantPan[view] = { x: 0, y: 0 }
    renderView(view)
  }

  /**
   * Resetea zoom de todas las vistas
   */
  function resetAllZoom() {
    Object.keys(quadrantZoom).forEach(view => {
      resetZoom(view)
    })
  }

  /**
   * Aplica pan (desplazamiento) a una vista
   * @param {string} view - Vista
   * @param {number} deltaX - Delta X
   * @param {number} deltaY - Delta Y
   */
  function applyPan(view, deltaX, deltaY) {
    quadrantPan[view].x += deltaX
    quadrantPan[view].y += deltaY
    renderView(view)
  }

  /**
   * Resetea pan
   * @param {string} view - Vista
   */
  function resetPan(view) {
    quadrantPan[view] = { x: 0, y: 0 }
    renderView(view)
  }

  // ============================================
  // 🎯 FUNCIONES DE ENFOQUE Y NAVEGACIÓN
  // ============================================

  /**
   * Enfoca un cuadrante específico
   * @param {string} quadrant - Cuadrante a enfocar
   */
  function focusQuadrant(quadrant) {
    focusedQuadrant.value = quadrant
    console.log(`🎯 Cuadrante enfocado: ${quadrant}`)
  }

  /**
   * Desenfoca todos los cuadrantes
   */
  function unfocusQuadrant() {
    focusedQuadrant.value = null
  }

  /**
   * Alterna la visibilidad de un cuadrante
   * @param {string} quadrant - Cuadrante
   */
  function toggleQuadrantVisibility(quadrant) {
    quadrantVisibility[quadrant] = !quadrantVisibility[quadrant]

    if (!quadrantVisibility[quadrant]) {
      // Limpiar canvas si se oculta
      const ctx = canvasContexts[quadrant]
      const canvas = canvasRefs[quadrant].value
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    } else {
      // Re-renderizar si se muestra
      renderView(quadrant)
    }
  }

  /**
   * Maximiza un cuadrante (oculta los demás)
   * @param {string} quadrant - Cuadrante a maximizar
   */
  function maximizeQuadrant(quadrant) {
    Object.keys(quadrantVisibility).forEach(key => {
      quadrantVisibility[key] = key === quadrant
    })

    // Solo renderizar el maximizado
    renderView(quadrant)
  }

  /**
   * Restaura la visibilidad de todos los cuadrantes
   */
  function restoreAllQuadrants() {
    Object.keys(quadrantVisibility).forEach(key => {
      quadrantVisibility[key] = true
    })

    renderAllViews()
  }

  // ============================================
  // 💾 CACHE DE IMÁGENES
  // ============================================

  /**
   * Limpia el cache de imágenes
   */
  function clearImageCache() {
    imageCache.clear()
    console.log('🧹 Cache de imágenes limpiado')
  }

  /**
   * Limpia cache de una vista específica
   * @param {string} view - Vista
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

  /**
   * Pre-carga slices adyacentes para navegación fluida
   * @param {string} view - Vista
   * @param {number} range - Rango de slices a pre-cargar (antes y después)
   */
  function precacheSlices(view, range = 2) {
    const currentSlice = currentSlices[view]
    const min = sliceLimits[view].min
    const max = sliceLimits[view].max

    for (let i = -range; i <= range; i++) {
      const sliceIndex = currentSlice + i
      if (sliceIndex >= min && sliceIndex <= max) {
        const cacheKey = `${view}_${sliceIndex}`

        if (!imageCache.has(cacheKey)) {
          // Extraer y cachear slice
          let sliceData, sliceWidth, sliceHeight

          switch (view) {
            case 'axial':
              sliceData = extractSlice('axial', sliceIndex)
              sliceWidth = volumeDimensions.width
              sliceHeight = volumeDimensions.height
              break
            case 'coronal':
              sliceData = extractSlice('coronal', sliceIndex)
              sliceWidth = volumeDimensions.width
              sliceHeight = volumeDimensions.depth
              break
            case 'sagittal':
              sliceData = extractSlice('sagittal', sliceIndex)
              sliceWidth = volumeDimensions.height
              sliceHeight = volumeDimensions.depth
              break
          }

          if (sliceData) {
            const imageData = sliceToImageData(sliceData, sliceWidth, sliceHeight)
            imageCache.set(cacheKey, imageData)
          }
        }
      }
    }
  }

  // ============================================
  // 🔄 FUNCIONES DE ACTUALIZACIÓN
  // ============================================

  /**
   * Refresca todas las vistas
   */
  function refreshAllViews() {
    if (!quadViewActive.value) return

    calculateQuadrantDimensions()
    resizeAllCanvases()
    renderAllViews()
  }

  /**
   * Actualiza configuración visual
   * @param {Object} config - Nueva configuración
   */
  function updateVisualConfig(config) {
    Object.assign(visualConfig, config)

    // Re-configurar contextos si cambió la interpolación
    if ('interpolation' in config) {
      Object.keys(canvasContexts).forEach(view => {
        const ctx = canvasContexts[view]
        if (ctx) {
          ctx.imageSmoothingEnabled = config.interpolation === 'linear'
        }
      })
    }

    renderAllViews()
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general de las cuatro vistas
   */
  const quadViewState = computed(() => ({
    isActive: quadViewActive.value,
    focusedQuadrant: focusedQuadrant.value,
    visibleQuadrants: Object.entries(quadrantVisibility)
      .filter(([_, visible]) => visible)
      .map(([name]) => name),
    layoutMode: layoutConfig.mode
  }))

  /**
   * Número de cuadrantes visibles
   */
  const visibleQuadrantCount = computed(() =>
    Object.values(quadrantVisibility).filter(v => v).length
  )

  /**
   * Verifica si todas las vistas están cargadas
   */
  const allViewsLoaded = computed(() =>
    !Object.values(loadingState).some(loading => loading)
  )

  /**
   * Información de todas las vistas
   */
  const viewsInfo = computed(() => ({
    axial: {
      currentSlice: currentSlices.axial,
      maxSlice: sliceLimits.axial.max,
      zoom: quadrantZoom.axial,
      visible: quadrantVisibility.axial
    },
    coronal: {
      currentSlice: currentSlices.coronal,
      maxSlice: sliceLimits.coronal.max,
      zoom: quadrantZoom.coronal,
      visible: quadrantVisibility.coronal
    },
    sagittal: {
      currentSlice: currentSlices.sagittal,
      maxSlice: sliceLimits.sagittal.max,
      zoom: quadrantZoom.sagittal,
      visible: quadrantVisibility.sagittal
    },
    custom: {
      currentSlice: currentSlices.custom,
      maxSlice: sliceLimits.custom.max,
      zoom: quadrantZoom.custom,
      visible: quadrantVisibility.custom
    }
  }))

  /**
   * Tamaño del cache
   */
  const cacheSize = computed(() => imageCache.size)

  // ============================================
  // 👁️ WATCHERS
  // ============================================

  /**
   * Watch para redimensionar cuando cambie el estado de activación
   */
  watch(quadViewActive, async (newValue) => {
    if (newValue) {
      await nextTick()
      refreshAllViews()
    }
  })

  /**
   * Watch para redimensionar cuando cambien las dimensiones del contenedor
   */
  watch(() => quadViewContainer.value, async (newContainer) => {
    if (newContainer && quadViewActive.value) {
      await nextTick()
      refreshAllViews()
    }
  })

  // ============================================
  // 🎬 LIFECYCLE HOOKS
  // ============================================

  /**
   * Configurar resize observer
   */
  let resizeObserver = null

  onMounted(() => {
    if (quadViewContainer.value) {
      resizeObserver = new ResizeObserver(() => {
        if (quadViewActive.value) {
          refreshAllViews()
        }
      })
      resizeObserver.observe(quadViewContainer.value)
    }
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    cleanupQuadView()
  })

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    quadViewActive,
    canvasRefs,
    canvasContexts,
    quadrantDimensions,
    currentSlices,
    sliceLimits,
    quadViewContainer,
    loadingState,
    layoutConfig,
    quadrantVisibility,
    focusedQuadrant,
    quadrantHover,
    quadrantZoom,
    quadrantPan,
    volumeDimensions,
    volumeData,
    visualConfig,

    // Funciones de layout
    calculateQuadrantDimensions,
    resizeAllCanvases,
    getQuadrantPosition,
    changeLayoutMode,

    // Funciones de inicialización
    initializeQuadView,
    cleanupQuadView,
    deactivateQuadView,

    // Funciones de renderizado
    updateVolumeData,
    extractSlice,
    sliceToImageData,
    renderView,
    renderAllViews,
    drawViewLabel,
    drawViewInfo,
    drawGrid,

    // Navegación de slices
    goToSlice,
    nextSlice,
    previousSlice,
    navigateSliceByDelta,

    // Zoom y pan
    applyZoom,
    resetZoom,
    resetAllZoom,
    applyPan,
    resetPan,

    // Funciones de enfoque
    focusQuadrant,
    unfocusQuadrant,
    toggleQuadrantVisibility,
    maximizeQuadrant,
    restoreAllQuadrants,

    // Cache
    clearImageCache,
    clearViewCache,
    precacheSlices,

    // Actualización
    refreshAllViews,
    updateVisualConfig,

    // Computed properties
    quadViewState,
    visibleQuadrantCount,
    allViewsLoaded,
    viewsInfo,
    cacheSize
  }
}
