/**
 * @fileoverview Composable para utilidades de debugging y logging optimizado
 * @module useDebugHelpers
 * @description Sistema de logging condicional para debugging sin impacto en rendimiento
 */

import { computed, reactive, ref } from 'vue'

/**
 * Composable para debugging helpers
 * @returns {Object} Herramientas de debugging y logging
 */
export function useDebugHelpers() {
  // ========================================
  // ⚙️ CONFIGURACIÓN
  // ========================================

  /**
   * Detecta si estamos en modo desarrollo
   */
  const IS_DEVELOPMENT = import.meta.env.DEV

  /**
   * Habilita/deshabilita logs de debug
   * @type {import('vue').Ref<boolean>}
   */
  const isDebugEnabled = ref(IS_DEVELOPMENT && true)

  /**
   * Nivel de logging actual
   * @type {import('vue').Ref<string>}
   */
  const logLevel = ref('DEBUG') // 'NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'

  /**
   * Estadísticas de logging
   */
  const logStats = reactive({
    totalLogs: 0,
    errors: 0,
    warnings: 0,
    debugs: 0,
    performance: 0,
    samples: 0
  })

  /**
   * Buffer de logs recientes (últimos 100)
   */
  const recentLogs = ref([])

  /**
   * Máximo de logs en buffer
   */
  const MAX_RECENT_LOGS = 100

  // ========================================
  // 🎨 ESTILOS DE CONSOLA
  // ========================================

  const CONSOLE_STYLES = {
    debug: 'color: #6366f1; font-weight: bold;',
    info: 'color: #3b82f6; font-weight: bold;',
    warn: 'color: #f59e0b; font-weight: bold;',
    error: 'color: #ef4444; font-weight: bold;',
    success: 'color: #10b981; font-weight: bold;',
    performance: 'color: #8b5cf6; font-weight: bold;',
    critical: 'color: #dc2626; font-weight: bold; font-size: 14px;',
    sample: 'color: #6b7280; font-style: italic;'
  }

  // ========================================
  // 📊 LOGGER PRINCIPAL (COMPATIBLE CON DASHBOARD)
  // ========================================

  /**
   * Sistema de logging optimizado (COMPATIBLE con código existente)
   */
  const logger = {
    /**
     * Log normal (solo en debug mode)
     */
    log: (...args) => {
      if (!isDebugEnabled.value) return
      console.log(...args)
      logStats.totalLogs++
      addToRecentLogs('LOG', args)
    },

    /**
     * Warning (solo en debug mode)
     */
    warn: (...args) => {
      if (!isDebugEnabled.value) return
      console.warn(...args)
      logStats.warnings++
      addToRecentLogs('WARN', args)
    },

    /**
     * Error (SIEMPRE se muestra)
     */
    error: (...args) => {
      console.error(...args)
      logStats.errors++
      addToRecentLogs('ERROR', args)
    },

    /**
     * Debug con prefijo [DEBUG]
     */
    debug: (...args) => {
      if (!isDebugEnabled.value) return
      console.log('%c[DEBUG]', CONSOLE_STYLES.debug, ...args)
      logStats.debugs++
      addToRecentLogs('DEBUG', args)
    },

    /**
     * Performance con prefijo [PERF]
     */
    performance: (...args) => {
      if (!isDebugEnabled.value) return
      console.log('%c[PERF]', CONSOLE_STYLES.performance, ...args)
      logStats.performance++
      addToRecentLogs('PERF', args)
    },

    /**
     * Critical (SIEMPRE se muestra) con prefijo [CRITICAL]
     */
    critical: (...args) => {
      console.log('%c[CRITICAL]', CONSOLE_STYLES.critical, ...args)
      addToRecentLogs('CRITICAL', args)
    },

    /**
     * Logging con sampling para reducir spam en bucles
     * @param {string} message - Mensaje a loggear
     * @param {number} sampleRate - Tasa de sampling (0.0 - 1.0)
     */
    sample: (message, sampleRate = 0.001) => {
      if (isDebugEnabled.value && Math.random() < sampleRate) {
        console.log('%c[SAMPLE]', CONSOLE_STYLES.sample, message)
        logStats.samples++
        addToRecentLogs('SAMPLE', [message])
      }
    }
  }

  // ========================================
  // 🔧 FUNCIONES AUXILIARES DE LOGGING
  // ========================================

  /**
   * Agrega un log al buffer de logs recientes
   * @param {string} type - Tipo de log
   * @param {Array} args - Argumentos del log
   */
  function addToRecentLogs(type, args) {
    const logEntry = {
      type,
      message: args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString()
    }

    recentLogs.value.unshift(logEntry)

    // Mantener solo los últimos MAX_RECENT_LOGS
    if (recentLogs.value.length > MAX_RECENT_LOGS) {
      recentLogs.value = recentLogs.value.slice(0, MAX_RECENT_LOGS)
    }
  }

  /**
   * Habilita el modo debug
   */
  function enableDebug() {
    isDebugEnabled.value = true
    console.log('%c🐛 Debug mode ENABLED', CONSOLE_STYLES.success)
  }

  /**
   * Deshabilita el modo debug
   */
  function disableDebug() {
    isDebugEnabled.value = false
    console.log('%c🔇 Debug mode DISABLED', CONSOLE_STYLES.warn)
  }

  /**
   * Toggle del modo debug
   */
  function toggleDebug() {
    isDebugEnabled.value = !isDebugEnabled.value
    console.log(
      `%c${isDebugEnabled.value ? '🐛 Debug ENABLED' : '🔇 Debug DISABLED'}`,
      isDebugEnabled.value ? CONSOLE_STYLES.success : CONSOLE_STYLES.warn
    )
  }

  /**
   * Limpia el buffer de logs recientes
   */
  function clearRecentLogs() {
    recentLogs.value = []
    console.log('%c🧹 Recent logs cleared', CONSOLE_STYLES.info)
  }

  /**
   * Resetea las estadísticas de logging
   */
  function resetLogStats() {
    logStats.totalLogs = 0
    logStats.errors = 0
    logStats.warnings = 0
    logStats.debugs = 0
    logStats.performance = 0
    logStats.samples = 0
    console.log('%c📊 Log statistics reset', CONSOLE_STYLES.info)
  }

  // ========================================
  // ⏱️ MEDICIÓN DE PERFORMANCE
  // ========================================

  /**
   * Timers activos para medición
   */
  const timers = new Map()

  /**
   * Inicia un timer de performance
   * @param {string} label - Etiqueta del timer
   */
  function timeStart(label) {
    timers.set(label, performance.now())
    if (isDebugEnabled.value) {
      console.log(`%c⏱️ Timer started: ${label}`, CONSOLE_STYLES.performance)
    }
  }

  /**
   * Detiene un timer y muestra el tiempo transcurrido
   * @param {string} label - Etiqueta del timer
   * @returns {number} Tiempo en milisegundos
   */
  function timeEnd(label) {
    const startTime = timers.get(label)
    if (!startTime) {
      console.warn(`Timer "${label}" no encontrado`)
      return 0
    }

    const elapsed = performance.now() - startTime
    timers.delete(label)

    if (isDebugEnabled.value) {
      console.log(
        `%c⏱️ Timer ended: ${label} - ${elapsed.toFixed(2)}ms`,
        CONSOLE_STYLES.performance
      )
    }

    return elapsed
  }

  /**
   * Mide el tiempo de ejecución de una función
   * @param {Function} fn - Función a medir
   * @param {string} label - Etiqueta de la medición
   * @returns {any} Resultado de la función
   */
  async function measureTime(fn, label = 'Function') {
    const startTime = performance.now()

    try {
      const result = await fn()
      const elapsed = performance.now() - startTime

      logger.performance(`⏱️ ${label} completed in ${elapsed.toFixed(2)}ms`)

      return result
    } catch (error) {
      const elapsed = performance.now() - startTime
      logger.error(`❌ ${label} failed after ${elapsed.toFixed(2)}ms:`, error)
      throw error
    }
  }

  // ========================================
  // 🔍 INSPECCIÓN DE OBJETOS
  // ========================================

  /**
   * Inspecciona un objeto con formato bonito
   * @param {any} obj - Objeto a inspeccionar
   * @param {string} label - Etiqueta opcional
   */
  function inspect(obj, label = 'Object') {
    if (!isDebugEnabled.value) return

    console.group(`%c🔍 ${label}`, CONSOLE_STYLES.info)
    console.log('Type:', typeof obj)
    console.log('Value:', obj)

    if (typeof obj === 'object' && obj !== null) {
      console.log('Keys:', Object.keys(obj))
      console.log('JSON:', JSON.stringify(obj, null, 2))
    }

    console.groupEnd()
  }

  /**
   * Muestra una tabla con datos
   * @param {Array|Object} data - Datos a mostrar
   * @param {string} label - Etiqueta opcional
   */
  function table(data, label = 'Data') {
    if (!isDebugEnabled.value) return

    console.log(`%c📊 ${label}`, CONSOLE_STYLES.info)
    console.table(data)
  }

  /**
   * Agrupa logs relacionados
   * @param {string} label - Etiqueta del grupo
   * @param {Function} fn - Función que genera los logs
   */
  function group(label, fn) {
    if (!isDebugEnabled.value) {
      fn()
      return
    }

    console.group(`%c📦 ${label}`, CONSOLE_STYLES.info)
    fn()
    console.groupEnd()
  }

  /**
   * Agrupa logs colapsados por defecto
   * @param {string} label - Etiqueta del grupo
   * @param {Function} fn - Función que genera los logs
   */
  function groupCollapsed(label, fn) {
    if (!isDebugEnabled.value) {
      fn()
      return
    }

    console.groupCollapsed(`%c📦 ${label}`, CONSOLE_STYLES.info)
    fn()
    console.groupEnd()
  }

  // ========================================
  // 🐛 DEBUGGING AVANZADO
  // ========================================

  /**
   * Trace del stack
   * @param {string} label - Etiqueta opcional
   */
  function trace(label = 'Trace') {
    if (!isDebugEnabled.value) return

    console.log(`%c🔍 ${label}`, CONSOLE_STYLES.debug)
    console.trace()
  }

  /**
   * Assert con mensaje personalizado
   * @param {boolean} condition - Condición a verificar
   * @param {string} message - Mensaje si falla
   */
  function assert(condition, message = 'Assertion failed') {
    if (!condition) {
      logger.error(`❌ ASSERT: ${message}`)
      console.trace()
    }
  }

  /**
   * Cuenta cuántas veces se ejecuta algo
   * @param {string} label - Etiqueta del contador
   */
  function count(label = 'default') {
    if (!isDebugEnabled.value) return
    console.count(label)
  }

  /**
   * Resetea un contador
   * @param {string} label - Etiqueta del contador
   */
  function countReset(label = 'default') {
    if (!isDebugEnabled.value) return
    console.countReset(label)
  }

  // ========================================
  // 📈 REPORTES Y ESTADÍSTICAS
  // ========================================

  /**
   * Genera reporte de estadísticas de logging
   * @returns {Object}
   */
  function getLogReport() {
    return {
      enabled: isDebugEnabled.value,
      level: logLevel.value,
      stats: { ...logStats },
      recentLogsCount: recentLogs.value.length,
      activeTimers: timers.size
    }
  }

  /**
   * Muestra estadísticas en consola
   */
  function showStats() {
    console.group('%c📊 Debug Statistics', CONSOLE_STYLES.info)
    console.log('Debug enabled:', isDebugEnabled.value)
    console.log('Log level:', logLevel.value)
    console.log('Total logs:', logStats.totalLogs)
    console.log('Errors:', logStats.errors)
    console.log('Warnings:', logStats.warnings)
    console.log('Debug logs:', logStats.debugs)
    console.log('Performance logs:', logStats.performance)
    console.log('Sample logs:', logStats.samples)
    console.log('Recent logs buffered:', recentLogs.value.length)
    console.log('Active timers:', timers.size)
    console.groupEnd()
  }

  /**
   * Exporta los logs recientes a JSON
   * @returns {string}
   */
  function exportLogs() {
    return JSON.stringify(recentLogs.value, null, 2)
  }

  /**
   * Descarga los logs como archivo
   */
  function downloadLogs() {
    const logsJson = exportLogs()
    const blob = new Blob([logsJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('%c💾 Logs downloaded', CONSOLE_STYLES.success)
  }

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  const hasErrors = computed(() => logStats.errors > 0)
  const hasWarnings = computed(() => logStats.warnings > 0)
  const errorRate = computed(() => {
    if (logStats.totalLogs === 0) return 0
    return ((logStats.errors / logStats.totalLogs) * 100).toFixed(2)
  })

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado
    isDebugEnabled,
    logLevel,
    logStats,
    recentLogs,

    // Logger principal (COMPATIBLE con Dashboard)
    logger,              // ✅ Objeto con mismo formato

    // Control de debug
    enableDebug,
    disableDebug,
    toggleDebug,
    clearRecentLogs,
    resetLogStats,

    // Performance
    timeStart,
    timeEnd,
    measureTime,

    // Inspección
    inspect,
    table,
    group,
    groupCollapsed,

    // Debugging avanzado
    trace,
    assert,
    count,
    countReset,

    // Reportes
    getLogReport,
    showStats,
    exportLogs,
    downloadLogs,

    // Computed
    hasErrors,
    hasWarnings,
    errorRate,

    // Constantes
    IS_DEVELOPMENT,
    CONSOLE_STYLES
  }
}
