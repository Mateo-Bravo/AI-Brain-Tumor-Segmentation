/**
 * 📋 useModalWorkflow.js
 *
 * Composable para gestión del flujo de trabajo de modales
 *
 * Funcionalidades:
 * - Gestión de estado de modales (abrir/cerrar)
 * - Flujo de trabajo multi-paso (wizard)
 * - Validación de pasos
 * - Navegación entre pasos
 * - Manejo de formularios
 * - Progreso del workflow
 * - Historial de navegación
 * - Cancelación y confirmación
 * - Datos temporales del formulario
 * - Callbacks personalizables
 *
 * @author Richard - Gestión de Modales del Visor Médico
 */

import { computed, reactive, ref, watch } from 'vue'

/**
 * Composable para gestión de workflow de modales
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para gestión de modales
 */
export function useModalWorkflow(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    enableHistory: options.enableHistory !== false,
    enableValidation: options.enableValidation !== false,
    showProgress: options.showProgress !== false,
    confirmOnCancel: options.confirmOnCancel !== false,
    confirmOnClose: options.confirmOnClose || false,
    autoSaveForm: options.autoSaveForm || false,
    defaultStep: options.defaultStep || 0
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Estado del modal
   */
  const isOpen = ref(false)

  /**
   * Paso actual del workflow
   */
  const currentStep = ref(config.defaultStep)

  /**
   * Pasos del workflow
   */
  const steps = ref(options.steps || [])

  /**
   * Datos del formulario
   */
  const formData = reactive({})

  /**
   * Errores de validación
   */
  const validationErrors = reactive({})

  /**
   * Estado de procesamiento
   */
  const processing = reactive({
    isProcessing: false,
    operation: '',
    progress: 0,
    message: ''
  })

  /**
   * Historial de navegación
   */
  const navigationHistory = ref([])

  /**
   * Configuración de pasos
   */
  const stepConfig = reactive({
    canGoBack: true,
    canGoNext: true,
    canFinish: false,
    isValid: true
  })

  /**
   * Callbacks personalizables
   */
  const callbacks = reactive({
    onOpen: null,
    onClose: null,
    onCancel: null,
    onComplete: null,
    onStepChange: null,
    onValidate: null
  })

  /**
   * Estado de cambios sin guardar
   */
  const hasUnsavedChanges = ref(false)

  /**
   * Datos temporales (backup para cancelación)
   */
  let formDataBackup = null

  // ============================================
  // 🎬 GESTIÓN DE MODAL
  // ============================================

  /**
   * Abre el modal
   * @param {Object} initialData - Datos iniciales (opcional)
   */
  function open(initialData = null) {
    console.log('📋 Abriendo modal...')

    isOpen.value = true
    currentStep.value = config.defaultStep

    // Inicializar datos
    if (initialData) {
      Object.assign(formData, initialData)
    }

    // Backup de datos
    formDataBackup = JSON.parse(JSON.stringify(formData))

    // Limpiar errores y historial
    clearValidationErrors()
    navigationHistory.value = [currentStep.value]
    hasUnsavedChanges.value = false

    // Actualizar estado del paso
    updateStepState()

    // Callback
    if (callbacks.onOpen) {
      callbacks.onOpen(formData)
    }

    console.log('✅ Modal abierto')
  }

  /**
   * Cierra el modal
   * @param {boolean} force - Forzar cierre sin confirmación
   */
  async function close(force = false) {
    // Confirmar si hay cambios sin guardar
    if (!force && config.confirmOnClose && hasUnsavedChanges.value) {
      const confirmed = await confirmAction('¿Cerrar sin guardar cambios?')
      if (!confirmed) {
        return false
      }
    }

    console.log('📋 Cerrando modal...')

    isOpen.value = false
    currentStep.value = config.defaultStep

    // Callback
    if (callbacks.onClose) {
      callbacks.onClose()
    }

    // Limpiar después de un delay para animación
    setTimeout(() => {
      resetWorkflow()
    }, 300)

    console.log('✅ Modal cerrado')
    return true
  }

  /**
   * Cancela el workflow
   */
  async function cancel() {
    console.log('❌ Cancelando workflow...')

    // Confirmar cancelación
    if (config.confirmOnCancel && hasUnsavedChanges.value) {
      const confirmed = await confirmAction('¿Cancelar y descartar cambios?')
      if (!confirmed) {
        return false
      }
    }

    // Restaurar datos originales
    if (formDataBackup) {
      Object.keys(formData).forEach(key => delete formData[key])
      Object.assign(formData, formDataBackup)
    }

    // Callback
    if (callbacks.onCancel) {
      callbacks.onCancel()
    }

    await close(true)
    return true
  }

  /**
   * Resetea el workflow completamente
   */
  function resetWorkflow() {
    console.log('🔄 Reseteando workflow...')

    // Limpiar datos
    Object.keys(formData).forEach(key => delete formData[key])
    clearValidationErrors()

    // Resetear estado
    currentStep.value = config.defaultStep
    navigationHistory.value = []
    hasUnsavedChanges.value = false
    formDataBackup = null

    // Resetear procesamiento
    processing.isProcessing = false
    processing.operation = ''
    processing.progress = 0
    processing.message = ''

    console.log('✅ Workflow reseteado')
  }

  // ============================================
  // 🔄 NAVEGACIÓN ENTRE PASOS
  // ============================================

  /**
   * Va al siguiente paso
   * @returns {Promise<boolean>} true si pudo avanzar
   */
  async function nextStep() {
    if (!stepConfig.canGoNext) {
      console.warn('⚠️ No se puede avanzar al siguiente paso')
      return false
    }

    // Validar paso actual
    if (config.enableValidation) {
      const isValid = await validateCurrentStep()
      if (!isValid) {
        console.warn('⚠️ Validación fallida, no se puede avanzar')
        return false
      }
    }

    const nextStepIndex = currentStep.value + 1

    if (nextStepIndex >= steps.value.length) {
      console.warn('⚠️ Ya está en el último paso')
      return false
    }

    console.log(`➡️ Avanzando al paso ${nextStepIndex + 1}`)

    await goToStep(nextStepIndex)
    return true
  }

  /**
   * Va al paso anterior
   * @returns {boolean} true si pudo retroceder
   */
  async function previousStep() {
    if (!stepConfig.canGoBack) {
      console.warn('⚠️ No se puede retroceder')
      return false
    }

    const prevStepIndex = currentStep.value - 1

    if (prevStepIndex < 0) {
      console.warn('⚠️ Ya está en el primer paso')
      return false
    }

    console.log(`⬅️ Retrocediendo al paso ${prevStepIndex + 1}`)

    await goToStep(prevStepIndex)
    return true
  }

  /**
   * Va a un paso específico
   * @param {number} stepIndex - Índice del paso
   */
  async function goToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= steps.value.length) {
      console.warn(`⚠️ Índice de paso inválido: ${stepIndex}`)
      return false
    }

    // Validar paso actual antes de cambiar
    if (config.enableValidation && stepIndex > currentStep.value) {
      const isValid = await validateCurrentStep()
      if (!isValid) {
        console.warn('⚠️ Validación fallida')
        return false
      }
    }

    // Añadir al historial
    if (config.enableHistory) {
      navigationHistory.value.push(stepIndex)
    }

    // Cambiar paso
    currentStep.value = stepIndex

    // Actualizar estado
    updateStepState()

    // Callback
    if (callbacks.onStepChange) {
      callbacks.onStepChange(stepIndex, steps.value[stepIndex])
    }

    console.log(`✅ Navegado al paso ${stepIndex + 1}: ${steps.value[stepIndex]?.title || 'Sin título'}`)

    return true
  }

  /**
   * Va al primer paso
   */
  async function goToFirstStep() {
    await goToStep(0)
  }

  /**
   * Va al último paso
   */
  async function goToLastStep() {
    await goToStep(steps.value.length - 1)
  }

  /**
   * Actualiza el estado del paso actual
   */
  function updateStepState() {
    stepConfig.canGoBack = currentStep.value > 0
    stepConfig.canGoNext = currentStep.value < steps.value.length - 1
    stepConfig.canFinish = currentStep.value === steps.value.length - 1
    stepConfig.isValid = Object.keys(validationErrors).length === 0
  }

  // ============================================
  // ✅ VALIDACIÓN
  // ============================================

  /**
   * Valida el paso actual
   * @returns {Promise<boolean>} true si es válido
   */
  async function validateCurrentStep() {
    const step = steps.value[currentStep.value]

    if (!step || !step.validate) {
      return true
    }

    console.log(`🔍 Validando paso ${currentStep.value + 1}...`)

    try {
      clearValidationErrors()

      let errors = {}

      // Ejecutar validación del paso
      if (typeof step.validate === 'function') {
        errors = await step.validate(formData)
      }

      // Callback de validación personalizada
      if (callbacks.onValidate) {
        const customErrors = await callbacks.onValidate(currentStep.value, formData)
        errors = { ...errors, ...customErrors }
      }

      // Actualizar errores
      if (errors && Object.keys(errors).length > 0) {
        Object.assign(validationErrors, errors)
        stepConfig.isValid = false
        console.warn('❌ Validación fallida:', errors)
        return false
      }

      stepConfig.isValid = true
      console.log('✅ Validación exitosa')
      return true

    } catch (error) {
      console.error('❌ Error en validación:', error)
      validationErrors.general = error.message
      stepConfig.isValid = false
      return false
    }
  }

  /**
   * Valida todos los pasos
   * @returns {Promise<boolean>} true si todos son válidos
   */
  async function validateAllSteps() {
    console.log('🔍 Validando todos los pasos...')

    for (let i = 0; i < steps.value.length; i++) {
      const originalStep = currentStep.value
      currentStep.value = i

      const isValid = await validateCurrentStep()

      if (!isValid) {
        console.warn(`❌ Validación fallida en paso ${i + 1}`)
        currentStep.value = originalStep
        return false
      }
    }

    console.log('✅ Todos los pasos validados')
    return true
  }

  /**
   * Valida un campo específico
   * @param {string} fieldName - Nombre del campo
   * @param {Function} validator - Función validadora
   * @returns {Promise<boolean>}
   */
  async function validateField(fieldName, validator) {
    if (!validator || typeof validator !== 'function') {
      return true
    }

    try {
      const error = await validator(formData[fieldName], formData)

      if (error) {
        validationErrors[fieldName] = error
        return false
      } else {
        delete validationErrors[fieldName]
        return true
      }

    } catch (err) {
      console.error(`❌ Error validando campo ${fieldName}:`, err)
      validationErrors[fieldName] = err.message
      return false
    }
  }

  /**
   * Limpia errores de validación
   * @param {string} fieldName - Campo específico (opcional)
   */
  function clearValidationErrors(fieldName = null) {
    if (fieldName) {
      delete validationErrors[fieldName]
    } else {
      Object.keys(validationErrors).forEach(key => {
        delete validationErrors[key]
      })
    }
    updateStepState()
  }

  // ============================================
  // 📝 GESTIÓN DE FORMULARIO
  // ============================================

  /**
   * Actualiza un campo del formulario
   * @param {string} fieldName - Nombre del campo
   * @param {*} value - Valor
   */
  function updateField(fieldName, value) {
    formData[fieldName] = value
    hasUnsavedChanges.value = true

    // Auto-guardar si está habilitado
    if (config.autoSaveForm) {
      saveFormData()
    }

    // Limpiar error de validación del campo
    if (validationErrors[fieldName]) {
      delete validationErrors[fieldName]
    }
  }

  /**
   * Obtiene un campo del formulario
   * @param {string} fieldName - Nombre del campo
   * @param {*} defaultValue - Valor por defecto
   * @returns {*} Valor del campo
   */
  function getField(fieldName, defaultValue = null) {
    return formData[fieldName] !== undefined ? formData[fieldName] : defaultValue
  }

  /**
   * Actualiza múltiples campos
   * @param {Object} fields - Objeto con campos y valores
   */
  function updateFields(fields) {
    Object.entries(fields).forEach(([key, value]) => {
      formData[key] = value
    })
    hasUnsavedChanges.value = true
  }

  /**
   * Guarda datos del formulario (localStorage)
   */
  function saveFormData() {
    try {
      const key = `modal_form_${config.dbName || 'default'}`
      localStorage.setItem(key, JSON.stringify(formData))
      console.log('💾 Datos del formulario guardados')
    } catch (error) {
      console.error('❌ Error guardando formulario:', error)
    }
  }

  /**
   * Carga datos del formulario (localStorage)
   * @returns {Object|null} Datos cargados
   */
  function loadFormData() {
    try {
      const key = `modal_form_${config.dbName || 'default'}`
      const saved = localStorage.getItem(key)

      if (saved) {
        const data = JSON.parse(saved)
        Object.assign(formData, data)
        console.log('📂 Datos del formulario cargados')
        return data
      }

      return null
    } catch (error) {
      console.error('❌ Error cargando formulario:', error)
      return null
    }
  }

  /**
   * Limpia datos guardados del formulario
   */
  function clearSavedFormData() {
    try {
      const key = `modal_form_${config.dbName || 'default'}`
      localStorage.removeItem(key)
      console.log('🧹 Datos guardados del formulario eliminados')
    } catch (error) {
      console.error('❌ Error limpiando formulario guardado:', error)
    }
  }

  // ============================================
  // ✔️ COMPLETAR WORKFLOW
  // ============================================

  /**
   * Completa el workflow
   * @returns {Promise<boolean>} true si se completó
   */
  async function complete() {
    console.log('✔️ Completando workflow...')

    // Validar todos los pasos
    if (config.enableValidation) {
      const isValid = await validateAllSteps()
      if (!isValid) {
        console.warn('❌ No se puede completar: validación fallida')
        return false
      }
    }

    try {
      processing.isProcessing = true
      processing.operation = 'complete'
      processing.message = 'Completando...'

      // Callback
      if (callbacks.onComplete) {
        const result = await callbacks.onComplete(formData)

        if (result === false) {
          console.warn('❌ Completado cancelado por callback')
          return false
        }
      }

      // Limpiar datos guardados
      clearSavedFormData()

      hasUnsavedChanges.value = false

      console.log('✅ Workflow completado')

      // Cerrar modal
      await close(true)

      return true

    } catch (error) {
      console.error('❌ Error completando workflow:', error)
      validationErrors.general = error.message
      return false

    } finally {
      processing.isProcessing = false
      processing.operation = ''
      processing.message = ''
    }
  }

  // ============================================
  // 🔧 UTILIDADES
  // ============================================

  /**
   * Confirma una acción con el usuario
   * @param {string} message - Mensaje de confirmación
   * @returns {Promise<boolean>}
   */
  function confirmAction(message) {
    return new Promise((resolve) => {
      // Usar window.confirm por defecto
      // Puede ser reemplazado por un modal personalizado
      const confirmed = window.confirm(message)
      resolve(confirmed)
    })
  }

  /**
   * Configura callbacks
   * @param {Object} newCallbacks - Callbacks a configurar
   */
  function setCallbacks(newCallbacks) {
    Object.assign(callbacks, newCallbacks)
    console.log('🔧 Callbacks configurados:', Object.keys(newCallbacks))
  }

  /**
   * Configura pasos del workflow
   * @param {Array} newSteps - Nuevos pasos
   */
  function setSteps(newSteps) {
    steps.value = newSteps
    currentStep.value = 0
    updateStepState()
    console.log('📋 Pasos configurados:', newSteps.length)
  }

  /**
   * Obtiene progreso del workflow
   * @returns {number} Porcentaje (0-100)
   */
  function getProgress() {
    if (steps.value.length === 0) return 0
    return ((currentStep.value + 1) / steps.value.length) * 100
  }

  /**
   * Verifica si es el primer paso
   * @returns {boolean}
   */
  function isFirstStep() {
    return currentStep.value === 0
  }

  /**
   * Verifica si es el último paso
   * @returns {boolean}
   */
  function isLastStep() {
    return currentStep.value === steps.value.length - 1
  }

  /**
   * Obtiene información del paso actual
   * @returns {Object|null}
   */
  function getCurrentStepInfo() {
    return steps.value[currentStep.value] || null
  }

  /**
   * Obtiene información completa del workflow
   * @returns {Object}
   */
  function getWorkflowInfo() {
    return {
      isOpen: isOpen.value,
      currentStep: currentStep.value,
      totalSteps: steps.value.length,
      progress: getProgress(),
      stepInfo: getCurrentStepInfo(),
      canGoBack: stepConfig.canGoBack,
      canGoNext: stepConfig.canGoNext,
      canFinish: stepConfig.canFinish,
      isValid: stepConfig.isValid,
      hasErrors: Object.keys(validationErrors).length > 0,
      hasUnsavedChanges: hasUnsavedChanges.value,
      isProcessing: processing.isProcessing
    }
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Progreso del workflow
   */
  const progress = computed(() => getProgress())

  /**
   * Información del paso actual
   */
  const currentStepInfo = computed(() => getCurrentStepInfo())

  /**
   * Verifica si hay errores
   */
  const hasErrors = computed(() => Object.keys(validationErrors).length > 0)

  /**
   * Estado del workflow
   */
  const workflowState = computed(() => ({
    isOpen: isOpen.value,
    isProcessing: processing.isProcessing,
    isFirstStep: isFirstStep(),
    isLastStep: isLastStep(),
    canComplete: stepConfig.canFinish && stepConfig.isValid,
    hasUnsavedChanges: hasUnsavedChanges.value
  }))

  // ============================================
  // 👁️ WATCHERS
  // ============================================

  /**
   * Watch para detectar cambios en formData
   */
  watch(() => formData, () => {
    hasUnsavedChanges.value = true
  }, { deep: true })

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    isOpen,
    currentStep,
    steps,
    formData,
    validationErrors,
    processing,
    navigationHistory,
    stepConfig,
    callbacks,
    hasUnsavedChanges,

    // Gestión de modal
    open,
    close,
    cancel,
    resetWorkflow,

    // Navegación
    nextStep,
    previousStep,
    goToStep,
    goToFirstStep,
    goToLastStep,
    updateStepState,

    // Validación
    validateCurrentStep,
    validateAllSteps,
    validateField,
    clearValidationErrors,

    // Formulario
    updateField,
    getField,
    updateFields,
    saveFormData,
    loadFormData,
    clearSavedFormData,

    // Completar
    complete,

    // Utilidades
    confirmAction,
    setCallbacks,
    setSteps,
    getProgress,
    isFirstStep,
    isLastStep,
    getCurrentStepInfo,
    getWorkflowInfo,

    // Computed properties
    progress,
    currentStepInfo,
    hasErrors,
    workflowState
  }
}
