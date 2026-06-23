/**
 * 🧠 useNiftiProcessing.js
 *
 * Composable para procesamiento de archivos NIfTI (Neuroimaging Informatics Technology Initiative)
 *
 * Funcionalidades:
 * - Carga y parseo de archivos NIfTI (.nii, .nii.gz)
 * - Extracción de metadatos (header)
 * - Conversión de datos a diferentes formatos
 * - Manejo de orientaciones (RAS, LPS, etc.)
 * - Normalización de datos
 * - Validación de archivos
 * - Soporte para compresión gzip
 * - Cálculo de estadísticas
 * - Web Worker para procesamiento pesado
 *
 * @author Richard - Procesamiento NIfTI del Visor Médico
 */

import * as nifti from 'nifti-reader-js'
import pako from 'pako'
import { computed, reactive, ref } from 'vue'

/**
 * Composable para procesamiento de archivos NIfTI
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para procesamiento NIfTI
 */
export function useNiftiProcessing(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    autoNormalize: options.autoNormalize !== false,
    useWorker: options.useWorker || false,
    maxFileSize: options.maxFileSize || 500 * 1024 * 1024, // 500MB
    validateHeader: options.validateHeader !== false
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Estado de procesamiento
   */
  const isProcessing = ref(false)
  const processingProgress = ref(0)
  const processingMessage = ref('')

  /**
   * Datos del archivo NIfTI
   */
  const niftiData = reactive({
    header: null,
    image: null,
    raw: null,
    isLoaded: false
  })

  /**
   * Metadatos extraídos
   */
  const metadata = reactive({
    dimensions: { x: 0, y: 0, z: 0 },
    pixelDimensions: { x: 1, y: 1, z: 1 },
    dataType: '',
    orientation: '',
    min: 0,
    max: 0,
    description: '',
    qform: null,
    sform: null,
    affine: null
  })

  /**
   * Información del archivo
   */
  const fileInfo = reactive({
    name: '',
    size: 0,
    type: '',
    isCompressed: false,
    lastModified: 0
  })

  /**
   * Estadísticas de los datos
   */
  const statistics = reactive({
    min: 0,
    max: 0,
    mean: 0,
    std: 0,
    nonZeroCount: 0,
    histogram: []
  })

  /**
   * Estado de error
   */
  const error = ref(null)

  /**
   * Datos normalizados (cache)
   */
  const normalizedData = ref(null)

  // ============================================
  // 📁 CARGA DE ARCHIVOS
  // ============================================

  /**
   * Carga un archivo NIfTI desde File
   * @param {File} file - Archivo a cargar
   * @returns {Promise<Object>} Datos procesados
   */
  async function loadNiftiFile(file) {
    if (!file) {
      throw new Error('No se proporcionó archivo')
    }

    console.log('📁 Cargando archivo NIfTI:', file.name)

    try {
      isProcessing.value = true
      processingMessage.value = 'Leyendo archivo...'
      processingProgress.value = 0
      error.value = null

      // Validar tamaño
      if (file.size > config.maxFileSize) {
        throw new Error(`Archivo demasiado grande (máx: ${config.maxFileSize / 1024 / 1024}MB)`)
      }

      // Guardar información del archivo
      fileInfo.name = file.name
      fileInfo.size = file.size
      fileInfo.type = file.type
      fileInfo.isCompressed = file.name.endsWith('.gz')
      fileInfo.lastModified = file.lastModified

      processingProgress.value = 10

      // Leer archivo como ArrayBuffer
      processingMessage.value = 'Leyendo datos...'
      const arrayBuffer = await readFileAsArrayBuffer(file)

      processingProgress.value = 30

      // Descomprimir si es necesario
      let data = arrayBuffer
      if (fileInfo.isCompressed) {
        processingMessage.value = 'Descomprimiendo...'
        data = await decompressGzip(arrayBuffer)
        processingProgress.value = 50
      }

      // Parsear NIfTI
      processingMessage.value = 'Parseando NIfTI...'
      await parseNifti(data)

      processingProgress.value = 70

      // Extraer metadatos
      processingMessage.value = 'Extrayendo metadatos...'
      extractMetadata()

      processingProgress.value = 85

      // Calcular estadísticas
      processingMessage.value = 'Calculando estadísticas...'
      calculateStatistics()

      processingProgress.value = 100
      processingMessage.value = 'Completado'

      console.log('✅ Archivo NIfTI cargado correctamente')

      return {
        header: niftiData.header,
        image: niftiData.image,
        metadata: metadata,
        statistics: statistics
      }

    } catch (err) {
      console.error('❌ Error cargando archivo NIfTI:', err)
      error.value = err.message
      throw err

    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Carga un archivo NIfTI desde URL
   * @param {string} url - URL del archivo
   * @returns {Promise<Object>} Datos procesados
   */
  async function loadNiftiFromUrl(url) {
    console.log('🌐 Cargando NIfTI desde URL:', url)

    try {
      isProcessing.value = true
      processingMessage.value = 'Descargando archivo...'
      error.value = null

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()

      // Determinar si está comprimido por la URL
      const isCompressed = url.endsWith('.gz')

      fileInfo.name = url.split('/').pop()
      fileInfo.size = arrayBuffer.byteLength
      fileInfo.isCompressed = isCompressed

      processingProgress.value = 30

      // Descomprimir si es necesario
      let data = arrayBuffer
      if (isCompressed) {
        processingMessage.value = 'Descomprimiendo...'
        data = await decompressGzip(arrayBuffer)
      }

      // Parsear y procesar
      await parseNifti(data)
      extractMetadata()
      calculateStatistics()

      processingProgress.value = 100
      processingMessage.value = 'Completado'

      console.log('✅ NIfTI cargado desde URL')

      return {
        header: niftiData.header,
        image: niftiData.image,
        metadata: metadata,
        statistics: statistics
      }

    } catch (err) {
      console.error('❌ Error cargando NIfTI desde URL:', err)
      error.value = err.message
      throw err

    } finally {
      isProcessing.value = false
    }
  }

  // ============================================
  // 🔍 PARSEO DE NIFTI
  // ============================================

  /**
   * Parsea datos NIfTI
   * @param {ArrayBuffer} data - Datos a parsear
   */
  async function parseNifti(data) {
    try {
      // Verificar si es un archivo NIfTI válido
      if (!nifti.isNIFTI(data)) {
        throw new Error('El archivo no es un formato NIfTI válido')
      }

      // Leer header
      niftiData.header = nifti.readHeader(data)

      if (!niftiData.header) {
        throw new Error('No se pudo leer el header NIfTI')
      }

      // Validar header si está habilitado
      if (config.validateHeader) {
        validateNiftiHeader(niftiData.header)
      }

      // Leer imagen
      niftiData.image = nifti.readImage(niftiData.header, data)

      if (!niftiData.image) {
        throw new Error('No se pudo leer la imagen NIfTI')
      }

      // Guardar raw data
      niftiData.raw = data
      niftiData.isLoaded = true

      console.log('✅ NIfTI parseado correctamente:', {
        dimensions: [niftiData.header.dims[1], niftiData.header.dims[2], niftiData.header.dims[3]],
        dataType: getDataTypeName(niftiData.header.datatypeCode)
      })

    } catch (err) {
      console.error('❌ Error parseando NIfTI:', err)
      throw err
    }
  }

  /**
   * Valida el header de NIfTI
   * @param {Object} header - Header a validar
   */
  function validateNiftiHeader(header) {
    if (!header) {
      throw new Error('Header NIfTI es nulo')
    }

    // Validar dimensiones
    if (header.dims[1] <= 0 || header.dims[2] <= 0 || header.dims[3] <= 0) {
      throw new Error('Dimensiones inválidas en header NIfTI')
    }

    // Validar tipo de datos
    if (!isValidDataType(header.datatypeCode)) {
      throw new Error(`Tipo de datos no soportado: ${header.datatypeCode}`)
    }

    console.log('✅ Header NIfTI validado')
  }

  // ============================================
  // 📊 EXTRACCIÓN DE METADATOS
  // ============================================

  /**
   * Extrae metadatos del header NIfTI
   */
  function extractMetadata() {
    if (!niftiData.header) {
      console.warn('⚠️ No hay header para extraer metadatos')
      return
    }

    const header = niftiData.header

    // Dimensiones
    metadata.dimensions = {
      x: header.dims[1],
      y: header.dims[2],
      z: header.dims[3]
    }

    // Dimensiones de píxel (voxel size)
    metadata.pixelDimensions = {
      x: header.pixDims[1],
      y: header.pixDims[2],
      z: header.pixDims[3]
    }

    // Tipo de datos
    metadata.dataType = getDataTypeName(header.datatypeCode)

    // Rango de valores
    metadata.min = header.cal_min || 0
    metadata.max = header.cal_max || 0

    // Descripción
    metadata.description = header.description || ''

    // Orientación (qform y sform)
    metadata.qform = extractQForm(header)
    metadata.sform = extractSForm(header)

    // Matriz affine
    metadata.affine = calculateAffineMatrix(header)

    // Orientación
    metadata.orientation = determineOrientation(header)

    console.log('📊 Metadatos extraídos:', metadata)
  }

  /**
   * Extrae QForm del header
   * @param {Object} header - Header NIfTI
   * @returns {Object} QForm
   */
  function extractQForm(header) {
    return {
      code: header.qform_code,
      quaternion: {
        b: header.quatern_b,
        c: header.quatern_c,
        d: header.quatern_d
      },
      offset: {
        x: header.qoffset_x,
        y: header.qoffset_y,
        z: header.qoffset_z
      }
    }
  }

  /**
   * Extrae SForm del header
   * @param {Object} header - Header NIfTI
   * @returns {Object} SForm
   */
  function extractSForm(header) {
    return {
      code: header.sform_code,
      matrix: [
        [header.srow_x[0], header.srow_x[1], header.srow_x[2], header.srow_x[3]],
        [header.srow_y[0], header.srow_y[1], header.srow_y[2], header.srow_y[3]],
        [header.srow_z[0], header.srow_z[1], header.srow_z[2], header.srow_z[3]],
        [0, 0, 0, 1]
      ]
    }
  }

  /**
   * Calcula la matriz affine
   * @param {Object} header - Header NIfTI
   * @returns {Array} Matriz 4x4
   */
  function calculateAffineMatrix(header) {
    // Usar SForm si está disponible
    if (header.sform_code > 0) {
      return metadata.sform.matrix
    }

    // Usar QForm si está disponible
    if (header.qform_code > 0) {
      return quaternionToAffine(header)
    }

    // Matriz identidad con pixel dimensions
    return [
      [header.pixDims[1], 0, 0, 0],
      [0, header.pixDims[2], 0, 0],
      [0, 0, header.pixDims[3], 0],
      [0, 0, 0, 1]
    ]
  }

  /**
   * Convierte quaternion a matriz affine
   * @param {Object} header - Header NIfTI
   * @returns {Array} Matriz 4x4
   */
  function quaternionToAffine(header) {
    const b = header.quatern_b
    const c = header.quatern_c
    const d = header.quatern_d
    const a = Math.sqrt(1.0 - (b * b + c * c + d * d))

    const pixDim = header.pixDims

    return [
      [
        pixDim[1] * (a * a + b * b - c * c - d * d),
        pixDim[2] * 2 * (b * c - a * d),
        pixDim[3] * 2 * (b * d + a * c),
        header.qoffset_x
      ],
      [
        pixDim[1] * 2 * (b * c + a * d),
        pixDim[2] * (a * a + c * c - b * b - d * d),
        pixDim[3] * 2 * (c * d - a * b),
        header.qoffset_y
      ],
      [
        pixDim[1] * 2 * (b * d - a * c),
        pixDim[2] * 2 * (c * d + a * b),
        pixDim[3] * (a * a + d * d - c * c - b * b),
        header.qoffset_z
      ],
      [0, 0, 0, 1]
    ]
  }

  /**
   * Determina la orientación del volumen
   * @param {Object} header - Header NIfTI
   * @returns {string} Código de orientación (e.g., 'RAS', 'LPS')
   */
  function determineOrientation(header) {
    // Usar la matriz affine para determinar orientación
    const affine = metadata.affine

    if (!affine) return 'UNKNOWN'

    // Determinar orientación de cada eje
    const xOrientation = affine[0][0] > 0 ? 'R' : 'L'
    const yOrientation = affine[1][1] > 0 ? 'A' : 'P'
    const zOrientation = affine[2][2] > 0 ? 'S' : 'I'

    return xOrientation + yOrientation + zOrientation
  }

  // ============================================
  // 🔢 ESTADÍSTICAS Y ANÁLISIS
  // ============================================

  /**
   * Calcula estadísticas de los datos
   */
  function calculateStatistics() {
    if (!niftiData.image) {
      console.warn('⚠️ No hay datos de imagen para calcular estadísticas')
      return
    }

    const data = getTypedArray(niftiData.image, niftiData.header.datatypeCode)

    let min = Infinity
    let max = -Infinity
    let sum = 0
    let nonZeroCount = 0

    // Primera pasada: min, max, sum
    for (let i = 0; i < data.length; i++) {
      const value = data[i]

      if (value !== 0) {
        nonZeroCount++
      }

      min = Math.min(min, value)
      max = Math.max(max, value)
      sum += value
    }

    const mean = sum / data.length

    // Segunda pasada: desviación estándar
    let variance = 0
    for (let i = 0; i < data.length; i++) {
      variance += Math.pow(data[i] - mean, 2)
    }
    const std = Math.sqrt(variance / data.length)

    // Actualizar estadísticas
    statistics.min = min
    statistics.max = max
    statistics.mean = mean
    statistics.std = std
    statistics.nonZeroCount = nonZeroCount

    console.log('📊 Estadísticas calculadas:', {
      min: min.toFixed(2),
      max: max.toFixed(2),
      mean: mean.toFixed(2),
      std: std.toFixed(2),
      nonZeroCount
    })
  }

  /**
   * Calcula el histograma de los datos
   * @param {number} bins - Número de bins
   * @returns {Array} Histograma
   */
  function calculateHistogram(bins = 256) {
    if (!niftiData.image) {
      return []
    }

    const data = getTypedArray(niftiData.image, niftiData.header.datatypeCode)
    const histogram = new Array(bins).fill(0)

    const min = statistics.min
    const max = statistics.max
    const range = max - min

    if (range === 0) {
      histogram[0] = data.length
      return histogram
    }

    const binSize = range / bins

    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      const binIndex = Math.min(
        bins - 1,
        Math.floor((value - min) / binSize)
      )
      histogram[binIndex]++
    }

    statistics.histogram = histogram

    return histogram
  }

  // ============================================
  // 🔄 CONVERSIÓN Y NORMALIZACIÓN
  // ============================================

  /**
   * Obtiene TypedArray apropiado según el tipo de datos
   * @param {ArrayBuffer} buffer - Buffer de datos
   * @param {number} dataType - Código de tipo de datos NIfTI
   * @returns {TypedArray} Array tipado
   */
  function getTypedArray(buffer, dataType) {
    switch (dataType) {
      case 2: // DT_UNSIGNED_CHAR
        return new Uint8Array(buffer)
      case 4: // DT_SIGNED_SHORT
        return new Int16Array(buffer)
      case 8: // DT_SIGNED_INT
        return new Int32Array(buffer)
      case 16: // DT_FLOAT
        return new Float32Array(buffer)
      case 64: // DT_DOUBLE
        return new Float64Array(buffer)
      case 256: // DT_INT8
        return new Int8Array(buffer)
      case 512: // DT_UINT16
        return new Uint16Array(buffer)
      case 768: // DT_UINT32
        return new Uint32Array(buffer)
      default:
        console.warn('⚠️ Tipo de datos no reconocido, usando Uint8Array')
        return new Uint8Array(buffer)
    }
  }

  /**
   * Normaliza los datos a rango 0-255
   * @returns {Uint8Array} Datos normalizados
   */
  function normalizeToUint8() {
    if (!niftiData.image) {
      throw new Error('No hay datos de imagen para normalizar')
    }

    // Usar cache si existe
    if (normalizedData.value) {
      return normalizedData.value
    }

    console.log('🔄 Normalizando datos a Uint8...')

    const data = getTypedArray(niftiData.image, niftiData.header.datatypeCode)
    const normalized = new Uint8Array(data.length)

    const min = statistics.min
    const max = statistics.max
    const range = max - min

    if (range === 0) {
      normalized.fill(128)
      normalizedData.value = normalized
      return normalized
    }

    for (let i = 0; i < data.length; i++) {
      normalized[i] = Math.round(((data[i] - min) / range) * 255)
    }

    normalizedData.value = normalized

    console.log('✅ Datos normalizados')

    return normalized
  }

  /**
   * Normaliza con Window/Level
   * @param {number} windowWidth - Ancho de ventana
   * @param {number} windowCenter - Centro de ventana
   * @returns {Uint8Array} Datos normalizados
   */
  function normalizeWithWindowLevel(windowWidth, windowCenter) {
    if (!niftiData.image) {
      throw new Error('No hay datos de imagen')
    }

    const data = getTypedArray(niftiData.image, niftiData.header.datatypeCode)
    const normalized = new Uint8Array(data.length)

    const min = windowCenter - windowWidth / 2
    const max = windowCenter + windowWidth / 2
    const range = max - min

    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      let normalized_value = 0

      if (range > 0) {
        normalized_value = ((value - min) / range) * 255
        normalized_value = Math.max(0, Math.min(255, normalized_value))
      }

      normalized[i] = Math.round(normalized_value)
    }

    return normalized
  }

  // ============================================
  // 🗜️ COMPRESIÓN/DESCOMPRESIÓN
  // ============================================

  /**
   * Descomprime datos gzip
   * @param {ArrayBuffer} data - Datos comprimidos
   * @returns {ArrayBuffer} Datos descomprimidos
   */
  async function decompressGzip(data) {
    try {
      console.log('🗜️ Descomprimiendo gzip...')

      const decompressed = pako.inflate(new Uint8Array(data))

      console.log('✅ Descompresión completada:', {
        original: data.byteLength,
        decompressed: decompressed.byteLength
      })

      return decompressed.buffer

    } catch (err) {
      console.error('❌ Error descomprimiendo gzip:', err)
      throw new Error('Error descomprimiendo archivo: ' + err.message)
    }
  }

  // ============================================
  // 🔧 UTILIDADES
  // ============================================

  /**
   * Lee archivo como ArrayBuffer
   * @param {File} file - Archivo
   * @returns {Promise<ArrayBuffer>} ArrayBuffer
   */
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        resolve(e.target.result)
      }

      reader.onerror = (e) => {
        reject(new Error('Error leyendo archivo: ' + e.target.error))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Obtiene el nombre del tipo de datos
   * @param {number} code - Código de tipo de datos
   * @returns {string} Nombre del tipo
   */
  function getDataTypeName(code) {
    const types = {
      0: 'UNKNOWN',
      1: 'BINARY',
      2: 'UINT8',
      4: 'INT16',
      8: 'INT32',
      16: 'FLOAT32',
      32: 'COMPLEX64',
      64: 'FLOAT64',
      128: 'RGB',
      256: 'INT8',
      512: 'UINT16',
      768: 'UINT32',
      1024: 'INT64',
      1280: 'UINT64',
      1536: 'FLOAT128',
      1792: 'COMPLEX128',
      2048: 'COMPLEX256'
    }

    return types[code] || `UNKNOWN(${code})`
  }

  /**
   * Verifica si el tipo de datos es válido
   * @param {number} code - Código de tipo de datos
   * @returns {boolean}
   */
  function isValidDataType(code) {
    const validTypes = [2, 4, 8, 16, 64, 256, 512, 768]
    return validTypes.includes(code)
  }

  /**
   * Obtiene información completa del NIfTI
   * @returns {Object} Información completa
   */
  function getNiftiInfo() {
    return {
      isLoaded: niftiData.isLoaded,
      fileInfo: { ...fileInfo },
      metadata: { ...metadata },
      statistics: { ...statistics },
      hasNormalizedData: normalizedData.value !== null
    }
  }

  /**
   * Limpia los datos y resetea el estado
   */
  function clear() {
    console.log('🧹 Limpiando datos NIfTI...')

    niftiData.header = null
    niftiData.image = null
    niftiData.raw = null
    niftiData.isLoaded = false

    normalizedData.value = null
    error.value = null

    // Resetear metadatos
    Object.assign(metadata, {
      dimensions: { x: 0, y: 0, z: 0 },
      pixelDimensions: { x: 1, y: 1, z: 1 },
      dataType: '',
      orientation: '',
      min: 0,
      max: 0,
      description: '',
      qform: null,
      sform: null,
      affine: null
    })

    // Resetear estadísticas
    Object.assign(statistics, {
      min: 0,
      max: 0,
      mean: 0,
      std: 0,
      nonZeroCount: 0,
      histogram: []
    })

    console.log('✅ Datos NIfTI limpiados')
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general del procesamiento
   */
  const processingState = computed(() => ({
    isProcessing: isProcessing.value,
    progress: processingProgress.value,
    message: processingMessage.value,
    hasError: error.value !== null,
    error: error.value
  }))

  /**
   * Información de dimensiones
   */
  const dimensionInfo = computed(() => {
    if (!niftiData.isLoaded) return null

    return {
      voxels: metadata.dimensions,
      physical: {
        x: metadata.dimensions.x * metadata.pixelDimensions.x,
        y: metadata.dimensions.y * metadata.pixelDimensions.y,
        z: metadata.dimensions.z * metadata.pixelDimensions.z
      },
      totalVoxels: metadata.dimensions.x * metadata.dimensions.y * metadata.dimensions.z,
      voxelVolume: metadata.pixelDimensions.x * metadata.pixelDimensions.y * metadata.pixelDimensions.z
    }
  })

  /**
   * Estado de carga
   */
  const isLoaded = computed(() => niftiData.isLoaded)

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    isProcessing,
    processingProgress,
    processingMessage,
    niftiData,
    metadata,
    fileInfo,
    statistics,
    error,
    normalizedData,

    // Funciones de carga
    loadNiftiFile,
    loadNiftiFromUrl,

    // Funciones de parseo
    parseNifti,
    validateNiftiHeader,

    // Funciones de metadatos
    extractMetadata,
    extractQForm,
    extractSForm,
    calculateAffineMatrix,
    determineOrientation,

    // Funciones de estadísticas
    calculateStatistics,
    calculateHistogram,

    // Funciones de conversión
    getTypedArray,
    normalizeToUint8,
    normalizeWithWindowLevel,

    // Funciones de compresión
    decompressGzip,

    // Utilidades
    getDataTypeName,
    isValidDataType,
    getNiftiInfo,
    clear,

    // Computed properties
    processingState,
    dimensionInfo,
    isLoaded
  }
}
