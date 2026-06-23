/**
 * Sistema de logging centralizado para la aplicación médica
 * Permite controlar el nivel de detalle de los logs y filtrar por categorías
 * 
 * Uso:
 * import { logger } from '@/utils/logger'
 * logger.info('RENDER', 'Canvas renderizado', { width: 800, height: 600 })
 * logger.error('API', 'Error de conexión', error)
 */

// Niveles de logging (menor número = más prioritario)
export const LogLevel = {
  ERROR: 0,   // Solo errores críticos
  WARN: 1,    // Advertencias importantes
  INFO: 2,    // Información general del flujo
  DEBUG: 3,   // Detalles de debugging (desactivado en producción)
  TRACE: 4    // Trazas muy detalladas (solo desarrollo)
}

// Categorías de logging
export const LogCategory = {
  // Sistema core
  INIT: 'INIT',           // Inicialización de componentes
  RENDER: 'RENDER',       // Renderizado de canvas y 3D
  WORKER: 'WORKER',       // Web Workers
  
  // Datos médicos
  MEDICAL: 'MEDICAL',     // Procesamiento de datos médicos
  NIFTI: 'NIFTI',         // Archivos NIfTI
  DICOM: 'DICOM',         // Archivos DICOM
  
  // Interacción
  UI: 'UI',               // Eventos de interfaz
  INTERACTION: 'INTERACTION', // Zoom, pan, crosshairs
  
  // Procesamiento
  FILTER: 'FILTER',       // Aplicación de filtros
  AI: 'AI',               // Análisis de IA
  
  // Backend
  API: 'API',             // Llamadas a API
  AUTH: 'AUTH',           // Autenticación
  
  // 3D
  THREEJS: '3D',          // Three.js y renderizado 3D
  QUAD_VIEW: 'QUAD',      // Modo 4 vistas
  
  // Sistema
  PERF: 'PERF',           // Performance
  ERROR: 'ERROR'          // Errores generales
}

// Configuración del logger
const config = {
  // Nivel mínimo a mostrar (en producción usar LogLevel.WARN)
  minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN,
  
  // Categorías habilitadas (vacío = todas)
  enabledCategories: new Set(),
  
  // Categorías silenciadas
  mutedCategories: new Set([
    // Puedes agregar categorías a silenciar aquí
    // LogCategory.RENDER,
    // LogCategory.INTERACTION
  ]),
  
  // Mostrar timestamps
  showTimestamp: true,
  
  // Agrupar logs similares
  groupSimilar: true,
  
  // Límite de logs por segundo por categoría (anti-spam)
  rateLimit: 10
}

// Cache para rate limiting
const rateLimitCache = new Map()

// Emojis por categoría para mejor visualización
const categoryEmojis = {
  [LogCategory.INIT]: '🚀',
  [LogCategory.RENDER]: '🎨',
  [LogCategory.WORKER]: '⚙️',
  [LogCategory.MEDICAL]: '🏥',
  [LogCategory.NIFTI]: '📊',
  [LogCategory.DICOM]: '🏥',
  [LogCategory.UI]: '🖱️',
  [LogCategory.INTERACTION]: '👆',
  [LogCategory.FILTER]: '🎛️',
  [LogCategory.AI]: '🤖',
  [LogCategory.API]: '🌐',
  [LogCategory.AUTH]: '🔐',
  [LogCategory.THREEJS]: '🧊',
  [LogCategory.QUAD_VIEW]: '🔲',
  [LogCategory.PERF]: '⚡',
  [LogCategory.ERROR]: '❌'
}

// Colores por nivel
const levelColors = {
  [LogLevel.ERROR]: 'color: #ff4444; font-weight: bold',
  [LogLevel.WARN]: 'color: #ffaa00; font-weight: bold',
  [LogLevel.INFO]: 'color: #4CAF50',
  [LogLevel.DEBUG]: 'color: #2196F3',
  [LogLevel.TRACE]: 'color: #9E9E9E'
}

/**
 * Verifica si un log debe mostrarse según configuración
 */
function shouldLog(level, category) {
  // Verificar nivel mínimo
  if (level < config.minLevel) return false
  
  // Verificar categorías silenciadas
  if (config.mutedCategories.has(category)) return false
  
  // Si hay categorías habilitadas específicas, verificar
  if (config.enabledCategories.size > 0 && !config.enabledCategories.has(category)) {
    return false
  }
  
  // Rate limiting
  if (config.groupSimilar) {
    const key = `${category}-${level}`
    const now = Date.now()
    const lastLog = rateLimitCache.get(key) || 0
    
    if (now - lastLog < 1000 / config.rateLimit) {
      return false
    }
    
    rateLimitCache.set(key, now)
  }
  
  return true
}

/**
 * Formatea el mensaje de log
 */
function formatMessage(level, category, message, data) {
  const emoji = categoryEmojis[category] || '📝'
  const timestamp = config.showTimestamp ? `[${new Date().toLocaleTimeString()}]` : ''
  
  return {
    prefix: `${timestamp} ${emoji} [${category}]`,
    message,
    data
  }
}

/**
 * Clase Logger principal
 */
class Logger {
  /**
   * Log de error (siempre visible)
   */
  error(category, message, error = null) {
    if (!shouldLog(LogLevel.ERROR, category)) return
    
    const formatted = formatMessage(LogLevel.ERROR, category, message)
    console.error(formatted.prefix, formatted.message, error || '')
    
    // En producción, aquí podrías enviar a servicio de error tracking
    if (!import.meta.env.DEV && error) {
      // Ejemplo: Sentry.captureException(error)
    }
  }
  
  /**
   * Log de advertencia
   */
  warn(category, message, data = null) {
    if (!shouldLog(LogLevel.WARN, category)) return
    
    const formatted = formatMessage(LogLevel.WARN, category, message, data)
    console.warn(formatted.prefix, formatted.message, data || '')
  }
  
  /**
   * Log informativo
   */
  info(category, message, data = null) {
    if (!shouldLog(LogLevel.INFO, category)) return
    
    const formatted = formatMessage(LogLevel.INFO, category, message, data)
    console.log(formatted.prefix, formatted.message, data || '')
  }
  
  /**
   * Log de debug (solo desarrollo)
   */
  debug(category, message, data = null) {
    if (!shouldLog(LogLevel.DEBUG, category)) return
    
    const formatted = formatMessage(LogLevel.DEBUG, category, message, data)
    console.log(formatted.prefix, formatted.message, data || '')
  }
  
  /**
   * Log de trace (muy detallado, solo desarrollo)
   */
  trace(category, message, data = null) {
    if (!shouldLog(LogLevel.TRACE, category)) return
    
    const formatted = formatMessage(LogLevel.TRACE, category, message, data)
    console.log(formatted.prefix, formatted.message, data || '')
  }
  
  /**
   * Agrupa logs relacionados
   */
  group(category, title, fn) {
    if (!shouldLog(LogLevel.INFO, category)) {
      // Ejecutar función sin agrupar si no se debe loguear
      fn()
      return
    }
    
    const emoji = categoryEmojis[category] || '📝'
    console.group(`${emoji} [${category}] ${title}`)
    fn()
    console.groupEnd()
  }
  
  /**
   * Medir tiempo de ejecución
   */
  time(category, label) {
    if (!shouldLog(LogLevel.DEBUG, category)) return
    
    const emoji = categoryEmojis[category] || '📝'
    console.time(`${emoji} [${category}] ${label}`)
  }
  
  timeEnd(category, label) {
    if (!shouldLog(LogLevel.DEBUG, category)) return
    
    const emoji = categoryEmojis[category] || '📝'
    console.timeEnd(`${emoji} [${category}] ${label}`)
  }
  
  /**
   * Configurar el logger
   */
  configure(options) {
    if (options.minLevel !== undefined) {
      config.minLevel = options.minLevel
    }
    if (options.enableCategories) {
      config.enabledCategories = new Set(options.enableCategories)
    }
    if (options.muteCategories) {
      config.mutedCategories = new Set(options.muteCategories)
    }
    if (options.showTimestamp !== undefined) {
      config.showTimestamp = options.showTimestamp
    }
  }
  
  /**
   * Habilitar categoría específica
   */
  enable(category) {
    config.mutedCategories.delete(category)
    config.enabledCategories.add(category)
  }
  
  /**
   * Deshabilitar categoría específica
   */
  disable(category) {
    config.mutedCategories.add(category)
  }
  
  /**
   * Obtener configuración actual
   */
  getConfig() {
    return {
      minLevel: config.minLevel,
      enabledCategories: Array.from(config.enabledCategories),
      mutedCategories: Array.from(config.mutedCategories),
      showTimestamp: config.showTimestamp
    }
  }
}

// Exportar instancia singleton
export const logger = new Logger()

// Exponer en window para debugging en consola
if (typeof window !== 'undefined') {
  window.__logger = logger
  window.__LogCategory = LogCategory
  window.__LogLevel = LogLevel
}

// Ejemplos de uso en consola:
// window.__logger.configure({ minLevel: window.__LogLevel.DEBUG })
// window.__logger.enable(window.__LogCategory.RENDER)
// window.__logger.disable(window.__LogCategory.INTERACTION)

export default logger
