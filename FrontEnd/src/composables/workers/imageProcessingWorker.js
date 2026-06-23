/**
 * 🖼️ IMAGE PROCESSING WORKER
 * =====================================================
 * Worker especializado para procesamiento intensivo de imágenes médicas
 * 
 * FUNCIONALIDADES:
 * - Filtros convolucionales (sharpening, gaussian blur, edge detection)
 * - Procesamiento de imágenes médicas sin bloquear UI
 * - Optimizaciones para imágenes grandes (NIfTI, DICOM)
 * - Filtros especializados para neuroimágenes
 * 
 * PROPÓSITO: Liberar el hilo principal de operaciones costosas de procesamiento
 */

// ==========================================
// 🎯 MANEJADOR PRINCIPAL DE MENSAJES
// ==========================================

self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data
  
  try {
    let result
    
    switch (type) {
      case 'APPLY_SHARPENING_FILTER':
        result = await handleSharpeningFilter(data)
        break
        
      case 'APPLY_DENOISING_FILTER':
        result = await handleDenoisingFilter(data)
        break
        
      case 'APPLY_EDGE_DETECTION':
        result = await handleEdgeDetection(data)
        break
        
      case 'APPLY_GAUSSIAN_BLUR':
        result = await handleGaussianBlur(data)
        break
        
      case 'APPLY_CONTRAST_BRIGHTNESS':
        result = await handleContrastBrightness(data)
        break
        
      case 'APPLY_MEDICAL_ENHANCEMENT':
        result = await handleMedicalEnhancement(data)
        break
        
      case 'APPLY_HISTOGRAM_EQUALIZATION':
        result = await handleHistogramEqualization(data)
        break
        
      default:
        throw new Error(`Tipo de procesamiento no reconocido: ${type}`)
    }
    
    // Enviar resultado exitoso
    self.postMessage({
      type: 'PROCESSING_COMPLETE',
      id,
      success: true,
      result
    })
    
  } catch (error) {
    console.error('❌ Error en Image Processing Worker:', error)
    
    // Enviar error
    self.postMessage({
      type: 'PROCESSING_ERROR',
      id,
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    })
  }
})

// ==========================================
// 🔪 FILTRO DE SHARPENING (AFILADO)
// ==========================================

async function handleSharpeningFilter({ imageData, strength, fastMode = false }) {
  postProgress('Iniciando filtro de afilado...', 0)
  
  const data = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height
  
  // 🚀 OPTIMIZACIÓN: Detectar imágenes muy grandes
  const totalPixels = width * height
  const isVeryLargeImage = totalPixels > (512 * 512)
  
  if (fastMode || isVeryLargeImage) {
    // 🏃‍♂️ MODO RÁPIDO: Kernel simplificado
    postProgress('Aplicando afilado rápido para imagen grande...', 10)
    
    const multiplier = strength * 1.5
    const step = isVeryLargeImage ? Math.max(2, Math.floor(width / 256)) : (width > 512 ? 2 : 1)
    
    let processedRows = 0
    const totalRows = Math.floor((height - 2 * step) / step)
    
    for (let y = step; y < height - step; y += step) {
      // 🔄 Yield control y reportar progreso
      if (++processedRows % 10 === 0) {
        const progress = 10 + (processedRows / totalRows) * 80
        postProgress(`Procesando afilado: ${processedRows}/${totalRows} filas`, progress)
        await yieldControl()
      }
      
      for (let x = step; x < width - step; x += step) {
        for (let c = 0; c < 3; c++) {
          const centerIdx = (y * width + x) * 4 + c
          const centerValue = imageData.data[centerIdx]
          
          // Kernel Laplaciano de 5 puntos
          const topIdx = ((y - step) * width + x) * 4 + c
          const bottomIdx = ((y + step) * width + x) * 4 + c
          const leftIdx = (y * width + (x - step)) * 4 + c
          const rightIdx = (y * width + (x + step)) * 4 + c
          
          const laplacian = 4 * centerValue 
            - imageData.data[topIdx] 
            - imageData.data[bottomIdx] 
            - imageData.data[leftIdx] 
            - imageData.data[rightIdx]
          
          const enhanced = centerValue + multiplier * laplacian
          data[centerIdx] = Math.max(0, Math.min(255, enhanced))
          
          // Interpolar píxeles intermedios si step > 1
          if (step > 1 && x + 1 < width) {
            data[(y * width + (x + 1)) * 4 + c] = data[centerIdx]
          }
        }
      }
    }
  } else {
    // 🎯 MODO COMPLETO: Kernel de alta calidad
    postProgress('Aplicando afilado de alta calidad...', 10)
    
    const multiplier = strength * 2
    const kernel = [
      -multiplier, -multiplier, -multiplier,
      -multiplier, 1 + 8 * multiplier, -multiplier,
      -multiplier, -multiplier, -multiplier
    ]
    
    const chunkSize = 64
    let processedChunks = 0
    const totalChunks = Math.ceil((height - 2) / chunkSize)
    
    for (let yStart = 1; yStart < height - 1; yStart += chunkSize) {
      const yEnd = Math.min(yStart + chunkSize, height - 1)
      
      for (let y = yStart; y < yEnd; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) {
            let sum = 0
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const idx = ((y + ky) * width + (x + kx)) * 4 + c
                const kernelIdx = (ky + 1) * 3 + (kx + 1)
                sum += imageData.data[idx] * kernel[kernelIdx]
              }
            }
            const idx = (y * width + x) * 4 + c
            data[idx] = Math.max(0, Math.min(255, sum))
          }
        }
      }
      
      // Reportar progreso por chunks
      if (++processedChunks % 4 === 0) {
        const progress = 10 + (processedChunks / totalChunks) * 80
        postProgress(`Afilado de calidad: chunk ${processedChunks}/${totalChunks}`, progress)
        await yieldControl()
      }
    }
  }
  
  postProgress('Filtro de afilado completado', 100)
  return { data: Array.from(data), width, height }
}

// ==========================================
// 🧹 FILTRO DE REDUCCIÓN DE RUIDO
// ==========================================

async function handleDenoisingFilter({ imageData, strength = 0.8 }) {
  postProgress('Iniciando reducción de ruido intensiva...', 0)
  
  const data = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height
  
  // Kernel potenciado para reducción de ruido más agresiva
  const kernel = [
    2, 7, 12, 7, 2,
    7, 31, 52, 31, 7,
    12, 52, 127, 52, 12,
    7, 31, 52, 31, 7,
    2, 7, 12, 7, 2
  ]
  const kernelSum = 640  // Suma de todos los valores del kernel
  
  let processedRows = 0
  const totalRows = height - 2
  
  for (let y = 1; y < height - 1; y++) {
    // Reportar progreso cada 20 filas
    if (++processedRows % 20 === 0) {
      const progress = (processedRows / totalRows) * 100
      postProgress(`Reduciendo ruido: fila ${processedRows}/${totalRows}`, progress)
      await yieldControl()
    }
    
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // Solo RGB
        let sum = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c
            const kernelIdx = (ky + 1) * 3 + (kx + 1)
            sum += imageData.data[idx] * kernel[kernelIdx]
          }
        }
        const idx = (y * width + x) * 4 + c
        const smoothed = sum / kernelSum
        const original = imageData.data[idx]
        data[idx] = original * (1 - strength) + smoothed * strength
      }
    }
  }
  
  postProgress('Reducción de ruido completada', 100)
  return { data: Array.from(data), width, height }
}

// ==========================================
// 🔍 DETECCIÓN DE BORDES (EDGE DETECTION)
// ==========================================

async function handleEdgeDetection({ imageData, algorithm = 'sobel', threshold = 0.1 }) {
  postProgress('Iniciando detección de bordes...', 0)
  
  const data = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height
  
  let kernelX, kernelY
  
  if (algorithm === 'sobel') {
    // Operadores Sobel
    kernelX = [
      -1, 0, 1,
      -2, 0, 2,
      -1, 0, 1
    ]
    kernelY = [
      -1, -2, -1,
       0,  0,  0,
       1,  2,  1
    ]
  } else if (algorithm === 'prewitt') {
    // Operadores Prewitt
    kernelX = [
      -1, 0, 1,
      -1, 0, 1,
      -1, 0, 1
    ]
    kernelY = [
      -1, -1, -1,
       0,  0,  0,
       1,  1,  1
    ]
  }
  
  let processedRows = 0
  const totalRows = height - 2
  
  for (let y = 1; y < height - 1; y++) {
    if (++processedRows % 15 === 0) {
      const progress = (processedRows / totalRows) * 100
      postProgress(`Detectando bordes (${algorithm}): ${processedRows}/${totalRows}`, progress)
      await yieldControl()
    }
    
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0
      
      // Convertir a escala de grises para detección de bordes
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4
          const kernelIdx = (ky + 1) * 3 + (kx + 1)
          
          // Convertir a escala de grises (promedio RGB)
          const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3
          
          gx += gray * kernelX[kernelIdx]
          gy += gray * kernelY[kernelIdx]
        }
      }
      
      // Magnitud del gradiente
      const magnitude = Math.sqrt(gx * gx + gy * gy)
      const normalizedMagnitude = Math.min(255, magnitude)
      
      // Aplicar threshold
      const finalValue = normalizedMagnitude > (threshold * 255) ? normalizedMagnitude : 0
      
      const idx = (y * width + x) * 4
      data[idx] = finalValue     // R
      data[idx + 1] = finalValue // G
      data[idx + 2] = finalValue // B
      data[idx + 3] = imageData.data[idx + 3] // Mantener alpha
    }
  }
  
  postProgress('Detección de bordes completada', 100)
  return { data: Array.from(data), width, height }
}

// ==========================================
// 🌫️ FILTRO GAUSSIANO (BLUR)
// ==========================================

async function handleGaussianBlur({ imageData, radius = 5, sigma = 4.0 }) {
  postProgress('Iniciando filtro gaussiano intensivo...', 0)
  
  const data = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height
  
  // Generar kernel gaussiano
  const kernelSize = radius * 2 + 1
  const kernel = generateGaussianKernel(kernelSize, sigma)
  
  postProgress('Aplicando blur horizontal...', 20)
  
  // Primera pasada: blur horizontal
  const tempData = new Uint8ClampedArray(imageData.data)
  
  let processedRows = 0
  const totalRows = height
  
  for (let y = 0; y < height; y++) {
    if (++processedRows % 25 === 0) {
      const progress = 20 + (processedRows / totalRows) * 30
      postProgress(`Blur horizontal: fila ${processedRows}/${totalRows}`, progress)
      await yieldControl()
    }
    
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        let weightSum = 0
        
        for (let i = -radius; i <= radius; i++) {
          const sampleX = Math.max(0, Math.min(width - 1, x + i))
          const weight = kernel[i + radius]
          const idx = (y * width + sampleX) * 4 + c
          
          sum += imageData.data[idx] * weight
          weightSum += weight
        }
        
        const idx = (y * width + x) * 4 + c
        tempData[idx] = sum / weightSum
      }
    }
  }
  
  postProgress('Aplicando blur vertical...', 50)
  
  // Segunda pasada: blur vertical
  processedRows = 0
  
  for (let y = 0; y < height; y++) {
    if (++processedRows % 25 === 0) {
      const progress = 50 + (processedRows / totalRows) * 50
      postProgress(`Blur vertical: fila ${processedRows}/${totalRows}`, progress)
      await yieldControl()
    }
    
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        let weightSum = 0
        
        for (let i = -radius; i <= radius; i++) {
          const sampleY = Math.max(0, Math.min(height - 1, y + i))
          const weight = kernel[i + radius]
          const idx = (sampleY * width + x) * 4 + c
          
          sum += tempData[idx] * weight
          weightSum += weight
        }
        
        const idx = (y * width + x) * 4 + c
        data[idx] = sum / weightSum
      }
    }
  }
  
  postProgress('Filtro gaussiano completado', 100)
  return { data: Array.from(data), width, height }
}

// ==========================================
// 🎨 AJUSTE DE CONTRASTE Y BRILLO
// ==========================================

async function handleContrastBrightness({ imageData, contrast = 2.0, brightness = 1.4 }) {
  postProgress('Iniciando ajuste intensivo de contraste y brillo...', 0)
  
  const data = new Uint8ClampedArray(imageData.data)
  const totalPixels = imageData.width * imageData.height
  
  let processedPixels = 0
  
  // Calcular valores medios para ajuste adaptativo
  let totalBrightness = 0
  let minBrightness = 255
  let maxBrightness = 0
  
  for (let i = 0; i < data.length; i += 4) {
    const pixelBrightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
    totalBrightness += pixelBrightness
    minBrightness = Math.min(minBrightness, pixelBrightness)
    maxBrightness = Math.max(maxBrightness, pixelBrightness)
  }
  
  const averageBrightness = totalBrightness / (totalPixels * 3)
  const brightnessDynamic = maxBrightness - minBrightness
  
  // Ajuste adaptativo basado en el rango dinámico
  const contrastAdjustment = contrast * (1 + (128 - averageBrightness) / 256) * (255 / brightnessDynamic)
  
  for (let i = 0; i < data.length; i += 4) {
    // Reportar progreso cada 10000 píxeles
    if (++processedPixels % 10000 === 0) {
      const progress = (processedPixels / totalPixels) * 100
      postProgress(`Ajustando: ${processedPixels}/${totalPixels} píxeles`, progress)
      await yieldControl()
    }
    
    // Aplicar contraste y brillo mejorado a RGB
    for (let c = 0; c < 3; c++) {
      let value = imageData.data[i + c]
      
      // Aplicar contraste adaptativo
      value = ((value - averageBrightness) * contrastAdjustment) + averageBrightness
      
      // Aplicar brillo con corrección gamma
      value = Math.pow(value / 255, 1 / brightness) * 255
      
      // Clamp a rango válido
      data[i + c] = Math.max(0, Math.min(255, value))
    }
    
    // Mantener canal alpha
    data[i + 3] = imageData.data[i + 3]
  }
  
  postProgress('Ajuste de contraste y brillo completado', 100)
  return { data: Array.from(data), width: imageData.width, height: imageData.height }
}

// ==========================================
// 🏥 MEJORA ESPECIALIZADA PARA IMÁGENES MÉDICAS
// ==========================================

async function handleMedicalEnhancement({ imageData, enhanceType = 'brain' }) {
  postProgress(`Iniciando mejora médica para ${enhanceType}...`, 0)
  
  let result = imageData
  
  switch (enhanceType) {
    case 'brain': {
      // Secuencia especializada para neuroimágenes
      postProgress('Aplicando mejora para cerebro - Paso 1: Reducción de ruido', 20)
      result = await handleDenoisingFilter({ imageData: result, strength: 0.3 })
      result = { data: new Uint8ClampedArray(result.data), width: result.width, height: result.height }
      
      postProgress('Aplicando mejora para cerebro - Paso 2: Realce de bordes', 50)
      const enhanced = await handleSharpeningFilter({ imageData: result, strength: 0.6, fastMode: false })
      result = { data: new Uint8ClampedArray(enhanced.data), width: enhanced.width, height: enhanced.height }
      
      postProgress('Aplicando mejora para cerebro - Paso 3: Ajuste de contraste', 80)
      const final = await handleContrastBrightness({ imageData: result, contrast: 1.2, brightness: 1.1 })
      result = final
      break
    }
      
    case 'tumor': {
      // Especializado para resaltar estructuras tumorales
      postProgress('Aplicando mejora para tumor - Paso 1: Detección de bordes', 30)
      const edges = await handleEdgeDetection({ imageData: result, algorithm: 'sobel', threshold: 0.15 })
      
      postProgress('Aplicando mejora para tumor - Paso 2: Combinación con original', 70)
      // Combinar bordes con imagen original para resaltar estructuras
      const combined = new Uint8ClampedArray(imageData.data)
      for (let i = 0; i < combined.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          const original = imageData.data[i + c]
          const edge = edges.data[i + c]
          combined[i + c] = Math.min(255, original + (edge * 0.3))
        }
      }
      result = { data: Array.from(combined), width: imageData.width, height: imageData.height }
      break
    }
  }
  
  postProgress('Mejora médica completada', 100)
  return result
}

// ==========================================
// 📊 ECUALIZACIÓN DE HISTOGRAMA
// ==========================================

async function handleHistogramEqualization({ imageData }) {
  postProgress('Iniciando ecualización de histograma...', 0)
  
  const data = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height
  const totalPixels = width * height
  
  // Calcular histograma para cada canal
  const histograms = [new Array(256).fill(0), new Array(256).fill(0), new Array(256).fill(0)]
  
  postProgress('Calculando histograma...', 20)
  
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      histograms[c][imageData.data[i + c]]++
    }
  }
  
  postProgress('Generando función de transformación...', 40)
  
  // Calcular función de distribución acumulativa (CDF)
  const cdfs = histograms.map(hist => {
    const cdf = new Array(256)
    cdf[0] = hist[0]
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + hist[i]
    }
    return cdf
  })
  
  postProgress('Aplicando ecualización...', 60)
  
  // Aplicar ecualización
  let processedPixels = 0
  for (let i = 0; i < data.length; i += 4) {
    if (++processedPixels % 5000 === 0) {
      const progress = 60 + ((processedPixels / totalPixels) * 40)
      postProgress(`Ecualizando: ${processedPixels}/${totalPixels} píxeles`, progress)
      await yieldControl()
    }
    
    for (let c = 0; c < 3; c++) {
      const oldValue = imageData.data[i + c]
      const newValue = Math.round((cdfs[c][oldValue] * 255) / totalPixels)
      data[i + c] = newValue
    }
    data[i + 3] = imageData.data[i + 3] // Mantener alpha
  }
  
  postProgress('Ecualización de histograma completada', 100)
  return { data: Array.from(data), width, height }
}

// ==========================================
// 🛠️ UTILIDADES
// ==========================================

function generateGaussianKernel(size, sigma) {
  const kernel = new Array(size)
  const center = Math.floor(size / 2)
  let sum = 0
  
  for (let i = 0; i < size; i++) {
    const x = i - center
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma))
    sum += kernel[i]
  }
  
  // Normalizar
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum
  }
  
  return kernel
}

function postProgress(message, progress) {
  self.postMessage({
    type: 'PROCESSING_PROGRESS',
    message,
    progress: Math.round(progress)
  })
}

async function yieldControl() {
  // Permitir que otros procesos se ejecuten
  return new Promise(resolve => setTimeout(resolve, 0))
}

// ==========================================
// 🚀 INICIALIZACIÓN
// ==========================================

console.log('🖼️ Image Processing Worker iniciado y listo para procesamiento')
