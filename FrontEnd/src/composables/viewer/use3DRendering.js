// composables/viewer/use3DRendering.js
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { computed, nextTick, reactive, ref } from 'vue'

/**
 * 🎨 Composable para renderizado volumétrico 3D con Three.js
 *
 * Este composable maneja todo el sistema de visualización 3D:
 * - Inicialización de Three.js (renderer, scene, camera, controls)
 * - Shaders personalizados para volumen rendering
 * - Creación de texturas 3D y mesh volumétrico
 * - Loop de animación optimizado
 * - Sistema de uniformes para shaders
 * - Soporte para IA (segmentación y mejora de volumen)
 * - Limpieza de recursos WebGL
 */
export function use3DRendering() {
  // ============================================
  // 📊 VARIABLES GLOBALES THREE.JS
  // ============================================

  /**
   * Variables principales del sistema Three.js
   * Declaradas como let para permitir reinicialización
   */
  let renderer = null
  let scene = null
  let camera = null
  let controls = null
  let volumeMesh = null
  let volumeTexture = null
  let animationId = null

  // Variables para texturas de IA
  let segmentationTexture = null
  let enhancedVolumeTexture = null

  // ============================================
  // ⏱️ VARIABLES DE RENDIMIENTO
  // ============================================

  let frameCount = 0
  let lastTime = performance.now()
  let lastFrameTime = performance.now()
  const targetFrameTime = 1000 / 60 // 60 FPS
  let shaderUpdateTimeout = null
  const shaderUpdateDelay = 16 // ms

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Información de rendimiento 3D
   */
  const performanceInfo3D = reactive({
    fps: 0,
    memory: 0,
    drawCalls: 0,
    triangles: 0
  })

  /**
   * Configuración principal de renderizado 3D
   */
  const threeDConfig = reactive({
    opacity: 1.0,
    threshold: 0.010,
    brightness: 1.70,
    contrast: 2.10,
    steps: 256
  })

  /**
   * Controles 3D avanzados
   */
  const advancedControls = reactive({
    // Steps adaptativos
    minSteps: ref(128),
    maxSteps: ref(512),
    baseSteps: ref(256),
    adaptiveSteps: computed(() => baseSteps.value),

    // Colores para transfer function
    lowColor: ref(new THREE.Vector3(0, 0, 0)),      // Negro
    midColor: ref(new THREE.Vector3(0.5, 0.5, 0.5)), // Gris
    highColor: ref(new THREE.Vector3(1, 1, 1)),     // Blanco

    // Clipping planes
    clippingX: ref(1.0),
    clippingY: ref(1.0),
    clippingZ: ref(1.0),

    // Transfer function
    useTransferFunction: ref(true),

    // LOD adaptativo
    useAdaptiveLOD: ref(false)
  })

  /**
   * Configuración de IA
   */
  const aiRenderingConfig = reactive({
    showIASegmentation3D: ref(false),
    useEnhancedVolume: ref(false),
    aiSegmentationOpacity: ref(0.8),
    aiVolumeMixRatio: ref(0.5),
    aiSegmentationColors: {
      tumor: new THREE.Vector3(1, 0, 0),      // Rojo
      edema: new THREE.Vector3(1, 1, 0),      // Amarillo
      necrosis: new THREE.Vector3(0.5, 0, 0.5) // Púrpura
    }
  })

  /**
   * Presets de colores
   */
  const colorPresets = ref([
    {
      name: 'Clásico',
      colors: {
        low: [0, 0, 0],
        mid: [0.5, 0.3, 0.1],
        high: [1, 0.8, 0.6]
      }
    },
    {
      name: 'Escala de Grises',
      colors: {
        low: [0, 0, 0],
        mid: [0.5, 0.5, 0.5],
        high: [1, 1, 1]
      }
    },
    {
      name: 'Calor',
      colors: {
        low: [0, 0, 0],
        mid: [1, 0, 0],
        high: [1, 1, 0]
      }
    },
    {
      name: 'Frío',
      colors: {
        low: [0, 0, 0.2],
        mid: [0, 0.5, 1],
        high: [0.5, 1, 1]
      }
    }
  ])

  const selectedColorPreset = ref(1) // Escala de Grises por defecto

  // ============================================
  // 🎨 SHADERS - VERTEX Y FRAGMENT
  // ============================================

  /**
   * Vertex Shader
   * Pasa las posiciones del vértice al fragment shader
   */
  const vertexShader = `
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    void main() {
      vPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  /**
   * Fragment Shader
   * Implementa ray casting volumétrico con soporte para:
   * - Transfer function con colores personalizables
   * - Segmentación IA
   * - Volumen mejorado por IA
   * - Clipping planes
   * - Optimizaciones de rendimiento
   */
  const fragmentShader = `
    precision mediump float; // mediump para mejor rendimiento

    // ========================================
    // UNIFORMS BÁSICOS DEL VOLUMEN
    // ========================================
    uniform sampler3D volume;
    uniform float steps;
    uniform float opacity;
    uniform float threshold;
    uniform float brightness;
    uniform float contrast;
    uniform vec3 cameraPos;
    uniform vec3 lowColor;
    uniform vec3 midColor;
    uniform vec3 highColor;
    uniform vec3 clippingPlane;
    uniform bool useTransferFunction;

    // ========================================
    // UNIFORMS PARA IA Y SEGMENTACIÓN
    // ========================================
    uniform sampler3D segVolume;          // Textura de segmentación IA
    uniform sampler3D enhancedVolume;     // Volumen mejorado por IA
    uniform bool showSegmentation;        // Mostrar segmentación IA
    uniform bool useEnhanced;             // Usar volumen mejorado IA
    uniform float segOpacity;             // Opacidad de segmentación
    uniform float mixRatio;               // Ratio de mezcla original/IA
    uniform vec3 tumorColor;              // Color para tumor (label 1)
    uniform vec3 edemaColor;              // Color para edema (label 2)
    uniform vec3 necrosisColor;           // Color para necrosis (label 4)

    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    // ========================================
    // FUNCIONES AUXILIARES
    // ========================================

    /**
     * Calcula la intersección de un rayo con una caja AABB
     * Optimizado para evitar división por cero
     */
    vec2 intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
      vec3 invRayDir = 1.0 / (rayDir + 1e-6); // Evitar división por cero
      vec3 t0 = (boxMin - rayOrigin) * invRayDir;
      vec3 t1 = (boxMax - rayOrigin) * invRayDir;
      vec3 tmin = min(t0, t1);
      vec3 tmax = max(t0, t1);

      float tNear = max(max(tmin.x, tmin.y), tmin.z);
      float tFar = min(min(tmax.x, tmax.y), tmax.z);

      return vec2(max(tNear, 0.0), tFar);
    }

    /**
     * Obtiene el color de segmentación según el label
     * Labels: 0=normal, 1=tumor, 2=edema, 4=necrosis
     */
    vec3 getSegmentationColor(float label) {
      if (label > 3.5) {
        return necrosisColor; // Label 4: necrosis
      } else if (label > 1.5) {
        return edemaColor;    // Label 2: edema
      } else if (label > 0.5) {
        return tumorColor;    // Label 1: tumor
      }
      return vec3(0.0);       // Label 0: tejido normal (transparente)
    }

    // ========================================
    // MAIN - RAY CASTING VOLUMÉTRICO
    // ========================================
    void main() {
      // Calcular dirección del rayo desde la cámara
      vec3 rayDir = normalize(vWorldPosition - cameraPos);
      vec3 rayOrigin = cameraPos;

      // Límites del volumen ajustados por clipping planes
      vec3 adjustedBoxMin = vec3(-0.5) * clippingPlane;
      vec3 adjustedBoxMax = vec3(0.5) * clippingPlane;

      // Calcular intersección del rayo con el volumen
      vec2 bounds = intersectAABB(rayOrigin, rayDir, adjustedBoxMin, adjustedBoxMax);

      // Si no hay intersección, descartar fragmento
      if (bounds.x > bounds.y) discard;

      // Calcular longitud del rayo y tamaño de paso
      float rayLength = bounds.y - bounds.x;
      float stepSize = rayLength / steps;

      // Early exit si el step es muy pequeño
      if (stepSize < 0.001) discard;

      // Preparar variables para el ray marching
      vec3 step = rayDir * stepSize;
      vec3 pos = rayOrigin + rayDir * bounds.x;

      vec4 color = vec4(0.0);
      float totalAlpha = 0.0;

      // ========================================
      // LOOP DE RAY MARCHING
      // ========================================
      for (float i = 0.0; i < steps; i++) {
        // Posición de muestreo (trasladar a espacio [0,1])
        vec3 samplePos = pos + 0.5;

        // Verificar límites del volumen
        if (any(lessThan(samplePos, vec3(0.0))) ||
            any(greaterThan(samplePos, vec3(1.0)))) {
          pos += step;
          continue;
        }

        // ========================================
        // OBTENER DENSIDAD DEL VOLUMEN
        // ========================================
        float density;
        if (useEnhanced) {
          // Mezclar volumen original con volumen mejorado por IA
          float originalDensity = texture(volume, samplePos).r;
          float enhancedDensity = texture(enhancedVolume, samplePos).r;
          density = mix(originalDensity, enhancedDensity, mixRatio);
        } else {
          // Usar volumen original
          density = texture(volume, samplePos).r;
        }

        // Early exit si la densidad es muy baja
        if (density < threshold) {
          pos += step;
          continue;
        }

        // ========================================
        // TRANSFERENCIA DE COLOR BASE
        // ========================================
        vec3 sampleColor;
        if (density < 0.5) {
          sampleColor = mix(lowColor, midColor, density * 2.0);
        } else {
          sampleColor = mix(midColor, highColor, (density - 0.5) * 2.0);
        }

        // Aplicar ajustes de brillo y contraste
        sampleColor *= brightness;
        sampleColor = (sampleColor - 0.5) * contrast + 0.5;
        sampleColor = clamp(sampleColor, 0.0, 1.0);

        float alpha = density * opacity;

        // ========================================
        // PROCESAR SEGMENTACIÓN IA
        // ========================================
        if (showSegmentation) {
          float segLabel = texture(segVolume, samplePos).r * 255.0; // Convertir a label

          if (segLabel > 0.5) { // Si hay segmentación en este punto
            vec3 segColor = getSegmentationColor(segLabel);

            // Aplicar efecto de resaltado IA
            float segAlpha = segOpacity;

            // Crear efecto de "glow" para las regiones segmentadas
            float glowIntensity = 1.0 + 0.5 * sin(i * 0.1); // Efecto pulsante sutil
            segColor *= glowIntensity;

            // Mezclar color base con color de segmentación
            sampleColor = mix(sampleColor, segColor, segAlpha);

            // Aumentar opacidad para regiones importantes
            if (segLabel > 0.5 && segLabel < 1.5) { // Tumor
              alpha = max(alpha, 0.8 * segOpacity);
            } else if (segLabel > 3.5) { // Necrosis
              alpha = max(alpha, 0.9 * segOpacity);
            } else { // Edema
              alpha = max(alpha, 0.6 * segOpacity);
            }
          }
        }

        // ========================================
        // COMPOSICIÓN FINAL
        // ========================================
        float weight = (1.0 - totalAlpha) * alpha;

        color.rgb += weight * sampleColor;
        totalAlpha += weight;

        // Early exit si ya tenemos suficiente opacidad
        if (totalAlpha > 0.98) break;

        pos += step;
      }

      color.a = totalAlpha;
      gl_FragColor = color;

      // Descartar fragmentos casi transparentes
      if (color.a < 0.02) discard;
    }
  `

  // ============================================
  // 🔧 FUNCIONES PRINCIPALES
  // ============================================

  /**
   * Inicializa Three.js y configura el renderizador 3D
   *
   * @param {HTMLCanvasElement} canvas - Canvas HTML donde renderizar
   * @returns {Promise<boolean>} - true si la inicialización fue exitosa
   */
  async function initThree(canvas) {
    try {
      if (!canvas) {
        console.warn('⚠️ Canvas 3D no disponible para inicialización')
        return false
      }

      console.log('🎯 Inicializando Three.js...')
      console.log('Canvas info:', {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight
      })

      // Verificar si ya hay un renderizador válido para este canvas
      if (renderer && renderer.domElement === canvas) {
        console.log('✅ Renderizador ya existe para este canvas, reutilizando...')
        return true
      }

      // Solo limpiar si vamos a crear un nuevo renderizador
      if (renderer && renderer.domElement !== canvas) {
        console.log('🧹 Limpiando renderizador para canvas diferente...')
        cleanup3DResources()

        // Esperar un poco para que el contexto WebGL se limpie completamente
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Verificar soporte de WebGL
      const tempCanvas = document.createElement('canvas')
      const testContext = tempCanvas.getContext('webgl2') || tempCanvas.getContext('webgl')
      if (!testContext) {
        console.error('❌ WebGL no está soportado en este navegador')
        return false
      }

      console.log('✅ WebGL soportado, creando renderizador...')

      // Crear renderizador con configuración optimizada
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false, // Desactivar para mejor rendimiento
        alpha: true,
        powerPreference: 'high-performance', // Solicitar GPU dedicada
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false // Optimización de memoria
      })

      // Marcar el canvas
      canvas.setAttribute('data-engine', 'three.js')
      canvas.classList.add('three-canvas', 'medical-3d')
      console.log('🎯 Canvas marcado como renderizador 3D principal')

      // Configurar renderizador
      renderer.setClearColor(0x000000, 1) // Fondo negro
      renderer.setSize(canvas.width, canvas.height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // Limitar pixel ratio

      // Optimizaciones adicionales
      renderer.shadowMap.enabled = false
      renderer.physicallyCorrectLights = false

      // Configuraciones de contexto WebGL
      const gl = renderer.getContext()
      gl.disable(gl.DEPTH_TEST) // Deshabilitado para volúmenes transparentes
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

      // Manejar eventos de contexto WebGL
      canvas.addEventListener('webglcontextlost', (event) => {
        console.warn('⚠️ Contexto WebGL perdido')
        event.preventDefault()
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      })

      canvas.addEventListener('webglcontextrestored', () => {
        console.log('✅ Contexto WebGL restaurado')
        animate3D()
      })

      // Verificar contexto WebGL
      const glContext = renderer.getContext()
      if (!glContext) {
        console.error('❌ No se pudo obtener contexto WebGL')
        return false
      }

      console.log('✅ Contexto WebGL creado exitosamente')
      console.log('📊 WebGL Info:', {
        vendor: glContext.getParameter(glContext.VENDOR),
        renderer: glContext.getParameter(glContext.RENDERER),
        version: glContext.getParameter(glContext.VERSION),
        maxTextureSize: glContext.getParameter(glContext.MAX_TEXTURE_SIZE),
        max3DTextureSize: glContext.getParameter(glContext.MAX_3D_TEXTURE_SIZE) || 'No soportado'
      })

      // Crear escena
      scene = new THREE.Scene()

      // Crear cámara
      camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
      camera.position.set(2, 2, 2)
      camera.lookAt(0, 0, 0)

      // Crear controles
      controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 0, 0)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.maxDistance = 10
      controls.minDistance = 0.5

      // Iluminación
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
      scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7)
      directionalLight.position.set(1, 1, 1)
      scene.add(directionalLight)

      // Ejes de referencia
      const axesHelper = new THREE.AxesHelper(1)
      scene.add(axesHelper)

      // Iniciar animación
      animate3D()

      console.log('✅ Three.js inicializado correctamente')
      return true

    } catch (error) {
      console.error('❌ Error inicializando Three.js:', error)
      console.error('Stack trace:', error.stack)

      // Limpiar recursos parciales
      if (renderer) {
        try {
          renderer.dispose()
        } catch (e) {
          console.warn('Error limpiando renderer:', e)
        }
        renderer = null
      }

      scene = null
      camera = null
      controls = null

      return false
    }
  }

  /**
   * Loop de animación optimizado para Three.js
   * Incluye:
   * - Control de framerate
   * - Monitoreo de rendimiento
   * - LOD adaptativo
   * - Actualización de uniformes
   */
  function animate3D() {
    animationId = requestAnimationFrame(animate3D)

    const currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTime

    // Control de framerate - saltar frames si es necesario
    if (deltaTime < targetFrameTime) {
      return
    }

    // Monitoreo de performance
    frameCount++

    if (currentTime - lastTime >= 1000) {
      performanceInfo3D.fps = Math.round(frameCount * 1000 / (currentTime - lastTime))
      frameCount = 0
      lastTime = currentTime

      // Monitorear memoria cada segundo
      monitorWebGLMemory()

      // Ajustar LOD basado en FPS
      if (advancedControls.useAdaptiveLOD.value) {
        adjustAdaptiveLOD()
      }
    }

    // Actualizar controles
    if (controls && controls.enabled) {
      controls.update()
    }

    // Actualizar uniformes del shader con menor frecuencia
    if (frameCount % 3 === 0) { // Cada 3 frames
      updateUniforms3D()
    }

    // Actualizar posición de la cámara en los uniformes
    if (volumeMesh && volumeMesh.material.uniforms.cameraPos) {
      volumeMesh.material.uniforms.cameraPos.value.copy(camera.position)
    }

    // Renderizar
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }

    lastFrameTime = currentTime
  }

  /**
   * Ajusta automáticamente el LOD (Level of Detail) basado en rendimiento
   */
  function adjustAdaptiveLOD() {
    const currentFPS = performanceInfo3D.fps
    const currentSteps = advancedControls.adaptiveSteps.value

    if (currentFPS < 30 && currentSteps > advancedControls.minSteps.value) {
      // Reducir calidad si FPS es bajo
      advancedControls.baseSteps.value = Math.max(
        advancedControls.minSteps.value,
        currentSteps - 8
      )
    } else if (currentFPS > 50 && currentSteps < advancedControls.maxSteps.value) {
      // Aumentar calidad si FPS es alto
      advancedControls.baseSteps.value = Math.min(
        advancedControls.maxSteps.value,
        currentSteps + 4
      )
    }
  }

  /**
   * Monitorea el uso de memoria WebGL
   */
  function monitorWebGLMemory() {
    if (!renderer || !renderer.info) return

    performanceInfo3D.memory = renderer.info.memory.geometries +
      renderer.info.memory.textures
    performanceInfo3D.drawCalls = renderer.info.render.calls
    performanceInfo3D.triangles = renderer.info.render.triangles
  }

  /**
   * Crea una textura 3D y mesh volumétrico a partir de datos existentes
   *
   * @param {TypedArray} volumeData - Datos volumétricos
   * @param {number} width - Ancho del volumen
   * @param {number} height - Alto del volumen
   * @param {number} depth - Profundidad del volumen
   * @returns {boolean} - true si se creó exitosamente
   */
  function create3DVolumeFromExistingData(volumeData, width, height, depth) {
    if (!volumeData || !width || !height || !depth) {
      console.warn('⚠️ No hay datos volumétricos disponibles')
      return false
    }

    console.log('🎯 Creando volumen 3D a partir de datos existentes...')
    console.log('Dimensiones:', { width, height, depth })

    try {
      // Limpieza de recursos anteriores
      console.log('🧹 Limpiando recursos anteriores...')

      if (volumeTexture) {
        volumeTexture.dispose()
        volumeTexture = null
      }

      if (volumeMesh) {
        if (scene) {
          scene.remove(volumeMesh)
        }

        if (volumeMesh.geometry) {
          volumeMesh.geometry.dispose()
        }

        if (volumeMesh.material) {
          if (volumeMesh.material.uniforms) {
            Object.values(volumeMesh.material.uniforms).forEach(uniform => {
              if (uniform.value && uniform.value.dispose) {
                uniform.value.dispose()
              }
            })
          }
          volumeMesh.material.dispose()
        }

        volumeMesh = null
      }

      // Forzar liberación de memoria WebGL
      if (renderer && renderer.info) {
        console.log('📊 Memoria WebGL antes:', renderer.info.memory)
      }

      // Detectar soporte de WebGL2 para tipo de textura
      console.log('🎨 Creando nueva textura 3D...')

      let chosenType = THREE.UnsignedByteType
      let dataForTexture = volumeData

      try {
        const probeCanvas = document.createElement('canvas')
        const gl2 = probeCanvas.getContext('webgl2')

        if (gl2 && typeof THREE.FloatType !== 'undefined') {
          chosenType = THREE.FloatType
          console.log('🔎 WebGL2 detectado: usando textura Float')

          // Convertir a Float32Array si es necesario
          if (!(volumeData instanceof Float32Array)) {
            console.log('🔧 Convirtiendo volumen a Float32Array...')
            const n = volumeData.length
            const floatArr = new Float32Array(n)

            if (volumeData instanceof Uint8Array) {
              for (let i = 0; i < n; i++) floatArr[i] = volumeData[i] / 255.0
            } else if (volumeData instanceof Uint16Array) {
              for (let i = 0; i < n; i++) floatArr[i] = volumeData[i] / 65535.0
            } else {
              // Normalizar por valor máximo
              let maxv = 0
              for (let i = 0; i < n; i++) if (volumeData[i] > maxv) maxv = volumeData[i]
              if (maxv === 0) maxv = 1
              for (let i = 0; i < n; i++) floatArr[i] = volumeData[i] / maxv
            }

            dataForTexture = floatArr
          }
        } else {
          console.log('🔎 Usando textura UnsignedByte (fallback)')
        }
      } catch (err) {
        console.warn('⚠️ Error detectando soporte WebGL, usando fallback', err)
        chosenType = THREE.UnsignedByteType
      }

      // Crear textura 3D
      volumeTexture = new THREE.Data3DTexture(dataForTexture, width, height, depth)
      volumeTexture.format = THREE.RedFormat
      volumeTexture.type = chosenType
      volumeTexture.minFilter = THREE.LinearFilter
      volumeTexture.magFilter = THREE.LinearFilter
      volumeTexture.unpackAlignment = 1
      volumeTexture.generateMipmaps = false
      volumeTexture.needsUpdate = true

      console.log('✅ Textura 3D creada exitosamente')

      // Crear mesh volumétrico
      createVolumeMesh3D()

      return true

    } catch (error) {
      console.error('❌ Error creando volumen 3D:', error)
      return false
    }
  }

  /**
   * Crea el mesh volumétrico con material de shader personalizado
   *
   * @returns {boolean} - true si se creó exitosamente
   */
  function createVolumeMesh3D() {
    if (!volumeTexture) {
      console.log('⚠️ volumeTexture no disponible para crear mesh')
      return false
    }

    console.log('🔧 Creando mesh volumétrico...')

    const geometry = new THREE.BoxGeometry(1, 1, 1)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        volume: { value: volumeTexture },
        steps: { value: Number(advancedControls.adaptiveSteps.value) },
        opacity: { value: Number(threeDConfig.opacity) },
        threshold: { value: Number(threeDConfig.threshold) },
        brightness: { value: Number(threeDConfig.brightness) },
        contrast: { value: Number(threeDConfig.contrast) },
        cameraPos: { value: camera ? camera.position.clone() : new THREE.Vector3(2, 2, 2) },
        lowColor: { value: advancedControls.lowColor.value.clone() },
        midColor: { value: advancedControls.midColor.value.clone() },
        highColor: { value: advancedControls.highColor.value.clone() },
        clippingPlane: {
          value: new THREE.Vector3(
            advancedControls.clippingX.value,
            advancedControls.clippingY.value,
            advancedControls.clippingZ.value
          )
        },
        useTransferFunction: { value: advancedControls.useTransferFunction.value },

        // Uniforms para IA
        segVolume: { value: segmentationTexture || volumeTexture },
        enhancedVolume: { value: enhancedVolumeTexture || volumeTexture },
        showSegmentation: { value: aiRenderingConfig.showIASegmentation3D.value },
        useEnhanced: { value: aiRenderingConfig.useEnhancedVolume.value },
        segOpacity: { value: aiRenderingConfig.aiSegmentationOpacity.value },
        mixRatio: { value: aiRenderingConfig.aiVolumeMixRatio.value },
        tumorColor: { value: aiRenderingConfig.aiSegmentationColors.tumor.clone() },
        edemaColor: { value: aiRenderingConfig.aiSegmentationColors.edema.clone() },
        necrosisColor: { value: aiRenderingConfig.aiSegmentationColors.necrosis.clone() }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide
    })

    volumeMesh = new THREE.Mesh(geometry, material)

    // Centrar el mesh
    volumeMesh.position.set(0, 0, 0)

    geometry.computeBoundingBox()
    const center = new THREE.Vector3()
    geometry.boundingBox.getCenter(center)
    volumeMesh.position.sub(center)

    // Agregar a la escena
    if (scene) {
      scene.add(volumeMesh)
      console.log('✅ Mesh volumétrico agregado a escena principal')
    } else {
      console.log('✅ Mesh volumétrico creado (sin escena principal)')
    }

    console.log('✅ Mesh volumétrico creado')
    return true
  }

  /**
   * Actualiza los uniformes del shader con optimizaciones
   */
  function updateUniforms3D() {
    if (!volumeMesh || !volumeMesh.material || !volumeMesh.material.uniforms) {
      return
    }

    try {
      const uniforms = volumeMesh.material.uniforms

      // Actualizar uniformes básicos
      if (uniforms.opacity) uniforms.opacity.value = Number(threeDConfig.opacity)
      if (uniforms.steps) uniforms.steps.value = Number(advancedControls.adaptiveSteps.value)
      if (uniforms.threshold) uniforms.threshold.value = Number(threeDConfig.threshold)
      if (uniforms.brightness) uniforms.brightness.value = Number(threeDConfig.brightness)
      if (uniforms.contrast) uniforms.contrast.value = Number(threeDConfig.contrast)

      // Actualizar clipping plane
      if (uniforms.clippingPlane) {
        uniforms.clippingPlane.value.set(
          advancedControls.clippingX.value,
          advancedControls.clippingY.value,
          advancedControls.clippingZ.value
        )
      }

      if (uniforms.useTransferFunction) {
        uniforms.useTransferFunction.value = advancedControls.useTransferFunction.value
      }

      // Actualizar colores
      if (uniforms.lowColor) uniforms.lowColor.value.copy(advancedControls.lowColor.value)
      if (uniforms.midColor) uniforms.midColor.value.copy(advancedControls.midColor.value)
      if (uniforms.highColor) uniforms.highColor.value.copy(advancedControls.highColor.value)

      // Actualizar uniformes de IA
      if (uniforms.showSegmentation) {
        uniforms.showSegmentation.value = aiRenderingConfig.showIASegmentation3D.value
      }
      if (uniforms.segOpacity) {
        uniforms.segOpacity.value = aiRenderingConfig.aiSegmentationOpacity.value
      }
      if (uniforms.tumorColor) {
        uniforms.tumorColor.value.copy(aiRenderingConfig.aiSegmentationColors.tumor)
      }
      if (uniforms.edemaColor) {
        uniforms.edemaColor.value.copy(aiRenderingConfig.aiSegmentationColors.edema)
      }
      if (uniforms.necrosisColor) {
        uniforms.necrosisColor.value.copy(aiRenderingConfig.aiSegmentationColors.necrosis)
      }
      if (uniforms.useEnhanced) {
        uniforms.useEnhanced.value = aiRenderingConfig.useEnhancedVolume.value
      }
      if (uniforms.mixRatio) {
        uniforms.mixRatio.value = aiRenderingConfig.aiVolumeMixRatio.value
      }

      // Marcar material para actualización
      volumeMesh.material.needsUpdate = true

    } catch (error) {
      console.warn('⚠️ Error actualizando uniformes 3D:', error)
    }
  }

  /**
   * Actualización de uniformes con debounce
   */
  function debouncedUpdateUniforms3D() {
    if (shaderUpdateTimeout) {
      clearTimeout(shaderUpdateTimeout)
    }

    shaderUpdateTimeout = setTimeout(() => {
      updateUniforms3D()
    }, shaderUpdateDelay)
  }

  /**
   * Limpia todos los recursos 3D y libera memoria
   */
  function cleanup3DResources() {
    console.log('🧹 Limpiando recursos 3D...')

    try {
      // Detener animación
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }

      // Limpiar volumen mesh
      if (volumeMesh) {
        if (scene) scene.remove(volumeMesh)
        if (volumeMesh.geometry) volumeMesh.geometry.dispose()
        if (volumeMesh.material) {
          if (volumeMesh.material.uniforms) {
            Object.values(volumeMesh.material.uniforms).forEach(uniform => {
              if (uniform.value && uniform.value.dispose) {
                uniform.value.dispose()
              }
            })
          }
          volumeMesh.material.dispose()
        }
        volumeMesh = null
      }

      // Limpiar texturas
      if (volumeTexture) {
        volumeTexture.dispose()
        volumeTexture = null
      }
      if (segmentationTexture) {
        segmentationTexture.dispose()
        segmentationTexture = null
      }
      if (enhancedVolumeTexture) {
        enhancedVolumeTexture.dispose()
        enhancedVolumeTexture = null
      }

      // Limpiar controles
      if (controls) {
        controls.dispose()
        controls = null
      }

      // Limpiar renderer
      if (renderer) {
        renderer.dispose()
        renderer.domElement = null
        renderer = null
      }

      // Limpiar escena
      if (scene) {
        while (scene.children.length > 0) {
          const object = scene.children[0]
          scene.remove(object)

          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose())
            } else {
              object.material.dispose()
            }
          }
        }
        scene = null
      }

      camera = null

      // Forzar garbage collection si está disponible
      if (window.gc) {
        window.gc()
      }

      console.log('✅ Recursos 3D limpiados correctamente')

    } catch (error) {
      console.error('❌ Error al limpiar recursos 3D:', error)
    }
  }

  // ============================================
  // 🎨 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Aplica un preset de colores
   */
  function applyColorPreset(presetIndex = selectedColorPreset.value) {
    const preset = colorPresets.value[presetIndex]

    if (!preset) {
      console.warn('⚠️ Preset de color no encontrado:', presetIndex)
      return
    }

    console.log(`🎨 Aplicando preset: ${preset.name}`)

    advancedControls.lowColor.value.set(
      preset.colors.low[0],
      preset.colors.low[1],
      preset.colors.low[2]
    )
    advancedControls.midColor.value.set(
      preset.colors.mid[0],
      preset.colors.mid[1],
      preset.colors.mid[2]
    )
    advancedControls.highColor.value.set(
      preset.colors.high[0],
      preset.colors.high[1],
      preset.colors.high[2]
    )

    selectedColorPreset.value = presetIndex

    nextTick(() => {
      updateUniforms3D()
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    })
  }

  /**
   * Resetea controles 3D a valores por defecto
   */
  function resetToDefaults() {
    threeDConfig.opacity = 1.0
    threeDConfig.threshold = 0.010
    threeDConfig.brightness = 1.70
    threeDConfig.contrast = 2.10
    advancedControls.baseSteps.value = 256
    advancedControls.clippingX.value = 1.0
    advancedControls.clippingY.value = 1.0
    advancedControls.clippingZ.value = 1.0

    selectedColorPreset.value = 1 // Escala de Grises
    applyColorPreset(1)

    console.log('🔄 Controles 3D reseteados a valores por defecto')
  }

  /**
   * Toma una captura de pantalla de la vista 3D
   */
  function takeScreenshot3D() {
    if (!renderer) {
      console.warn('⚠️ Renderizador 3D no disponible para captura')
      return
    }

    try {
      renderer.render(scene, camera)

      const canvas = renderer.domElement
      const dataURL = canvas.toDataURL('image/png')

      const link = document.createElement('a')
      link.download = `volumen_3d_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`
      link.href = dataURL
      link.click()

      console.log('📸 Captura 3D guardada exitosamente')
    } catch (error) {
      console.error('❌ Error tomando captura 3D:', error)
    }
  }

  /**
   * Redimensiona el renderer cuando cambia el tamaño del canvas
   */
  function resizeRenderer(width, height) {
    if (!renderer || !camera) return

    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()

    console.log(`📐 Renderer redimensionado: ${width}x${height}`)
  }

  // ============================================
  // 📤 RETURN - EXPORTAR TODO
  // ============================================

  return {
    // Getters para variables globales
    getRenderer: () => renderer,
    getScene: () => scene,
    getCamera: () => camera,
    getControls: () => controls,
    getVolumeMesh: () => volumeMesh,
    getVolumeTexture: () => volumeTexture,
    getAnimationId: () => animationId,

    // Estado reactivo
    performanceInfo3D,
    threeDConfig,
    advancedControls,
    aiRenderingConfig,
    colorPresets,
    selectedColorPreset,

    // Funciones principales
    initThree,
    animate3D,
    create3DVolumeFromExistingData,
    createVolumeMesh3D,
    updateUniforms3D,
    debouncedUpdateUniforms3D,
    cleanup3DResources,

    // Funciones auxiliares
    applyColorPreset,
    resetToDefaults,
    takeScreenshot3D,
    resizeRenderer,
    adjustAdaptiveLOD,
    monitorWebGLMemory
  }
}
