// composables/viewer/useUIState.js
import { computed, ref } from 'vue'

/**
 * 🎨 Composable para manejo de estados de la interfaz de usuario del dashboard
 *
 * Centraliza todos los estados de visibilidad, paneles, vistas activas y controles de UI
 */
export function useUIState() {
  // ============================================
  // 🖼️ VISTAS PRINCIPALES
  // ============================================

  /**
   * Vista principal activa: 'axial' | 'coronal' | 'sagittal' | '3d'
   */
  const mainView = ref('axial')

  /**
   * Vista cuádruple activada (4 vistas simultáneas)
   */
  const quadViewActive = ref(false)

  /**
   * Indica si la vista 3D está visible
   */
  const show3DView = ref(false)

  // ============================================
  // 🛠️ HERRAMIENTAS ACTIVAS
  // ============================================

  /**
   * Herramienta de zoom activa
   */
  const zoomActive = ref(false)

  /**
   * Herramienta de medición activa
   */
  const measureActive = ref(false)

  /**
   * Herramienta de limpieza/borrado activa
   */
  const limpiarActive = ref(false)

  /**
   * Navegación de slices con scroll activa
   */
  const sliceNavigationActive = ref(true)

  // ============================================
  // 👁️ PANELES Y VISIBILIDAD
  // ============================================

  /**
   * Panel de información visible
   */
  const showInfoPanel = ref(true)

  /**
   * Panel de filtros IA visible
   */
  const showAIFilterPanel = ref(false)

  /**
   * Panel de paciente visible
   */
  const showPatientSection = ref(true)

  /**
   * Información de paciente visible
   */
  const showPatienteInfo = ref(false)

  /**
   * Controles 3D visibles
   */
  const controls3DVisible = ref(true)

  /**
   * Controles avanzados visibles
   */
  const showAdvancedControls = ref(false)

  /**
   * Menú de mediciones visible
   */
  const showMeasurementMenu = ref(false)

  // ============================================
  // 📏 MEDICIONES POR VISTA
  // ============================================

  /**
   * Mostrar mediciones en vista axial
   */
  const showAxialMeasurements = ref(true)

  /**
   * Mostrar mediciones en vista coronal
   */
  const showCoronalMeasurements = ref(true)

  /**
   * Mostrar mediciones en vista sagital
   */
  const showSagittalMeasurements = ref(true)

  // ============================================
  // 🎯 CROSSHAIRS
  // ============================================

  /**
   * Crosshairs visibles en las vistas
   */
  const showCrosshairs = ref(false)

  /**
   * Tooltip de ayuda de crosshairs visible
   */
  const showCrosshairTooltip = ref(false)

  // ============================================
  // 🤖 INTELIGENCIA ARTIFICIAL
  // ============================================

  /**
   * Segmentación IA visible en 3D
   */
  const showIASegmentation3D = ref(false)

  /**
   * Segmentación visible (2D)
   */
  const showSegmentation = ref(false)

  // ============================================
  // 🖼️ IMÁGENES
  // ============================================

  /**
   * Imagen original visible (comparación)
   */
  const showOriginalImage = ref(false)

  /**
   * Puede subir imagen (estado de habilitación)
   */
  const canUploadImage = ref(true)

  // ============================================
  // 📱 SIDEBARS Y SECCIONES COLAPSABLES
  // ============================================

  /**
   * Sidebar izquierdo colapsado
   */
  const leftSidebarCollapsed = ref(false)

  /**
   * Sidebar derecho colapsado
   */
  const rightSidebarCollapsed = ref(false)

  /**
   * Sección inferior colapsada
   */
  const bottomSectionCollapsed = ref(false)

  // ============================================
  // 🔄 ESTADOS DE INTERACCIÓN
  // ============================================

  /**
   * Menú de usuario activo
   */
  const userMenuActive = ref(false)

  /**
   * Editor de diagnóstico activo
   */
  const diagnosisEditorActive = ref(false)

  /**
   * Pantalla completa activa
   */
  const isFullscreenActive = ref(false)

  // ============================================
  // 📋 MODAL
  // ============================================

  /**
   * Modal visible
   */
  const showModal = ref(false)

  /**
   * Paso actual del modal (para wizards multi-paso)
   */
  const currentStep = ref(1)

  // ============================================
  // 📊 CONFIGURACIÓN ACTUAL
  // ============================================

  /**
   * Modalidad actual: 't1n' | 't2' | 'flair' | etc.
   */
  const currentModality = ref('t1n')

  /**
   * Tipo de dato actual (metadata)
   */
  const currentDataType = ref({
    name: '',
    description: '',
    isOptimized: false,
    notes: '',
    hasIssues: false,
    issueType: ''
  })

  /**
   * Orientación actual del volumen
   */
  const currentOrientation = ref({
    axial: { flipX: false, flipY: false, rotation: 0 },
    coronal: { flipX: false, flipY: false, rotation: 0 },
    sagittal: { flipX: false, flipY: false, rotation: 0 }
  })

  /**
   * Usuario actual
   */
  const currentUser = ref(null)

  // ============================================
  // 💡 COMPUTED - ESTADOS DERIVADOS
  // ============================================

  /**
   * Todos los paneles colapsados (maximizar área de trabajo)
   */
  const allCollapsed = computed(() => {
    return leftSidebarCollapsed.value &&
      rightSidebarCollapsed.value &&
      bottomSectionCollapsed.value
  })

  /**
   * Algún panel está colapsado
   */
  const someCollapsed = computed(() => {
    return leftSidebarCollapsed.value ||
      rightSidebarCollapsed.value ||
      bottomSectionCollapsed.value
  })

  /**
   * Modo de trabajo limpio (sin distracciones)
   */
  const cleanWorkMode = computed(() => {
    return !showInfoPanel.value &&
      !showAIFilterPanel.value &&
      allCollapsed.value
  })

  /**
   * Alguna herramienta está activa
   */
  const anyToolActive = computed(() => {
    return zoomActive.value ||
      measureActive.value ||
      limpiarActive.value
  })

  // ============================================
  // 🔧 FUNCIONES DE UTILIDAD
  // ============================================

  /**
   * Cambia la vista principal
   */
  function changeMainView(view) {
    mainView.value = view
    console.log(`🔄 Vista cambiada a: ${view}`)
  }

  /**
   * Activa/desactiva vista cuádruple
   */
  function toggleQuadView() {
    quadViewActive.value = !quadViewActive.value
    console.log(`🖼️ Vista cuádruple: ${quadViewActive.value ? 'ON' : 'OFF'}`)
  }

  /**
   * Colapsa/expande todos los paneles
   */
  function toggleAllPanels() {
    const newState = !allCollapsed.value
    leftSidebarCollapsed.value = newState
    rightSidebarCollapsed.value = newState
    bottomSectionCollapsed.value = newState
    console.log(`📐 Todos los paneles: ${newState ? 'COLAPSADOS' : 'EXPANDIDOS'}`)
  }

  /**
   * Desactiva todas las herramientas
   */
  function deactivateAllTools() {
    zoomActive.value = false
    measureActive.value = false
    limpiarActive.value = false
    console.log('🛠️ Todas las herramientas desactivadas')
  }

  /**
   * Activa una herramienta específica (desactiva las demás)
   */
  function activateTool(tool) {
    deactivateAllTools()

    switch (tool) {
      case 'zoom':
        zoomActive.value = true
        break
      case 'measure':
        measureActive.value = true
        break
      case 'limpiar':
        limpiarActive.value = true
        break
    }

    console.log(`🛠️ Herramienta activada: ${tool}`)
  }

  /**
   * Resetea todos los estados a valores por defecto
   */
  function resetUIState() {
    mainView.value = 'axial'
    quadViewActive.value = false
    show3DView.value = false
    deactivateAllTools()
    sliceNavigationActive.value = true
    showInfoPanel.value = true
    showAIFilterPanel.value = false
    showCrosshairs.value = false
    leftSidebarCollapsed.value = false
    rightSidebarCollapsed.value = false
    bottomSectionCollapsed.value = false
    controls3DVisible.value = true
    showAdvancedControls.value = false

    console.log('🔄 Estados de UI reseteados')
  }

  // ============================================
  // 📤 RETURN - EXPORTAR TODO
  // ============================================

  return {
    // Vistas principales
    mainView,
    quadViewActive,
    show3DView,

    // Herramientas
    zoomActive,
    measureActive,
    limpiarActive,
    sliceNavigationActive,

    // Paneles y visibilidad
    showInfoPanel,
    showAIFilterPanel,
    showPatientSection,
    showPatienteInfo,
    controls3DVisible,
    showAdvancedControls,
    showMeasurementMenu,

    // Mediciones por vista
    showAxialMeasurements,
    showCoronalMeasurements,
    showSagittalMeasurements,

    // Crosshairs
    showCrosshairs,
    showCrosshairTooltip,

    // IA
    showIASegmentation3D,
    showSegmentation,

    // Imágenes
    showOriginalImage,
    canUploadImage,

    // Sidebars
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    bottomSectionCollapsed,

    // Estados de interacción
    userMenuActive,
    diagnosisEditorActive,
    isFullscreenActive,

    // Modal
    showModal,
    currentStep,

    // Configuración actual
    currentModality,
    currentDataType,
    currentOrientation,
    currentUser,

    // Computed
    allCollapsed,
    someCollapsed,
    cleanWorkMode,
    anyToolActive,

    // Funciones
    changeMainView,
    toggleQuadView,
    toggleAllPanels,
    deactivateAllTools,
    activateTool,
    resetUIState
  }
}
