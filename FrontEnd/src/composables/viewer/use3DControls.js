/**
 * 🎮 use3DControls.js
 *
 * Composable para controles de cámara y navegación en vista 3D
 *
 * Funcionalidades:
 * - Controles de órbita (OrbitControls)
 * - Rotación de cámara (manual y automática)
 * - Zoom 3D
 * - Pan 3D
 * - Presets de cámara (vistas predefinidas)
 * - Animaciones suaves de cámara
 * - Control de velocidad
 * - Reset de cámara
 * - Límites de rotación y zoom
 * - Enfoque en puntos específicos
 *
 * @author Richard - Sistema de Controles 3D del Visor Médico
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'

/**
 * Composable para controles 3D
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para controles 3D
 */
export function use3DControls(options = {}) {

  // ============================================
  // 📦 CONFIGURACIÓN
  // ============================================

  const config = {
    enableDamping: options.enableDamping !== false,
    dampingFactor: options.dampingFactor || 0.05,
    rotateSpeed: options.rotateSpeed || 0.5,
    zoomSpeed: options.zoomSpeed || 0.8,
    panSpeed: options.panSpeed || 0.5,
    minDistance: options.minDistance || 0.5,
    maxDistance: options.maxDistance || 20,
    minPolarAngle: options.minPolarAngle || 0,
    maxPolarAngle: options.maxPolarAngle || Math.PI,
    minAzimuthAngle: options.minAzimuthAngle || -Infinity,
    maxAzimuthAngle: options.maxAzimuthAngle || Infinity,
    enableAutoRotate: options.enableAutoRotate || false,
    autoRotateSpeed: options.autoRotateSpeed || 2.0,
    animationDuration: options.animationDuration || 1000 // ms
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Instancia de OrbitControls
   */
  const controls = ref(null)

  /**
   * Cámara asociada
   */
  const camera = ref(null)

  /**
   * Canvas/renderer asociado
   */
  const domElement = ref(null)

  /**
   * Estado de inicialización
   */
  const isInitialized = ref(false)

  /**
   * Estado de rotación automática
   */
  const autoRotate = reactive({
    enabled: config.enableAutoRotate,
    speed: config.autoRotateSpeed,
    direction: 1 // 1 = horario, -1 = antihorario
  })

  /**
   * Estado de animación de cámara
   */
  const cameraAnimation = reactive({
    active: false,
    startPosition: null,
    endPosition: null,
    startTarget: null,
    endTarget: null,
    startTime: 0,
    duration: config.animationDuration,
    onComplete: null
  })

  /**
   * Posición y target inicial (para reset)
   */
  const initialState = reactive({
    position: { x: 2, y: 2, z: 2 },
    target: { x: 0, y: 0, z: 0 }
  })

  /**
   * Configuración de controles
   */
  const controlsConfig = reactive({
    enableDamping: config.enableDamping,
    dampingFactor: config.dampingFactor,
    rotateSpeed: config.rotateSpeed,
    zoomSpeed: config.zoomSpeed,
    panSpeed: config.panSpeed,
    minDistance: config.minDistance,
    maxDistance: config.maxDistance,
    minPolarAngle: config.minPolarAngle,
    maxPolarAngle: config.maxPolarAngle,
    minAzimuthAngle: config.minAzimuthAngle,
    maxAzimuthAngle: config.maxAzimuthAngle
  })

  /**
   * Estado de interacción
   */
  const interactionState = reactive({
    isRotating: false,
    isPanning: false,
    isZooming: false,
    lastInteractionTime: 0
  })

  /**
   * ID del frame de animación
   */
  let animationFrameId = null

  // ============================================
  // 🎬 INICIALIZACIÓN
  // ============================================

  /**
   * Inicializa los controles 3D
   * @param {THREE.Camera} cam - Cámara de Three.js
   * @param {HTMLElement} element - Elemento DOM (canvas)
   * @returns {OrbitControls} Instancia de controles
   */
  function initialize(cam, element) {
    if (isInitialized.value) {
      console.warn('⚠️ Controles 3D ya están inicializados')
      return controls.value
    }

    try {
      console.log('🎬 Inicializando controles 3D...')

      camera.value = cam
      domElement.value = element

      // Crear OrbitControls
      controls.value = new OrbitControls(cam, element)

      // Aplicar configuración
      applyControlsConfig()

      // Guardar estado inicial
      saveInitialState()

      // Configurar event listeners
      setupEventListeners()

      isInitialized.value = true

      console.log('✅ Controles 3D inicializados')

      return controls.value

    } catch (error) {
      console.error('❌ Error inicializando controles 3D:', error)
      return null
    }
  }

  /**
   * Aplica la configuración a los controles
   */
  function applyControlsConfig() {
    if (!controls.value) return

    const ctrl = controls.value

    ctrl.enableDamping = controlsConfig.enableDamping
    ctrl.dampingFactor = controlsConfig.dampingFactor
    ctrl.rotateSpeed = controlsConfig.rotateSpeed
    ctrl.zoomSpeed = controlsConfig.zoomSpeed
    ctrl.panSpeed = controlsConfig.panSpeed
    ctrl.minDistance = controlsConfig.minDistance
    ctrl.maxDistance = controlsConfig.maxDistance
    ctrl.minPolarAngle = controlsConfig.minPolarAngle
    ctrl.maxPolarAngle = controlsConfig.maxPolarAngle
    ctrl.minAzimuthAngle = controlsConfig.minAzimuthAngle
    ctrl.maxAzimuthAngle = controlsConfig.maxAzimuthAngle
    ctrl.autoRotate = autoRotate.enabled
    ctrl.autoRotateSpeed = autoRotate.speed * autoRotate.direction

    // Habilitar/deshabilitar controles
    ctrl.enableRotate = true
    ctrl.enableZoom = true
    ctrl.enablePan = true
  }

  /**
   * Guarda el estado inicial de la cámara
   */
  function saveInitialState() {
    if (!camera.value || !controls.value) return

    initialState.position = {
      x: camera.value.position.x,
      y: camera.value.position.y,
      z: camera.value.position.z
    }

    initialState.target = {
      x: controls.value.target.x,
      y: controls.value.target.y,
      z: controls.value.target.z
    }
  }

  /**
   * Configura event listeners para detectar interacciones
   */
  function setupEventListeners() {
    if (!controls.value) return

    controls.value.addEventListener('start', () => {
      interactionState.isRotating = true
      interactionState.lastInteractionTime = Date.now()
    })

    controls.value.addEventListener('end', () => {
      interactionState.isRotating = false
    })

    controls.value.addEventListener('change', () => {
      interactionState.lastInteractionTime = Date.now()
    })
  }

  // ============================================
  // 🎮 FUNCIONES DE CONTROL BÁSICO
  // ============================================

  /**
   * Actualiza los controles (llamar en loop de animación)
   */
  function update() {
    if (!controls.value) return

    // Actualizar animación de cámara si está activa
    if (cameraAnimation.active) {
      updateCameraAnimation()
    }

    controls.value.update()
  }

  /**
   * Resetea la cámara a su posición inicial
   * @param {boolean} animate - Animar la transición
   */
  function reset(animate = true) {
    if (!camera.value || !controls.value) return

    const targetPosition = new THREE.Vector3(
      initialState.position.x,
      initialState.position.y,
      initialState.position.z
    )

    const targetLookAt = new THREE.Vector3(
      initialState.target.x,
      initialState.target.y,
      initialState.target.z
    )

    if (animate) {
      animateCameraTo(targetPosition, targetLookAt)
    } else {
      camera.value.position.copy(targetPosition)
      controls.value.target.copy(targetLookAt)
      controls.value.update()
    }

    console.log('🔄 Cámara reseteada')
  }

  /**
   * Habilita/deshabilita los controles
   * @param {boolean} enabled - Habilitar
   */
  function setEnabled(enabled) {
    if (!controls.value) return

    controls.value.enabled = enabled
    console.log(`🎮 Controles ${enabled ? 'habilitados' : 'deshabilitados'}`)
  }

  /**
   * Dispone los controles y limpia recursos
   */
  function dispose() {
    if (!controls.value) return

    console.log('🧹 Limpiando controles 3D...')

    controls.value.dispose()
    controls.value = null
    camera.value = null
    domElement.value = null
    isInitialized.value = false

    // Cancelar animación si está activa
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    console.log('✅ Controles 3D limpiados')
  }

  // ============================================
  // 📹 PRESETS DE CÁMARA
  // ============================================

  /**
   * Presets de vistas de cámara
   */
  const cameraPresets = {
    front: {
      position: { x: 0, y: 0, z: 3 },
      target: { x: 0, y: 0, z: 0 },
      name: 'Vista Frontal'
    },
    back: {
      position: { x: 0, y: 0, z: -3 },
      target: { x: 0, y: 0, z: 0 },
      name: 'Vista Posterior'
    },
    left: {
      position: { x: -3, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: 'Vista Izquierda'
    },
    right: {
      position: { x: 3, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: 'Vista Derecha'
    },
    top: {
      position: { x: 0, y: 3, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: 'Vista Superior'
    },
    bottom: {
      position: { x: 0, y: -3, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: 'Vista Inferior'
    },
    isometric: {
      position: { x: 2, y: 2, z: 2 },
      target: { x: 0, y: 0, z: 0 },
      name: 'Vista Isométrica'
    },
    diagonal: {
      position: { x: -2, y: 2, z: 2 },
      target: { x: 0, y: 0, z: 0 },
      name: 'Vista Diagonal'
    }
  }

  /**
   * Aplica un preset de cámara
   * @param {string} presetName - Nombre del preset
   * @param {boolean} animate - Animar la transición
   */
  function applyCameraPreset(presetName, animate = true) {
    const preset = cameraPresets[presetName]

    if (!preset) {
      console.warn(`⚠️ Preset de cámara desconocido: ${presetName}`)
      return
    }

    const position = new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z)
    const target = new THREE.Vector3(preset.target.x, preset.target.y, preset.target.z)

    if (animate) {
      animateCameraTo(position, target)
    } else {
      camera.value.position.copy(position)
      controls.value.target.copy(target)
      controls.value.update()
    }

    console.log(`📹 Preset aplicado: ${preset.name}`)
  }

  // ============================================
  // 🎬 ANIMACIÓN DE CÁMARA
  // ============================================

  /**
   * Anima la cámara a una posición específica
   * @param {THREE.Vector3} targetPosition - Posición destino
   * @param {THREE.Vector3} targetLookAt - Target destino
   * @param {number} duration - Duración en ms
   * @param {Function} onComplete - Callback al completar
   */
  function animateCameraTo(targetPosition, targetLookAt, duration = null, onComplete = null) {
    if (!camera.value || !controls.value) return

    cameraAnimation.active = true
    cameraAnimation.startPosition = camera.value.position.clone()
    cameraAnimation.endPosition = targetPosition.clone()
    cameraAnimation.startTarget = controls.value.target.clone()
    cameraAnimation.endTarget = targetLookAt.clone()
    cameraAnimation.startTime = performance.now()
    cameraAnimation.duration = duration || config.animationDuration
    cameraAnimation.onComplete = onComplete

    console.log('🎬 Animación de cámara iniciada')
  }

  /**
   * Actualiza la animación de cámara (llamar en cada frame)
   */
  function updateCameraAnimation() {
    if (!cameraAnimation.active || !camera.value || !controls.value) return

    const elapsed = performance.now() - cameraAnimation.startTime
    const progress = Math.min(elapsed / cameraAnimation.duration, 1)

    // Ease in-out cubic
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2

    // Interpolar posición
    camera.value.position.lerpVectors(
      cameraAnimation.startPosition,
      cameraAnimation.endPosition,
      eased
    )

    // Interpolar target
    controls.value.target.lerpVectors(
      cameraAnimation.startTarget,
      cameraAnimation.endTarget,
      eased
    )

    controls.value.update()

    // Completar animación
    if (progress >= 1) {
      cameraAnimation.active = false

      if (cameraAnimation.onComplete) {
        cameraAnimation.onComplete()
      }

      console.log('✅ Animación de cámara completada')
    }
  }

  /**
   * Cancela la animación de cámara actual
   */
  function cancelCameraAnimation() {
    if (cameraAnimation.active) {
      cameraAnimation.active = false
      console.log('⏹️ Animación de cámara cancelada')
    }
  }

  // ============================================
  // 🔄 ROTACIÓN AUTOMÁTICA
  // ============================================

  /**
   * Activa/desactiva la rotación automática
   * @param {boolean} enabled - Habilitar
   */
  function setAutoRotate(enabled) {
    autoRotate.enabled = enabled

    if (controls.value) {
      controls.value.autoRotate = enabled
    }

    console.log(`🔄 Rotación automática ${enabled ? 'activada' : 'desactivada'}`)
  }

  /**
   * Alterna la rotación automática
   */
  function toggleAutoRotate() {
    setAutoRotate(!autoRotate.enabled)
  }

  /**
   * Establece la velocidad de rotación automática
   * @param {number} speed - Velocidad
   */
  function setAutoRotateSpeed(speed) {
    autoRotate.speed = speed

    if (controls.value) {
      controls.value.autoRotateSpeed = speed * autoRotate.direction
    }
  }

  /**
   * Invierte la dirección de rotación automática
   */
  function reverseAutoRotateDirection() {
    autoRotate.direction *= -1

    if (controls.value) {
      controls.value.autoRotateSpeed = autoRotate.speed * autoRotate.direction
    }

    console.log(`🔄 Dirección de rotación invertida`)
  }

  // ============================================
  // 🎯 ENFOQUE EN OBJETOS
  // ============================================

  /**
   * Enfoca la cámara en un punto específico
   * @param {THREE.Vector3} point - Punto a enfocar
   * @param {number} distance - Distancia desde el punto
   * @param {boolean} animate - Animar
   */
  function focusOnPoint(point, distance = 3, animate = true) {
    if (!camera.value || !controls.value) return

    // Calcular dirección desde el punto hacia la cámara actual
    const direction = camera.value.position.clone().sub(point).normalize()

    // Nueva posición de cámara
    const newPosition = point.clone().add(direction.multiplyScalar(distance))

    if (animate) {
      animateCameraTo(newPosition, point)
    } else {
      camera.value.position.copy(newPosition)
      controls.value.target.copy(point)
      controls.value.update()
    }

    console.log('🎯 Enfocando en punto:', point)
  }

  /**
   * Enfoca la cámara en un objeto 3D
   * @param {THREE.Object3D} object - Objeto a enfocar
   * @param {number} marginFactor - Factor de margen (1.5 = 150% del tamaño)
   * @param {boolean} animate - Animar
   */
  function focusOnObject(object, marginFactor = 1.5, animate = true) {
    if (!camera.value || !controls.value || !object) return

    // Calcular bounding box del objeto
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // Calcular distancia necesaria para ver todo el objeto
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.value.fov * (Math.PI / 180)
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * marginFactor

    focusOnPoint(center, distance, animate)
  }

  /**
   * Enfoca la cámara en una región (bounding box)
   * @param {THREE.Box3} box - Bounding box
   * @param {number} marginFactor - Factor de margen
   * @param {boolean} animate - Animar
   */
  function focusOnBoundingBox(box, marginFactor = 1.5, animate = true) {
    if (!camera.value || !controls.value || !box) return

    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.value.fov * (Math.PI / 180)
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * marginFactor

    focusOnPoint(center, distance, animate)
  }

  // ============================================
  // ⚙️ CONFIGURACIÓN DINÁMICA
  // ============================================

  /**
   * Actualiza una configuración específica
   * @param {string} key - Clave de configuración
   * @param {*} value - Valor
   */
  function updateConfig(key, value) {
    if (controlsConfig.hasOwnProperty(key)) {
      controlsConfig[key] = value
      applyControlsConfig()
      console.log(`⚙️ Configuración actualizada: ${key} = ${value}`)
    }
  }

  /**
   * Actualiza múltiples configuraciones
   * @param {Object} config - Objeto con configuraciones
   */
  function updateConfigs(config) {
    Object.keys(config).forEach(key => {
      if (controlsConfig.hasOwnProperty(key)) {
        controlsConfig[key] = config[key]
      }
    })
    applyControlsConfig()
    console.log('⚙️ Configuraciones actualizadas')
  }

  /**
   * Establece límites de rotación polar (vertical)
   * @param {number} min - Ángulo mínimo (radianes)
   * @param {number} max - Ángulo máximo (radianes)
   */
  function setPolarLimits(min, max) {
    controlsConfig.minPolarAngle = min
    controlsConfig.maxPolarAngle = max

    if (controls.value) {
      controls.value.minPolarAngle = min
      controls.value.maxPolarAngle = max
    }
  }

  /**
   * Establece límites de rotación azimutal (horizontal)
   * @param {number} min - Ángulo mínimo (radianes)
   * @param {number} max - Ángulo máximo (radianes)
   */
  function setAzimuthLimits(min, max) {
    controlsConfig.minAzimuthAngle = min
    controlsConfig.maxAzimuthAngle = max

    if (controls.value) {
      controls.value.minAzimuthAngle = min
      controls.value.maxAzimuthAngle = max
    }
  }

  /**
   * Establece límites de zoom (distancia)
   * @param {number} min - Distancia mínima
   * @param {number} max - Distancia máxima
   */
  function setZoomLimits(min, max) {
    controlsConfig.minDistance = min
    controlsConfig.maxDistance = max

    if (controls.value) {
      controls.value.minDistance = min
      controls.value.maxDistance = max
    }
  }

  /**
   * Elimina todos los límites de rotación y zoom
   */
  function removeAllLimits() {
    setPolarLimits(0, Math.PI)
    setAzimuthLimits(-Infinity, Infinity)
    setZoomLimits(0, Infinity)
    console.log('🔓 Límites eliminados')
  }

  // ============================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================

  /**
   * Obtiene la posición actual de la cámara
   * @returns {Object} {x, y, z}
   */
  function getCameraPosition() {
    if (!camera.value) return null

    return {
      x: camera.value.position.x,
      y: camera.value.position.y,
      z: camera.value.position.z
    }
  }

  /**
   * Obtiene el target actual de los controles
   * @returns {Object} {x, y, z}
   */
  function getTarget() {
    if (!controls.value) return null

    return {
      x: controls.value.target.x,
      y: controls.value.target.y,
      z: controls.value.target.z
    }
  }

  /**
   * Obtiene la distancia actual desde la cámara al target
   * @returns {number} Distancia
   */
  function getDistance() {
    if (!camera.value || !controls.value) return 0

    return camera.value.position.distanceTo(controls.value.target)
  }

  /**
   * Obtiene los ángulos actuales de la cámara
   * @returns {Object} {polar, azimuth} en radianes
   */
  function getCameraAngles() {
    if (!camera.value || !controls.value) return null

    const offset = camera.value.position.clone().sub(controls.value.target)

    // Polar (vertical): 0 a PI
    const polar = Math.acos(
      Math.max(-1, Math.min(1, offset.y / offset.length()))
    )

    // Azimuth (horizontal): -PI a PI
    const azimuth = Math.atan2(offset.x, offset.z)

    return {
      polar,
      azimuth,
      polarDegrees: polar * (180 / Math.PI),
      azimuthDegrees: azimuth * (180 / Math.PI)
    }
  }

  /**
   * Obtiene información completa del estado de los controles
   * @returns {Object} Información de controles
   */
  function getControlsInfo() {
    return {
      isInitialized: isInitialized.value,
      cameraPosition: getCameraPosition(),
      target: getTarget(),
      distance: getDistance(),
      angles: getCameraAngles(),
      autoRotate: {
        enabled: autoRotate.enabled,
        speed: autoRotate.speed,
        direction: autoRotate.direction
      },
      isAnimating: cameraAnimation.active,
      interaction: { ...interactionState },
      config: { ...controlsConfig }
    }
  }

  /**
   * Guarda el estado actual de la cámara
   * @returns {Object} Estado guardado
   */
  function saveState() {
    return {
      position: getCameraPosition(),
      target: getTarget(),
      timestamp: Date.now()
    }
  }

  /**
   * Restaura un estado guardado
   * @param {Object} state - Estado a restaurar
   * @param {boolean} animate - Animar transición
   */
  function restoreState(state, animate = true) {
    if (!state || !state.position || !state.target) return

    const position = new THREE.Vector3(state.position.x, state.position.y, state.position.z)
    const target = new THREE.Vector3(state.target.x, state.target.y, state.target.z)

    if (animate) {
      animateCameraTo(position, target)
    } else {
      camera.value.position.copy(position)
      controls.value.target.copy(target)
      controls.value.update()
    }

    console.log('♻️ Estado de cámara restaurado')
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general de controles 3D
   */
  const controlsState = computed(() => ({
    isInitialized: isInitialized.value,
    isAnimating: cameraAnimation.active,
    autoRotateEnabled: autoRotate.enabled,
    isInteracting: interactionState.isRotating ||
      interactionState.isPanning ||
      interactionState.isZooming
  }))

  /**
   * Información resumida de cámara
   */
  const cameraInfo = computed(() => ({
    position: getCameraPosition(),
    target: getTarget(),
    distance: getDistance(),
    angles: getCameraAngles()
  }))

  // ============================================
  // 👁️ WATCHERS
  // ============================================

  /**
   * Watch para aplicar cambios en configuración
   */
  watch(() => controlsConfig, () => {
    if (isInitialized.value) {
      applyControlsConfig()
    }
  }, { deep: true })

  /**
   * Watch para aplicar cambios en auto-rotate
   */
  watch(() => autoRotate, () => {
    if (controls.value) {
      controls.value.autoRotate = autoRotate.enabled
      controls.value.autoRotateSpeed = autoRotate.speed * autoRotate.direction
    }
  }, { deep: true })

  // ============================================
  // 🎬 LIFECYCLE
  // ============================================

  onUnmounted(() => {
    dispose()
  })

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    controls,
    camera,
    domElement,
    isInitialized,
    autoRotate,
    cameraAnimation,
    initialState,
    controlsConfig,
    interactionState,

    // Inicialización
    initialize,
    applyControlsConfig,
    saveInitialState,
    dispose,

    // Control básico
    update,
    reset,
    setEnabled,

    // Presets de cámara
    cameraPresets,
    applyCameraPreset,

    // Animación de cámara
    animateCameraTo,
    updateCameraAnimation,
    cancelCameraAnimation,

    // Rotación automática
    setAutoRotate,
    toggleAutoRotate,
    setAutoRotateSpeed,
    reverseAutoRotateDirection,

    // Enfoque
    focusOnPoint,
    focusOnObject,
    focusOnBoundingBox,

    // Configuración dinámica
    updateConfig,
    updateConfigs,
    setPolarLimits,
    setAzimuthLimits,
    setZoomLimits,
    removeAllLimits,

    // Funciones auxiliares
    getCameraPosition,
    getTarget,
    getDistance,
    getCameraAngles,
    getControlsInfo,
    saveState,
    restoreState,

    // Computed properties
    controlsState,
    cameraInfo
  }
}
