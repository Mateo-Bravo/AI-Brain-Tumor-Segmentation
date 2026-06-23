/**
 * @fileoverview Composable para gestionar el estado y la lógica del modal de carga
 * @module useModalState
 * @description Maneja el flujo de carga de archivos médicos, datos de pacientes
 * y navegación entre pasos del modal
 */

import { computed, reactive, ref } from 'vue'

/**
 * Composable para gestionar el estado completo del modal de carga
 * @returns {Object} Estado y métodos del modal
 */
export function useModalState() {
  // ========================================
  // 📊 ESTADO DEL MODAL
  // ========================================

  /**
   * Controla la visibilidad del modal
   * @type {import('vue').Ref<boolean>}
   */
  const showModal = ref(false)

  /**
   * Paso actual en el flujo del modal (1-3)
   * @type {import('vue').Ref<number>}
   */
  const currentStep = ref(1)

  /**
   * Indica si hay una operación de carga en progreso
   * @type {import('vue').Ref<boolean>}
   */
  const isLoading = ref(false)

  /**
   * Indica si hay una carga de archivo en progreso
   * @type {import('vue').Ref<boolean>}
   */
  const isUploading = ref(false)

  // ========================================
  // 👤 DATOS DEL PACIENTE
  // ========================================

  /**
   * Datos del formulario del paciente
   * @type {import('vue').Reactive<Object>}
   */
  const patientData = reactive({
    fullName: '',
    age: '',
    patientId: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    clinicalReason: ''
  })

  /**
   * Datos del paciente para guardar (copia antes de limpiar)
   * @type {import('vue').Ref<Object>}
   */
  const patientDataToSave = ref({})

  /**
   * Datos del paciente para mostrar en UI
   * @type {import('vue').Ref<Object>}
   */
  const patientDataToShow = ref({})

  /**
   * ID del paciente para buscar
   * @type {import('vue').Ref<string>}
   */
  const patientFindId = ref('')

  // ========================================
  // 📁 ARCHIVOS CARGADOS
  // ========================================

  /**
   * Lista de archivos cargados en el modal
   * @type {import('vue').Ref<Array>}
   */
  const uploadedFiles = ref([])

  // ========================================
  // ⚙️ OPCIONES Y FLAGS
  // ========================================

  /**
   * Determina si se incluyen datos del paciente en el registro
   * @type {import('vue').Ref<boolean>}
   */
  const includePatientData = ref(false)

  /**
   * Muestra información del paciente en UI
   * @type {import('vue').Ref<boolean>}
   */
  const showPatienteInfo = ref(false)

  /**
   * Flag para registrar nuevo paciente
   * @type {import('vue').Ref<boolean>}
   */
  const registerNewPatient = ref(false)

  /**
   * Flag para registrar solo consulta (sin paciente completo)
   * @type {import('vue').Ref<boolean>}
   */
  const registerNewConsultations = ref(true)

  /**
   * Flag para controlar si se carga paciente e imagen
   * @type {boolean}
   */
  let charguePatientAndImage = true

  /**
   * Flag para mostrar mensaje de archivo repetido
   * @type {boolean}
   */
  let flagRepeatedArchiveMessage = true

  /**
   * Referencia a imagen existente
   * @type {Object|null}
   */
  let existingImage = null

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  /**
   * Valida si el paso 1 está completo
   * @returns {boolean} True si hay archivo cargado
   */
  const isStep1Valid = computed(() => {
    return uploadedFiles.value.length > 0
  })

  /**
   * Valida si el paso 2 está completo
   * @returns {boolean} True si se confirmó archivo
   */
  const isStep2Valid = computed(() => {
    return uploadedFiles.value.length > 0
  })

  /**
   * Valida si los datos del paciente están completos
   * @returns {boolean} True si los campos obligatorios están llenos
   */
  const isPatientDataValid = computed(() => {
    if (!includePatientData.value) return true

    return !!(
      patientData.fullName &&
      patientData.age &&
      patientData.patientId &&
      patientData.gender
    )
  })

  /**
   * Determina si se puede avanzar al siguiente paso
   * @returns {boolean} True si se puede avanzar
   */
  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 1:
        return isStep1Valid.value
      case 2:
        return isStep2Valid.value
      case 3:
        return isPatientDataValid.value
      default:
        return false
    }
  })

  // ========================================
  // 🎯 FUNCIONES DE NAVEGACIÓN DEL MODAL
  // ========================================

  /**
   * Abre el modal e inicia el proceso de carga
   */
  function openModal() {
    console.log('🚀 Abriendo modal de carga...')
    showModal.value = true
    currentStep.value = 1
  }

  /**
   * Cierra el modal sin resetear datos
   */
  function closeModal() {
    console.log('🔒 Cerrando modal de carga...')
    showModal.value = false
  }

  /**
   * Avanza al siguiente paso del modal
   */
  function nextStep() {
    if (!canProceed.value) {
      console.warn('⚠️ No se puede avanzar: validación fallida')
      return
    }

    if (currentStep.value < 3) {
      currentStep.value++
      console.log(`➡️ Avanzando a paso ${currentStep.value}`)
    }
  }

  /**
   * Retrocede al paso anterior
   */
  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--
      console.log(`⬅️ Retrocediendo a paso ${currentStep.value}`)
    }
  }

  /**
   * Reinicia el modal y todos sus estados
   * Limpia datos del paciente, archivos y progreso de carga
   */
  function resetModal() {
    console.log('🔄 Reseteando modal...')

    showModal.value = false
    currentStep.value = 1
    isLoading.value = false
    isUploading.value = false

    // Limpiar archivos
    uploadedFiles.value = []

    // Limpiar datos del paciente
    clearPatientData()

    // Resetear flags
    includePatientData.value = false
    registerNewPatient.value = false
    registerNewConsultations.value = true

    console.log('✅ Modal reseteado exitosamente')
  }

  // ========================================
  // 👤 FUNCIONES DE GESTIÓN DE PACIENTE
  // ========================================

  /**
   * Limpia todos los datos del paciente
   */
  function clearPatientData() {
    console.log('🧹 Limpiando datos del paciente...')

    patientData.fullName = ''
    patientData.age = ''
    patientData.patientId = ''
    patientData.gender = ''
    patientData.phone = ''
    patientData.email = ''
    patientData.address = ''
    patientData.clinicalReason = ''

    includePatientData.value = false
  }

  /**
   * Guarda una copia de los datos del paciente antes de limpiar
   */
  function savePatientDataCopy() {
    console.log('💾 Guardando copia de datos del paciente...')

    patientDataToSave.value = {
      fullName: patientData.fullName,
      age: patientData.age,
      patientId: patientData.patientId,
      gender: patientData.gender,
      phone: patientData.phone,
      email: patientData.email,
      address: patientData.address,
      clinicalReason: patientData.clinicalReason
    }

    patientDataToShow.value = { ...patientDataToSave.value }

    console.log('✅ Copia guardada:', patientDataToSave.value)
  }

  /**
   * Carga datos del paciente desde un objeto
   * @param {Object} patient - Datos del paciente a cargar
   */
  function loadPatientData(patient) {
    console.log('📥 Cargando datos del paciente:', patient)

    patientData.fullName = patient.full_name || patient.fullName || ''
    patientData.age = patient.age || ''
    patientData.patientId = patient.identity_id || patient.patientId || ''
    patientData.gender = patient.sex || patient.gender || ''
    patientData.phone = patient.phone || ''
    patientData.email = patient.email || ''
    patientData.address = patient.address || ''
    patientData.clinicalReason = patient.clinical_history || patient.clinicalReason || ''

    console.log('✅ Datos del paciente cargados')
  }

  /**
   * Muestra información del paciente en la UI
   * @param {Object} patient - Datos del paciente a mostrar
   */
  function showPatientInfo(patient) {
    console.log('👁️ Mostrando info del paciente:', patient)

    patientDataToShow.value = {
      fullName: patient.full_name || patient.fullName || '',
      age: patient.age || '',
      patientId: patient.identity_id || patient.patientId || '',
      gender: patient.sex || patient.gender || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || ''
    }

    showPatienteInfo.value = true
  }

  /**
   * Alterna entre modo registro de paciente y solo consulta
   * @param {string} origin - Origen del toggle ('includePatient' o 'onlyConsultations')
   */
  function toggleRegistrationMode(origin) {
    console.log(`🔄 Toggle desde: ${origin}`)

    if (origin === 'includePatient' && includePatientData.value) {
      registerNewConsultations.value = false
      console.log('📝 Modo: Registro con datos de paciente')
    }

    if (origin === 'onlyConsultations' && registerNewConsultations.value) {
      includePatientData.value = false
      console.log('📝 Modo: Solo consulta (sin datos de paciente)')
    }
  }

  // ========================================
  // 📁 FUNCIONES DE GESTIÓN DE ARCHIVOS
  // ========================================

  /**
   * Simula la carga de un archivo médico con progreso
   * @param {Object} file - Objeto con información del archivo
   */
  function simulateFileUpload(file) {
    console.log('⏳ Simulando carga de archivo:', file)

    isUploading.value = true

    setTimeout(() => {
      isUploading.value = false
      uploadedFiles.value = [file]
      currentStep.value = 2

      console.log('✅ Archivo simulado cargado')
    }, 2000)
  }

  /**
   * Limpia la lista de archivos cargados
   */
  function clearFiles() {
    console.log('🗑️ Limpiando archivos...')
    uploadedFiles.value = []
  }

  /**
   * Agrega un archivo a la lista de archivos cargados
   * @param {Object} file - Archivo a agregar
   */
  function addFile(file) {
    console.log('➕ Agregando archivo:', file.name)
    uploadedFiles.value = [file] // Solo permitir un archivo
  }

  /**
   * Remueve un archivo de la lista
   * @param {number} index - Índice del archivo a remover
   */
  function removeFile(index) {
    console.log('➖ Removiendo archivo en índice:', index)
    uploadedFiles.value.splice(index, 1)
  }

  // ========================================
  // 🔄 FUNCIONES DE VALIDACIÓN Y CONFIRMACIÓN
  // ========================================

  /**
   * Valida y confirma el paso actual antes de avanzar
   * Incluye simulación de validación con delay
   */
  function handleValidateAndConfirm() {
    console.log(`✅ Validando paso ${currentStep.value}...`)

    if (currentStep.value === 2) {
      isLoading.value = true

      setTimeout(() => {
        isLoading.value = false
        currentStep.value = 3
        console.log('✅ Validación completada')
      }, 2000)
    } else {
      nextStep()
    }
  }

  // ========================================
  // 🔧 FUNCIONES AUXILIARES
  // ========================================

  /**
   * Establece el flag de carga de paciente e imagen
   * @param {boolean} value - Valor a establecer
   */
  function setCharguePatientAndImage(value) {
    charguePatientAndImage = value
    console.log(`🔧 charguePatientAndImage = ${value}`)
  }

  /**
   * Establece el flag de mensaje de archivo repetido
   * @param {boolean} value - Valor a establecer
   */
  function setFlagRepeatedArchiveMessage(value) {
    flagRepeatedArchiveMessage = value
    console.log(`🔧 flagRepeatedArchiveMessage = ${value}`)
  }

  /**
   * Establece la referencia a imagen existente
   * @param {Object} image - Objeto de imagen existente
   */
  function setExistingImage(image) {
    existingImage = image
    console.log('🔧 Imagen existente establecida:', image)
  }

  /**
   * Obtiene el flag de carga de paciente e imagen
   * @returns {boolean}
   */
  function getCharguePatientAndImage() {
    return charguePatientAndImage
  }

  /**
   * Obtiene el flag de mensaje de archivo repetido
   * @returns {boolean}
   */
  function getFlagRepeatedArchiveMessage() {
    return flagRepeatedArchiveMessage
  }

  /**
   * Obtiene la referencia a imagen existente
   * @returns {Object|null}
   */
  function getExistingImage() {
    return existingImage
  }

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado del modal
    showModal,
    currentStep,
    isLoading,
    isUploading,

    // Datos del paciente
    patientData,
    patientDataToSave,
    patientDataToShow,
    patientFindId,

    // Archivos
    uploadedFiles,

    // Opciones y flags
    includePatientData,
    showPatienteInfo,
    registerNewPatient,
    registerNewConsultations,

    // Computed
    isStep1Valid,
    isStep2Valid,
    isPatientDataValid,
    canProceed,

    // Funciones de navegación
    openModal,
    closeModal,
    nextStep,
    prevStep,
    resetModal,

    // Funciones de paciente
    clearPatientData,
    savePatientDataCopy,
    loadPatientData,
    showPatientInfo,
    toggleRegistrationMode,

    // Funciones de archivos
    simulateFileUpload,
    clearFiles,
    addFile,
    removeFile,

    // Funciones de validación
    handleValidateAndConfirm,

    // Funciones auxiliares
    setCharguePatientAndImage,
    setFlagRepeatedArchiveMessage,
    setExistingImage,
    getCharguePatientAndImage,
    getFlagRepeatedArchiveMessage,
    getExistingImage
  }
}
