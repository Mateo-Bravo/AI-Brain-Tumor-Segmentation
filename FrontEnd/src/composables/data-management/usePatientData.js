/**
 * @fileoverview Composable para gestionar datos de pacientes (CRUD local)
 * @module usePatientData
 * @description Maneja búsqueda, listado, selección y gestión de pacientes en localStorage
 */

import { computed, reactive, ref } from 'vue'

/**
 * Composable para gestionar datos de pacientes localmente
 * @returns {Object} Estado y métodos de gestión de pacientes
 */
export function usePatientData() {
  // ========================================
  // 📊 ESTADO DE PACIENTES
  // ========================================

  /**
   * Lista de todos los pacientes almacenados
   * @type {import('vue').Ref<Array>}
   */
  const patients = ref([])

  /**
   * Paciente actualmente seleccionado
   * @type {import('vue').Ref<Object|null>}
   */
  const selectedPatient = ref(null)

  /**
   * Paciente en modo edición
   * @type {import('vue').Ref<Object|null>}
   */
  const editingPatient = ref(null)

  /**
   * Término de búsqueda actual
   * @type {import('vue').Ref<string>}
   */
  const searchTerm = ref('')

  /**
   * Indica si hay una operación en progreso
   * @type {import('vue').Ref<boolean>}
   */
  const isLoading = ref(false)

  /**
   * Mensaje de error si ocurre alguno
   * @type {import('vue').Ref<string|null>}
   */
  const error = ref(null)

  /**
   * Filtros de búsqueda avanzada
   */
  const filters = reactive({
    gender: '',
    ageRange: { min: null, max: null },
    dateRange: { start: null, end: null }
  })

  // ========================================
  // ⚙️ CONFIGURACIÓN
  // ========================================

  /**
   * Clave de localStorage para pacientes
   */
  const STORAGE_KEY = 'patientStudies'

  /**
   * Clave de localStorage para pacientes (alternativa)
   */
  const PATIENTS_KEY = 'patients'

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  /**
   * Pacientes filtrados según término de búsqueda
   */
  const filteredPatients = computed(() => {
    if (!searchTerm.value) return patients.value

    const term = searchTerm.value.toLowerCase().trim()

    return patients.value.filter(patient => {
      const fullName = (patient.fullName || patient.full_name || '').toLowerCase()
      const patientId = (patient.patientId || patient.identity_id || '').toLowerCase()
      const clinicalReason = (patient.clinicalReason || patient.clinical_history || '').toLowerCase()

      return fullName.includes(term) ||
        patientId.includes(term) ||
        clinicalReason.includes(term)
    })
  })

  /**
   * Pacientes ordenados por fecha (más recientes primero)
   */
  const sortedPatients = computed(() => {
    return [...filteredPatients.value].sort((a, b) => {
      const dateA = new Date(a.studyDate || a.created_at || 0)
      const dateB = new Date(b.studyDate || b.created_at || 0)
      return dateB - dateA
    })
  })

  /**
   * Total de pacientes
   */
  const totalPatients = computed(() => patients.value.length)

  /**
   * Total de pacientes filtrados
   */
  const totalFiltered = computed(() => filteredPatients.value.length)

  /**
   * Verifica si hay algún paciente
   */
  const hasPatients = computed(() => patients.value.length > 0)

  /**
   * Verifica si hay un paciente seleccionado
   */
  const hasSelectedPatient = computed(() => selectedPatient.value !== null)

  // ========================================
  // 📥 FUNCIONES DE CARGA
  // ========================================

  /**
   * Carga todos los pacientes desde localStorage
   * @returns {Promise<Array>}
   */
  async function loadPatients() {
    console.log('📥 Cargando pacientes desde localStorage...')
    isLoading.value = true
    error.value = null

    try {
      // Intentar cargar desde STORAGE_KEY primero
      const storedData = localStorage.getItem(STORAGE_KEY)

      if (storedData) {
        const parsedData = JSON.parse(storedData)
        patients.value = Array.isArray(parsedData) ? parsedData : []
        console.log(`✅ ${patients.value.length} pacientes cargados desde ${STORAGE_KEY}`)
      } else {
        // Intentar cargar desde PATIENTS_KEY alternativo
        const alternativeData = localStorage.getItem(PATIENTS_KEY)

        if (alternativeData) {
          const parsedData = JSON.parse(alternativeData)
          patients.value = Array.isArray(parsedData) ? parsedData : []
          console.log(`✅ ${patients.value.length} pacientes cargados desde ${PATIENTS_KEY}`)
        } else {
          patients.value = []
          console.log('ℹ️ No hay pacientes guardados')
        }
      }

      return patients.value

    } catch (err) {
      error.value = 'Error al cargar pacientes: ' + err.message
      console.error('❌ Error cargando pacientes:', err)
      patients.value = []
      return []

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Recarga los pacientes desde localStorage
   * @returns {Promise<Array>}
   */
  async function refreshPatients() {
    console.log('🔄 Refrescando lista de pacientes...')
    return await loadPatients()
  }

  // ========================================
  // 🔍 FUNCIONES DE BÚSQUEDA
  // ========================================

  /**
   * Busca un paciente por ID de identidad
   * @param {string} identityId - ID de identidad del paciente
   * @returns {Object|null}
   */
  function findPatientByIdentityId(identityId) {
    if (!identityId) {
      console.warn('⚠️ ID de identidad vacío')
      return null
    }

    console.log(`🔍 Buscando paciente con ID: ${identityId}`)

    const patient = patients.value.find(p =>
      (p.patientId === identityId || p.identity_id === identityId)
    )

    if (patient) {
      console.log('✅ Paciente encontrado:', patient)
    } else {
      console.log('❌ Paciente no encontrado')
    }

    return patient || null
  }

  /**
   * Busca un paciente por study ID
   * @param {string} studyId - ID del estudio
   * @returns {Object|null}
   */
  function findPatientByStudyId(studyId) {
    if (!studyId) {
      console.warn('⚠️ Study ID vacío')
      return null
    }

    console.log(`🔍 Buscando paciente con Study ID: ${studyId}`)

    const patient = patients.value.find(p => p.studyId === studyId)

    if (patient) {
      console.log('✅ Paciente encontrado:', patient)
    } else {
      console.log('❌ Paciente no encontrado')
    }

    return patient || null
  }

  /**
   * Busca pacientes por nombre (búsqueda parcial)
   * @param {string} name - Nombre o parte del nombre
   * @returns {Array}
   */
  function findPatientsByName(name) {
    if (!name) return []

    const searchName = name.toLowerCase().trim()
    console.log(`🔍 Buscando pacientes con nombre: ${name}`)

    const results = patients.value.filter(p => {
      const fullName = (p.fullName || p.full_name || '').toLowerCase()
      return fullName.includes(searchName)
    })

    console.log(`✅ ${results.length} paciente(s) encontrado(s)`)
    return results
  }

  /**
   * Filtra pacientes por género
   * @param {string} gender - 'M', 'F', o ''
   * @returns {Array}
   */
  function filterByGender(gender) {
    if (!gender) return patients.value

    return patients.value.filter(p =>
      (p.gender === gender || p.sex === gender)
    )
  }

  /**
   * Filtra pacientes por rango de edad
   * @param {number} minAge - Edad mínima
   * @param {number} maxAge - Edad máxima
   * @returns {Array}
   */
  function filterByAgeRange(minAge, maxAge) {
    return patients.value.filter(p => {
      const age = parseInt(p.age)
      if (isNaN(age)) return false

      const meetsMin = minAge === null || age >= minAge
      const meetsMax = maxAge === null || age <= maxAge

      return meetsMin && meetsMax
    })
  }

  // ========================================
  // ➕ FUNCIONES DE CREACIÓN
  // ========================================

  /**
   * Crea un nuevo paciente local
   * @param {Object} patientData - Datos del paciente
   * @returns {Promise<Object>}
   */
  async function createPatient(patientData) {
    console.log('➕ Creando nuevo paciente:', patientData)
    isLoading.value = true
    error.value = null

    try {
      // Generar IDs únicos
      const studyId = 'STUDY-' + Date.now()
      const timestamp = new Date().toISOString()

      // Normalizar datos
      const newPatient = {
        studyId,
        fullName: patientData.fullName || patientData.full_name || 'N/D',
        age: patientData.age || 'N/D',
        patientId: patientData.patientId || patientData.identity_id || 'N/D',
        gender: patientData.gender || patientData.sex || 'N/D',
        phone: patientData.phone || '',
        email: patientData.email || '',
        address: patientData.address || '',
        clinicalReason: patientData.clinicalReason || patientData.clinical_history || 'N/D',
        studyDate: new Date().toLocaleDateString(),
        created_at: timestamp,
        updated_at: timestamp,
        hasMedicalImage: false,
        imageTimestamp: null
      }

      // Agregar a la lista
      patients.value.push(newPatient)

      // Guardar en localStorage
      await savePatients()

      console.log('✅ Paciente creado exitosamente:', newPatient)
      return newPatient

    } catch (err) {
      error.value = 'Error al crear paciente: ' + err.message
      console.error('❌ Error creando paciente:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // ✏️ FUNCIONES DE ACTUALIZACIÓN
  // ========================================

  /**
   * Actualiza un paciente existente
   * @param {string} studyId - ID del estudio
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object|null>}
   */
  async function updatePatient(studyId, updates) {
    console.log(`✏️ Actualizando paciente ${studyId}:`, updates)
    isLoading.value = true
    error.value = null

    try {
      const index = patients.value.findIndex(p => p.studyId === studyId)

      if (index === -1) {
        throw new Error(`Paciente con ID ${studyId} no encontrado`)
      }

      // Actualizar datos
      patients.value[index] = {
        ...patients.value[index],
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Guardar en localStorage
      await savePatients()

      console.log('✅ Paciente actualizado:', patients.value[index])
      return patients.value[index]

    } catch (err) {
      error.value = 'Error al actualizar paciente: ' + err.message
      console.error('❌ Error actualizando paciente:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Marca que un paciente tiene imagen médica asociada
   * @param {string} studyId - ID del estudio
   * @param {Object} imageInfo - Información de la imagen
   * @returns {Promise<Object|null>}
   */
  async function addMedicalImageToPatient(studyId, imageInfo) {
    console.log(`🖼️ Agregando imagen médica al paciente ${studyId}`)

    return await updatePatient(studyId, {
      hasMedicalImage: true,
      imageTimestamp: new Date().toISOString(),
      imageInfo: imageInfo || {}
    })
  }

  // ========================================
  // 🗑️ FUNCIONES DE ELIMINACIÓN
  // ========================================

  /**
   * Elimina un paciente por study ID
   * @param {string} studyId - ID del estudio
   * @returns {Promise<boolean>}
   */
  async function deletePatient(studyId) {
    console.log(`🗑️ Eliminando paciente ${studyId}...`)
    isLoading.value = true
    error.value = null

    try {
      const index = patients.value.findIndex(p => p.studyId === studyId)

      if (index === -1) {
        throw new Error(`Paciente con ID ${studyId} no encontrado`)
      }

      // Remover de la lista
      patients.value.splice(index, 1)

      // Si era el seleccionado, limpiar selección
      if (selectedPatient.value?.studyId === studyId) {
        selectedPatient.value = null
      }

      // Guardar en localStorage
      await savePatients()

      console.log('✅ Paciente eliminado exitosamente')
      return true

    } catch (err) {
      error.value = 'Error al eliminar paciente: ' + err.message
      console.error('❌ Error eliminando paciente:', err)
      return false

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Elimina múltiples pacientes
   * @param {Array<string>} studyIds - Array de IDs de estudios
   * @returns {Promise<number>}
   */
  async function deleteMultiplePatients(studyIds) {
    console.log(`🗑️ Eliminando ${studyIds.length} pacientes...`)

    let deletedCount = 0

    for (const studyId of studyIds) {
      const success = await deletePatient(studyId)
      if (success) deletedCount++
    }

    console.log(`✅ ${deletedCount}/${studyIds.length} pacientes eliminados`)
    return deletedCount
  }

  /**
   * Elimina todos los pacientes (con confirmación)
   * @returns {Promise<boolean>}
   */
  async function deleteAllPatients() {
    console.log('🗑️⚠️ Eliminando TODOS los pacientes...')
    isLoading.value = true
    error.value = null

    try {
      patients.value = []
      selectedPatient.value = null

      // Limpiar localStorage
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(PATIENTS_KEY)

      console.log('✅ Todos los pacientes eliminados')
      return true

    } catch (err) {
      error.value = 'Error al eliminar todos los pacientes: ' + err.message
      console.error('❌ Error:', err)
      return false

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 💾 FUNCIONES DE PERSISTENCIA
  // ========================================

  /**
   * Guarda todos los pacientes en localStorage
   * @returns {Promise<void>}
   */
  async function savePatients() {
    try {
      console.log(`💾 Guardando ${patients.value.length} pacientes...`)

      const dataToSave = JSON.stringify(patients.value)
      localStorage.setItem(STORAGE_KEY, dataToSave)

      console.log('✅ Pacientes guardados exitosamente')

    } catch (err) {
      console.error('❌ Error guardando pacientes:', err)
      throw new Error('No se pudo guardar los pacientes: ' + err.message)
    }
  }

  /**
   * Exporta todos los pacientes a JSON
   * @returns {string}
   */
  function exportPatientsToJSON() {
    console.log('📤 Exportando pacientes a JSON...')
    return JSON.stringify(patients.value, null, 2)
  }

  /**
   * Importa pacientes desde JSON
   * @param {string} jsonData - Datos en formato JSON
   * @returns {Promise<number>}
   */
  async function importPatientsFromJSON(jsonData) {
    console.log('📥 Importando pacientes desde JSON...')
    isLoading.value = true
    error.value = null

    try {
      const importedPatients = JSON.parse(jsonData)

      if (!Array.isArray(importedPatients)) {
        throw new Error('El JSON no contiene un array de pacientes')
      }

      // Agregar pacientes importados (sin duplicados por studyId)
      let addedCount = 0

      for (const patient of importedPatients) {
        const exists = patients.value.find(p => p.studyId === patient.studyId)

        if (!exists) {
          patients.value.push(patient)
          addedCount++
        }
      }

      // Guardar
      await savePatients()

      console.log(`✅ ${addedCount} pacientes importados exitosamente`)
      return addedCount

    } catch (err) {
      error.value = 'Error al importar pacientes: ' + err.message
      console.error('❌ Error importando pacientes:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 🎯 FUNCIONES DE SELECCIÓN
  // ========================================

  /**
   * Selecciona un paciente
   * @param {Object} patient - Paciente a seleccionar
   */
  function selectPatient(patient) {
    console.log('🎯 Paciente seleccionado:', patient)
    selectedPatient.value = patient
  }

  /**
   * Deselecciona el paciente actual
   */
  function deselectPatient() {
    console.log('🎯 Paciente deseleccionado')
    selectedPatient.value = null
  }

  /**
   * Inicia edición de un paciente
   * @param {Object} patient - Paciente a editar
   */
  function startEditing(patient) {
    console.log('✏️ Iniciando edición:', patient)
    editingPatient.value = { ...patient } // Copia para no mutar original
  }

  /**
   * Cancela la edición actual
   */
  function cancelEditing() {
    console.log('✏️ Edición cancelada')
    editingPatient.value = null
  }

  /**
   * Guarda los cambios de edición
   * @returns {Promise<Object|null>}
   */
  async function saveEditing() {
    if (!editingPatient.value) return null

    console.log('✏️ Guardando edición...')

    const studyId = editingPatient.value.studyId
    const updates = { ...editingPatient.value }
    delete updates.studyId // No actualizar el ID

    const updated = await updatePatient(studyId, updates)
    editingPatient.value = null

    return updated
  }

  // ========================================
  // 🔧 FUNCIONES DE UTILIDAD
  // ========================================

  /**
   * Limpia el término de búsqueda
   */
  function clearSearch() {
    searchTerm.value = ''
    console.log('🧹 Búsqueda limpiada')
  }

  /**
   * Resetea todos los filtros
   */
  function resetFilters() {
    filters.gender = ''
    filters.ageRange = { min: null, max: null }
    filters.dateRange = { start: null, end: null }
    console.log('🧹 Filtros reseteados')
  }

  /**
   * Obtiene estadísticas de pacientes
   * @returns {Object}
   */
  function getStatistics() {
    const stats = {
      total: patients.value.length,
      withImages: patients.value.filter(p => p.hasMedicalImage).length,
      byGender: {
        male: patients.value.filter(p => p.gender === 'M' || p.sex === 'M').length,
        female: patients.value.filter(p => p.gender === 'F' || p.sex === 'F').length,
        other: patients.value.filter(p => !['M', 'F'].includes(p.gender || p.sex)).length
      },
      averageAge: 0
    }

    // Calcular edad promedio
    const validAges = patients.value
      .map(p => parseInt(p.age))
      .filter(age => !isNaN(age) && age > 0)

    if (validAges.length > 0) {
      stats.averageAge = Math.round(
        validAges.reduce((sum, age) => sum + age, 0) / validAges.length
      )
    }

    return stats
  }

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado
    patients,
    selectedPatient,
    editingPatient,
    searchTerm,
    isLoading,
    error,
    filters,

    // Computed
    filteredPatients,
    sortedPatients,
    totalPatients,
    totalFiltered,
    hasPatients,
    hasSelectedPatient,

    // Carga
    loadPatients,
    refreshPatients,

    // Búsqueda
    findPatientByIdentityId,
    findPatientByStudyId,
    findPatientsByName,
    filterByGender,
    filterByAgeRange,

    // CRUD
    createPatient,
    updatePatient,
    deletePatient,
    deleteMultiplePatients,
    deleteAllPatients,
    addMedicalImageToPatient,

    // Persistencia
    savePatients,
    exportPatientsToJSON,
    importPatientsFromJSON,

    // Selección
    selectPatient,
    deselectPatient,
    startEditing,
    cancelEditing,
    saveEditing,

    // Utilidades
    clearSearch,
    resetFilters,
    getStatistics
  }
}
