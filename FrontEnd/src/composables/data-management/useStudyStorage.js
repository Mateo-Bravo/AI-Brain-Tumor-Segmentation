/**
 * @fileoverview Composable para gestionar almacenamiento de estudios médicos con IndexedDB
 * @module useStudyStorage
 * @description Maneja almacenamiento persistente de imágenes médicas y estudios usando IndexedDB
 */

import localforage from 'localforage'
import { computed, ref } from 'vue'

/**
 * Composable para gestionar almacenamiento de estudios médicos
 * @returns {Object} Estado y métodos de almacenamiento
 */
export function useStudyStorage() {
  // ========================================
  // 📊 ESTADO DE ALMACENAMIENTO
  // ========================================

  /**
   * Indica si hay una operación en progreso
   * @type {import('vue').Ref<boolean>}
   */
  const isStorageOperating = ref(false)

  /**
   * Progreso de operación (0-100)
   * @type {import('vue').Ref<number>}
   */
  const storageProgress = ref(0)

  /**
   * Mensaje de error si ocurre alguno
   * @type {import('vue').Ref<string|null>}
   */
  const storageError = ref(null)

  /**
   * Estadísticas de almacenamiento
   */
  const storageStats = ref({
    totalStudies: 0,
    totalSize: 0,
    availableSpace: 0
  })

  // ========================================
  // ⚙️ CONFIGURACIÓN DE INDEXEDDB
  // ========================================

  /**
   * Nombre de la base de datos
   */
  const DB_NAME = '3DViewerDB'

  /**
   * Versión de la base de datos
   */
  const DB_VERSION = 1

  /**
   * Nombre del object store principal
   */
  const STORE_NAME = 'patientImages'

  /**
   * Instancia de la base de datos
   */
  let db = null

  // ========================================
  // 🗄️ CONFIGURACIÓN DE LOCALFORAGE
  // ========================================

  /**
   * Instancia de localforage para imágenes médicas
   */
  const imageStorage = localforage.createInstance({
    name: 'MedicalImages',
    storeName: 'images',
    description: 'Almacenamiento de imágenes médicas'
  })

  /**
   * Instancia de localforage para datos de pacientes
   */
  const patientStorage = localforage.createInstance({
    name: 'PatientData',
    storeName: 'patients',
    description: 'Almacenamiento de datos de pacientes'
  })

  /**
   * Instancia de localforage para estudios completos
   */
  const studyStorage = localforage.createInstance({
    name: 'StudyData',
    storeName: 'studies',
    description: 'Almacenamiento de estudios médicos completos'
  })

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  /**
   * Verifica si hay espacio suficiente (más de 100MB)
   */
  const hasEnoughSpace = computed(() => {
    return storageStats.value.availableSpace > 100 * 1024 * 1024
  })

  /**
   * Porcentaje de espacio usado
   */
  const storageUsagePercent = computed(() => {
    const total = storageStats.value.totalSize + storageStats.value.availableSpace
    if (total === 0) return 0
    return Math.round((storageStats.value.totalSize / total) * 100)
  })

  // ========================================
  // 🔌 INICIALIZACIÓN DE INDEXEDDB
  // ========================================

  /**
   * Abre la conexión con IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  async function openDB() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Abriendo conexión con IndexedDB...')

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = (event) => {
        const error = `Error al abrir IndexedDB: ${event.target.error}`
        console.error('❌', error)
        storageError.value = error
        reject(error)
      }

      request.onupgradeneeded = (event) => {
        console.log('🔧 Actualizando estructura de IndexedDB...')
        const database = event.target.result

        // Crear object store si no existe
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' })

          // Crear índices
          objectStore.createIndex('studyId', 'studyId', { unique: false })
          objectStore.createIndex('patientId', 'patientId', { unique: false })
          objectStore.createIndex('timestamp', 'timestamp', { unique: false })

          console.log('✅ Object store creado con índices')
        }
      }

      request.onsuccess = (event) => {
        db = event.target.result
        console.log('✅ Conexión con IndexedDB establecida')
        resolve(db)
      }
    })
  }

  /**
   * Cierra la conexión con IndexedDB
   */
  function closeDB() {
    if (db) {
      db.close()
      db = null
      console.log('🔒 Conexión con IndexedDB cerrada')
    }
  }

  /**
   * Inicializa todos los sistemas de almacenamiento
   * @returns {Promise<void>}
   */
  async function initializeStorage() {
    console.log('🚀 Inicializando sistemas de almacenamiento...')

    try {
      // Abrir IndexedDB
      await openDB()

      // Actualizar estadísticas
      await updateStorageStats()

      console.log('✅ Almacenamiento inicializado exitosamente')

    } catch (err) {
      console.error('❌ Error inicializando almacenamiento:', err)
      storageError.value = err.message
      throw err
    }
  }

  // ========================================
  // 💾 FUNCIONES DE GUARDADO - INDEXEDDB
  // ========================================

  /**
   * Guarda una imagen en IndexedDB
   * @param {string} id - ID único de la imagen
   * @param {Blob} imageBlob - Blob de la imagen
   * @param {Object} metadata - Metadatos adicionales
   * @returns {Promise<void>}
   */
  async function saveImage(id, imageBlob, metadata = {}) {
    if (!db) await openDB()

    console.log(`💾 Guardando imagen con ID: ${id}`)
    isStorageOperating.value = true
    storageError.value = null

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const data = {
        id: id,
        image: imageBlob,
        timestamp: new Date().toISOString(),
        size: imageBlob.size,
        type: imageBlob.type,
        ...metadata
      }

      const request = store.put(data)

      request.onsuccess = () => {
        console.log(`✅ Imagen ${id} guardada exitosamente`)
        isStorageOperating.value = false
        updateStorageStats()
        resolve()
      }

      request.onerror = (event) => {
        const error = `Error al guardar imagen: ${event.target.error}`
        console.error('❌', error)
        storageError.value = error
        isStorageOperating.value = false
        reject(error)
      }
    })
  }

  /**
   * Guarda múltiples imágenes relacionadas
   * @param {string} studyId - ID del estudio
   * @param {Object} images - Objeto con imágenes { original, processed, thumbnail }
   * @returns {Promise<void>}
   */
  async function saveStudyImages(studyId, images) {
    console.log(`💾 Guardando imágenes del estudio: ${studyId}`)

    try {
      const promises = []

      if (images.original) {
        promises.push(saveImage(`${studyId}-original`, images.original, {
          studyId,
          type: 'original'
        }))
      }

      if (images.processed) {
        promises.push(saveImage(`${studyId}-processed`, images.processed, {
          studyId,
          type: 'processed'
        }))
      }

      if (images.thumbnail) {
        promises.push(saveImage(`${studyId}-thumbnail`, images.thumbnail, {
          studyId,
          type: 'thumbnail'
        }))
      }

      await Promise.all(promises)
      console.log(`✅ Todas las imágenes del estudio ${studyId} guardadas`)

    } catch (err) {
      console.error('❌ Error guardando imágenes del estudio:', err)
      throw err
    }
  }

  // ========================================
  // 📥 FUNCIONES DE CARGA - INDEXEDDB
  // ========================================

  /**
   * Carga una imagen desde IndexedDB
   * @param {string} id - ID de la imagen
   * @returns {Promise<Blob|null>}
   */
  async function loadImage(id) {
    if (!db) await openDB()

    console.log(`📥 Cargando imagen con ID: ${id}`)
    isStorageOperating.value = true

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = (event) => {
        const result = event.target.result
        isStorageOperating.value = false

        if (result) {
          console.log(`✅ Imagen ${id} cargada exitosamente`)
          resolve(result.image)
        } else {
          console.log(`⚠️ Imagen ${id} no encontrada`)
          resolve(null)
        }
      }

      request.onerror = (event) => {
        const error = `Error al cargar imagen: ${event.target.error}`
        console.error('❌', error)
        storageError.value = error
        isStorageOperating.value = false
        reject(error)
      }
    })
  }

  /**
   * Carga todas las imágenes de un estudio
   * @param {string} studyId - ID del estudio
   * @returns {Promise<Object>}
   */
  async function loadStudyImages(studyId) {
    console.log(`📥 Cargando imágenes del estudio: ${studyId}`)

    try {
      const [original, processed, thumbnail] = await Promise.all([
        loadImage(`${studyId}-original`),
        loadImage(`${studyId}-processed`),
        loadImage(`${studyId}-thumbnail`)
      ])

      return {
        original,
        processed,
        thumbnail
      }

    } catch (err) {
      console.error('❌ Error cargando imágenes del estudio:', err)
      throw err
    }
  }

  /**
   * Obtiene metadatos de una imagen sin cargar el blob
   * @param {string} id - ID de la imagen
   * @returns {Promise<Object|null>}
   */
  async function getImageMetadata(id) {
    if (!db) await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = (event) => {
        const result = event.target.result

        if (result) {
          const { image, ...metadata } = result
          resolve(metadata)
        } else {
          resolve(null)
        }
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  // ========================================
  // 🗑️ FUNCIONES DE ELIMINACIÓN - INDEXEDDB
  // ========================================

  /**
   * Elimina una imagen de IndexedDB
   * @param {string} id - ID de la imagen
   * @returns {Promise<void>}
   */
  async function deleteImage(id) {
    if (!db) await openDB()

    console.log(`🗑️ Eliminando imagen con ID: ${id}`)
    isStorageOperating.value = true

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(`✅ Imagen ${id} eliminada exitosamente`)
        isStorageOperating.value = false
        updateStorageStats()
        resolve()
      }

      request.onerror = (event) => {
        const error = `Error al eliminar imagen: ${event.target.error}`
        console.error('❌', error)
        storageError.value = error
        isStorageOperating.value = false
        reject(error)
      }
    })
  }

  /**
   * Elimina todas las imágenes de un estudio
   * @param {string} studyId - ID del estudio
   * @returns {Promise<void>}
   */
  async function deleteStudyImages(studyId) {
    console.log(`🗑️ Eliminando imágenes del estudio: ${studyId}`)

    try {
      await Promise.all([
        deleteImage(`${studyId}-original`),
        deleteImage(`${studyId}-processed`),
        deleteImage(`${studyId}-thumbnail`)
      ])

      console.log(`✅ Todas las imágenes del estudio ${studyId} eliminadas`)

    } catch (err) {
      console.error('❌ Error eliminando imágenes del estudio:', err)
      throw err
    }
  }

  /**
   * Limpia toda la base de datos
   * @returns {Promise<void>}
   */
  async function clearAllStorage() {
    if (!db) await openDB()

    console.log('🗑️⚠️ Limpiando toda la base de datos...')
    isStorageOperating.value = true

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('✅ Base de datos limpiada exitosamente')
        isStorageOperating.value = false
        updateStorageStats()
        resolve()
      }

      request.onerror = (event) => {
        const error = `Error al limpiar base de datos: ${event.target.error}`
        console.error('❌', error)
        storageError.value = error
        isStorageOperating.value = false
        reject(error)
      }
    })
  }

  // ========================================
  // 💾 FUNCIONES DE GUARDADO - LOCALFORAGE
  // ========================================

  /**
   * Guarda imagen médica usando localforage
   * @param {string} studyId - ID del estudio
   * @param {Blob} blob - Blob de la imagen
   * @returns {Promise<void>}
   */
  async function saveMedicalImage(studyId, blob) {
    console.log(`💾 Guardando imagen médica: ${studyId}`)

    try {
      await imageStorage.setItem(studyId, blob)
      console.log(`✅ Imagen médica guardada: ${blob.size} bytes`)

    } catch (err) {
      console.error('❌ Error guardando imagen médica:', err)
      throw err
    }
  }

  /**
   * Guarda miniatura usando localforage
   * @param {string} studyId - ID del estudio
   * @param {Blob} blob - Blob de la miniatura
   * @returns {Promise<void>}
   */
  async function saveThumbnail(studyId, blob) {
    console.log(`💾 Guardando miniatura: ${studyId}`)

    try {
      await imageStorage.setItem(`${studyId}-thumbnail`, blob)
      console.log(`✅ Miniatura guardada: ${blob.size} bytes`)

    } catch (err) {
      console.error('❌ Error guardando miniatura:', err)
      throw err
    }
  }

  /**
   * Guarda estudio completo usando localforage
   * @param {string} studyId - ID del estudio
   * @param {Object} studyData - Datos del estudio
   * @returns {Promise<void>}
   */
  async function saveStudy(studyId, studyData) {
    console.log(`💾 Guardando estudio completo: ${studyId}`)

    try {
      await studyStorage.setItem(studyId, studyData)
      console.log('✅ Estudio guardado exitosamente')

    } catch (err) {
      console.error('❌ Error guardando estudio:', err)
      throw err
    }
  }

  // ========================================
  // 📥 FUNCIONES DE CARGA - LOCALFORAGE
  // ========================================

  /**
   * Carga imagen médica usando localforage
   * @param {string} studyId - ID del estudio
   * @returns {Promise<Blob|null>}
   */
  async function loadMedicalImage(studyId) {
    console.log(`📥 Cargando imagen médica: ${studyId}`)

    try {
      const blob = await imageStorage.getItem(studyId)

      if (blob) {
        console.log(`✅ Imagen médica cargada: ${blob.size} bytes`)
      } else {
        console.log('⚠️ Imagen médica no encontrada')
      }

      return blob

    } catch (err) {
      console.error('❌ Error cargando imagen médica:', err)
      return null
    }
  }

  /**
   * Carga miniatura usando localforage
   * @param {string} studyId - ID del estudio
   * @returns {Promise<Blob|null>}
   */
  async function loadThumbnail(studyId) {
    console.log(`📥 Cargando miniatura: ${studyId}`)

    try {
      const blob = await imageStorage.getItem(`${studyId}-thumbnail`)

      if (blob) {
        console.log('✅ Miniatura cargada')
      }

      return blob

    } catch (err) {
      console.error('❌ Error cargando miniatura:', err)
      return null
    }
  }

  /**
   * Carga estudio completo usando localforage
   * @param {string} studyId - ID del estudio
   * @returns {Promise<Object|null>}
   */
  async function loadStudy(studyId) {
    console.log(`📥 Cargando estudio: ${studyId}`)

    try {
      const study = await studyStorage.getItem(studyId)

      if (study) {
        console.log('✅ Estudio cargado exitosamente')
      } else {
        console.log('⚠️ Estudio no encontrado')
      }

      return study

    } catch (err) {
      console.error('❌ Error cargando estudio:', err)
      return null
    }
  }

  // ========================================
  // 🖼️ FUNCIONES DE PROCESAMIENTO DE IMÁGENES
  // ========================================

  /**
   * Crea una miniatura desde un canvas
   * @param {HTMLCanvasElement} canvas - Canvas con la imagen
   * @param {number} maxSize - Tamaño máximo de la miniatura
   * @returns {Promise<Blob>}
   */
  function createThumbnail(canvas, maxSize = 150) {
    return new Promise(resolve => {
      console.log(`🖼️ Creando miniatura de ${maxSize}px...`)

      const thumbCanvas = document.createElement('canvas')
      const ctx = thumbCanvas.getContext('2d')

      let width = canvas.width
      let height = canvas.height

      // Mantener proporciones
      if (width > height) {
        height = (height / width) * maxSize
        width = maxSize
      } else {
        width = (width / height) * maxSize
        height = maxSize
      }

      thumbCanvas.width = width
      thumbCanvas.height = height

      // Dibujar miniatura
      ctx.drawImage(canvas, 0, 0, width, height)

      // Convertir a JPEG para menor tamaño
      thumbCanvas.toBlob(blob => {
        console.log(`✅ Miniatura creada: ${blob.size} bytes`)
        resolve(blob)
      }, 'image/jpeg', 0.7)
    })
  }

  /**
   * Convierte canvas a Blob PNG
   * @param {HTMLCanvasElement} canvas - Canvas a convertir
   * @param {number} quality - Calidad (0.0 - 1.0)
   * @returns {Promise<Blob>}
   */
  function canvasToBlob(canvas, quality = 0.95) {
    return new Promise(resolve => {
      console.log('🖼️ Convirtiendo canvas a blob...')

      canvas.toBlob(blob => {
        console.log(`✅ Blob creado: ${blob.size} bytes`)
        resolve(blob)
      }, 'image/png', quality)
    })
  }

  // ========================================
  // 📊 FUNCIONES DE ESTADÍSTICAS
  // ========================================

  /**
   * Actualiza las estadísticas de almacenamiento
   * @returns {Promise<void>}
   */
  async function updateStorageStats() {
    try {
      // Obtener todas las claves
      const keys = await imageStorage.keys()

      let totalSize = 0

      // Calcular tamaño total
      for (const key of keys) {
        const blob = await imageStorage.getItem(key)
        if (blob && blob.size) {
          totalSize += blob.size
        }
      }

      // Estimar espacio disponible (quota API)
      let availableSpace = 0
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        availableSpace = estimate.quota - estimate.usage
      }

      storageStats.value = {
        totalStudies: keys.length,
        totalSize: totalSize,
        availableSpace: availableSpace
      }

      console.log('📊 Estadísticas actualizadas:', {
        estudios: keys.length,
        tamaño: formatBytes(totalSize),
        disponible: formatBytes(availableSpace)
      })

    } catch (err) {
      console.error('❌ Error actualizando estadísticas:', err)
    }
  }

  /**
   * Lista todos los estudios almacenados
   * @returns {Promise<Array>}
   */
  async function listAllStudies() {
    console.log('📋 Listando todos los estudios...')

    try {
      const keys = await imageStorage.keys()
      const studies = []

      for (const key of keys) {
        if (!key.includes('-thumbnail')) {
          const metadata = await getImageMetadata(key)
          if (metadata) {
            studies.push({
              id: key,
              ...metadata
            })
          }
        }
      }

      console.log(`✅ ${studies.length} estudios encontrados`)
      return studies

    } catch (err) {
      console.error('❌ Error listando estudios:', err)
      return []
    }
  }

  // ========================================
  // 🔧 FUNCIONES AUXILIARES
  // ========================================

  /**
   * Formatea bytes a string legible
   * @param {number} bytes - Bytes a formatear
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Verifica si hay suficiente espacio para guardar
   * @param {number} requiredSize - Tamaño requerido en bytes
   * @returns {boolean}
   */
  function checkAvailableSpace(requiredSize) {
    const available = storageStats.value.availableSpace
    const hasSpace = available > requiredSize

    if (!hasSpace) {
      console.warn(`⚠️ Espacio insuficiente: necesita ${formatBytes(requiredSize)}, disponible ${formatBytes(available)}`)
    }

    return hasSpace
  }

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado
    isStorageOperating,
    storageProgress,
    storageError,
    storageStats,

    // Computed
    hasEnoughSpace,
    storageUsagePercent,

    // Inicialización
    initializeStorage,
    openDB,
    closeDB,

    // IndexedDB - Guardado
    saveImage,
    saveStudyImages,

    // IndexedDB - Carga
    loadImage,
    loadStudyImages,
    getImageMetadata,

    // IndexedDB - Eliminación
    deleteImage,
    deleteStudyImages,
    clearAllStorage,

    // LocalForage - Guardado
    saveMedicalImage,
    saveThumbnail,
    saveStudy,

    // LocalForage - Carga
    loadMedicalImage,
    loadThumbnail,
    loadStudy,

    // Procesamiento
    createThumbnail,
    canvasToBlob,

    // Estadísticas
    updateStorageStats,
    listAllStudies,

    // Utilidades
    formatBytes,
    checkAvailableSpace,

    // Instancias de storage
    imageStorage,
    patientStorage,
    studyStorage
  }
}
