/**
 * 🖼️ useFourViews3D.js
 *
 * Composable para gestión de vista cuádruple (4 vistas simultáneas)
 *
 * Funcionalidades:
 * - Gestión de 4 vistas: Axial, Coronal, Sagital y 3D
 * - Layout responsive de cuadrantes
 * - Sincronización entre vistas 2D y 3D
 * - Renderizado independiente por cuadrante
 * - Gestión de canvas múltiples
 * - Redimensionamiento automático
 *
 * @author Richard - Sistema de Cuatro Vistas del Visor Médico
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

/**
 * Composable para gestión de cuatro vistas simultáneas
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones para manejo de cuatro vistas
 */
export function useFourViews3D(options = {}) {

  // ============================================
  // 📦 OPCIONES Y CONFIGURACIÓN
  // ============================================

  const config = {
    enableSync: options.enableSync !== false,        // Sincronización entre vistas
    enable3DView: options.enable3DView !== false,    // Habilitar vista 3D
    defaultLayout: options.defaultLayout || 'quad',  // 'quad' o 'custom'
    padding: options.padding || 5,                   // Padding entre cuadrantes (px)
    backgroundColor: options.backgroundColor || '#1a1a1a'
  }

  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Estado de activación de la vista cuádruple
   */
  const quadViewActive = ref(false)

  /**
   * Referencias a los canvas de cada cuadrante
   */
  const canvasRefs = reactive({
    axial: ref(null),
    coronal: ref(null),
    sagittal: ref(null),
    view3d: ref(null)
  })

  /**
   * Contextos 2D de los canvas
   */
  const canvasContexts = reactive({
    axial: null,
    coronal: null,
    sagittal: null
  })

  /**
   * Dimensiones de cada cuadrante
   */
  const quadrantDimensions = reactive({
    axial: { width: 0, height: 0 },
    coronal: { width: 0, height: 0 },
    sagittal: { width: 0, height: 0 },
    view3d: { width: 0, height: 0 }
  })

  /**
   * Estado de la vista 3D en el cuadrante
   */
  const view3DState = reactive({
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    volumeMesh: null,
    animationId: null,
    isInitialized: false
  })

  /**
   * Contenedor principal de las cuatro vistas
   */
  const quadViewContainer = ref(null)

  /**
   * Estado de carga de cada vista
   */
  const loadingState = reactive({
    axial: false,
    coronal: false,
    sagittal: false,
    view3d: false
  })

  /**
   * Configuración del layout de cuadrantes
   */
  const layoutConfig = reactive({
    columns: 2,
    rows: 2,
    gap: config.padding,
    aspectRatio: 'auto' // 'auto', '1:1', '4:3', '16:9'
  })

  /**
   * Estado de visibilidad de cada cuadrante
   */
  const quadrantVisibility = reactive({
    axial: true,
    coronal: true,
    sagittal: true,
    view3d: true
  })

  /**
   * Cuadrante actualmente enfocado
   */
  const focusedQuadrant = ref(null)

  /**
   * Estado de hover sobre cuadrantes
   */
  const quadrantHover = reactive({
    axial: false,
    coronal: false,
    sagittal: false,
    view3d: false
  })

  // ============================================
  // 🎨 FUNCIONES DE LAYOUT Y DIMENSIONES
  // ============================================

  /**
   * Calcula las dimensiones de cada cuadrante basado en el contenedor
   */
  function calculateQuadrantDimensions() {
    if (!quadViewContainer.value) {
      console.warn('⚠️ Contenedor de cuatro vistas no disponible')
      return
    }

    const container = quadViewContainer.value
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const gap = layoutConfig.gap

    // Calcular dimensiones de cada cuadrante (2x2 grid)
    const quadWidth = Math.floor((containerWidth - gap * 3) / 2)
    const quadHeight = Math.floor((containerHeight - gap * 3) / 2)

    // Actualizar dimensiones
    quadrantDimensions.axial.width = quadWidth
    quadrantDimensions.axial.height = quadHeight
    quadrantDimensions.coronal.width = quadWidth
    quadrantDimensions.coronal.height = quadHeight
    quadrantDimensions.sagittal.width = quadWidth
    quadrantDimensions.sagittal.height = quadHeight
    quadrantDimensions.view3d.width = quadWidth
    quadrantDimensions.view3d.height = quadHeight

    console.log('📐 Dimensiones de cuadrantes calculadas:', {
      container: { width: containerWidth, height: containerHeight },
      quadrant: { width: quadWidth, height: quadHeight }
    })
  }

  /**
   * Redimensiona todos los canvas al tamaño de sus cuadrantes
   */
  function resizeAllCanvases() {
    // Redimensionar canvas 2D
    Object.keys(canvasRefs).forEach(view => {
      if (view === 'view3d') return // El 3D se maneja aparte

      const canvas = canvasRefs[view].value
      if (canvas) {
        const dim = quadrantDimensions[view]
        canvas.width = dim.width
        canvas.height = dim.height

        // Actualizar contexto
        canvasContexts[view] = canvas.getContext('2d')
      }
    })

    // Redimensionar vista 3D
    resize3DView()
  }

  /**
   * Redimensiona la vista 3D
   */
  function resize3DView() {
    if (!view3DState.renderer || !view3DState.camera) {
      return
    }

    const dim = quadrantDimensions.view3d

    // Actualizar tamaño del renderer
    view3DState.renderer.setSize(dim.width, dim.height)

    // Actualizar aspecto de la cámara
    view3DState.camera.aspect = dim.width / dim.height
    view3DState.camera.updateProjectionMatrix()

    console.log('🔄 Vista 3D redimensionada:', dim)
  }

  /**
   * Calcula la posición de un cuadrante en el layout
   * @param {string} quadrant - Nombre del cuadrante
   * @returns {Object} {x, y, width, height} en píxeles
   */
  function getQuadrantPosition(quadrant) {
    const gap = layoutConfig.gap
    const dim = quadrantDimensions[quadrant]

    const positions = {
      axial: {
        x: gap,
        y: gap
      },
      coronal: {
        x: dim.width + gap * 2,
        y: gap
      },
      sagittal: {
        x: gap,
        y: dim.height + gap * 2
      },
      view3d: {
        x: dim.width + gap * 2,
        y: dim.height + gap * 2
      }
    }

    return {
      ...positions[quadrant],
      width: dim.width,
      height: dim.height
    }
  }

  // ============================================
  // 🎬 INICIALIZACIÓN Y LIMPIEZA
  // ============================================

  /**
   * Inicializa la vista cuádruple
   */
  async function initializeQuadView() {
    console.log('🎬 Inicializando vista cuádruple...')

    try {
      quadViewActive.value = true

      await nextTick()

      // Calcular dimensiones
      calculateQuadrantDimensions()

      // Redimensionar canvas
      resizeAllCanvases()

      // Inicializar vista 3D si está habilitada
      if (config.enable3DView) {
        await initialize3DView()
      }

      console.log('✅ Vista cuádruple inicializada correctamente')

      return true
    } catch (error) {
      console.error('❌ Error inicializando vista cuádruple:', error)
      return false
    }
  }

  /**
   * Inicializa la vista 3D en el cuadrante
   */
  async function initialize3DView() {
    const canvas = canvasRefs.view3d.value
    if (!canvas) {
      console.warn('⚠️ Canvas 3D no disponible')
      return
    }

    try {
      console.log('🎨 Inicializando vista 3D en cuadrante...')

      // Crear renderer
      view3DState.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      })
      view3DState.renderer.setSize(
        quadrantDimensions.view3d.width,
        quadrantDimensions.view3d.height
      )
      view3DState.renderer.setClearColor(0x000000, 1)

      // Crear escena
      view3DState.scene = new THREE.Scene()
      view3DState.scene.background = new THREE.Color(0x1a1a1a)

      // Crear cámara
      const aspect = quadrantDimensions.view3d.width / quadrantDimensions.view3d.height
      view3DState.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
      view3DState.camera.position.set(2, 2, 2)
      view3DState.camera.lookAt(0, 0, 0)

      // Crear controles
      view3DState.controls = new OrbitControls(view3DState.camera, canvas)
      view3DState.controls.enableDamping = true
      view3DState.controls.dampingFactor = 0.05
      view3DState.controls.rotateSpeed = 0.5
      view3DState.controls.zoomSpeed = 0.8

      // Añadir iluminación básica
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      view3DState.scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(1, 1, 1)
      view3DState.scene.add(directionalLight)

      // Añadir ejes de referencia (opcional)
      const axesHelper = new THREE.AxesHelper(1.5)
      view3DState.scene.add(axesHelper)

      view3DState.isInitialized = true

      // Iniciar loop de animación
      start3DAnimation()

      console.log('✅ Vista 3D en cuadrante inicializada')

    } catch (error) {
      console.error('❌ Error inicializando vista 3D:', error)
    }
  }

  /**
   * Inicia el loop de animación de la vista 3D
   */
  function start3DAnimation() {
    if (!view3DState.renderer || !view3DState.scene || !view3DState.camera) {
      return
    }

    const animate = () => {
      view3DState.animationId = requestAnimationFrame(animate)

      // Actualizar controles
      if (view3DState.controls) {
        view3DState.controls.update()
      }

      // Renderizar escena
      view3DState.renderer.render(view3DState.scene, view3DState.camera)
    }

    animate()
  }

  /**
   * Detiene el loop de animación de la vista 3D
   */
  function stop3DAnimation() {
    if (view3DState.animationId) {
      cancelAnimationFrame(view3DState.animationId)
      view3DState.animationId = null
    }
  }

  /**
   * Limpia recursos de la vista cuádruple
   */
  function cleanupQuadView() {
    console.log('🧹 Limpiando vista cuádruple...')

    // Detener animación 3D
    stop3DAnimation()

    // Limpiar vista 3D
    if (view3DState.renderer) {
      view3DState.renderer.dispose()
      view3DState.renderer = null
    }

    if (view3DState.controls) {
      view3DState.controls.dispose()
      view3DState.controls = null
    }

    if (view3DState.scene) {
      view3DState.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      view3DState.scene.clear()
      view3DState.scene = null
    }

    view3DState.camera = null
    view3DState.volumeMesh = null
    view3DState.isInitialized = false

    // Limpiar contextos de canvas 2D
    Object.keys(canvasContexts).forEach(view => {
      canvasContexts[view] = null
    })

    quadViewActive.value = false

    console.log('✅ Vista cuádruple limpiada')
  }

  /**
   * Desactiva la vista cuádruple y vuelve a vista individual
   */
  function deactivateQuadView() {
    cleanupQuadView()
    quadViewActive.value = false
  }

  // ============================================
  // 🔄 FUNCIONES DE ACTUALIZACIÓN
  // ============================================

  /**
   * Actualiza el volumen 3D en el cuadrante
   * @param {THREE.Mesh} volumeMesh - Mesh del volumen
   */
  function update3DVolume(volumeMesh) {
    if (!view3DState.scene || !volumeMesh) {
      console.warn('⚠️ No se puede actualizar volumen 3D')
      return
    }

    // Remover volumen anterior si existe
    if (view3DState.volumeMesh) {
      view3DState.scene.remove(view3DState.volumeMesh)
    }

    // Añadir nuevo volumen
    view3DState.volumeMesh = volumeMesh
    view3DState.scene.add(volumeMesh)

    console.log('✅ Volumen 3D actualizado en cuadrante')
  }

  /**
   * Actualiza una vista 2D específica
   * @param {string} view - Vista a actualizar ('axial', 'coronal', 'sagittal')
   * @param {ImageData} imageData - Datos de imagen
   */
  function update2DView(view, imageData) {
    const ctx = canvasContexts[view]
    if (!ctx || !imageData) {
      return
    }

    // Limpiar canvas
    const dim = quadrantDimensions[view]
    ctx.clearRect(0, 0, dim.width, dim.height)

    // Dibujar imagen escalada
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(imageData, 0, 0)

    ctx.drawImage(tempCanvas, 0, 0, dim.width, dim.height)
  }

  /**
   * Refresca todas las vistas
   */
  function refreshAllViews() {
    if (!quadViewActive.value) return

    calculateQuadrantDimensions()
    resizeAllCanvases()
  }

  // ============================================
  // 🎯 FUNCIONES DE ENFOQUE Y NAVEGACIÓN
  // ============================================

  /**
   * Enfoca un cuadrante específico
   * @param {string} quadrant - Cuadrante a enfocar
   */
  function focusQuadrant(quadrant) {
    focusedQuadrant.value = quadrant
    console.log(`🎯 Cuadrante enfocado: ${quadrant}`)
  }

  /**
   * Desenfoca todos los cuadrantes
   */
  function unfocusQuadrant() {
    focusedQuadrant.value = null
  }

  /**
   * Alterna la visibilidad de un cuadrante
   * @param {string} quadrant - Cuadrante
   */
  function toggleQuadrantVisibility(quadrant) {
    quadrantVisibility[quadrant] = !quadrantVisibility[quadrant]
  }

  /**
   * Maximiza un cuadrante (oculta los demás)
   * @param {string} quadrant - Cuadrante a maximizar
   */
  function maximizeQuadrant(quadrant) {
    Object.keys(quadrantVisibility).forEach(key => {
      quadrantVisibility[key] = key === quadrant
    })
  }

  /**
   * Restaura la visibilidad de todos los cuadrantes
   */
  function restoreAllQuadrants() {
    Object.keys(quadrantVisibility).forEach(key => {
      quadrantVisibility[key] = true
    })
  }

  // ============================================
  // 🎨 FUNCIONES DE RENDERIZADO
  // ============================================

  /**
   * Dibuja bordes en los cuadrantes
   * @param {string} view - Vista
   * @param {string} color - Color del borde
   * @param {number} width - Ancho del borde
   */
  function drawQuadrantBorder(view, color = '#00FF00', width = 2) {
    const ctx = canvasContexts[view]
    if (!ctx) return

    const dim = quadrantDimensions[view]

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.strokeRect(0, 0, dim.width, dim.height)
    ctx.restore()
  }

  /**
   * Dibuja etiqueta de vista en el cuadrante
   * @param {string} view - Vista
   * @param {string} label - Etiqueta a mostrar
   */
  function drawQuadrantLabel(view, label) {
    const ctx = canvasContexts[view]
    if (!ctx) return

    ctx.save()
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)'
    ctx.font = 'bold 14px Arial'
    ctx.fillText(label, 10, 20)
    ctx.restore()
  }

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  /**
   * Estado general de las cuatro vistas
   */
  const quadViewState = computed(() => ({
    isActive: quadViewActive.value,
    is3DInitialized: view3DState.isInitialized,
    focusedQuadrant: focusedQuadrant.value,
    visibleQuadrants: Object.entries(quadrantVisibility)
      .filter(([_, visible]) => visible)
      .map(([name]) => name)
  }))

  /**
   * Número de cuadrantes visibles
   */
  const visibleQuadrantCount = computed(() =>
    Object.values(quadrantVisibility).filter(v => v).length
  )

  /**
   * Verifica si todas las vistas están cargadas
   */
  const allViewsLoaded = computed(() =>
    !Object.values(loadingState).some(loading => loading)
  )

  // ============================================
  // 👁️ WATCHERS
  // ============================================

  /**
   * Watch para redimensionar cuando cambie el estado de activación
   */
  watch(quadViewActive, async (newValue) => {
    if (newValue) {
      await nextTick()
      refreshAllViews()
    }
  })

  /**
   * Watch para redimensionar cuando cambien las dimensiones del contenedor
   */
  watch(() => quadViewContainer.value, async (newContainer) => {
    if (newContainer && quadViewActive.value) {
      await nextTick()
      refreshAllViews()
    }
  })

  // ============================================
  // 🎬 LIFECYCLE HOOKS
  // ============================================

  /**
   * Configurar resize observer
   */
  let resizeObserver = null

  onMounted(() => {
    if (quadViewContainer.value) {
      resizeObserver = new ResizeObserver(() => {
        if (quadViewActive.value) {
          refreshAllViews()
        }
      })
      resizeObserver.observe(quadViewContainer.value)
    }
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    cleanupQuadView()
  })

  // ============================================
  // 📤 RETORNO DEL COMPOSABLE
  // ============================================

  return {
    // Estado reactivo
    quadViewActive,
    canvasRefs,
    canvasContexts,
    quadrantDimensions,
    view3DState,
    quadViewContainer,
    loadingState,
    layoutConfig,
    quadrantVisibility,
    focusedQuadrant,
    quadrantHover,

    // Funciones de layout
    calculateQuadrantDimensions,
    resizeAllCanvases,
    resize3DView,
    getQuadrantPosition,

    // Funciones de inicialización
    initializeQuadView,
    initialize3DView,
    cleanupQuadView,
    deactivateQuadView,
    start3DAnimation,
    stop3DAnimation,

    // Funciones de actualización
    update3DVolume,
    update2DView,
    refreshAllViews,

    // Funciones de enfoque
    focusQuadrant,
    unfocusQuadrant,
    toggleQuadrantVisibility,
    maximizeQuadrant,
    restoreAllQuadrants,

    // Funciones de renderizado
    drawQuadrantBorder,
    drawQuadrantLabel,

    // Computed properties
    quadViewState,
    visibleQuadrantCount,
    allViewsLoaded
  }
}
