/**
 * 🎚️ useSliceNavigation.js
 *
 * Composable para navegación de slices en imágenes médicas 3D
 *
 * Funcionalidades:
 * - Navegación por slices (adelante/atrás)
 * - Navegación con rueda del mouse
 * - Navegación con teclado (flechas)
 * - Navegación con slider/barra de progreso
 * - Navegación rápida (saltos)
 * - Auto-play (reproducción automática)
 * - Marcadores/bookmarks de slices
 * - Historial de navegación
 * - Sincronización entre vistas
 * - Control de velocidad
 *
 * @author Richard - Sistema de Navegación de Slices del Visor Médico
 */

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

/**
 * Composable para navegación de slices
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para navegación de slices
 */
export function useSliceNavigation(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    enableKeyboard: options.enableKeyboard !== false,
    enableWheel: options.enableWheel !== false,
    wheelSensitivity: options.wheelSensitivity || 1,
    autoPlaySpeed: options.autoPlaySpeed || 100, // ms por frame
    enableLooping: options.enableLooping !== false,
    jumpSize: options.jumpSize || 10 // Número de slices para salto rápido
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Índices de slices actuales por vista
   */
  const currentSlices = reactive({
    axial: 0,
    coronal: 0,
    sagittal: 0
  })

  /**
   * Límites de slices por vista
   */
  const sliceLimits = reactive({
    axial: { min: 0, max: 0 },
    coronal: { min: 0, max: 0 },
    sagittal: { min: 0, max: 0 }
  })

  /**
   * Dimensiones del volumen
   */
  const volumeDimensions = reactive({
    width: 0,   // X - sagittal
    height: 0,  // Y - coronal
    depth: 0    // Z - axial
  })

  /**
   * Estado de auto-play
   */
  const autoPlay = reactive({
    isPlaying: false,
    view: null, // Vista en reproducción
    direction: 1, // 1 = adelante, -1 = atrás
    speed: config.autoPlaySpeed,
    intervalId: null
  })

  /**
   * Marcadores de slices importantes
   */
  const bookmarks = ref({
    axial: [],
    coronal: [],
    sagittal: []
  })

  /**
   * Historial de navegación
   */
  const navigationHistory = reactive({
    axial: [],
    coronal: [],
    sagittal: []
  })

  /**
   * Configuración de historial
   */
  const historyConfig = {
    maxHistorySize: 50
  }

  /**
   * Vista activa para navegación
   */
  const activeView = ref('axial')

  /**
   * Estado de navegación
   */
  const isNavigating = ref(false)

  /**
   * Modo de sincronización
   */
  const syncMode = ref('none') // 'none', 'crosshair', 'slice'

  /**
   * Velocidad de navegación con rueda
   */
  const wheelNavigationSpeed = ref(1)

  /**
   * Acumulador de delta para navegación con rueda
   */
  let wheelDeltaAccumulator = 0
  const wheelThreshold = 10

  // ============================================
  // 🎯 FUNCIONES DE INICIALIZACIÓN
  // ============================================

  /**
   * Inicializa la navegación con dimensiones del volumen
   * @param {number} width - Ancho (X)
   * @param {number} height - Alto (Y)
   * @param {number} depth - Profundidad (Z)
   */
  function initialize(width, height, depth) {
    volumeDimensions.width = width
    volumeDimensions.height = height
    volumeDimensions.depth = depth

    // Configurar límites
    sliceLimits.axial.max = depth - 1
    sliceLimits.coronal.max = height - 1
    sliceLimits.sagittal.max = width - 1

    // Centrar slices iniciales
    currentSlices.axial = Math.floor(depth / 2)
    currentSlices.coronal = Math.floor(height / 2)
    currentSlices.sagittal = Math.floor(width / 2)

    // Limpiar historial
    clearAllHistory()

    console.log('🎚️ Navegación de slices inicializada:', {
      dimensions: volumeDimensions,
      initialSlices: currentSlices
    })
  }

  /**
   * Actualiza los límites de una vista específica
   * @param {string} view - Vista
   * @param {number} min - Mínimo
   * @param {number} max - Máximo
   */
  function updateLimits(view, min, max) {
    if (sliceLimits[view]) {
      sliceLimits[view].min = min
      sliceLimits[view].max = max

      // Ajustar slice actual si está fuera de límites
      if (currentSlices[view] < min) {
        currentSlices[view] = min
      } else if (currentSlices[view] > max) {
        currentSlices[view] = max
      }
    }
  }

  // ============================================
  // 🎚️ FUNCIONES DE NAVEGACIÓN BÁSICA
  // ============================================

  /**
   * Navega a un slice específico
   * @param {string} view - Vista ('axial', 'coronal', 'sagittal')
   * @param {number} sliceIndex - Índice del slice
   * @param {boolean} addToHistory - Añadir al historial
   * @returns {boolean} true si la navegación fue exitosa
   */
  function goToSlice(view, sliceIndex, addToHistory = true) {
    if (!sliceLimits[view]) {
      console.warn(`⚠️ Vista inválida: ${view}`)
      return false
    }

    const min = sliceLimits[view].min
    const max = sliceLimits[view].max

    // Validar límites
    if (sliceIndex < min || sliceIndex > max) {
      console.warn(`⚠️ Slice ${sliceIndex} fuera de límites [${min}, ${max}]`)
      return false
    }

    const previousSlice = currentSlices[view]
    currentSlices[view] = sliceIndex

    // Añadir al historial si cambió
    if (addToHistory && previousSlice !== sliceIndex) {
      addToNavigationHistory(view, sliceIndex)
    }

    return true
  }

  /**
   * Navega al siguiente slice
   * @param {string} view - Vista
   * @returns {boolean} true si navegó
   */
  function nextSlice(view) {
    const current = currentSlices[view]
    const max = sliceLimits[view].max

    if (current < max) {
      return goToSlice(view, current + 1)
    } else if (config.enableLooping) {
      // Si está habilitado el looping, volver al inicio
      return goToSlice(view, sliceLimits[view].min)
    }

    return false
  }

  /**
   * Navega al slice anterior
   * @param {string} view - Vista
   * @returns {boolean} true si navegó
   */
  function previousSlice(view) {
    const current = currentSlices[view]
    const min = sliceLimits[view].min

    if (current > min) {
      return goToSlice(view, current - 1)
    } else if (config.enableLooping) {
      // Si está habilitado el looping, ir al final
      return goToSlice(view, sliceLimits[view].max)
    }

    return false
  }

  /**
   * Navega múltiples slices (salto)
   * @param {string} view - Vista
   * @param {number} delta - Cantidad de slices (positivo = adelante, negativo = atrás)
   * @returns {boolean} true si navegó
   */
  function jumpSlices(view, delta) {
    const current = currentSlices[view]
    const newSlice = current + delta

    return goToSlice(view, newSlice)
  }

  /**
   * Va al primer slice
   * @param {string} view - Vista
   * @returns {boolean} true si navegó
   */
  function goToFirstSlice(view) {
    return goToSlice(view, sliceLimits[view].min)
  }

  /**
   * Va al último slice
   * @param {string} view - Vista
   * @returns {boolean} true si navegó
   */
  function goToLastSlice(view) {
    return goToSlice(view, sliceLimits[view].max)
  }

  /**
   * Va al slice del medio
   * @param {string} view - Vista
   * @returns {boolean} true si navegó
   */
  function goToMiddleSlice(view) {
    const min = sliceLimits[view].min
    const max = sliceLimits[view].max
    const middle = Math.floor((min + max) / 2)

    return goToSlice(view, middle)
  }

  /**
   * Navega a un porcentaje del rango total
   * @param {string} view - Vista
   * @param {number} percentage - Porcentaje (0-100)
   * @returns {boolean} true si navegó
   */
  function goToPercentage(view, percentage) {
    const min = sliceLimits[view].min
    const max = sliceLimits[view].max
    const range = max - min
    const sliceIndex = Math.round(min + (range * percentage / 100))

    return goToSlice(view, sliceIndex)
  }

  // ============================================
  // 🖱️ NAVEGACIÓN CON RUEDA DEL MOUSE
  // ============================================

  /**
   * Maneja la navegación con rueda del mouse
   * @param {string} view - Vista
   * @param {WheelEvent} event - Evento de rueda
   */
  function handleWheelNavigation(view, event) {
    if (!config.enableWheel) return

    event.preventDefault()

    // Acumular delta para suavizar la navegación
    wheelDeltaAccumulator += event.deltaY

    // Solo navegar cuando se acumule suficiente delta
    if (Math.abs(wheelDeltaAccumulator) >= wheelThreshold) {
      const direction = wheelDeltaAccumulator > 0 ? 1 : -1
      const steps = Math.floor(Math.abs(wheelDeltaAccumulator) / wheelThreshold) * wheelNavigationSpeed.value

      jumpSlices(view, direction * steps)

      // Resetear acumulador
      wheelDeltaAccumulator = 0
    }
  }

  /**
   * Actualiza la sensibilidad de la rueda
   * @param {number} speed - Velocidad (1 = normal, 2 = rápido, etc.)
   */
  function setWheelSpeed(speed) {
    wheelNavigationSpeed.value = Math.max(1, Math.floor(speed))
  }

  // ============================================
  // ⌨️ NAVEGACIÓN CON TECLADO
  // ============================================

  /**
   * Maneja eventos de teclado para navegación
   * @param {KeyboardEvent} event - Evento de teclado
   */
  function handleKeyboardNavigation(event) {
    if (!config.enableKeyboard || !activeView.value) return

    const view = activeView.value

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault()
        previousSlice(view)
        break

      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault()
        nextSlice(view)
        break

      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault()
        previousSlice(view)
        break

      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault()
        nextSlice(view)
        break

      case 'PageUp':
        event.preventDefault()
        jumpSlices(view, -config.jumpSize)
        break

      case 'PageDown':
        event.preventDefault()
        jumpSlices(view, config.jumpSize)
        break

      case 'Home':
        event.preventDefault()
        goToFirstSlice(view)
        break

      case 'End':
        event.preventDefault()
        goToLastSlice(view)
        break

      case ' ':
        event.preventDefault()
        toggleAutoPlay(view)
        break
    }
  }

  /**
   * Añade listeners de teclado
   */
  function attachKeyboardListeners() {
    if (config.enableKeyboard) {
      window.addEventListener('keydown', handleKeyboardNavigation)
      console.log('⌨️ Listeners de teclado activados')
    }
  }

  /**
   * Remueve listeners de teclado
   */
  function detachKeyboardListeners() {
    window.removeEventListener('keydown', handleKeyboardNavigation)
    console.log('⌨️ Listeners de teclado desactivados')
  }

  // ============================================
  // ▶️ AUTO-PLAY (REPRODUCCIÓN AUTOMÁTICA)
  // ============================================

  /**
   * Inicia la reproducción automática
   * @param {string} view - Vista a reproducir
   * @param {number} direction - Dirección (1 = adelante, -1 = atrás)
   */
  function startAutoPlay(view, direction = 1) {
    if (autoPlay.isPlaying) {
      stopAutoPlay()
    }

    autoPlay.isPlaying = true
    autoPlay.view = view
    autoPlay.direction = direction

    console.log(`▶️ Auto-play iniciado en ${view}`)

    autoPlay.intervalId = setInterval(() => {
      const success = direction > 0
        ? nextSlice(view)
        : previousSlice(view)

      // Si no puede navegar más y el looping está deshabilitado, detener
      if (!success && !config.enableLooping) {
        stopAutoPlay()
      }
    }, autoPlay.speed)
  }

  /**
   * Detiene la reproducción automática
   */
  function stopAutoPlay() {
    if (autoPlay.intervalId) {
      clearInterval(autoPlay.intervalId)
      autoPlay.intervalId = null
    }

    autoPlay.isPlaying = false
    autoPlay.view = null

    console.log('⏸️ Auto-play detenido')
  }

  /**
   * Alterna auto-play (play/pause)
   * @param {string} view - Vista
   */
  function toggleAutoPlay(view) {
    if (autoPlay.isPlaying && autoPlay.view === view) {
      stopAutoPlay()
    } else {
      startAutoPlay(view, 1)
    }
  }

  /**
   * Cambia la velocidad de auto-play
   * @param {number} speed - Velocidad en ms por frame
   */
  function setAutoPlaySpeed(speed) {
    autoPlay.speed = Math.max(10, speed)

    // Si está reproduciendo, reiniciar con nueva velocidad
    if (autoPlay.isPlaying) {
      const view = autoPlay.view
      const direction = autoPlay.direction
      stopAutoPlay()
      startAutoPlay(view, direction)
    }
  }

  /**
   * Invierte la dirección de auto-play
   */
  function reverseAutoPlayDirection() {
    if (autoPlay.isPlaying) {
      autoPlay.direction *= -1
    }
  }

  // ============================================
  // 🔖 MARCADORES (BOOKMARKS)
  // ============================================

  /**
   * Añade un marcador en el slice actual
   * @param {string} view - Vista
   * @param {string} label - Etiqueta del marcador (opcional)
   * @returns {Object} Marcador creado
   */
  function addBookmark(view, label = '') {
    const sliceIndex = currentSlices[view]

    const bookmark = {
      id: `bookmark_${Date.now()}`,
      view,
      slice: sliceIndex,
      label: label || `Slice ${sliceIndex}`,
      timestamp: Date.now()
    }

    bookmarks.value[view].push(bookmark)

    console.log('🔖 Marcador añadido:', bookmark)

    return bookmark
  }

  /**
   * Elimina un marcador
   * @param {string} view - Vista
   * @param {string} bookmarkId - ID del marcador
   * @returns {boolean} true si se eliminó
   */
  function removeBookmark(view, bookmarkId) {
    const index = bookmarks.value[view].findIndex(b => b.id === bookmarkId)

    if (index !== -1) {
      bookmarks.value[view].splice(index, 1)
      console.log('🗑️ Marcador eliminado:', bookmarkId)
      return true
    }

    return false
  }

  /**
   * Navega a un marcador
   * @param {string} view - Vista
   * @param {string} bookmarkId - ID del marcador
   * @returns {boolean} true si navegó
   */
  function goToBookmark(view, bookmarkId) {
    const bookmark = bookmarks.value[view].find(b => b.id === bookmarkId)

    if (bookmark) {
      return goToSlice(view, bookmark.slice)
    }

    return false
  }

  /**
   * Obtiene todos los marcadores de una vista
   * @param {string} view - Vista
   * @returns {Array} Array de marcadores
   */
  function getBookmarks(view) {
    return bookmarks.value[view] || []
  }

  /**
   * Limpia todos los marcadores de una vista
   * @param {string} view - Vista
   */
  function clearBookmarks(view) {
    bookmarks.value[view] = []
    console.log(`🧹 Marcadores limpiados para ${view}`)
  }

  /**
   * Limpia todos los marcadores de todas las vistas
   */
  function clearAllBookmarks() {
    Object.keys(bookmarks.value).forEach(view => {
      bookmarks.value[view] = []
    })
    console.log('🧹 Todos los marcadores limpiados')
  }

  // ============================================
  // 📜 HISTORIAL DE NAVEGACIÓN
  // ============================================

  /**
   * Añade un slice al historial de navegación
   * @param {string} view - Vista
   * @param {number} sliceIndex - Índice del slice
   */
  function addToNavigationHistory(view, sliceIndex) {
    navigationHistory[view].push({
      slice: sliceIndex,
      timestamp: Date.now()
    })

    // Limitar tamaño del historial
    if (navigationHistory[view].length > historyConfig.maxHistorySize) {
      navigationHistory[view].shift()
    }
  }

  /**
   * Navega al slice anterior en el historial
   * @param {string} view - Vista
   * @returns {boolean} true si navegó
   */
  function navigateHistoryBack(view) {
    const history = navigationHistory[view]

    if (history.length > 1) {
      // Remover el slice actual
      history.pop()

      // Obtener el anterior
      const previous = history[history.length - 1]

      if (previous) {
        return goToSlice(view, previous.slice, false)
      }
    }

    return false
  }

  /**
   * Obtiene el historial de navegación
   * @param {string} view - Vista
   * @returns {Array} Historial
   */
  function getNavigationHistory(view) {
    return navigationHistory[view] || []
  }

  /**
   * Limpia el historial de navegación
   * @param {string} view - Vista
   */
  function clearNavigationHistory(view) {
    navigationHistory[view] = []
  }

  /**
   * Limpia todo el historial de navegación
   */
  function clearAllHistory() {
    Object.keys(navigationHistory).forEach(view => {
      navigationHistory[view] = []
    })
  }

  // ============================================
  // 🔄 SINCRONIZACIÓN ENTRE VISTAS
  // ============================================

  /**
   * Sincroniza todas las vistas al mismo slice (porcentaje relativo)
   * @param {string} sourceView - Vista origen
   */
  function syncAllViews(sourceView) {
    if (syncMode.value === 'none') return

    const sourceSlice = currentSlices[sourceView]
    const sourceMin = sliceLimits[sourceView].min
    const sourceMax = sliceLimits[sourceView].max
    const sourceRange = sourceMax - sourceMin

    // Calcular porcentaje relativo
    const percentage = sourceRange > 0
      ? (sourceSlice - sourceMin) / sourceRange
      : 0.5

    // Aplicar a otras vistas
    Object.keys(currentSlices).forEach(view => {
      if (view !== sourceView && syncMode.value === 'slice') {
        const min = sliceLimits[view].min
        const max = sliceLimits[view].max
        const range = max - min
        const targetSlice = Math.round(min + (range * percentage))

        goToSlice(view, targetSlice, false)
      }
    })
  }

  /**
   * Establece el modo de sincronización
   * @param {string} mode - Modo ('none', 'crosshair', 'slice')
   */
  function setSyncMode(mode) {
    if (['none', 'crosshair', 'slice'].includes(mode)) {
      syncMode.value = mode
      console.log(`🔄 Modo de sincronización: ${mode}`)
    }
  }

  // ============================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Obtiene el progreso actual como porcentaje
   * @param {string} view - Vista
   * @returns {number} Porcentaje (0-100)
   */
  function getProgress(view) {
    const current = currentSlices[view]
    const min = sliceLimits[view].min
    const max = sliceLimits[view].max
    const range = max - min

    return range > 0 ? ((current - min) / range) * 100 : 0
  }

  /**
   * Verifica si está en el primer slice
   * @param {string} view - Vista
   * @returns {boolean}
   */
  function isFirstSlice(view) {
    return currentSlices[view] === sliceLimits[view].min
  }

  /**
   * Verifica si está en el último slice
   * @param {string} view - Vista
   * @returns {boolean}
   */
  function isLastSlice(view) {
    return currentSlices[view] === sliceLimits[view].max
  }

  /**
   * Obtiene el número total de slices
   * @param {string} view - Vista
   * @returns {number}
   */
  function getTotalSlices(view) {
    const min = sliceLimits[view].min
    const max = sliceLimits[view].max
    return max - min + 1
  }

  /**
   * Obtiene información de navegación
   * @param {string} view - Vista
   * @returns {Object} Información
   */
  function getNavigationInfo(view) {
    return {
      currentSlice: currentSlices[view],
      minSlice: sliceLimits[view].min,
      maxSlice: sliceLimits[view].max,
      totalSlices: getTotalSlices(view),
      progress: getProgress(view),
      isFirst: isFirstSlice(view),
      isLast: isLastSlice(view),
      canNavigateForward: !isLastSlice(view) || config.enableLooping,
      canNavigateBackward: !isFirstSlice(view) || config.enableLooping
    }
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general de navegación
   */
  const navigationState = computed(() => ({
    activeView: activeView.value,
    isNavigating: isNavigating.value,
    isAutoPlaying: autoPlay.isPlaying,
    autoPlayView: autoPlay.view,
    autoPlayDirection: autoPlay.direction,
    syncMode: syncMode.value
  }))

  /**
   * Información de todas las vistas
   */
  const allViewsInfo = computed(() => ({
    axial: getNavigationInfo('axial'),
    coronal: getNavigationInfo('coronal'),
    sagittal: getNavigationInfo('sagittal')
  }))

  /**
   * Total de marcadores
   */
  const totalBookmarks = computed(() =>
    Object.values(bookmarks.value).reduce((sum, arr) => sum + arr.length, 0)
  )

  // ============================================
  // 👁️ WATCHERS
  // ============================================

  /**
   * Watch para sincronización automática
   */
  watch(() => currentSlices, (newSlices) => {
    if (syncMode.value !== 'none' && activeView.value) {
      syncAllViews(activeView.value)
    }
  }, { deep: true })

  // ============================================
  // 🎬 LIFECYCLE HOOKS
  // ============================================

  onMounted(() => {
    attachKeyboardListeners()
  })

  onUnmounted(() => {
    detachKeyboardListeners()
    stopAutoPlay()
  })

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    currentSlices,
    sliceLimits,
    volumeDimensions,
    autoPlay,
    bookmarks,
    navigationHistory,
    activeView,
    isNavigating,
    syncMode,
    wheelNavigationSpeed,

    // Inicialización
    initialize,
    updateLimits,

    // Navegación básica
    goToSlice,
    nextSlice,
    previousSlice,
    jumpSlices,
    goToFirstSlice,
    goToLastSlice,
    goToMiddleSlice,
    goToPercentage,

    // Navegación con rueda
    handleWheelNavigation,
    setWheelSpeed,

    // Navegación con teclado
    handleKeyboardNavigation,
    attachKeyboardListeners,
    detachKeyboardListeners,

    // Auto-play
    startAutoPlay,
    stopAutoPlay,
    toggleAutoPlay,
    setAutoPlaySpeed,
    reverseAutoPlayDirection,

    // Marcadores
    addBookmark,
    removeBookmark,
    goToBookmark,
    getBookmarks,
    clearBookmarks,
    clearAllBookmarks,

    // Historial
    addToNavigationHistory,
    navigateHistoryBack,
    getNavigationHistory,
    clearNavigationHistory,
    clearAllHistory,

    // Sincronización
    syncAllViews,
    setSyncMode,

    // Funciones auxiliares
    getProgress,
    isFirstSlice,
    isLastSlice,
    getTotalSlices,
    getNavigationInfo,

    // Computed properties
    navigationState,
    allViewsInfo,
    totalBookmarks
  }
}
