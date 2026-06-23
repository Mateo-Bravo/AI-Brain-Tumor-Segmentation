// composables/viewer/useCrosshair3DSync.js
import * as THREE from 'three'
import { markRaw, reactive } from 'vue'

/**
 * 🎯 Composable para sincronización de crosshairs entre vistas 2D y 3D
 *
 * Maneja los planos de corte 3D que se muestran en la vista 3D
 * correspondientes a las posiciones de los crosshairs en las vistas 2D
 */
export function useCrosshair3DSync() {
  // ============================================
  // 📊 ESTADO REACTIVO
  // ============================================

  /**
   * Planos de corte 3D que corresponden a los crosshairs 2D
   * - axial: Plano Z (horizontal)
   * - coronal: Plano Y (frontal)
   * - sagittal: Plano X (lateral)
   */
  const crosshairPlanes3D = reactive({
    axial: null,
    coronal: null,
    sagittal: null
  })

  /**
   * Configuración de apariencia de los planos 3D
   */
  const crosshairPlanes3DConfig = {
    opacity: 0.15,      // Opacidad reducida para no interferir con el volumen
    color: 0x00FFAA,    // Verde cian brillante para destacar
    wireframe: false,   // Planos sólidos, no wireframe
    transparent: true,  // Habilitamos transparencia
    size: 3.0          // Tamaño de los planos (multiplicador)
  }

  // ============================================
  // 🎨 FUNCIONES DE CREACIÓN
  // ============================================

  /**
   * Crea los planos de corte 3D en la escena
   *
   * @param {THREE.Scene} scene3D - Escena 3D donde añadir los planos
   * @param {Object} volumeData - Datos volumétricos
   * @param {number} width - Ancho del volumen
   * @param {number} height - Alto del volumen
   * @param {number} depth - Profundidad del volumen
   */
  function createCrosshairPlanes3D(scene3D, volumeData, width, height, depth) {
    if (!scene3D || !volumeData) {
      console.warn('⚠️ No se puede crear planos 3D - escena o datos faltantes')
      return
    }

    console.log('🎯 Creando planos de crosshairs 3D...')

    // Limpiar planos anteriores si existen
    removeCrosshairPlanes3D(scene3D)

    // Normalizar dimensiones para que el volumen sea proporcional
    const maxDim = Math.max(width, height, depth)
    const normalizedWidth = width / maxDim
    const normalizedHeight = height / maxDim
    const normalizedDepth = depth / maxDim

    const size = crosshairPlanes3DConfig.size

    // Material compartido para todos los planos
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: crosshairPlanes3DConfig.color,
      transparent: crosshairPlanes3DConfig.transparent,
      opacity: crosshairPlanes3DConfig.opacity,
      side: THREE.DoubleSide,
      wireframe: crosshairPlanes3DConfig.wireframe,
      depthTest: true,
      depthWrite: false
    })

    // ============================================
    // 📐 PLANO AXIAL (Horizontal - XY)
    // ============================================
    const axialGeometry = new THREE.PlaneGeometry(
      normalizedWidth * size,
      normalizedHeight * size
    )
    crosshairPlanes3D.axial = markRaw(
      new THREE.Mesh(axialGeometry, planeMaterial.clone())
    )
    crosshairPlanes3D.axial.rotation.x = 0  // Plano horizontal
    crosshairPlanes3D.axial.renderOrder = 999  // Renderizar encima del volumen
    crosshairPlanes3D.axial.name = 'crosshair-axial'
    scene3D.add(crosshairPlanes3D.axial)

    // ============================================
    // 📐 PLANO CORONAL (Frontal - XZ)
    // ============================================
    const coronalGeometry = new THREE.PlaneGeometry(
      normalizedWidth * size,
      normalizedDepth * size
    )
    crosshairPlanes3D.coronal = markRaw(
      new THREE.Mesh(coronalGeometry, planeMaterial.clone())
    )
    crosshairPlanes3D.coronal.rotation.x = Math.PI / 2  // Rotar 90° para vertical
    crosshairPlanes3D.coronal.renderOrder = 999
    crosshairPlanes3D.coronal.name = 'crosshair-coronal'
    scene3D.add(crosshairPlanes3D.coronal)

    // ============================================
    // 📐 PLANO SAGITAL (Lateral - YZ)
    // ============================================
    const sagittalGeometry = new THREE.PlaneGeometry(
      normalizedHeight * size,
      normalizedDepth * size
    )
    crosshairPlanes3D.sagittal = markRaw(
      new THREE.Mesh(sagittalGeometry, planeMaterial.clone())
    )
    crosshairPlanes3D.sagittal.rotation.y = Math.PI / 2  // Rotar 90° lateral
    crosshairPlanes3D.sagittal.renderOrder = 999
    crosshairPlanes3D.sagittal.name = 'crosshair-sagital'
    scene3D.add(crosshairPlanes3D.sagittal)

    console.log('✅ Planos de crosshairs 3D creados exitosamente')

    return {
      axial: crosshairPlanes3D.axial,
      coronal: crosshairPlanes3D.coronal,
      sagittal: crosshairPlanes3D.sagittal
    }
  }

  // ============================================
  // 🔄 FUNCIONES DE ACTUALIZACIÓN
  // ============================================

  /**
   * Actualiza las posiciones de los planos 3D según los slices actuales
   *
   * @param {Object} currentSlices - Slices actuales { axial, coronal, sagittal }
   * @param {number} width - Ancho del volumen
   * @param {number} height - Alto del volumen
   * @param {number} depth - Profundidad del volumen
   * @param {boolean} crosshairsEnabled - Si los crosshairs están habilitados
   * @param {Object} renderer3D - Renderer 3D (opcional, para forzar render)
   * @param {THREE.Scene} scene3D - Escena 3D (opcional, para forzar render)
   * @param {THREE.Camera} camera3D - Cámara 3D (opcional, para forzar render)
   * @param {boolean} quadViewActive - Si la vista cuádruple está activa
   */
  function updateCrosshairPlanes3D(
    currentSlices,
    width,
    height,
    depth,
    crosshairsEnabled = true,
    renderer3D = null,
    scene3D = null,
    camera3D = null,
    quadViewActive = false
  ) {
    // Verificar que los planos existen
    if (!crosshairPlanes3D.axial || !crosshairPlanes3D.coronal || !crosshairPlanes3D.sagittal) {
      console.log('⚠️ Planos crosshairs 3D no inicializados')
      return
    }

    // Verificar que los crosshairs están habilitados
    if (!crosshairsEnabled) {
      console.log('⚠️ Crosshairs deshabilitados')
      return
    }

    // Funciones de normalización para convertir índices a coordenadas 3D
    const normalizeX = (x) => (x / (width - 1)) * 2 - 1
    const normalizeY = (y) => (y / (height - 1)) * 2 - 1
    const normalizeZ = (z) => (z / (depth - 1)) * 2 - 1

    // ============================================
    // 📍 ACTUALIZAR POSICIÓN PLANO AXIAL (Z)
    // ============================================
    const axialZ = normalizeZ(currentSlices.axial)
    crosshairPlanes3D.axial.position.z = axialZ

    // ============================================
    // 📍 ACTUALIZAR POSICIÓN PLANO CORONAL (Y)
    // ============================================
    // Invertir Y porque en Three.js Y aumenta hacia arriba
    const coronalY = normalizeY(height - 1 - currentSlices.coronal)
    crosshairPlanes3D.coronal.position.y = coronalY

    // ============================================
    // 📍 ACTUALIZAR POSICIÓN PLANO SAGITAL (X)
    // ============================================
    const sagittalX = normalizeX(currentSlices.sagittal)
    crosshairPlanes3D.sagittal.position.x = sagittalX

    // Log de debug con las posiciones actualizadas
    console.log('🎯 Planos 3D actualizados:', {
      axial: `Z=${axialZ.toFixed(2)} (slice ${currentSlices.axial})`,
      coronal: `Y=${coronalY.toFixed(2)} (slice ${currentSlices.coronal})`,
      sagittal: `X=${sagittalX.toFixed(2)} (slice ${currentSlices.sagittal})`
    })

    // Forzar render si estamos en vista cuádruple
    if (quadViewActive && renderer3D && scene3D && camera3D) {
      renderer3D.render(scene3D, camera3D)
    }
  }

  // ============================================
  // 🗑️ FUNCIONES DE LIMPIEZA
  // ============================================

  /**
   * Elimina los planos de crosshairs de la escena 3D
   *
   * @param {THREE.Scene} scene3D - Escena 3D de donde eliminar los planos
   */
  function removeCrosshairPlanes3D(scene3D) {
    if (!scene3D) {
      console.warn('⚠️ No se puede eliminar planos - escena no proporcionada')
      return
    }

    console.log('🧹 Eliminando planos de crosshairs 3D...')

    // Eliminar plano axial
    if (crosshairPlanes3D.axial) {
      scene3D.remove(crosshairPlanes3D.axial)

      // Liberar geometría y material
      if (crosshairPlanes3D.axial.geometry) {
        crosshairPlanes3D.axial.geometry.dispose()
      }
      if (crosshairPlanes3D.axial.material) {
        crosshairPlanes3D.axial.material.dispose()
      }

      crosshairPlanes3D.axial = null
    }

    // Eliminar plano coronal
    if (crosshairPlanes3D.coronal) {
      scene3D.remove(crosshairPlanes3D.coronal)

      // Liberar geometría y material
      if (crosshairPlanes3D.coronal.geometry) {
        crosshairPlanes3D.coronal.geometry.dispose()
      }
      if (crosshairPlanes3D.coronal.material) {
        crosshairPlanes3D.coronal.material.dispose()
      }

      crosshairPlanes3D.coronal = null
    }

    // Eliminar plano sagital
    if (crosshairPlanes3D.sagittal) {
      scene3D.remove(crosshairPlanes3D.sagittal)

      // Liberar geometría y material
      if (crosshairPlanes3D.sagittal.geometry) {
        crosshairPlanes3D.sagittal.geometry.dispose()
      }
      if (crosshairPlanes3D.sagittal.material) {
        crosshairPlanes3D.sagittal.material.dispose()
      }

      crosshairPlanes3D.sagittal = null
    }

    console.log('✅ Planos de crosshairs 3D eliminados')
  }

  // ============================================
  // 🎨 FUNCIONES DE CONFIGURACIÓN
  // ============================================

  /**
   * Actualiza la opacidad de los planos 3D
   *
   * @param {number} opacity - Nueva opacidad (0.0 - 1.0)
   */
  function setCrosshairPlanesOpacity(opacity) {
    crosshairPlanes3DConfig.opacity = Math.max(0, Math.min(1, opacity))

    // Actualizar opacidad de los planos existentes
    if (crosshairPlanes3D.axial?.material) {
      crosshairPlanes3D.axial.material.opacity = crosshairPlanes3DConfig.opacity
    }
    if (crosshairPlanes3D.coronal?.material) {
      crosshairPlanes3D.coronal.material.opacity = crosshairPlanes3DConfig.opacity
    }
    if (crosshairPlanes3D.sagittal?.material) {
      crosshairPlanes3D.sagittal.material.opacity = crosshairPlanes3DConfig.opacity
    }

    console.log(`🎨 Opacidad de planos actualizada: ${opacity}`)
  }

  /**
   * Actualiza el color de los planos 3D
   *
   * @param {number} color - Nuevo color (formato hexadecimal, ej: 0x00FFAA)
   */
  function setCrosshairPlanesColor(color) {
    crosshairPlanes3DConfig.color = color

    // Actualizar color de los planos existentes
    if (crosshairPlanes3D.axial?.material) {
      crosshairPlanes3D.axial.material.color.setHex(color)
    }
    if (crosshairPlanes3D.coronal?.material) {
      crosshairPlanes3D.coronal.material.color.setHex(color)
    }
    if (crosshairPlanes3D.sagittal?.material) {
      crosshairPlanes3D.sagittal.material.color.setHex(color)
    }

    console.log(`🎨 Color de planos actualizado: ${color.toString(16)}`)
  }

  /**
   * Muestra u oculta los planos de crosshairs 3D
   *
   * @param {boolean} visible - Si los planos deben ser visibles
   */
  function setCrosshairPlanesVisibility(visible) {
    if (crosshairPlanes3D.axial) {
      crosshairPlanes3D.axial.visible = visible
    }
    if (crosshairPlanes3D.coronal) {
      crosshairPlanes3D.coronal.visible = visible
    }
    if (crosshairPlanes3D.sagittal) {
      crosshairPlanes3D.sagittal.visible = visible
    }

    console.log(`👁️ Visibilidad de planos: ${visible ? 'VISIBLE' : 'OCULTO'}`)
  }

  // ============================================
  // 📤 RETURN - EXPORTAR TODO
  // ============================================

  return {
    // Estado reactivo
    crosshairPlanes3D,
    crosshairPlanes3DConfig,

    // Funciones de creación
    createCrosshairPlanes3D,

    // Funciones de actualización
    updateCrosshairPlanes3D,

    // Funciones de limpieza
    removeCrosshairPlanes3D,

    // Funciones de configuración
    setCrosshairPlanesOpacity,
    setCrosshairPlanesColor,
    setCrosshairPlanesVisibility
  }
}
