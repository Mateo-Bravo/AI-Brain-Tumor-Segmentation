/**
 * 📍 useCoordinates.js
 *
 * Composable para gestión de coordenadas y crosshairs en el visor médico
 *
 * Funcionalidades:
 * - Manejo de posiciones en diferentes sistemas de coordenadas
 * - Sincronización entre vistas 2D (axial, coronal, sagittal)
 * - Conversión entre coordenadas normalizadas (0-1) y píxeles
 * - Gestión de crosshairs interactivos con arrastre
 * - Validación y limitación de coordenadas
 *
 * @author Richard - Sistema de Coordenadas del Visor Médico
 */

import { computed, reactive } from 'vue'

/**
 * Composable para gestión de coordenadas
 * @param {Object} volumeDimensions - Dimensiones del volumen {width, height, depth}
 * @returns {Object} Estado y funciones para manejo de coordenadas
 */
export function useCoordinates(volumeDimensions = {}) {

  // ============================================
  // 📊 ESTADO REACTIVO - COORDENADAS
  // ============================================

  /**
   * Posiciones de crosshairs en coordenadas normalizadas (0.0 - 1.0)
   * Centro por defecto (0.5, 0.5)
   */
  const crosshairPositions = reactive({
    axial: { x: 0.5, y: 0.5 },      // Vista axial (horizontal)
    coronal: { x: 0.5, y: 0.5 },    // Vista coronal (frontal)
    sagittal: { x: 0.5, y: 0.5 }    // Vista sagital (lateral)
  })

  /**
   * Datos de crosshairs en coordenadas de píxeles
   */
  const crosshairsData = reactive({
    axial: { x: 0, y: 0, visible: true },
    coronal: { x: 0, y: 0, visible: true },
    sagittal: { x: 0, y: 0, visible: true }
  })

  /**
   * Índices de slices actuales para cada orientación
   */
  const currentSlices = reactive({
    axial: 0,
    coronal: 0,
    sagittal: 0
  })

  /**
   * Estado de arrastre de crosshairs
   */
  const crosshairDragging = reactive({
    isDragging: false,
    view: null,  // 'axial', 'coronal', 'sagittal'
    startX: 0,
    startY: 0
  })

  /**
   * Estado alternativo para arrastre (compatibilidad)
   */
  const draggingCrosshairs = reactive({
    active: false,
    view: null,
    startX: 0,
    startY: 0
  })

  /**
   * Estado de hover sobre crosshairs
   */
  const crosshairsHover = reactive({
    axial: false,
    coronal: false,
    sagittal: false
  })

  /**
   * Configuración de apariencia de crosshairs
   */
  const crosshairsConfig = {
    color: '#00FF00',        // Verde brillante
    hoverColor: '#FFFF00',   // Amarillo al hover
    lineWidth: 1,
    dashPattern: [5, 3],     // Líneas discontinuas
    opacity: 0.2,            // Opacidad base (reducida para no interferir)
    hoverOpacity: 1.0,       // Opacidad al hover
    cursorSize: 10           // Tamaño del cursor central
  }

  /**
   * Dimensiones del volumen (actualizables)
   */
  const dimensions = reactive({
    width: volumeDimensions.width || 0,
    height: volumeDimensions.height || 0,
    depth: volumeDimensions.depth || 0
  })

  // ============================================
  // 🔄 FUNCIONES DE CONVERSIÓN DE COORDENADAS
  // ============================================

  /**
   * Convierte coordenadas de píxeles a normalizadas (0-1)
   * @param {number} pixel - Coordenada en píxeles
   * @param {number} maxSize - Tamaño máximo (ancho o alto)
   * @returns {number} Coordenada normalizada entre 0 y 1
   */
  function pixelToNormalized(pixel, maxSize) {
    if (!maxSize || maxSize <= 0) return 0.5
    return Math.max(0, Math.min(1, pixel / maxSize))
  }

  /**
   * Convierte coordenadas normalizadas (0-1) a píxeles
   * @param {number} normalized - Coordenada normalizada (0-1)
   * @param {number} maxSize - Tamaño máximo (ancho o alto)
   * @returns {number} Coordenada en píxeles
   */
  function normalizedToPixel(normalized, maxSize) {
    if (!maxSize || maxSize <= 0) return 0
    return Math.round(normalized * maxSize)
  }

  /**
   * Convierte coordenadas normalizadas (0-1) a índice de slice
   * @param {number} normalized - Coordenada normalizada (0-1)
   * @param {number} totalSlices - Número total de slices
   * @returns {number} Índice de slice
   */
  function normalizedToSlice(normalized, totalSlices) {
    if (!totalSlices || totalSlices <= 0) return 0
    return Math.round(normalized * (totalSlices - 1))
  }

  /**
   * Convierte índice de slice a coordenadas normalizadas (0-1)
   * @param {number} sliceIndex - Índice del slice
   * @param {number} totalSlices - Número total de slices
   * @returns {number} Coordenada normalizada entre 0 y 1
   */
  function sliceToNormalized(sliceIndex, totalSlices) {
    if (!totalSlices || totalSlices <= 1) return 0.5
    return sliceIndex / (totalSlices - 1)
  }

  /**
   * Convierte coordenadas de canvas a coordenadas normalizadas del volumen
   * @param {number} canvasX - Coordenada X en canvas
   * @param {number} canvasY - Coordenada Y en canvas
   * @param {number} canvasWidth - Ancho del canvas
   * @param {number} canvasHeight - Alto del canvas
   * @returns {Object} {x, y} normalizados (0-1)
   */
  function canvasToNormalized(canvasX, canvasY, canvasWidth, canvasHeight) {
    return {
      x: pixelToNormalized(canvasX, canvasWidth),
      y: pixelToNormalized(canvasY, canvasHeight)
    }
  }

  /**
   * Convierte coordenadas normalizadas a coordenadas de canvas
   * @param {number} normalizedX - Coordenada X normalizada (0-1)
   * @param {number} normalizedY - Coordenada Y normalizada (0-1)
   * @param {number} canvasWidth - Ancho del canvas
   * @param {number} canvasHeight - Alto del canvas
   * @returns {Object} {x, y} en píxeles de canvas
   */
  function normalizedToCanvas(normalizedX, normalizedY, canvasWidth, canvasHeight) {
    return {
      x: normalizedToPixel(normalizedX, canvasWidth),
      y: normalizedToPixel(normalizedY, canvasHeight)
    }
  }

  // ============================================
  // 🎯 FUNCIONES DE GESTIÓN DE CROSSHAIRS
  // ============================================

  /**
   * Actualiza la posición de los crosshairs en una vista específica
   * @param {string} view - Vista ('axial', 'coronal', 'sagittal')
   * @param {number} x - Coordenada X normalizada (0-1)
   * @param {number} y - Coordenada Y normalizada (0-1)
   */
  function updateCrosshairPosition(view, x, y) {
    if (!['axial', 'coronal', 'sagittal'].includes(view)) {
      console.warn(`⚠️ Vista inválida: ${view}`)
      return
    }

    // Validar y limitar coordenadas
    const validX = clampValue(x, 0, 1)
    const validY = clampValue(y, 0, 1)

    // Actualizar posición normalizada
    crosshairPositions[view].x = validX
    crosshairPositions[view].y = validY

    // Actualizar coordenadas de píxeles según la vista
    updatePixelCoordinates(view)
  }

  /**
   * Actualiza las coordenadas de píxeles según las posiciones normalizadas
   * @param {string} view - Vista a actualizar
   */
  function updatePixelCoordinates(view) {
    const pos = crosshairPositions[view]

    switch (view) {
      case 'axial':
        crosshairsData.axial.x = normalizedToPixel(pos.x, dimensions.width)
        crosshairsData.axial.y = normalizedToPixel(pos.y, dimensions.height)
        break
      case 'coronal':
        crosshairsData.coronal.x = normalizedToPixel(pos.x, dimensions.width)
        crosshairsData.coronal.y = normalizedToPixel(pos.y, dimensions.depth)
        break
      case 'sagittal':
        crosshairsData.sagittal.x = normalizedToPixel(pos.x, dimensions.height)
        crosshairsData.sagittal.y = normalizedToPixel(pos.y, dimensions.depth)
        break
    }
  }

  /**
   * Sincroniza crosshairs entre todas las vistas
   * Cuando se mueve el crosshair en una vista, actualiza las otras vistas
   * @param {string} sourceView - Vista que origina el cambio
   */
  function syncCrosshairsAcrossViews(sourceView) {
    const pos = crosshairPositions[sourceView]

    switch (sourceView) {
      case 'axial':
        // Actualizar coronal y sagittal basado en movimiento en axial
        crosshairPositions.coronal.x = pos.x
        crosshairPositions.sagittal.x = pos.y
        updatePixelCoordinates('coronal')
        updatePixelCoordinates('sagittal')
        break

      case 'coronal':
        // Actualizar axial y sagittal basado en movimiento en coronal
        crosshairPositions.axial.x = pos.x
        crosshairPositions.sagittal.y = pos.y
        updatePixelCoordinates('axial')
        updatePixelCoordinates('sagittal')
        break

      case 'sagittal':
        // Actualizar axial y coronal basado en movimiento en sagittal
        crosshairPositions.axial.y = pos.x
        crosshairPositions.coronal.y = pos.y
        updatePixelCoordinates('axial')
        updatePixelCoordinates('coronal')
        break
    }
  }

  /**
   * Actualiza los índices de slices basándose en las posiciones de crosshairs
   */
  function updateSlicesFromCrosshairs() {
    // Slice axial (basado en coordenada Y de vista coronal o sagittal)
    currentSlices.axial = normalizedToSlice(
      crosshairPositions.axial.y,
      dimensions.depth
    )

    // Slice coronal (basado en coordenada Y de vista axial)
    currentSlices.coronal = normalizedToSlice(
      crosshairPositions.coronal.y,
      dimensions.height
    )

    // Slice sagittal (basado en coordenada X de vista axial)
    currentSlices.sagittal = normalizedToSlice(
      crosshairPositions.sagittal.x,
      dimensions.width
    )
  }

  /**
   * Actualiza posiciones de crosshairs basándose en los índices de slices
   */
  function updateCrosshairsFromSlices() {
    // Actualizar posiciones normalizadas desde slices
    crosshairPositions.axial.y = sliceToNormalized(currentSlices.axial, dimensions.depth)
    crosshairPositions.coronal.y = sliceToNormalized(currentSlices.coronal, dimensions.height)
    crosshairPositions.sagittal.x = sliceToNormalized(currentSlices.sagittal, dimensions.width)

    // Actualizar coordenadas de píxeles
    updatePixelCoordinates('axial')
    updatePixelCoordinates('coronal')
    updatePixelCoordinates('sagittal')
  }

  // ============================================
  // ✅ FUNCIONES DE VALIDACIÓN
  // ============================================

  /**
   * Valida si una posición está dentro de los límites
   * @param {number} x - Coordenada X normalizada
   * @param {number} y - Coordenada Y normalizada
   * @returns {boolean} true si es válida
   */
  function isValidPosition(x, y) {
    return x >= 0 && x <= 1 && y >= 0 && y <= 1
  }

  /**
   * Limita un valor entre un mínimo y máximo
   * @param {number} value - Valor a limitar
   * @param {number} min - Valor mínimo
   * @param {number} max - Valor máximo
   * @returns {number} Valor limitado
   */
  function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * Limita una posición dentro de los límites válidos
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @returns {Object} {x, y} limitados
   */
  function clampPosition(x, y) {
    return {
      x: clampValue(x, 0, 1),
      y: clampValue(y, 0, 1)
    }
  }

  // ============================================
  // 🔧 FUNCIONES DE CONFIGURACIÓN
  // ============================================

  /**
   * Actualiza las dimensiones del volumen
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} depth - Profundidad
   */
  function updateDimensions(width, height, depth) {
    dimensions.width = width
    dimensions.height = height
    dimensions.depth = depth

    // Actualizar coordenadas de píxeles con las nuevas dimensiones
    updatePixelCoordinates('axial')
    updatePixelCoordinates('coronal')
    updatePixelCoordinates('sagittal')
  }

  /**
   * Resetea las posiciones de crosshairs al centro
   */
  function resetCrosshairs() {
    crosshairPositions.axial.x = 0.5
    crosshairPositions.axial.y = 0.5
    crosshairPositions.coronal.x = 0.5
    crosshairPositions.coronal.y = 0.5
    crosshairPositions.sagittal.x = 0.5
    crosshairPositions.sagittal.y = 0.5

    updatePixelCoordinates('axial')
    updatePixelCoordinates('coronal')
    updatePixelCoordinates('sagittal')
    updateSlicesFromCrosshairs()
  }

  /**
   * Inicia el arrastre de crosshairs
   * @param {string} view - Vista donde se inicia el arrastre
   * @param {number} startX - Coordenada X inicial
   * @param {number} startY - Coordenada Y inicial
   */
  function startDragging(view, startX, startY) {
    crosshairDragging.isDragging = true
    crosshairDragging.view = view
    crosshairDragging.startX = startX
    crosshairDragging.startY = startY

    // Compatibilidad con estado alternativo
    draggingCrosshairs.active = true
    draggingCrosshairs.view = view
    draggingCrosshairs.startX = startX
    draggingCrosshairs.startY = startY
  }

  /**
   * Finaliza el arrastre de crosshairs
   */
  function stopDragging() {
    crosshairDragging.isDragging = false
    crosshairDragging.view = null

    draggingCrosshairs.active = false
    draggingCrosshairs.view = null
  }

  /**
   * Muestra/oculta crosshairs en una vista específica
   * @param {string} view - Vista
   * @param {boolean} visible - Visible o no
   */
  function setCrosshairVisibility(view, visible) {
    if (crosshairsData[view]) {
      crosshairsData[view].visible = visible
    }
  }

  /**
   * Muestra/oculta crosshairs en todas las vistas
   * @param {boolean} visible - Visible o no
   */
  function setAllCrosshairsVisibility(visible) {
    crosshairsData.axial.visible = visible
    crosshairsData.coronal.visible = visible
    crosshairsData.sagittal.visible = visible
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Obtiene las coordenadas actuales en el espacio del volumen
   */
  const volumeCoordinates = computed(() => ({
    x: normalizedToPixel(crosshairPositions.axial.x, dimensions.width),
    y: normalizedToPixel(crosshairPositions.axial.y, dimensions.height),
    z: normalizedToPixel(crosshairPositions.axial.y, dimensions.depth)
  }))

  /**
   * Verifica si algún crosshair está siendo arrastrado
   */
  const isDragging = computed(() =>
    crosshairDragging.isDragging || draggingCrosshairs.active
  )

  /**
   * Verifica si algún crosshair está en hover
   */
  const isHovering = computed(() =>
    crosshairsHover.axial || crosshairsHover.coronal || crosshairsHover.sagittal
  )

  // ============================================
  // 🎬 INICIALIZACIÓN
  // ============================================

  // Inicializar coordenadas de píxeles si ya hay dimensiones
  if (dimensions.width > 0 && dimensions.height > 0 && dimensions.depth > 0) {
    updatePixelCoordinates('axial')
    updatePixelCoordinates('coronal')
    updatePixelCoordinates('sagittal')
    updateSlicesFromCrosshairs()
  }

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estados reactivos
    crosshairPositions,
    crosshairsData,
    currentSlices,
    crosshairDragging,
    draggingCrosshairs,
    crosshairsHover,
    crosshairsConfig,
    dimensions,

    // Funciones de conversión
    pixelToNormalized,
    normalizedToPixel,
    normalizedToSlice,
    sliceToNormalized,
    canvasToNormalized,
    normalizedToCanvas,

    // Funciones de gestión de crosshairs
    updateCrosshairPosition,
    syncCrosshairsAcrossViews,
    updateSlicesFromCrosshairs,
    updateCrosshairsFromSlices,
    updatePixelCoordinates,

    // Funciones de validación
    isValidPosition,
    clampValue,
    clampPosition,

    // Funciones de configuración
    updateDimensions,
    resetCrosshairs,
    startDragging,
    stopDragging,
    setCrosshairVisibility,
    setAllCrosshairsVisibility,

    // Computed properties
    volumeCoordinates,
    isDragging,
    isHovering
  }
}
