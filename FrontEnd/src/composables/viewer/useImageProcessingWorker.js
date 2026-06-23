/**
 * ⚙️ useImageProcessingWorker.js
 *
 * Composable para gestión de Web Worker de procesamiento de imágenes
 *
 * Funcionalidades:
 * - Procesamiento de imágenes en segundo plano
 * - Comunicación bidireccional con el worker
 * - Manejo de múltiples tareas concurrentes
 * - Transferencia eficiente de datos (Transferable Objects)
 * - Cola de tareas y priorización
 * - Manejo de errores y timeouts
 * - Reportes de progreso en tiempo real
 *
 * @author Richard - Web Worker para Procesamiento de Imágenes
 */

import { computed, ref } from 'vue'

/**
 * Composable para gestión del Web Worker de procesamiento de imágenes
 * @returns {Object} Estado y funciones para trabajar con el worker
 */
export function useImageProcessingWorker() {

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Instancia del Web Worker
   */
  let worker = null

  /**
   * Estado del worker
   */
  const isWorkerReady = ref(false)
  const isProcessing = ref(false)
  const processingProgress = ref(0)
  const processingMessage = ref('')

  /**
   * Cola de tareas pendientes
   */
  const taskQueue = ref([])
  const currentTaskId = ref(null)

  /**
   * Mapa de callbacks para tareas
   */
  const taskCallbacks = new Map()

  /**
   * ID incremental para tareas
   */
  let taskIdCounter = 0

  /**
   * Configuración de timeouts
   */
  const config = {
    defaultTimeout: 30000, // 30 segundos
    maxRetries: 3
  }

  /**
   * Estadísticas del worker
   */
  const stats = ref({
    tasksProcessed: 0,
    tasksSucceeded: 0,
    tasksFailed: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0
  })

  // ============================================
  // 🎬 INICIALIZACIÓN DEL WORKER
  // ============================================

  /**
   * Inicializa el Web Worker
   */
  function initializeWorker() {
    if (worker) {
      console.warn('⚠️ Worker ya está inicializado')
      return
    }

    try {
      console.log('🎬 Inicializando Image Processing Worker...')

      // Crear worker desde archivo
      worker = new Worker(
        new URL('@/workers/imageProcessingWorker.js', import.meta.url),
        { type: 'module' }
      )

      // Configurar listeners
      setupWorkerListeners()

      // Enviar mensaje de inicialización
      worker.postMessage({ type: 'init' })

      console.log('✅ Image Processing Worker inicializado')

    } catch (error) {
      console.error('❌ Error inicializando worker:', error)
      isWorkerReady.value = false
    }
  }

  /**
   * Configura los event listeners del worker
   */
  function setupWorkerListeners() {
    if (!worker) return

    // Mensajes del worker
    worker.onmessage = handleWorkerMessage

    // Errores del worker
    worker.onerror = (error) => {
      console.error('❌ Error en worker:', error)
      isProcessing.value = false
      processingMessage.value = 'Error en procesamiento'

      // Rechazar tarea actual
      if (currentTaskId.value) {
        const callbacks = taskCallbacks.get(currentTaskId.value)
        if (callbacks && callbacks.reject) {
          callbacks.reject(new Error(`Worker error: ${error.message}`))
        }
        taskCallbacks.delete(currentTaskId.value)
        currentTaskId.value = null
      }

      stats.value.tasksFailed++
    }

    // Mensajes de error del worker
    worker.onmessageerror = (error) => {
      console.error('❌ Error en mensaje del worker:', error)
    }
  }

  /**
   * Maneja mensajes recibidos del worker
   * @param {MessageEvent} event - Evento del worker
   */
  function handleWorkerMessage(event) {
    const { type, taskId, data, error, progress, message } = event.data

    switch (type) {
      case 'ready':
        isWorkerReady.value = true
        console.log('✅ Worker listo para procesar')
        break

      case 'progress':
        processingProgress.value = progress || 0
        processingMessage.value = message || 'Procesando...'

        // Callback de progreso si existe
        if (taskId && taskCallbacks.has(taskId)) {
          const callbacks = taskCallbacks.get(taskId)
          if (callbacks.onProgress) {
            callbacks.onProgress(progress, message)
          }
        }
        break

      case 'complete':
        handleTaskComplete(taskId, data)
        break

      case 'error':
        handleTaskError(taskId, error)
        break

      default:
        console.warn('⚠️ Tipo de mensaje desconocido:', type)
    }
  }

  /**
   * Maneja completación de una tarea
   * @param {string} taskId - ID de la tarea
   * @param {*} data - Datos de resultado
   */
  function handleTaskComplete(taskId, data) {
    const callbacks = taskCallbacks.get(taskId)

    if (callbacks) {
      const { resolve, startTime } = callbacks

      // Calcular tiempo de procesamiento
      const processingTime = Date.now() - startTime

      // Actualizar estadísticas
      stats.value.tasksProcessed++
      stats.value.tasksSucceeded++
      stats.value.totalProcessingTime += processingTime
      stats.value.averageProcessingTime =
        stats.value.totalProcessingTime / stats.value.tasksProcessed

      // Resolver promesa
      if (resolve) {
        resolve(data)
      }

      // Limpiar callbacks
      taskCallbacks.delete(taskId)
    }

    // Si esta era la tarea actual, procesarla siguiente en la cola
    if (currentTaskId.value === taskId) {
      currentTaskId.value = null
      isProcessing.value = false
      processingProgress.value = 0
      processingMessage.value = ''

      processNextTask()
    }
  }

  /**
   * Maneja error de una tarea
   * @param {string} taskId - ID de la tarea
   * @param {string} errorMessage - Mensaje de error
   */
  function handleTaskError(taskId, errorMessage) {
    const callbacks = taskCallbacks.get(taskId)

    if (callbacks) {
      const { reject } = callbacks

      // Actualizar estadísticas
      stats.value.tasksProcessed++
      stats.value.tasksFailed++

      // Rechazar promesa
      if (reject) {
        reject(new Error(errorMessage || 'Error procesando tarea'))
      }

      // Limpiar callbacks
      taskCallbacks.delete(taskId)
    }

    // Procesar siguiente tarea
    if (currentTaskId.value === taskId) {
      currentTaskId.value = null
      isProcessing.value = false
      processingProgress.value = 0
      processingMessage.value = ''

      processNextTask()
    }
  }

  // ============================================
  // 📋 GESTIÓN DE COLA DE TAREAS
  // ============================================

  /**
   * Genera un ID único para una tarea
   * @returns {string} ID de tarea
   */
  function generateTaskId() {
    return `task_${Date.now()}_${taskIdCounter++}`
  }

  /**
   * Añade una tarea a la cola
   * @param {Object} task - Datos de la tarea
   * @param {number} priority - Prioridad (mayor = más prioritario)
   * @returns {Promise} Promesa que se resuelve cuando la tarea se completa
   */
  function enqueueTask(task, priority = 0) {
    return new Promise((resolve, reject) => {
      const taskId = generateTaskId()

      const taskData = {
        id: taskId,
        priority,
        data: task,
        retries: 0
      }

      // Guardar callbacks
      taskCallbacks.set(taskId, {
        resolve,
        reject,
        startTime: Date.now(),
        onProgress: task.onProgress
      })

      // Añadir a cola ordenada por prioridad
      taskQueue.value.push(taskData)
      taskQueue.value.sort((a, b) => b.priority - a.priority)

      // Si no hay tarea en proceso, procesar inmediatamente
      if (!isProcessing.value) {
        processNextTask()
      }
    })
  }

  /**
   * Procesa la siguiente tarea de la cola
   */
  function processNextTask() {
    if (taskQueue.value.length === 0 || isProcessing.value || !isWorkerReady.value) {
      return
    }

    // Obtener siguiente tarea
    const task = taskQueue.value.shift()
    currentTaskId.value = task.id
    isProcessing.value = true

    // Enviar tarea al worker
    sendTaskToWorker(task)
  }

  /**
   * Envía una tarea al worker
   * @param {Object} task - Tarea a enviar
   */
  function sendTaskToWorker(task) {
    if (!worker || !isWorkerReady.value) {
      console.error('❌ Worker no está listo')
      handleTaskError(task.id, 'Worker no disponible')
      return
    }

    try {
      // Enviar mensaje al worker
      worker.postMessage({
        type: 'process',
        taskId: task.id,
        data: task.data
      })

      // Configurar timeout
      const timeout = task.data.timeout || config.defaultTimeout
      setTimeout(() => {
        if (currentTaskId.value === task.id) {
          console.warn('⚠️ Timeout en tarea:', task.id)
          handleTaskError(task.id, 'Timeout en procesamiento')
        }
      }, timeout)

    } catch (error) {
      console.error('❌ Error enviando tarea al worker:', error)
      handleTaskError(task.id, error.message)
    }
  }

  /**
   * Cancela una tarea específica
   * @param {string} taskId - ID de la tarea
   */
  function cancelTask(taskId) {
    // Buscar en cola
    const index = taskQueue.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      taskQueue.value.splice(index, 1)

      const callbacks = taskCallbacks.get(taskId)
      if (callbacks && callbacks.reject) {
        callbacks.reject(new Error('Tarea cancelada'))
      }
      taskCallbacks.delete(taskId)

      return true
    }

    // Si es la tarea actual, no se puede cancelar directamente
    if (currentTaskId.value === taskId) {
      console.warn('⚠️ No se puede cancelar la tarea en proceso')
      return false
    }

    return false
  }

  /**
   * Cancela todas las tareas pendientes
   */
  function cancelAllTasks() {
    const cancelledTasks = taskQueue.value.length

    taskQueue.value.forEach(task => {
      const callbacks = taskCallbacks.get(task.id)
      if (callbacks && callbacks.reject) {
        callbacks.reject(new Error('Tarea cancelada'))
      }
      taskCallbacks.delete(task.id)
    })

    taskQueue.value = []

    console.log(`🚫 ${cancelledTasks} tareas canceladas`)
    return cancelledTasks
  }

  // ============================================
  // 🎨 FUNCIONES DE PROCESAMIENTO ESPECÍFICAS
  // ============================================

  /**
   * Procesa una imagen con ajustes específicos
   * @param {ImageData} imageData - Imagen a procesar
   * @param {Object} adjustments - Ajustes a aplicar
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<ImageData>} Imagen procesada
   */
  async function processImage(imageData, adjustments = {}, options = {}) {
    if (!isWorkerReady.value) {
      await waitForWorker()
    }

    const task = {
      operation: 'processImage',
      imageData: {
        data: imageData.data,
        width: imageData.width,
        height: imageData.height
      },
      adjustments,
      ...options
    }

    const result = await enqueueTask(task, options.priority || 0)

    // Reconstruir ImageData
    return new ImageData(
      new Uint8ClampedArray(result.data),
      result.width,
      result.height
    )
  }

  /**
   * Aplica Window/Level a los datos
   * @param {Uint8Array|Float32Array} data - Datos
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} windowWidth - Ancho de ventana
   * @param {number} windowCenter - Centro de ventana
   * @returns {Promise<Uint8ClampedArray>} Datos procesados
   */
  async function applyWindowLevel(data, width, height, windowWidth, windowCenter) {
    if (!isWorkerReady.value) {
      await waitForWorker()
    }

    const task = {
      operation: 'windowLevel',
      data: data,
      width,
      height,
      windowWidth,
      windowCenter
    }

    const result = await enqueueTask(task, 10) // Alta prioridad
    return new Uint8ClampedArray(result.data)
  }

  /**
   * Normaliza datos entre 0-255
   * @param {Uint8Array|Float32Array} data - Datos a normalizar
   * @param {number} min - Valor mínimo
   * @param {number} max - Valor máximo
   * @returns {Promise<Uint8ClampedArray>} Datos normalizados
   */
  async function normalizeData(data, min, max) {
    if (!isWorkerReady.value) {
      await waitForWorker()
    }

    const task = {
      operation: 'normalize',
      data: data,
      min,
      max
    }

    const result = await enqueueTask(task, 5)
    return new Uint8ClampedArray(result.data)
  }

  /**
   * Calcula estadísticas de datos
   * @param {Uint8Array|Float32Array} data - Datos
   * @returns {Promise<Object>} {min, max, mean, std}
   */
  async function calculateStatistics(data) {
    if (!isWorkerReady.value) {
      await waitForWorker()
    }

    const task = {
      operation: 'statistics',
      data: data
    }

    return await enqueueTask(task, 0)
  }

  /**
   * Calcula histograma de datos
   * @param {Uint8Array|Float32Array} data - Datos
   * @param {number} bins - Número de bins
   * @returns {Promise<Array>} Histograma
   */
  async function calculateHistogram(data, bins = 256) {
    if (!isWorkerReady.value) {
      await waitForWorker()
    }

    const task = {
      operation: 'histogram',
      data: data,
      bins
    }

    const result = await enqueueTask(task, 0)
    return result.histogram
  }

  /**
   * Aplica filtro de convolución
   * @param {ImageData} imageData - Imagen
   * @param {Array} kernel - Kernel de convolución
   * @returns {Promise<ImageData>} Imagen procesada
   */
  async function applyConvolution(imageData, kernel) {
    if (!isWorkerReady.value) {
      await waitForWorker()
    }

    const task = {
      operation: 'convolution',
      imageData: {
        data: imageData.data,
        width: imageData.width,
        height: imageData.height
      },
      kernel
    }

    const result = await enqueueTask(task, 5)
    return new ImageData(
      new Uint8ClampedArray(result.data),
      result.width,
      result.height
    )
  }

  // ============================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Espera a que el worker esté listo
   * @param {number} timeout - Timeout en ms
   * @returns {Promise<boolean>}
   */
  function waitForWorker(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (isWorkerReady.value) {
        resolve(true)
        return
      }

      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        if (isWorkerReady.value) {
          clearInterval(checkInterval)
          resolve(true)
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          reject(new Error('Timeout esperando worker'))
        }
      }, 100)
    })
  }

  /**
   * Reinicia el worker
   */
  function restartWorker() {
    console.log('🔄 Reiniciando worker...')

    terminateWorker()

    setTimeout(() => {
      initializeWorker()
    }, 100)
  }

  /**
   * Termina el worker y limpia recursos
   */
  function terminateWorker() {
    if (!worker) return

    console.log('🛑 Terminando worker...')

    // Cancelar todas las tareas pendientes
    cancelAllTasks()

    // Limpiar callbacks
    taskCallbacks.clear()

    // Terminar worker
    worker.terminate()
    worker = null

    // Resetear estado
    isWorkerReady.value = false
    isProcessing.value = false
    processingProgress.value = 0
    processingMessage.value = ''
    currentTaskId.value = null

    console.log('✅ Worker terminado')
  }

  /**
   * Prueba el worker con una operación simple
   * @returns {Promise<boolean>} true si funciona correctamente
   */
  async function testWorker() {
    try {
      console.log('🧪 Probando worker...')

      const testData = new Uint8Array(100).fill(128)
      const result = await normalizeData(testData, 0, 255)

      const isValid = result.length === 100 && result[0] === 128

      console.log(isValid ? '✅ Worker funciona correctamente' : '❌ Worker falla la prueba')

      return isValid

    } catch (error) {
      console.error('❌ Error probando worker:', error)
      return false
    }
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Número de tareas pendientes
   */
  const pendingTasksCount = computed(() => taskQueue.value.length)

  /**
   * Estado general del worker
   */
  const workerState = computed(() => ({
    ready: isWorkerReady.value,
    processing: isProcessing.value,
    progress: processingProgress.value,
    message: processingMessage.value,
    pendingTasks: pendingTasksCount.value,
    currentTask: currentTaskId.value,
    stats: stats.value
  }))

  /**
   * Verifica si el worker está ocupado
   */
  const isBusy = computed(() =>
    isProcessing.value || taskQueue.value.length > 0
  )

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    isWorkerReady,
    isProcessing,
    processingProgress,
    processingMessage,
    taskQueue,
    currentTaskId,
    stats,

    // Funciones de inicialización
    initializeWorker,
    terminateWorker,
    restartWorker,
    testWorker,
    waitForWorker,

    // Gestión de cola
    enqueueTask,
    processNextTask,
    cancelTask,
    cancelAllTasks,

    // Funciones de procesamiento
    processImage,
    applyWindowLevel,
    normalizeData,
    calculateStatistics,
    calculateHistogram,
    applyConvolution,

    // Computed properties
    pendingTasksCount,
    workerState,
    isBusy
  }
}
