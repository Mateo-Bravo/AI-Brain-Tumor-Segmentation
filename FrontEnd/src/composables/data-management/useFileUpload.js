/**
 * @fileoverview Composable para gestionar la carga de archivos médicos
 * @module useFileUpload
 * @description Maneja drag & drop, selección de archivos, validación y procesamiento
 */

import { computed, ref } from 'vue'

/**
 * Composable para gestionar la carga de archivos médicos
 * @returns {Object} Estado y métodos de carga de archivos
 */
export function useFileUpload() {
  // ========================================
  // 📊 ESTADO DE CARGA
  // ========================================

  /**
   * Archivos seleccionados para cargar
   * @type {import('vue').Ref<Array>}
   */
  const selectedFiles = ref([])

  /**
   * Indica si hay un drag activo sobre el área de drop
   * @type {import('vue').Ref<boolean>}
   */
  const isDragging = ref(false)

  /**
   * Indica si hay una carga en progreso
   * @type {import('vue').Ref<boolean>}
   */
  const isUploading = ref(false)

  /**
   * Progreso de carga (0-100)
   * @type {import('vue').Ref<number>}
   */
  const uploadProgress = ref(0)

  /**
   * Mensaje de error si la carga falla
   * @type {import('vue').Ref<string|null>}
   */
  const uploadError = ref(null)

  /**
   * Referencia al input file del DOM
   * @type {import('vue').Ref<HTMLInputElement|null>}
   */
  const fileInput = ref(null)

  // ========================================
  // ⚙️ CONFIGURACIÓN DE VALIDACIÓN
  // ========================================

  /**
   * Extensiones de archivo permitidas
   */
  const ALLOWED_EXTENSIONS = [
    '.nii',
    '.nii.gz',
    '.dcm',
    '.zip',
    '.tar',
    '.tar.gz'
  ]

  /**
   * Tamaño máximo de archivo (500 MB)
   */
  const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB en bytes

  /**
   * MIME types permitidos
   */
  const ALLOWED_MIME_TYPES = [
    'application/gzip',
    'application/x-gzip',
    'application/zip',
    'application/x-tar',
    'application/octet-stream', // Para .nii
    'application/dicom'
  ]

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  /**
   * Verifica si hay archivos seleccionados
   * @returns {boolean}
   */
  const hasFiles = computed(() => selectedFiles.value.length > 0)

  /**
   * Obtiene el primer archivo seleccionado
   * @returns {File|null}
   */
  const firstFile = computed(() => selectedFiles.value[0] || null)

  /**
   * Verifica si se puede iniciar la carga
   * @returns {boolean}
   */
  const canUpload = computed(() => {
    return hasFiles.value && !isUploading.value && !uploadError.value
  })

  /**
   * Formatea el tamaño del archivo
   * @returns {string}
   */
  const formattedFileSize = computed(() => {
    if (!firstFile.value) return '0 MB'
    return formatFileSize(firstFile.value.size)
  })

  // ========================================
  // 📁 FUNCIONES DE VALIDACIÓN
  // ========================================

  /**
   * Valida la extensión del archivo
   * @param {string} fileName - Nombre del archivo
   * @returns {boolean}
   */
  function isValidExtension(fileName) {
    const lowerFileName = fileName.toLowerCase()
    return ALLOWED_EXTENSIONS.some(ext => lowerFileName.endsWith(ext))
  }

  /**
   * Valida el tamaño del archivo
   * @param {number} fileSize - Tamaño en bytes
   * @returns {boolean}
   */
  function isValidSize(fileSize) {
    return fileSize <= MAX_FILE_SIZE
  }

  /**
   * Valida el tipo MIME del archivo
   * @param {string} mimeType - Tipo MIME del archivo
   * @returns {boolean}
   */
  function isValidMimeType(mimeType) {
    return ALLOWED_MIME_TYPES.includes(mimeType)
  }

  /**
   * Valida completamente un archivo
   * @param {File} file - Archivo a validar
   * @returns {Object} Resultado de validación { valid, error }
   */
  function validateFile(file) {
    console.log('🔍 Validando archivo:', {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    })

    // Validar extensión
    if (!isValidExtension(file.name)) {
      return {
        valid: false,
        error: `Extensión no permitida. Use: ${ALLOWED_EXTENSIONS.join(', ')}`
      }
    }

    // Validar tamaño
    if (!isValidSize(file.size)) {
      return {
        valid: false,
        error: `Archivo demasiado grande. Máximo: ${formatFileSize(MAX_FILE_SIZE)}`
      }
    }

    // Validar MIME type (opcional, puede no estar presente)
    if (file.type && !isValidMimeType(file.type)) {
      console.warn('⚠️ MIME type no reconocido, pero permitiendo por extensión:', file.type)
    }

    return { valid: true, error: null }
  }

  // ========================================
  // 🖱️ FUNCIONES DE SELECCIÓN DE ARCHIVOS
  // ========================================

  /**
   * Abre el selector de archivos del sistema
   */
  function openFileSelector() {
    if (fileInput.value) {
      fileInput.value.click()
      console.log('📂 Selector de archivos abierto')
    }
  }

  /**
   * Maneja la selección de archivos desde input
   * @param {Event} event - Evento change del input
   */
  function handleFileSelect(event) {
    const files = event.target.files
    if (!files || files.length === 0) {
      console.log('⚠️ No se seleccionaron archivos')
      return
    }

    console.log(`📁 ${files.length} archivo(s) seleccionado(s)`)
    processFiles(Array.from(files))
  }

  /**
   * Limpia el valor del input file para permitir seleccionar el mismo archivo
   */
  function clearFileInput() {
    if (fileInput.value) {
      fileInput.value.value = ''
      console.log('🗑️ Input file limpiado')
    }
  }

  // ========================================
  // 🎯 FUNCIONES DE DRAG & DROP
  // ========================================

  /**
   * Maneja el evento dragenter
   * @param {DragEvent} event
   */
  function handleDragEnter(event) {
    event.preventDefault()
    isDragging.value = true
    console.log('🎯 Drag enter')
  }

  /**
   * Maneja el evento dragover
   * @param {DragEvent} event
   */
  function handleDragOver(event) {
    event.preventDefault()
    isDragging.value = true
  }

  /**
   * Maneja el evento dragleave
   * @param {DragEvent} event
   */
  function handleDragLeave(event) {
    event.preventDefault()
    // Solo cambiar si realmente salimos del área
    const rect = event.currentTarget.getBoundingClientRect()
    if (
      event.clientX < rect.left ||
      event.clientX >= rect.right ||
      event.clientY < rect.top ||
      event.clientY >= rect.bottom
    ) {
      isDragging.value = false
      console.log('🎯 Drag leave')
    }
  }

  /**
   * Maneja el evento drop de archivos
   * @param {DragEvent} event
   */
  function handleDrop(event) {
    event.preventDefault()
    isDragging.value = false

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) {
      console.log('⚠️ No se soltaron archivos')
      return
    }

    console.log(`🎯 Drop: ${files.length} archivo(s)`)
    processFiles(Array.from(files))
  }

  // ========================================
  // ⚙️ PROCESAMIENTO DE ARCHIVOS
  // ========================================

  /**
   * Procesa una lista de archivos
   * @param {Array<File>} files - Lista de archivos
   */
  function processFiles(files) {
    // Reset de errores previos
    uploadError.value = null

    // Solo permitir un archivo a la vez
    if (files.length > 1) {
      uploadError.value = 'Solo se puede cargar un archivo a la vez'
      console.warn('⚠️ Múltiples archivos no permitidos')
      return
    }

    const file = files[0]

    // Validar archivo
    const validation = validateFile(file)
    if (!validation.valid) {
      uploadError.value = validation.error
      console.error('❌ Validación fallida:', validation.error)
      return
    }

    // Agregar archivo a la lista
    addFile(file)

    console.log('✅ Archivo procesado exitosamente:', {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    })
  }

  /**
   * Agrega un archivo a la lista con metadata
   * @param {File} file - Archivo a agregar
   */
  function addFile(file) {
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      realFile: file, // Referencia al File real
      uploadedAt: new Date().toISOString()
    }

    selectedFiles.value = [fileInfo] // Solo un archivo
    console.log('➕ Archivo agregado:', fileInfo.name)
  }

  /**
   * Remueve el archivo de la lista
   */
  function removeFile() {
    selectedFiles.value = []
    uploadError.value = null
    clearFileInput()
    console.log('➖ Archivo removido')
  }

  /**
   * Limpia todos los archivos y reset del estado
   */
  function clearFiles() {
    selectedFiles.value = []
    uploadError.value = null
    uploadProgress.value = 0
    isUploading.value = false
    clearFileInput()
    console.log('🧹 Todos los archivos limpiados')
  }

  // ========================================
  // 📤 FUNCIONES DE CARGA
  // ========================================

  /**
   * Simula la carga de un archivo con progreso
   * @param {Function} onComplete - Callback al completar
   * @returns {Promise<void>}
   */
  async function simulateUpload(onComplete) {
    if (!hasFiles.value) {
      uploadError.value = 'No hay archivos para cargar'
      return
    }

    isUploading.value = true
    uploadProgress.value = 0
    uploadError.value = null

    console.log('⏳ Iniciando simulación de carga...')

    try {
      // Simular progreso de carga
      const interval = setInterval(() => {
        uploadProgress.value += 10

        if (uploadProgress.value >= 100) {
          clearInterval(interval)
          isUploading.value = false
          console.log('✅ Carga simulada completada')

          if (onComplete) {
            onComplete(firstFile.value)
          }
        }
      }, 200) // 2 segundos total

    } catch (error) {
      isUploading.value = false
      uploadError.value = error.message
      console.error('❌ Error en simulación de carga:', error)
    }
  }

  /**
   * Realiza la carga real del archivo
   * @param {string} url - URL del endpoint
   * @param {Object} options - Opciones de carga
   * @returns {Promise<Object>}
   */
  async function uploadFile(url, options = {}) {
    if (!hasFiles.value) {
      throw new Error('No hay archivos para cargar')
    }

    isUploading.value = true
    uploadProgress.value = 0
    uploadError.value = null

    const file = firstFile.value.realFile

    console.log('📤 Iniciando carga real:', {
      file: file.name,
      url: url,
      size: formatFileSize(file.size)
    })

    try {
      // Crear FormData
      const formData = new FormData()
      formData.append('file', file)

      // Agregar campos adicionales si existen
      if (options.additionalFields) {
        Object.entries(options.additionalFields).forEach(([key, value]) => {
          formData.append(key, value)
        })
      }

      // Realizar petición con seguimiento de progreso
      const response = await fetch(url, {
        method: 'POST',
        headers: options.headers || {},
        body: formData,
        // Opcional: seguimiento de progreso con XMLHttpRequest
        ...options
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()

      isUploading.value = false
      uploadProgress.value = 100

      console.log('✅ Carga completada exitosamente:', result)

      return result

    } catch (error) {
      isUploading.value = false
      uploadError.value = error.message
      console.error('❌ Error en carga:', error)
      throw error
    }
  }

  /**
   * Carga un archivo con seguimiento de progreso usando XMLHttpRequest
   * @param {string} url - URL del endpoint
   * @param {Object} options - Opciones de carga
   * @returns {Promise<Object>}
   */
  function uploadWithProgress(url, options = {}) {
    return new Promise((resolve, reject) => {
      if (!hasFiles.value) {
        reject(new Error('No hay archivos para cargar'))
        return
      }

      const file = firstFile.value.realFile
      const xhr = new XMLHttpRequest()

      // Seguimiento de progreso
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadProgress.value = Math.round((event.loaded / event.total) * 100)
          console.log(`📊 Progreso: ${uploadProgress.value}%`)
        }
      })

      // Éxito
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          isUploading.value = false
          const result = JSON.parse(xhr.responseText)
          console.log('✅ Carga completada:', result)
          resolve(result)
        } else {
          isUploading.value = false
          uploadError.value = `Error HTTP: ${xhr.status}`
          reject(new Error(uploadError.value))
        }
      })

      // Error
      xhr.addEventListener('error', () => {
        isUploading.value = false
        uploadError.value = 'Error de red'
        console.error('❌ Error de red')
        reject(new Error(uploadError.value))
      })

      // Abortar
      xhr.addEventListener('abort', () => {
        isUploading.value = false
        uploadError.value = 'Carga cancelada'
        console.log('⚠️ Carga cancelada')
        reject(new Error(uploadError.value))
      })

      // Preparar y enviar
      const formData = new FormData()
      formData.append('file', file)

      if (options.additionalFields) {
        Object.entries(options.additionalFields).forEach(([key, value]) => {
          formData.append(key, value)
        })
      }

      xhr.open('POST', url)

      // Headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value)
        })
      }

      isUploading.value = true
      uploadProgress.value = 0
      uploadError.value = null

      console.log('📤 Iniciando carga con progreso:', file.name)
      xhr.send(formData)
    })
  }

  // ========================================
  // 🔧 FUNCIONES AUXILIARES
  // ========================================

  /**
   * Formatea el tamaño de archivo a string legible
   * @param {number} bytes - Tamaño en bytes
   * @returns {string}
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Obtiene la extensión del archivo
   * @param {string} fileName - Nombre del archivo
   * @returns {string}
   */
  function getFileExtension(fileName) {
    // Manejar extensiones dobles como .nii.gz
    if (fileName.endsWith('.nii.gz')) return '.nii.gz'
    if (fileName.endsWith('.tar.gz')) return '.tar.gz'

    const parts = fileName.split('.')
    return parts.length > 1 ? '.' + parts.pop() : ''
  }

  /**
   * Determina el tipo de archivo médico
   * @param {string} fileName - Nombre del archivo
   * @returns {string}
   */
  function getMedicalFileType(fileName) {
    const extension = getFileExtension(fileName).toLowerCase()

    const typeMap = {
      '.nii': 'NIfTI',
      '.nii.gz': 'NIfTI Comprimido',
      '.dcm': 'DICOM',
      '.zip': 'Archivo ZIP',
      '.tar': 'Archivo TAR',
      '.tar.gz': 'Archivo TAR.GZ'
    }

    return typeMap[extension] || 'Desconocido'
  }

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado
    selectedFiles,
    isDragging,
    isUploading,
    uploadProgress,
    uploadError,
    fileInput,

    // Computed
    hasFiles,
    firstFile,
    canUpload,
    formattedFileSize,

    // Configuración
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,

    // Validación
    validateFile,
    isValidExtension,
    isValidSize,

    // Selección de archivos
    openFileSelector,
    handleFileSelect,
    clearFileInput,

    // Drag & Drop
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Gestión de archivos
    addFile,
    removeFile,
    clearFiles,

    // Carga
    simulateUpload,
    uploadFile,
    uploadWithProgress,

    // Utilidades
    formatFileSize,
    getFileExtension,
    getMedicalFileType
  }
}
