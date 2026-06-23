/**
 * 🎯 useCrosshairs.js
 *
 * Composable para gestión visual y interacción de crosshairs en vistas 2D
 *
 * Funcionalidades:
 * - Dibujado de crosshairs en canvas 2D
 * - Detección de hover y arrastre
 * - Sincronización visual entre vistas
 * - Efectos visuales (colores, opacidad, animaciones)
 * - Interacción con el usuario (mouse, touch)
 *
 * @author Richard - Sistema de Crosshairs del Visor Médico
 */

import { computed, ref } from 'vue'

/**
 * Composable para gestión de crosshairs visuales
 * @param {Object} coordinatesComposable - Composable de coordenadas (useCoordinates)
 * @returns {Object} Funciones para dibujo e interacción de crosshairs
 */
export function useCrosshairs(coordinatesComposable) {

  // ============================================
  // 📦 EXTRAER DEPENDENCIAS
  // ============================================

  const {
    crosshairPositions,
    crosshairsData,
    crosshairsHover,
    crosshairsConfig,
    crosshairDragging,
    updateCrosshairPosition,
    syncCrosshairsAcrossViews,
    updateSlicesFromCrosshairs,
    startDragging,
    stopDragging,
    canvasToNormalized,
    isValidPosition
  } = coordinatesComposable

  // ============================================
  // 📊 ESTADO REACTIVO LOCAL
  // ============================================

  /**
   * Tooltip de ayuda para crosshairs
   */
  const showCrosshairTooltip = ref(false)

  /**
   * Referencias a los canvas
   */
  const canvasRefs = {
    axial: ref(null),
    coronal: ref(null),
    sagittal: ref(null)
  }

  /**
   * Configuración de interacción
   */
  const interactionConfig = {
    hoverThreshold: 10,      // Distancia en píxeles para detectar hover
    dragEnabled: true,       // Permitir arrastre
    snapToCenter: false,     // Ajustar automáticamente al centro
    showTooltip: true        // Mostrar tooltip de ayuda
  }

  // ============================================
  // 🎨 FUNCIONES DE DIBUJADO
  // ============================================

  /**
   * Dibuja los crosshairs en un canvas específico
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D del canvas
   * @param {string} view - Vista ('axial', 'coronal', 'sagittal')
   * @param {number} canvasWidth - Ancho del canvas
   * @param {number} canvasHeight - Alto del canvas
   */
  function drawCrosshairs(ctx, view, canvasWidth, canvasHeight) {
    if (!ctx || !crosshairsData[view] || !crosshairsData[view].visible) {
      return
    }

    const pos = crosshairPositions[view]
    const isHovering = crosshairsHover[view]
    const isDraggingThis = crosshairDragging.isDragging && crosshairDragging.view === view

    // Calcular coordenadas de píxeles
    const x = pos.x * canvasWidth
    const y = pos.y * canvasHeight

    // Configuración visual
    const color = isHovering || isDraggingThis ? crosshairsConfig.hoverColor : crosshairsConfig.color
    const opacity = isHovering || isDraggingThis ? crosshairsConfig.hoverOpacity : crosshairsConfig.opacity
    const lineWidth = crosshairsConfig.lineWidth
    const cursorSize = crosshairsConfig.cursorSize

    // Guardar estado del contexto
    ctx.save()

    // Aplicar estilos
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.globalAlpha = opacity

    // Aplicar patrón de líneas discontinuas
    if (crosshairsConfig.dashPattern) {
      ctx.setLineDash(crosshairsConfig.dashPattern)
    }

    // Dibujar línea vertical
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()

    // Dibujar línea horizontal
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()

    // Dibujar cursor central (círculo en la intersección)
    if (isHovering || isDraggingThis) {
      ctx.setLineDash([]) // Sin patrón para el círculo
      ctx.globalAlpha = crosshairsConfig.hoverOpacity
      ctx.beginPath()
      ctx.arc(x, y, cursorSize, 0, Math.PI * 2)
      ctx.stroke()

      // Relleno semi-transparente
      ctx.fillStyle = color
      ctx.globalAlpha = 0.3
      ctx.fill()
    }

    // Restaurar estado del contexto
    ctx.restore()
  }

  /**
   * Dibuja crosshairs con efecto de sombra/glow
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D del canvas
   * @param {string} view - Vista
   * @param {number} canvasWidth - Ancho del canvas
   * @param {number} canvasHeight - Alto del canvas
   */
  function drawCrosshairsWithGlow(ctx, view, canvasWidth, canvasHeight) {
    if (!ctx || !crosshairsData[view] || !crosshairsData[view].visible) {
      return
    }

    const isHovering = crosshairsHover[view]
    const isDraggingThis = crosshairDragging.isDragging && crosshairDragging.view === view

    // Aplicar glow solo si está en hover o arrastrando
    if (isHovering || isDraggingThis) {
      ctx.save()
      ctx.shadowBlur = 15
      ctx.shadowColor = crosshairsConfig.hoverColor
      drawCrosshairs(ctx, view, canvasWidth, canvasHeight)
      ctx.restore()
    } else {
      drawCrosshairs(ctx, view, canvasWidth, canvasHeight)
    }
  }

  /**
   * Dibuja coordenadas actuales como texto
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D del canvas
   * @param {string} view - Vista
   * @param {number} canvasWidth - Ancho del canvas
   * @param {number} canvasHeight - Alto del canvas
   */
  function drawCoordinateText(ctx, view, canvasWidth, canvasHeight) {
    if (!ctx || !crosshairsData[view] || !crosshairsData[view].visible) {
      return
    }

    const data = crosshairsData[view]
    const pos = crosshairPositions[view]

    ctx.save()
    ctx.fillStyle = crosshairsConfig.color
    ctx.font = '12px monospace'
    ctx.globalAlpha = 0.8

    // Texto con coordenadas
    const text = `(${Math.round(data.x)}, ${Math.round(data.y)})`
    const x = pos.x * canvasWidth + 15
    const y = pos.y * canvasHeight - 10

    // Fondo semi-transparente para el texto
    const metrics = ctx.measureText(text)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(x - 3, y - 12, metrics.width + 6, 16)

    // Dibujar texto
    ctx.fillStyle = crosshairsConfig.color
    ctx.fillText(text, x, y)

    ctx.restore()
  }

  /**
   * Dibuja indicador de vista en la esquina
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D del canvas
   * @param {string} view - Vista
   * @param {number} canvasWidth - Ancho del canvas
   */
  function drawViewLabel(ctx, view, canvasWidth) {
    ctx.save()
    ctx.fillStyle = crosshairsConfig.color
    ctx.font = 'bold 14px Arial'
    ctx.globalAlpha = 0.7

    // Nombres de las vistas
    const labels = {
      axial: 'AXIAL (Z)',
      coronal: 'CORONAL (Y)',
      sagittal: 'SAGITAL (X)'
    }

    const text = labels[view] || view.toUpperCase()
    ctx.fillText(text, 10, 20)

    ctx.restore()
  }

  // ============================================
  // 🖱️ FUNCIONES DE INTERACCIÓN
  // ============================================

  /**
   * Detecta si el mouse está sobre los crosshairs
   * @param {number} mouseX - Coordenada X del mouse en canvas
   * @param {number} mouseY - Coordenada Y del mouse en canvas
   * @param {string} view - Vista
   * @param {number} canvasWidth - Ancho del canvas
   * @param {number} canvasHeight - Alto del canvas
   * @returns {boolean} true si está sobre los crosshairs
   */
  function isMouseOverCrosshairs(mouseX, mouseY, view, canvasWidth, canvasHeight) {
    const pos = crosshairPositions[view]
    const x = pos.x * canvasWidth
    const y = pos.y * canvasHeight
    const threshold = interactionConfig.hoverThreshold

    // Verificar distancia a línea vertical o horizontal
    const nearVertical = Math.abs(mouseX - x) < threshold
    const nearHorizontal = Math.abs(mouseY - y) < threshold

    return nearVertical || nearHorizontal
  }

  /**
   * Maneja el evento de mouse move
   * @param {MouseEvent} event - Evento de mouse
   * @param {string} view - Vista
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  function handleMouseMove(event, view, canvas) {
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // Actualizar estado de hover
    crosshairsHover[view] = isMouseOverCrosshairs(
      mouseX,
      mouseY,
      view,
      canvas.width,
      canvas.height
    )

    // Si está arrastrando, actualizar posición
    if (crosshairDragging.isDragging && crosshairDragging.view === view) {
      const normalized = canvasToNormalized(mouseX, mouseY, canvas.width, canvas.height)

      if (isValidPosition(normalized.x, normalized.y)) {
        updateCrosshairPosition(view, normalized.x, normalized.y)
        syncCrosshairsAcrossViews(view)
        updateSlicesFromCrosshairs()
      }
    }

    // Cambiar cursor si está sobre crosshairs
    canvas.style.cursor = crosshairsHover[view] ? 'move' : 'default'
  }

  /**
   * Maneja el evento de mouse down (inicio de arrastre)
   * @param {MouseEvent} event - Evento de mouse
   * @param {string} view - Vista
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  function handleMouseDown(event, view, canvas) {
    if (!canvas || !interactionConfig.dragEnabled) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // Verificar si está sobre los crosshairs
    if (isMouseOverCrosshairs(mouseX, mouseY, view, canvas.width, canvas.height)) {
      startDragging(view, mouseX, mouseY)

      // Actualizar posición inmediatamente
      const normalized = canvasToNormalized(mouseX, mouseY, canvas.width, canvas.height)
      updateCrosshairPosition(view, normalized.x, normalized.y)
      syncCrosshairsAcrossViews(view)
      updateSlicesFromCrosshairs()
    }
  }

  /**
   * Maneja el evento de mouse up (fin de arrastre)
   */
  function handleMouseUp() {
    if (crosshairDragging.isDragging) {
      stopDragging()
    }
  }

  /**
   * Maneja el evento de mouse leave (salir del canvas)
   * @param {string} view - Vista
   */
  function handleMouseLeave(view) {
    crosshairsHover[view] = false

    // Si estaba arrastrando, detener
    if (crosshairDragging.isDragging && crosshairDragging.view === view) {
      stopDragging()
    }
  }

  /**
   * Maneja el click en el canvas para mover crosshairs
   * @param {MouseEvent} event - Evento de mouse
   * @param {string} view - Vista
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  function handleClick(event, view, canvas) {
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const normalized = canvasToNormalized(mouseX, mouseY, canvas.width, canvas.height)

    if (isValidPosition(normalized.x, normalized.y)) {
      updateCrosshairPosition(view, normalized.x, normalized.y)
      syncCrosshairsAcrossViews(view)
      updateSlicesFromCrosshairs()
    }
  }

  // ============================================
  // 📱 SOPORTE TÁCTIL (TOUCH)
  // ============================================

  /**
   * Maneja eventos touch start
   * @param {TouchEvent} event - Evento touch
   * @param {string} view - Vista
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  function handleTouchStart(event, view, canvas) {
    if (!canvas || event.touches.length !== 1) return

    event.preventDefault()
    const touch = event.touches[0]
    const rect = canvas.getBoundingClientRect()
    const touchX = touch.clientX - rect.left
    const touchY = touch.clientY - rect.top

    if (isMouseOverCrosshairs(touchX, touchY, view, canvas.width, canvas.height)) {
      startDragging(view, touchX, touchY)
    }
  }

  /**
   * Maneja eventos touch move
   * @param {TouchEvent} event - Evento touch
   * @param {string} view - Vista
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  function handleTouchMove(event, view, canvas) {
    if (!canvas || event.touches.length !== 1) return

    event.preventDefault()

    if (crosshairDragging.isDragging && crosshairDragging.view === view) {
      const touch = event.touches[0]
      const rect = canvas.getBoundingClientRect()
      const touchX = touch.clientX - rect.left
      const touchY = touch.clientY - rect.top

      const normalized = canvasToNormalized(touchX, touchY, canvas.width, canvas.height)

      if (isValidPosition(normalized.x, normalized.y)) {
        updateCrosshairPosition(view, normalized.x, normalized.y)
        syncCrosshairsAcrossViews(view)
        updateSlicesFromCrosshairs()
      }
    }
  }

  /**
   * Maneja eventos touch end
   * @param {TouchEvent} event - Evento touch
   */
  function handleTouchEnd(event) {
    event.preventDefault()
    stopDragging()
  }

  // ============================================
  // 🎬 FUNCIONES DE CONFIGURACIÓN Y UTILIDAD
  // ============================================

  /**
   * Inicializa los event listeners en un canvas
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} view - Vista
   */
  function attachEventListeners(canvas, view) {
    if (!canvas) return

    // Eventos de mouse
    canvas.addEventListener('mousemove', (e) => handleMouseMove(e, view, canvas))
    canvas.addEventListener('mousedown', (e) => handleMouseDown(e, view, canvas))
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', () => handleMouseLeave(view))
    canvas.addEventListener('click', (e) => handleClick(e, view, canvas))

    // Eventos táctiles
    canvas.addEventListener('touchstart', (e) => handleTouchStart(e, view, canvas))
    canvas.addEventListener('touchmove', (e) => handleTouchMove(e, view, canvas))
    canvas.addEventListener('touchend', handleTouchEnd)
    canvas.addEventListener('touchcancel', handleTouchEnd)

    // Guardar referencia al canvas
    canvasRefs[view].value = canvas
  }

  /**
   * Remueve los event listeners de un canvas
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} view - Vista
   */
  function detachEventListeners(canvas, view) {
    if (!canvas) return

    // Remover eventos de mouse
    canvas.removeEventListener('mousemove', (e) => handleMouseMove(e, view, canvas))
    canvas.removeEventListener('mousedown', (e) => handleMouseDown(e, view, canvas))
    canvas.removeEventListener('mouseup', handleMouseUp)
    canvas.removeEventListener('mouseleave', () => handleMouseLeave(view))
    canvas.removeEventListener('click', (e) => handleClick(e, view, canvas))

    // Remover eventos táctiles
    canvas.removeEventListener('touchstart', (e) => handleTouchStart(e, view, canvas))
    canvas.removeEventListener('touchmove', (e) => handleTouchMove(e, view, canvas))
    canvas.removeEventListener('touchend', handleTouchEnd)
    canvas.removeEventListener('touchcancel', handleTouchEnd)
  }

  /**
   * Actualiza la configuración de interacción
   * @param {Object} config - Nueva configuración
   */
  function updateInteractionConfig(config) {
    Object.assign(interactionConfig, config)
  }

  /**
   * Alterna la visibilidad del tooltip
   */
  function toggleTooltip() {
    showCrosshairTooltip.value = !showCrosshairTooltip.value
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general de interacción
   */
  const interactionState = computed(() => ({
    isDragging: crosshairDragging.isDragging,
    activeView: crosshairDragging.view,
    isHovering: Object.values(crosshairsHover).some(h => h),
    hoveredView: Object.entries(crosshairsHover).find(([_, h]) => h)?.[0] || null
  }))

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    showCrosshairTooltip,
    canvasRefs,
    interactionConfig,
    interactionState,

    // Funciones de dibujado
    drawCrosshairs,
    drawCrosshairsWithGlow,
    drawCoordinateText,
    drawViewLabel,

    // Funciones de interacción - Mouse
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleClick,
    isMouseOverCrosshairs,

    // Funciones de interacción - Touch
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Funciones de configuración
    attachEventListeners,
    detachEventListeners,
    updateInteractionConfig,
    toggleTooltip
  }
}
