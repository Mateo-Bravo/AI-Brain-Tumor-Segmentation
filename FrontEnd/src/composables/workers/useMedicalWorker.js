/**
 * @fileoverview Composable para gestionar Web Worker de procesamiento médico
 * @module useMedicalWorker
 * @description Procesa archivos NIFTI y ZIP en segundo plano (compatible con DashboardView.vue)
 */

import { computed, ref } from 'vue'

export function useMedicalWorker() {
  // ========================================
  // 📊 ESTADO DEL WORKER
  // ========================================
  let medicalWorker = null

  const isWorkerReady = ref(false)
  const isProcessing = ref(false)
  const processingProgress = ref(0)
  const processingMessage = ref('')
  const error = ref(null)

  const callbacks = new Map()
  let taskIdCounter = 0

  // ========================================
  // ⚙️ CONFIGURACIÓN (SEGÚN TU ESTRUCTURA ✅)
  // ========================================
  // ✅ Porque useMedicalWorker.js está en: src/composables/workers/
  // ✅ y el worker está en: src/composables/workers/medicalDataWorker.js
  const WORKER_URL = new URL('./medicalDataWorker.js', import.meta.url)

  // ⏱️ Timeout global de tareas
  const OPERATION_TIMEOUT = 300000 // 5 min

  // ⏱️ Timeout de “READY” del worker (subido para evitar falsos timeouts)
  const WORKER_READY_TIMEOUT = 60000 // 60s

  // ========================================
  // 🔄 COMPUTED
  // ========================================
  const isBusy = computed(() => isProcessing.value)

  const workerStatus = computed(() => ({
    ready: isWorkerReady.value,
    processing: isProcessing.value,
    progress: processingProgress.value,
    message: processingMessage.value,
    hasError: error.value !== null
  }))

  // ========================================
  // 🔌 INICIALIZACIÓN DEL WORKER
  // ========================================
  async function initializeWorker() {
    if (medicalWorker) {
      // Si ya existe, pero no está listo, re-intenta esperar READY
      if (!isWorkerReady.value) {
        await waitForWorkerReady()
      }
      return
    }

    console.log('🚀 Inicializando Medical Worker...')
    console.log('🧭 Worker URL resuelta:', WORKER_URL?.href || String(WORKER_URL))

    try {
      medicalWorker = new Worker(WORKER_URL, { type: 'module' })

      setupWorkerListeners()

      // Pedimos init al worker
      medicalWorker.postMessage({ type: 'INITIALIZE' })

      // Esperamos READY
      await waitForWorkerReady()

      console.log('✅ Medical Worker inicializado exitosamente')
    } catch (err) {
      console.error('❌ Error inicializando Medical Worker:', err)
      error.value = err?.message || String(err)
      throw err
    }
  }

  // ========================================
  // 🔔 LISTENERS DEL WORKER
  // ========================================
  function setupWorkerListeners() {
    if (!medicalWorker) return

    // Mensajes normales
    medicalWorker.onmessage = (event) => {
      handleWorkerMessage(event.data)
    }

    // Error de ejecución/carga del worker (IMPORTANTE para ver rutas malas)
    medicalWorker.onerror = (e) => {
      console.error('❌ Worker runtime error:', e)
      error.value = e?.message || 'Worker runtime error'
      isWorkerReady.value = false
      isProcessing.value = false
    }

    // Error al deserializar mensajes
    medicalWorker.onmessageerror = (e) => {
      console.error('❌ Worker message error:', e)
      error.value = 'Worker message error (no se pudo leer un mensaje)'
      isWorkerReady.value = false
      isProcessing.value = false
    }
  }

  // ========================================
  // ⏳ ESPERAR “READY”
  // ========================================
  function waitForWorkerReady() {
    return new Promise((resolve, reject) => {
      if (isWorkerReady.value) return resolve(true)
      if (!medicalWorker) return reject(new Error('Worker no existe'))

      let done = false

      const timeoutId = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Timeout esperando inicialización del worker (READY no llegó)'))
      }, WORKER_READY_TIMEOUT)

      const onReady = (event) => {
        const data = event?.data
        if (!data || data.type !== 'READY') return

        if (done) return
        done = true

        isWorkerReady.value = true
        cleanup()
        resolve(true)
      }

      const onError = (e) => {
        if (done) return
        done = true
        cleanup()
        reject(new Error(e?.message || 'Error cargando/ejecutando el worker'))
      }

      function cleanup() {
        clearTimeout(timeoutId)
        // ⚠️ Ojo: como estamos usando onmessage global, NO removemos listener así.
        // Pero “onReady” solo actúa cuando type === READY, así que no afecta.
        // Para mantenerlo simple, lo dejamos aquí sin removeEventListener.
        // Lo importante es que el worker envíe READY.
      }

      // Hook extra temporal para detectar READY rápido
      // (sin romper tu onmessage principal)
      const prevOnMessage = medicalWorker.onmessage
      medicalWorker.onmessage = (event) => {
        try {
          onReady(event)
        } catch (_) {}
        if (prevOnMessage) prevOnMessage(event)
      }

      const prevOnError = medicalWorker.onerror
      medicalWorker.onerror = (e) => {
        try {
          onError(e)
        } catch (_) {}
        if (prevOnError) prevOnError(e)
      }
    })
  }

  // ========================================
  // 📨 MENSAJES DEL WORKER
  // ========================================
  function handleWorkerMessage(data) {
    const { type, taskId, payload, progress, message } = data || {}

    switch (type) {
      case 'READY':
        isWorkerReady.value = true
        console.log('✅ Worker listo para procesar')
        break

      case 'PROGRESS':
        processingProgress.value = progress || 0
        processingMessage.value = message || ''

        // callback progreso
        {
          const progressCallback = callbacks.get(`${taskId}_progress`)
          if (progressCallback) progressCallback(progress, message)
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
        // Para debug, déjalo visible:
        console.warn('⚠️ Mensaje desconocido del worker:', data)
    }
  }

  function handleTaskSuccess(taskId, result) {
    isProcessing.value = false
    processingProgress.value = 100

    const callback = callbacks.get(`${taskId}_success`)
    if (callback) {
      callback(result)
      callbacks.delete(`${taskId}_success`)
    }

    callbacks.delete(`${taskId}_progress`)
    callbacks.delete(`${taskId}_error`)
  }

  function handleTaskError(taskId, errorMsg) {
    console.error(`❌ Error en tarea ${taskId}:`, errorMsg)

    isProcessing.value = false
    error.value = errorMsg || 'Error desconocido en worker'

    const callback = callbacks.get(`${taskId}_error`)
    if (callback) {
      callback(error.value)
      callbacks.delete(`${taskId}_error`)
    }

    callbacks.delete(`${taskId}_success`)
    callbacks.delete(`${taskId}_progress`)
  }

  // ========================================
  // 📤 NIFTI
  // ========================================
  async function processNiftiFile(fileBuffer, filename, callbackHandlers = {}) {
    if (!isWorkerReady.value) await initializeWorker()

    const taskId = `nifti_${++taskIdCounter}_${Date.now()}`

    if (callbackHandlers.onSuccess) callbacks.set(`${taskId}_success`, callbackHandlers.onSuccess)
    if (callbackHandlers.onError) callbacks.set(`${taskId}_error`, callbackHandlers.onError)
    if (callbackHandlers.onProgress) callbacks.set(`${taskId}_progress`, callbackHandlers.onProgress)

    isProcessing.value = true
    processingProgress.value = 0
    processingMessage.value = `Procesando ${filename}...`
    error.value = null

    medicalWorker.postMessage(
      {
        type: 'PROCESS_NIFTI',
        taskId,
        payload: {
          fileBuffer,
          filename,
          modalityType: callbackHandlers.modalityType
        }
      },
      [fileBuffer]
    )

    setTimeout(() => {
      if (isProcessing.value) {
        handleTaskError(taskId, 'Timeout: el procesamiento tardó demasiado')
      }
    }, OPERATION_TIMEOUT)

    return taskId
  }

  // ========================================
  // 📦 ZIP
  // ========================================
  async function processZipFile(fileBuffer, filename, callbackHandlers = {}) {
    if (!isWorkerReady.value) await initializeWorker()

    const taskId = `zip_${++taskIdCounter}_${Date.now()}`

    if (callbackHandlers.onSuccess) callbacks.set(`${taskId}_success`, callbackHandlers.onSuccess)
    if (callbackHandlers.onError) callbacks.set(`${taskId}_error`, callbackHandlers.onError)
    if (callbackHandlers.onProgress) callbacks.set(`${taskId}_progress`, callbackHandlers.onProgress)

    isProcessing.value = true
    processingProgress.value = 0
    processingMessage.value = `Procesando ZIP ${filename}...`
    error.value = null

    medicalWorker.postMessage(
      {
        type: 'PROCESS_ZIP',
        taskId,
        payload: { fileBuffer, filename }
      },
      [fileBuffer]
    )

    setTimeout(() => {
      if (isProcessing.value) {
        handleTaskError(taskId, 'Timeout: el procesamiento ZIP tardó demasiado')
      }
    }, OPERATION_TIMEOUT)

    return taskId
  }

  // ========================================
  // 🧪 TEST
  // ========================================
  async function testWorker(testData = {}, callbackHandlers = {}) {
    if (!isWorkerReady.value) await initializeWorker()

    const taskId = `test_${++taskIdCounter}_${Date.now()}`

    if (callbackHandlers.onSuccess) callbacks.set(`${taskId}_success`, callbackHandlers.onSuccess)
    if (callbackHandlers.onError) callbacks.set(`${taskId}_error`, callbackHandlers.onError)

    medicalWorker.postMessage({
      type: 'TEST',
      taskId,
      payload: {
        message: testData.message || 'Test desde useMedicalWorker',
        timestamp: Date.now(),
        ...testData
      }
    })

    return taskId
  }

  // ========================================
  // 🗑️ CONTROL / LIMPIEZA
  // ========================================
  function cancelProcessing() {
    if (!isProcessing.value) return
    if (medicalWorker) medicalWorker.postMessage({ type: 'CANCEL' })
    isProcessing.value = false
    processingProgress.value = 0
    processingMessage.value = ''
  }

  function terminateWorker() {
    if (!medicalWorker) return
    cancelProcessing()
    callbacks.clear()
    medicalWorker.terminate()
    medicalWorker = null

    isWorkerReady.value = false
    isProcessing.value = false
    processingProgress.value = 0
    processingMessage.value = ''
    error.value = null
  }

  async function restartWorker() {
    terminateWorker()
    await new Promise((r) => setTimeout(r, 100))
    await initializeWorker()
  }

  function clearError() {
    error.value = null
  }

  function isAvailable() {
    return isWorkerReady.value && !isProcessing.value
  }

  function getStatistics() {
    return {
      ready: isWorkerReady.value,
      processing: isProcessing.value,
      progress: processingProgress.value,
      message: processingMessage.value,
      pendingCallbacks: callbacks.size,
      hasError: error.value !== null
    }
  }

  // ========================================
  // 🚀 AUTO INIT (opcional)
  // ========================================
  initializeWorker().catch((err) => {
    console.error('❌ Error auto-init worker:', err)
  })

  return {
    isWorkerReady,
    isProcessing,
    processingProgress,
    processingMessage,
    error,

    isBusy,
    workerStatus,

    processNiftiFile,
    processZipFile,
    testWorker,

    initializeWorker,
    terminateWorker,
    restartWorker,
    cancelProcessing,
    clearError,

    isAvailable,
    getStatistics
  }
}
