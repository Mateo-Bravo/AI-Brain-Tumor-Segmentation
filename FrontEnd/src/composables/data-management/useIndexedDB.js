/**
 * 💾 useIndexedDB.js
 *
 * Composable para gestión de IndexedDB
 *
 * Funcionalidades:
 * - Almacenamiento de datos médicos (imágenes, volúmenes, estudios)
 * - CRUD completo (Create, Read, Update, Delete)
 * - Búsqueda y filtrado de datos
 * - Gestión de múltiples object stores
 * - Versionado de base de datos
 * - Transacciones y control de errores
 * - Límites de almacenamiento
 * - Exportación/Importación de datos
 * - Índices para búsqueda eficiente
 * - Limpieza automática de datos antiguos
 *
 * @author Richard - Gestión de IndexedDB del Visor Médico
 */

import { computed, reactive, ref } from 'vue'

/**
 * Composable para gestión de IndexedDB
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para IndexedDB
 */
export function useIndexedDB(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    dbName: options.dbName || '3DViewerDB',
    version: options.version || 1,
    stores: options.stores || {
      patients: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'name', keyPath: 'name', unique: false },
          { name: 'date', keyPath: 'date', unique: false }
        ]
      },
      studies: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'patientId', keyPath: 'patientId', unique: false },
          { name: 'date', keyPath: 'date', unique: false }
        ]
      },
      images: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'studyId', keyPath: 'studyId', unique: false },
          { name: 'type', keyPath: 'type', unique: false }
        ]
      },
      volumes: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'studyId', keyPath: 'studyId', unique: false }
        ]
      }
    },
    maxStorageSize: options.maxStorageSize || 500 * 1024 * 1024, // 500MB
    enableLogging: options.enableLogging !== false
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Instancia de la base de datos
   */
  let db = null

  /**
   * Estado de conexión
   */
  const isConnected = ref(false)
  const isInitializing = ref(false)

  /**
   * Información de la base de datos
   */
  const dbInfo = reactive({
    name: config.dbName,
    version: config.version,
    stores: Object.keys(config.stores),
    size: 0,
    recordCount: {}
  })

  /**
   * Estado de operaciones
   */
  const operationState = reactive({
    isProcessing: false,
    operation: '',
    progress: 0
  })

  /**
   * Errores
   */
  const error = ref(null)

  /**
   * Estadísticas de uso
   */
  const stats = reactive({
    totalRecords: 0,
    totalSize: 0,
    storageUsed: 0,
    storageAvailable: 0,
    lastUpdated: null
  })

  // ============================================
  // 🎬 INICIALIZACIÓN
  // ============================================

  /**
   * Abre/crea la base de datos
   * @returns {Promise<IDBDatabase>} Base de datos
   */
  async function openDatabase() {
    if (db && isConnected.value) {
      log('✅ Base de datos ya conectada')
      return db
    }

    return new Promise((resolve, reject) => {
      try {
        isInitializing.value = true
        log(`🎬 Abriendo base de datos: ${config.dbName} v${config.version}`)

        const request = indexedDB.open(config.dbName, config.version)

        // Evento de actualización (crear stores)
        request.onupgradeneeded = (event) => {
          log('🔧 Actualizando esquema de base de datos...')

          const database = event.target.result
          const transaction = event.target.transaction

          // Crear object stores
          Object.entries(config.stores).forEach(([storeName, storeConfig]) => {
            if (!database.objectStoreNames.contains(storeName)) {
              log(`📦 Creando store: ${storeName}`)

              const objectStore = database.createObjectStore(storeName, {
                keyPath: storeConfig.keyPath,
                autoIncrement: storeConfig.autoIncrement || false
              })

              // Crear índices
              if (storeConfig.indexes) {
                storeConfig.indexes.forEach(index => {
                  log(`  📑 Creando índice: ${index.name}`)
                  objectStore.createIndex(
                    index.name,
                    index.keyPath,
                    { unique: index.unique || false }
                  )
                })
              }
            }
          })
        }

        // Éxito
        request.onsuccess = (event) => {
          db = event.target.result
          isConnected.value = true
          isInitializing.value = false

          log('✅ Base de datos abierta correctamente')

          // Actualizar estadísticas
          updateStats()

          resolve(db)
        }

        // Error
        request.onerror = (event) => {
          const err = new Error(`Error abriendo base de datos: ${event.target.error}`)
          error.value = err.message
          isInitializing.value = false

          log(`❌ ${err.message}`)
          reject(err)
        }

        // Bloqueado (otra pestaña tiene la DB abierta)
        request.onblocked = () => {
          log('⚠️ Base de datos bloqueada por otra pestaña')
        }

      } catch (err) {
        error.value = err.message
        isInitializing.value = false
        log(`❌ Error: ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Cierra la conexión a la base de datos
   */
  function closeDatabase() {
    if (db) {
      db.close()
      db = null
      isConnected.value = false
      log('🔒 Base de datos cerrada')
    }
  }

  /**
   * Elimina completamente la base de datos
   * @returns {Promise<boolean>}
   */
  async function deleteDatabase() {
    return new Promise((resolve, reject) => {
      closeDatabase()

      log(`🗑️ Eliminando base de datos: ${config.dbName}`)

      const request = indexedDB.deleteDatabase(config.dbName)

      request.onsuccess = () => {
        log('✅ Base de datos eliminada')
        resetStats()
        resolve(true)
      }

      request.onerror = (event) => {
        const err = new Error(`Error eliminando base de datos: ${event.target.error}`)
        log(`❌ ${err.message}`)
        reject(err)
      }

      request.onblocked = () => {
        log('⚠️ Eliminación bloqueada, cierra todas las pestañas que usan la DB')
        reject(new Error('Base de datos bloqueada'))
      }
    })
  }

  // ============================================
  // 💾 OPERACIONES CRUD
  // ============================================

  /**
   * Añade un registro
   * @param {string} storeName - Nombre del store
   * @param {Object} data - Datos a guardar
   * @returns {Promise<any>} Clave del registro
   */
  async function add(storeName, data) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        operationState.isProcessing = true
        operationState.operation = 'add'

        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.add(data)

        request.onsuccess = () => {
          log(`✅ Registro añadido a ${storeName}:`, request.result)
          updateStats()
          resolve(request.result)
        }

        request.onerror = () => {
          const err = new Error(`Error añadiendo registro: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

        transaction.oncomplete = () => {
          operationState.isProcessing = false
        }

      } catch (err) {
        operationState.isProcessing = false
        log(`❌ Error en add: ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Obtiene un registro por clave
   * @param {string} storeName - Nombre del store
   * @param {any} key - Clave del registro
   * @returns {Promise<Object>} Registro
   */
  async function get(storeName, key) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          if (request.result) {
            log(`✅ Registro obtenido de ${storeName}:`, key)
            resolve(request.result)
          } else {
            log(`⚠️ Registro no encontrado en ${storeName}:`, key)
            resolve(null)
          }
        }

        request.onerror = () => {
          const err = new Error(`Error obteniendo registro: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

      } catch (err) {
        log(`❌ Error en get: ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Obtiene todos los registros de un store
   * @param {string} storeName - Nombre del store
   * @returns {Promise<Array>} Array de registros
   */
  async function getAll(storeName) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.getAll()

        request.onsuccess = () => {
          log(`✅ Obtenidos ${request.result.length} registros de ${storeName}`)
          resolve(request.result)
        }

        request.onerror = () => {
          const err = new Error(`Error obteniendo registros: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

      } catch (err) {
        log(`❌ Error en getAll: ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Actualiza un registro
   * @param {string} storeName - Nombre del store
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<any>} Clave del registro
   */
  async function update(storeName, data) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        operationState.isProcessing = true
        operationState.operation = 'update'

        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.put(data)

        request.onsuccess = () => {
          log(`✅ Registro actualizado en ${storeName}:`, request.result)
          updateStats()
          resolve(request.result)
        }

        request.onerror = () => {
          const err = new Error(`Error actualizando registro: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

        transaction.oncomplete = () => {
          operationState.isProcessing = false
        }

      } catch (err) {
        operationState.isProcessing = false
        log(`❌ Error en update: ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Elimina un registro
   * @param {string} storeName - Nombre del store
   * @param {any} key - Clave del registro
   * @returns {Promise<boolean>} true si se eliminó
   */
  async function remove(storeName, key) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        operationState.isProcessing = true
        operationState.operation = 'delete'

        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(key)

        request.onsuccess = () => {
          log(`✅ Registro eliminado de ${storeName}:`, key)
          updateStats()
          resolve(true)
        }

        request.onerror = () => {
          const err = new Error(`Error eliminando registro: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

        transaction.oncomplete = () => {
          operationState.isProcessing = false
        }

      } catch (err) {
        operationState.isProcessing = false
        log(`❌ Error en remove: ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Limpia todos los registros de un store
   * @param {string} storeName - Nombre del store
   * @returns {Promise<boolean>}
   */
  async function clear(storeName) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        log(`🧹 Limpiando store: ${storeName}`)

        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.clear()

        request.onsuccess = () => {
          log(`✅ Store limpiado: ${storeName}`)
          updateStats()
          resolve(true)
        }

        request.onerror = () => {
          const err = new Error(`Error limpiando store: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

      } catch (err) {
        log(`❌ Error en clear: ${err.message}`)
        reject(err)
      }
    })
  }

  // ============================================
  // 🔍 BÚSQUEDA Y FILTRADO
  // ============================================

  /**
   * Busca por índice
   * @param {string} storeName - Nombre del store
   * @param {string} indexName - Nombre del índice
   * @param {any} value - Valor a buscar
   * @returns {Promise<Array>} Registros encontrados
   */
  async function findByIndex(storeName, indexName, value) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const index = store.index(indexName)
        const request = index.getAll(value)

        request.onsuccess = () => {
          log(`🔍 Búsqueda en ${storeName}.${indexName} = ${value}: ${request.result.length} resultados`)
          resolve(request.result)
        }

        request.onerror = () => {
          const err = new Error(`Error buscando por índice: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

      } catch (err) {
        log(`❌ Error en findByIndex: ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Busca con filtro personalizado
   * @param {string} storeName - Nombre del store
   * @param {Function} filterFn - Función de filtro
   * @returns {Promise<Array>} Registros filtrados
   */
  async function filter(storeName, filterFn) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        const results = []
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.openCursor()

        request.onsuccess = (event) => {
          const cursor = event.target.result

          if (cursor) {
            if (filterFn(cursor.value)) {
              results.push(cursor.value)
            }
            cursor.continue()
          } else {
            log(`🔍 Filtro aplicado a ${storeName}: ${results.length} resultados`)
            resolve(results)
          }
        }

        request.onerror = () => {
          const err = new Error(`Error filtrando: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

      } catch (err) {
        log(`❌ Error en filter: ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Cuenta registros en un store
   * @param {string} storeName - Nombre del store
   * @returns {Promise<number>} Número de registros
   */
  async function count(storeName) {
    await ensureConnection()

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.count()

        request.onsuccess = () => {
          resolve(request.result)
        }

        request.onerror = () => {
          const err = new Error(`Error contando registros: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

      } catch (err) {
        log(`❌ Error en count: ${err.message}`)
        reject(err)
      }
    })
  }

  // ============================================
  // 📊 ESTADÍSTICAS Y MANTENIMIENTO
  // ============================================

  /**
   * Actualiza estadísticas de la base de datos
   */
  async function updateStats() {
    if (!isConnected.value) return

    try {
      let totalRecords = 0
      const recordCount = {}

      // Contar registros por store
      for (const storeName of dbInfo.stores) {
        const storeCount = await count(storeName)
        recordCount[storeName] = storeCount
        totalRecords += storeCount
      }

      stats.totalRecords = totalRecords
      dbInfo.recordCount = recordCount
      stats.lastUpdated = Date.now()

      // Estimar uso de almacenamiento si está disponible
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        stats.storageUsed = estimate.usage || 0
        stats.storageAvailable = estimate.quota || 0

        log(`💾 Almacenamiento: ${formatBytes(stats.storageUsed)} / ${formatBytes(stats.storageAvailable)}`)
      }

    } catch (err) {
      log(`⚠️ Error actualizando estadísticas: ${err.message}`)
    }
  }

  /**
   * Resetea estadísticas
   */
  function resetStats() {
    stats.totalRecords = 0
    stats.totalSize = 0
    stats.storageUsed = 0
    stats.storageAvailable = 0
    stats.lastUpdated = null
    dbInfo.recordCount = {}
  }

  /**
   * Limpia registros antiguos
   * @param {string} storeName - Nombre del store
   * @param {number} daysOld - Días de antigüedad
   * @param {string} dateField - Campo de fecha
   * @returns {Promise<number>} Registros eliminados
   */
  async function cleanOldRecords(storeName, daysOld = 30, dateField = 'date') {
    await ensureConnection()

    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
    let deletedCount = 0

    return new Promise((resolve, reject) => {
      try {
        log(`🧹 Limpiando registros antiguos de ${storeName} (> ${daysOld} días)`)

        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.openCursor()

        request.onsuccess = (event) => {
          const cursor = event.target.result

          if (cursor) {
            const record = cursor.value

            if (record[dateField] && record[dateField] < cutoffDate) {
              cursor.delete()
              deletedCount++
            }

            cursor.continue()
          } else {
            log(`✅ ${deletedCount} registros antiguos eliminados de ${storeName}`)
            updateStats()
            resolve(deletedCount)
          }
        }

        request.onerror = () => {
          const err = new Error(`Error limpiando registros antiguos: ${request.error}`)
          log(`❌ ${err.message}`)
          reject(err)
        }

      } catch (err) {
        log(`❌ Error en cleanOldRecords: ${err.message}`)
        reject(err)
      }
    })
  }

  // ============================================
  // 📤 EXPORTACIÓN/IMPORTACIÓN
  // ============================================

  /**
   * Exporta todos los datos de la base de datos
   * @returns {Promise<Object>} Datos exportados
   */
  async function exportData() {
    await ensureConnection()

    const exportedData = {
      dbName: config.dbName,
      version: config.version,
      exportDate: Date.now(),
      stores: {}
    }

    try {
      log('📤 Exportando datos...')

      for (const storeName of dbInfo.stores) {
        const records = await getAll(storeName)
        exportedData.stores[storeName] = records
      }

      log(`✅ ${stats.totalRecords} registros exportados`)

      return exportedData

    } catch (err) {
      log(`❌ Error exportando datos: ${err.message}`)
      throw err
    }
  }

  /**
   * Importa datos a la base de datos
   * @param {Object} data - Datos a importar
   * @returns {Promise<Object>} Resultado de la importación
   */
  async function importData(data) {
    await ensureConnection()

    const results = {
      success: 0,
      errors: 0,
      details: {}
    }

    try {
      log('📥 Importando datos...')

      for (const [storeName, records] of Object.entries(data.stores)) {
        if (!dbInfo.stores.includes(storeName)) {
          log(`⚠️ Store ${storeName} no existe, omitiendo...`)
          continue
        }

        results.details[storeName] = { success: 0, errors: 0 }

        for (const record of records) {
          try {
            await add(storeName, record)
            results.success++
            results.details[storeName].success++
          } catch (err) {
            results.errors++
            results.details[storeName].errors++
            log(`⚠️ Error importando registro en ${storeName}:`, err.message)
          }
        }
      }

      log(`✅ Importación completada: ${results.success} éxitos, ${results.errors} errores`)

      await updateStats()

      return results

    } catch (err) {
      log(`❌ Error importando datos: ${err.message}`)
      throw err
    }
  }

  /**
   * Exporta datos como JSON descargable
   * @param {string} filename - Nombre del archivo
   */
  async function downloadBackup(filename = 'backup') {
    try {
      const data = await exportData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}_${Date.now()}.json`
      link.click()

      URL.revokeObjectURL(url)

      log('💾 Backup descargado')

    } catch (err) {
      log(`❌ Error descargando backup: ${err.message}`)
      throw err
    }
  }

  // ============================================
  // 🔧 UTILIDADES
  // ============================================

  /**
   * Asegura que la conexión esté activa
   */
  async function ensureConnection() {
    if (!isConnected.value) {
      await openDatabase()
    }
  }

  /**
   * Verifica si un store existe
   * @param {string} storeName - Nombre del store
   * @returns {boolean}
   */
  function storeExists(storeName) {
    return db && db.objectStoreNames.contains(storeName)
  }

  /**
   * Obtiene información de un store
   * @param {string} storeName - Nombre del store
   * @returns {Object|null} Información del store
   */
  function getStoreInfo(storeName) {
    if (!config.stores[storeName]) return null

    return {
      name: storeName,
      config: config.stores[storeName],
      recordCount: dbInfo.recordCount[storeName] || 0
    }
  }

  /**
   * Formatea bytes a string legible
   * @param {number} bytes - Bytes
   * @returns {string} Tamaño formateado
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Logger condicional
   * @param {...any} args - Argumentos a logear
   */
  function log(...args) {
    if (config.enableLogging) {
      console.log('[IndexedDB]', ...args)
    }
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general de la base de datos
   */
  const dbState = computed(() => ({
    isConnected: isConnected.value,
    isInitializing: isInitializing.value,
    isProcessing: operationState.isProcessing,
    hasError: error.value !== null,
    error: error.value
  }))

  /**
   * Porcentaje de almacenamiento usado
   */
  const storagePercentage = computed(() => {
    if (stats.storageAvailable === 0) return 0
    return (stats.storageUsed / stats.storageAvailable) * 100
  })

  /**
   * Información de almacenamiento
   */
  const storageInfo = computed(() => ({
    used: formatBytes(stats.storageUsed),
    available: formatBytes(stats.storageAvailable),
    percentage: storagePercentage.value.toFixed(2) + '%',
    remaining: formatBytes(stats.storageAvailable - stats.storageUsed)
  }))

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    isConnected,
    isInitializing,
    dbInfo,
    operationState,
    error,
    stats,

    // Inicialización
    openDatabase,
    closeDatabase,
    deleteDatabase,

    // CRUD
    add,
    get,
    getAll,
    update,
    remove,
    clear,

    // Búsqueda
    findByIndex,
    filter,
    count,

    // Estadísticas
    updateStats,
    resetStats,
    cleanOldRecords,

    // Exportación/Importación
    exportData,
    importData,
    downloadBackup,

    // Utilidades
    ensureConnection,
    storeExists,
    getStoreInfo,
    formatBytes,

    // Computed properties
    dbState,
    storagePercentage,
    storageInfo
  }
}
