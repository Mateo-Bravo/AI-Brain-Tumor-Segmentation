/**
 * Web Worker para procesamiento de datos médicos usando lógica tradicional con nifti.js
 * Actualizado para usar la misma lógica que el método tradicional
 */

// Cargar librerías dinámicamente en el worker
let pako = null;
let JSZip = null;
let nifti = null;

// Variable para controlar el procesamiento concurrente
let isProcessing = false;

// Función para cargar pako dinámicamente
async function loadPako() {
  if (!pako) {
    try {
      // Importar pako desde CDN usando fetch
      const response = await fetch('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');
      const pakoCode = await response.text();
      
      // Evaluar el código en el contexto del worker
      eval(pakoCode);
      pako = self.pako;
      
      console.log('✅ Pako cargado exitosamente en el worker');
    } catch (error) {
      console.error('❌ Error cargando pako en worker:', error);
      throw new Error('No se pudo cargar la librería de compresión');
    }
  }
  return pako;
}

// Función para cargar JSZip dinámicamente
async function loadJSZip() {
  if (!JSZip) {
    try {
      // Importar JSZip desde CDN usando fetch
      const response = await fetch('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
      const jszipCode = await response.text();
      
      // Evaluar el código en el contexto del worker
      eval(jszipCode);
      JSZip = self.JSZip;
      
      console.log('✅ JSZip cargado exitosamente en el worker');
    } catch (error) {
      console.error('❌ Error cargando JSZip en worker:', error);
      throw new Error('No se pudo cargar la librería JSZip');
    }
  }
  return JSZip;
}

// Función para cargar nifti.js dinámicamente usando archivo simplificado
async function loadNifti() {
  if (nifti && typeof nifti.isNIFTI === 'function') {
    console.log('✅ nifti.js ya está disponible');
    return nifti;
  }

  try {
    // Estrategia 1: Usar el archivo simplificado para Workers
    console.log('🔧 Cargando nifti-worker.js (versión simplificada)...');
    
    // Intentar importScripts con el archivo simplificado
    try {
      self.importScripts('/nifti-worker.js');
      
      if (typeof self.nifti !== 'undefined' && typeof self.nifti.isNIFTI === 'function') {
        nifti = self.nifti;
        console.log('✅ nifti-worker.js cargado exitosamente con importScripts');
        console.log(`🔧 Funciones disponibles: isNIFTI=${typeof nifti.isNIFTI}, readHeader=${typeof nifti.readHeader}, readImage=${typeof nifti.readImage}`);
        return nifti;
      }
    } catch (importError) {
      console.log(`❌ ImportScripts falló: ${importError.message}`);
    }
    
    // Estrategia 2: Fetch del archivo simplificado
    console.log('🔧 Intentando fetch del archivo simplificado...');
    const response = await fetch('/nifti-worker.js');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    let niftiCode = await response.text();
    
    // Verificar que el contenido no esté vacío
    if (!niftiCode || niftiCode.trim().length === 0) {
      throw new Error('Código JavaScript vacío recibido');
    }
    
    // Evaluar el código
    eval(niftiCode);
    
    // Verificar que nifti está disponible y funcional
    if (typeof self.nifti !== 'undefined' && typeof self.nifti.isNIFTI === 'function') {
      nifti = self.nifti;
      console.log('✅ nifti-worker.js cargado exitosamente con fetch');
      console.log(`🔧 Funciones disponibles: isNIFTI=${typeof nifti.isNIFTI}, readHeader=${typeof nifti.readHeader}, readImage=${typeof nifti.readImage}`);
      return nifti;
    } else {
      throw new Error('nifti object no válido después de la evaluación');
    }
    
  } catch (error) {
    console.log(`❌ Carga de archivo simplificado falló: ${error.message}`);
  }

  // Si llegamos aquí, la estrategia falló
  const errorMsg = 'No se pudo cargar nifti-worker.js (versión simplificada)';
  console.error('❌ Error fatal:', errorMsg);
  throw new Error(errorMsg);
}

/**
 * Maneja los mensajes del hilo principal
 */
self.onmessage = async function(e) {
  const { action, payload, taskId } = e.data;
  
  try {
    // Responder a ping para verificar que el worker está activo
    if (action === 'ping') {
      self.postMessage({ action: 'pong' });
      return;
    }
    
    // Prevenir procesamiento concurrente
    if (isProcessing) {
      self.postMessage({
        taskId,
        status: 'error',
        error: 'Worker ocupado procesando otra tarea'
      });
      return;
    }
    
    isProcessing = true;
    
    // Enviar estado de inicio
    self.postMessage({
      taskId,
      status: 'started',
      message: `Iniciando ${action}...`
    });
    
    switch (action) {
      case 'parseNIFTI':
        await loadPako();
        await loadNifti();
        await handleParseNIFTI(payload, taskId);
        break;
        
      case 'processZip':
        await loadPako();
        await loadJSZip();
        await loadNifti();
        await handleProcessZip(payload, taskId);
        break;
        
      case 'normalizeVolumeData':
        await handleNormalizeVolumeData(payload, taskId);
        break;
        
      case 'test':
        await handleTest(payload, taskId);
        break;
        
      default:
        throw new Error(`Acción no reconocida: ${action}`);
    }
    
  } catch (error) {
    self.postMessage({
      taskId,
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  } finally {
    isProcessing = false;
  }
};

/**
 * Procesa archivos NIfTI usando la lógica tradicional con nifti.js
 */
async function handleParseNIFTI(payload, taskId) {
  const { fileBuffer, modalityType, fileName } = payload;
  
  self.postMessage({
    taskId,
    status: 'progress',
    progress: 10,
    message: 'Leyendo archivo NIfTI...'
  });
  
  try {
    // Detectar si es archivo comprimido
    const isGzipped = fileName.endsWith('.gz');
    let niftiData;
    
    if (isGzipped) {
      self.postMessage({
        taskId,
        status: 'progress',
        progress: 20,
        message: 'Descomprimiendo archivo .gz...'
      });
      
      try {
        const data = new Uint8Array(fileBuffer);
        const decompressed = pako.inflate(data);
        niftiData = decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
        console.log(`🗜️ Archivo descomprimido: ${fileName}, nuevo tamaño: ${decompressed.length} bytes`);
      } catch (error) {
        throw new Error(`Error descomprimiendo archivo: ${error.message}`);
      }
    } else {
      niftiData = fileBuffer;
    }
    
    self.postMessage({
      taskId,
      status: 'progress',
      progress: 40,
      message: 'Validando archivo NIfTI...'
    });
    
    // Validar que es un archivo NIfTI válido usando nifti.js
    if (!nifti.isNIFTI(niftiData)) {
      throw new Error('El archivo no es un NIfTI válido');
    }
    
    console.log(`✅ Archivo NIfTI válido detectado: ${fileName}`);
    
    self.postMessage({
      taskId,
      status: 'progress',
      progress: 60,
      message: 'Leyendo header NIfTI...'
    });
    
    // Leer el header usando nifti.js
    const header = nifti.readHeader(niftiData);
    if (!header) {
      throw new Error('No se pudo leer el header del archivo NIfTI');
    }
    
    self.postMessage({
      taskId,
      status: 'progress',
      progress: 80,
      message: 'Extrayendo datos de imagen...'
    });
    
    // Leer los datos de imagen usando nifti.js
    const imageData = nifti.readImage(header, niftiData);
    if (!imageData) {
      throw new Error('No se pudo leer los datos de imagen del archivo NIfTI');
    }
    
    console.log(`✅ Archivo procesado exitosamente: ${fileName}`);
    console.log(`   📊 Dimensiones: ${header.dims[1]}x${header.dims[2]}x${header.dims[3]}`);
    console.log(`   🏷️ Modalidad: ${modalityType}`);
    console.log(`   📈 Tipo de datos: ${header.datatypeCode}`);
    
    self.postMessage({
      taskId,
      status: 'progress',
      progress: 95,
      message: 'Finalizando procesamiento...'
    });
    
    const result = {
      fileName: fileName,
      modalityType: modalityType,
      header: header,
      imageData: imageData,
      originalFile: new File([niftiData], fileName, { type: 'application/octet-stream' }),
      processedInWorker: true
    };
    
    self.postMessage({
      taskId,
      status: 'completed',
      result,
      message: `Archivo NIfTI procesado exitosamente: ${fileName}`
    });
    
  } catch (error) {
    console.error('Error procesando NIfTI en Worker:', error);
    throw new Error(`Error procesando archivo NIfTI: ${error.message}`);
  }
}

/**
 * Procesa archivos ZIP usando la lógica tradicional con nifti.js
 */
async function handleProcessZip(payload, taskId) {
  // Los datos vienen como { zipFile: ArrayBuffer, caseName: string }
  const { zipFile, caseName } = payload;
  
  self.postMessage({
    taskId,
    status: 'progress',
    progress: 10,
    message: 'Inicializando procesamiento ZIP...'
  });
  
  try {
    // Verificar que zipFile es un ArrayBuffer válido
    if (!zipFile || !(zipFile instanceof ArrayBuffer)) {
      throw new Error(`Datos ZIP inválidos. Recibido: ${typeof zipFile}, esperado: ArrayBuffer`);
    }
    
    console.log(`📦 Procesando ZIP: ${caseName}, tamaño: ${zipFile.byteLength} bytes`);
    
    // Crear instancia de JSZip y cargar el archivo desde ArrayBuffer
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipFile);
    
    self.postMessage({
      taskId,
      status: 'progress',
      progress: 25,
      message: 'ZIP cargado, analizando contenido...'
    });
    
    const caseFiles = {};
    
    // Primero, listar todos los archivos para debug
    console.log('📋 Contenido del ZIP:');
    loadedZip.forEach((relativePath, file) => {
      console.log(`   ${file.dir ? '📁' : '📄'} ${relativePath}`);
    });
    
    let processedCount = 0;
    const totalFiles = Object.keys(loadedZip.files).filter(filename => 
      filename.endsWith('.nii') || filename.endsWith('.nii.gz')
    ).length;
    
    // Iterar sobre todos los archivos en el ZIP usando la lógica tradicional
    for (const [filename, zipEntry] of Object.entries(loadedZip.files)) {
      if (!zipEntry.dir && (filename.endsWith('.nii') || filename.endsWith('.nii.gz'))) {
        try {
          console.log(`🔄 Procesando archivo: ${filename}`);
          
          self.postMessage({
            taskId,
            status: 'progress',
            progress: 30 + Math.round((processedCount / totalFiles) * 50),
            message: `Procesando ${filename}...`
          });
          
          // Extraer el archivo como Uint8Array
          const fileData = await zipEntry.async('uint8array');
          console.log(`📄 Archivo extraído: ${filename}, tamaño: ${fileData.length} bytes`);
          
          let niftiData;
          
          // Si es .gz, descomprimir con pako
          if (filename.endsWith('.gz')) {
            try {
              const decompressed = pako.inflate(fileData);
              console.log(`🗜️ Archivo descomprimido: ${filename}, nuevo tamaño: ${decompressed.length} bytes`);
              niftiData = decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
            } catch (error) {
              console.error(`❌ Error descomprimiendo ${filename}:`, error);
              continue;
            }
          } else {
            niftiData = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
          }
          
          // Validar que es un archivo NIfTI válido usando nifti.js
          if (nifti.isNIFTI(niftiData)) {
            console.log(`✅ Archivo NIfTI válido detectado: ${filename}`);
            
            // Leer el header usando nifti.js
            const header = nifti.readHeader(niftiData);
            if (!header) {
              console.error(`❌ No se pudo leer el header de ${filename}`);
              continue;
            }
            
            // Leer los datos de imagen usando nifti.js
            const imageData = nifti.readImage(header, niftiData);
            if (!imageData) {
              console.error(`❌ No se pudo leer la imagen de ${filename}`);
              continue;
            }
            
            // Detectar modalidad del nombre del archivo
            const modalidad = determineModalityFromFileName(filename);
            
            console.log(`✅ Archivo procesado exitosamente: ${filename}`);
            console.log(`   📊 Dimensiones: ${header.dims[1]}x${header.dims[2]}x${header.dims[3]}`);
            console.log(`   🏷️ Modalidad detectada: ${modalidad}`);
            console.log(`   📈 Tipo de datos: ${header.datatypeCode}`);
            
            // Almacenar en la estructura de casos usando el formato tradicional
            caseFiles[modalidad] = {
              fileName: filename,
              header: header,
              imageData: imageData,
              modalityType: modalidad,
              originalFile: new File([niftiData], filename, { type: 'application/octet-stream' })
            };
            
          } else {
            console.warn(`⚠️ Archivo ${filename} no es un NIfTI válido`);
          }
          
          processedCount++;
          
        } catch (error) {
          console.error(`❌ Error procesando archivo ${filename}:`, error);
        }
      }
    }
    
    self.postMessage({
      taskId,
      status: 'progress',
      progress: 95,
      message: 'Finalizando procesamiento ZIP...'
    });
    
    console.log(`✅ Procesamiento ZIP completado. Modalidades encontradas: ${Object.keys(caseFiles).length}`);
    console.log(`📋 Modalidades: ${Object.keys(caseFiles).join(', ')}`);
    
    const result = {
      files: caseFiles,
      totalFiles: processedCount,
      fileName: caseName,
      processedInWorker: true
    };
    
    self.postMessage({
      taskId,
      status: 'completed',
      result,
      message: `ZIP procesado exitosamente con ${processedCount} archivos médicos`
    });
    
  } catch (error) {
    console.error('Error procesando ZIP en Worker:', error);
    throw new Error(`Error procesando ZIP: ${error.message}`);
  }
}

/**
 * Determina la modalidad médica basada en el nombre del archivo
 */
function determineModalityFromFileName(fileName) {
  const name = fileName.toLowerCase();
  
  if (name.includes('t1n') || name.includes('t1_n')) return 't1n';
  if (name.includes('t1c') || name.includes('t1_c')) return 't1c';
  if (name.includes('t2f') || name.includes('t2_f')) return 't2f';
  if (name.includes('t2w') || name.includes('t2_w')) return 't2w';
  if (name.includes('seg') || name.includes('segmentation')) return 'seg';
  
  // Si no coincide con ninguna modalidad conocida, intentar detectar por posición
  if (name.includes('t1')) return 't1n';
  if (name.includes('t2')) return 't2w';
  
  return 'unknown';
}

/**
 * Normaliza datos volumétricos
 */
function normalizeVolumeData(data, header, options = {}) {
  const {
    method = 'minmax',
    targetMin = 0,
    targetMax = 1
  } = options;
  
  if (method === 'minmax') {
    // Encontrar min y max
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    
    const range = max - min;
    const targetRange = targetMax - targetMin;
    
    if (range === 0) return data; // Evitar división por cero
    
    const normalized = new Float32Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      normalized[i] = ((data[i] - min) / range) * targetRange + targetMin;
    }
    
    return normalized;
  }
  
  // Otros métodos de normalización pueden agregarse aquí
  return data;
}

/**
 * Normaliza datos volumétricos
 */
async function handleNormalizeVolumeData(payload, taskId) {
  const { data, header, options = {} } = payload;
  
  self.postMessage({
    taskId,
    status: 'progress',
    progress: 25,
    message: 'Calculando estadísticas...'
  });
  
  const normalized = normalizeVolumeData(data, header, options);
  
  self.postMessage({
    taskId,
    status: 'completed',
    result: normalized,
    message: 'Datos normalizados exitosamente'
  });
}

/**
 * Función de prueba para verificar que el worker funciona
 */
async function handleTest(payload, taskId) {
  // Simular progreso
  for (let i = 0; i <= 100; i += 10) {
    await new Promise(resolve => setTimeout(resolve, 50));
    self.postMessage({
      taskId,
      status: 'progress',
      progress: i,
      message: `Test en progreso... ${i}%`
    });
  }
  
  // Devolver resultado de prueba
  const result = {
    success: true,
    message: 'Web Worker funcionando correctamente',
    timestamp: new Date().toISOString(),
    payload: payload
  };
  
  self.postMessage({
    taskId,
    status: 'completed',
    result
  });
}

console.log('🔧 Medical Data Worker inicializado con lógica tradicional');

// Responder inmediatamente para indicar que el worker está listo
self.postMessage({ 
  action: 'ready',
  message: 'Worker inicializado correctamente'
});

