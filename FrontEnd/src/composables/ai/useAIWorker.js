/**
 * @fileoverview Composable para gestionar Web Worker de análisis de IA
 * @module useAIWorker
 * @description Maneja comunicación con worker de IA para procesamiento asíncrono
 */

import { computed, onUnmounted, reactive, ref } from 'vue'

/**
 * Composable para gestionar Web Worker de análisis de IA
 * @returns {Object} Estado y métodos del worker de IA
 */
export function useAIWorker() {
  // ========================================
  // 📊 ESTADO DEL WORKER
  // ========================================

  /**
   * Instancia del Web Worker
   * @type {Worker|null}
   */
  let aiWorker = null

  /**
   * Indica si el worker está listo
   * @type {import('vue').Ref<boolean>}
   */
  const isWorkerReady = ref(false)

  /**
   * Indica si hay una operación en progreso
   * @type {import('vue').Ref<boolean>}
   */
  const isProcessing = ref(false)

  /**
   * Progreso de la operación actual (0-100)
   * @type {import('vue').Ref<number>}
   */
  const processingProgress = ref(0)

  /**
   * Mensaje de estado actual
   * @type {import('vue').Ref<string>}
   */
  const processingMessage = ref('')

  /**
   * Mensaje de error si ocurre alguno
   * @type {import('vue').Ref<string|null>}
   */
  const workerError = ref(null)

  /**
   * Resultado de la última operación
   * @type {import('vue').Ref<any>}
   */
  const lastResult = ref(null)

  /**
   * Cola de tareas pendientes
   */
  const taskQueue = reactive([])

  /**
   * Mapa de callbacks por taskId
   */
  const callbacks = new Map()

  /**
   * Contador de IDs de tareas
   */
  let taskIdCounter = 0

  // ========================================
  // ⚙️ CONFIGURACIÓN DEL WORKER
  // ========================================

  /**
   * Ruta del archivo worker
   */
  const WORKER_PATH = '/src/workers/aiAnalysisWorker.js'

  /**
   * Timeout para operaciones (30 segundos)
   */
  const OPERATION_TIMEOUT = 30000

  /**
   * Configuración de análisis
   */
  const analysisConfig = reactive({
    modelType: 'brain-tumor-detection',
    threshold: 0.7,
    sensitivity: 0.85,
    enableGPU: false // GPU no disponible en workers normalmente
  })

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  /**
   * Verifica si el worker está ocupado
   */
  const isBusy = computed(() => isProcessing.value)

  /**
   * Número de tareas en cola
   */
  const queueSize = computed(() => taskQueue.length)

  /**
   * Verifica si hay tareas en cola
   */
  const hasQueuedTasks = computed(() => taskQueue.length > 0)

  /**
   * Estado completo del worker
   */
  const workerStatus = computed(() => ({
    ready: isWorkerReady.value,
    processing: isProcessing.value,
    progress: processingProgress.value,
    message: processingMessage.value,
    queueSize: queueSize.value,
    hasError: workerError.value !== null
  }))

  // ========================================
  // 🔌 INICIALIZACIÓN DEL WORKER
  // ========================================

  /**
   * Inicializa el Web Worker de IA
   * @returns {Promise<void>}
   */
  async function initializeWorker() {
    if (aiWorker) {
      console.log('⚠️ Worker ya está inicializado')
      return
    }

    console.log('🚀 Inicializando AI Worker...')

    try {
      // Crear worker
      aiWorker = new Worker(new URL(WORKER_PATH, import.meta.url), {
        type: 'module'
      })

      // Configurar listeners
      setupWorkerListeners()

      // Enviar mensaje de inicialización
      aiWorker.postMessage({
        type: 'INITIALIZE',
        config: analysisConfig
      })

      // Esperar confirmación de inicialización
      await waitForWorkerReady()

      console.log('✅ AI Worker inicializado exitosamente')

    } catch (error) {
      console.error('❌ Error inicializando AI Worker:', error)
      workerError.value = error.message
      throw error
    }
  }

  /**
   * Configura los event listeners del worker
   */
  function setupWorkerListeners() {
    if (!aiWorker) return

    // Mensaje del worker
    aiWorker.onmessage = (event) => {
      handleWorkerMessage(event.data)
    }

    // Error del worker
    aiWorker.onerror = (error) => {
      console.error('❌ Error en AI Worker:', error)
      workerError.value = error.message
      isProcessing.value = false
    }

    // Worker terminado inesperadamente
    aiWorker.onmessageerror = (error) => {
      console.error('❌ Error de mensaje en AI Worker:', error)
      workerError.value = 'Error de comunicación con el worker'
      isProcessing.value = false
    }
  }

  /**
   * Espera a que el worker esté listo
   * @returns {Promise<void>}
   */
  function waitForWorkerReady() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando inicialización del worker'))
      }, 5000)

      const checkReady = (event) => {
        if (event.data.type === 'READY') {
          clearTimeout(timeout)
          isWorkerReady.value = true
          aiWorker.removeEventListener('message', checkReady)
          resolve()
        }
      }

      aiWorker.addEventListener('message', checkReady)
    })
  }

  // ========================================
  // 📨 MANEJO DE MENSAJES DEL WORKER
  // ========================================

  /**
   * Maneja mensajes recibidos del worker
   * @param {Object} data - Datos del mensaje
   */
  function handleWorkerMessage(data) {
    const { type, taskId, payload, progress, message } = data

    console.log('📨 Mensaje del worker:', type, taskId)

    switch (type) {
      case 'READY':
        isWorkerReady.value = true
        console.log('✅ Worker listo')
        break

      case 'PROGRESS':
        processingProgress.value = progress || 0
        processingMessage.value = message || ''
        console.log(`📊 Progreso: ${progress}% - ${message}`)

        // Callback de progreso si existe
        const progressCallback = callbacks.get(`${taskId}_progress`)
        if (progressCallback) {
          progressCallback(progress, message)
        }
        break

      case 'SUCCESS':
        handleTaskSuccess(taskId, payload)
        break

      case 'ERROR':
        handleTaskError(taskId, payload)
        break

      case 'LOG':
        console.log('📝 Worker log:', payload)
        break

      default:
        console.warn('⚠️ Tipo de mensaje desconocido:', type)
    }
  }

  /**
   * Maneja éxito de una tarea
   * @param {string} taskId - ID de la tarea
   * @param {any} result - Resultado de la tarea
   */
  function handleTaskSuccess(taskId, result) {
    console.log(`✅ Tarea ${taskId} completada exitosamente`)

    isProcessing.value = false
    processingProgress.value = 100
    lastResult.value = result

    // Ejecutar callback de éxito
    const callback = callbacks.get(`${taskId}_success`)
    if (callback) {
      callback(result)
      callbacks.delete(`${taskId}_success`)
    }

    // Limpiar callbacks
    callbacks.delete(`${taskId}_progress`)
    callbacks.delete(`${taskId}_error`)

    // Procesar siguiente tarea en cola
    processNextTask()
  }

  /**
   * Maneja error de una tarea
   * @param {string} taskId - ID de la tarea
   * @param {string} error - Mensaje de error
   */
  function handleTaskError(taskId, error) {
    console.error(`❌ Error en tarea ${taskId}:`, error)

    isProcessing.value = false
    workerError.value = error

    // Ejecutar callback de error
    const callback = callbacks.get(`${taskId}_error`)
    if (callback) {
      callback(error)
      callbacks.delete(`${taskId}_error`)
    }

    // Limpiar callbacks
    callbacks.delete(`${taskId}_success`)
    callbacks.delete(`${taskId}_progress`)

    // Procesar siguiente tarea en cola
    processNextTask()
  }

  // ========================================
  // 📤 ENVÍO DE TAREAS AL WORKER
  // ========================================

  /**
   * Envía una tarea al worker
   * @param {string} taskType - Tipo de tarea
   * @param {any} data - Datos de la tarea
   * @param {Object} callbacks - Callbacks { onSuccess, onError, onProgress }
   * @returns {Promise<string>} ID de la tarea
   */
  async function sendTask(taskType, data, callbackHandlers = {}) {
    if (!isWorkerReady.value) {
      await initializeWorker()
    }

    const taskId = `task_${++taskIdCounter}_${Date.now()}`

    console.log(`📤 Enviando tarea ${taskId} de tipo ${taskType}`)

    // Guardar callbacks
    if (callbackHandlers.onSuccess) {
      callbacks.set(`${taskId}_success`, callbackHandlers.onSuccess)
    }
    if (callbackHandlers.onError) {
      callbacks.set(`${taskId}_error`, callbackHandlers.onError)
    }
    if (callbackHandlers.onProgress) {
      callbacks.set(`${taskId}_progress`, callbackHandlers.onProgress)
    }

    // Crear tarea
    const task = {
      id: taskId,
      type: taskType,
      data: data,
      timestamp: Date.now()
    }

    // Si hay una tarea en progreso, agregar a cola
    if (isProcessing.value) {
      console.log('⏳ Worker ocupado, agregando a cola...')
      taskQueue.push(task)
      return taskId
    }

    // Ejecutar tarea inmediatamente
    executeTask(task)

    return taskId
  }

  /**
   * Ejecuta una tarea en el worker
   * @param {Object} task - Tarea a ejecutar
   */
  function executeTask(task) {
    console.log(`⚙️ Ejecutando tarea ${task.id}...`)

    isProcessing.value = true
    processingProgress.value = 0
    processingMessage.value = `Procesando ${task.type}...`
    workerError.value = null

    // Enviar al worker
    aiWorker.postMessage({
      type: task.type,
      taskId: task.id,
      payload: task.data,
      config: analysisConfig
    })

    // Timeout de seguridad
    setTimeout(() => {
      if (isProcessing.value) {
        console.warn(`⚠️ Timeout en tarea ${task.id}`)
        handleTaskError(task.id, 'Timeout: la operación tardó demasiado')
      }
    }, OPERATION_TIMEOUT)
  }

  /**
   * Procesa la siguiente tarea en cola
   */
  function processNextTask() {
    if (taskQueue.length === 0) {
      console.log('✅ Cola de tareas vacía')
      return
    }

    const nextTask = taskQueue.shift()
    console.log(`⏭️ Procesando siguiente tarea: ${nextTask.id}`)
    executeTask(nextTask)
  }

  // ========================================
  // 🧠 FUNCIONES DE ANÁLISIS DE IA
  // ========================================

  /**
   * Analiza un volumen médico con IA
   * @param {Uint8Array|Float32Array} volumeData - Datos del volumen
   * @param {Object} dimensions - Dimensiones { width, height, depth }
   * @param {Object} callbacks - Callbacks
   * @returns {Promise<string>} Task ID
   */
  async function analyzeWithAI(volumeData, dimensions, callbacks = {}) {
    console.log('🧠 Iniciando análisis de IA...')

    const taskData = {
      volumeData: volumeData,
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
      analysisType: 'tumor-detection'
    }

    return await sendTask('ANALYZE', taskData, callbacks)
  }

  /**
   * Mejora un volumen médico con IA
   * @param {Uint8Array|Float32Array} volumeData - Datos del volumen
   * @param {Object} dimensions - Dimensiones { width, height, depth }
   * @param {Object} enhancementOptions - Opciones de mejora
   * @param {Object} callbacks - Callbacks
   * @returns {Promise<string>} Task ID
   */
  async function enhanceImage(volumeData, dimensions, enhancementOptions = {}, callbacks = {}) {
    console.log('✨ Iniciando mejora de imagen con IA...')

    const taskData = {
      volumeData: volumeData,
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
      options: {
        noiseReduction: enhancementOptions.noiseReduction || 0.3,
        contrastEnhancement: enhancementOptions.contrastEnhancement || 1.5,
        edgeEnhancement: enhancementOptions.edgeEnhancement || 0.4,
        smoothing: enhancementOptions.smoothing || 0.2,
        ...enhancementOptions
      }
    }

    return await sendTask('ENHANCE', taskData, callbacks)
  }

  /**
   * Genera segmentación de un volumen
   * @param {Uint8Array|Float32Array} volumeData - Datos del volumen
   * @param {Object} dimensions - Dimensiones { width, height, depth }
   * @param {Object} callbacks - Callbacks
   * @returns {Promise<string>} Task ID
   */
  async function segmentVolume(volumeData, dimensions, callbacks = {}) {
    console.log('🎨 Iniciando segmentación con IA...')

    const taskData = {
      volumeData: volumeData,
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
      classes: ['background', 'tumor', 'edema', 'necrosis']
    }

    return await sendTask('SEGMENT', taskData, callbacks)
  }

  /**
   * Procesa un slice 2D con IA
   * @param {Uint8Array} sliceData - Datos del slice
   * @param {Object} dimensions - Dimensiones { width, height }
   * @param {Object} callbacks - Callbacks
   * @returns {Promise<string>} Task ID
   */
  async function processSlice(sliceData, dimensions, callbacks = {}) {
    console.log('🖼️ Procesando slice 2D con IA...')

    const taskData = {
      sliceData: sliceData,
      width: dimensions.width,
      height: dimensions.height,
      type: '2d-enhancement'
    }

    return await sendTask('PROCESS_SLICE', taskData, callbacks)
  }

  /**
   * Detecta anomalías en un volumen
   * @param {Uint8Array|Float32Array} volumeData - Datos del volumen
   * @param {Object} dimensions - Dimensiones { width, height, depth }
   * @param {Object} callbacks - Callbacks
   * @returns {Promise<string>} Task ID
   */
  async function detectAnomalies(volumeData, dimensions, callbacks = {}) {
    console.log('🔍 Detectando anomalías con IA...')

    const taskData = {
      volumeData: volumeData,
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
      threshold: analysisConfig.threshold,
      sensitivity: analysisConfig.sensitivity
    }

    return await sendTask('DETECT_ANOMALIES', taskData, callbacks)
  }

  // ========================================
  // 🧪 FUNCIONES DE PRUEBA
  // ========================================

  /**
   * Ejecuta una prueba simple del worker
   * @param {Object} testData - Datos de prueba
   * @param {Object} callbacks - Callbacks
   * @returns {Promise<string>} Task ID
   */
  async function testWorker(testData = {}, callbacks = {}) {
    console.log('🧪 Ejecutando prueba del worker...')

    const taskData = {
      message: testData.message || 'Test desde useAIWorker',
      timestamp: Date.now(),
      ...testData
    }

    return await sendTask('TEST', taskData, callbacks)
  }

  /**
   * Obtiene información del worker
   * @returns {Promise<Object>}
   */
  async function getWorkerInfo() {
    console.log('ℹ️ Solicitando información del worker...')

    return new Promise((resolve, reject) => {
      sendTask('GET_INFO', {}, {
        onSuccess: (info) => resolve(info),
        onError: (error) => reject(error)
      })
    })
  }

  // ========================================
  // ⚙️ FUNCIONES DE CONFIGURACIÓN
  // ========================================

  /**
   * Actualiza la configuración del worker
   * @param {Object} newConfig - Nueva configuración
   * @returns {Promise<void>}
   */
  async function updateConfig(newConfig) {
    console.log('⚙️ Actualizando configuración del worker...', newConfig)

    Object.assign(analysisConfig, newConfig)

    if (isWorkerReady.value) {
      aiWorker.postMessage({
        type: 'UPDATE_CONFIG',
        config: analysisConfig
      })
    }
  }

  /**
   * Resetea la configuración a valores por defecto
   */
  function resetConfig() {
    console.log('🔄 Reseteando configuración del worker...')

    Object.assign(analysisConfig, {
      modelType: 'brain-tumor-detection',
      threshold: 0.7,
      sensitivity: 0.85,
      enableGPU: false
    })

    if (isWorkerReady.value) {
      aiWorker.postMessage({
        type: 'UPDATE_CONFIG',
        config: analysisConfig
      })
    }
  }

  // ========================================
  // 🗑️ FUNCIONES DE LIMPIEZA
  // ========================================

  /**
   * Cancela la tarea actual
   */
  function cancelCurrentTask() {
    if (!isProcessing.value) {
      console.log('⚠️ No hay tarea en progreso para cancelar')
      return
    }

    console.log('❌ Cancelando tarea actual...')

    if (aiWorker) {
      aiWorker.postMessage({ type: 'CANCEL' })
    }

    isProcessing.value = false
    processingProgress.value = 0
    processingMessage.value = ''
  }

  /**
   * Limpia la cola de tareas pendientes
   */
  function clearTaskQueue() {
    console.log('🧹 Limpiando cola de tareas...')

    const count = taskQueue.length
    taskQueue.length = 0

    console.log(`✅ ${count} tarea(s) eliminada(s) de la cola`)
  }

  /**
   * Termina el worker y libera recursos
   */
  function terminateWorker() {
    if (!aiWorker) {
      console.log('⚠️ Worker no está inicializado')
      return
    }

    console.log('🛑 Terminando AI Worker...')

    // Cancelar tarea actual
    cancelCurrentTask()

    // Limpiar cola
    clearTaskQueue()

    // Limpiar callbacks
    callbacks.clear()

    // Terminar worker
    aiWorker.terminate()
    aiWorker = null

    // Resetear estado
    isWorkerReady.value = false
    isProcessing.value = false
    processingProgress.value = 0
    processingMessage.value = ''
    workerError.value = null
    lastResult.value = null

    console.log('✅ AI Worker terminado')
  }

  /**
   * Reinicia el worker
   * @returns {Promise<void>}
   */
  async function restartWorker() {
    console.log('🔄 Reiniciando AI Worker...')

    terminateWorker()
    await new Promise(resolve => setTimeout(resolve, 100))
    await initializeWorker()

    console.log('✅ AI Worker reiniciado')
  }

  // ========================================
  // 🔧 FUNCIONES DE UTILIDAD
  // ========================================

  /**
   * Verifica si el worker está disponible
   * @returns {boolean}
   */
  function isAvailable() {
    return isWorkerReady.value && !isProcessing.value
  }

  /**
   * Obtiene estadísticas del worker
   * @returns {Object}
   */
  function getStatistics() {
    return {
      ready: isWorkerReady.value,
      processing: isProcessing.value,
      progress: processingProgress.value,
      queueSize: taskQueue.length,
      pendingCallbacks: callbacks.size,
      hasError: workerError.value !== null,
      lastResultAvailable: lastResult.value !== null
    }
  }

  // ========================================
  // 🔄 LIFECYCLE
  // ========================================

  // Limpiar al desmontar el componente
  onUnmounted(() => {
    console.log('🧹 Limpiando AI Worker al desmontar componente...')
    terminateWorker()
  })

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado
    isWorkerReady,
    isProcessing,
    processingProgress,
    processingMessage,
    workerError,
    lastResult,

    // Computed
    isBusy,
    queueSize,
    hasQueuedTasks,
    workerStatus,

    // Configuración
    analysisConfig,

    // Inicialización
    initializeWorker,
    terminateWorker,
    restartWorker,

    // Funciones de análisis
    analyzeWithAI,
    enhanceImage,
    segmentVolume,
    processSlice,
    detectAnomalies,

    // Pruebas
    testWorker,
    getWorkerInfo,

    // Configuración
    updateConfig,
    resetConfig,

    // Control de tareas
    cancelCurrentTask,
    clearTaskQueue,

    // Utilidades
    isAvailable,
    getStatistics
  }
}
