/**
 * Web Worker para procesamiento de IA médica
 * Maneja análisis de IA, segmentación y mejoras de imagen sin bloquear la UI
 */

// Variables globales del Worker
let isProcessing = false;

/**
 * Manejador principal de mensajes del Worker
 */
self.onmessage = async function(event) {
  const { taskId, action, payload } = event.data;
  
  try {
    console.log(`🤖 AI Worker: Iniciando tarea ${action} con ID ${taskId}`);
    
    switch (action) {
      case 'analyzeAI':
        await handleAIAnalysis(payload, taskId);
        break;
      case 'generateSegmentation':
        await handleSegmentationGeneration(payload, taskId);
        break;
      case 'enhanceImage':
        await handleImageEnhancement(payload, taskId);
        break;
      case 'calculateMetrics':
        await handleMetricsCalculation(payload, taskId);
        break;
      case 'ping':
        self.postMessage({ taskId, action: 'pong' });
        break;
      default:
        throw new Error(`Acción no reconocida: ${action}`);
    }
  } catch (error) {
    console.error(`❌ Error en AI Worker (${action}):`, error);
    self.postMessage({
      taskId,
      action: 'error',
      error: error.message
    });
  }
};

/**
 * Maneja el análisis completo de IA
 */
async function handleAIAnalysis(payload, taskId) {
  const { dimensions } = payload;
  
  if (isProcessing) {
    throw new Error('Ya hay un análisis de IA en progreso');
  }
  
  isProcessing = true;
  
  try {
    // Enviar mensaje de inicio
    self.postMessage({
      taskId,
      action: 'progress',
      progress: 0,
      message: 'Iniciando análisis de IA...'
    });

    // Simular pasos del análisis de IA
    const steps = [
      { task: 'Preparando datos volumétricos...', duration: 500, progressEnd: 15 },
      { task: 'Aplicando preprocesamiento...', duration: 800, progressEnd: 30 },
      { task: 'Ejecutando red neuronal...', duration: 2000, progressEnd: 70 },
      { task: 'Generando segmentación...', duration: 1200, progressEnd: 85 },
      { task: 'Calculando métricas...', duration: 600, progressEnd: 95 },
      { task: 'Finalizando análisis...', duration: 400, progressEnd: 100 }
    ];

    let currentProgress = 0;

    for (const step of steps) {
      // Simular procesamiento intensivo
      await simulateIntensiveProcessing(
        step.task, 
        step.duration, 
        currentProgress, 
        step.progressEnd, 
        taskId
      );
      currentProgress = step.progressEnd;
    }

    // Generar datos de segmentación
    const segmentationData = generateMockSegmentation(dimensions);
    
    // Calcular métricas
    const metrics = calculateTumorMetrics(segmentationData, dimensions);
    
    // Generar resultados del análisis
    const results = {
      tumorVolume: metrics.volume,
      tumorPosition: metrics.centroid,
      confidence: 0.85 + Math.random() * 0.14, // Entre 85% y 99%
      findings: generateFindings(metrics),
      processingTime: (Date.now() - Date.now()) / 1000,
      segmentationData: segmentationData,
      metrics: metrics
    };

    self.postMessage({
      taskId,
      action: 'success',
      data: results,
      message: 'Análisis de IA completado exitosamente'
    });

  } finally {
    isProcessing = false;
  }
}

/**
 * Genera datos de segmentación simulados
 */
function generateMockSegmentation(dimensions) {
  const { width, height, depth } = dimensions;
  const segmentationData = new Uint8Array(width * height * depth);
  
  // Simular tumor esférico en el centro del volumen
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const centerZ = Math.floor(depth / 2);
  const tumorRadius = Math.min(width, height, depth) * 0.15; // 15% del tamaño del volumen
  const edemaRadius = tumorRadius * 1.5; // Edema más grande que el tumor

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + 
          Math.pow(y - centerY, 2) + 
          Math.pow(z - centerZ, 2)
        );
        
        const index = z * width * height + y * width + x;
        
        if (distance <= tumorRadius) {
          // Núcleo del tumor (label 4)
          if (distance <= tumorRadius * 0.6) {
            segmentationData[index] = 4; // Núcleo necrótico
          } else {
            segmentationData[index] = 1; // Tumor activo
          }
        } else if (distance <= edemaRadius) {
          // Edema peritumoral (label 2)
          segmentationData[index] = 2;
        } else {
          // Tejido normal (label 0)
          segmentationData[index] = 0;
        }
      }
    }
  }
  
  return segmentationData;
}

/**
 * Calcula métricas del tumor a partir de datos de segmentación
 */
function calculateTumorMetrics(segmentationData, dimensions) {
  const { width, height, depth } = dimensions;
  let tumorVoxels = 0;
  let edemaVoxels = 0;
  let necroticVoxels = 0;
  let sumX = 0, sumY = 0, sumZ = 0;

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = z * width * height + y * width + x;
        const label = segmentationData[index];
        
        if (label === 1) { // Tumor activo
          tumorVoxels++;
          sumX += x;
          sumY += y;
          sumZ += z;
        } else if (label === 2) { // Edema
          edemaVoxels++;
        } else if (label === 4) { // Necrótico
          necroticVoxels++;
          sumX += x;
          sumY += y;
          sumZ += z;
        }
      }
    }
  }

  const totalTumorVoxels = tumorVoxels + necroticVoxels;
  const centroid = totalTumorVoxels > 0 ? {
    x: Math.floor(sumX / totalTumorVoxels),
    y: Math.floor(sumY / totalTumorVoxels),
    z: Math.floor(sumZ / totalTumorVoxels)
  } : { x: 0, y: 0, z: 0 };

  // Asumir voxel de 1mm³ para simplificar (en realidad debería usar pixDims)
  const voxelVolume = 1; // mm³
  const volume = totalTumorVoxels * voxelVolume / 1000; // cm³

  return {
    volume: Math.round(volume * 100) / 100, // Redondear a 2 decimales
    tumorVoxels,
    edemaVoxels,
    necroticVoxels,
    centroid
  };
}

/**
 * Genera hallazgos clínicos basados en métricas
 */
function generateFindings(metrics) {
  const findings = [];
  
  if (metrics.volume > 10) {
    findings.push('Tumor primario de gran tamaño detectado');
  } else if (metrics.volume > 5) {
    findings.push('Tumor primario de tamaño moderado detectado');
  } else {
    findings.push('Tumor primario de pequeño tamaño detectado');
  }
  
  if (metrics.edemaVoxels > 0) {
    findings.push('Presencia de edema peritumoral');
  }
  
  if (metrics.necroticVoxels > metrics.tumorVoxels * 0.3) {
    findings.push('Extensa necrosis central detectada');
  } else if (metrics.necroticVoxels > 0) {
    findings.push('Necrosis central parcial');
  }
  
  findings.push('Sin evidencia de metástasis visible');
  
  return findings;
}

/**
 * Maneja la generación de segmentación específica
 */
async function handleSegmentationGeneration(payload, taskId) {
  const { dimensions, segmentationType } = payload;
  
  self.postMessage({
    taskId,
    action: 'progress',
    progress: 0,
    message: `Generando segmentación ${segmentationType}...`
  });

  // Simular procesamiento
  await simulateIntensiveProcessing(
    `Procesando segmentación ${segmentationType}...`,
    1500,
    0,
    100,
    taskId
  );

  const segmentationData = generateMockSegmentation(dimensions);
  
  self.postMessage({
    taskId,
    action: 'success',
    data: {
      segmentationData,
      segmentationType,
      confidence: 0.9 + Math.random() * 0.09
    },
    message: `Segmentación ${segmentationType} completada`
  });
}

/**
 * Maneja el enhancement de imagen
 */
async function handleImageEnhancement(payload, taskId) {
  const { volumeData, enhancementType } = payload;
  
  self.postMessage({
    taskId,
    action: 'progress',
    progress: 0,
    message: `Aplicando enhancement ${enhancementType}...`
  });

  // Simular procesamiento intensivo
  await simulateIntensiveProcessing(
    `Mejorando imagen con ${enhancementType}...`,
    2000,
    0,
    100,
    taskId
  );

  // En un caso real, aquí aplicarías algoritmos de mejora de imagen
  // Por ahora simulamos el resultado
  
  self.postMessage({
    taskId,
    action: 'success',
    data: {
      enhancedData: volumeData, // En realidad sería datos mejorados
      enhancementType,
      improvementFactor: 1.2 + Math.random() * 0.3
    },
    message: `Enhancement ${enhancementType} aplicado exitosamente`
  });
}

/**
 * Maneja el cálculo de métricas específicas
 */
async function handleMetricsCalculation(payload, taskId) {
  const { segmentationData, dimensions } = payload;
  
  self.postMessage({
    taskId,
    action: 'progress',
    progress: 50,
    message: 'Calculando métricas cuantitativas...'
  });

  const metrics = calculateTumorMetrics(segmentationData, dimensions);
  
  self.postMessage({
    taskId,
    action: 'success',
    data: metrics,
    message: 'Métricas calculadas exitosamente'
  });
}

/**
 * Simula procesamiento intensivo con actualizaciones de progreso
 */
async function simulateIntensiveProcessing(task, duration, startProgress, endProgress, taskId) {
  const updateInterval = 100; // Actualizar cada 100ms
  const updates = duration / updateInterval;
  const progressRange = endProgress - startProgress;
  const progressIncrement = progressRange / updates;
  
  for (let i = 0; i < updates; i++) {
    await new Promise(resolve => setTimeout(resolve, updateInterval));
    const currentProgress = Math.min(startProgress + (progressIncrement * (i + 1)), endProgress);
    
    self.postMessage({
      taskId,
      action: 'progress',
      progress: Math.round(currentProgress),
      message: task
    });
  }
}

console.log('🤖 AI Worker inicializado y listo para procesar');
