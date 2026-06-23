/**
 * Utilidades para detección automática de orientación NIfTI (RAS vs LPS)
 * y corrección de archivos RAS invertidos
 * 
 * Este módulo soluciona el problema común donde archivos RAS aparecen 
 * invertidos verticalmente en visores que no aplican corrección automática.
 */

/**
 * Detecta la orientación de un archivo NIfTI basándose en el header
 * @param {Object} header - Header del archivo NIfTI
 * @returns {Object} - Información de orientación detectada
 */
export function detectNiftiOrientation(header) {
  try {
    console.log('🧭 Detectando orientación NIfTI...')
    
    // Verificar que tenemos los datos necesarios
    if (!header) {
      console.warn('⚠️ Header no disponible para detección de orientación')
      return {
        orientation: 'UNKNOWN',
        needsCorrection: false,
        method: 'fallback',
        confidence: 'low'
      }
    }

    let orientationString = 'UNKNOWN'
    let detectionMethod = 'fallback'
    let confidence = 'low'

    // Método 1: Usar qform matrix si está disponible
    if (header.qform_code > 0 && header.quatern_b !== undefined) {
      console.log('🔍 Usando qform matrix para detección...')
      orientationString = getOrientationFromQform(header)
      detectionMethod = 'qform'
      confidence = 'high'
    }
    // Método 2: Usar sform matrix si está disponible
    else if (header.sform_code > 0 && header.srow_x) {
      console.log('🔍 Usando sform matrix para detección...')
      orientationString = getOrientationFromSform(header)
      detectionMethod = 'sform'
      confidence = 'high'
    }
    // Método 3: Análisis heurístico basado en características del archivo
    else {
      console.log('🔍 Usando análisis heurístico...')
      orientationString = getOrientationHeuristic(header)
      detectionMethod = 'heuristic'
      confidence = 'medium'
    }

    // Determinar si necesita corrección (solo RAS necesita flip vertical)
    const needsCorrection = orientationString.startsWith('RAS')
    
    console.log(`🧭 Orientación detectada: ${orientationString} (${detectionMethod}, ${confidence})`)
    console.log(`🔧 Necesita corrección: ${needsCorrection ? 'SÍ - se aplicará flip vertical' : 'NO'}`)

    return {
      orientation: orientationString,
      needsCorrection: needsCorrection,
      method: detectionMethod,
      confidence: confidence,
      details: {
        qform_code: header.qform_code,
        sform_code: header.sform_code,
        datatypeCode: header.datatypeCode
      }
    }
  } catch (error) {
    console.error('❌ Error en detección de orientación:', error)
    return {
      orientation: 'ERROR',
      needsCorrection: false,
      method: 'error',
      confidence: 'none',
      error: error.message
    }
  }
}

/**
 * Extrae orientación usando qform matrix
 * @param {Object} header - Header NIfTI
 * @returns {string} - Cadena de orientación (ej: "RAS", "LPS")
 */
function getOrientationFromQform(header) {
  try {
    // Construir matriz de transformación desde quaternion
    const qb = header.quatern_b || 0
    const qc = header.quatern_c || 0
    const qd = header.quatern_d || 0
    const qa = Math.sqrt(1 - (qb*qb + qc*qc + qd*qd))

    // Matriz de rotación 3x3 desde quaternion
    const R = [
      [qa*qa + qb*qb - qc*qc - qd*qd, 2*(qb*qc - qa*qd), 2*(qb*qd + qa*qc)],
      [2*(qb*qc + qa*qd), qa*qa + qc*qc - qb*qb - qd*qd, 2*(qc*qd - qa*qb)],
      [2*(qb*qd - qa*qc), 2*(qc*qd + qa*qb), qa*qa + qd*qd - qb*qb - qc*qc]
    ]

    // Aplicar escalado de pixdims si está disponible
    const pixdims = header.pixDims || [1, 1, 1, 1]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        R[i][j] *= pixdims[j + 1]
      }
    }

    return extractOrientationFromMatrix(R)
  } catch (error) {
    console.warn('⚠️ Error procesando qform:', error)
    return 'UNKNOWN'
  }
}

/**
 * Extrae orientación usando sform matrix
 * @param {Object} header - Header NIfTI
 * @returns {string} - Cadena de orientación
 */
function getOrientationFromSform(header) {
  try {
    // Construir matriz desde sform
    const R = [
      [header.srow_x[0], header.srow_x[1], header.srow_x[2]],
      [header.srow_y[0], header.srow_y[1], header.srow_y[2]],
      [header.srow_z[0], header.srow_z[1], header.srow_z[2]]
    ]

    return extractOrientationFromMatrix(R)
  } catch (error) {
    console.warn('⚠️ Error procesando sform:', error)
    return 'UNKNOWN'
  }
}

/**
 * Extrae orientación de una matriz de transformación 3x3
 * @param {Array} matrix - Matriz 3x3
 * @returns {string} - Cadena de orientación
 */
function extractOrientationFromMatrix(matrix) {
  const orientations = []

  for (let axis = 0; axis < 3; axis++) {
    let maxVal = 0
    let maxDir = 0

    // Encontrar la dirección principal para este eje
    for (let dir = 0; dir < 3; dir++) {
      const val = Math.abs(matrix[dir][axis])
      if (val > maxVal) {
        maxVal = val
        maxDir = dir
      }
    }

    // Determinar orientación basada en el signo
    const sign = matrix[maxDir][axis] >= 0 ? 1 : -1

    switch (maxDir) {
      case 0: // X axis
        orientations[axis] = sign > 0 ? 'R' : 'L'
        break
      case 1: // Y axis
        orientations[axis] = sign > 0 ? 'A' : 'P'
        break
      case 2: // Z axis
        orientations[axis] = sign > 0 ? 'S' : 'I'
        break
    }
  }

  return orientations.join('')
}

/**
 * Detección heurística de orientación cuando no hay matrices válidas
 * @param {Object} header - Header NIfTI
 * @returns {string} - Orientación estimada
 */
function getOrientationHeuristic(header) {
  console.log('🔍 Aplicando heurística de detección...')
  
  // Analizar características del archivo para estimar orientación
  const datatypeCode = header.datatypeCode || 0
  
  // Heurística 1: Archivos float32 con códigos de orientación en 0 tienden a ser RAS problemáticos
  if (datatypeCode === 16 && header.qform_code === 0 && header.sform_code === 0) {
    console.log('💡 Heurística: float32 sin orientación definida → probablemente RAS')
    return 'RAS'
  }
  
  // Heurística 2: Archivos int16 tipo BraTS típicamente son LPS o RAS estándar
  if (datatypeCode === 4) {
    console.log('💡 Heurística: int16 BraTS → probablemente LPS')
    return 'LPS'
  }
  
  // Heurística 3: Por defecto asumir LPS (más común en datos médicos estándar)
  console.log('💡 Heurística: usando LPS por defecto')
  return 'LPS'
}

/**
 * Aplica corrección de orientación a los datos volumétricos
 * @param {Uint8Array} volumeData - Datos volumétricos normalizados
 * @param {number} width - Ancho del volumen
 * @param {number} height - Alto del volumen  
 * @param {number} depth - Profundidad del volumen
 * @param {Object} orientationInfo - Información de orientación detectada
 * @returns {Uint8Array} - Datos corregidos
 */
export function applyOrientationCorrection(volumeData, width, height, depth, orientationInfo) {
  if (!orientationInfo.needsCorrection) {
    console.log('✅ No se requiere corrección de orientación')
    return volumeData
  }

  console.log('🔧 Aplicando corrección de orientación para:', orientationInfo.orientation)
  
  // Para archivos RAS: aplicar flip vertical (invertir eje Y)
  if (orientationInfo.orientation.startsWith('RAS')) {
    console.log('🔄 Aplicando flip vertical para RAS...')
    return applyVerticalFlip(volumeData, width, height, depth)
  }

  // Para futuras extensiones: aquí se pueden agregar otras correcciones
  console.log('ℹ️ Corrección solicitada pero no implementada para:', orientationInfo.orientation)
  return volumeData
}

/**
 * Aplica flip vertical (inversión arriba/abajo) a los datos volumétricos
 * @param {Uint8Array} volumeData - Datos originales
 * @param {number} width - Ancho
 * @param {number} height - Alto
 * @param {number} depth - Profundidad
 * @returns {Uint8Array} - Datos con flip vertical aplicado
 */
function applyVerticalFlip(volumeData, width, height, depth) {
  console.log('🔄 Ejecutando flip vertical...')
  const correctedData = new Uint8Array(volumeData.length)
  
  // Aplicar flip slice por slice
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const originalIndex = z * width * height + y * width + x
        const flippedY = height - 1 - y  // Invertir coordenada Y
        const correctedIndex = z * width * height + flippedY * width + x
        
        correctedData[correctedIndex] = volumeData[originalIndex]
      }
    }
  }
  
  console.log('✅ Flip vertical completado')
  return correctedData
}

/**
 * Obtiene información legible sobre la orientación para mostrar en la UI
 * @param {Object} orientationInfo - Información de orientación
 * @returns {Object} - Información formateada para UI
 */
export function getOrientationDisplayInfo(orientationInfo) {
  const orientationDescriptions = {
    'RAS': 'Right-Anterior-Superior',
    'LPS': 'Left-Posterior-Superior', 
    'RPI': 'Right-Posterior-Inferior',
    'LAS': 'Left-Anterior-Superior',
    'UNKNOWN': 'No detectada',
    'ERROR': 'Error en detección'
  }

  const confidenceLabels = {
    'high': 'Alta',
    'medium': 'Media', 
    'low': 'Baja',
    'none': 'Ninguna'
  }

  const methodLabels = {
    'qform': 'Matriz Qform',
    'sform': 'Matriz Sform',
    'heuristic': 'Análisis Heurístico',
    'fallback': 'Por defecto',
    'error': 'Error'
  }

  return {
    orientation: orientationInfo.orientation,
    description: orientationDescriptions[orientationInfo.orientation] || 'Desconocida',
    needsCorrection: orientationInfo.needsCorrection,
    correctionType: orientationInfo.needsCorrection ? 'Flip vertical' : 'Ninguna',
    confidence: confidenceLabels[orientationInfo.confidence] || 'Desconocida',
    method: methodLabels[orientationInfo.method] || 'Desconocido',
    status: orientationInfo.needsCorrection ? 'corregido' : 'normal'
  }
}
