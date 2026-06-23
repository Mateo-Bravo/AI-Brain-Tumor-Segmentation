/**
 * @fileoverview Composable para mejora de volúmenes médicos con IA
 * @module useAIEnhancement
 * @description Maneja mejora de imágenes médicas, detección de tumores y segmentación con IA
 */

import * as THREE from 'three'
import { computed, reactive, ref } from 'vue'

/**
 * Composable para mejora de volúmenes médicos con IA
 * @returns {Object} Estado y métodos de mejora con IA
 */
export function useAIEnhancement() {
  // ========================================
  // 📊 ESTADO DE IA
  // ========================================

  /**
   * Estado del procesamiento IA
   */
  const aiProcessingStatus = ref({
    isProcessing: false,
    currentTask: '',
    progress: 0,
    stage: '' // 'analyzing', 'enhancing', 'segmenting'
  })

  /**
   * Resultados del análisis de IA
   */
  const aiAnalysisResults = ref({
    confidence: 0,
    tumorDetected: false,
    tumorPosition: null, // { x, y, z }
    tumorSize: null, // { width, height, depth }
    suggestions: [],
    riskLevel: 'low' // 'low', 'medium', 'high'
  })

  /**
   * Datos del volumen mejorado por IA
   * @type {import('vue').Ref<Float32Array|null>}
   */
  const aiVolumeData = ref(null)

  /**
   * Datos de segmentación IA
   * @type {import('vue').Ref<Uint8Array|null>}
   */
  const segmentationData = ref(null)

  /**
   * Textura 3D del volumen mejorado
   * @type {import('vue').Ref<THREE.Data3DTexture|null>}
   */
  const enhancedVolumeTexture = ref(null)

  /**
   * Textura 3D de segmentación
   * @type {import('vue').Ref<THREE.Data3DTexture|null>}
   */
  const segmentationTexture = ref(null)

  // ========================================
  // ⚙️ CONFIGURACIÓN DE IA
  // ========================================

  /**
   * Configuración de mejora de IA
   */
  const aiEnhancementConfig = reactive({
    noiseReduction: 0.3,
    contrastEnhancement: 1.5,
    edgeEnhancement: 0.4,
    detailPreservation: 0.8,
    smoothingFactor: 0.2
  })

  /**
   * Configuración de detección de tumores
   */
  const tumorDetectionConfig = reactive({
    sensitivityThreshold: 0.7,
    minTumorSize: 10, // voxels
    maxTumorSize: 1000, // voxels
    confidenceThreshold: 0.6
  })

  /**
   * Configuración de segmentación
   */
  const segmentationConfig = reactive({
    classes: ['background', 'tumor', 'edema', 'necrosis'],
    colors: {
      tumor: new THREE.Color(1.0, 0.0, 0.0), // Rojo
      edema: new THREE.Color(0.0, 1.0, 0.0), // Verde
      necrosis: new THREE.Color(0.0, 0.0, 1.0) // Azul
    },
    opacity: 0.6
  })

  // ========================================
  // 🎨 CONTROLES DE VISUALIZACIÓN
  // ========================================

  /**
   * Controla si se usa el volumen mejorado
   * @type {import('vue').Ref<boolean>}
   */
  const useEnhancedVolume = ref(false)

  /**
   * Controla si se muestra la segmentación en 3D
   * @type {import('vue').Ref<boolean>}
   */
  const showIASegmentation3D = ref(false)

  /**
   * Ratio de mezcla entre volumen original y mejorado (0.0 - 1.0)
   * @type {import('vue').Ref<number>}
   */
  const aiVolumeMixRatio = ref(0.5)

  /**
   * Opacidad de la segmentación IA (0.0 - 1.0)
   * @type {import('vue').Ref<number>}
   */
  const aiSegmentationOpacity = ref(0.6)

  /**
   * Controla si se centra automáticamente en el tumor
   * @type {import('vue').Ref<boolean>}
   */
  const autoFocusOnTumor = ref(false)

  /**
   * Colores de segmentación
   */
  const aiSegmentationColors = ref({
    tumor: new THREE.Color(1.0, 0.0, 0.0),
    edema: new THREE.Color(0.0, 1.0, 0.0),
    necrosis: new THREE.Color(0.0, 0.0, 1.0)
  })

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  /**
   * Verifica si hay volumen mejorado disponible
   */
  const hasEnhancedVolume = computed(() => {
    return aiVolumeData.value !== null
  })

  /**
   * Verifica si hay segmentación disponible
   */
  const hasSegmentation = computed(() => {
    return segmentationData.value !== null
  })

  /**
   * Verifica si hay análisis de IA disponible
   */
  const hasAIAnalysis = computed(() => {
    return aiAnalysisResults.value.confidence > 0
  })

  /**
   * Mensaje de estado del procesamiento
   */
  const processingMessage = computed(() => {
    if (!aiProcessingStatus.value.isProcessing) return ''

    const stage = aiProcessingStatus.value.stage
    const progress = aiProcessingStatus.value.progress

    const messages = {
      analyzing: `Analizando volumen médico... ${progress}%`,
      enhancing: `Mejorando calidad con IA... ${progress}%`,
      segmenting: `Segmentando estructuras... ${progress}%`,
      detecting: `Detectando anomalías... ${progress}%`
    }

    return messages[stage] || `Procesando... ${progress}%`
  })

  // ========================================
  // 🧠 FUNCIONES DE ANÁLISIS DE IA
  // ========================================

  /**
   * Simula análisis de IA en un volumen médico
   * @param {Uint8Array|Float32Array} volumeData - Datos del volumen
   * @param {number} width - Ancho del volumen
   * @param {number} height - Alto del volumen
   * @param {number} depth - Profundidad del volumen
   * @returns {Promise<Object>}
   */
  async function analyzeVolume(volumeData, width, height, depth) {
    console.log('🧠 Iniciando análisis de IA del volumen...')

    aiProcessingStatus.value = {
      isProcessing: true,
      currentTask: 'Análisis IA',
      progress: 0,
      stage: 'analyzing'
    }

    try {
      // Simular análisis progresivo
      for (let i = 0; i <= 100; i += 10) {
        aiProcessingStatus.value.progress = i
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Detectar tumor simulado en el centro
      const centerX = Math.floor(width / 2)
      const centerY = Math.floor(height / 2)
      const centerZ = Math.floor(depth / 2)

      // Buscar máximo de intensidad cerca del centro
      let maxIntensity = 0
      let tumorX = centerX
      let tumorY = centerY
      let tumorZ = centerZ

      const searchRadius = 20
      for (let z = Math.max(0, centerZ - searchRadius); z < Math.min(depth, centerZ + searchRadius); z++) {
        for (let y = Math.max(0, centerY - searchRadius); y < Math.min(height, centerY + searchRadius); y++) {
          for (let x = Math.max(0, centerX - searchRadius); x < Math.min(width, centerX + searchRadius); x++) {
            const idx = z * width * height + y * width + x
            if (volumeData[idx] > maxIntensity) {
              maxIntensity = volumeData[idx]
              tumorX = x
              tumorY = y
              tumorZ = z
            }
          }
        }
      }

      // Generar resultados simulados
      const results = {
        confidence: 0.85,
        tumorDetected: maxIntensity > 150,
        tumorPosition: { x: tumorX, y: tumorY, z: tumorZ },
        tumorSize: { width: 15, height: 15, depth: 12 },
        suggestions: [
          'Contraste elevado en región temporal',
          'Posible tumor en región central',
          'Recomendado análisis detallado'
        ],
        riskLevel: maxIntensity > 200 ? 'high' : maxIntensity > 150 ? 'medium' : 'low'
      }

      aiAnalysisResults.value = results

      console.log('✅ Análisis de IA completado:', results)

      return results

    } catch (error) {
      console.error('❌ Error en análisis de IA:', error)
      throw error

    } finally {
      aiProcessingStatus.value.isProcessing = false
    }
  }

  /**
   * Ejecuta simulación completa de análisis IA
   * @returns {Promise<void>}
   */
  async function simulateAIAnalysis() {
    console.log('🎭 Ejecutando simulación de análisis IA...')

    aiProcessingStatus.value = {
      isProcessing: true,
      currentTask: 'Análisis Simulado',
      progress: 0,
      stage: 'analyzing'
    }

    try {
      // Progreso simulado
      for (let i = 0; i <= 100; i += 5) {
        aiProcessingStatus.value.progress = i
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Resultados simulados
      aiAnalysisResults.value = {
        confidence: 0.89,
        tumorDetected: true,
        tumorPosition: { x: 128, y: 128, z: 64 },
        tumorSize: { width: 18, height: 20, depth: 15 },
        suggestions: [
          '⚠️ Área de alta intensidad detectada',
          '🎯 Tumor localizado en región central',
          '📊 Confianza del modelo: 89%',
          '💡 Se recomienda análisis manual adicional'
        ],
        riskLevel: 'medium'
      }

      console.log('✅ Simulación completada:', aiAnalysisResults.value)

    } catch (error) {
      console.error('❌ Error en simulación:', error)

    } finally {
      aiProcessingStatus.value.isProcessing = false
    }
  }

  // ========================================
  // ✨ FUNCIONES DE MEJORA DE VOLUMEN
  // ========================================

  /**
   * Mejora un volumen médico usando IA
   * @param {Uint8Array|Float32Array} volumeData - Datos originales
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} depth - Profundidad
   * @returns {Promise<Float32Array>}
   */
  async function enhanceVolume(volumeData, width, height, depth) {
    console.log('✨ Iniciando mejora de volumen con IA...')

    aiProcessingStatus.value = {
      isProcessing: true,
      currentTask: 'Mejora de IA',
      progress: 0,
      stage: 'enhancing'
    }

    try {
      const totalVoxels = width * height * depth
      const enhancedData = new Float32Array(totalVoxels)

      // Configuración
      const noise = aiEnhancementConfig.noiseReduction
      const contrast = aiEnhancementConfig.contrastEnhancement
      const edge = aiEnhancementConfig.edgeEnhancement
      const smooth = aiEnhancementConfig.smoothingFactor

      // Procesar por slices para reportar progreso
      const slicesPerBatch = 10

      for (let z = 0; z < depth; z++) {
        // Actualizar progreso
        if (z % slicesPerBatch === 0) {
          aiProcessingStatus.value.progress = Math.round((z / depth) * 100)
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = z * width * height + y * width + x
            let value = volumeData[idx]

            // Normalizar
            value = value / 255.0

            // Reducción de ruido (filtro de mediana simplificado)
            if (noise > 0) {
              let neighbors = []
              for (let dz = -1; dz <= 1; dz++) {
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx
                    const ny = y + dy
                    const nz = z + dz

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && nz >= 0 && nz < depth) {
                      const nidx = nz * width * height + ny * width + nx
                      neighbors.push(volumeData[nidx] / 255.0)
                    }
                  }
                }
              }

              neighbors.sort((a, b) => a - b)
              const median = neighbors[Math.floor(neighbors.length / 2)]
              value = value * (1 - noise) + median * noise
            }

            // Mejora de contraste
            value = Math.pow(value, 1 / contrast)

            // Detección de bordes (gradiente)
            if (edge > 0 && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
              const idx_left = z * width * height + y * width + (x - 1)
              const idx_right = z * width * height + y * width + (x + 1)
              const idx_up = z * width * height + (y - 1) * width + x
              const idx_down = z * width * height + (y + 1) * width + x

              const gx = (volumeData[idx_right] - volumeData[idx_left]) / 255.0
              const gy = (volumeData[idx_down] - volumeData[idx_up]) / 255.0
              const gradient = Math.sqrt(gx * gx + gy * gy)

              value += gradient * edge
            }

            // Suavizado
            if (smooth > 0 && x > 0 && x < width - 1 && y > 0 && y < height - 1 && z > 0 && z < depth - 1) {
              let sum = 0
              let count = 0

              for (let dz = -1; dz <= 1; dz++) {
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const nidx = (z + dz) * width * height + (y + dy) * width + (x + dx)
                    sum += volumeData[nidx] / 255.0
                    count++
                  }
                }
              }

              const avg = sum / count
              value = value * (1 - smooth) + avg * smooth
            }

            // Clamp
            value = Math.max(0, Math.min(1, value))

            enhancedData[idx] = value
          }
        }
      }

      aiProcessingStatus.value.progress = 100
      aiVolumeData.value = enhancedData

      console.log('✅ Volumen mejorado exitosamente')

      return enhancedData

    } catch (error) {
      console.error('❌ Error mejorando volumen:', error)
      throw error

    } finally {
      aiProcessingStatus.value.isProcessing = false
    }
  }

  /**
   * Aplica mejora rápida con presets
   * @param {Uint8Array|Float32Array} volumeData - Datos originales
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} depth - Profundidad
   * @param {string} preset - 'soft', 'medium', 'aggressive'
   * @returns {Promise<Float32Array>}
   */
  async function quickEnhance(volumeData, width, height, depth, preset = 'medium') {
    console.log(`✨ Aplicando mejora rápida (${preset})...`)

    const presets = {
      soft: {
        noiseReduction: 0.1,
        contrastEnhancement: 1.2,
        edgeEnhancement: 0.2,
        smoothingFactor: 0.1
      },
      medium: {
        noiseReduction: 0.3,
        contrastEnhancement: 1.5,
        edgeEnhancement: 0.4,
        smoothingFactor: 0.2
      },
      aggressive: {
        noiseReduction: 0.5,
        contrastEnhancement: 2.0,
        edgeEnhancement: 0.6,
        smoothingFactor: 0.3
      }
    }

    // Aplicar preset
    Object.assign(aiEnhancementConfig, presets[preset] || presets.medium)

    // Ejecutar mejora
    return await enhanceVolume(volumeData, width, height, depth)
  }

  // ========================================
  // 🎨 FUNCIONES DE SEGMENTACIÓN
  // ========================================

  /**
   * Genera segmentación simulada del volumen
   * @param {Uint8Array|Float32Array} volumeData - Datos del volumen
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} depth - Profundidad
   * @returns {Promise<Uint8Array>}
   */
  async function generateSegmentation(volumeData, width, height, depth) {
    console.log('🎨 Generando segmentación con IA...')

    aiProcessingStatus.value = {
      isProcessing: true,
      currentTask: 'Segmentación IA',
      progress: 0,
      stage: 'segmenting'
    }

    try {
      const totalVoxels = width * height * depth
      const segData = new Uint8Array(totalVoxels)

      const centerX = Math.floor(width / 2)
      const centerY = Math.floor(height / 2)
      const centerZ = Math.floor(depth / 2)

      // Radios para diferentes clases
      const tumorRadius = 20
      const edemaRadius = 35

      for (let z = 0; z < depth; z++) {
        // Progreso
        if (z % 5 === 0) {
          aiProcessingStatus.value.progress = Math.round((z / depth) * 100)
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = z * width * height + y * width + x

            // Distancia al centro
            const dx = x - centerX
            const dy = y - centerY
            const dz = z - centerZ
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

            // Clasificar
            if (dist < tumorRadius) {
              // Núcleo del tumor (clase 1)
              if (volumeData[idx] > 200) {
                segData[idx] = 1 // Tumor
              } else if (volumeData[idx] > 150) {
                segData[idx] = 3 // Necrosis
              }
            } else if (dist < edemaRadius) {
              // Edema periférico (clase 2)
              if (volumeData[idx] > 100) {
                segData[idx] = 2 // Edema
              }
            }
            // Clase 0 es background (por defecto)
          }
        }
      }

      segmentationData.value = segData
      aiProcessingStatus.value.progress = 100

      console.log('✅ Segmentación generada exitosamente')

      return segData

    } catch (error) {
      console.error('❌ Error generando segmentación:', error)
      throw error

    } finally {
      aiProcessingStatus.value.isProcessing = false
    }
  }

  // ========================================
  // 🔄 FUNCIONES DE ACTUALIZACIÓN DE TEXTURAS 3D
  // ========================================

  /**
   * Actualiza la textura 3D del volumen mejorado
   * @param {THREE.Mesh} volumeMesh - Mesh del volumen
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} depth - Profundidad
   * @returns {Promise<void>}
   */
  async function updateEnhancedVolumeTexture(volumeMesh, width, height, depth) {
    if (!aiVolumeData.value || !volumeMesh) {
      console.warn('⚠️ No se puede actualizar textura - datos faltantes')
      return
    }

    try {
      console.log('✨ Actualizando textura con volumen mejorado...')

      // Limpiar textura anterior
      if (enhancedVolumeTexture.value) {
        enhancedVolumeTexture.value.dispose()
      }

      // Crear textura 3D
      enhancedVolumeTexture.value = new THREE.Data3DTexture(
        aiVolumeData.value,
        width,
        height,
        depth
      )

      enhancedVolumeTexture.value.format = THREE.RedFormat
      enhancedVolumeTexture.value.type = THREE.FloatType
      enhancedVolumeTexture.value.minFilter = THREE.LinearFilter
      enhancedVolumeTexture.value.magFilter = THREE.LinearFilter
      enhancedVolumeTexture.value.unpackAlignment = 1
      enhancedVolumeTexture.value.generateMipmaps = false
      enhancedVolumeTexture.value.needsUpdate = true

      // Actualizar uniforms del shader
      if (volumeMesh.material && volumeMesh.material.uniforms) {
        volumeMesh.material.uniforms.enhancedVolume = { value: enhancedVolumeTexture.value }
        volumeMesh.material.uniforms.useEnhanced = { value: useEnhancedVolume.value }
        volumeMesh.material.uniforms.mixRatio = { value: aiVolumeMixRatio.value }
        volumeMesh.material.needsUpdate = true
      }

      console.log('✅ Textura de volumen mejorado actualizada')

    } catch (error) {
      console.error('❌ Error actualizando textura mejorada:', error)
    }
  }

  /**
   * Actualiza la textura 3D de segmentación
   * @param {THREE.Mesh} volumeMesh - Mesh del volumen
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {number} depth - Profundidad
   * @returns {Promise<void>}
   */
  async function updateSegmentationTexture(volumeMesh, width, height, depth) {
    if (!segmentationData.value || !volumeMesh) {
      console.warn('⚠️ No se puede actualizar segmentación - datos faltantes')
      return
    }

    try {
      console.log('🎨 Actualizando textura de segmentación...')

      // Limpiar textura anterior
      if (segmentationTexture.value) {
        segmentationTexture.value.dispose()
      }

      // Crear textura 3D
      segmentationTexture.value = new THREE.Data3DTexture(
        segmentationData.value,
        width,
        height,
        depth
      )

      segmentationTexture.value.format = THREE.RedFormat
      segmentationTexture.value.type = THREE.UnsignedByteType
      segmentationTexture.value.minFilter = THREE.LinearFilter
      segmentationTexture.value.magFilter = THREE.LinearFilter
      segmentationTexture.value.unpackAlignment = 1
      segmentationTexture.value.generateMipmaps = false
      segmentationTexture.value.needsUpdate = true

      // Actualizar uniforms del shader
      if (volumeMesh.material && volumeMesh.material.uniforms) {
        volumeMesh.material.uniforms.segVolume = { value: segmentationTexture.value }
        volumeMesh.material.uniforms.showSegmentation = { value: showIASegmentation3D.value }
        volumeMesh.material.uniforms.segOpacity = { value: aiSegmentationOpacity.value }
        volumeMesh.material.uniforms.tumorColor = { value: aiSegmentationColors.value.tumor }
        volumeMesh.material.uniforms.edemaColor = { value: aiSegmentationColors.value.edema }
        volumeMesh.material.uniforms.necrosisColor = { value: aiSegmentationColors.value.necrosis }
        volumeMesh.material.needsUpdate = true
      }

      console.log('✅ Textura de segmentación actualizada')

    } catch (error) {
      console.error('❌ Error actualizando textura de segmentación:', error)
    }
  }

  // ========================================
  // 🎯 FUNCIONES DE NAVEGACIÓN
  // ========================================

  /**
   * Centra la cámara en el tumor detectado
   * @param {THREE.OrbitControls} controls - Controles de la cámara
   * @param {number} width - Ancho del volumen
   * @param {number} height - Alto del volumen
   * @param {number} depth - Profundidad del volumen
   */
  function focusOnTumor(controls, width, height, depth) {
    if (!aiAnalysisResults.value.tumorPosition || !controls) {
      console.warn('⚠️ No se puede centrar - tumor no detectado')
      return
    }

    const tumor = aiAnalysisResults.value.tumorPosition
    console.log('🎯 Centrando cámara en tumor:', tumor)

    // Normalizar coordenadas
    const normalizedX = (tumor.x / width) - 0.5
    const normalizedY = (tumor.y / height) - 0.5
    const normalizedZ = (tumor.z / depth) - 0.5

    // Posición objetivo
    const targetPosition = new THREE.Vector3(
      normalizedX * 2,
      normalizedY * 2,
      normalizedZ * 2
    )

    // Animar controles
    if (controls.target) {
      controls.target.copy(targetPosition)
      controls.update()
    }

    console.log('✅ Cámara centrada en tumor')
  }

  // ========================================
  // 🔧 FUNCIONES DE UTILIDAD
  // ========================================

  /**
   * Resetea todos los resultados de IA
   */
  function resetAIResults() {
    console.log('🔄 Reseteando resultados de IA...')

    aiAnalysisResults.value = {
      confidence: 0,
      tumorDetected: false,
      tumorPosition: null,
      tumorSize: null,
      suggestions: [],
      riskLevel: 'low'
    }

    aiVolumeData.value = null
    segmentationData.value = null

    useEnhancedVolume.value = false
    showIASegmentation3D.value = false

    console.log('✅ Resultados de IA reseteados')
  }

  /**
   * Limpia texturas de IA para liberar memoria
   */
  function cleanupAITextures() {
    console.log('🧹 Limpiando texturas de IA...')

    if (enhancedVolumeTexture.value) {
      enhancedVolumeTexture.value.dispose()
      enhancedVolumeTexture.value = null
    }

    if (segmentationTexture.value) {
      segmentationTexture.value.dispose()
      segmentationTexture.value = null
    }

    console.log('✅ Texturas de IA limpiadas')
  }

  /**
   * Exporta resultados de análisis a JSON
   * @returns {string}
   */
  function exportAnalysisResults() {
    console.log('📤 Exportando resultados de análisis...')

    const results = {
      timestamp: new Date().toISOString(),
      analysis: aiAnalysisResults.value,
      config: {
        enhancement: aiEnhancementConfig,
        detection: tumorDetectionConfig,
        segmentation: segmentationConfig
      }
    }

    return JSON.stringify(results, null, 2)
  }

  // ========================================
  // 📤 RETORNO DEL COMPOSABLE
  // ========================================

  return {
    // Estado
    aiProcessingStatus,
    aiAnalysisResults,
    aiVolumeData,
    segmentationData,
    enhancedVolumeTexture,
    segmentationTexture,

    // Configuración
    aiEnhancementConfig,
    tumorDetectionConfig,
    segmentationConfig,

    // Controles de visualización
    useEnhancedVolume,
    showIASegmentation3D,
    aiVolumeMixRatio,
    aiSegmentationOpacity,
    autoFocusOnTumor,
    aiSegmentationColors,

    // Computed
    hasEnhancedVolume,
    hasSegmentation,
    hasAIAnalysis,
    processingMessage,

    // Análisis
    analyzeVolume,
    simulateAIAnalysis,

    // Mejora
    enhanceVolume,
    quickEnhance,

    // Segmentación
    generateSegmentation,

    // Texturas 3D
    updateEnhancedVolumeTexture,
    updateSegmentationTexture,

    // Navegación
    focusOnTumor,

    // Utilidades
    resetAIResults,
    cleanupAITextures,
    exportAnalysisResults
  }
}
