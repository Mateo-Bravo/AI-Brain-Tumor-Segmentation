/**
 * @fileoverview Composable para gestionar API de pacientes
 * @module usePatientAPI
 * @description CRUD completo de pacientes con el backend (compatible con DashboardView.vue)
 */

import { computed, ref } from 'vue'

/**
 * Composable para gestionar pacientes con el backend
 * @returns {Object} Estado y métodos de API de pacientes
 */
export function usePatientAPI() {
  // ========================================
  // 📊 ESTADO REACTIVO
  // ========================================

  /**
   * Indica si hay una operación en progreso
   * @type {import('vue').Ref<boolean>}
   */
  const isLoading = ref(false)

  /**
   * Error de la última operación
   * @type {import('vue').Ref<string|null>}
   */
  const error = ref(null)

  /**
   * Lista de pacientes
   * @type {import('vue').Ref<Array>}
   */
  const patients = ref([])

  /**
   * Paciente actual
   * @type {import('vue').Ref<Object|null>}
   */
  const currentPatient = ref(null)

  // ========================================
  // ⚙️ CONFIGURACIÓN
  // ========================================

  /**
   * URL base del backend
   */
  const backendURL = import.meta.env.VITE_API_BASE_URL

  /**
   * Token de autenticación (opcional)
   */
  const getAuthToken = () => localStorage.getItem('authToken')

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  const hasPatients = computed(() => patients.value.length > 0)
  const hasCurrentPatient = computed(() => currentPatient.value !== null)
  const hasError = computed(() => error.value !== null)

  // ========================================
  // ➕ CREAR PACIENTE (compatible con Dashboard)
  // ========================================

  /**
   * Crea un nuevo paciente (COMPATIBLE con código existente en Dashboard)
   * Usa patientData directamente del reactive del Dashboard
   * @param {Object} patientData - Datos del formulario de paciente
   * @returns {Promise<Object>}
   */
  async function createPatient(patientData) {
    console.log('➕ Creando paciente...')
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${backendURL}/patients/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity_id: patientData.patientId,
          full_name: patientData.fullName,
          age: Number(patientData.age),
          sex: patientData.gender,
          phone: patientData.phone,
          email: patientData.email,
          address: patientData.address,
          clinical_history: patientData.clinicalReason || patientData.clinicalHistory || ''
        })
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const newPatient = await response.json()
      console.log('✅ Paciente creado:', newPatient)

      // Agregar a lista local
      patients.value.push(newPatient)
      currentPatient.value = newPatient

      return newPatient

    } catch (err) {
      error.value = err.message
      console.error('❌ Error creando paciente:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Crea un paciente anónimo (COMPATIBLE con código existente)
   * @returns {Promise<Object>}
   */
  async function createPatientAnonymous() {
    console.log('➕ Creando paciente anónimo...')
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${backendURL}/patients/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity_id: "",
          full_name: "Consulta",
          age: "0",
          sex: "N/A"
        })
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const newPatient = await response.json()
      console.log('✅ Paciente anónimo creado:', newPatient)

      currentPatient.value = newPatient

      return newPatient

    } catch (err) {
      error.value = err.message
      console.error('❌ Error creando paciente anónimo:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 🔍 BUSCAR PACIENTE (compatible con Dashboard)
  // ========================================

  /**
   * Busca un paciente por cédula (COMPATIBLE con código existente)
   * @param {string} identityId - Cédula del paciente
   * @returns {Promise<Object|null>}
   */
  async function findPatient(identityId) {
    console.log(`🔍 Buscando paciente: ${identityId}`)
    isLoading.value = true
    error.value = null

    try {
      if (!identityId || identityId.trim() === '') {
        throw new Error('Cédula vacía')
      }

      const response = await fetch(
        `${backendURL}/patients/by-identity/${encodeURIComponent(identityId)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          console.log('⚠️ Paciente no encontrado')
          return null
        }
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const patient = await response.json()
      console.log('✅ Paciente encontrado:', patient)

      currentPatient.value = patient

      return patient

    } catch (err) {
      error.value = err.message
      console.error('❌ Error buscando paciente:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Busca un paciente por ID numérico (COMPATIBLE con código existente)
   * @param {number} id - ID del paciente
   * @returns {Promise<Object|null>}
   */
  async function findPatientById(id) {
    console.log(`🔍 Buscando paciente por ID: ${id}`)
    isLoading.value = true
    error.value = null

    try {
      if (!id || isNaN(id)) {
        throw new Error('ID inválido')
      }

      const response = await fetch(`${backendURL}/patients/by-id/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log('⚠️ Paciente no encontrado')
          return null
        }
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const patient = await response.json()
      console.log('✅ Paciente encontrado:', patient)

      currentPatient.value = patient

      return patient

    } catch (err) {
      error.value = err.message
      console.error('❌ Error buscando paciente por ID:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 📥 OBTENER TODOS LOS PACIENTES
  // ========================================

  /**
   * Obtiene todos los pacientes
   * @param {Object} params - Parámetros { skip, limit }
   * @returns {Promise<Array>}
   */
  async function getAllPatients(params = {}) {
    console.log('📥 Obteniendo todos los pacientes...')
    isLoading.value = true
    error.value = null

    try {
      const queryParams = new URLSearchParams()
      if (params.skip) queryParams.append('skip', params.skip)
      if (params.limit) queryParams.append('limit', params.limit)

      const url = `${backendURL}/patients/?${queryParams.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      patients.value = data

      console.log(`✅ ${data.length} pacientes obtenidos`)
      return data

    } catch (err) {
      error.value = err.message
      console.error('❌ Error obteniendo pacientes:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // ✏️ ACTUALIZAR PACIENTE
  // ========================================

  /**
   * Actualiza un paciente existente
   * @param {number} patientId - ID del paciente
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async function updatePatient(patientId, updates) {
    console.log(`✏️ Actualizando paciente ${patientId}...`)
    isLoading.value = true
    error.value = null

    try {
      if (!patientId || isNaN(patientId)) {
        throw new Error('ID inválido')
      }

      const response = await fetch(`${backendURL}/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const updatedPatient = await response.json()
      console.log('✅ Paciente actualizado:', updatedPatient)

      // Actualizar en lista local
      const index = patients.value.findIndex(p => p.id === patientId)
      if (index !== -1) {
        patients.value[index] = updatedPatient
      }

      if (currentPatient.value?.id === patientId) {
        currentPatient.value = updatedPatient
      }

      return updatedPatient

    } catch (err) {
      error.value = err.message
      console.error('❌ Error actualizando paciente:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 🗑️ ELIMINAR PACIENTE
  // ========================================

  /**
   * Elimina un paciente
   * @param {number} patientId - ID del paciente
   * @returns {Promise<boolean>}
   */
  async function deletePatient(patientId) {
    console.log(`🗑️ Eliminando paciente ${patientId}...`)
    isLoading.value = true
    error.value = null

    try {
      if (!patientId || isNaN(patientId)) {
        throw new Error('ID inválido')
      }

      const response = await fetch(`${backendURL}/patients/${patientId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      console.log('✅ Paciente eliminado')

      // Remover de lista local
      const index = patients.value.findIndex(p => p.id === patientId)
      if (index !== -1) {
        patients.value.splice(index, 1)
      }

      if (currentPatient.value?.id === patientId) {
        currentPatient.value = null
      }

      return true

    } catch (err) {
      error.value = err.message
      console.error('❌ Error eliminando paciente:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 🔧 FUNCIONES AUXILIARES
  // ========================================

  /**
   * Muestra información del paciente (helper del Dashboard)
   * @param {Object} patient - Paciente a mostrar
   */
  function showPatientInfo(patient) {
    currentPatient.value = {
      fullName: patient.full_name || '',
      age: patient.age || '',
      patientId: patient.identity_id || '',
      gender: patient.sex || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || ''
    }
  }

  /**
   * Limpia los datos del paciente actual
   */
  function clearPatientData() {
    console.log('🧹 Limpiando datos del paciente...')
    currentPatient.value = null
  }

  /**
   * Limpia todo el estado
   */
  function clearState() {
    console.log('🧹 Limpiando estado de pacientes...')
    patients.value = []
    currentPatient.value = null
    error.value = null
  }

  /**
   * Limpia solo el error
   */
  function clearError() {
    error.value = null
  }

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado
    isLoading,
    error,
    patients,
    currentPatient,

    // Computed
    hasPatients,
    hasCurrentPatient,
    hasError,

    // CRUD - Funciones compatibles con Dashboard
    createPatient,           // ✅ Mismo nombre y comportamiento
    createPatientAnonymous,  // ✅ Mismo nombre y comportamiento
    findPatient,             // ✅ Buscar por cédula
    findPatientById,         // ✅ Buscar por ID
    getAllPatients,          // ✅ Obtener todos
    updatePatient,           // ✅ Actualizar
    deletePatient,           // ✅ Eliminar

    // Auxiliares
    showPatientInfo,         // ✅ Helper para mostrar info
    clearPatientData,        // ✅ Limpiar datos
    clearState,
    clearError
  }
}
