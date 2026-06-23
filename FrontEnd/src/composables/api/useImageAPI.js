/**
 * @fileoverview Composable para gestionar API de imágenes médicas
 * @module useImageAPI
 * @description CRUD de imágenes médicas con el backend (compatible con DashboardView.vue)
 */

import { computed, ref } from 'vue'

/**
 * Composable para gestionar imágenes médicas con el backend
 * @returns {Object} Estado y métodos de API de imágenes
 */
export function useImageAPI() {
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
   * Progreso de subida (0-100)
   * @type {import('vue').Ref<number>}
   */
  const uploadProgress = ref(0)

  /**
   * Lista de imágenes
   * @type {import('vue').Ref<Array>}
   */
  const images = ref([])

  /**
   * Imagen actual
   * @type {import('vue').Ref<Object|null>}
   */
  const currentImage = ref(null)

  // ========================================
  // ⚙️ CONFIGURACIÓN
  // ========================================

  /**
   * URL base del backend
   */
  const backendURL = import.meta.env.VITE_API_BASE_URL

  /**
   * Token de autenticación
   */
  const getAuthToken = () => localStorage.getItem('authToken')

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  const hasImages = computed(() => images.value.length > 0)
  const hasCurrentImage = computed(() => currentImage.value !== null)
  const hasError = computed(() => error.value !== null)
  const isUploading = computed(() => isLoading.value && uploadProgress.value < 100)

  // ========================================
  // 📤 SUBIR IMAGEN (compatible con Dashboard)
  // ========================================

  /**
   * Sube una imagen médica al servidor (COMPATIBLE con código existente)
   * @param {FormData} formData - FormData con el archivo y datos adicionales
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Promise<Object>}
   */
  async function uploadImageFile(formData, token = null) {
    console.log('📤 Subiendo imagen al servidor...')
    isLoading.value = true
    error.value = null
    uploadProgress.value = 0

    try {
      // Usar token pasado como parámetro o del localStorage
      const authToken = token || getAuthToken()

      if (!authToken) {
        throw new Error('No hay token de autenticación')
      }

      const response = await fetch(`${backendURL}/images/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
          // ⚠️ No agregar 'Content-Type', FormData lo maneja automáticamente
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Imagen subida correctamente:', result)

      uploadProgress.value = 100
      currentImage.value = result

      // Agregar a la lista local
      images.value.push(result)

      return result

    } catch (err) {
      error.value = err.message
      console.error('❌ Error al subir la imagen:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Sube una imagen con seguimiento de progreso usando XMLHttpRequest
   * @param {FormData} formData - FormData con el archivo
   * @param {string} token - Token de autenticación (opcional)
   * @param {Function} onProgress - Callback de progreso (opcional)
   * @returns {Promise<Object>}
   */
  function uploadImageWithProgress(formData, token = null, onProgress = null) {
    return new Promise((resolve, reject) => {
      console.log('📤 Subiendo imagen con seguimiento de progreso...')

      isLoading.value = true
      error.value = null
      uploadProgress.value = 0

      const authToken = token || getAuthToken()

      if (!authToken) {
        reject(new Error('No hay token de autenticación'))
        return
      }

      const xhr = new XMLHttpRequest()

      // Seguimiento de progreso
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          uploadProgress.value = percent
          console.log(`📊 Progreso: ${percent}%`)

          if (onProgress) {
            onProgress(percent)
          }
        }
      })

      // Éxito
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            console.log('✅ Imagen subida correctamente:', result)

            uploadProgress.value = 100
            currentImage.value = result
            images.value.push(result)
            isLoading.value = false

            resolve(result)
          } catch (parseError) {
            isLoading.value = false
            error.value = 'Error al procesar respuesta del servidor'
            reject(parseError)
          }
        } else {
          isLoading.value = false
          error.value = `Error HTTP: ${xhr.status}`
          reject(new Error(error.value))
        }
      })

      // Error
      xhr.addEventListener('error', () => {
        isLoading.value = false
        error.value = 'Error de red al subir imagen'
        console.error('❌ Error de red')
        reject(new Error(error.value))
      })

      // Timeout
      xhr.addEventListener('timeout', () => {
        isLoading.value = false
        error.value = 'Timeout: la subida tardó demasiado'
        console.error('❌ Timeout')
        reject(new Error(error.value))
      })

      // Configurar y enviar
      xhr.open('POST', `${backendURL}/images/upload/`)
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
      xhr.timeout = 300000 // 5 minutos
      xhr.send(formData)
    })
  }

  // ========================================
  // 🔍 BUSCAR IMAGEN (compatible con Dashboard)
  // ========================================

  /**
   * Obtiene una imagen por nombre de archivo (COMPATIBLE con código existente)
   * @param {string} filename - Nombre del archivo
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Promise<Object|null>}
   */
  async function getImageByFilename(filename, token = null) {
    console.log(`🔍 Buscando imagen: ${filename}`)
    isLoading.value = true
    error.value = null

    try {
      const authToken = token || getAuthToken()

      if (!authToken) {
        throw new Error('No hay token de autenticación')
      }

      const response = await fetch(
        `${backendURL}/images/by-filename/${encodeURIComponent(filename)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`✅ No se encontró una imagen con el nombre: ${filename}`)
          return null
        }
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Imagen encontrada:', result)

      currentImage.value = result

      return result

    } catch (err) {
      error.value = err.message
      console.error('❌ Error al obtener la imagen por nombre:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Obtiene una imagen por ID
   * @param {number} imageId - ID de la imagen
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Promise<Object|null>}
   */
  async function getImageById(imageId, token = null) {
    console.log(`🔍 Buscando imagen por ID: ${imageId}`)
    isLoading.value = true
    error.value = null

    try {
      if (!imageId || isNaN(imageId)) {
        throw new Error('ID de imagen inválido')
      }

      const authToken = token || getAuthToken()

      if (!authToken) {
        throw new Error('No hay token de autenticación')
      }

      const response = await fetch(`${backendURL}/images/${imageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`⚠️ Imagen con ID ${imageId} no encontrada`)
          return null
        }
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Imagen encontrada:', result)

      currentImage.value = result

      return result

    } catch (err) {
      error.value = err.message
      console.error('❌ Error al obtener imagen por ID:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 📥 DESCARGAR IMAGEN (compatible con Dashboard)
  // ========================================

  /**
   * Descarga una imagen por ID y retorna un File (COMPATIBLE con código existente)
   * @param {number} imageId - ID de la imagen
   * @param {string} token - Token de autenticación (opcional)
   * @param {string} name - Nombre por defecto para el archivo
   * @returns {Promise<File>}
   */
  async function downloadImageById(imageId, token = null, name = 'imagen_medica') {
    console.log(`📥 Descargando imagen: ${imageId}`)
    isLoading.value = true
    error.value = null

    try {
      const authToken = token || getAuthToken()

      if (!authToken) {
        throw new Error('No hay token de autenticación')
      }

      const response = await fetch(`${backendURL}/images/download/${imageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Error al descargar la imagen: ${response.status}`)
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = `${name}`

      // Extraer filename real del header si existe
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/)
        if (match && match[1]) filename = match[1]
      }

      // Crear un File a partir del Blob
      const file = new File([blob], filename, { type: blob.type })

      console.log('✅ Imagen descargada:', filename)

      return file

    } catch (err) {
      error.value = err.message
      console.error("❌ Error descargando imagen:", err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Descarga una imagen y la guarda en el navegador
   * @param {number} imageId - ID de la imagen
   * @param {string} token - Token de autenticación (opcional)
   * @param {string} filename - Nombre del archivo
   * @returns {Promise<void>}
   */
  async function downloadAndSaveImage(imageId, token = null, filename = 'imagen_medica.nii.gz') {
    console.log(`💾 Descargando y guardando imagen: ${imageId}`)

    try {
      const file = await downloadImageById(imageId, token, filename)

      // Crear enlace de descarga
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('✅ Imagen guardada en navegador')

    } catch (err) {
      console.error('❌ Error guardando imagen:', err)
      throw err
    }
  }

  // ========================================
  // 📋 LISTAR IMÁGENES
  // ========================================

  /**
   * Obtiene todas las imágenes
   * @param {Object} params - Parámetros { skip, limit }
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Promise<Array>}
   */
  async function getAllImages(params = {}, token = null) {
    console.log('📋 Obteniendo todas las imágenes...')
    isLoading.value = true
    error.value = null

    try {
      const authToken = token || getAuthToken()

      if (!authToken) {
        throw new Error('No hay token de autenticación')
      }

      const queryParams = new URLSearchParams()
      if (params.skip) queryParams.append('skip', params.skip)
      if (params.limit) queryParams.append('limit', params.limit)

      const url = `${backendURL}/images/?${queryParams.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      images.value = data

      console.log(`✅ ${data.length} imágenes obtenidas`)
      return data

    } catch (err) {
      error.value = err.message
      console.error('❌ Error obteniendo imágenes:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Obtiene imágenes por paciente
   * @param {number} patientId - ID del paciente
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Promise<Array>}
   */
  async function getImagesByPatient(patientId, token = null) {
    console.log(`📋 Obteniendo imágenes del paciente: ${patientId}`)
    isLoading.value = true
    error.value = null

    try {
      const authToken = token || getAuthToken()

      if (!authToken) {
        throw new Error('No hay token de autenticación')
      }

      const response = await fetch(
        `${backendURL}/images/by-patient/${patientId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      images.value = data

      console.log(`✅ ${data.length} imagen(es) del paciente obtenidas`)
      return data

    } catch (err) {
      error.value = err.message
      console.error('❌ Error obteniendo imágenes del paciente:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // ✏️ ACTUALIZAR IMAGEN
  // ========================================

  /**
   * Actualiza metadatos de una imagen
   * @param {number} imageId - ID de la imagen
   * @param {Object} updates - Datos a actualizar
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Promise<Object>}
   */
  async function updateImage(imageId, updates, token = null) {
    console.log(`✏️ Actualizando imagen ${imageId}...`)
    isLoading.value = true
    error.value = null

    try {
      const authToken = token || getAuthToken()

      if (!authToken) {
        throw new Error('No hay token de autenticación')
      }

      const response = await fetch(`${backendURL}/images/${imageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Imagen actualizada:', result)

      // Actualizar en lista local
      const index = images.value.findIndex(img => img.id === imageId)
      if (index !== -1) {
        images.value[index] = result
      }

      if (currentImage.value?.id === imageId) {
        currentImage.value = result
      }

      return result

    } catch (err) {
      error.value = err.message
      console.error('❌ Error actualizando imagen:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 🗑️ ELIMINAR IMAGEN
  // ========================================

  /**
   * Elimina una imagen
   * @param {number} imageId - ID de la imagen
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Promise<boolean>}
   */
  async function deleteImage(imageId, token = null) {
    console.log(`🗑️ Eliminando imagen ${imageId}...`)
    isLoading.value = true
    error.value = null

    try {
      const authToken = token || getAuthToken()

      if (!authToken) {
        throw new Error('No hay token de autenticación')
      }

      const response = await fetch(`${backendURL}/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      console.log('✅ Imagen eliminada')

      // Remover de lista local
      const index = images.value.findIndex(img => img.id === imageId)
      if (index !== -1) {
        images.value.splice(index, 1)
      }

      if (currentImage.value?.id === imageId) {
        currentImage.value = null
      }

      return true

    } catch (err) {
      error.value = err.message
      console.error('❌ Error eliminando imagen:', err)
      throw err

    } finally {
      isLoading.value = false
    }
  }

  // ========================================
  // 🔧 FUNCIONES AUXILIARES
  // ========================================

  /**
   * Limpia el estado
   */
  function clearState() {
    console.log('🧹 Limpiando estado de imágenes...')
    images.value = []
    currentImage.value = null
    error.value = null
    uploadProgress.value = 0
  }

  /**
   * Limpia solo el error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Resetea el progreso de subida
   */
  function resetUploadProgress() {
    uploadProgress.value = 0
  }

  /**
   * Verifica salud del servidor de imágenes
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Promise<boolean>}
   */
  async function checkServerHealth(token = null) {
    console.log('🏥 Verificando salud del servidor...')

    try {
      const authToken = token || getAuthToken()

      const response = await fetch(`${backendURL}/health-check/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        console.warn('⚠️ Servidor no disponible')
        return false
      }

      console.log('✅ Servidor disponible')
      return true

    } catch (err) {
      console.error('❌ Error verificando servidor:', err)
      return false
    }
  }

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado
    isLoading,
    error,
    uploadProgress,
    images,
    currentImage,

    // Computed
    hasImages,
    hasCurrentImage,
    hasError,
    isUploading,

    // CRUD - Funciones compatibles con Dashboard
    uploadImageFile,              // ✅ Mismo nombre y comportamiento
    uploadImageWithProgress,      // ✅ Con seguimiento de progreso
    getImageByFilename,           // ✅ Mismo nombre y comportamiento
    downloadImageById,            // ✅ Mismo nombre y comportamiento
    downloadAndSaveImage,         // ✅ Descarga y guarda automáticamente
    getImageById,                 // ✅ Buscar por ID
    getAllImages,                 // ✅ Obtener todas
    getImagesByPatient,           // ✅ Filtrar por paciente
    updateImage,                  // ✅ Actualizar metadatos
    deleteImage,                  // ✅ Eliminar

    // Auxiliares
    clearState,
    clearError,
    resetUploadProgress,
    checkServerHealth
  }
}
