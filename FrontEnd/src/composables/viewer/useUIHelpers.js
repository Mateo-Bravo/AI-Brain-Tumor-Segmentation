/**
 * 🎨 useUIHelpers.js
 *
 * Composable para funciones auxiliares de UI y utilidades visuales
 *
 * Funcionalidades:
 * - Formateo de valores y unidades
 * - Conversión de colores
 * - Generación de tooltips
 * - Helpers de canvas (texto, formas, efectos)
 * - Detección de colisiones y hover
 * - Cálculos geométricos 2D
 * - Utilidades de rendering
 * - Gestión de cursores
 * - Helpers de animación
 * - Utilidades de debug visual
 *
 * @author Richard - Utilidades de UI del Visor Médico
 */

import { computed, ref } from 'vue'

/**
 * Composable para helpers de UI
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Funciones auxiliares de UI
 */
export function useUIHelpers(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    defaultFont: options.defaultFont || 'Arial',
    defaultFontSize: options.defaultFontSize || 12,
    defaultTextColor: options.defaultTextColor || '#FFFFFF',
    defaultBackgroundColor: options.defaultBackgroundColor || 'rgba(0, 0, 0, 0.7)',
    tooltipPadding: options.tooltipPadding || 8,
    tooltipBorderRadius: options.tooltipBorderRadius || 4
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Cursor actual
   */
  const currentCursor = ref('default')

  /**
   * Estado de debug
   */
  const debugMode = ref(false)

  /**
   * Información de debug
   */
  const debugInfo = ref({})

  // ============================================
  // 📏 FORMATEO DE VALORES
  // ============================================

  /**
   * Formatea un número con decimales
   * @param {number} value - Valor a formatear
   * @param {number} decimals - Número de decimales
   * @returns {string} Valor formateado
   */
  function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0'
    }
    return value.toFixed(decimals)
  }

  /**
   * Formatea un valor con unidad
   * @param {number} value - Valor
   * @param {string} unit - Unidad
   * @param {number} decimals - Decimales
   * @returns {string} Valor formateado con unidad
   */
  function formatValueWithUnit(value, unit, decimals = 2) {
    return `${formatNumber(value, decimals)} ${unit}`
  }

  /**
   * Formatea coordenadas
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {number} z - Coordenada Z (opcional)
   * @returns {string} Coordenadas formateadas
   */
  function formatCoordinates(x, y, z = null) {
    if (z !== null) {
      return `(${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)})`
    }
    return `(${Math.round(x)}, ${Math.round(y)})`
  }

  /**
   * Formatea porcentaje
   * @param {number} value - Valor (0-1 o 0-100)
   * @param {boolean} normalized - Si está normalizado (0-1)
   * @param {number} decimals - Decimales
   * @returns {string} Porcentaje formateado
   */
  function formatPercentage(value, normalized = true, decimals = 1) {
    const percentage = normalized ? value * 100 : value
    return `${formatNumber(percentage, decimals)}%`
  }

  /**
   * Formatea tamaño de archivo
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} Tamaño formateado
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${formatNumber(bytes / Math.pow(k, i), 2)} ${sizes[i]}`
  }

  /**
   * Formatea tiempo en formato legible
   * @param {number} ms - Milisegundos
   * @returns {string} Tiempo formateado
   */
  function formatTime(ms) {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`
    } else if (ms < 60000) {
      return `${formatNumber(ms / 1000, 1)}s`
    } else {
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.round((ms % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  /**
   * Formatea fecha
   * @param {number|Date} timestamp - Timestamp o fecha
   * @param {boolean} includeTime - Incluir hora
   * @returns {string} Fecha formateada
   */
  function formatDate(timestamp, includeTime = true) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

    if (includeTime) {
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  /**
   * Abrevia texto largo
   * @param {string} text - Texto
   * @param {number} maxLength - Longitud máxima
   * @param {string} ellipsis - Sufijo
   * @returns {string} Texto abreviado
   */
  function truncateText(text, maxLength = 50, ellipsis = '...') {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength - ellipsis.length) + ellipsis
  }

  // ============================================
  // 🎨 CONVERSIÓN DE COLORES
  // ============================================

  /**
   * Convierte color hex a RGB
   * @param {string} hex - Color en formato hex (#RRGGBB)
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
   * Convierte RGB a hex
   * @param {number} r - Rojo (0-255)
   * @param {number} g - Verde (0-255)
   * @param {number} b - Azul (0-255)
   * @returns {string} Color en formato hex
   */
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }

  /**
   * Convierte RGB a RGBA
   * @param {number} r - Rojo
   * @param {number} g - Verde
   * @param {number} b - Azul
   * @param {number} a - Alpha (0-1)
   * @returns {string} Color RGBA
   */
  function rgbToRgba(r, g, b, a = 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  /**
   * Añade transparencia a un color hex
   * @param {string} hex - Color hex
   * @param {number} alpha - Transparencia (0-1)
   * @returns {string} Color RGBA
   */
  function hexToRgba(hex, alpha = 1) {
    const rgb = hexToRgb(hex)
    if (!rgb) return null
    return rgbToRgba(rgb.r, rgb.g, rgb.b, alpha)
  }

  /**
   * Interpola entre dos colores
   * @param {string} color1 - Color inicial (hex)
   * @param {string} color2 - Color final (hex)
   * @param {number} factor - Factor (0-1)
   * @returns {string} Color interpolado (hex)
   */
  function interpolateColor(color1, color2, factor) {
    const c1 = hexToRgb(color1)
    const c2 = hexToRgb(color2)

    if (!c1 || !c2) return color1

    const r = Math.round(c1.r + (c2.r - c1.r) * factor)
    const g = Math.round(c1.g + (c2.g - c1.g) * factor)
    const b = Math.round(c1.b + (c2.b - c1.b) * factor)

    return rgbToHex(r, g, b)
  }

  /**
   * Genera color desde una escala de colores
   * @param {number} value - Valor (0-1)
   * @param {Array} colorScale - Escala de colores [{value: 0, color: '#000'}, ...]
   * @returns {string} Color (hex)
   */
  function getColorFromScale(value, colorScale = null) {
    // Escala por defecto (azul -> verde -> amarillo -> rojo)
    const defaultScale = [
      { value: 0, color: '#0000FF' },
      { value: 0.33, color: '#00FF00' },
      { value: 0.66, color: '#FFFF00' },
      { value: 1, color: '#FF0000' }
    ]

    const scale = colorScale || defaultScale
    value = Math.max(0, Math.min(1, value))

    // Encontrar segmento de la escala
    for (let i = 0; i < scale.length - 1; i++) {
      const current = scale[i]
      const next = scale[i + 1]

      if (value >= current.value && value <= next.value) {
        const segmentValue = (value - current.value) / (next.value - current.value)
        return interpolateColor(current.color, next.color, segmentValue)
      }
    }

    return scale[scale.length - 1].color
  }

  // ============================================
  // ✏️ HELPERS DE CANVAS - TEXTO
  // ============================================

  /**
   * Dibuja texto con fondo
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {string} text - Texto
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {Object} options - Opciones de estilo
   */
  function drawTextWithBackground(ctx, text, x, y, options = {}) {
    const {
      font = `${config.defaultFontSize}px ${config.defaultFont}`,
      textColor = config.defaultTextColor,
      backgroundColor = config.defaultBackgroundColor,
      padding = 4,
      borderRadius = 2,
      align = 'left',
      baseline = 'top'
    } = options

    ctx.save()

    // Configurar texto
    ctx.font = font
    ctx.textAlign = align
    ctx.textBaseline = baseline

    // Medir texto
    const metrics = ctx.measureText(text)
    const textWidth = metrics.width
    const textHeight = parseInt(font)

    // Calcular posición del fondo según alineación
    let bgX = x - padding
    if (align === 'center') {
      bgX = x - textWidth / 2 - padding
    } else if (align === 'right') {
      bgX = x - textWidth - padding
    }

    let bgY = y - padding
    if (baseline === 'middle') {
      bgY = y - textHeight / 2 - padding
    } else if (baseline === 'bottom') {
      bgY = y - textHeight - padding
    }

    // Dibujar fondo
    ctx.fillStyle = backgroundColor
    if (borderRadius > 0) {
      drawRoundedRect(
        ctx,
        bgX,
        bgY,
        textWidth + padding * 2,
        textHeight + padding * 2,
        borderRadius
      )
      ctx.fill()
    } else {
      ctx.fillRect(bgX, bgY, textWidth + padding * 2, textHeight + padding * 2)
    }

    // Dibujar texto
    ctx.fillStyle = textColor
    ctx.fillText(text, x, y)

    ctx.restore()
  }

  /**
   * Dibuja texto multilínea
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {string} text - Texto
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {number} maxWidth - Ancho máximo
   * @param {number} lineHeight - Altura de línea
   */
  function drawMultilineText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ')
    let line = ''
    let currentY = y

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' '
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY)
        line = words[i] + ' '
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, currentY)
  }

  /**
   * Mide el tamaño de texto multilínea
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {string} text - Texto
   * @param {number} maxWidth - Ancho máximo
   * @param {number} lineHeight - Altura de línea
   * @returns {Object} {width, height, lines}
   */
  function measureMultilineText(ctx, text, maxWidth, lineHeight) {
    const words = text.split(' ')
    let line = ''
    let lines = []
    let maxLineWidth = 0

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' '
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && i > 0) {
        lines.push(line)
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width)
        line = words[i] + ' '
      } else {
        line = testLine
      }
    }
    lines.push(line)
    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width)

    return {
      width: maxLineWidth,
      height: lines.length * lineHeight,
      lines: lines.length
    }
  }

  // ============================================
  // 🔲 HELPERS DE CANVAS - FORMAS
  // ============================================

  /**
   * Dibuja un rectángulo con bordes redondeados
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} radius - Radio de esquinas
   */
  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  /**
   * Dibuja una flecha
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} fromX - Inicio X
   * @param {number} fromY - Inicio Y
   * @param {number} toX - Final X
   * @param {number} toY - Final Y
   * @param {number} arrowSize - Tamaño de la punta
   */
  function drawArrow(ctx, fromX, fromY, toX, toY, arrowSize = 10) {
    const angle = Math.atan2(toY - fromY, toX - fromX)

    // Línea
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Punta de flecha
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle - Math.PI / 6),
      toY - arrowSize * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle + Math.PI / 6),
      toY - arrowSize * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fill()
  }

  /**
   * Dibuja una cruz/X
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} x - Centro X
   * @param {number} y - Centro Y
   * @param {number} size - Tamaño
   */
  function drawCross(ctx, x, y, size) {
    ctx.beginPath()
    ctx.moveTo(x - size, y - size)
    ctx.lineTo(x + size, y + size)
    ctx.moveTo(x + size, y - size)
    ctx.lineTo(x - size, y + size)
    ctx.stroke()
  }

  /**
   * Dibuja un círculo con borde
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} x - Centro X
   * @param {number} y - Centro Y
   * @param {number} radius - Radio
   * @param {string} fillColor - Color de relleno
   * @param {string} strokeColor - Color de borde
   * @param {number} lineWidth - Ancho de borde
   */
  function drawCircle(ctx, x, y, radius, fillColor = null, strokeColor = null, lineWidth = 1) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)

    if (fillColor) {
      ctx.fillStyle = fillColor
      ctx.fill()
    }

    if (strokeColor) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = lineWidth
      ctx.stroke()
    }
  }

  // ============================================
  // 💬 TOOLTIPS
  // ============================================

  /**
   * Dibuja un tooltip
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {string} text - Texto del tooltip
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {Object} options - Opciones
   */
  function drawTooltip(ctx, text, x, y, options = {}) {
    const {
      padding = config.tooltipPadding,
      borderRadius = config.tooltipBorderRadius,
      backgroundColor = config.defaultBackgroundColor,
      textColor = config.defaultTextColor,
      font = `${config.defaultFontSize}px ${config.defaultFont}`,
      maxWidth = 200,
      offsetX = 10,
      offsetY = -10
    } = options

    ctx.save()

    // Configurar fuente
    ctx.font = font

    // Medir texto
    const lines = text.split('\n')
    const lineHeight = parseInt(font) + 4
    let maxLineWidth = 0

    lines.forEach(line => {
      const width = ctx.measureText(line).width
      maxLineWidth = Math.max(maxLineWidth, width)
    })

    const tooltipWidth = Math.min(maxLineWidth + padding * 2, maxWidth)
    const tooltipHeight = lines.length * lineHeight + padding * 2

    // Ajustar posición para que no se salga del canvas
    let tooltipX = x + offsetX
    let tooltipY = y + offsetY

    if (tooltipX + tooltipWidth > ctx.canvas.width) {
      tooltipX = x - tooltipWidth - offsetX
    }

    if (tooltipY - tooltipHeight < 0) {
      tooltipY = y - offsetY
    }

    // Dibujar fondo
    ctx.fillStyle = backgroundColor
    drawRoundedRect(ctx, tooltipX, tooltipY - tooltipHeight, tooltipWidth, tooltipHeight, borderRadius)
    ctx.fill()

    // Dibujar borde
    ctx.strokeStyle = textColor
    ctx.lineWidth = 1
    ctx.stroke()

    // Dibujar texto
    ctx.fillStyle = textColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    lines.forEach((line, index) => {
      ctx.fillText(line, tooltipX + padding, tooltipY - tooltipHeight + padding + index * lineHeight)
    })

    ctx.restore()
  }

  // ============================================
  // 🎯 DETECCIÓN DE COLISIONES
  // ============================================

  /**
   * Verifica si un punto está dentro de un rectángulo
   * @param {number} px - Punto X
   * @param {number} py - Punto Y
   * @param {number} rx - Rectángulo X
   * @param {number} ry - Rectángulo Y
   * @param {number} rw - Rectángulo ancho
   * @param {number} rh - Rectángulo alto
   * @returns {boolean}
   */
  function isPointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
  }

  /**
   * Verifica si un punto está dentro de un círculo
   * @param {number} px - Punto X
   * @param {number} py - Punto Y
   * @param {number} cx - Círculo centro X
   * @param {number} cy - Círculo centro Y
   * @param {number} radius - Radio
   * @returns {boolean}
   */
  function isPointInCircle(px, py, cx, cy, radius) {
    const distance = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2))
    return distance <= radius
  }

  /**
   * Calcula distancia entre dos puntos
   * @param {number} x1 - Punto 1 X
   * @param {number} y1 - Punto 1 Y
   * @param {number} x2 - Punto 2 X
   * @param {number} y2 - Punto 2 Y
   * @returns {number} Distancia
   */
  function distanceBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  /**
   * Calcula distancia de un punto a una línea
   * @param {number} px - Punto X
   * @param {number} py - Punto Y
   * @param {number} x1 - Línea inicio X
   * @param {number} y1 - Línea inicio Y
   * @param {number} x2 - Línea final X
   * @param {number} y2 - Línea final Y
   * @returns {number} Distancia
   */
  function distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1
    const B = py - y1
    const C = x2 - x1
    const D = y2 - y1

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) {
      param = dot / lenSq
    }

    let xx, yy

    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * C
      yy = y1 + param * D
    }

    const dx = px - xx
    const dy = py - yy

    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Verifica si un punto está cerca de una línea
   * @param {number} px - Punto X
   * @param {number} py - Punto Y
   * @param {number} x1 - Línea inicio X
   * @param {number} y1 - Línea inicio Y
   * @param {number} x2 - Línea final X
   * @param {number} y2 - Línea final Y
   * @param {number} threshold - Umbral de distancia
   * @returns {boolean}
   */
  function isPointNearLine(px, py, x1, y1, x2, y2, threshold = 5) {
    return distanceToLine(px, py, x1, y1, x2, y2) <= threshold
  }

  // ============================================
  // 🖱️ GESTIÓN DE CURSORES
  // ============================================

  /**
   * Establece el cursor del canvas
   * @param {HTMLElement} element - Elemento (canvas)
   * @param {string} cursor - Tipo de cursor
   */
  function setCursor(element, cursor) {
    if (element && element.style) {
      element.style.cursor = cursor
      currentCursor.value = cursor
    }
  }

  /**
   * Cursores comunes predefinidos
   */
  const cursors = {
    default: 'default',
    pointer: 'pointer',
    move: 'move',
    crosshair: 'crosshair',
    grab: 'grab',
    grabbing: 'grabbing',
    zoomIn: 'zoom-in',
    zoomOut: 'zoom-out',
    notAllowed: 'not-allowed',
    wait: 'wait',
    help: 'help',
    text: 'text',
    nResize: 'n-resize',
    sResize: 's-resize',
    eResize: 'e-resize',
    wResize: 'w-resize',
    neResize: 'ne-resize',
    nwResize: 'nw-resize',
    seResize: 'se-resize',
    swResize: 'sw-resize'
  }

  // ============================================
  // 🎬 HELPERS DE ANIMACIÓN
  // ============================================

  /**
   * Easing function - ease in out cubic
   * @param {number} t - Tiempo (0-1)
   * @returns {number} Valor eased
   */
  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  /**
   * Easing function - ease out expo
   * @param {number} t - Tiempo (0-1)
   * @returns {number} Valor eased
   */
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  }

  /**
   * Easing function - ease in out quad
   * @param {number} t - Tiempo (0-1)
   * @returns {number} Valor eased
   */
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  /**
   * Interpola linealmente entre dos valores
   * @param {number} a - Valor inicial
   * @param {number} b - Valor final
   * @param {number} t - Factor (0-1)
   * @returns {number} Valor interpolado
   */
  function lerp(a, b, t) {
    return a + (b - a) * t
  }

  /**
   * Clamp: limita un valor entre min y max
   * @param {number} value - Valor
   * @param {number} min - Mínimo
   * @param {number} max - Máximo
   * @returns {number} Valor limitado
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
  }

  // ============================================
  // 🐛 DEBUG VISUAL
  // ============================================

  /**
   * Activa/desactiva modo debug
   * @param {boolean} enabled - Habilitar
   */
  function setDebugMode(enabled) {
    debugMode.value = enabled
    console.log(`🐛 Modo debug: ${enabled ? 'activado' : 'desactivado'}`)
  }

  /**
   * Añade información de debug
   * @param {string} key - Clave
   * @param {*} value - Valor
   */
  function addDebugInfo(key, value) {
    debugInfo.value[key] = value
  }

  /**
   * Limpia información de debug
   */
  function clearDebugInfo() {
    debugInfo.value = {}
  }

  /**
   * Dibuja información de debug en canvas
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} x - Posición X
   * @param {number} y - Posición Y
   */
  function drawDebugInfo(ctx, x = 10, y = 10) {
    if (!debugMode.value) return

    const entries = Object.entries(debugInfo.value)
    if (entries.length === 0) return

    ctx.save()
    ctx.font = '12px monospace'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(x, y, 250, entries.length * 20 + 20)

    ctx.fillStyle = '#00FF00'
    ctx.fillText('=== DEBUG INFO ===', x + 10, y + 15)

    entries.forEach(([key, value], index) => {
      const text = `${key}: ${JSON.stringify(value)}`
      ctx.fillText(text, x + 10, y + 35 + index * 20)
    })

    ctx.restore()
  }

  /**
   * Dibuja un punto de debug
   * @param {CanvasRenderingContext2D} ctx - Contexto
   * @param {number} x - X
   * @param {number} y - Y
   * @param {string} label - Etiqueta
   * @param {string} color - Color
   */
  function drawDebugPoint(ctx, x, y, label = '', color = '#FF00FF') {
    if (!debugMode.value) return

    ctx.save()
    drawCircle(ctx, x, y, 5, null, color, 2)

    if (label) {
      drawTextWithBackground(ctx, label, x + 10, y - 10, {
        textColor: color,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 4
      })
    }
    ctx.restore()
  }

  // ============================================
  // 🔧 UTILIDADES MATEMÁTICAS
  // ============================================

  /**
   * Convierte grados a radianes
   * @param {number} degrees - Grados
   * @returns {number} Radianes
   */
  function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180)
  }

  /**
   * Convierte radianes a grados
   * @param {number} radians - Radianes
   * @returns {number} Grados
   */
  function radiansToDegrees(radians) {
    return radians * (180 / Math.PI)
  }

  /**
   * Genera un ID único
   * @param {string} prefix - Prefijo
   * @returns {string} ID único
   */
  function generateUniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado de debug completo
   */
  const debugState = computed(() => ({
    enabled: debugMode.value,
    info: debugInfo.value,
    infoCount: Object.keys(debugInfo.value).length
  }))

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    currentCursor,
    debugMode,
    debugInfo,

    // Formateo
    formatNumber,
    formatValueWithUnit,
    formatCoordinates,
    formatPercentage,
    formatFileSize,
    formatTime,
    formatDate,
    truncateText,

    // Colores
    hexToRgb,
    rgbToHex,
    rgbToRgba,
    hexToRgba,
    interpolateColor,
    getColorFromScale,

    // Canvas - Texto
    drawTextWithBackground,
    drawMultilineText,
    measureMultilineText,

    // Canvas - Formas
    drawRoundedRect,
    drawArrow,
    drawCross,
    drawCircle,

    // Tooltips
    drawTooltip,

    // Colisiones
    isPointInRect,
    isPointInCircle,
    distanceBetweenPoints,
    distanceToLine,
    isPointNearLine,

    // Cursores
    setCursor,
    cursors,

    // Animación
    easeInOutCubic,
    easeOutExpo,
    easeInOutQuad,
    lerp,
    clamp,

    // Debug
    setDebugMode,
    addDebugInfo,
    clearDebugInfo,
    drawDebugInfo,
    drawDebugPoint,

    // Utilidades matemáticas
    degreesToRadians,
    radiansToDegrees,
    generateUniqueId,

    // Computed properties
    debugState
  }
}
