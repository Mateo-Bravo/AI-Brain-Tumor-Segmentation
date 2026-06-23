/**
 * 🔍 useZoom.js
 *
 * Composable para gestión de zoom en imágenes médicas
 *
 * Funcionalidades:
 * - Zoom in/out con diferentes métodos (rueda, botones, gestos)
 * - Zoom focal (centrado en punto específico)
 * - Pan/desplazamiento con zoom
 * - Zoom fit (ajustar a ventana)
 * - Zoom 1:1 (tamaño real)
 * - Límites de zoom configurables
 * - Suavizado de zoom
 * - Zoom sincronizado entre vistas
 * - Presets de zoom
 * - Historial de zoom
 * - Zoom con touch/pinch
 *
 * @author Richard - Sistema de Zoom del Visor Médico
 */

import { computed, reactive, ref, watch } from 'vue'

/**
 * Composable para gestión de zoom
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para manejo de zoom
 */
export function useZoom(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    minZoom: options.minZoom || 0.1,           // 10%
    maxZoom: options.maxZoom || 20,            // 2000%
    defaultZoom: options.defaultZoom || 1,     // 100%
    zoomStep: options.zoomStep || 0.1,         // 10% por paso
    wheelZoomSpeed: options.wheelZoomSpeed || 0.1,
    enableSmoothing: options.enableSmoothing !== false,
    smoothingDuration: options.smoothingDuration || 200, // ms
    enablePan: options.enablePan !== false,
    panButton: options.panButton || 0,         // 0 = left, 1 = middle, 2 = right
    enableTouch: options.enableTouch !== false,
    touchZoomSpeed: options.touchZoomSpeed || 0.01
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Nivel de zoom por vista
   */
  const zoomLevels = reactive({
    axial: config.defaultZoom,
    coronal: config.defaultZoom,
    sagittal: config.defaultZoom,
    '3d': config.defaultZoom,
    custom: config.defaultZoom
  })

  /**
   * Pan (desplazamiento) por vista
   */
  const panOffsets = reactive({
    axial: { x: 0, y: 0 },
    coronal: { x: 0, y: 0 },
    sagittal: { x: 0, y: 0 },
    '3d': { x: 0, y: 0 },
    custom: { x: 0, y: 0 }
  })

  /**
   * Estado de zoom animado (para suavizado)
   */
  const animatedZoom = reactive({
    axial: config.defaultZoom,
    coronal: config.defaultZoom,
    sagittal: config.defaultZoom,
    '3d': config.defaultZoom,
    custom: config.defaultZoom
  })

  /**
   * Estado de pan activo (arrastrando)
   */
  const panState = reactive({
    active: false,
    view: null,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0
  })

  /**
   * Estado de zoom con touch (pinch)
   */
  const touchZoomState = reactive({
    active: false,
    view: null,
    initialDistance: 0,
    initialZoom: 1,
    centerX: 0,
    centerY: 0
  })

  /**
   * Dimensiones de canvas por vista (para cálculos)
   */
  const canvasDimensions = reactive({
    axial: { width: 0, height: 0 },
    coronal: { width: 0, height: 0 },
    sagittal: { width: 0, height: 0 },
    '3d': { width: 0, height: 0 },
    custom: { width: 0, height: 0 }
  })

  /**
   * Dimensiones de imagen por vista
   */
  const imageDimensions = reactive({
    axial: { width: 0, height: 0 },
    coronal: { width: 0, height: 0 },
    sagittal: { width: 0, height: 0 },
    '3d': { width: 0, height: 0 },
    custom: { width: 0, height: 0 }
  })

  /**
   * Historial de zoom
   */
  const zoomHistory = reactive({
    axial: [],
    coronal: [],
    sagittal: [],
    '3d': [],
    custom: []
  })

  /**
   * Configuración de historial
   */
  const historyConfig = {
    maxHistorySize: 20
  }

  /**
   * Modo de sincronización de zoom
   */
  const syncZoom = ref(false)

  /**
   * Vista activa para zoom
   */
  const activeView = ref('axial')

  /**
   * Estado de zoom en progreso
   */
  const isZooming = ref(false)

  /**
   * IDs de animaciones activas
   */
  const animationIds = {}

  /**
   * Acumulador de delta para zoom con rueda
   */
  let wheelDeltaAccumulator = 0
  const wheelThreshold = 100

  // ============================================
  // 🔍 FUNCIONES DE ZOOM BÁSICO
  // ============================================

  /**
   * Establece el nivel de zoom
   * @param {string} view - Vista
   * @param {number} zoomLevel - Nivel de zoom
   * @param {boolean} animate - Animar transición
   * @param {Object} focalPoint - Punto focal {x, y} (opcional)
   * @returns {number} Nivel de zoom aplicado
   */
  function setZoom(view, zoomLevel, animate = false, focalPoint = null) {
    if (!zoomLevels.hasOwnProperty(view)) {
      console.warn(`⚠️ Vista inválida: ${view}`)
      return zoomLevels[view]
    }

    // Limitar zoom
    const clampedZoom = clampZoom(zoomLevel)
    const oldZoom = zoomLevels[view]

    // Si hay punto focal, ajustar pan para mantener el punto bajo el cursor
    if (focalPoint && focalPoint.x !== undefined && focalPoint.y !== undefined) {
      adjustPanForFocalPoint(view, oldZoom, clampedZoom, focalPoint)
    }

    // Aplicar zoom
    zoomLevels[view] = clampedZoom

    // Añadir al historial
    addToZoomHistory(view, clampedZoom)

    // Animar si está habilitado
    if (animate && config.enableSmoothing) {
      animateZoom(view, oldZoom, clampedZoom)
    } else {
      animatedZoom[view] = clampedZoom
    }

    // Sincronizar si está habilitado
    if (syncZoom.value) {
      syncZoomLevels(view, clampedZoom)
    }

    return clampedZoom
  }

  /**
   * Aplica zoom relativo (incremento/decremento)
   * @param {string} view - Vista
   * @param {number} delta - Delta de zoom (positivo = zoom in, negativo = zoom out)
   * @param {boolean} animate - Animar
   * @param {Object} focalPoint - Punto focal
   * @returns {number} Nuevo nivel de zoom
   */
  function applyZoomDelta(view, delta, animate = false, focalPoint = null) {
    const currentZoom = zoomLevels[view]
    const newZoom = currentZoom + delta

    return setZoom(view, newZoom, animate, focalPoint)
  }

  /**
   * Zoom in (acercar)
   * @param {string} view - Vista
   * @param {Object} focalPoint - Punto focal (opcional)
   * @returns {number} Nuevo nivel de zoom
   */
  function zoomIn(view, focalPoint = null) {
    return applyZoomDelta(view, config.zoomStep, true, focalPoint)
  }

  /**
   * Zoom out (alejar)
   * @param {string} view - Vista
   * @param {Object} focalPoint - Punto focal (opcional)
   * @returns {number} Nuevo nivel de zoom
   */
  function zoomOut(view, focalPoint = null) {
    return applyZoomDelta(view, -config.zoomStep, true, focalPoint)
  }

  /**
   * Resetea zoom a valor por defecto
   * @param {string} view - Vista
   * @returns {number} Nivel de zoom
   */
  function resetZoom(view) {
    panOffsets[view] = { x: 0, y: 0 }
    return setZoom(view, config.defaultZoom, true)
  }

  /**
   * Resetea zoom de todas las vistas
   */
  function resetAllZoom() {
    Object.keys(zoomLevels).forEach(view => {
      resetZoom(view)
    })
  }

  /**
   * Limita el zoom entre min y max
   * @param {number} zoom - Nivel de zoom
   * @returns {number} Zoom limitado
   */
  function clampZoom(zoom) {
    return Math.max(config.minZoom, Math.min(config.maxZoom, zoom))
  }

  // ============================================
  // 🎯 ZOOM ESPECIAL
  // ============================================

  /**
   * Zoom fit (ajustar imagen a ventana)
   * @param {string} view - Vista
   * @returns {number} Nivel de zoom calculado
   */
  function zoomFit(view) {
    const canvas = canvasDimensions[view]
    const image = imageDimensions[view]

    if (!canvas.width || !canvas.height || !image.width || !image.height) {
      console.warn('⚠️ Dimensiones no disponibles para zoom fit')
      return zoomLevels[view]
    }

    // Calcular zoom para ajustar la imagen al canvas
    const scaleX = canvas.width / image.width
    const scaleY = canvas.height / image.height
    const fitZoom = Math.min(scaleX, scaleY)

    // Centrar imagen
    panOffsets[view] = { x: 0, y: 0 }

    return setZoom(view, fitZoom, true)
  }

  /**
   * Zoom fill (llenar ventana, puede cortar imagen)
   * @param {string} view - Vista
   * @returns {number} Nivel de zoom calculado
   */
  function zoomFill(view) {
    const canvas = canvasDimensions[view]
    const image = imageDimensions[view]

    if (!canvas.width || !canvas.height || !image.width || !image.height) {
      console.warn('⚠️ Dimensiones no disponibles para zoom fill')
      return zoomLevels[view]
    }

    // Calcular zoom para llenar el canvas
    const scaleX = canvas.width / image.width
    const scaleY = canvas.height / image.height
    const fillZoom = Math.max(scaleX, scaleY)

    // Centrar imagen
    panOffsets[view] = { x: 0, y: 0 }

    return setZoom(view, fillZoom, true)
  }

  /**
   * Zoom 1:1 (tamaño real de píxel)
   * @param {string} view - Vista
   * @returns {number} Nivel de zoom (1.0)
   */
  function zoomActualSize(view) {
    panOffsets[view] = { x: 0, y: 0 }
    return setZoom(view, 1.0, true)
  }

  /**
   * Zoom a un porcentaje específico
   * @param {string} view - Vista
   * @param {number} percentage - Porcentaje (100 = 100%)
   * @returns {number} Nivel de zoom
   */
  function zoomToPercentage(view, percentage) {
    const zoom = percentage / 100
    return setZoom(view, zoom, true)
  }

  /**
   * Zoom a una región específica (ROI)
   * @param {string} view - Vista
   * @param {Object} region - Región {x, y, width, height} en coordenadas de imagen
   * @returns {number} Nivel de zoom
   */
  function zoomToRegion(view, region) {
    const canvas = canvasDimensions[view]
    const image = imageDimensions[view]

    if (!canvas.width || !canvas.height || !region.width || !region.height) {
      return zoomLevels[view]
    }

    // Calcular zoom necesario para que la región llene el canvas
    const scaleX = canvas.width / region.width
    const scaleY = canvas.height / region.height
    const zoom = Math.min(scaleX, scaleY)

    // Calcular pan para centrar la región
    const regionCenterX = region.x + region.width / 2
    const regionCenterY = region.y + region.height / 2

    const imageCenterX = image.width / 2
    const imageCenterY = image.height / 2

    panOffsets[view] = {
      x: (imageCenterX - regionCenterX) * zoom,
      y: (imageCenterY - regionCenterY) * zoom
    }

    return setZoom(view, zoom, true)
  }

  // ============================================
  // 🖱️ ZOOM CON RUEDA DEL MOUSE
  // ============================================

  /**
   * Maneja zoom con rueda del mouse
   * @param {string} view - Vista
   * @param {WheelEvent} event - Evento de rueda
   */
  function handleWheelZoom(view, event) {
    event.preventDefault()

    // Obtener posición del mouse en el canvas
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // Acumular delta para suavizar
    wheelDeltaAccumulator += event.deltaY

    if (Math.abs(wheelDeltaAccumulator) >= wheelThreshold) {
      const direction = wheelDeltaAccumulator > 0 ? -1 : 1
      const delta = direction * config.wheelZoomSpeed

      applyZoomDelta(view, delta, false, { x: mouseX, y: mouseY })

      wheelDeltaAccumulator = 0
    }
  }

  /**
   * Ajusta el pan para mantener un punto focal durante el zoom
   * @param {string} view - Vista
   * @param {number} oldZoom - Zoom anterior
   * @param {number} newZoom - Nuevo zoom
   * @param {Object} focalPoint - Punto focal {x, y} en coordenadas de canvas
   */
  function adjustPanForFocalPoint(view, oldZoom, newZoom, focalPoint) {
    const canvas = canvasDimensions[view]
    const pan = panOffsets[view]

    // Calcular posición relativa del punto focal respecto al centro del canvas
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    const relX = focalPoint.x - centerX
    const relY = focalPoint.y - centerY

    // Calcular nuevo pan para mantener el punto focal en su posición
    const zoomRatio = newZoom / oldZoom

    pan.x = pan.x * zoomRatio - relX * (zoomRatio - 1)
    pan.y = pan.y * zoomRatio - relY * (zoomRatio - 1)
  }

  // ============================================
  // 🖐️ PAN (DESPLAZAMIENTO)
  // ============================================

  /**
   * Inicia el pan (arrastre)
   * @param {string} view - Vista
   * @param {number} x - Coordenada X inicial
   * @param {number} y - Coordenada Y inicial
   */
  function startPan(view, x, y) {
    if (!config.enablePan) return

    panState.active = true
    panState.view = view
    panState.startX = x
    panState.startY = y
    panState.startPanX = panOffsets[view].x
    panState.startPanY = panOffsets[view].y
  }

  /**
   * Actualiza el pan durante el arrastre
   * @param {number} x - Coordenada X actual
   * @param {number} y - Coordenada Y actual
   */
  function updatePan(x, y) {
    if (!panState.active || !panState.view) return

    const view = panState.view
    const deltaX = x - panState.startX
    const deltaY = y - panState.startY

    panOffsets[view].x = panState.startPanX + deltaX
    panOffsets[view].y = panState.startPanY + deltaY
  }

  /**
   * Finaliza el pan
   */
  function endPan() {
    panState.active = false
    panState.view = null
  }

  /**
   * Aplica pan relativo
   * @param {string} view - Vista
   * @param {number} deltaX - Delta X
   * @param {number} deltaY - Delta Y
   */
  function applyPan(view, deltaX, deltaY) {
    panOffsets[view].x += deltaX
    panOffsets[view].y += deltaY
  }

  /**
   * Resetea el pan
   * @param {string} view - Vista
   */
  function resetPan(view) {
    panOffsets[view] = { x: 0, y: 0 }
  }

  /**
   * Centra la imagen en el canvas
   * @param {string} view - Vista
   */
  function centerImage(view) {
    panOffsets[view] = { x: 0, y: 0 }
  }

  // ============================================
  // 👆 ZOOM Y PAN CON TOUCH (GESTOS)
  // ============================================

  /**
   * Calcula distancia entre dos puntos touch
   * @param {Touch} touch1 - Primer toque
   * @param {Touch} touch2 - Segundo toque
   * @returns {number} Distancia
   */
  function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Calcula centro entre dos puntos touch
   * @param {Touch} touch1 - Primer toque
   * @param {Touch} touch2 - Segundo toque
   * @param {DOMRect} rect - Rectángulo del canvas
   * @returns {Object} {x, y}
   */
  function getTouchCenter(touch1, touch2, rect) {
    return {
      x: ((touch1.clientX + touch2.clientX) / 2) - rect.left,
      y: ((touch1.clientY + touch2.clientY) / 2) - rect.top
    }
  }

  /**
   * Maneja inicio de touch para zoom pinch
   * @param {string} view - Vista
   * @param {TouchEvent} event - Evento touch
   */
  function handleTouchStart(view, event) {
    if (!config.enableTouch) return

    if (event.touches.length === 2) {
      // Pinch zoom
      event.preventDefault()

      const touch1 = event.touches[0]
      const touch2 = event.touches[1]

      touchZoomState.active = true
      touchZoomState.view = view
      touchZoomState.initialDistance = getTouchDistance(touch1, touch2)
      touchZoomState.initialZoom = zoomLevels[view]

      const rect = event.target.getBoundingClientRect()
      const center = getTouchCenter(touch1, touch2, rect)
      touchZoomState.centerX = center.x
      touchZoomState.centerY = center.y

    } else if (event.touches.length === 1) {
      // Pan
      const touch = event.touches[0]
      const rect = event.target.getBoundingClientRect()
      startPan(view, touch.clientX - rect.left, touch.clientY - rect.top)
    }
  }

  /**
   * Maneja movimiento de touch
   * @param {TouchEvent} event - Evento touch
   */
  function handleTouchMove(event) {
    if (!config.enableTouch) return

    if (touchZoomState.active && event.touches.length === 2) {
      // Pinch zoom
      event.preventDefault()

      const touch1 = event.touches[0]
      const touch2 = event.touches[1]

      const currentDistance = getTouchDistance(touch1, touch2)
      const distanceRatio = currentDistance / touchZoomState.initialDistance

      const view = touchZoomState.view
      const newZoom = touchZoomState.initialZoom * distanceRatio

      setZoom(view, newZoom, false, {
        x: touchZoomState.centerX,
        y: touchZoomState.centerY
      })

    } else if (panState.active && event.touches.length === 1) {
      // Pan
      event.preventDefault()

      const touch = event.touches[0]
      const rect = event.target.getBoundingClientRect()
      updatePan(touch.clientX - rect.left, touch.clientY - rect.top)
    }
  }

  /**
   * Maneja fin de touch
   * @param {TouchEvent} event - Evento touch
   */
  function handleTouchEnd(event) {
    if (!config.enableTouch) return

    if (event.touches.length < 2) {
      touchZoomState.active = false
      touchZoomState.view = null
    }

    if (event.touches.length === 0) {
      endPan()
    }
  }

  // ============================================
  // 🎬 ANIMACIÓN DE ZOOM
  // ============================================

  /**
   * Anima transición de zoom
   * @param {string} view - Vista
   * @param {number} startZoom - Zoom inicial
   * @param {number} endZoom - Zoom final
   */
  function animateZoom(view, startZoom, endZoom) {
    // Cancelar animación anterior si existe
    if (animationIds[view]) {
      cancelAnimationFrame(animationIds[view])
    }

    const startTime = performance.now()
    const duration = config.smoothingDuration

    function animate(currentTime) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      // Interpolar zoom
      animatedZoom[view] = startZoom + (endZoom - startZoom) * eased

      if (progress < 1) {
        animationIds[view] = requestAnimationFrame(animate)
      } else {
        animatedZoom[view] = endZoom
        delete animationIds[view]
      }
    }

    animationIds[view] = requestAnimationFrame(animate)
  }

  /**
   * Cancela todas las animaciones de zoom
   */
  function cancelAllAnimations() {
    Object.keys(animationIds).forEach(view => {
      if (animationIds[view]) {
        cancelAnimationFrame(animationIds[view])
        delete animationIds[view]
      }
    })
  }

  // ============================================
  // 🔄 SINCRONIZACIÓN
  // ============================================

  /**
   * Sincroniza zoom de todas las vistas
   * @param {string} sourceView - Vista origen
   * @param {number} zoom - Nivel de zoom
   */
  function syncZoomLevels(sourceView, zoom) {
    Object.keys(zoomLevels).forEach(view => {
      if (view !== sourceView) {
        zoomLevels[view] = zoom
        animatedZoom[view] = zoom
      }
    })
  }

  /**
   * Activa/desactiva sincronización de zoom
   * @param {boolean} enabled - Habilitar sincronización
   */
  function setSyncZoom(enabled) {
    syncZoom.value = enabled
    console.log(`🔄 Sincronización de zoom: ${enabled ? 'activada' : 'desactivada'}`)
  }

  // ============================================
  // 📜 HISTORIAL DE ZOOM
  // ============================================

  /**
   * Añade nivel de zoom al historial
   * @param {string} view - Vista
   * @param {number} zoom - Nivel de zoom
   */
  function addToZoomHistory(view, zoom) {
    zoomHistory[view].push({
      zoom,
      pan: { ...panOffsets[view] },
      timestamp: Date.now()
    })

    // Limitar tamaño del historial
    if (zoomHistory[view].length > historyConfig.maxHistorySize) {
      zoomHistory[view].shift()
    }
  }

  /**
   * Navega al zoom anterior en el historial
   * @param {string} view - Vista
   * @returns {boolean} true si navegó
   */
  function undoZoom(view) {
    const history = zoomHistory[view]

    if (history.length > 1) {
      // Remover el estado actual
      history.pop()

      // Obtener el anterior
      const previous = history[history.length - 1]

      if (previous) {
        zoomLevels[view] = previous.zoom
        animatedZoom[view] = previous.zoom
        panOffsets[view] = { ...previous.pan }
        return true
      }
    }

    return false
  }

  /**
   * Limpia el historial de zoom
   * @param {string} view - Vista
   */
  function clearZoomHistory(view) {
    zoomHistory[view] = []
  }

  // ============================================
  // 📐 FUNCIONES DE DIMENSIONES
  // ============================================

  /**
   * Actualiza dimensiones del canvas
   * @param {string} view - Vista
   * @param {number} width - Ancho
   * @param {number} height - Alto
   */
  function updateCanvasDimensions(view, width, height) {
    canvasDimensions[view].width = width
    canvasDimensions[view].height = height
  }

  /**
   * Actualiza dimensiones de la imagen
   * @param {string} view - Vista
   * @param {number} width - Ancho
   * @param {number} height - Alto
   */
  function updateImageDimensions(view, width, height) {
    imageDimensions[view].width = width
    imageDimensions[view].height = height
  }

  // ============================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Obtiene el porcentaje de zoom
   * @param {string} view - Vista
   * @returns {number} Porcentaje (100 = 100%)
   */
  function getZoomPercentage(view) {
    return zoomLevels[view] * 100
  }

  /**
   * Verifica si está en zoom mínimo
   * @param {string} view - Vista
   * @returns {boolean}
   */
  function isMinZoom(view) {
    return zoomLevels[view] <= config.minZoom
  }

  /**
   * Verifica si está en zoom máximo
   * @param {string} view - Vista
   * @returns {boolean}
   */
  function isMaxZoom(view) {
    return zoomLevels[view] >= config.maxZoom
  }

  /**
   * Obtiene información de zoom
   * @param {string} view - Vista
   * @returns {Object} Información
   */
  function getZoomInfo(view) {
    return {
      zoom: zoomLevels[view],
      animatedZoom: animatedZoom[view],
      percentage: getZoomPercentage(view),
      pan: { ...panOffsets[view] },
      isMin: isMinZoom(view),
      isMax: isMaxZoom(view),
      canZoomIn: !isMaxZoom(view),
      canZoomOut: !isMinZoom(view)
    }
  }

  /**
   * Calcula matriz de transformación para renderizado
   * @param {string} view - Vista
   * @returns {Object} {zoom, offsetX, offsetY}
   */
  function getTransformMatrix(view) {
    const zoom = config.enableSmoothing ? animatedZoom[view] : zoomLevels[view]
    const pan = panOffsets[view]
    const canvas = canvasDimensions[view]
    const image = imageDimensions[view]

    // Calcular offset para centrar la imagen
    const offsetX = (canvas.width - image.width * zoom) / 2 + pan.x
    const offsetY = (canvas.height - image.height * zoom) / 2 + pan.y

    return {
      zoom,
      offsetX,
      offsetY
    }
  }

  // ============================================
  // 🎯 PRESETS DE ZOOM
  // ============================================

  /**
   * Presets de zoom comunes
   */
  const zoomPresets = {
    '25%': 0.25,
    '50%': 0.5,
    '75%': 0.75,
    '100%': 1.0,
    '150%': 1.5,
    '200%': 2.0,
    '400%': 4.0,
    'fit': 'fit',
    'fill': 'fill',
    'actual': 1.0
  }

  /**
   * Aplica un preset de zoom
   * @param {string} view - Vista
   * @param {string} presetName - Nombre del preset
   * @returns {number} Nivel de zoom aplicado
   */
  function applyZoomPreset(view, presetName) {
    const preset = zoomPresets[presetName]

    if (preset === undefined) {
      console.warn(`⚠️ Preset de zoom desconocido: ${presetName}`)
      return zoomLevels[view]
    }

    if (preset === 'fit') {
      return zoomFit(view)
    } else if (preset === 'fill') {
      return zoomFill(view)
    } else {
      return setZoom(view, preset, true)
    }
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general de zoom
   */
  const zoomState = computed(() => ({
    activeView: activeView.value,
    isZooming: isZooming.value,
    isPanning: panState.active,
    isTouchZooming: touchZoomState.active,
    syncEnabled: syncZoom.value
  }))

  /**
   * Información de todas las vistas
   */
  const allViewsZoomInfo = computed(() => ({
    axial: getZoomInfo('axial'),
    coronal: getZoomInfo('coronal'),
    sagittal: getZoomInfo('sagittal'),
    '3d': getZoomInfo('3d'),
    custom: getZoomInfo('custom')
  }))

  // ============================================
  // 👁️ WATCHERS
  // ============================================

  /**
   * Watch para sincronización automática
   */
  watch(() => zoomLevels, (newLevels) => {
    if (syncZoom.value && activeView.value) {
      // La sincronización se maneja en setZoom
    }
  }, { deep: true })

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    zoomLevels,
    panOffsets,
    animatedZoom,
    panState,
    touchZoomState,
    canvasDimensions,
    imageDimensions,
    zoomHistory,
    syncZoom,
    activeView,
    isZooming,

    // Zoom básico
    setZoom,
    applyZoomDelta,
    zoomIn,
    zoomOut,
    resetZoom,
    resetAllZoom,
    clampZoom,

    // Zoom especial
    zoomFit,
    zoomFill,
    zoomActualSize,
    zoomToPercentage,
    zoomToRegion,

    // Zoom con rueda
    handleWheelZoom,

    // Pan
    startPan,
    updatePan,
    endPan,
    applyPan,
    resetPan,
    centerImage,

    // Touch
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getTouchDistance,
    getTouchCenter,

    // Animación
    animateZoom,
    cancelAllAnimations,

    // Sincronización
    syncZoomLevels,
    setSyncZoom,

    // Historial
    addToZoomHistory,
    undoZoom,
    clearZoomHistory,

    // Dimensiones
    updateCanvasDimensions,
    updateImageDimensions,

    // Funciones auxiliares
    getZoomPercentage,
    isMinZoom,
    isMaxZoom,
    getZoomInfo,
    getTransformMatrix,

    // Presets
    zoomPresets,
    applyZoomPreset,

    // Computed properties
    zoomState,
    allViewsZoomInfo
  }
}
