// composables/viewer/useCanvasResize.js
import { nextTick, ref } from 'vue'

/**
 * 📐 Composable para redimensionamiento de canvas
 *
 * Maneja todas las operaciones de resize de canvas:
 * - Sincronización con contenedores
 * - Resize responsive con ResizeObserver
 * - Ajustes automáticos en cambios de ventana
 * - Recalculación de mediciones tras resize
 * - Gestión de múltiples canvas (quad view)
 */
export function useCanvasResize() {
  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Referencias a observers activos
   */
  const activeObservers = ref([])

  /**
   * Timeouts para debounce
   */
  const resizeTimeouts = ref({})

  /**
   * Configuración de resize
   */
  const resizeConfig = {
    debounceDelay: 100,
    minCanvasWidth: 300,
    minCanvasHeight: 200,
    significantChangeThreshold: 5, // píxeles
    paddingDefault: 20,
    headerSpace: 30
  }

  // ============================================
  // 🔧 FUNCIONES PRINCIPALES DE RESIZE
  // ============================================

  /**
   * Redimensiona un canvas para que coincida con su contenedor
   *
   * @param {HTMLCanvasElement} canvas - Canvas a redimensionar
   * @returns {Object|null} - {width, height} o null si falla
   */
  function resizeCanvasToContainer(canvas) {
    if (!canvas || !canvas.parentElement) {
      console.warn('⚠️ resizeCanvasToContainer: canvas o contenedor no disponible')
      return null
    }

    const container = canvas.parentElement
    const containerRect = container.getBoundingClientRect()

    // Obtener estilo computado para considerar padding y border
    const containerStyle = window.getComputedStyle(container)
    const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight)
    const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom)
    const borderX = parseFloat(containerStyle.borderLeftWidth) + parseFloat(containerStyle.borderRightWidth)
    const borderY = parseFloat(containerStyle.borderTopWidth) + parseFloat(containerStyle.borderBottomWidth)

    // Calcular tamaño disponible
    const availableWidth = containerRect.width - paddingX - borderX - 8 // 8px margen adicional
    const availableHeight = containerRect.height - paddingY - borderY - 35 // 35px para título

    // Asegurar tamaños mínimos
    const finalWidth = Math.max(availableWidth, 110)
    const finalHeight = Math.max(availableHeight, 80)

    // Ajustar canvas
    canvas.width = finalWidth
    canvas.height = finalHeight

    // Ajustar estilo CSS también
    canvas.style.width = `${finalWidth}px`
    canvas.style.height = `${finalHeight}px`

    console.log(`📏 Canvas redimensionado: ${finalWidth}x${finalHeight}`)

    return { width: finalWidth, height: finalHeight }
  }

  /**
   * Sincroniza el tamaño de un canvas con su boundingClientRect
   *
   * @param {HTMLCanvasElement} canvas - Canvas a sincronizar
   * @returns {boolean} - true si hubo cambios, false si no
   */
  function syncCanvasSize(canvas) {
    if (!canvas) return false

    try {
      const rect = canvas.getBoundingClientRect()
      const currentWidth = canvas.width
      const currentHeight = canvas.height
      const newWidth = Math.round(rect.width)
      const newHeight = Math.round(rect.height)

      // Validación crítica: no permitir dimensiones inválidas
      if (newWidth <= 0 || newHeight <= 0) {
        console.error(`❌ syncCanvasSize: dimensiones inválidas: ${newWidth}x${newHeight}`)

        // Mantener dimensiones actuales si son válidas
        if (currentWidth > 0 && currentHeight > 0) {
          console.warn(`⚠️ Manteniendo dimensiones actuales: ${currentWidth}x${currentHeight}`)
          return false
        } else {
          // Usar dimensiones por defecto
          console.warn(`⚠️ Usando dimensiones por defecto: 512x512`)
          canvas.width = 512
          canvas.height = 512
          return true
        }
      }

      // Solo actualizar si hay cambio significativo
      if (Math.abs(currentWidth - newWidth) > 2 || Math.abs(currentHeight - newHeight) > 2) {
        console.log(`🔄 Sincronizando canvas: ${currentWidth}x${currentHeight} → ${newWidth}x${newHeight}`)

        canvas.width = newWidth
        canvas.height = newHeight

        return true
      }

      return false

    } catch (error) {
      console.warn('⚠️ Error sincronizando tamaño de canvas:', error)
      return false
    }
  }

  /**
   * Sincroniza el tamaño de todos los canvas en quad view
   *
   * @param {Array} canvasRefs - Array de objetos {ref, name}
   * @param {Function} recalculateMeasurements - Callback para recalcular mediciones
   * @returns {boolean} - true si algún canvas cambió
   */
  function syncAllQuadCanvases(canvasRefs, recalculateMeasurements = null) {
    let totalChanged = false

    canvasRefs.forEach(({ ref, name }) => {
      if (ref) {
        const changed = syncCanvasSize(ref)
        if (changed) {
          console.log(`🔄 Canvas ${name} sincronizado`)
          totalChanged = true
        }
      }
    })

    if (totalChanged && recalculateMeasurements) {
      recalculateMeasurements()
    }

    return totalChanged
  }

  /**
   * Configura canvas 3D como responsive con ResizeObserver
   *
   * @param {HTMLCanvasElement} canvas - Canvas 3D
   * @param {Function} onResize - Callback cuando cambia el tamaño
   * @returns {Function} - Función de cleanup
   */
  function setupResponsive3DCanvas(canvas, onResize = null) {
    if (!canvas) {
      console.warn('⚠️ Canvas 3D no disponible para configuración responsive')
      return () => { }
    }

    const container = canvas.parentElement

    if (!container) {
      console.warn('⚠️ Contenedor del canvas 3D no encontrado')
      return () => { }
    }

    console.log('🎯 Configurando canvas 3D responsive...')

    // Función para redimensionar
    const resizeCanvas = () => {
      if (!canvas || !container) return

      const containerRect = container.getBoundingClientRect()
      const containerWidth = containerRect.width
      const containerHeight = containerRect.height

      // Calcular dimensiones con padding
      const padding = resizeConfig.paddingDefault
      const headerSpace = resizeConfig.headerSpace

      const newWidth = Math.max(containerWidth - padding, resizeConfig.minCanvasWidth)
      const newHeight = Math.max(containerHeight - headerSpace, resizeConfig.minCanvasHeight)

      // Solo actualizar si hay cambio significativo
      const threshold = resizeConfig.significantChangeThreshold
      if (Math.abs(canvas.width - newWidth) > threshold ||
        Math.abs(canvas.height - newHeight) > threshold) {

        canvas.width = newWidth
        canvas.height = newHeight

        console.log(`📐 Canvas 3D redimensionado: ${newWidth}x${newHeight}`)

        // Ejecutar callback si existe
        if (onResize) {
          onResize(newWidth, newHeight)
        }
      }
    }

    // Redimensionar inicialmente
    resizeCanvas()

    // Configurar observer
    let cleanup

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === container) {
            resizeCanvas()
          }
        }
      })

      resizeObserver.observe(container)
      activeObservers.value.push(resizeObserver)

      cleanup = () => {
        resizeObserver.disconnect()
        const index = activeObservers.value.indexOf(resizeObserver)
        if (index > -1) {
          activeObservers.value.splice(index, 1)
        }
      }
    } else {
      // Fallback para navegadores sin ResizeObserver
      window.addEventListener('resize', resizeCanvas)

      cleanup = () => {
        window.removeEventListener('resize', resizeCanvas)
      }
    }

    console.log('✅ Canvas 3D configurado como responsive')

    return cleanup
  }

  /**
   * Redimensiona el canvas principal para ajustarse a su contenedor
   *
   * @param {HTMLCanvasElement} canvas - Canvas principal
   * @param {Object} displaySize - {width, height} refs reactivos
   * @param {boolean} isMaximized - Si está en modo maximizado
   * @param {Function} onResize - Callback después del resize
   */
  function resizeMainCanvasToContainer(
    canvas,
    displaySize,
    isMaximized = false,
    onResize = null
  ) {
    nextTick(() => {
      try {
        if (!canvas) return

        // Obtener contenedor
        const container = canvas.closest('.single-view-mode')
        if (!container) return

        const rect = container.getBoundingClientRect()

        // Calcular tamaño disponible con margen
        const availableWidth = Math.max(300, Math.floor(rect.width * 0.95))
        const availableHeight = Math.max(200, Math.floor(rect.height * 0.95))

        // Determinar tamaño óptimo
        let newWidth, newHeight

        if (isMaximized) {
          // En modo maximizado, usar más espacio
          const aspectRatio = 16 / 9

          if (availableWidth / availableHeight > aspectRatio) {
            newHeight = availableHeight
            newWidth = Math.floor(newHeight * aspectRatio)
          } else {
            newWidth = availableWidth
            newHeight = Math.floor(newWidth / aspectRatio)
          }
        } else {
          // En modo normal, usar tamaños conservadores
          newWidth = Math.min(1000, availableWidth)
          newHeight = Math.min(700, availableHeight)
        }

        // Asegurar tamaños mínimos
        newWidth = Math.max(400, newWidth)
        newHeight = Math.max(300, newHeight)

        // Verificar si hay cambio significativo
        const widthChange = Math.abs(displaySize.width.value - newWidth)
        const heightChange = Math.abs(displaySize.height.value - newHeight)

        if (widthChange > 10 || heightChange > 10) {
          console.log(`📐 Redimensionando canvas principal: ${displaySize.width.value}x${displaySize.height.value} → ${newWidth}x${newHeight}`)

          displaySize.width.value = newWidth
          displaySize.height.value = newHeight

          // Sincronizar atributos del canvas después del cambio
          setTimeout(() => {
            const changed = syncCanvasSize(canvas)

            if (changed && onResize) {
              onResize(newWidth, newHeight)
            }
          }, resizeConfig.debounceDelay)
        }

      } catch (error) {
        console.warn('⚠️ Error al redimensionar canvas:', error)
      }
    })
  }

  /**
   * Redimensiona canvas doble (vista original comparativa)
   *
   * @param {HTMLCanvasElement} canvas - Canvas doble
   * @param {Function} redrawCallback - Callback para redibujar
   */
  function resizeDoubleCanvas(canvas, redrawCallback = null) {
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newWidth = Math.floor(containerRect.width)
    const newHeight = Math.floor(containerRect.height)

    if (newWidth > 0 && newHeight > 0) {
      canvas.width = newWidth
      canvas.height = newHeight

      console.log('📏 Canvas doble redimensionado:', newWidth, 'x', newHeight)

      // Redibujar después del redimensionamiento
      if (redrawCallback) {
        nextTick(() => {
          redrawCallback()
        })
      }
    }
  }

  /**
   * Inicializa el sistema de resize para canvas doble
   *
   * @param {HTMLCanvasElement} canvas - Canvas doble
   * @param {Function} redrawCallback - Callback para redibujar
   * @returns {Function} - Función de cleanup
   */
  function initDoubleCanvasResize(canvas, redrawCallback = null) {
    if (!canvas) return () => { }

    // Redimensionar inmediatamente
    resizeDoubleCanvas(canvas, redrawCallback)

    // Agregar observer para redimensionamiento
    const resizeObserver = new ResizeObserver(() => {
      resizeDoubleCanvas(canvas, redrawCallback)
    })

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement)
      activeObservers.value.push(resizeObserver)
    }

    console.log('🔧 Sistema de redimensionamiento del canvas doble inicializado')

    return () => {
      resizeObserver.disconnect()
      const index = activeObservers.value.indexOf(resizeObserver)
      if (index > -1) {
        activeObservers.value.splice(index, 1)
      }
    }
  }

  /**
   * Inicializa tamaños de todos los canvas en quad view
   *
   * @param {Array} canvasRefs - Array de objetos {canvas: ref, name: string}
   */
  function initializeQuadrantCanvasSizes(canvasRefs) {
    console.log('🔧 Inicializando tamaños de canvas de 4 vistas...')

    nextTick(() => {
      canvasRefs.forEach(({ canvas, name }) => {
        if (canvas) {
          const size = resizeCanvasToContainer(canvas)
          if (size) {
            console.log(`✅ Canvas ${name} inicializado: ${size.width}x${size.height}`)
          }
        } else {
          console.warn(`⚠️ Canvas ${name} no disponible para inicialización`)
        }
      })
    })
  }

  // ============================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Maneja el evento de resize de ventana con debounce
   *
   * @param {string} id - Identificador único para el timeout
   * @param {Function} callback - Función a ejecutar
   * @param {number} delay - Delay en ms (opcional)
   */
  function handleWindowResize(id, callback, delay = null) {
    const effectiveDelay = delay || resizeConfig.debounceDelay

    // Limpiar timeout anterior
    if (resizeTimeouts.value[id]) {
      clearTimeout(resizeTimeouts.value[id])
    }

    // Crear nuevo timeout
    resizeTimeouts.value[id] = setTimeout(() => {
      callback()
      delete resizeTimeouts.value[id]
    }, effectiveDelay)
  }

  /**
   * Calcula dimensiones óptimas manteniendo aspect ratio
   *
   * @param {number} availableWidth - Ancho disponible
   * @param {number} availableHeight - Alto disponible
   * @param {number} aspectRatio - Ratio deseado (ancho/alto)
   * @returns {Object} - {width, height}
   */
  function calculateOptimalDimensions(availableWidth, availableHeight, aspectRatio = 16 / 9) {
    let width, height

    if (availableWidth / availableHeight > aspectRatio) {
      height = availableHeight
      width = Math.floor(height * aspectRatio)
    } else {
      width = availableWidth
      height = Math.floor(width / aspectRatio)
    }

    return { width, height }
  }

  /**
   * Verifica si un canvas necesita ser redimensionado
   *
   * @param {HTMLCanvasElement} canvas - Canvas a verificar
   * @param {number} threshold - Umbral de cambio en píxeles
   * @returns {boolean} - true si necesita resize
   */
  function needsResize(canvas, threshold = 5) {
    if (!canvas) return false

    const rect = canvas.getBoundingClientRect()
    const widthDiff = Math.abs(canvas.width - rect.width)
    const heightDiff = Math.abs(canvas.height - rect.height)

    return widthDiff > threshold || heightDiff > threshold
  }

  /**
   * Obtiene información de tamaño de un canvas
   *
   * @param {HTMLCanvasElement} canvas - Canvas
   * @returns {Object} - {width, height, rectWidth, rectHeight, needsSync}
   */
  function getCanvasSizeInfo(canvas) {
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()

    return {
      width: canvas.width,
      height: canvas.height,
      rectWidth: rect.width,
      rectHeight: rect.height,
      needsSync: needsResize(canvas)
    }
  }

  /**
   * Limpia todos los observers activos
   */
  function cleanupAllObservers() {
    console.log('🧹 Limpiando observers de resize...')

    activeObservers.value.forEach(observer => {
      try {
        observer.disconnect()
      } catch (error) {
        console.warn('⚠️ Error desconectando observer:', error)
      }
    })

    activeObservers.value = []

    // Limpiar timeouts pendientes
    Object.keys(resizeTimeouts.value).forEach(key => {
      clearTimeout(resizeTimeouts.value[key])
    })
    resizeTimeouts.value = {}

    console.log('✅ Observers limpiados')
  }

  /**
   * Fuerza un resize inmediato de un canvas
   *
   * @param {HTMLCanvasElement} canvas - Canvas a redimensionar
   * @param {number} width - Nuevo ancho
   * @param {number} height - Nuevo alto
   */
  function forceCanvasResize(canvas, width, height) {
    if (!canvas) return

    canvas.width = width
    canvas.height = height
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    console.log(`🔧 Canvas forzado a: ${width}x${height}`)
  }

  // ============================================
  // 📤 RETURN - EXPORTAR TODO
  // ============================================

  return {
    // Estado
    activeObservers,
    resizeConfig,

    // Funciones principales
    resizeCanvasToContainer,
    syncCanvasSize,
    syncAllQuadCanvases,
    setupResponsive3DCanvas,
    resizeMainCanvasToContainer,
    resizeDoubleCanvas,
    initDoubleCanvasResize,
    initializeQuadrantCanvasSizes,

    // Funciones auxiliares
    handleWindowResize,
    calculateOptimalDimensions,
    needsResize,
    getCanvasSizeInfo,
    cleanupAllObservers,
    forceCanvasResize
  }
}
