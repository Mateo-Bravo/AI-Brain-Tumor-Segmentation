/**
 * 🎨 useCanvasManagement.js
 *
 * Composable para gestión avanzada de canvas
 *
 * Funcionalidades:
 * - Creación y configuración de canvas
 * - Gestión de contextos 2D y WebGL
 * - Redimensionamiento automático y manual
 * - Limpieza y optimización
 * - Captura de imágenes (screenshots)
 * - Gestión de DPI/escala para pantallas de alta resolución
 * - Buffer de doble canvas (offscreen)
 * - Event listeners optimizados
 * - Gestión de memoria
 * - Utilidades de renderizado
 *
 * @author Richard - Gestión de Canvas del Visor Médico
 */

import { computed, onUnmounted, reactive, ref } from 'vue'

/**
 * Composable para gestión de canvas
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para gestión de canvas
 */
export function useCanvasManagement(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    contextType: options.contextType || '2d', // '2d', 'webgl', 'webgl2'
    autoResize: options.autoResize !== false,
    maintainAspectRatio: options.maintainAspectRatio || false,
    aspectRatio: options.aspectRatio || 1, // width/height
    enableHighDPI: options.enableHighDPI !== false,
    backgroundColor: options.backgroundColor || '#000000',
    antialiasing: options.antialiasing !== false,
    preserveDrawingBuffer: options.preserveDrawingBuffer || false,
    alpha: options.alpha !== false,
    premultipliedAlpha: options.premultipliedAlpha || true,
    enableOffscreenBuffer: options.enableOffscreenBuffer || false
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Referencia al canvas principal
   */
  const canvasRef = ref(null)

  /**
   * Contexto de renderizado
   */
  const context = ref(null)

  /**
   * Canvas offscreen (buffer)
   */
  const offscreenCanvas = ref(null)

  /**
   * Contexto del canvas offscreen
   */
  const offscreenContext = ref(null)

  /**
   * Dimensiones del canvas
   */
  const dimensions = reactive({
    width: 0,
    height: 0,
    displayWidth: 0,
    displayHeight: 0
  })

  /**
   * Device Pixel Ratio
   */
  const dpr = ref(1)

  /**
   * Estado de inicialización
   */
  const isInitialized = ref(false)

  /**
   * Estado de redimensionamiento
   */
  const isResizing = ref(false)

  /**
   * Contenedor del canvas
   */
  const containerRef = ref(null)

  /**
   * ResizeObserver
   */
  let resizeObserver = null

  /**
   * AnimationFrame ID para redimensionamiento
   */
  let resizeAnimationId = null

  /**
   * Estadísticas de rendimiento
   */
  const stats = reactive({
    lastRenderTime: 0,
    fps: 0,
    frameCount: 0,
    lastFpsUpdate: 0
  })

  /**
   * Estado de captura
   */
  const captureState = reactive({
    isCapturing: false,
    format: 'png',
    quality: 0.92
  })

  // ============================================
  // 🎬 INICIALIZACIÓN
  // ============================================

  /**
   * Inicializa el canvas
   * @param {HTMLCanvasElement} canvas - Elemento canvas
   * @param {HTMLElement} container - Contenedor del canvas (opcional)
   * @returns {CanvasRenderingContext2D|WebGLRenderingContext} Contexto
   */
  function initialize(canvas, container = null) {
    if (!canvas) {
      console.error('❌ Canvas element is required')
      return null
    }

    try {
      console.log('🎬 Inicializando canvas management...')

      canvasRef.value = canvas
      containerRef.value = container || canvas.parentElement

      // Detectar Device Pixel Ratio
      detectDevicePixelRatio()

      // Crear contexto
      context.value = createContext(canvas)

      if (!context.value) {
        throw new Error('No se pudo crear el contexto de renderizado')
      }

      // Configurar canvas offscreen si está habilitado
      if (config.enableOffscreenBuffer) {
        setupOffscreenCanvas()
      }

      // Configurar auto-resize si está habilitado
      if (config.autoResize) {
        setupAutoResize()
      }

      // Redimensionar inicialmente
      resize()

      isInitialized.value = true

      console.log('✅ Canvas management inicializado:', {
        contextType: config.contextType,
        dpr: dpr.value,
        dimensions: dimensions
      })

      return context.value

    } catch (error) {
      console.error('❌ Error inicializando canvas:', error)
      return null
    }
  }

  /**
   * Crea el contexto de renderizado
   * @param {HTMLCanvasElement} canvas - Canvas
   * @returns {CanvasRenderingContext2D|WebGLRenderingContext} Contexto
   */
  function createContext(canvas) {
    let ctx = null

    switch (config.contextType) {
      case '2d':
        ctx = canvas.getContext('2d', {
          alpha: config.alpha,
          desynchronized: true // Mejora rendimiento
        })

        if (ctx) {
          // Configurar contexto 2D
          ctx.imageSmoothingEnabled = config.antialiasing
          ctx.imageSmoothingQuality = 'high'
        }
        break

      case 'webgl':
      case 'webgl2':
        const contextId = config.contextType === 'webgl2' ? 'webgl2' : 'webgl'

        ctx = canvas.getContext(contextId, {
          alpha: config.alpha,
          antialias: config.antialiasing,
          preserveDrawingBuffer: config.preserveDrawingBuffer,
          premultipliedAlpha: config.premultipliedAlpha,
          powerPreference: 'high-performance'
        })

        if (!ctx && config.contextType === 'webgl2') {
          // Fallback a WebGL 1
          console.warn('⚠️ WebGL2 no disponible, usando WebGL1')
          ctx = canvas.getContext('webgl', {
            alpha: config.alpha,
            antialias: config.antialiasing,
            preserveDrawingBuffer: config.preserveDrawingBuffer,
            premultipliedAlpha: config.premultipliedAlpha,
            powerPreference: 'high-performance'
          })
        }
        break

      default:
        console.error('❌ Tipo de contexto no soportado:', config.contextType)
    }

    return ctx
  }

  /**
   * Configura el canvas offscreen
   */
  function setupOffscreenCanvas() {
    if (!canvasRef.value) return

    try {
      // Crear canvas offscreen
      offscreenCanvas.value = document.createElement('canvas')
      offscreenContext.value = offscreenCanvas.value.getContext('2d')

      console.log('✅ Canvas offscreen configurado')
    } catch (error) {
      console.error('❌ Error configurando canvas offscreen:', error)
    }
  }

  /**
   * Detecta el Device Pixel Ratio
   */
  function detectDevicePixelRatio() {
    dpr.value = config.enableHighDPI
      ? window.devicePixelRatio || 1
      : 1

    console.log('📱 Device Pixel Ratio:', dpr.value)
  }

  // ============================================
  // 📐 REDIMENSIONAMIENTO
  // ============================================

  /**
   * Configura el auto-resize con ResizeObserver
   */
  function setupAutoResize() {
    if (!containerRef.value) {
      console.warn('⚠️ No hay contenedor para auto-resize')
      return
    }

    // Crear ResizeObserver
    resizeObserver = new ResizeObserver(entries => {
      if (resizeAnimationId) {
        cancelAnimationFrame(resizeAnimationId)
      }

      resizeAnimationId = requestAnimationFrame(() => {
        resize()
      })
    })

    // Observar contenedor
    resizeObserver.observe(containerRef.value)

    console.log('🔍 Auto-resize configurado')
  }

  /**
   * Redimensiona el canvas
   * @param {number} width - Ancho (opcional)
   * @param {number} height - Alto (opcional)
   */
  function resize(width = null, height = null) {
    if (!canvasRef.value) return

    isResizing.value = true

    try {
      let targetWidth, targetHeight

      if (width !== null && height !== null) {
        // Usar dimensiones proporcionadas
        targetWidth = width
        targetHeight = height
      } else if (containerRef.value) {
        // Usar dimensiones del contenedor
        const rect = containerRef.value.getBoundingClientRect()
        targetWidth = rect.width
        targetHeight = rect.height
      } else {
        // Usar dimensiones actuales del canvas
        targetWidth = canvasRef.value.clientWidth || canvasRef.value.width
        targetHeight = canvasRef.value.clientHeight || canvasRef.value.height
      }

      // Aplicar aspect ratio si está habilitado
      if (config.maintainAspectRatio) {
        const currentRatio = targetWidth / targetHeight

        if (currentRatio > config.aspectRatio) {
          targetWidth = targetHeight * config.aspectRatio
        } else {
          targetHeight = targetWidth / config.aspectRatio
        }
      }

      // Guardar dimensiones de display
      dimensions.displayWidth = targetWidth
      dimensions.displayHeight = targetHeight

      // Calcular dimensiones reales con DPI
      dimensions.width = Math.floor(targetWidth * dpr.value)
      dimensions.height = Math.floor(targetHeight * dpr.value)

      // Aplicar dimensiones al canvas
      canvasRef.value.width = dimensions.width
      canvasRef.value.height = dimensions.height

      // Aplicar estilo CSS
      canvasRef.value.style.width = `${targetWidth}px`
      canvasRef.value.style.height = `${targetHeight}px`

      // Escalar contexto para DPI
      if (context.value && config.contextType === '2d' && dpr.value !== 1) {
        context.value.scale(dpr.value, dpr.value)
      }

      // Redimensionar canvas offscreen si existe
      if (offscreenCanvas.value) {
        offscreenCanvas.value.width = dimensions.width
        offscreenCanvas.value.height = dimensions.height
      }

      console.log('📐 Canvas redimensionado:', {
        display: { width: targetWidth, height: targetHeight },
        actual: { width: dimensions.width, height: dimensions.height },
        dpr: dpr.value
      })

    } catch (error) {
      console.error('❌ Error redimensionando canvas:', error)
    } finally {
      isResizing.value = false
    }
  }

  /**
   * Actualiza el Device Pixel Ratio y redimensiona
   */
  function updateDPR() {
    detectDevicePixelRatio()
    resize()
  }

  // ============================================
  // 🧹 LIMPIEZA Y OPTIMIZACIÓN
  // ============================================

  /**
   * Limpia el canvas
   * @param {string} color - Color de fondo (opcional)
   */
  function clear(color = null) {
    if (!context.value || !canvasRef.value) return

    const ctx = context.value
    const canvas = canvasRef.value

    if (config.contextType === '2d') {
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    } else if (config.contextType.startsWith('webgl')) {
      const gl = ctx
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }
  }

  /**
   * Limpia un área específica del canvas
   * @param {number} x - X
   * @param {number} y - Y
   * @param {number} width - Ancho
   * @param {number} height - Alto
   */
  function clearArea(x, y, width, height) {
    if (!context.value || config.contextType !== '2d') return

    context.value.clearRect(x, y, width, height)
  }

  /**
   * Rellena el canvas con un color
   * @param {string} color - Color
   */
  function fillCanvas(color) {
    if (!context.value || !canvasRef.value) return

    if (config.contextType === '2d') {
      const ctx = context.value
      ctx.fillStyle = color
      ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    } else if (config.contextType.startsWith('webgl')) {
      const gl = context.value
      const rgb = hexToRgb(color)
      if (rgb) {
        gl.clearColor(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT)
      }
    }
  }

  /**
   * Optimiza el canvas para mejor rendimiento
   */
  function optimize() {
    if (!context.value) return

    if (config.contextType === '2d') {
      // Deshabilitar antialiasing si no es necesario
      context.value.imageSmoothingEnabled = false
    } else if (config.contextType.startsWith('webgl')) {
      const gl = context.value

      // Habilitar optimizaciones WebGL
      gl.enable(gl.DEPTH_TEST)
      gl.enable(gl.CULL_FACE)
      gl.cullFace(gl.BACK)
    }

    console.log('⚡ Canvas optimizado')
  }

  /**
   * Resetea las transformaciones del contexto 2D
   */
  function resetTransform() {
    if (!context.value || config.contextType !== '2d') return

    context.value.setTransform(1, 0, 0, 1, 0, 0)

    // Re-aplicar escala DPI si es necesario
    if (dpr.value !== 1) {
      context.value.scale(dpr.value, dpr.value)
    }
  }

  // ============================================
  // 📸 CAPTURA DE IMÁGENES
  // ============================================

  /**
   * Captura el canvas como imagen
   * @param {string} format - Formato ('png', 'jpeg', 'webp')
   * @param {number} quality - Calidad (0-1)
   * @returns {string} Data URL
   */
  function captureImage(format = 'png', quality = 0.92) {
    if (!canvasRef.value) {
      console.error('❌ Canvas no disponible para captura')
      return null
    }

    captureState.isCapturing = true
    captureState.format = format
    captureState.quality = quality

    try {
      const mimeType = `image/${format}`
      const dataUrl = canvasRef.value.toDataURL(mimeType, quality)

      console.log('📸 Imagen capturada:', { format, quality, size: dataUrl.length })

      return dataUrl

    } catch (error) {
      console.error('❌ Error capturando imagen:', error)
      return null

    } finally {
      captureState.isCapturing = false
    }
  }

  /**
   * Descarga el canvas como imagen
   * @param {string} filename - Nombre del archivo
   * @param {string} format - Formato
   * @param {number} quality - Calidad
   */
  function downloadImage(filename = 'canvas-image', format = 'png', quality = 0.92) {
    const dataUrl = captureImage(format, quality)

    if (!dataUrl) {
      console.error('❌ No se pudo capturar la imagen')
      return
    }

    // Crear enlace de descarga
    const link = document.createElement('a')
    link.download = `${filename}.${format}`
    link.href = dataUrl
    link.click()

    console.log('💾 Imagen descargada:', link.download)
  }

  /**
   * Copia el canvas al portapapeles
   */
  async function copyToClipboard() {
    if (!canvasRef.value) {
      console.error('❌ Canvas no disponible')
      return false
    }

    try {
      const blob = await new Promise(resolve => {
        canvasRef.value.toBlob(resolve, 'image/png')
      })

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])

      console.log('📋 Canvas copiado al portapapeles')
      return true

    } catch (error) {
      console.error('❌ Error copiando al portapapeles:', error)
      return false
    }
  }

  // ============================================
  // 🎨 BUFFER OFFSCREEN
  // ============================================

  /**
   * Copia del canvas principal al offscreen
   */
  function copyToOffscreen() {
    if (!offscreenCanvas.value || !offscreenContext.value || !canvasRef.value) {
      return
    }

    offscreenContext.value.clearRect(0, 0, offscreenCanvas.value.width, offscreenCanvas.value.height)
    offscreenContext.value.drawImage(canvasRef.value, 0, 0)
  }

  /**
   * Copia del offscreen al canvas principal
   */
  function copyFromOffscreen() {
    if (!offscreenCanvas.value || !context.value || config.contextType !== '2d') {
      return
    }

    context.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    context.value.drawImage(offscreenCanvas.value, 0, 0)
  }

  /**
   * Limpia el canvas offscreen
   */
  function clearOffscreen() {
    if (!offscreenCanvas.value || !offscreenContext.value) {
      return
    }

    offscreenContext.value.clearRect(
      0, 0,
      offscreenCanvas.value.width,
      offscreenCanvas.value.height
    )
  }

  // ============================================
  // 📊 ESTADÍSTICAS Y RENDIMIENTO
  // ============================================

  /**
   * Actualiza estadísticas de FPS
   */
  function updateStats() {
    const now = performance.now()
    stats.frameCount++

    if (now - stats.lastFpsUpdate >= 1000) {
      stats.fps = Math.round(stats.frameCount * 1000 / (now - stats.lastFpsUpdate))
      stats.frameCount = 0
      stats.lastFpsUpdate = now
    }

    stats.lastRenderTime = now
  }

  /**
   * Resetea estadísticas
   */
  function resetStats() {
    stats.lastRenderTime = 0
    stats.fps = 0
    stats.frameCount = 0
    stats.lastFpsUpdate = performance.now()
  }

  // ============================================
  // 🧰 UTILIDADES
  // ============================================

  /**
   * Convierte hex a RGB
   * @param {string} hex - Color hex
   * @returns {Object} {r, g, b}
   */
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  /**
   * Obtiene las coordenadas del mouse relativas al canvas
   * @param {MouseEvent} event - Evento de mouse
   * @returns {Object} {x, y}
   */
  function getMousePosition(event) {
    if (!canvasRef.value) return { x: 0, y: 0 }

    const rect = canvasRef.value.getBoundingClientRect()

    return {
      x: (event.clientX - rect.left) * (dimensions.width / dimensions.displayWidth),
      y: (event.clientY - rect.top) * (dimensions.height / dimensions.displayHeight)
    }
  }

  /**
   * Obtiene las coordenadas touch relativas al canvas
   * @param {TouchEvent} event - Evento touch
   * @returns {Object} {x, y}
   */
  function getTouchPosition(event) {
    if (!canvasRef.value || !event.touches.length) return { x: 0, y: 0 }

    const touch = event.touches[0]
    const rect = canvasRef.value.getBoundingClientRect()

    return {
      x: (touch.clientX - rect.left) * (dimensions.width / dimensions.displayWidth),
      y: (touch.clientY - rect.top) * (dimensions.height / dimensions.displayHeight)
    }
  }

  /**
   * Verifica si el canvas es válido y está listo
   * @returns {boolean}
   */
  function isReady() {
    return isInitialized.value &&
      canvasRef.value !== null &&
      context.value !== null &&
      dimensions.width > 0 &&
      dimensions.height > 0
  }

  /**
   * Obtiene información completa del canvas
   * @returns {Object} Información
   */
  function getCanvasInfo() {
    return {
      isInitialized: isInitialized.value,
      isResizing: isResizing.value,
      contextType: config.contextType,
      dimensions: { ...dimensions },
      dpr: dpr.value,
      stats: { ...stats },
      hasOffscreen: offscreenCanvas.value !== null,
      isReady: isReady()
    }
  }

  // ============================================
  // 🗑️ LIMPIEZA
  // ============================================

  /**
   * Limpia y dispone todos los recursos
   */
  function dispose() {
    console.log('🧹 Limpiando canvas management...')

    // Detener ResizeObserver
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }

    // Cancelar animaciones pendientes
    if (resizeAnimationId) {
      cancelAnimationFrame(resizeAnimationId)
      resizeAnimationId = null
    }

    // Limpiar canvas offscreen
    if (offscreenCanvas.value) {
      offscreenCanvas.value.width = 0
      offscreenCanvas.value.height = 0
      offscreenCanvas.value = null
      offscreenContext.value = null
    }

    // Limpiar canvas principal
    if (canvasRef.value) {
      clear()
    }

    // Resetear estado
    context.value = null
    canvasRef.value = null
    containerRef.value = null
    isInitialized.value = false

    resetStats()

    console.log('✅ Canvas management limpiado')
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Aspect ratio actual del canvas
   */
  const actualAspectRatio = computed(() => {
    if (dimensions.height === 0) return 1
    return dimensions.width / dimensions.height
  })

  /**
   * Área del canvas en píxeles
   */
  const area = computed(() => {
    return dimensions.width * dimensions.height
  })

  /**
   * Estado general del canvas
   */
  const canvasState = computed(() => ({
    isInitialized: isInitialized.value,
    isResizing: isResizing.value,
    isReady: isReady(),
    isCapturing: captureState.isCapturing,
    hasContext: context.value !== null,
    hasOffscreen: offscreenCanvas.value !== null
  }))

  // ============================================
  // 🎬 LIFECYCLE
  // ============================================

  onUnmounted(() => {
    dispose()
  })

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Refs
    canvasRef,
    context,
    offscreenCanvas,
    offscreenContext,
    containerRef,

    // Estado reactivo
    dimensions,
    dpr,
    isInitialized,
    isResizing,
    stats,
    captureState,

    // Inicialización
    initialize,
    createContext,
    setupOffscreenCanvas,
    detectDevicePixelRatio,

    // Redimensionamiento
    resize,
    setupAutoResize,
    updateDPR,

    // Limpieza
    clear,
    clearArea,
    fillCanvas,
    optimize,
    resetTransform,

    // Captura
    captureImage,
    downloadImage,
    copyToClipboard,

    // Buffer offscreen
    copyToOffscreen,
    copyFromOffscreen,
    clearOffscreen,

    // Estadísticas
    updateStats,
    resetStats,

    // Utilidades
    getMousePosition,
    getTouchPosition,
    isReady,
    getCanvasInfo,

    // Limpieza
    dispose,

    // Computed properties
    actualAspectRatio,
    area,
    canvasState
  }
}
