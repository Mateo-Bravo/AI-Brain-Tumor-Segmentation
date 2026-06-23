/**
 * 🖥️ useFullscreenManager.js
 *
 * Composable para gestión de pantalla completa (fullscreen)
 *
 * Funcionalidades:
 * - Entrar/salir de pantalla completa
 * - Detección de soporte de fullscreen
 * - Eventos de cambio de estado
 * - Múltiples elementos (canvas, contenedores)
 * - Soporte para diferentes navegadores (vendor prefixes)
 * - Shortcuts de teclado (F11, Esc)
 * - Estado reactivo
 * - Manejo de errores
 * - Auto-ajuste de canvas
 *
 * @author Richard - Gestor de Pantalla Completa del Visor Médico
 */

import { computed, onMounted, onUnmounted, ref } from 'vue'

/**
 * Composable para gestión de pantalla completa
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para fullscreen
 */
export function useFullscreenManager(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    enableKeyboard: options.enableKeyboard !== false,
    autoResizeCanvas: options.autoResizeCanvas !== false,
    keyboardKey: options.keyboardKey || 'F11',
    onEnter: options.onEnter || null,
    onExit: options.onExit || null,
    onError: options.onError || null
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Estado de fullscreen
   */
  const isFullscreen = ref(false)

  /**
   * Elemento actualmente en fullscreen
   */
  const fullscreenElement = ref(null)

  /**
   * Soporte de fullscreen en el navegador
   */
  const isSupported = ref(false)

  /**
   * Error de fullscreen
   */
  const error = ref(null)

  /**
   * Estado de carga (transición)
   */
  const isTransitioning = ref(false)

  /**
   * Dimensiones antes de fullscreen (para restaurar)
   */
  const previousDimensions = ref({
    width: 0,
    height: 0
  })

  // ============================================
  // 🔍 DETECCIÓN DE VENDOR PREFIXES
  // ============================================

  /**
   * Obtiene los métodos de fullscreen según el navegador
   * @returns {Object} Métodos de fullscreen con vendor prefixes
   */
  function getFullscreenMethods() {
    const doc = document
    const docEl = doc.documentElement

    return {
      // Request fullscreen
      requestFullscreen:
        docEl.requestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.webkitRequestFullscreen ||
        docEl.msRequestFullscreen,

      // Exit fullscreen
      exitFullscreen:
        doc.exitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.webkitExitFullscreen ||
        doc.msExitFullscreen,

      // Fullscreen element
      fullscreenElement:
        doc.fullscreenElement ||
        doc.mozFullScreenElement ||
        doc.webkitFullscreenElement ||
        doc.msFullscreenElement,

      // Fullscreen enabled
      fullscreenEnabled:
        doc.fullscreenEnabled ||
        doc.mozFullScreenEnabled ||
        doc.webkitFullscreenEnabled ||
        doc.msFullscreenEnabled,

      // Fullscreen change event
      fullscreenChangeEvent:
        'fullscreenchange' in doc ? 'fullscreenchange' :
          'mozfullscreenchange' in doc ? 'mozfullscreenchange' :
            'webkitfullscreenchange' in doc ? 'webkitfullscreenchange' :
              'msfullscreenchange',

      // Fullscreen error event
      fullscreenErrorEvent:
        'fullscreenerror' in doc ? 'fullscreenerror' :
          'mozfullscreenerror' in doc ? 'mozfullscreenerror' :
            'webkitfullscreenerror' in doc ? 'webkitfullscreenerror' :
              'msfullscreenerror'
    }
  }

  // ============================================
  // 🎬 INICIALIZACIÓN
  // ============================================

  /**
   * Verifica si el navegador soporta fullscreen
   */
  function checkSupport() {
    const methods = getFullscreenMethods()
    isSupported.value = !!(
      methods.requestFullscreen &&
      methods.exitFullscreen &&
      methods.fullscreenEnabled
    )

    if (!isSupported.value) {
      console.warn('⚠️ Fullscreen API no soportada en este navegador')
    } else {
      console.log('✅ Fullscreen API soportada')
    }
  }

  /**
   * Configura los event listeners
   */
  function setupEventListeners() {
    const methods = getFullscreenMethods()

    // Listener para cambios de fullscreen
    document.addEventListener(
      methods.fullscreenChangeEvent,
      handleFullscreenChange
    )

    // Listener para errores de fullscreen
    document.addEventListener(
      methods.fullscreenErrorEvent,
      handleFullscreenError
    )

    // Listener de teclado
    if (config.enableKeyboard) {
      window.addEventListener('keydown', handleKeyDown)
    }

    console.log('🎧 Event listeners de fullscreen configurados')
  }

  /**
   * Remueve los event listeners
   */
  function removeEventListeners() {
    const methods = getFullscreenMethods()

    document.removeEventListener(
      methods.fullscreenChangeEvent,
      handleFullscreenChange
    )

    document.removeEventListener(
      methods.fullscreenErrorEvent,
      handleFullscreenError
    )

    if (config.enableKeyboard) {
      window.removeEventListener('keydown', handleKeyDown)
    }

    console.log('🔇 Event listeners de fullscreen removidos')
  }

  // ============================================
  // 🖥️ FUNCIONES DE FULLSCREEN
  // ============================================

  /**
   * Entra en modo fullscreen
   * @param {HTMLElement} element - Elemento a poner en fullscreen (opcional)
   * @returns {Promise<boolean>} true si tuvo éxito
   */
  async function enterFullscreen(element = null) {
    if (!isSupported.value) {
      console.warn('⚠️ Fullscreen no soportado')
      return false
    }

    if (isFullscreen.value) {
      console.warn('⚠️ Ya está en fullscreen')
      return false
    }

    try {
      isTransitioning.value = true
      error.value = null

      // Usar elemento proporcionado o document.documentElement
      const targetElement = element || document.documentElement
      const methods = getFullscreenMethods()

      // Guardar dimensiones actuales si es un canvas
      if (targetElement.tagName === 'CANVAS') {
        previousDimensions.value = {
          width: targetElement.width,
          height: targetElement.height
        }
      }

      // Request fullscreen con vendor prefix
      if (methods.requestFullscreen) {
        await methods.requestFullscreen.call(targetElement)
      }

      fullscreenElement.value = targetElement
      isFullscreen.value = true

      console.log('✅ Fullscreen activado')

      // Callback de entrada
      if (config.onEnter) {
        config.onEnter(targetElement)
      }

      // Auto-resize canvas si está habilitado
      if (config.autoResizeCanvas && targetElement.tagName === 'CANVAS') {
        resizeCanvasToFullscreen(targetElement)
      }

      return true

    } catch (err) {
      console.error('❌ Error entrando en fullscreen:', err)
      error.value = err.message

      if (config.onError) {
        config.onError(err)
      }

      return false

    } finally {
      isTransitioning.value = false
    }
  }

  /**
   * Sale del modo fullscreen
   * @returns {Promise<boolean>} true si tuvo éxito
   */
  async function exitFullscreen() {
    if (!isSupported.value) {
      console.warn('⚠️ Fullscreen no soportado')
      return false
    }

    if (!isFullscreen.value) {
      console.warn('⚠️ No está en fullscreen')
      return false
    }

    try {
      isTransitioning.value = true
      error.value = null

      const methods = getFullscreenMethods()

      // Exit fullscreen con vendor prefix
      if (methods.exitFullscreen) {
        await methods.exitFullscreen.call(document)
      }

      // Restaurar dimensiones del canvas si es necesario
      if (
        config.autoResizeCanvas &&
        fullscreenElement.value &&
        fullscreenElement.value.tagName === 'CANVAS'
      ) {
        restoreCanvasDimensions(fullscreenElement.value)
      }

      fullscreenElement.value = null
      isFullscreen.value = false

      console.log('✅ Fullscreen desactivado')

      // Callback de salida
      if (config.onExit) {
        config.onExit()
      }

      return true

    } catch (err) {
      console.error('❌ Error saliendo de fullscreen:', err)
      error.value = err.message

      if (config.onError) {
        config.onError(err)
      }

      return false

    } finally {
      isTransitioning.value = false
    }
  }

  /**
   * Alterna el modo fullscreen
   * @param {HTMLElement} element - Elemento (opcional)
   * @returns {Promise<boolean>} true si tuvo éxito
   */
  async function toggleFullscreen(element = null) {
    if (isFullscreen.value) {
      return await exitFullscreen()
    } else {
      return await enterFullscreen(element)
    }
  }

  /**
   * Fuerza la salida de fullscreen (sin Promise)
   * Útil para casos donde no se puede usar await
   */
  function forceExitFullscreen() {
    if (!isFullscreen.value) return

    const methods = getFullscreenMethods()

    if (methods.exitFullscreen) {
      methods.exitFullscreen.call(document)
    }
  }

  // ============================================
  // 📐 GESTIÓN DE DIMENSIONES DE CANVAS
  // ============================================

  /**
   * Redimensiona el canvas al tamaño de la pantalla
   * @param {HTMLCanvasElement} canvas - Canvas a redimensionar
   */
  function resizeCanvasToFullscreen(canvas) {
    if (!canvas || canvas.tagName !== 'CANVAS') return

    // Usar dimensiones de pantalla completa
    canvas.width = window.screen.width
    canvas.height = window.screen.height

    // Ajustar estilo CSS también
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'

    console.log('📐 Canvas redimensionado a fullscreen:', {
      width: canvas.width,
      height: canvas.height
    })
  }

  /**
   * Restaura las dimensiones originales del canvas
   * @param {HTMLCanvasElement} canvas - Canvas a restaurar
   */
  function restoreCanvasDimensions(canvas) {
    if (!canvas || canvas.tagName !== 'CANVAS') return

    if (previousDimensions.value.width > 0 && previousDimensions.value.height > 0) {
      canvas.width = previousDimensions.value.width
      canvas.height = previousDimensions.value.height

      // Limpiar estilos inline
      canvas.style.width = ''
      canvas.style.height = ''

      console.log('📐 Canvas restaurado a dimensiones originales:', {
        width: canvas.width,
        height: canvas.height
      })
    }
  }

  /**
   * Obtiene las dimensiones actuales de fullscreen
   * @returns {Object} {width, height}
   */
  function getFullscreenDimensions() {
    return {
      width: window.screen.width,
      height: window.screen.height
    }
  }

  // ============================================
  // 🎧 EVENT HANDLERS
  // ============================================

  /**
   * Maneja el cambio de estado de fullscreen
   */
  function handleFullscreenChange() {
    const methods = getFullscreenMethods()
    const fsElement = methods.fullscreenElement

    if (fsElement) {
      // Entró en fullscreen
      isFullscreen.value = true
      fullscreenElement.value = fsElement
      console.log('📺 Fullscreen change: ACTIVADO')
    } else {
      // Salió de fullscreen
      isFullscreen.value = false

      // Restaurar dimensiones si es un canvas
      if (
        config.autoResizeCanvas &&
        fullscreenElement.value &&
        fullscreenElement.value.tagName === 'CANVAS'
      ) {
        restoreCanvasDimensions(fullscreenElement.value)
      }

      fullscreenElement.value = null
      console.log('📺 Fullscreen change: DESACTIVADO')

      // Callback de salida
      if (config.onExit) {
        config.onExit()
      }
    }
  }

  /**
   * Maneja errores de fullscreen
   * @param {Event} event - Evento de error
   */
  function handleFullscreenError(event) {
    console.error('❌ Error de fullscreen:', event)
    error.value = 'Error al cambiar modo fullscreen'
    isFullscreen.value = false
    fullscreenElement.value = null
    isTransitioning.value = false

    if (config.onError) {
      config.onError(new Error('Fullscreen error'))
    }
  }

  /**
   * Maneja el atajo de teclado para fullscreen
   * @param {KeyboardEvent} event - Evento de teclado
   */
  function handleKeyDown(event) {
    // F11 - Prevenir comportamiento por defecto y usar nuestra implementación
    if (event.key === 'F11') {
      event.preventDefault()
      toggleFullscreen()
    }

    // Escape - Salir de fullscreen
    if (event.key === 'Escape' && isFullscreen.value) {
      exitFullscreen()
    }
  }

  // ============================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Verifica si un elemento específico está en fullscreen
   * @param {HTMLElement} element - Elemento a verificar
   * @returns {boolean}
   */
  function isElementFullscreen(element) {
    if (!element) return false

    const methods = getFullscreenMethods()
    return methods.fullscreenElement === element
  }

  /**
   * Obtiene el elemento actual en fullscreen
   * @returns {HTMLElement|null}
   */
  function getCurrentFullscreenElement() {
    const methods = getFullscreenMethods()
    return methods.fullscreenElement || null
  }

  /**
   * Verifica si el documento permite fullscreen
   * @returns {boolean}
   */
  function isFullscreenEnabled() {
    const methods = getFullscreenMethods()
    return methods.fullscreenEnabled || false
  }

  /**
   * Obtiene información completa del estado de fullscreen
   * @returns {Object} Información de fullscreen
   */
  function getFullscreenInfo() {
    return {
      isSupported: isSupported.value,
      isFullscreen: isFullscreen.value,
      isTransitioning: isTransitioning.value,
      element: fullscreenElement.value,
      error: error.value,
      dimensions: isFullscreen.value ? getFullscreenDimensions() : null,
      enabled: isFullscreenEnabled()
    }
  }

  /**
   * Resetea el estado de fullscreen (fuerza limpieza)
   */
  function reset() {
    if (isFullscreen.value) {
      forceExitFullscreen()
    }

    isFullscreen.value = false
    fullscreenElement.value = null
    error.value = null
    isTransitioning.value = false
    previousDimensions.value = { width: 0, height: 0 }

    console.log('🔄 Estado de fullscreen reseteado')
  }

  // ============================================
  // 🎨 UTILIDADES PARA UI
  // ============================================

  /**
   * Obtiene el icono apropiado para el botón de fullscreen
   * @returns {string} Nombre del icono
   */
  function getFullscreenIcon() {
    return isFullscreen.value ? 'fullscreen-exit' : 'fullscreen'
  }

  /**
   * Obtiene el texto apropiado para el botón de fullscreen
   * @returns {string} Texto del botón
   */
  function getFullscreenButtonText() {
    return isFullscreen.value ? 'Salir de Pantalla Completa' : 'Pantalla Completa'
  }

  /**
   * Obtiene el tooltip apropiado para el botón de fullscreen
   * @returns {string} Tooltip
   */
  function getFullscreenTooltip() {
    if (!isSupported.value) {
      return 'Pantalla completa no disponible'
    }
    return isFullscreen.value
      ? 'Salir de pantalla completa (Esc o F11)'
      : 'Pantalla completa (F11)'
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general de fullscreen
   */
  const fullscreenState = computed(() => ({
    isSupported: isSupported.value,
    isActive: isFullscreen.value,
    isTransitioning: isTransitioning.value,
    hasError: error.value !== null,
    element: fullscreenElement.value,
    canEnter: isSupported.value && !isFullscreen.value && !isTransitioning.value,
    canExit: isSupported.value && isFullscreen.value && !isTransitioning.value
  }))

  /**
   * Información de dimensiones
   */
  const dimensions = computed(() => {
    if (!isFullscreen.value) {
      return null
    }
    return getFullscreenDimensions()
  })

  // ============================================
  // 🎬 LIFECYCLE HOOKS
  // ============================================

  onMounted(() => {
    checkSupport()
    setupEventListeners()
  })

  onUnmounted(() => {
    removeEventListeners()

    // Asegurar salida de fullscreen al desmontar
    if (isFullscreen.value) {
      forceExitFullscreen()
    }
  })

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    isFullscreen,
    fullscreenElement,
    isSupported,
    error,
    isTransitioning,
    previousDimensions,

    // Funciones principales
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    forceExitFullscreen,

    // Gestión de canvas
    resizeCanvasToFullscreen,
    restoreCanvasDimensions,
    getFullscreenDimensions,

    // Event handlers
    handleFullscreenChange,
    handleFullscreenError,
    handleKeyDown,

    // Funciones auxiliares
    isElementFullscreen,
    getCurrentFullscreenElement,
    isFullscreenEnabled,
    getFullscreenInfo,
    reset,

    // Utilidades de UI
    getFullscreenIcon,
    getFullscreenButtonText,
    getFullscreenTooltip,

    // Computed properties
    fullscreenState,
    dimensions
  }
}
