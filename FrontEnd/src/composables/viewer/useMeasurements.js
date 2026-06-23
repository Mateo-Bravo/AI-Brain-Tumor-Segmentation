/**
 * 📏 useMeasurements.js
 *
 * Composable para herramientas de medición en imágenes médicas
 *
 * Funcionalidades:
 * - Medición de distancias (líneas)
 * - Medición de ángulos
 * - Medición de áreas (polígonos, círculos, elipses)
 * - Medición de volúmenes (ROI 3D)
 * - Anotaciones y etiquetas
 * - Conversión de píxeles a unidades reales (mm, cm)
 * - Exportación de mediciones
 * - Historial de mediciones
 *
 * @author Richard - Sistema de Mediciones del Visor Médico
 */

import { computed, reactive, ref } from 'vue'

/**
 * Composable para herramientas de medición
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para mediciones
 */
export function useMeasurements(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    pixelSpacing: options.pixelSpacing || { x: 1, y: 1, z: 1 }, // mm por píxel
    defaultUnit: options.defaultUnit || 'mm',
    snapToEdges: options.snapToEdges || false,
    showLabels: options.showLabels !== false,
    decimals: options.decimals || 2,
    colors: {
      active: options.activeColor || '#00FF00',
      inactive: options.inactiveColor || '#FFFF00',
      completed: options.completedColor || '#00AAFF',
      hover: options.hoverColor || '#FF00FF'
    }
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Herramienta de medición activa
   */
  const activeTool = ref(null) // 'distance', 'angle', 'area', 'volume', 'annotation'

  /**
   * Estado de la medición actual (en progreso)
   */
  const currentMeasurement = reactive({
    type: null,
    points: [],
    isComplete: false,
    view: null // 'axial', 'coronal', 'sagittal', '3d'
  })

  /**
   * Lista de todas las mediciones completadas
   */
  const measurements = ref([])

  /**
   * ID incremental para mediciones
   */
  let measurementIdCounter = 0

  /**
   * Medición seleccionada/enfocada
   */
  const selectedMeasurement = ref(null)

  /**
   * Estado de hover sobre mediciones
   */
  const hoveredMeasurement = ref(null)

  /**
   * Estado de edición
   */
  const isEditingMeasurement = ref(false)
  const editingMeasurementId = ref(null)

  /**
   * Configuración visual de las herramientas
   */
  const visualConfig = reactive({
    lineWidth: 2,
    pointRadius: 5,
    fontSize: 12,
    labelOffset: 10,
    showGrid: false,
    showRuler: false
  })

  /**
   * Unidades disponibles
   */
  const availableUnits = ['mm', 'cm', 'px']
  const currentUnit = ref(config.defaultUnit)

  /**
   * Estadísticas de mediciones
   */
  const stats = computed(() => ({
    total: measurements.value.length,
    byType: {
      distance: measurements.value.filter(m => m.type === 'distance').length,
      angle: measurements.value.filter(m => m.type === 'angle').length,
      area: measurements.value.filter(m => m.type === 'area').length,
      volume: measurements.value.filter(m => m.type === 'volume').length,
      annotation: measurements.value.filter(m => m.type === 'annotation').length
    },
    byView: {
      axial: measurements.value.filter(m => m.view === 'axial').length,
      coronal: measurements.value.filter(m => m.view === 'coronal').length,
      sagittal: measurements.value.filter(m => m.view === 'sagittal').length,
      '3d': measurements.value.filter(m => m.view === '3d').length
    }
  }))

  // ============================================
  // 🎯 FUNCIONES DE HERRAMIENTAS
  // ============================================

  /**
   * Activa una herramienta de medición
   * @param {string} tool - Tipo de herramienta
   */
  function activateTool(tool) {
    if (!['distance', 'angle', 'area', 'volume', 'annotation', null].includes(tool)) {
      console.warn('⚠️ Herramienta inválida:', tool)
      return
    }

    activeTool.value = tool

    // Resetear medición actual si cambia la herramienta
    if (tool !== currentMeasurement.type) {
      resetCurrentMeasurement()
    }

    console.log(`🔧 Herramienta activada: ${tool || 'ninguna'}`)
  }

  /**
   * Desactiva la herramienta actual
   */
  function deactivateTool() {
    activateTool(null)
    resetCurrentMeasurement()
  }

  /**
   * Resetea la medición actual
   */
  function resetCurrentMeasurement() {
    currentMeasurement.type = null
    currentMeasurement.points = []
    currentMeasurement.isComplete = false
    currentMeasurement.view = null
  }

  // ============================================
  // 📏 MEDICIÓN DE DISTANCIAS
  // ============================================

  /**
   * Inicia una nueva medición de distancia
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {string} view - Vista
   */
  function startDistanceMeasurement(x, y, view) {
    currentMeasurement.type = 'distance'
    currentMeasurement.points = [{ x, y }]
    currentMeasurement.isComplete = false
    currentMeasurement.view = view
  }

  /**
   * Añade punto a la medición de distancia
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   */
  function addDistancePoint(x, y) {
    if (currentMeasurement.type !== 'distance') return

    currentMeasurement.points.push({ x, y })

    // Distancia necesita 2 puntos
    if (currentMeasurement.points.length === 2) {
      completeMeasurement()
    }
  }

  /**
   * Calcula la distancia entre dos puntos
   * @param {Object} p1 - Punto 1 {x, y}
   * @param {Object} p2 - Punto 2 {x, y}
   * @param {string} view - Vista para aplicar pixel spacing correcto
   * @returns {number} Distancia en mm
   */
  function calculateDistance(p1, p2, view = 'axial') {
    const dx = Math.abs(p2.x - p1.x)
    const dy = Math.abs(p2.y - p1.y)

    // Obtener pixel spacing según la vista
    let spacingX = config.pixelSpacing.x
    let spacingY = config.pixelSpacing.y

    if (view === 'coronal') {
      spacingY = config.pixelSpacing.z
    } else if (view === 'sagittal') {
      spacingX = config.pixelSpacing.y
      spacingY = config.pixelSpacing.z
    }

    // Distancia euclidiana con pixel spacing
    const distanceMm = Math.sqrt(
      Math.pow(dx * spacingX, 2) + Math.pow(dy * spacingY, 2)
    )

    return distanceMm
  }

  // ============================================
  // 📐 MEDICIÓN DE ÁNGULOS
  // ============================================

  /**
   * Inicia medición de ángulo
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {string} view - Vista
   */
  function startAngleMeasurement(x, y, view) {
    currentMeasurement.type = 'angle'
    currentMeasurement.points = [{ x, y }]
    currentMeasurement.isComplete = false
    currentMeasurement.view = view
  }

  /**
   * Añade punto a la medición de ángulo
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   */
  function addAnglePoint(x, y) {
    if (currentMeasurement.type !== 'angle') return

    currentMeasurement.points.push({ x, y })

    // Ángulo necesita 3 puntos (vértice en el medio)
    if (currentMeasurement.points.length === 3) {
      completeMeasurement()
    }
  }

  /**
   * Calcula el ángulo entre tres puntos
   * @param {Object} p1 - Punto 1
   * @param {Object} p2 - Punto 2 (vértice)
   * @param {Object} p3 - Punto 3
   * @returns {number} Ángulo en grados
   */
  function calculateAngle(p1, p2, p3) {
    // Vectores desde el vértice (p2)
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }

    // Producto punto
    const dot = v1.x * v2.x + v1.y * v2.y

    // Magnitudes
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

    // Ángulo en radianes
    const angleRad = Math.acos(dot / (mag1 * mag2))

    // Convertir a grados
    const angleDeg = angleRad * (180 / Math.PI)

    return angleDeg
  }

  // ============================================
  // 📦 MEDICIÓN DE ÁREAS
  // ============================================

  /**
   * Inicia medición de área (polígono)
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {string} view - Vista
   */
  function startAreaMeasurement(x, y, view) {
    currentMeasurement.type = 'area'
    currentMeasurement.points = [{ x, y }]
    currentMeasurement.isComplete = false
    currentMeasurement.view = view
  }

  /**
   * Añade punto al polígono de área
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   */
  function addAreaPoint(x, y) {
    if (currentMeasurement.type !== 'area') return

    currentMeasurement.points.push({ x, y })
  }

  /**
   * Completa la medición de área (cierra el polígono)
   */
  function completeAreaMeasurement() {
    if (currentMeasurement.type !== 'area') return
    if (currentMeasurement.points.length < 3) {
      console.warn('⚠️ Se necesitan al menos 3 puntos para un área')
      return
    }

    completeMeasurement()
  }

  /**
   * Calcula el área de un polígono usando la fórmula del Shoelace
   * @param {Array} points - Array de puntos {x, y}
   * @param {string} view - Vista
   * @returns {number} Área en mm²
   */
  function calculateArea(points, view = 'axial') {
    if (points.length < 3) return 0

    let area = 0

    // Fórmula del Shoelace
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i].x * points[j].y
      area -= points[j].x * points[i].y
    }

    area = Math.abs(area / 2)

    // Aplicar pixel spacing
    let spacingX = config.pixelSpacing.x
    let spacingY = config.pixelSpacing.y

    if (view === 'coronal') {
      spacingY = config.pixelSpacing.z
    } else if (view === 'sagittal') {
      spacingX = config.pixelSpacing.y
      spacingY = config.pixelSpacing.z
    }

    const areaMm2 = area * spacingX * spacingY

    return areaMm2
  }

  /**
   * Calcula el perímetro de un polígono
   * @param {Array} points - Array de puntos
   * @param {string} view - Vista
   * @returns {number} Perímetro en mm
   */
  function calculatePerimeter(points, view = 'axial') {
    if (points.length < 2) return 0

    let perimeter = 0

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      perimeter += calculateDistance(points[i], points[j], view)
    }

    return perimeter
  }

  // ============================================
  // 📝 ANOTACIONES
  // ============================================

  /**
   * Añade una anotación de texto
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {string} text - Texto de la anotación
   * @param {string} view - Vista
   */
  function addAnnotation(x, y, text, view) {
    const annotation = {
      id: generateMeasurementId(),
      type: 'annotation',
      points: [{ x, y }],
      text: text || 'Anotación',
      view: view,
      timestamp: Date.now(),
      color: config.colors.completed
    }

    measurements.value.push(annotation)
    console.log('📝 Anotación añadida:', annotation.id)

    return annotation
  }

  // ============================================
  // 🎯 GESTIÓN DE MEDICIONES
  // ============================================

  /**
   * Genera un ID único para medición
   * @returns {string} ID de medición
   */
  function generateMeasurementId() {
    return `measurement_${Date.now()}_${measurementIdCounter++}`
  }

  /**
   * Completa la medición actual y la añade a la lista
   */
  function completeMeasurement() {
    if (!currentMeasurement.type || currentMeasurement.points.length === 0) {
      return
    }

    // Calcular valor según el tipo
    let value = 0
    let unit = currentUnit.value
    let additionalData = {}

    switch (currentMeasurement.type) {
      case 'distance':
        if (currentMeasurement.points.length === 2) {
          value = calculateDistance(
            currentMeasurement.points[0],
            currentMeasurement.points[1],
            currentMeasurement.view
          )
        }
        break

      case 'angle':
        if (currentMeasurement.points.length === 3) {
          value = calculateAngle(
            currentMeasurement.points[0],
            currentMeasurement.points[1],
            currentMeasurement.points[2]
          )
          unit = '°'
        }
        break

      case 'area':
        if (currentMeasurement.points.length >= 3) {
          value = calculateArea(currentMeasurement.points, currentMeasurement.view)
          additionalData.perimeter = calculatePerimeter(
            currentMeasurement.points,
            currentMeasurement.view
          )
          unit = currentUnit.value + '²'
        }
        break
    }

    // Crear objeto de medición
    const measurement = {
      id: generateMeasurementId(),
      type: currentMeasurement.type,
      points: [...currentMeasurement.points],
      value: value,
      unit: unit,
      view: currentMeasurement.view,
      timestamp: Date.now(),
      color: config.colors.completed,
      ...additionalData
    }

    // Añadir a la lista
    measurements.value.push(measurement)

    console.log('✅ Medición completada:', measurement)

    // Resetear medición actual
    resetCurrentMeasurement()

    return measurement
  }

  /**
   * Elimina una medición
   * @param {string} measurementId - ID de la medición
   */
  function deleteMeasurement(measurementId) {
    const index = measurements.value.findIndex(m => m.id === measurementId)

    if (index !== -1) {
      measurements.value.splice(index, 1)
      console.log('🗑️ Medición eliminada:', measurementId)

      // Si era la medición seleccionada, deseleccionar
      if (selectedMeasurement.value?.id === measurementId) {
        selectedMeasurement.value = null
      }

      return true
    }

    return false
  }

  /**
   * Elimina todas las mediciones
   */
  function clearAllMeasurements() {
    const count = measurements.value.length
    measurements.value = []
    selectedMeasurement.value = null
    hoveredMeasurement.value = null
    console.log(`🗑️ ${count} mediciones eliminadas`)
  }

  /**
   * Elimina mediciones de una vista específica
   * @param {string} view - Vista
   */
  function clearMeasurementsByView(view) {
    const count = measurements.value.length
    measurements.value = measurements.value.filter(m => m.view !== view)
    const deleted = count - measurements.value.length
    console.log(`🗑️ ${deleted} mediciones eliminadas de vista ${view}`)
  }

  /**
   * Selecciona una medición
   * @param {string} measurementId - ID de la medición
   */
  function selectMeasurement(measurementId) {
    const measurement = measurements.value.find(m => m.id === measurementId)

    if (measurement) {
      selectedMeasurement.value = measurement
      console.log('🎯 Medición seleccionada:', measurementId)
    }
  }

  /**
   * Deselecciona la medición actual
   */
  function deselectMeasurement() {
    selectedMeasurement.value = null
  }

  /**
   * Actualiza el texto de una anotación
   * @param {string} measurementId - ID de la medición
   * @param {string} newText - Nuevo texto
   */
  function updateAnnotationText(measurementId, newText) {
    const measurement = measurements.value.find(m => m.id === measurementId)

    if (measurement && measurement.type === 'annotation') {
      measurement.text = newText
      console.log('✏️ Anotación actualizada:', measurementId)
    }
  }

  // ============================================
  // 🎨 FUNCIONES DE DIBUJADO
  // ============================================

  /**
   * Dibuja una medición en el canvas
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {Object} measurement - Objeto de medición
   */
  function drawMeasurement(ctx, measurement) {
    if (!ctx || !measurement) return

    ctx.save()

    // Determinar color
    let color = measurement.color || config.colors.completed
    if (selectedMeasurement.value?.id === measurement.id) {
      color = config.colors.active
    } else if (hoveredMeasurement.value?.id === measurement.id) {
      color = config.colors.hover
    }

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = visualConfig.lineWidth
    ctx.font = `${visualConfig.fontSize}px Arial`

    switch (measurement.type) {
      case 'distance':
        drawDistance(ctx, measurement, color)
        break
      case 'angle':
        drawAngle(ctx, measurement, color)
        break
      case 'area':
        drawArea(ctx, measurement, color)
        break
      case 'annotation':
        drawAnnotation(ctx, measurement, color)
        break
    }

    ctx.restore()
  }

  /**
   * Dibuja una medición de distancia
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {Object} measurement - Medición
   * @param {string} color - Color
   */
  function drawDistance(ctx, measurement, color) {
    if (measurement.points.length < 2) return

    const p1 = measurement.points[0]
    const p2 = measurement.points[1]

    // Línea
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()

    // Puntos
    drawPoint(ctx, p1.x, p1.y, color)
    drawPoint(ctx, p2.x, p2.y, color)

    // Etiqueta con valor
    if (config.showLabels) {
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2
      const label = formatValue(measurement.value, measurement.unit)
      drawLabel(ctx, midX, midY, label, color)
    }
  }

  /**
   * Dibuja una medición de ángulo
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {Object} measurement - Medición
   * @param {string} color - Color
   */
  function drawAngle(ctx, measurement, color) {
    if (measurement.points.length < 3) return

    const p1 = measurement.points[0]
    const p2 = measurement.points[1] // Vértice
    const p3 = measurement.points[2]

    // Líneas
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.stroke()

    // Puntos
    drawPoint(ctx, p1.x, p1.y, color)
    drawPoint(ctx, p2.x, p2.y, color)
    drawPoint(ctx, p3.x, p3.y, color)

    // Arco en el vértice
    const radius = 20
    const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x)
    const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x)

    ctx.beginPath()
    ctx.arc(p2.x, p2.y, radius, angle1, angle2)
    ctx.stroke()

    // Etiqueta
    if (config.showLabels) {
      const label = formatValue(measurement.value, measurement.unit)
      drawLabel(ctx, p2.x + radius + 10, p2.y, label, color)
    }
  }

  /**
   * Dibuja una medición de área
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {Object} measurement - Medición
   * @param {string} color - Color
   */
  function drawArea(ctx, measurement, color) {
    if (measurement.points.length < 3) return

    // Polígono con relleno semi-transparente
    ctx.beginPath()
    ctx.moveTo(measurement.points[0].x, measurement.points[0].y)

    for (let i = 1; i < measurement.points.length; i++) {
      ctx.lineTo(measurement.points[i].x, measurement.points[i].y)
    }

    ctx.closePath()

    // Relleno
    ctx.fillStyle = color + '33' // Añadir transparencia
    ctx.fill()

    // Contorno
    ctx.stroke()

    // Puntos
    measurement.points.forEach(p => {
      drawPoint(ctx, p.x, p.y, color)
    })

    // Etiqueta con área
    if (config.showLabels) {
      const centroid = calculateCentroid(measurement.points)
      const label = formatValue(measurement.value, measurement.unit)
      drawLabel(ctx, centroid.x, centroid.y, label, color)
    }
  }

  /**
   * Dibuja una anotación
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {Object} measurement - Medición
   * @param {string} color - Color
   */
  function drawAnnotation(ctx, measurement, color) {
    if (measurement.points.length === 0) return

    const p = measurement.points[0]

    // Punto
    drawPoint(ctx, p.x, p.y, color)

    // Texto
    drawLabel(ctx, p.x + 10, p.y - 10, measurement.text, color)
  }

  /**
   * Dibuja un punto
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {string} color - Color
   */
  function drawPoint(ctx, x, y, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, visualConfig.pointRadius, 0, Math.PI * 2)
    ctx.fill()

    // Borde blanco
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  /**
   * Dibuja una etiqueta de texto
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {string} text - Texto
   * @param {string} color - Color
   */
  function drawLabel(ctx, x, y, text, color) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.font = `${visualConfig.fontSize}px Arial`

    const metrics = ctx.measureText(text)
    const padding = 4

    // Fondo
    ctx.fillRect(
      x - padding,
      y - visualConfig.fontSize - padding,
      metrics.width + padding * 2,
      visualConfig.fontSize + padding * 2
    )

    // Texto
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  }

  /**
   * Dibuja la medición actual en progreso
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} mouseX - Posición X del mouse (opcional)
   * @param {number} mouseY - Posición Y del mouse (opcional)
   */
  function drawCurrentMeasurement(ctx, mouseX = null, mouseY = null) {
    if (!ctx || !currentMeasurement.type || currentMeasurement.points.length === 0) {
      return
    }

    ctx.save()
    ctx.strokeStyle = config.colors.active
    ctx.fillStyle = config.colors.active
    ctx.lineWidth = visualConfig.lineWidth
    ctx.setLineDash([5, 5]) // Línea discontinua para indicar que está en progreso

    const points = [...currentMeasurement.points]

    // Añadir posición del mouse como punto temporal si está disponible
    if (mouseX !== null && mouseY !== null) {
      points.push({ x: mouseX, y: mouseY })
    }

    // Dibujar según el tipo
    switch (currentMeasurement.type) {
      case 'distance':
        if (points.length >= 1) {
          drawPoint(ctx, points[0].x, points[0].y, config.colors.active)

          if (points.length === 2) {
            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
            ctx.lineTo(points[1].x, points[1].y)
            ctx.stroke()

            // Mostrar distancia temporal
            const tempDistance = calculateDistance(points[0], points[1], currentMeasurement.view)
            const label = formatValue(tempDistance, currentUnit.value)
            const midX = (points[0].x + points[1].x) / 2
            const midY = (points[0].y + points[1].y) / 2
            drawLabel(ctx, midX, midY, label, config.colors.active)
          }
        }
        break

      case 'angle':
        // Dibujar puntos y líneas
        points.forEach((p, i) => {
          drawPoint(ctx, p.x, p.y, config.colors.active)

          if (i > 0) {
            ctx.beginPath()
            ctx.moveTo(points[i - 1].x, points[i - 1].y)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
          }
        })

        // Mostrar ángulo temporal si hay 3 puntos
        if (points.length === 3) {
          const tempAngle = calculateAngle(points[0], points[1], points[2])
          const label = formatValue(tempAngle, '°')
          drawLabel(ctx, points[1].x + 30, points[1].y, label, config.colors.active)
        }
        break

      case 'area':
        // Dibujar polígono
        if (points.length >= 2) {
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)

          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y)
          }

          // Si hay mouse, cerrar hacia él
          if (mouseX !== null && mouseY !== null && points.length > currentMeasurement.points.length) {
            ctx.lineTo(points[0].x, points[0].y) // Cerrar al primer punto
          }

          ctx.stroke()

          // Puntos
          points.forEach(p => {
            drawPoint(ctx, p.x, p.y, config.colors.active)
          })
        }
        break
    }

    ctx.restore()
  }

  // ============================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Calcula el centroide de un polígono
   * @param {Array} points - Array de puntos
   * @returns {Object} {x, y}
   */
  function calculateCentroid(points) {
    let cx = 0
    let cy = 0

    points.forEach(p => {
      cx += p.x
      cy += p.y
    })

    return {
      x: cx / points.length,
      y: cy / points.length
    }
  }

  /**
   * Formatea un valor con unidades
   * @param {number} value - Valor
   * @param {string} unit - Unidad
   * @returns {string} Valor formateado
   */
  function formatValue(value, unit) {
    const converted = convertUnit(value, 'mm', currentUnit.value)
    return `${converted.toFixed(config.decimals)} ${unit}`
  }

  /**
   * Convierte entre unidades
   * @param {number} value - Valor
   * @param {string} fromUnit - Unidad origen
   * @param {string} toUnit - Unidad destino
   * @returns {number} Valor convertido
   */
  function convertUnit(value, fromUnit, toUnit) {
    if (fromUnit === toUnit) return value

    // Conversiones simples
    const conversions = {
      'mm_to_cm': 0.1,
      'cm_to_mm': 10,
      'mm_to_px': 1 / config.pixelSpacing.x,
      'px_to_mm': config.pixelSpacing.x
    }

    const key = `${fromUnit}_to_${toUnit}`
    return conversions[key] ? value * conversions[key] : value
  }

  /**
   * Verifica si un punto está cerca de una medición
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {Object} measurement - Medición
   * @param {number} threshold - Distancia umbral en píxeles
   * @returns {boolean}
   */
  function isPointNearMeasurement(x, y, measurement, threshold = 10) {
    return measurement.points.some(p => {
      const distance = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2))
      return distance <= threshold
    })
  }

  /**
   * Encuentra la medición más cercana a un punto
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {string} view - Vista
   * @param {number} threshold - Distancia umbral
   * @returns {Object|null} Medición encontrada
   */
  function findNearestMeasurement(x, y, view, threshold = 10) {
    const viewMeasurements = measurements.value.filter(m => m.view === view)

    for (const measurement of viewMeasurements) {
      if (isPointNearMeasurement(x, y, measurement, threshold)) {
        return measurement
      }
    }

    return null
  }

  /**
   * Actualiza el pixel spacing
   * @param {Object} spacing - {x, y, z} en mm
   */
  function updatePixelSpacing(spacing) {
    config.pixelSpacing = { ...spacing }
    console.log('📏 Pixel spacing actualizado:', config.pixelSpacing)
  }

  /**
   * Cambia la unidad de medida
   * @param {string} unit - Nueva unidad ('mm', 'cm', 'px')
   */
  function changeUnit(unit) {
    if (availableUnits.includes(unit)) {
      currentUnit.value = unit
      console.log(`📏 Unidad cambiada a: ${unit}`)
    }
  }

  // ============================================
  // 💾 EXPORTACIÓN DE MEDICIONES
  // ============================================

  /**
   * Exporta todas las mediciones a JSON
   * @returns {string} JSON string
   */
  function exportMeasurements() {
    const data = {
      measurements: measurements.value,
      config: {
        pixelSpacing: config.pixelSpacing,
        unit: currentUnit.value
      },
      exportDate: new Date().toISOString(),
      stats: stats.value
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Importa mediciones desde JSON
   * @param {string} jsonString - JSON string
   */
  function importMeasurements(jsonString) {
    try {
      const data = JSON.parse(jsonString)

      if (data.measurements && Array.isArray(data.measurements)) {
        measurements.value = data.measurements

        if (data.config) {
          if (data.config.pixelSpacing) {
            config.pixelSpacing = data.config.pixelSpacing
          }
          if (data.config.unit) {
            currentUnit.value = data.config.unit
          }
        }

        console.log(`✅ ${measurements.value.length} mediciones importadas`)
        return true
      }

      return false
    } catch (error) {
      console.error('❌ Error importando mediciones:', error)
      return false
    }
  }

  /**
   * Obtiene resumen de mediciones para un reporte
   * @returns {Object} Resumen
   */
  function getMeasurementsSummary() {
    return {
      total: measurements.value.length,
      byType: stats.value.byType,
      byView: stats.value.byView,
      measurements: measurements.value.map(m => ({
        id: m.id,
        type: m.type,
        value: formatValue(m.value, m.unit),
        view: m.view,
        timestamp: new Date(m.timestamp).toLocaleString()
      }))
    }
  }

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    activeTool,
    currentMeasurement,
    measurements,
    selectedMeasurement,
    hoveredMeasurement,
    isEditingMeasurement,
    editingMeasurementId,
    visualConfig,
    currentUnit,
    availableUnits,
    stats,

    // Herramientas
    activateTool,
    deactivateTool,

    // Medición de distancias
    startDistanceMeasurement,
    addDistancePoint,
    calculateDistance,

    // Medición de ángulos
    startAngleMeasurement,
    addAnglePoint,
    calculateAngle,

    // Medición de áreas
    startAreaMeasurement,
    addAreaPoint,
    completeAreaMeasurement,
    calculateArea,
    calculatePerimeter,

    // Anotaciones
    addAnnotation,

    // Gestión de mediciones
    completeMeasurement,
    deleteMeasurement,
    clearAllMeasurements,
    clearMeasurementsByView,
    selectMeasurement,
    deselectMeasurement,
    updateAnnotationText,
    resetCurrentMeasurement,

    // Funciones de dibujado
    drawMeasurement,
    drawDistance,
    drawAngle,
    drawArea,
    drawAnnotation,
    drawPoint,
    drawLabel,
    drawCurrentMeasurement,

    // Funciones auxiliares
    calculateCentroid,
    formatValue,
    convertUnit,
    isPointNearMeasurement,
    findNearestMeasurement,
    updatePixelSpacing,
    changeUnit,

    // Exportación
    exportMeasurements,
    importMeasurements,
    getMeasurementsSummary
  }
}
