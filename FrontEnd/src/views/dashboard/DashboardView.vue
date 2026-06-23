<template>
  <div class="diagnostic-panel">
    <!-- Header Medical (mismo estilo que LoginView) -->
    <header class="medical-header">
      <div class="header-container">
        <div class="logo-section">
          <img :src="logoImage" alt="UC Posgrado" class="logo-image" />
        </div>
        <div class="header-right">
          <nav class="nav-menu">
            <a href="#" class="nav-link" @click="goToHome">Inicio</a>
            <a href="#" class="nav-link" @click="showStudyHistory">Historial</a>
          </nav>

          <div class="user-menu-container">
            <div class="user-icon" @click="toggleUserMenu">

              <div class="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                {{ userInitials }}
              </div>

              <!-- Menú desplegable del usuario -->
              <div class="user-dropdown" :class="{ active: userMenuActive }">
                <a href="#" class="dropdown-item" @click="logout">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16,17 21,12 16,7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Cerrar Sesión
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="main-container">
      <!-- Sidebar Izquierdo -->
      <!-- Ocultar completamente en modo maximizado -->
      <aside class="left-sidebar" :class="{ collapsed: leftSidebarCollapsed, 'hidden-maximized': allCollapsed }">
        <button class="sidebar-toggle-btn" @click="toggleLeftSidebar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path :d="leftSidebarCollapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'" />
          </svg>
        </button>
        <!--
        <div v-for="(view, index) in brainViews" :key="index" class="brain-view" :class="{ active: view.active }"
          @click="selectBrainView(index)">
          <img :src="view.image" :alt="view.label" class="brain-image" />
          <div class="brain-label">{{ view.label }}</div>
        </div> -->

        <!-- nuevos botones para las difernetes vistas  -->

        <div class="view-selector">
          <div v-for="(view, index) in brainViews" :key="index" class="brain-view view-btn"
            :class="{ active: view.active || mainView === view.type, 'axial-btn': view.type === 'axial', 'coronal-btn': view.type === 'coronal', 'sagittal-btn': view.type === 'sagittal' }"
            @click="selectBrainView(index); setMainView(view.type)">
            <img :src="view.image" :alt="view.label" class="brain-image" />
            <div class="brain-label">{{ view.label }}</div>
          </div>

          <!-- Botón especial para Vista 3D con IA -->
          <!-- <div class="brain-view view-btn view-3d-btn" :class="{ active: mainView === '3d' }"
               @click="setMainView('3d')">
            <div class="brain-image-3d">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <div class="ai-indicator" v-if="useEnhancedVolume">🤖</div>
            </div>
            <div class="brain-label">VISTA 3D + IA</div>
          </div> -->
        </div>

        <!-- Panel de información de vista actual -->
        <!-- Ocultar completamente cuando está en modo maximizado -->
        <div v-if="showInfoPanel && !allCollapsed" class="view-info-panel">
          <div class="info-section">
            <div class="info-item">
              <span class="info-label">Vista:</span>
              <span class="info-value" :style="{ borderColor: getMainViewColor(), color: getMainViewColor() }">
                {{ mainView.toUpperCase() }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Slice:</span>
              <span class="info-value">{{ getCurrentSliceForMainView() + 1 }}</span>
            </div>
            <div v-if="selectedModality" class="info-item">
              <span class="info-label">Modalidad:</span>
              <span class="info-value">{{ modalityDisplayNames[selectedModality] || selectedModality.toUpperCase()
              }}</span>
            </div>
            <div v-if="currentDataType.name" class="info-item">
              <span class="info-label">Tipo de datos:</span>
              <span class="info-value" :class="{
                'optimized-data': currentDataType.isOptimized && !currentDataType.hasIssues,
                'problematic-data': currentDataType.hasIssues
              }">
                {{ currentDataType.name.toUpperCase() }}
                <span v-if="currentDataType.isOptimized && !currentDataType.hasIssues"
                  class="optimization-badge">✓</span>
                <span v-if="currentDataType.hasIssues" class="issue-badge" :title="currentDataType.notes">⚠️</span>
              </span>
            </div>
            <div v-if="currentOrientation.orientation !== 'UNKNOWN'" class="info-item">
              <span class="info-label">Orientación:</span>
              <span class="info-value orientation-value" :class="{
                'orientation-ras': currentOrientation.orientation.startsWith('RAS'),
                'orientation-lps': currentOrientation.orientation.startsWith('LPS'),
                'orientation-corrected': currentOrientation.needsCorrection
              }">
                {{ currentOrientation.orientation }}
                <span v-if="currentOrientation.needsCorrection" class="correction-badge"
                  title="Corrección automática aplicada (flip vertical)">🔧</span>
              </span>
            </div>
            <div v-if="zoomLevel !== 1" class="info-item">
              <span class="info-label">Zoom:</span>
              <span class="info-value zoom-value">{{ (zoomLevel * 100).toFixed(0) }}%</span>
            </div>
            <div v-if="zoomActive" class="info-item">
              <span class="info-label">Herramienta:</span>
              <span class="info-value tool-active">🔍 ZOOM</span>
            </div>
            <div v-if="measureActive" class="info-item">
              <span class="info-label">Herramienta:</span>
              <span class="info-value tool-active">📏 MEDICIÓN</span>
            </div>
            <div v-if="volumeData" class="info-item">
              <span class="info-label">Resolución:</span>
              <span class="info-value resolution-value">{{ getImageResolution }}</span>
            </div>
            <div v-if="volumeData" class="info-item">
              <span class="info-label">Calidad:</span>
              <span class="info-value quality-value" :class="getImageQualityClass">
                {{ getImageQuality }}
                <span class="quality-indicator">{{ getImageQualityIcon }}</span>
              </span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Área Central -->
      <main class="center-area">
        <div class="top-controls">
          <select class="modality-select" v-model="selectedModality">
            <option value="">Modalidad</option>
            <option v-for="modality in availableModalities" :key="modality.value" :value="modality.value">
              {{ modality.label }}
            </option>
          </select>

          <div class="top-right-labels">
            <div class="icon-item" :class="{ active: quadViewActive }" @click="toggleQuadView">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span style="font-size: 10px">Cuatro Vistas</span>
            </div>
            <div class="icon-item" :class="{ active: zoomActive }" @click="toggleZoom">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <span style="font-size: 10px">
                Lupa
                <span v-if="zoomActive" style="font-size: 8px; display: block;">
                  🔍 ACTIVO
                </span>
              </span>
            </div>

            <!-- Botón de reset zoom -->
            <div v-if="zoomActive && zoomLevel !== 1" class="icon-item reset-zoom" @click="resetZoom"
              title="Volver al tamaño original (100%) - Tecla R">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M3 7v6h6"></path>
                <path d="M21 17v-6h-6"></path>
                <path d="m21 7-9 9-9-9"></path>
              </svg>
              <span style="font-size: 10px">
                Reset
                <span style="font-size: 8px; display: block;">
                  100%
                </span>
              </span>
            </div>
            <div class="icon-item" :class="{ active: measureActive }" @click="toggleMeasure">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span style="font-size: 10px">Medida</span>
            </div>

            <!-- Botón para controlar navegación de slices -->
            <div class="icon-item" :class="{ active: sliceNavigationActive }" @click="toggleSliceNavigation"
              title="Navegar slices con scroll del mouse">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M12 4v16"></path>
                <path d="m8 8 4-4 4 4"></path>
                <path d="m8 16 4 4 4-4"></path>
                <circle cx="12" cy="12" r="1"></circle>
              </svg>
              <span style="font-size: 10px">
                Scroll
                <span v-if="sliceNavigationActive && !zoomActive && !measureActive"
                  style="font-size: 8px; display: block;">
                  ↕️ ACTIVO
                </span>
                <span v-else-if="!sliceNavigationActive || zoomActive || measureActive"
                  style="font-size: 8px; display: block; opacity: 0.6;">
                  ⏸️ PAUSADO
                </span>
              </span>
            </div>

            <!-- Botón para controlar crosshairs -->
            <div class="icon-item" :class="{ active: showCrosshairs }" @click="toggleCrosshairs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <line x1="12" y1="2" x2="12" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span style="font-size: 10px">
                Cruces
                <span v-if="showCrosshairs" style="font-size: 8px; display: block;">
                  ✚ ACTIVO
                </span>
              </span>
            </div>

            <!-- Botón para controlar panel de información -->
            <div class="icon-item" :class="{ active: showInfoPanel }" @click="toggleInfoPanel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="9" cy="9" r="2"></circle>
                <path d="M21 15.5c-.621 0-1-.504-1-1.125V9"></path>
                <path d="M14 9h7"></path>
                <path d="M14 12h7"></path>
                <path d="M14 15h7"></path>
              </svg>
              <span style="font-size: 10px">
                Info Panel
                <span v-if="showInfoPanel" style="font-size: 8px; display: block;">
                  📊 VISIBLE
                </span>
                <span v-else style="font-size: 8px; display: block;">
                  📊 OCULTO
                </span>
              </span>
            </div>

            <!-- Botón para procesamiento avanzado con Web Worker -->
            <div class="icon-item" :class="{ active: showAIFilterPanel }" @click="toggleAIFilterPanel"
              title="Panel de Filtros IA">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                <path d="M7 12h5l-3-3"></path>
                <path d="M7 12l3 3"></path>
              </svg>
              <span style="font-size: 10px">
                {{ showAIFilterPanel ? '🔬 Panel Abierto' : 'Filtros' }}
                <span v-if="isImageProcessing.value" style="font-size: 8px; display: block; color: orange;">
                  ⚙️ PROCESANDO
                </span>
                <span v-else-if="Object.values(webWorkerSettings).filter(s => s.enabled).length > 0"
                  style="font-size: 8px; display: block; color: #4CAF50;">
                  ✓ {{Object.values(webWorkerSettings).filter(s => s.enabled).length}} ACTIVOS
                </span>
              </span>
            </div>

            <!-- Menú de opciones de mediciones -->
            <div class="measurement-menu" :class="{ active: showMeasurementMenu }">
              <div class="icon-item measurement-options-trigger" @click="toggleMeasurementMenu">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
                  <path d="M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
                  <path d="M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
                  <path d="M12 20v-6"></path>
                  <path d="M12 10V4"></path>
                  <path d="M19 20v-6"></path>
                  <path d="M19 10V4"></path>
                  <path d="M5 20v-6"></path>
                  <path d="M5 10V4"></path>
                </svg>
                <span style="font-size: 10px">
                  Herramientas
                  <small style="font-size: 8px; display: block;">{{ measurements.length }}</small>
                </span>
              </div>

              <div v-if="showMeasurementMenu" class="measurement-dropdown">
                <div class="dropdown-header">
                  <strong>Mediciones ({{ measurements.length }})</strong>
                  <button class="close-dropdown" @click="showMeasurementMenu = false">×</button>
                </div>

                <div class="dropdown-info">
                  💡 Doble click en una línea para borrarla
                </div>

                <div class="dropdown-actions">
                  <button class="dropdown-btn btn-clear-current" @click="clearCurrentViewMeasurements"
                    :disabled="!hasCurrentViewMeasurements" title="Borrar mediciones de esta vista y slice">
                    🗑️ Vista actual ({{ getCurrentViewMeasurementCount() }})
                  </button>

                  <button class="dropdown-btn btn-clear-all" @click="clearAllMeasurements"
                    :disabled="measurements.length === 0" title="Borrar todas las mediciones">
                    🗑️ Todas ({{ measurements.length }})
                  </button>
                </div>
              </div>
            </div>

            <div class="icon-item" @click="toggleLimpiar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span style="font-size: 10px">Limpiar</span>
            </div>

            <!-- Ayuda rápida de atajos de teclado -->

          </div>
          <div class="expand-center-btn" :class="{ expanded: allCollapsed }" @click="toggleCenterExpansion"
            :title="(allCollapsed ? 'Restaurar paneles laterales' : 'Maximizar área de visualización médica') + ' - Tecla F1'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3">
              </path>
            </svg>
            <span style="font-size: 10px">
              {{ allCollapsed ? '📐 Restaurar' : '🖼️ Maximizar' }}
              <small style="font-size: 8px; display: block; opacity: 0.8;">
                {{ allCollapsed ? 'paneles' : 'vista médica' }} · F1
              </small>
            </span>
          </div>
        </div>

        <!-- Indicador de modo optimizado -->
        <div v-if="allCollapsed" class="space-optimization-indicator">
          <div class="optimization-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3">
              </path>
            </svg>
            <span>Modo Vista Maximizada</span>
          </div>
        </div>

        <!-- Área de Pestañas Médicas -->
        <div class="medical-tabs">
          <div class="tab-headers">
            <div v-for="(tab, index) in tabs" :key="index" class="tab-header" :class="{ active: activeTab === index }"
              @click="switchTab(index)">
              {{ tab.title }}
            </div>
          </div>
          <div class="tab-content" :style="{ height: tabContentHeight }">
            <!-- PESTAÑA 1: IMAGEN ORIGINAL -->
            <div v-if="activeTab === 0" class="tab-panel active">
              <div class="image-container" :class="{
                'has-image': uploadedFiles.length > 0,
                'no-upload': !canUploadImage,
                'expanded-mode': allCollapsed
              }">

                <!-- ESTADO INICIAL: Sin archivos cargados -->
                <div v-if="uploadedFiles.length === 0" class="upload-prompt" @click="uploadImage">
                  <img :src="ResonanciaMagneticaImage" alt="Resonancia" class="medical-preview-image" />
                  <h3>Se visualiza imagen</h3>
                  <p>Haz clic para seleccionar subir una imagen más datos del Paciente</p>
                  <p style="font-size: 0.9rem; color: #999; margin-top: 10px">
                    Formatos soportados: DICOM
                  </p>
                </div>

                <!-- ESTADO CON ARCHIVO: Vista única o 4 vistas según configuración -->
                <div v-else class="medical-image-viewer">

                  <!-- VISTA ÚNICA (modo por defecto) -->
                  <div v-if="!quadViewActive" class="single-view-mode">
                    <div class="medical-display">
                    </div>
                    <canvas v-show="mainView !== '3d'" ref="canvasMain" class="main-canvas" :class="{
                      'zoom-in-cursor': zoomMode === 'in',
                      'zoom-out-cursor': zoomMode === 'out',
                      'measure-cursor': measureActive,
                      'expanded-canvas': allCollapsed,
                      'maximized-canvas': allCollapsed && !quadViewActive
                    }" :width="canvasDisplayWidth" :height="canvasDisplayHeight" @click="handleCanvasClick" @dblclick="(event) => {
                      if (zoomActive) {
                        resetZoom()
                      } else if (measureActive) {
                        // En modo medición, doble clic no resetea zoom
                        handleMeasurementDoubleClick(event)
                      } else {
                        handleMeasurementDoubleClick(event)
                      }
                    }" @wheel="handleMainWheelEvent" @mousedown="(event) => {
                      handleCrosshairDragStart(event, 'main');
                      handleMouseDown(event);
                    }" @mousemove="(event) => {
                      handleCrosshairDragMove(event, 'main');
                      handleMouseMove(event);
                    }" @mouseup="(event) => {
                      handleCrosshairDragEnd();
                      handleMouseUp(event);
                    }" @mouseleave="(event) => {
                      handleCrosshairDragEnd();
                      handleMouseUp(event);
                    }" @touchstart="handleMouseDown" @touchmove="handleMouseMove" @touchend="handleMouseUp">
                    </canvas>

                    <!-- Indicador de zoom flotante -->
                    <div v-if="zoomActive && zoomLevel !== 1" class="zoom-indicator-overlay">
                      {{ Math.round(zoomLevel * 100) }}%
                    </div>

                    <!-- Canvas 3D para renderizado volumétrico -->
                    <canvas v-show="mainView === '3d'" ref="threeCanvas" class="three-canvas" :class="{
                      'expanded-canvas': allCollapsed,
                      'maximized-canvas': allCollapsed && !quadViewActive
                    }" :width="canvasDisplayWidth" :height="canvasDisplayHeight">
                    </canvas>
                  </div>

                  <!-- SISTEMA DE 4 VISTAS (cuando quadViewActive está activo) -->
                  <div v-else class="four-views-mode" :class="{ 'expanded-mode': allCollapsed }">
                    <div class="four-views-grid">

                      <!-- Vista Superior Izquierda: Axial -->
                      <div class="view-quadrant axial-view" :class="{ 'active-view': mainView === 'axial' }">
                        <div class="view-header axial-header">
                          <div class="view-title">
                            <div class="view-icon">⊗</div>
                            <span class="view-name">AXIAL</span>
                          </div>
                          <div class="view-info">
                            <span class="slice-info">Slice {{ currentSlices.axial + 1 }}/{{ depth }}</span>
                            <span v-if="quadZoomLevels.axial !== 1" class="zoom-badge">{{
                              Math.round(quadZoomLevels.axial * 100) }}%</span>
                          </div>
                        </div>
                        <div class="canvas-container" :class="{ dragging: quadViewDragging.axial }">
                          <canvas ref="canvasAxial" class="quadrant-canvas" :class="{
                            'zoom-in-cursor': zoomMode === 'in' && zoomActive,
                            'zoom-out-cursor': zoomMode === 'out' && zoomActive,
                            'measure-cursor': measureActive
                          }" :width="allCollapsed ? 320 : 380" :height="allCollapsed ? 200 : 200"
                            @click="(event) => handleCanvasClick(event, 'axial')"
                            @dblclick="(event) => handleCanvasDoubleClick(event, 'axial')"
                            @wheel="(event) => handleQuadViewWheel('axial', event)" @mousedown="(event) => {
                              handleCrosshairDragStart(event, 'axial');
                              handleQuadViewMouseDown(event, 'axial');
                            }" @mousemove="(event) => {
                              handleCrosshairDragMove(event, 'axial');
                              handleQuadViewMouseMove(event, 'axial');
                            }" @mouseup="(event) => {
                              handleCrosshairDragEnd();
                              handleQuadViewMouseUp(event, 'axial');
                            }" @mouseleave="(event) => {
                              handleCrosshairDragEnd();
                              handleQuadViewMouseUp(event, 'axial');
                            }">
                          </canvas>
                          <div v-if="zoomActive && quadZoomLevels.axial !== 1" class="zoom-overlay">🔍</div>
                          <div v-if="crosshairDragging.isDragging && crosshairDragging.view === 'axial'"
                            class="crosshair-drag-indicator">
                            🎯 Ctrl+Arrastrar para mover crosshair
                          </div>
                          <div v-if="quadViewDragging.axial" class="slice-drag-indicator active">
                            📋 Slice {{ currentSlices.axial + 1 }}/{{ depth }}
                          </div>
                        </div>
                      </div>

                      <!-- Vista Superior Derecha: Coronal -->
                      <div class="view-quadrant coronal-view" :class="{ 'active-view': mainView === 'coronal' }">
                        <div class="view-header coronal-header">
                          <div class="view-title">
                            <div class="view-icon">⊕</div>
                            <span class="view-name">CORONAL</span>
                          </div>
                          <div class="view-info">
                            <span class="slice-info">Slice {{ currentSlices.coronal + 1 }}/{{ height }}</span>
                            <span v-if="quadZoomLevels.coronal !== 1" class="zoom-badge">{{
                              Math.round(quadZoomLevels.coronal * 100) }}%</span>
                          </div>
                        </div>
                        <div class="canvas-container" :class="{ dragging: quadViewDragging.coronal }">
                          <canvas ref="canvasCoronal" class="quadrant-canvas" :class="{
                            'zoom-in-cursor': zoomMode === 'in' && zoomActive,
                            'zoom-out-cursor': zoomMode === 'out' && zoomActive,
                            'measure-cursor': measureActive
                          }" :width="allCollapsed ? 320 : 380" :height="allCollapsed ? 200 : 200"
                            @click="(event) => handleCanvasClick(event, 'coronal')"
                            @dblclick="(event) => handleCanvasDoubleClick(event, 'coronal')"
                            @wheel="(event) => handleQuadViewWheel('coronal', event)" @mousedown="(event) => {
                              handleCrosshairDragStart(event, 'coronal');
                              handleQuadViewMouseDown(event, 'coronal');
                            }" @mousemove="(event) => {
                              handleCrosshairDragMove(event, 'coronal');
                              handleQuadViewMouseMove(event, 'coronal');
                            }" @mouseup="(event) => {
                              handleCrosshairDragEnd();
                              handleQuadViewMouseUp(event, 'coronal');
                            }" @mouseleave="(event) => {
                              handleCrosshairDragEnd();
                              handleQuadViewMouseUp(event, 'coronal');
                            }">
                          </canvas>
                          <div v-if="zoomActive && quadZoomLevels.coronal !== 1" class="zoom-overlay">🔍</div>
                          <div v-if="quadViewDragging.coronal" class="slice-drag-indicator active">
                            📋 Slice {{ currentSlices.coronal + 1 }}/{{ height }}
                          </div>
                        </div>
                      </div>

                      <!-- Vista Inferior Izquierda: Sagital -->
                      <div class="view-quadrant sagittal-view" :class="{ 'active-view': mainView === 'sagittal' }">
                        <div class="view-header sagittal-header">
                          <div class="view-title">
                            <div class="view-icon">⊙</div>
                            <span class="view-name">SAGITAL</span>
                          </div>
                          <div class="view-info">
                            <span class="slice-info">Slice {{ currentSlices.sagittal + 1 }}/{{ width }}</span>
                            <span v-if="quadZoomLevels.sagittal !== 1" class="zoom-badge">{{
                              Math.round(quadZoomLevels.sagittal * 100) }}%</span>
                          </div>
                        </div>
                        <div class="canvas-container" :class="{ dragging: quadViewDragging.sagittal }">
                          <canvas ref="canvasSagittal" class="quadrant-canvas" :class="{
                            'zoom-in-cursor': zoomMode === 'in' && zoomActive,
                            'zoom-out-cursor': zoomMode === 'out' && zoomActive,
                            'measure-cursor': measureActive
                          }" :width="allCollapsed ? 320 : 380" :height="allCollapsed ? 200 : 200"
                            @click="(event) => handleCanvasClick(event, 'sagittal')"
                            @dblclick="(event) => handleCanvasDoubleClick(event, 'sagittal')"
                            @wheel="(event) => handleQuadViewWheel('sagittal', event)" @mousedown="(event) => {
                              handleCrosshairDragStart(event, 'sagittal');
                              handleQuadViewMouseDown(event, 'sagittal');
                            }" @mousemove="(event) => {
                              handleCrosshairDragMove(event, 'sagittal');
                              handleQuadViewMouseMove(event, 'sagittal');
                            }" @mouseup="(event) => {
                              handleCrosshairDragEnd();
                              handleQuadViewMouseUp(event, 'sagittal');
                            }" @mouseleave="(event) => {
                              handleCrosshairDragEnd();
                              handleQuadViewMouseUp(event, 'sagittal');
                            }">
                          </canvas>
                          <div v-if="zoomActive && quadZoomLevels.sagittal !== 1" class="zoom-overlay">🔍</div>
                          <div v-if="quadViewDragging.sagittal" class="slice-drag-indicator active">
                            📋 Slice {{ currentSlices.sagittal + 1 }}/{{ width }}
                          </div>
                        </div>
                      </div>

                      <!-- Vista Inferior Derecha: Vista 3D Volumétrica -->
                      <div class="view-quadrant view-3d-volumetric active-3d" :class="{ 'active-view': true }">
                        <div class="view-header view-3d-header">
                          <div class="view-title">
                            <div class="view-icon">🧠</div>
                            <span class="view-name">VISTA 3D VOLUMÉTRICA</span>
                          </div>
                          <div class="view-info">
                            <span class="render-info">Volumétrico</span>
                            <span class="quality-badge">3D</span>
                            <span v-if="quadZoomLevels.threeD !== 1" class="zoom-badge">{{
                              Math.round(quadZoomLevels.threeD * 100) }}%</span>
                          </div>
                        </div>
                        <div class="canvas-container view-3d-container">
                          <!-- Canvas para renderizado 3D - Responsive -->
                          <canvas ref="canvas3DRef" class="quadrant-canvas view-3d-canvas responsive-canvas"
                            :class="{ 'cursor-grab': !isDragging, 'cursor-grabbing': isDragging }"
                            @wheel="handle3DCanvasWheel" @mousedown="handle3DCanvasMouseDown"
                            @mousemove="handle3DCanvasMouseMove" @mouseup="handle3DCanvasMouseUp"
                            @mouseleave="handle3DCanvasMouseLeave" @dblclick="reset3DView">
                          </canvas>

                          <!-- Mensaje informativo cuando no hay datos 3D -->
                          <div v-if="!volumeData" class="no-3d-data-message">
                            <div class="message-icon">🧠</div>
                            <div class="message-text">
                              <p>Vista 3D Volumétrica</p>
                              <small>Carga datos médicos para visualización 3D</small>
                            </div>
                          </div>

                          <!-- Overlay de zoom para vista 3D -->
                          <div v-if="zoomActive && quadZoomLevels.threeD !== 1" class="zoom-overlay">🔍</div>

                          <!-- Indicador de arrastre de slice para vista principal -->
                          <div v-if="quadViewDragging.main" class="slice-drag-indicator active">
                            📋 Slice {{ getCurrentSliceForMainView() + 1 }}/{{ getTotalSlicesForMainView() }}
                          </div>

                          <!-- Indicadores de herramientas activas -->
                          <div class="tool-indicators">
                            <div v-if="zoomActive" class="tool-indicator zoom-indicator">
                              <div class="tool-icon">🔍</div>
                              <div class="tool-text">Zoom {{ zoomMode === 'in' ? 'In' : 'Out' }}</div>
                            </div>
                            <div v-if="measureActive" class="tool-indicator measure-indicator">
                              <div class="tool-icon">📏</div>
                              <div class="tool-text">Medir</div>
                            </div>
                          </div>
                        </div>
                      </div>


                    </div>
                  </div>
                </div>
              </div>
            </div>


            <!-- PESTAÑA 2: DIAGNÓSTICO IA -->
            <div v-if="activeTab === 1" class="tab-panel active">
              <div style="
      height: calc(100% - 20px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      border-radius: 5px;
      margin-bottom: 2px;
      position: relative;
    ">

                <!-- 🆕 INDICADOR DE CARGA MIENTRAS DESCARGA DEL BACKEND -->
                <div v-if="isLoadingSegmentation" style="text-align: center; color: #6c757d">
                  <div style="font-size: 3rem; margin-bottom: 10px">🔍</div>
                  <p>Cargando segmentación desde el servidor...</p>
                  <div style="margin-top: 15px">
                    <small style="color: #6c757d">⏳ Descargando y procesando...</small>
                  </div>
                </div>

                <!-- 🆕 MENSAJE SI NO HAY SEGMENTACIÓN -->
                <div v-else-if="!segmentationInfo" style="text-align: center; color: #6c757d">
                  <div style="font-size: 3rem; margin-bottom: 10px">📊</div>
                  <p>No hay diagnóstico disponible</p>
                  <div style="margin-top: 15px">
                    <small style="color: #6c757d">Sube una imagen para obtener un diagnóstico</small>
                  </div>
                </div>

                <!-- 🆕 CANVAS PARA MOSTRAR LA SEGMENTACIÓN -->
                <canvas v-else ref="canvasMain" class="main-canvas"
                  style="
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
"
></canvas>
              </div>

              <!-- LEYENDA DE COLORES -->
              <div style="
    padding: 9px;
    border-radius: 0px;
    height: 9px;
    display: flex;
    justify-content: center;
    align-items: center;
  ">
                <div class="color-legend">
                  <!-- 🆕 MOSTRAR CLASES DINÁMICAMENTE DESDE SEGMENTATIONINFO -->
                  <template v-if="segmentationInfo && segmentationInfo.class_details">
                    <!-- Clase 0: Background (normalmente no se muestra) -->

                    <!-- Clase 1: NCR -->
                    <div v-if="segmentationInfo.class_details['1']" class="legend-item">
                      <div class="color-box" :style="{ backgroundColor: segmentationInfo.class_details['1'].color }">
                      </div>
                      <span>{{ segmentationInfo.class_details['1'].nombre }} ({{
                        segmentationInfo.class_details['1'].porcentaje }}%)</span>
                    </div>

                    <!-- Clase 2: ED -->
                    <div v-if="segmentationInfo.class_details['2']" class="legend-item">
                      <div class="color-box" :style="{ backgroundColor: segmentationInfo.class_details['2'].color }">
                      </div>
                      <span>{{ segmentationInfo.class_details['2'].nombre }} ({{
                        segmentationInfo.class_details['2'].porcentaje }}%)</span>
                    </div>

                    <!-- Clase 3: ET -->
                    <div v-if="segmentationInfo.class_details['3']" class="legend-item">
                      <div class="color-box" :style="{ backgroundColor: segmentationInfo.class_details['3'].color }">
                      </div>
                      <span>{{ segmentationInfo.class_details['3'].nombre }} ({{
                        segmentationInfo.class_details['3'].porcentaje }}%)</span>
                    </div>
                  </template>

                  <!-- Leyenda estática de respaldo si no hay datos -->
                  <template v-else>
                    <div class="legend-item">
                      <div class="color-box tumor-red"></div>
                      <span>Tumor</span>
                    </div>
                    <div class="legend-item">
                      <div class="color-box edema-yellow"></div>
                      <span>Edema</span>
                    </div>
                    <div class="legend-item">
                      <div class="color-box necrotic-blue"></div>
                      <span>Núcleo / Tumor Necrótico</span>
                    </div>
                  </template>

                  <!-- 🆕 ESTADO DINÁMICO -->
                  <div class="legend-item" style="margin-left: 20px;">
                    <span v-if="isLoadingSegmentation" style="color: #ffc107">⏳ Cargando...</span>
                    <span v-else-if="segmentedImageData" style="color: #28a745">✅ Segmentación cargada</span>
                    <span v-else-if="segmentationInfo" style="color: #17a2b8">📊 Diagnóstico disponible</span>
                    <span v-else style="color: #6c757d">⚪ Sin datos</span>
                  </div>
                </div>
              </div>

              <!-- 🆕 PANEL DE INFORMACIÓN DEL DIAGNÓSTICO (OPCIONAL) -->
              <div v-if="segmentationInfo && segmentationInfo.metrics"
                style="padding: 15px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 10px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; color: white;">
                  <div style="text-align: center;">
                    <div style="font-size: 0.8rem; color: #aaa; margin-bottom: 5px;">Estado</div>
                    <div style="font-size: 1.2rem; font-weight: bold;">{{ segmentationInfo.metrics.estado }}</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 0.8rem; color: #aaa; margin-bottom: 5px;">Porcentaje de Lesión</div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: #ff6b6b;">
                      {{ segmentationInfo.metrics.cantidad_pixeles?.porcentaje_lesion }}%
                    </div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 0.8rem; color: #aaa; margin-bottom: 5px;">Clases Detectadas</div>
                    <div style="font-size: 1.2rem; font-weight: bold;">
                      {{ segmentationInfo.num_classes_detected || 'N/A' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PESTAÑA 3: DOBLE VISTA -->
            <div v-if="activeTab === 2" class="tab-panel active">
              <div class="double-view">
                <!-- Pestaña 1 Imagen Original -->
                <div class="view-panel">
                  <div class="view-header">Original</div>
                  <div class="view-content">
                    <!-- MOSTRAR CANVAS DUPLICADO SI ESTÁ DISPONIBLE -->
                    <div v-if="uploadedFiles.length > 0" class="canvas-container">
                      <canvas ref="canvasDoubleOriginal" class="double-view-canvas original-canvas" width="450"
                        height="384"></canvas>

                      <!-- Indicador de zoom para la vista original -->
                      <div v-if="zoomLevel !== 1" class="zoom-indicator-double">
                        {{ Math.round(zoomLevel * 100) }}%
                      </div>

                      <!-- Información de depuración (temporal) -->
                      <div
                        style="position: absolute; bottom: 5px; left: 5px; color: #fff; font-size: 10px; background: rgba(0,0,0,0.7); padding: 2px 5px; border-radius: 3px;">
                        Vol: {{ !!volumeData ? 'Sí' : 'No' }} | Arch: {{ uploadedFiles.length }} | Zoom: {{
                          Math.round(zoomLevel * 100) }}%
                      </div>
                    </div>

                    <!-- PLACEHOLDER CUANDO NO HAY IMAGEN -->
                    <div v-else class="view-placeholder">
                      <p v-if="uploadedFiles.length > 0">Confirme el archivo para visualizar</p>
                      <p v-else>Se visualiza imagen</p>
                      <p style="font-size: 0.9rem; color: #999; margin-top: 10px">
                        Formatos soportados: DICOM
                      </p>
                    </div>
                  </div>
                </div>
                <!-- Pestaña 2 Diagnóstico  -->
<div class="view-panel">
  <div class="view-header"> Diagnóstico:
    <div class="color-legend">
      <template v-if="segmentationInfo && segmentationInfo.class_details">
        <div v-if="segmentationInfo.class_details['1']" class="legend-item">
          <div class="color-box" :style="{ backgroundColor: segmentationInfo.class_details['1'].color }"></div>
          <span>{{ segmentationInfo.class_details['1'].nombre }}</span>
        </div>
        <div v-if="segmentationInfo.class_details['2']" class="legend-item">
          <div class="color-box" :style="{ backgroundColor: segmentationInfo.class_details['2'].color }"></div>
          <span>{{ segmentationInfo.class_details['2'].nombre }}</span>
        </div>
        <div v-if="segmentationInfo.class_details['3']" class="legend-item">
          <div class="color-box" :style="{ backgroundColor: segmentationInfo.class_details['3'].color }"></div>
          <span>{{ segmentationInfo.class_details['3'].nombre }}</span>
        </div>
      </template>
      <template v-else>
        <div class="legend-item">
          <div class="color-box tumor-red"></div>
          <span>Tumor</span>
        </div>
        <div class="legend-item">
          <div class="color-box edema-yellow"></div>
          <span>Edema</span>
        </div>
        <div class="legend-item">
          <div class="color-box necrotic-blue"></div>
          <span>Núcleo / Tumor Necrótico</span>
        </div>
      </template>
      <div class="legend-item" style="margin-left: 8px;">
        <span v-if="isLoadingSegmentation" style="color: #ffc107; font-size: 10px;">⏳ Cargando...</span>
        <span v-else-if="segmentedImageData" style="color: #28a745; font-size: 10px;">✅ Listo</span>
        <span v-else style="color: #6c757d; font-size: 10px;">⚪ Sin datos</span>
      </div>
    </div>
  </div>
  <div class="view-content">
    <!-- ESTADO DE CARGA -->
    <div v-if="isLoadingSegmentation" style="text-align: center; color: #6c757d;">
      <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
      <p style="font-size: 14px;">Cargando segmentación...</p>
      <small>Procesando imagen</small>
    </div>

    <!-- CANVAS CON SEGMENTACIÓN REAL (igual que pestaña Diagnóstico IA) -->
    <div v-else-if="segmentedImageData && volumeData && uploadedFiles.length > 0"
      class="canvas-container" style="width:100%; height:100%; position:relative;">
      <canvas ref="canvasDoubleDiagnosis"
        style="width:100%; height:100%; max-width:none; max-height:none; display:block; background:#000;">
      </canvas>
    </div>

    <!-- PLACEHOLDER CUANDO NO HAY SEGMENTACIÓN -->
    <div v-else class="view-placeholder">
      <div style="font-size: 3rem; margin-bottom: 10px; color: #666;">🎯</div>
      <p v-if="uploadedFiles.length > 0 && !segmentationInfo">Sube una imagen para obtener diagnóstico</p>
      <p v-else-if="segmentationInfo && !segmentedImageData">Ve a la pestaña "Diagnóstico IA" primero</p>
      <p v-else>Imagen con marcadores IA</p>
      <small style="color: #6c757d">Áreas de interés resaltadas</small>
    </div>
  </div>
</div>

              </div>
            </div>

          </div>
        </div>

        <div v-if="mainView === '3d' && !allCollapsed" class="navigation-label">
          🎛️ Controles de Renderizado 3D
        </div>
        <div v-if="!allCollapsed" class="bottom-section" :class="{ collapsed: bottomSectionCollapsed }">
          <button class="bottom-toggle-btn" @click="toggleBottomSection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path :d="bottomSectionCollapsed ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'" />
            </svg>
          </button>

          <div v-if="!bottomSectionCollapsed" class="bottom-content">
            <!-- Controles 3D cuando está en vista 3D -->
            <div v-if="mainView === '3d'" class="controls-3d-bottom">
              <div
                style="margin-bottom: 8px; color: #ffffff; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: space-between;">
                <span>🎛️ Controles de Renderizado 3D</span>
                <button class="close-btn-3d" @click="toggleControls3D" title="Cerrar">×</button>
                <div class="scroll-indicator" title="Desplázate para ver más opciones">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </div>
              </div>

              <!-- Controles básicos en layout horizontal -->
              <div class="controls-3d-grid">
                <div class="control-group-inline">
                  <label class="control-label-inline">Opacidad</label>
                  <input type="range" v-model.number="threeDConfig.opacity" min="0" max="1" step="0.01"
                    class="control-slider-inline" />
                  <span class="control-value">{{ threeDConfig.opacity.toFixed(2) }}</span>
                </div>

                <div class="control-group-inline">
                  <label class="control-label-inline">Umbral</label>
                  <input type="range" v-model.number="threshold3D" min="0" max="0.5" step="0.001"
                    class="control-slider-inline" />
                  <span class="control-value">{{ threshold3D.toFixed(3) }}</span>
                </div>

                <div class="control-group-inline">
                  <label class="control-label-inline">Brillo</label>
                  <input type="range" v-model.number="brightness3D" min="0.1" max="3" step="0.01"
                    class="control-slider-inline" />
                  <span class="control-value">{{ brightness3D.toFixed(2) }}</span>
                </div>

                <div class="control-group-inline">
                  <label class="control-label-inline">Contraste</label>
                  <input type="range" v-model.number="contrast3D" min="0.1" max="3" step="0.01"
                    class="control-slider-inline" />
                  <span class="control-value">{{ contrast3D.toFixed(2) }}</span>
                </div>
              </div>

              <!-- Esquema de colores -->
              <div class="color-preset-section">
                <label class="control-label-inline">Esquema de Colores:</label>
                <select v-model="selectedColorPreset" class="color-preset-select-inline">
                  <option v-for="(preset, index) in colorPresets" :key="index" :value="index">
                    {{ preset.name }}
                  </option>
                </select>
              </div>

              <!-- ========================================
                   CONTROLES DE IA Y SEGMENTACIÓN 3D
                   ======================================== -->
              <div class="ai-controls-section">
                <div
                  style="margin: 6px 0 6px 0; color: #00ff88; font-size: 12px; font-weight: 600; border-bottom: 1px solid #00ff88; padding-bottom: 3px;">
                  🤖 Controles de IA
                </div>

                <!-- Toggle principal para IA - SEGMENTACIÓN DESHABILITADA -->
                <!-- TODO: Reactivar cuando se tenga modelo de IA entrenado para segmentación
                <div class="control-group-inline">
                  <label class="control-label-inline ai-label">
                    <input type="checkbox" v-model="showIASegmentation3D" class="ai-checkbox" />
                    Resaltar Segmentación IA
                  </label>
                </div>

                <div v-if="showIASegmentation3D" class="ai-sub-controls">
                  <div class="control-group-inline">
                    <label class="control-label-inline">Opacidad IA</label>
                    <input type="range" v-model.number="aiSegmentationOpacity" min="0" max="1" step="0.05"
                      class="control-slider-inline ai-slider" />
                    <span class="control-value ai-value">{{ aiSegmentationOpacity.toFixed(2) }}</span>
                  </div>

                  <div class="control-group-inline">
                    <label class="control-label-inline ai-label">
                      <input type="checkbox" v-model="autoFocusOnTumor" class="ai-checkbox" />
                      Auto-centrar en Tumor
                    </label>
                  </div>
                </div>
                -->

                <!-- Toggle para volumen mejorado -->
                <div class="control-group-inline">
                  <label class="control-label-inline ai-label">
                    <input type="checkbox" v-model="useEnhancedVolume" class="ai-checkbox" />
                    Usar Volumen Mejorado IA
                  </label>
                </div>

                <!-- Control de mezcla si está activo el volumen mejorado -->
                <div v-if="useEnhancedVolume" class="ai-sub-controls">
                  <div class="control-group-inline">
                    <label class="control-label-inline">Mix Original/IA</label>
                    <input type="range" v-model.number="aiVolumeMixRatio" min="0" max="1" step="0.05"
                      class="control-slider-inline ai-slider" />
                    <span class="control-value ai-value">{{ (aiVolumeMixRatio * 100).toFixed(0) }}% IA</span>
                  </div>
                </div>

                <!-- Estado del procesamiento IA -->
                <div v-if="aiProcessingStatus.isProcessing" class="ai-status">
                  <div class="ai-progress-bar">
                    <div class="ai-progress-fill" :style="{ width: aiProcessingStatus.progress + '%' }"></div>
                  </div>
                  <div class="ai-status-text">{{ aiProcessingStatus.currentTask }} - {{ aiProcessingStatus.progress }}%
                  </div>
                </div>

                <!-- Resultados del análisis IA - DESHABILITADO TEMPORALMENTE -->
                <!-- TODO: Reactivar cuando se tenga modelo de IA entrenado para análisis
                <div v-if="aiAnalysisResults.confidence > 0 && !aiProcessingStatus.isProcessing" class="ai-results">
                  <div class="ai-result-item">
                    <span class="ai-result-label">Confianza:</span>
                    <span class="ai-result-value">{{ (aiAnalysisResults.confidence * 100).toFixed(1) }}%</span>
                  </div>
                  <div v-if="aiAnalysisResults.tumorVolume > 0" class="ai-result-item">
                    <span class="ai-result-label">Vol. Tumor:</span>
                    <span class="ai-result-value">{{ aiAnalysisResults.tumorVolume.toFixed(1) }} cm³</span>
                  </div>
                </div>
                -->

                <!-- Botones de acción IA -->
                <div class="ai-action-buttons">
                  <!-- TODO: Reactivar cuando se tenga modelo de IA entrenado para análisis
                  <button @click="simulateAIAnalysis" :disabled="aiProcessingStatus.isProcessing"
                    class="ai-action-btn ai-analyze-btn">
                    {{ aiProcessingStatus.isProcessing ? 'Analizando...' : '🔍 Analizar con IA' }}
                  </button>
                  -->
                  <button @click="generateAIEnhancement" :disabled="aiProcessingStatus.isProcessing"
                    class="ai-action-btn ai-enhance-btn">
                    {{ aiProcessingStatus.isProcessing ? 'Procesando...' : '✨ Mejorar Volumen' }}
                  </button>
                </div>
              </div>

              <!-- Información de rendimiento -->
              <div class="performance-info">
                <span class="performance-label">FPS:</span>
                <span class="performance-value">{{ performanceInfo3D.fps }}</span>
                <span class="performance-label">Memoria:</span>
                <span class="performance-value">{{ performanceInfo3D.memory }}</span>
                <span class="performance-label">Steps:</span>
                <span class="performance-value">{{ adaptiveSteps }}</span>
              </div>
            </div>

            <!-- Diagnóstico cuando NO está en vista 3D -->
            <div v-else>
              <div style="margin-bottom: 10px; color: #cccccc; font-size: 14px">
                Diagnóstico
              </div>
              <div class="diagnosis-section" @click="activateDiagnosisEditor">
                <textarea v-if="diagnosisEditorActive" v-model="diagnosisText" @blur="deactivateDiagnosisEditor"
                  style="width: 100%; height: 80px; background: transparent; border: none; color: #ffffff; font-size: 14px; resize: none; outline: none;"
                  placeholder="Escriba el diagnóstico aquí..." ref="diagnosisTextarea" />
                <div v-else style="color: #999">
                  {{ diagnosisText || 'Redacción del diagnóstico final por parte del médico' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Sidebar Derecho -->
      <aside class="right-sidebar" :class="{ collapsed: rightSidebarCollapsed }">
        <button class="right-sidebar-toggle-btn" @click="toggleRightSidebar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path :d="rightSidebarCollapsed ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'" />
          </svg>
        </button>

        <div class="sidebar-section">
          <div class="section-header">Clasificación</div>
          <div class="section-body">
            <div class="section-content">Que tipo de tumor es:</div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="section-header">Medidas</div>
          <div class="section-body">
            <div class="section-content">
              <div style="margin-top: 8px; font-size: 11px; color: #888;">
                Datos Cuantitativos<br />
                Explicabilidad
              </div>
            </div>
          </div>
        </div>

        <!-- Controles 3D - Solo visible en vista 3D y cuando la sección bottom está colapsada -->
        <div v-if="mainView === '3d' && bottomSectionCollapsed" class="sidebar-section controls-3d">
          <div class="section-header">
            <span>Controles 3D</span>
            <button @click="showAdvancedControls = !showAdvancedControls" class="advanced-toggle"
              :class="{ active: showAdvancedControls }">
              ⚙️
            </button>
          </div>
          <div class="section-body">
            <div style="text-align: center; padding: 20px; color: #bdc3c7; font-size: 12px;">
              <div style="font-size: 24px; margin-bottom: 8px;">🎛️</div>
              <div>Los controles 3D están disponibles en la parte inferior.</div>
              <button @click="bottomSectionCollapsed = false"
                style="margin-top: 8px; padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                Mostrar Controles
              </button>
            </div>
          </div>
        </div>

        <!-- Controles 3D completos cuando bottom section está colapsada -->
        <div v-if="mainView === '3d' && bottomSectionCollapsed" class="sidebar-section controls-3d"
          style="display: none;">
          <div class="section-header">
            <span>Controles 3D (Sidebar)</span>
            <button @click="showAdvancedControls = !showAdvancedControls" class="advanced-toggle"
              :class="{ active: showAdvancedControls }">
              ⚙️
            </button>
          </div>
          <div class="section-body">
            <!-- Presets de Colores -->
            <div class="control-group">
              <label class="control-label">Esquema de Colores:</label>
              <select v-model="selectedColorPreset" class="color-preset-select">
                <option v-for="(preset, index) in colorPresets" :key="index" :value="index">
                  {{ preset.name }}
                </option>
              </select>
              <div class="preset-description">
                {{ colorPresets[selectedColorPreset].description }}
              </div>
            </div>

            <!-- Controles Básicos -->
            <div class="control-group">
              <label class="control-label">Opacidad: {{ opacity3D.toFixed(2) }}</label>
              <input type="range" v-model.number="opacity3D" min="0" max="1" step="0.01" class="control-slider" />
            </div>

            <div class="control-group">
              <label class="control-label">Umbral: {{ threshold3D.toFixed(3) }}</label>
              <input type="range" v-model.number="threshold3D" min="0" max="0.5" step="0.001" class="control-slider" />
            </div>

            <!-- Controles Avanzados -->
            <div v-if="showAdvancedControls" class="advanced-controls">
              <div class="control-group">
                <label class="control-label">Brillo: {{ brightness3D.toFixed(2) }}</label>
                <input type="range" v-model.number="brightness3D" min="0.1" max="3" step="0.1" class="control-slider" />
              </div>

              <div class="control-group">
                <label class="control-label">Contraste: {{ contrast3D.toFixed(2) }}</label>
                <input type="range" v-model.number="contrast3D" min="0.1" max="3" step="0.1" class="control-slider" />
              </div>

              <div class="control-group">
                <label class="control-label">Pasos: {{ baseSteps }}</label>
                <input type="range" v-model.number="baseSteps" min="64" max="512" step="32" class="control-slider" />
              </div>

              <!-- Controles de Steps Adaptativos por Zoom -->
              <div class="zoom-adaptive-controls">
                <div class="control-subheader">
                  <span>Steps Adaptativos por Zoom</span>
                  <input type="checkbox" v-model="zoomStepsEnabled" class="checkbox-inline" />
                </div>

                <div v-if="zoomStepsEnabled" class="zoom-controls-content">
                  <div class="control-group">
                    <label class="control-label">Steps Mín (Zoom Out): {{ minStepsZoom }}</label>
                    <input type="range" v-model.number="minStepsZoom" min="64" max="512" step="32"
                      class="control-slider" />
                  </div>

                  <div class="control-group">
                    <label class="control-label">Steps Máx (Zoom In): {{ maxStepsZoom }}</label>
                    <input type="range" v-model.number="maxStepsZoom" min="256" max="2048" step="64"
                      class="control-slider" />
                  </div>

                  <div class="control-group">
                    <label class="control-label">Transición Suave</label>
                    <input type="checkbox" v-model="smoothTransitionEnabled" class="checkbox-inline" />
                  </div>

                  <div class="zoom-info">
                    <small>Current Steps: {{ adaptiveSteps }} | Smoothed: {{ Math.round(currentSmoothedSteps) }}</small>
                  </div>
                </div>
              </div>

              <!-- Controles de Corte -->
              <div class="clipping-controls">
                <div class="control-subheader">Controles de Corte</div>

                <div class="control-group">
                  <label class="control-label">Corte X: {{ clippingX.toFixed(2) }}</label>
                  <input type="range" v-model.number="clippingX" min="0" max="1" step="0.01" class="control-slider" />
                </div>

                <div class="control-group">
                  <label class="control-label">Corte Y: {{ clippingY.toFixed(2) }}</label>
                  <input type="range" v-model.number="clippingY" min="0" max="1" step="0.01" class="control-slider" />
                </div>

                <div class="control-group">
                  <label class="control-label">Corte Z: {{ clippingZ.toFixed(2) }}</label>
                  <input type="range" v-model.number="clippingZ" min="0" max="1" step="0.01" class="control-slider" />
                </div>
              </div>

              <!-- Colores Personalizados -->
              <div class="color-controls">
                <div class="control-subheader">Colores Personalizados</div>

                <div class="color-picker-group">
                  <label class="control-label">Color Bajo:</label>
                  <input type="color" :value="vectorToHex(lowColor)" @input="updateLowColor" class="color-picker" />
                </div>

                <div class="color-picker-group">
                  <label class="control-label">Color Medio:</label>
                  <input type="color" :value="vectorToHex(midColor)" @input="updateMidColor" class="color-picker" />
                </div>

                <div class="color-picker-group">
                  <label class="control-label">Color Alto:</label>
                  <input type="color" :value="vectorToHex(highColor)" @input="updateHighColor" class="color-picker" />
                </div>
              </div>

              <!-- Botones de Acción -->
              <div class="action-buttons">
                <button @click="resetToDefaults" class="reset-btn">
                  🔄 Restablecer
                </button>
                <button @click="takeScreenshot3D" class="screenshot-btn">
                  📸 Captura
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="section-header">Datos del Paciente</div>
          <div class="section-body">
            <div class="optional-label">
              <!-- Si no hay datos, muestra "Opcional" -->
              <template v-if="!patientDataToShow.fullName">
                Opcional
              </template>
              <!-- Si ya hay paciente, muestra sus datos -->
              <template v-else>
                <p><strong>Nombre:</strong> {{ patientDataToShow.fullName }}</p>
                <p><strong>Edad:</strong> {{ patientDataToShow.age }}</p>
                <p><strong>ID:</strong> {{ patientDataToShow.patientId }}</p>
                <p><strong>Sexo:</strong> {{ patientDataToShow.gender }}</p>
                <p><strong>Teléfono:</strong> {{ patientDataToShow.phone }}</p>
                <p><strong>Email:</strong> {{ patientDataToShow.email }}</p>
                <p><strong>Dirección:</strong> {{ patientDataToShow.address }}</p>
              </template>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="section-header">Información de Estudio</div>
          <div class="section-body">
            <div class="section-content">
              Tipo de Estudio:<br />
              Fecha diagnóstico:<br />
              Nombre Médico:
            </div>
          </div>
        </div>
      </aside>
    </div>
    <!-- Modal principal -->
    <div v-if="showModal" class="modal-overlay" @click.self="resetModal">
      <div class="modal-container">
        <!-- Header del modal -->
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Importar Imagen Médica</h3>
            <p class="modal-subtitle">
              Seleccione y valide una imagen médica para análisis con IA
            </p>
          </div>
          <button @click="resetModal" class="modal-close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <!-- Indicador de pasos -->
        <div class="step-indicator-container">
          <!-- Paso 1 -->
          <div class="step-indicator-item">
            <div class="step-number" :class="{
              'step-active': currentStep === 1,
              'step-completed': currentStep > 1,
              'step-inactive': currentStep < 1
            }">
              1
            </div>
            <span class="step-label" :class="{ 'label-active': currentStep === 1 }">
              SELECCIONAR
            </span>
          </div>

          <div class="step-separator"></div>

          <!-- Paso 2 -->
          <div class="step-indicator-item">
            <div class="step-number" :class="{
              'step-active': currentStep === 2,
              'step-completed': currentStep > 2,
              'step-inactive': currentStep < 2
            }">
              2
            </div>
            <span class="step-label" :class="{ 'label-active': currentStep === 2 }">
              VALIDAR
            </span>
          </div>
          <div v-if="showUploadSection" class="step-separator"></div>
          <!-- Paso 3 -->
          <div v-if="showUploadSection" class="step-indicator-item">
            <div class="step-number" :class="{
              'step-active': currentStep === 3,
              'step-completed': false,
              'step-inactive': currentStep < 3
            }">
              3
            </div>
            <span class="step-label" :class="{ 'label-active': currentStep === 3 }">
              CONFIRMAR
            </span>
          </div>
        </div>

        <!-- Contenido del modal -->
        <div class="modal-content">
          <!-- Paso 1: Seleccionar -->
          <div v-if="currentStep === 1" class="modal-step">
            <div class="step-content">
              <h3 class="step-title">Seleccione una imagen médica</h3>



              <!-- Archivo seleccionado -->
              <div v-if="uploadedFiles.length > 0" class="file-selected">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22,4 12,14.01 9,11.01"></polyline>
                </svg>
                <p class="file-selected-text">Archivo seleccionado</p>
                <p class="file-selected-name">{{ uploadedFiles[0]?.name }}</p>
              </div>

              <button @click="selectFile" class="select-file-btn">
                {{ uploadedFiles.length > 0 ? 'Cambiar Archivo' : 'Examinar Archivo' }}
              </button>

              <!-- Progreso de carga -->
              <div v-if="isUploading" class="upload-progress">
                <div class="progress-text">
                  <span>Subiendo archivo...</span>
                  <span>100%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
              </div>

              <!-- Progreso de procesamiento del Worker -->
              <div v-if="isProcessing" class="worker-progress">
                <div class="progress-text">
                  <span>{{ processingMessage || 'Procesando en segundo plano...' }}</span>
                  <span>{{ processingProgress }}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
                </div>
                <div class="worker-status">
                  <svg class="spinner" viewBox="0 0 24 24" width="16" height="16">
                    <path
                      d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  Web Worker procesando...
                </div>
              </div>
            </div>

            <div class="formats-section">
              <h4 class="formats-title">Formatos Compatibles:</h4>
              <div class="format-badge">DICOM</div>

              <!-- Botón temporal para probar Web Worker -->
              <button v-if="isWorkerReady" @click="testWorker" class="test-worker-btn">
                🔧 Probar Worker
              </button>
              <div v-else-if="isProcessing" class="worker-status-mini">
                ⚙️ Worker procesando...
              </div>
              <div v-else class="worker-status-mini">
                ❌ Worker no disponible
              </div>
            </div>

            <!-- Lista de archivos -->
            <div v-if="uploadedFiles.length > 0" class="files-section">
              <h4 class="files-title">Archivo Cargado</h4>
              <p class="files-count">1 archivo seleccionado</p>

              <div class="file-item">
                <div class="file-info">
                  <div class="file-icon">🧠</div>
                  <div class="file-details">
                    <div class="file-name">{{ uploadedFiles[0]?.name }}</div>
                    <div class="file-meta">
                      <span>2.4 MB</span>
                      <span>DICOM</span>
                      <span class="file-status">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22,4 12,14.01 9,11.01"></polyline>
                        </svg>
                        completado
                      </span>
                    </div>
                  </div>
                </div>
                <div class="file-actions">
                  <button class="file-action-btn view-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button @click="clearFiles" class="file-action-btn delete-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>


          <!-- Paso 2: Validar -->
          <div v-if="currentStep === 2" class="modal-step">
            <h3 class="step-title">Validar Imagen</h3>

            <div v-if="isLoading" class="loading-state">
              <div class="loading-spinner"></div>
              <p class="loading-text">Validando formato DICOM...</p>
              <p class="loading-subtext">Verificando integridad del archivo</p>
            </div>

            <div v-else>
              <div class="validation-success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22,4 12,14.01 9,11.01"></polyline>
                </svg>
                <p class="success-text">Archivo cargado exitosamente</p>
                <p class="success-filename">{{ uploadedFiles[0]?.name }}</p>
              </div>

              <div v-if="showPatientSection" class="patient-data-section">
                <div class="patient-data-header">
                  <input type="checkbox" id="includePatient" v-model="includePatientData" class="patient-checkbox"
                    @change="toggle('includePatient')" />
                  <label for="includePatient" class="patient-label">
                    Incluir datos del paciente (opcional)
                  </label>
                  <input type="checkbox" id="onlyConsultations" v-model="registerNewConsultations"
                    class="patient-checkbox" @change="toggle('onlyConsultations')" />
                  <label for="onlyConsultations" class="patient-label">
                    Solo Consulta
                  </label>
                </div>

                <!-- Datos del paciente -->

                <div v-if="includePatientData" class="patient-form">
                  <label class="patient-label">
                    Buscar Paciente
                  </label>
                  <div class="form-row bottom-separator">
                    <div class="form-field">
                      <label class="field-label">Cedula del paciente</label>
                      <div>

                        <input type="text" v-model="patientFindId" class="field-input" :disabled="registerNewPatient" />

                        <button @click="findPatient" class="btn-find" :disabled="registerNewPatient">
                          Buscar
                        </button>
                        <div>
                          <input type="checkbox" id="registerPatient" v-model="registerNewPatient"
                            class="patient-checkbox" />
                          <label for="registerPatient" class="patient-label">
                            Registrar nuevo paciente
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-field">
                      <label class="field-label">Nombre completo *</label>
                      <input type="text" placeholder="Ej: Juan Pérez" v-model="patientData.fullName" class="field-input"
                        :disabled="!registerNewPatient" @input="(e) => validateName(e, patientData)" />
                    </div>

                    <div class="form-field">
                      <label class="field-label">Edad *</label>
                      <input type="number" placeholder="Ej: 45" v-model="patientData.age" class="field-input" min="0"
                        max="120" :disabled="!registerNewPatient" />
                    </div>

                    <div class="form-field">
                      <label class="field-label">Teléfono *</label>
                      <input type="text" placeholder="Ej: +593999999999 o 0999999999" v-model="patientData.phone"
                        class="field-input" :disabled="!registerNewPatient"
                        @input="(e) => validatePhone(e, patientData)" />
                    </div>

                    <div class="form-field">
                      <label class="field-label">Email *</label>
                      <input type="email" placeholder="Ej: juanperez@email.com" v-model="patientData.email"
                        class="field-input" :disabled="!registerNewPatient"
                        @blur="(e) => validateEmail(e, patientData)" />
                    </div>

                    <div class="form-field full-width-label">
                      <label class="field-label">Dirección</label>
                      <input type="text" placeholder="Ej: Calle#123, Colonia, Ciudad" v-model="patientData.address"
                        class="field-input" :disabled="!registerNewPatient" />
                    </div>

                    <div class="form-field full-width-label">
                      <label class="field-label">Cédula *</label>
                      <input type="text" placeholder="Ej: 0102030405" v-model="patientData.patientId"
                        class="field-input" maxlength="10" :disabled="!registerNewPatient"
                        @input="(e) => validateCedula(e, patientData)" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-field">
                      <label class="field-label">Historial Clinico </label>
                      <input type="text" placeholder="Ej: PAC-2025-001" v-model="patientData.clinicalHistory"
                        class="field-input" :disabled="!registerNewPatient" />
                    </div>
                    <div class="form-field">
                      <label class="field-label">Sexo *</label>
                      <select v-model="patientData.gender" class="field-select" :disabled="!registerNewPatient">
                        <option value="">Seleccionar</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-field-full">
                    <label class="field-label">Motivo clínico</label>
                    <textarea placeholder="Ej: Cefalea recurrente, evaluación de masa cerebral"
                      v-model="patientData.clinicalReason" class="field-textarea"
                      :disabled="!registerNewPatient"></textarea>
                  </div>
                </div>
              </div>

              <div class="file-details-section">
                <h4 class="details-title">Detalles del archivo:</h4>
                <div class="details-grid">
                  <div class="detail-row">
                    <span>Formato:</span>
                    <span class="detail-value success">{{ imageFormat }}</span>
                  </div>
                  <div class="detail-row">
                    <span>Tamaño:</span>
                    <span class="detail-value">{{ imageSize }}</span>
                  </div>
                  <div class="detail-row">
                    <span>Dimensiones:</span>
                    <span class="detail-value">{{ imageDimensions }}</span>
                  </div>
                  <div class="detail-row">
                    <span>Modalidad:</span>
                    <span class="detail-value">{{ imageModality }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Paso 3: Confirmar -->
          <div v-if="currentStep === 3" class="modal-step">
            <h3 class="step-title">Confirmar Procesamiento</h3>
            <div class="confirmation-alert">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p class="confirmation-text">¿Desea proceder con el análisis de IA?</p>
            </div>
            <div class="processing-summary">
              <h4 class="summary-title">Resumen del procesamiento:</h4>
              <div class="summary-details">
                <div class="detail-row">
                  <span>Archivos a procesar:</span>
                  <span class="detail-value primary">1</span>
                </div>
                <div class="detail-row">
                  <span>Tiempo estimado:</span>
                  <span class="detail-value">30-45 segundos</span>
                </div>

                <!-- TODO: Reactivar cuando se tenga modelo de IA entrenado
                <div class="detail-row">
                  <span>Análisis IA:</span>
                  <span class="detail-value success">Segmentación de tumores</span>
                </div>
                -->
                <div class="detail-row">
                  <span>Datos del paciente:</span>
                  <span :class="includePatientData ? 'detail-value success' : 'detail-value'">
                    {{ includePatientData ? 'Incluidos' : 'No incluidos' }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="includePatientData" class="patient-summary">
              <h4 class="summary-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Datos del Paciente
              </h4>
              <div class="summary-grid">
                <div>Nombre: {{ patientData.fullName || 'No especificado' }}</div>
                <div>Edad: {{ patientData.age || 'No especificado' }}</div>
                <div>ID: {{ patientData.patientId || 'No especificado' }}</div>
                <div>Sexo: {{ patientData.gender || 'No especificado' }}</div>
                <div class="summary-full">Motivo: {{ patientData.clinicalReason || 'No especificado' }}</div>
              </div>
            </div>

            <div class="warning-notice">
              <p class="warning-text">
                <strong>Importante:</strong> El análisis comenzará inmediatamente después de confirmar.
                Los resultados se mostrarán en la interfaz principal.
              </p>
            </div>


          </div>
        </div>
        <!-- Botones del modal -->
        <div class="modal-actions">
          <button @click="resetModal" class="btn-cancel">
            CANCELAR
          </button>

          <div class="action-buttons">
            <!-- Botón atrás -->
            <button v-if="currentStep > 1" @click="currentStep--" class="btn-back">
              ATRÁS
            </button>

            <!-- Botón principal dinámico -->
            <button v-if="!showPatientSection" @click="() => { showPatientSection = true; handleFinalConfirm(); }"
              :disabled="(currentStep === 1 && uploadedFiles.length === 0) || isLoading" class="btn-primary">
              {{ currentStep === 1 ? 'VALIDAR' : 'MOSTRAR' }}
            </button>

            <button v-else-if="currentStep < 3" @click="handleValidateAndConfirm"
              :disabled="(currentStep === 1 && uploadedFiles.length === 0) || isLoading" class="btn-primary">
              {{ isLoading ? 'CARGANDO...' : currentStep === 2 ? 'CARGAR' : 'VALIDAR' }}
            </button>

            <!-- Botón confirmar -->
            <button v-if="currentStep === 3" @click="handleFinalConfirm" class="btn-confirm">
              CONFIRMAR
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel lateral para controles 3D en modo maximizado -->
    <div v-if="allCollapsed && mainView === '3d' && controls3DVisible" class="controls-3d-sidebar">
      <div class="sidebar-header">
        <h3>🎛️ Controles 3D</h3>
        <button class="close-btn-3d sidebar" @click="toggleControls3D" title="Cerrar">×</button>
      </div>

      <div class="sidebar-content">
        <!-- Controles básicos -->
        <div class="control-group-sidebar">
          <label class="control-label-sidebar">Opacidad</label>
          <input type="range" v-model.number="opacity3D" min="0" max="1" step="0.01" class="control-slider-sidebar" />
          <span class="control-value-sidebar">{{ opacity3D.toFixed(2) }}</span>
        </div>

        <div class="control-group-sidebar">
          <label class="control-label-sidebar">Umbral</label>
          <input type="range" v-model.number="threshold3D" min="0" max="0.5" step="0.001"
            class="control-slider-sidebar" />
          <span class="control-value-sidebar">{{ threshold3D.toFixed(3) }}</span>
        </div>

        <div class="control-group-sidebar">
          <label class="control-label-sidebar">Brillo</label>
          <input type="range" v-model.number="brightness3D" min="0.1" max="3" step="0.01"
            class="control-slider-sidebar" />
          <span class="control-value-sidebar">{{ brightness3D.toFixed(2) }}</span>
        </div>

        <div class="control-group-sidebar">
          <label class="control-label-sidebar">Contraste</label>
          <input type="range" v-model.number="contrast3D" min="0.1" max="3" step="0.01"
            class="control-slider-sidebar" />
          <span class="control-value-sidebar">{{ contrast3D.toFixed(2) }}</span>
        </div>

        <!-- Esquema de colores -->
        <div class="color-preset-section-sidebar">
          <label class="control-label-sidebar">Esquema de Colores:</label>
          <select v-model="selectedColorPreset" class="color-preset-select-sidebar">
            <option v-for="(preset, index) in colorPresets" :key="index" :value="index">
              {{ preset.name }}
            </option>
          </select>
        </div>

        <!-- Controles de IA -->
        <div class="ai-controls-section-sidebar">
          <div class="ai-section-title">🤖 Controles de IA</div>

          <!-- TODO: Reactivar cuando se tenga modelo de IA entrenado para segmentación
          <div class="control-group-sidebar">
            <label class="control-label-sidebar ai-label">
              <input type="checkbox" v-model="showIASegmentation3D" class="ai-checkbox" />
              Resaltar Segmentación IA
            </label>
          </div>

          <div v-if="showIASegmentation3D" class="ai-sub-controls-sidebar">
            <div class="control-group-sidebar">
              <label class="control-label-sidebar">Opacidad IA</label>
              <input type="range" v-model.number="aiSegmentationOpacity" min="0" max="1" step="0.05"
                class="control-slider-sidebar ai-slider" />
              <span class="control-value-sidebar ai-value">{{ aiSegmentationOpacity.toFixed(2) }}</span>
            </div>

            <div class="control-group-sidebar">
              <label class="control-label-sidebar ai-label">
                <input type="checkbox" v-model="autoFocusOnTumor" class="ai-checkbox" />
                Auto-centrar en Tumor
              </label>
            </div>
          </div>
          -->

          <div class="control-group-sidebar">
            <label class="control-label-sidebar ai-label">
              <input type="checkbox" v-model="useEnhancedVolume" class="ai-checkbox" />
              Usar Volumen Mejorado IA
            </label>
          </div>

          <div v-if="useEnhancedVolume" class="ai-sub-controls-sidebar">
            <div class="control-group-sidebar">
              <label class="control-label-sidebar">Mix Original/IA</label>
              <input type="range" v-model.number="aiVolumeMixRatio" min="0" max="1" step="0.05"
                class="control-slider-sidebar ai-slider" />
              <span class="control-value-sidebar ai-value">{{ (aiVolumeMixRatio * 100).toFixed(0) }}% IA</span>
            </div>
          </div>

          <!-- Botones de acción IA -->
          <div class="ai-action-buttons-sidebar">
            <!-- TODO: Reactivar cuando se tenga modelo de IA entrenado para análisis
            <button @click="simulateAIAnalysis" :disabled="aiProcessingStatus.isProcessing"
              class="ai-action-btn-sidebar ai-analyze-btn">
              {{ aiProcessingStatus.isProcessing ? 'Analizando...' : '🔍 Analizar' }}
            </button>
            -->
            <button @click="generateAIEnhancement" :disabled="aiProcessingStatus.isProcessing"
              class="ai-action-btn-sidebar ai-enhance-btn">
              {{ aiProcessingStatus.isProcessing ? 'Procesando...' : '✨ Mejorar' }}
            </button>
          </div>
        </div>

        <!-- Información de rendimiento -->
        <div class="performance-info-sidebar">
          <div class="performance-item">
            <span class="performance-label">FPS:</span>
            <span class="performance-value">{{ performanceInfo3D.fps }}</span>
          </div>
          <div class="performance-item">
            <span class="performance-label">Memoria:</span>
            <span class="performance-value">{{ performanceInfo3D.memory }}</span>
          </div>
          <div class="performance-item">
            <span class="performance-label">Steps:</span>
            <span class="performance-value">{{ adaptiveSteps }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel Lateral de Filtros IA (flotante) -->
    <div class="ai-filter-panel" :class="{ 'panel-visible': showAIFilterPanel }">
      <div class="panel-content">
        <div class="panel-header">
          <div class="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
              <path d="M7 12h5l-3-3"></path>
              <path d="M7 12l3 3"></path>
            </svg>
            <strong>🔬 Filtros</strong>
          </div>
          <button class="panel-close-btn" @click="toggleAIFilterPanel" title="Cerrar panel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="panel-info">
          ⚡ Procesamiento avanzado con Web Worker para mejor rendimiento
        </div>

        <!-- Botón de control para el menú 3D cuando está en vista 3D -->
        <div v-if="mainView === '3d'" class="controls-3d-toggle-container">
          <button class="controls-toggle-btn" @click="toggleControls3D" :class="{ 'active': controls3DVisible }">
            <span v-if="controls3DVisible">🎛️ Ocultar Controles 3D</span>
            <span v-else>🎛️ Mostrar Controles 3D</span>
          </button>
        </div>

        <!-- Contenedor de filtros para vistas 2D -->
        <div v-if="mainView !== '3d'" class="filters-container">
          <!-- Filtro de Nitidez -->
          <div class="filter-section">
            <div class="filter-header">
              <label class="filter-toggle">
                <input type="checkbox" v-model="webWorkerSettings.sharpening.enabled"
                  @change="updateImageWithWebWorkerFilters">
                <span class="filter-icon">🔍</span>
                <span class="filter-name">Nitidez</span>
              </label>
            </div>
            <div v-if="webWorkerSettings.sharpening.enabled" class="filter-controls">
              <div class="control-row">
                <label>Intensidad:</label>
                <input type="range" v-model.number="webWorkerSettings.sharpening.strength" min="0.1" max="3.0"
                  step="0.1" @change="updateImageWithWebWorkerFilters">
                <span class="control-value">{{ webWorkerSettings.sharpening.strength.toFixed(1) }}</span>
              </div>
            </div>
          </div>

          <!-- Filtro de Reducción de Ruido -->
          <div class="filter-section">
            <div class="filter-header">
              <label class="filter-toggle">
                <input type="checkbox" v-model="webWorkerSettings.denoising.enabled"
                  @change="updateImageWithWebWorkerFilters">
                <span class="filter-icon">🧹</span>
                <span class="filter-name">Reducción de Ruido</span>
              </label>
            </div>
            <div v-if="webWorkerSettings.denoising.enabled" class="filter-controls">
              <div class="control-row">
                <label>Intensidad:</label>
                <input type="range" v-model.number="webWorkerSettings.denoising.strength" min="0.1" max="1.0" step="0.1"
                  @change="updateImageWithWebWorkerFilters">
                <span class="control-value">{{ webWorkerSettings.denoising.strength.toFixed(1) }}</span>
              </div>
            </div>
          </div>

          <!-- Filtro de Detección de Bordes -->
          <div class="filter-section">
            <div class="filter-header">
              <label class="filter-toggle">
                <input type="checkbox" v-model="webWorkerSettings.edgeDetection.enabled"
                  @change="updateImageWithWebWorkerFilters">
                <span class="filter-icon">⚡</span>
                <span class="filter-name">Detección de Bordes</span>
              </label>
            </div>
            <div v-if="webWorkerSettings.edgeDetection.enabled" class="filter-controls">
              <div class="control-row">
                <label>Umbral:</label>
                <input type="range" v-model.number="webWorkerSettings.edgeDetection.threshold" min="0.01" max="0.5"
                  step="0.01" @change="updateImageWithWebWorkerFilters">
                <span class="control-value">{{ webWorkerSettings.edgeDetection.threshold.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Filtro de Mejora Médica -->
          <div class="filter-section">
            <div class="filter-header">
              <label class="filter-toggle">
                <input type="checkbox" v-model="webWorkerSettings.medicalEnhancement.enabled"
                  @change="updateImageWithWebWorkerFilters">
                <span class="filter-icon">🏥</span>
                <span class="filter-name">Mejora Médica</span>
              </label>
            </div>
            <div v-if="webWorkerSettings.medicalEnhancement.enabled" class="filter-controls">
              <div class="control-row">
                <label>Tipo:</label>
                <select v-model="webWorkerSettings.medicalEnhancement.preset" @change="updateImageWithWebWorkerFilters"
                  class="filter-select">
                  <option value="brain">Cerebro</option>
                  <option value="tumor">Tumor</option>
                </select>
              </div>
              <div class="control-row">
                <label>Contraste:</label>
                <input type="range" v-model.number="webWorkerSettings.medicalEnhancement.contrast" min="0.8" max="1.6"
                  step="0.1" @change="updateImageWithWebWorkerFilters">
                <span class="control-value">{{ webWorkerSettings.medicalEnhancement.contrast.toFixed(1) }}</span>
              </div>
              <div class="control-row">
                <label>Brillo:</label>
                <input type="range" v-model.number="webWorkerSettings.medicalEnhancement.brightness" min="-0.2"
                  max="0.4" step="0.1" @change="updateImageWithWebWorkerFilters">
                <span class="control-value">{{ webWorkerSettings.medicalEnhancement.brightness.toFixed(1) }}</span>
              </div>
            </div>
          </div>

          <!-- Filtro de Ecualización de Histograma -->
          <div class="filter-section">
            <div class="filter-header">
              <label class="filter-toggle">
                <input type="checkbox" v-model="webWorkerSettings.histogramEqualization.enabled"
                  @change="updateImageWithWebWorkerFilters">
                <span class="filter-icon">📊</span>
                <span class="filter-name">Ecualización de Histograma</span>
              </label>
            </div>
            <div v-if="webWorkerSettings.histogramEqualization.enabled" class="filter-controls">
              <div class="info-message">
                Esta técnica mejora automáticamente el contraste distribuido de la imagen.
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones del panel -->
        <div class="panel-actions">
          <button class="action-btn restore-btn" @click="restoreOriginalImage"
            :disabled="!Object.keys(originalImagesByView).length && !originalImageData">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16,6 12,2 8,6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            Restaurar Original
          </button>

          <button class="action-btn reset-btn" @click="resetWebWorkerFilters"
            :disabled="!Object.values(webWorkerSettings).some(s => s.enabled)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
            Resetear Filtros
          </button>

          <button class="action-btn save-btn" @click="saveCurrentImage"
            :disabled="isImageProcessing.value || uploadedFiles.length === 0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17,21 17,13 7,13 7,21"></polyline>
              <polyline points="7,3 7,8 15,8"></polyline>
            </svg>
            Guardar Imagen
          </button>

          <div class="processing-status" v-if="isImageProcessing.value">
            <div class="status-spinner"></div>
            <span>Procesando...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input de archivo oculto -->
    <input ref="fileInput" type="file" accept=".zip,.dcm,.nii,.nii.gz" style="display: none"
      @change="handleFileUpload" />
    <footer class="footer">
      <p>&copy; 2025 Copyright - Universidad Católica de Cuenca</p>
    </footer>
  </div>
</template>

<script setup>
import { useAIWorker } from '@/composables/ai/useAIWorker'
import { useImageProcessing } from '@/composables/viewer/useImageProcessing'
import { useMedicalWorker } from '@/composables/workers/useMedicalWorker'
import localforage from 'localforage'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { computed, markRaw, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

console.log('DASHBOARD CARGADO - TEST F11')

// Importar imágenes
import axialImage from '@/assets/images/axial.png'
import cerebro3DImage from '@/assets/images/Cerebro3D.png'
import frontalImage from '@/assets/images/frontal.png'
import logoImage from '@/assets/images/logo-uc-posgrado.png'
import pruebascerebrloImage from '@/assets/images/posgradosimg1.png'
import pruebacerebrosegmentadaImage from '@/assets/images/posgradosimgsegmentada.png'
import ResonanciaMagneticaImage from '@/assets/images/Resonanciamagnetica.png'
import sagitalImage from '@/assets/images/Sagital.png'

// Composables
const router = useRouter()
const backendURL = import.meta.env.VITE_API_BASE_URL;
const token = localStorage.getItem('authToken');

// Variables para el sistema de almacenamiento IndexedDB
const originalImageBlob = ref(null);
const aiImageBlob = ref(null);
const dualViewImageBlob = ref(null);
const DB_NAME = '3DViewerDB';
const DB_VERSION = 1;
const STORE_NAME = 'patientImages';
let db = null;

// Estados de carga específicos del modal
const isUploading = ref(false)

// Variables reactivas para tamaño dinámico del canvas principal
const canvasDisplayWidth = ref(1000)
const canvasDisplayHeight = ref(700)

// Variables globales para el sistema Three.js principal
let renderer = null
let scene = null
let camera = null
let controls = null
let volumeMesh = null

// Datos volumétricos y estado global (declarados antes de cualquier uso)
let volumeData = null
let width = 0, height = 0, depth = 0
let originalDataMin = 0, originalDataMax = 255
const currentSlices = reactive({ axial: 0, coronal: 0, sagittal: 0 })
const windowLevel = reactive({ window: 255, level: 128 })

// Posiciones personalizadas de los crosshairs (porcentajes 0.0 - 1.0)
const crosshairPositions = reactive({
  axial: { x: 0.5, y: 0.5 },      // Centro por defecto
  coronal: { x: 0.5, y: 0.5 },
  sagittal: { x: 0.5, y: 0.5 }
})

// Estado del arrastre de crosshairs
const crosshairDragging = reactive({
  isDragging: false,
  view: null  // 'axial', 'coronal', 'sagittal'
})

// Mostrar tooltip de ayuda para crosshairs
const showCrosshairTooltip = ref(false)

const currentDataType = ref({
  name: '',
  description: '',
  isOptimized: false,
  notes: '',
  hasIssues: false,
  issueType: ''
})

//no uso Luis Vile
const handleFileChange = (type, event) => {
  const file = event.target.files[0];
  if (file) {
    if (type === 'original') originalImageBlob.value = file;
    else if (type === 'ai') aiImageBlob.value = file;
    else if (type === 'dualView') dualViewImageBlob.value = file;
  }
};
// Funciones para IndexedDB
const openDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.errorCode);
      reject("Error al abrir la base de datos");
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
  });
};

const saveImage = async (id, imageBlob) => {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id: id, image: imageBlob });
    request.onsuccess = () => {
      console.log(`Imagen con ID ${id} guardada exitosamente.`);
      resolve();
    };
    request.onerror = (event) => {
      console.error("Error al guardar la imagen:", event.target.error);
      reject("Error al guardar la imagen");
    };
  });
};

//no uso Luis Vile
const loadImage = async (id) => {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = (event) => {
      const result = event.target.result;
      resolve(result ? result.image : null);
    };
    request.onerror = (event) => {
      console.error("Error al cargar la imagen:", event.target.error);
      reject("Error al cargar la imagen");
    };
  });
};

// Web Worker para procesamiento médico
const {
  isWorkerReady,
  isProcessing,
  processingProgress,
  processingMessage,
  processNiftiFile,
  processZipFile,
  testWorker: workerTest
} = useMedicalWorker()

// Web Worker para análisis de IA - DESHABILITADO TEMPORALMENTE
// TODO: Reactivar cuando se tenga modelo de IA entrenado
// const {
//   analyzeWithAI,
//   enhanceImage
// } = useAIWorker()

// Mantener solo enhanceImage para volumen mejorado
const {
  enhanceImage
} = useAIWorker()

// Web Worker para procesamiento de imágenes
const {
  isProcessing: isImageProcessing,
  initializeWorker
} = useImageProcessing()

// Importar composables y funcionalidades (declaraciones moved arriba para evitar uso antes de inicializar)
//import { useImageProcessingWorker } from '@/composables/useImageProcessingWorker'
import { useImageProcessingWorker } from '@/composables/viewer/useImageProcessingWorker'
const imageProcessingWorker = useImageProcessingWorker()

// Variables para prevenir doble ejecución de filtros
const isFilterProcessing = ref(false)
const filterDebounceTimer = ref(null)
const originalImageData = ref(null) // Para guardar imagen original
const originalImagesByView = ref({}) // Para guardar imágenes originales por vista

// ============================================
// 🎯 DATOS Y CONFIGURACIÓN DE CROSSHAIRS
// ============================================

const crosshairsData = reactive({
  axial: { x: 0, y: 0, visible: true },
  coronal: { x: 0, y: 0, visible: true },
  sagittal: { x: 0, y: 0, visible: true }
})

// Estado para arrastrar crosshairs
const draggingCrosshairs = reactive({
  active: false,
  view: null,
  startX: 0,
  startY: 0
})

// Configuración de apariencia de crosshairs
const crosshairsConfig = {
  color: '#00FF00',        // Verde brillante
  hoverColor: '#FFFF00',   // Amarillo al hover
  lineWidth: 1,
  dashPattern: [5, 3],     // Líneas discontinuas
  opacity: 0.2,            // 🔧 Reducido de 0.8 a 0.2 para no interferir con vista 3D
  hoverOpacity: 1.0,
  cursorSize: 10          // Tamaño del cursor central
}

// Variables para detección de hover en crosshairs
const crosshairsHover = reactive({
  axial: false,
  coronal: false,
  sagittal: false
})

// 🎯 VARIABLES PARA SINCRONIZACIÓN 3D
// Planos de corte en la vista 3D que corresponden a los crosshairs 2D
const crosshairPlanes3D = reactive({
  axial: null,     // Plano Z (horizontal)
  coronal: null,   // Plano Y (frontal)
  sagittal: null   // Plano X (lateral)
})

// Configuración de los planos 3D
const crosshairPlanes3DConfig = {
  opacity: 0.15,     // 🔧 Reducido de 0.5 a 0.15 para que no interfiera con vista 3D
  color: 0x00FFAA,   // Verde cian brillante para destacar
  wireframe: false,
  transparent: true,
  size: 3.0          // Aumentado de 2.0 a 3.0 para planos más grandes
}

// Estados de herramientas y controles (declarados antes de cualquier uso)
const quadViewActive = ref(false)
const zoomActive = ref(false)
const measureActive = ref(false)
const limpiarActive = ref(false)
const sliceNavigationActive = ref(true) // Nueva variable para navegación de slices con scroll
const showInfoPanel = ref(true) // Nueva variable para controlar la visibilidad del panel de información
const canUploadImage = ref(true)
const showOriginalImage = ref(false)

// ============================================
// 🎯 FUNCIONES DE CROSSHAIRS INTERACTIVOS
// ============================================

/**
 * Inicializa las posiciones de crosshairs al centro de cada vista
 */
function initializeCrosshairs() {
  if (!volumeData) return

  crosshairsData.axial.x = Math.floor(width / 2)
  crosshairsData.axial.y = Math.floor(height / 2)

  crosshairsData.coronal.x = Math.floor(width / 2)
  crosshairsData.coronal.y = Math.floor(depth / 2)

  crosshairsData.sagittal.x = Math.floor(height / 2)
  crosshairsData.sagittal.y = Math.floor(depth / 2)

  console.log('🎯 Crosshairs inicializados:', {
    axial: `${crosshairsData.axial.x}, ${crosshairsData.axial.y}`,
    coronal: `${crosshairsData.coronal.x}, ${crosshairsData.coronal.y}`,
    sagittal: `${crosshairsData.sagittal.x}, ${crosshairsData.sagittal.y}`
  })
}

/**
 * Sincroniza todas las vistas cuando se mueve un crosshair
 */
function syncViewsFromCrosshair(sourceView, newX, newY) {
  if (!volumeData) return

  console.log(`🔄 Sincronizando desde ${sourceView}: (${newX}, ${newY})`)

  switch (sourceView) {
    case 'axial':
      crosshairsData.axial.x = newX
      crosshairsData.axial.y = newY
      currentSlices.coronal = newY
      currentSlices.sagittal = newX
      crosshairsData.coronal.x = newX
      crosshairsData.coronal.y = currentSlices.axial
      crosshairsData.sagittal.x = newY
      crosshairsData.sagittal.y = currentSlices.axial
      break

    case 'coronal':
      crosshairsData.coronal.x = newX
      crosshairsData.coronal.y = newY
      currentSlices.axial = newY
      currentSlices.sagittal = newX
      crosshairsData.axial.x = newX
      crosshairsData.axial.y = currentSlices.coronal
      crosshairsData.sagittal.x = currentSlices.coronal
      crosshairsData.sagittal.y = newY
      break

    case 'sagittal':
      crosshairsData.sagittal.x = newX
      crosshairsData.sagittal.y = newY
      currentSlices.axial = newY
      currentSlices.coronal = newX
      crosshairsData.axial.x = currentSlices.sagittal
      crosshairsData.axial.y = newX
      crosshairsData.coronal.x = currentSlices.sagittal
      crosshairsData.coronal.y = newY
      break
  }

  if (quadViewActive.value) {
    nextTick(() => {
      redrawQuadViews()
    })
  }

  updateCrosshairPlanes3D()
}

/**
 * Dibuja crosshairs interactivos en una vista específica
 */
function drawInteractiveCrosshairs(ctx, canvas, viewType) {
  if (!crosshairsEnabled.value || !crosshairsData[viewType]?.visible) return

  const crosshair = crosshairsData[viewType]
  const isHovering = crosshairsHover[viewType]

  ctx.save()
  ctx.strokeStyle = isHovering ? crosshairsConfig.hoverColor : crosshairsConfig.color
  ctx.lineWidth = crosshairsConfig.lineWidth
  ctx.globalAlpha = isHovering ? crosshairsConfig.hoverOpacity : crosshairsConfig.opacity
  ctx.setLineDash(crosshairsConfig.dashPattern)

  const scaleX = canvas.width / getDimensionForView(viewType, 'width')
  const scaleY = canvas.height / getDimensionForView(viewType, 'height')

  const canvasX = crosshair.x * scaleX
  const canvasY = crosshair.y * scaleY

  ctx.beginPath()
  ctx.moveTo(canvasX, 0)
  ctx.lineTo(canvasX, canvas.height)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, canvasY)
  ctx.lineTo(canvas.width, canvasY)
  ctx.stroke()

  const cursorSize = crosshairsConfig.cursorSize
  ctx.setLineDash([])
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(canvasX - cursorSize, canvasY - cursorSize)
  ctx.lineTo(canvasX + cursorSize, canvasY + cursorSize)
  ctx.moveTo(canvasX - cursorSize, canvasY + cursorSize)
  ctx.lineTo(canvasX + cursorSize, canvasY - cursorSize)
  ctx.stroke()

  ctx.restore()
}

/**
 * Obtiene las dimensiones correctas para cada vista
 */
function getDimensionForView(viewType, dimension) {
  switch (viewType) {
    case 'axial':
      return dimension === 'width' ? width : height
    case 'coronal':
      return dimension === 'width' ? width : depth
    case 'sagittal':
      return dimension === 'width' ? height : depth
    default:
      return dimension === 'width' ? width : height
  }
}

/**
 * Detecta si el mouse está sobre un crosshair
 */
function isMouseOverCrosshair(mouseX, mouseY, canvas, viewType) {
  if (!crosshairsData[viewType]?.visible) return false

  const crosshair = crosshairsData[viewType]
  const scaleX = canvas.width / getDimensionForView(viewType, 'width')
  const scaleY = canvas.height / getDimensionForView(viewType, 'height')

  const canvasX = crosshair.x * scaleX
  const canvasY = crosshair.y * scaleY

  const tolerance = 5

  const nearVertical = Math.abs(mouseX - canvasX) <= tolerance
  const nearHorizontal = Math.abs(mouseY - canvasY) <= tolerance

  return nearVertical || nearHorizontal
}

/**
 * Convierte coordenadas del canvas a coordenadas del volumen
 */
function canvasToVolumeCoords(canvasX, canvasY, canvas, viewType) {
  const scaleX = canvas.width / getDimensionForView(viewType, 'width')
  const scaleY = canvas.height / getDimensionForView(viewType, 'height')

  const volumeX = Math.floor(canvasX / scaleX)
  const volumeY = Math.floor(canvasY / scaleY)

  const maxX = getDimensionForView(viewType, 'width') - 1
  const maxY = getDimensionForView(viewType, 'height') - 1

  return {
    x: Math.max(0, Math.min(volumeX, maxX)),
    y: Math.max(0, Math.min(volumeY, maxY))
  }
}

/**
 * Sincroniza crosshairs cuando cambian los slices
 */
function syncCrosshairsFromSliceChange(viewType) {
  if (!volumeData || !crosshairsEnabled.value) return

  console.log(`🔄 Sincronizando crosshairs desde cambio de slice en ${viewType}`)

  switch (viewType) {
    case 'axial':
      crosshairsData.coronal.y = currentSlices.axial
      crosshairsData.sagittal.y = currentSlices.axial
      break

    case 'coronal':
      crosshairsData.axial.y = currentSlices.coronal
      crosshairsData.sagittal.x = currentSlices.coronal
      break

    case 'sagittal':
      crosshairsData.axial.x = currentSlices.sagittal
      crosshairsData.coronal.x = currentSlices.sagittal
      break

    case 'main': {
      const currentView = mainView.value
      if (currentView === 'axial') {
        crosshairsData.coronal.y = currentSlices.axial
        crosshairsData.sagittal.y = currentSlices.axial
      } else if (currentView === 'coronal') {
        crosshairsData.axial.y = currentSlices.coronal
        crosshairsData.sagittal.x = currentSlices.coronal
      } else if (currentView === 'sagittal') {
        crosshairsData.axial.x = currentSlices.sagittal
        crosshairsData.coronal.x = currentSlices.sagittal
      }
      break
    }
  }

  if (quadViewActive.value) {
    nextTick(() => {
      redrawQuadViews()
    })
  }

  updateCrosshairPlanes3D()
}

/**
 * Crea los planos de corte 3D
 */
function createCrosshairPlanes3D() {
  if (!scene3DQuad.value || !volumeData) return

  console.log('🎯 Creando planos de crosshairs 3D...')

  removeCrosshairPlanes3D()

  const normalizedWidth = width / Math.max(width, height, depth)
  const normalizedHeight = height / Math.max(width, height, depth)
  const normalizedDepth = depth / Math.max(width, height, depth)

  const size = crosshairPlanes3DConfig.size

  const planeMaterial = new THREE.MeshBasicMaterial({
    color: crosshairPlanes3DConfig.color,
    transparent: true,
    opacity: crosshairPlanes3DConfig.opacity,
    side: THREE.DoubleSide,
    wireframe: crosshairPlanes3DConfig.wireframe
  })

  const axialGeometry = new THREE.PlaneGeometry(normalizedWidth * size, normalizedHeight * size)
  crosshairPlanes3D.axial = markRaw(new THREE.Mesh(axialGeometry, planeMaterial.clone()))
  crosshairPlanes3D.axial.rotation.x = 0
  crosshairPlanes3D.axial.renderOrder = 999  // Renderizar encima del volumen
  scene3DQuad.value.add(crosshairPlanes3D.axial)

  const coronalGeometry = new THREE.PlaneGeometry(normalizedWidth * size, normalizedDepth * size)
  crosshairPlanes3D.coronal = markRaw(new THREE.Mesh(coronalGeometry, planeMaterial.clone()))
  crosshairPlanes3D.coronal.rotation.x = Math.PI / 2
  crosshairPlanes3D.coronal.renderOrder = 999  // Renderizar encima del volumen
  scene3DQuad.value.add(crosshairPlanes3D.coronal)

  const sagittalGeometry = new THREE.PlaneGeometry(normalizedHeight * size, normalizedDepth * size)
  crosshairPlanes3D.sagittal = markRaw(new THREE.Mesh(sagittalGeometry, planeMaterial.clone()))
  crosshairPlanes3D.sagittal.rotation.y = Math.PI / 2
  crosshairPlanes3D.sagittal.renderOrder = 999  // Renderizar encima del volumen
  scene3DQuad.value.add(crosshairPlanes3D.sagittal)

  updateCrosshairPlanes3D()

  console.log('✅ Planos de crosshairs 3D creados')
}

/**
 * Actualiza las posiciones de los planos 3D
 */
function updateCrosshairPlanes3D() {
  if (!crosshairPlanes3D.axial || !crosshairPlanes3D.coronal || !crosshairPlanes3D.sagittal) {
    console.log('⚠️ Planos crosshairs 3D no inicializados')
    return
  }
  if (!volumeData || !crosshairsEnabled.value) return

  const normalizeX = (x) => (x / (width - 1)) * 2 - 1
  const normalizeY = (y) => (y / (height - 1)) * 2 - 1
  const normalizeZ = (z) => (z / (depth - 1)) * 2 - 1

  const axialZ = normalizeZ(currentSlices.axial)
  crosshairPlanes3D.axial.position.z = axialZ

  const coronalY = normalizeY(height - 1 - currentSlices.coronal)
  crosshairPlanes3D.coronal.position.y = coronalY

  const sagittalX = normalizeX(currentSlices.sagittal)
  crosshairPlanes3D.sagittal.position.x = sagittalX

  console.log('🎯 Planos 3D actualizados:', {
    axial: `Z=${axialZ.toFixed(2)} (slice ${currentSlices.axial})`,
    coronal: `Y=${coronalY.toFixed(2)} (slice ${currentSlices.coronal})`,
    sagittal: `X=${sagittalX.toFixed(2)} (slice ${currentSlices.sagittal})`
  })

  if (quadViewActive.value && renderer3DQuad.value && camera3DQuad.value) {
    renderer3DQuad.value.render(scene3DQuad.value, camera3DQuad.value)
  }
}

/**
 * Elimina los planos de crosshairs de la escena 3D
 */
function removeCrosshairPlanes3D() {
  if (!scene3DQuad.value) return

  if (crosshairPlanes3D.axial) {
    scene3DQuad.value.remove(crosshairPlanes3D.axial)
    crosshairPlanes3D.axial = null
  }
  if (crosshairPlanes3D.coronal) {
    scene3DQuad.value.remove(crosshairPlanes3D.coronal)
    crosshairPlanes3D.coronal = null
  }
  if (crosshairPlanes3D.sagittal) {
    scene3DQuad.value.remove(crosshairPlanes3D.sagittal)
    crosshairPlanes3D.sagittal = null
  }
}

// ==========================================
// FIN FUNCIONES DE CROSSHAIR ANTIGUAS
// ==========================================

// Variables para las 4 vistas anatómicas
const showCrosshairs = ref(false)
const crosshairsEnabled = ref(true) // Para controlar crosshairs interactivos
const show3DView = ref(false)

// Estados para controles de Web Worker
const showAIFilterPanel = ref(false)
const webWorkerSettings = reactive({
  sharpening: {
    enabled: false,
    strength: 1.0,
    radius: 1.0
  },
  denoising: {
    enabled: false,
    strength: 0.5,
    threshold: 10
  },
  edgeDetection: {
    enabled: false,
    threshold: 100,
    method: 'sobel'
  },
  medicalEnhancement: {
    enabled: false,
    preset: 'brain',
    contrast: 1.2,
    brightness: 0.1
  },
  histogramEqualization: {
    enabled: false
  }
})
const showAxialMeasurements = ref(true)
const showCoronalMeasurements = ref(true)
const showSagittalMeasurements = ref(true)

// Configuración 3D (declarada antes de cualquier watcher/uso)
const threeDConfig = reactive({
  opacity: 0.8,
  threshold: 0.3,
  brightness: 1.2,
  contrast: 1.5
})

// Inicializar Web Worker y sistema 3D
// Función para manejar el cambio de tamaño de la ventana en vista 3D
// Delegará a la implementación disponible definida más abajo (resizeFourViews3D o resizeThreeRenderer)
const handleResize3D = () => {
  // Si existe una función específica para las 4 vistas, úsala
  if (typeof resizeFourViews3D === 'function') {
    try { resizeFourViews3D(); return } catch (e) { console.warn('⚠️ resizeFourViews3D error:', e) }
  }

  // Si no, intentar usar resizeThreeRenderer si está disponible
  if (canvas3DRef.value) {
    const { width, height } = canvas3DRef.value.getBoundingClientRect()
    if (typeof resizeThreeRenderer === 'function') {
      try { resizeThreeRenderer(width, height) } catch (e) { console.warn('⚠️ resizeThreeRenderer error:', e) }
    }
  }
}

// Declaraciones de datos volumétricos y estado antes de montar y observar

// Datos volumétricos y estado global (declarados antes de cualquier uso)
// (Bloque de datos volumétricos movido arriba para evitar TDZ/ReferenceError)



// Inicializar Web Worker y sistema 3D
onMounted(async () => {
  console.log('DASHBOARD MOUNTED - INICIANDO F11')

  if (initializeWorker) {
    console.log('🚀 Inicializando Web Worker...')
    initializeWorker()
  }

  // Inicializar sistema 3D si está en modo cuádruple
  window.addEventListener('resize', handleResize3D)

  if (quadViewActive.value) {
    nextTick().then(() => ensureThreeRenderer())
  }
})

// Cleanup al desmontar
onUnmounted(() => {
  window.removeEventListener('resize', handleResize3D)
  cleanupThreeSystem()
})

// Observar cambios en modo cuádruple
watch(quadViewActive, (newValue) => {
  if (newValue) {
    // Guardar imagen original antes de cambiar de vista
    saveCurrentOriginalImage()
    nextTick().then(() => ensureThreeRenderer())
  } else {
    // Guardar imagen original antes de cambiar de vista
    saveCurrentOriginalImage()
    cleanupThreeSystem()
  }
})

// Observar cambios en datos volumétricos
watch(() => [volumeData, volumeMesh], ([newData, newMesh]) => {
  if (!isThreeInitialized.value || !newData || !newMesh) return

  if (scene.value && volumeMesh.value) {
    // Limpiar mesh anterior
    scene.value.traverse((object) => {
      if (object.isMesh) {
        scene.value.remove(object)
      }
    })
    // Agregar nuevo mesh
    scene.value.add(volumeMesh.value)
  }
})

// Observar cambios en la configuración 3D
watch(() => threeDConfig, (newConfig) => {
  if (!volumeMesh.value || !volumeMesh.value.material) return

  // Actualizar material del mesh
  if (volumeMesh.value.material) {
    volumeMesh.value.material.opacity = newConfig.opacity
    volumeMesh.value.material.threshold = newConfig.threshold
    volumeMesh.value.material.brightness = newConfig.brightness
    volumeMesh.value.material.contrast = newConfig.contrast
  }
}, { deep: true })

// Observar cambios en los filtros Web Worker
watch(() => webWorkerSettings, (newSettings, oldSettings) => {
  console.log('🔄 webWorkerSettings changed:', newSettings)

  // Verificar si hay cambios significativos
  const hasEnabledFilters = Object.values(newSettings).some(filter => filter.enabled)
  const hadEnabledFilters = oldSettings ? Object.values(oldSettings).some(filter => filter.enabled) : false

  // Si se deshabilitaron todos los filtros, restaurar imagen original
  if (!hasEnabledFilters && hadEnabledFilters) {
    console.log('🔄 Todos los filtros deshabilitados - restaurando imagen original')
    restoreOriginalImage()
    return
  }

  // Si hay filtros habilitados, aplicar filtros
  if (hasEnabledFilters && volumeData) {
    console.log('🎯 Aplicando filtros automáticamente...')
    updateImageWithWebWorkerFilters()
  }
}, { deep: true, flush: 'post' })

// FUNCIONALIDAD F11 SIMPLE
const handleF11 = (event) => {
  if (event.key === 'F11') {
    console.log('F11 DETECTADO EN MOUNTED')

    // SOLUCIÓN DIRECTA: Activar maximizado inmediatamente cuando se detecta F11
    // No esperar a fullscreenElement ya que puede no funcionar en algunos navegadores
    if (!allCollapsed?.value) {
      console.log('ACTIVANDO MAXIMIZADO INMEDIATAMENTE AL DETECTAR F11')
      try {
        toggleCenterExpansion()
        console.log('✅ MAXIMIZADO ACTIVADO EXITOSAMENTE')

        // Mostrar notificación al usuario
        if (typeof showProfessionalNotification === 'function') {
          showProfessionalNotification(
            '🔲 F11 + Maximizado',
            'Modo maximizado activado. Presiona F11 nuevamente para salir de pantalla completa o F1 para restaurar vista normal',
            'success'
          )
        }
      } catch (e) {
        console.error('❌ ERROR AL ACTIVAR MAXIMIZADO:', e)
      }
    } else {
      console.log('ℹ️ YA ESTÁ EN MODO MAXIMIZADO')
    }

    // Mantener los timeouts para debugging (pero no necesarios para la funcionalidad)
    setTimeout(() => {
      console.log('DEBUG 500ms: fullscreen?', !!document.fullscreenElement)
    }, 500)
  }
}

document.addEventListener('keydown', handleF11)
console.log('LISTENER F11 REGISTRADO EN MOUNTED')

const imageStorage = localforage.createInstance({
  name: 'MedicalImages',
  description: 'Almacenamiento de imágenes médicas'
});


//No uso Luis Vile
// Configurar para datos de pacientes
const patientStorage = localforage.createInstance({
  name: 'PatientData',
  description: 'Datos de pacientes'
});

// Listener para detectar cambios de pantalla completa
const handleFullscreenChange = () => {
  const isFullscreen = !!document.fullscreenElement
  console.log('🔄 Fullscreen change detectado:', isFullscreen ? 'ENTRADA' : 'SALIDA')

  if (isFullscreen) {
    // ENTRADA a fullscreen → Activar modo maximizado si no está activo
    if (!allCollapsed?.value) {
      console.log('✅ Entrando en fullscreen - activando modo maximizado')
      try {
        toggleCenterExpansion()
        console.log('✅ Modo maximizado activado automáticamente')
      } catch (e) {
        console.error('❌ Error al activar modo maximizado:', e)
      }
    } else {
      console.log('ℹ️ Ya está en modo maximizado')
    }
  } else {
    // SALIDA de fullscreen → Desactivar modo maximizado si está activo
    if (allCollapsed?.value) {
      console.log('✅ Saliendo de fullscreen - desactivando modo maximizado')
      try {
        toggleCenterExpansion()
        console.log('✅ Modo maximizado desactivado automáticamente')
      } catch (e) {
        console.error('❌ Error al desactivar modo maximizado:', e)
      }
    } else {
      console.log('ℹ️ Ya está en modo normal')
    }
  }
}

// Constantes de modalidades
const modalityDisplayNames = {
  t1n: 'T1 Native',
  t1c: 'T1 Contrast',
  t2w: 'T2 Weighted',
  t2f: 'T2 FLAIR',
  seg: 'Segmentación'
}

// Referencias de elementos
const fileInput = ref(null)
const diagnosisTextarea = ref(null)
const canvasDoubleDiagnosis = ref(null)  // Canvas para el diagnóstico en vista doble

// Obtener usuario desde localStorage
const currentUser = ref(null)
onMounted(() => {
  const userData = localStorage.getItem('currentUser')
  if (userData) {
    try {
      currentUser.value = JSON.parse(userData)
      console.log("Iniciales:", userInitials.value)
    } catch (e) {
      console.error('Error al parsear currentUser:', e)
    }
  }
})

const userInitials = computed(() => {
  if (!currentUser.value?.full_name) return ''
  return currentUser.value.full_name
    .split(' ')
    .filter(n => n.trim() !== '')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
})

// Estados reactivos principales
const userMenuActive = ref(false)
const leftSidebarCollapsed = ref(false)
const rightSidebarCollapsed = ref(false)
const bottomSectionCollapsed = ref(false)
const controls3DVisible = ref(true)

// Estados de la aplicación
const selectedModality = ref('')
const activeTab = ref(0)
const uploadedFiles = ref([])
const aiAnalysisComplete = ref(false)
const diagnosisEditorActive = ref(false)
const diagnosisText = ref('')
const isLoadingModality = ref(false) // Evitar llamadas duplicadas

const includePatientData = ref(false);
const showPatienteInfo = ref(false);
const registerNewPatient = ref(false);
const registerNewConsultations = ref(true);

// Variables para manejar la segmentación - Richard
const segmentationInfo = ref(null)  // Info de la segmentación del backend
const segmentedImageData = ref(null)  // Datos del volumen segmentado
const isLoadingSegmentation = ref(false)  // Estado de carga

function toggle(origin) {
  if (origin === 'includePatient' && includePatientData.value) {
    registerNewConsultations.value = false
  }
  if (origin === 'onlyConsultations' && registerNewConsultations.value) {
    includePatientData.value = false
  }
}


const savePatientStudy = async () => {
  console.log('DEBUG: --- Entrando a savePatientStudy ---');
  console.log('DEBUG: includePatientData.value:', includePatientData.value);
  console.log('DEBUG: patientData actual:', {
    fullName: patientData.fullName,
    age: patientData.age,
    patientId: patientData.patientId,
    gender: patientData.gender,
    clinicalReason: patientData.clinicalReason
  });

  const storedStudies = JSON.parse(localStorage.getItem('patientStudies')) || [];

  let studyData = {};
  if (includePatientData.value) {
    // Verificar que realmente hay datos antes de guardar
    const hasValidData = patientData.fullName || patientData.age ||
      patientData.patientId || patientData.gender ||
      patientData.clinicalReason;

    if (hasValidData) {
      studyData = {
        fullName: patientData.fullName || 'N/D',
        age: patientData.age || 'N/D',
        patientId: patientData.patientId || 'N/D',
        gender: patientData.gender || 'N/D',
        clinicalReason: patientData.clinicalReason || 'N/D',
        studyId: 'STUDY-' + Date.now(),
        studyDate: new Date().toLocaleDateString(),
        // ✅ NUEVO: Información de la imagen médica
        hasMedicalImage: false, // Se actualizará después
        imageTimestamp: null
      };
      console.log('✅ Guardando estudio CON datos del paciente');
    } else {
      // Si el checkbox está marcado pero sin datos, guardar como N/D
      studyData = {
        fullName: 'N/D',
        age: 'N/D',
        patientId: 'N/D',
        gender: 'N/D',
        clinicalReason: 'N/D',
        studyId: 'STUDY-' + Date.now(),
        studyDate: new Date().toLocaleDateString(),
        hasMedicalImage: false,
        imageTimestamp: null
      };
      console.log('⚠️ Checkbox marcado pero sin datos, guardando como N/D');
    }
  } else {
    // Si el checkbox NO está marcado
    studyData = {
      fullName: 'N/D',
      age: 'N/D',
      patientId: 'N/D',
      gender: 'N/D',
      clinicalReason: 'N/D',
      studyId: 'STUDY-' + Date.now(),
      studyDate: new Date().toLocaleDateString(),
      hasMedicalImage: false,
      imageTimestamp: null
    };
    console.log('✅ Guardando estudio SIN datos del paciente (N/D)');
  }

  // ✅ NUEVO: GUARDAR LA IMAGEN MÉDICA SI ESTÁ DISPONIBLE
  if (volumeData && canvasMain.value) {
    try {
      console.log('🖼️ Guardando imagen médica...');

      // 1. Guardar imagen principal
      const imageSaved = await saveMedicalImage(studyData.studyId);
      if (imageSaved) {
        studyData.hasMedicalImage = true;
        studyData.imageTimestamp = new Date().toISOString();
        studyData.imageInfo = {
          fileName: uploadedFiles.value[0]?.name || 'imagen_medica',
          dimensions: volumeData ? `${width}x${height}x${depth}` : 'N/A',
          modality: selectedModality.value
        };
        console.log('✅ Imagen médica guardada exitosamente');
      }
    } catch (error) {
      console.error('❌ Error guardando imagen médica:', error);
      studyData.hasMedicalImage = false;
    }
  } else {
    console.log('ℹ️ No hay imagen médica disponible para guardar');
  }

  // Guardar en localStorage (tu código original que funciona)
  storedStudies.push(studyData);
  localStorage.setItem('patientStudies', JSON.stringify(storedStudies));

  console.log('✅ Estudio completo guardado en localStorage:', studyData);

  // ✅ NUEVO: Mostrar confirmación al usuario
  showProfessionalNotification(
    '💾 Estudio Guardado',
    studyData.hasMedicalImage ?
      'Datos del paciente e imagen guardados correctamente' :
      'Datos del paciente guardados correctamente',
    'success'
  );

  return studyData.studyId; // Devolver ID para referencia futura
};

// ✅ NUEVO: Función para guardar la imagen médica (agregar esta función)
const saveMedicalImage = async (studyId) => {
  try {
    if (!canvasMain.value) {
      console.warn('⚠️ No hay canvas disponible para guardar imagen');
      return false;
    }

    // Convertir canvas a blob (formato PNG para calidad médica)
    const blob = await new Promise(resolve => {
      canvasMain.value.toBlob(resolve, 'image/png', 0.95);
    });

    if (!blob) {
      console.error('❌ No se pudo crear el blob de la imagen');
      return false;
    }

    // Guardar en IndexedDB
    await imageStorage.setItem(studyId, blob);
    console.log('✅ Imagen guardada en IndexedDB. Tamaño:', blob.size, 'bytes');

    // Guardar miniatura para vista rápida
    const thumbnailBlob = await createThumbnail(canvasMain.value);
    await imageStorage.setItem(studyId + '-thumbnail', thumbnailBlob);
    console.log('✅ Miniatura guardada');

    return true;
  } catch (error) {
    console.error('❌ Error guardando imagen médica:', error);
    return false;
  }
};

// ✅ NUEVO: Función para crear miniatura (agregar esta función)
const createThumbnail = (canvas) => {
  return new Promise(resolve => {
    const thumbCanvas = document.createElement('canvas');
    const ctx = thumbCanvas.getContext('2d');

    // Tamaño de miniatura para vista rápida
    const maxSize = 150;
    let width = canvas.width;
    let height = canvas.height;

    // Mantener proporciones
    if (width > height) {
      height = (height / width) * maxSize;
      width = maxSize;
    } else {
      width = (width / height) * maxSize;
      height = maxSize;
    }

    thumbCanvas.width = width;
    thumbCanvas.height = height;

    // Dibujar miniatura
    ctx.drawImage(canvas, 0, 0, width, height);

    // Convertir a JPEG para menor tamaño
    thumbCanvas.toBlob(resolve, 'image/jpeg', 0.7);
  });
};

//no uso Luis Vile
// ✅ NUEVO: Función para cargar imagen guardada (agregar esta función)
const loadSavedImage = async (studyId) => {
  try {
    const blob = await imageStorage.getItem(studyId);
    if (blob) {
      const imageUrl = URL.createObjectURL(blob);
      console.log('✅ Imagen cargada desde almacenamiento');
      return imageUrl;
    }
    return null;
  } catch (error) {
    console.error('❌ Error cargando imagen guardada:', error);
    return null;
  }
};
//no uso Luis Vile
// ✅ NUEVO: Función para cargar miniatura (agregar esta función)
const loadThumbnail = async (studyId) => {
  try {
    const blob = await imageStorage.getItem(studyId + '-thumbnail');
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error) {
    console.error('Error cargando miniatura:', error);
    return null;
  }
};
// ============================================
// 🎯 LISTENER PARA EVENTO F11 PERSONALIZADO
// ============================================
console.log('🎯 Configurando listener para evento personalizado activateMaximized')

// Listener para el evento personalizado de F11
const handleActivateMaximized = () => {
  console.log('🎯 Evento activateMaximized recibido!')
  console.log('🎯 Estado actual allCollapsed:', allCollapsed?.value)

  try {
    // Verificar que tengamos acceso a toggleCenterExpansion
    if (typeof toggleCenterExpansion === 'function') {
      console.log('🎯 toggleCenterExpansion disponible, ejecutando...')
      if (!allCollapsed?.value) {
        toggleCenterExpansion()
        console.log('🎯 ✅ Modo maximizado activado!')
      } else {
        console.log('🎯 ℹ️ Ya está en modo maximizado')
      }
    } else {
      console.error('🎯 ❌ toggleCenterExpansion no está disponible')
    }
  } catch (error) {
    console.error('🎯 ❌ Error activando maximizado:', error)
  }
}

// Registrar listener para evento personalizado
window.addEventListener('activateMaximized', handleActivateMaximized)
console.log('🎯 ✅ Listener de evento personalizado registrado')

// ============================================

// Importar composables y funcionalidades (ya importado más arriba)

// Variables para renderizado 3D (sistema principal unificado)
// Las variables renderer, scene, camera están definidas más abajo

// Estados del modal
const showModal = ref(false)
const currentStep = ref(1)
const isLoading = ref(false)

// Datos del paciente
const patientData = reactive({
  fullName: '',
  age: '',
  patientId: '',
  gender: '',
  phone: '',
  email: '',
  address: '',
  clinicalReason: ''
})


async function createPatient() {
  try {
    const response = await fetch(`${backendURL}/patients/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identity_id: patientData.patientId,  // mapear correctamente
        full_name: patientData.fullName,
        age: Number(patientData.age),
        sex: patientData.gender,
        phone: patientData.phone,
        email: patientData.email,
        address: patientData.address,
        clinical_history: patientData.clinicalHistory
      })
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const newPatient = await response.json()
    console.log('Paciente creado:', newPatient)
    return newPatient
  } catch (err) {
    console.error('Error creando paciente:', err)
    throw err
  }
}

async function createPatientAnonymous() {
  try {
    const response = await fetch(`${backendURL}/patients/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identity_id: "",
        full_name: "Consulta",
        age: "0",
        sex: "N/A"
      })
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const newPatient = await response.json()
    console.log('Paciente anonimo creado:', newPatient)
    return newPatient
  } catch (err) {
    console.error('Error creando paciente anonimo:', err)
    throw err
  }
}

function clearDataPatient() {
  patientData.fullName = '';
  patientData.age = null;
  patientData.patientId = '';
  patientData.gender = '';
  patientData.phone = '';
  patientData.email = '';
  patientData.address = '';
  patientData.clinicalReason = '';
  includePatientData.value = false;
}

const patientFindId = ref('')

async function findPatient() {
  try {
    if (!patientFindId.value || patientFindId.value.trim() === '') {
      alert('Por favor, ingrese un ID de paciente para buscar.')
      return
    }

    const response = await fetch(`${backendURL}/patients/by-identity/${patientFindId.value}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      if (response.status === 404) {
        alert('Paciente no encontrado, por favor registre un nuevo paciente')
      } else {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return
    }

    const patient = await response.json()

    patientData.fullName = patient.full_name || ''
    patientData.age = patient.age || ''
    patientData.patientId = patient.identity_id || ''
    patientData.gender = patient.sex || ''
    patientData.phone = patient.phone || ''
    patientData.email = patient.email || ''
    patientData.address = patient.address || ''


    console.log('✅ Paciente encontrado:', patient)
  } catch (err) {
    console.error('Error al buscar paciente:', err)
    alert('Ocurrió un error al buscar el paciente.')
  }
}

async function findPatientById(id) {
  try {
    // Validación básica
    if (!id || isNaN(id)) {
      alert('Por favor, ingrese un ID de paciente válido.');
      return null;
    }

    console.log(`🔍 Buscando paciente con ID: ${id}`);

    // Petición al backend
    const response = await fetch(`${backendURL}/patients/by-id/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    // Manejo de errores HTTP
    if (!response.ok) {
      if (response.status === 404) {
        alert('⚠️ Paciente no encontrado.');
      } else {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      return null;
    }

    // Convertir a JSON
    const patient = await response.json();

    console.log('✅ Paciente encontrado:', patient);

    // Si quieres guardar los datos globalmente (por ejemplo en patientDataToSave)

    return patient;
  } catch (error) {
    console.error('❌ Error al buscar paciente:', error);
    alert('Ocurrió un error al buscar el paciente.');
    return null;
  }
}

function showPatientInfo(patient) {
  patientDataToShow.value.fullName = patient.full_name || ''
  patientDataToShow.value.age = patient.age || ''
  patientDataToShow.value.patientId = patient.identity_id || ''
  patientDataToShow.value.gender = patient.sex || ''
  patientDataToShow.value.phone = patient.phone || ''
  patientDataToShow.value.email = patient.email || ''
  patientDataToShow.value.address = patient.address || ''
}


async function uploadImageFile(formData, token) {
  try {
    const response = await fetch(`${backendURL}/images/upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // ⚠️ No agregar 'Content-Type', FormData lo maneja automáticamente
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Imagen subida correctamente:', result);
    return result;

  } catch (error) {
    console.error('❌ Error al subir la imagen:', error);
    throw error;
  }
}

async function getImageByFilename(filename, token) {
  try {
    const response = await fetch(`${backendURL}/images/by-filename/${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`✅ No se encontró una imagen con el nombre: ${filename}`);
        return null;
      }
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Imagen encontrada:', result);
    return result;

  } catch (error) {
    console.error('❌ Error al obtener la imagen por nombre:', error);
    throw error;
  }
}

async function downloadImageById(imageId, token, name) {
  try {
    const response = await fetch(`${backendURL}/images/download/${imageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al descargar la imagen: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `${name}`;

    // Extraer filename real del header si existe
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match && match[1]) filename = match[1];
    }

    // Crear un File a partir del Blob
    const file = new File([blob], filename, { type: blob.type });
    return file;

  } catch (err) {
    console.error("❌ Error descargando imagen:", err);
    throw err;
  }
}

// SEGEMENTACION RICHARD
/**
 * Descarga la imagen segmentada del backend
 * Devuelve ArrayBuffer directamente para evitar problemas con Web Worker
 */
async function downloadSegmentedImage(imageId, token) {
  try {
    console.log(`📥 Descargando imagen segmentada para image_id: ${imageId}`);

    const response = await fetch(`${backendURL}/diagnosis/download-segmented/${imageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al descargar segmentación: ${response.status}`);
    }

    // 🔑 CLAVE: Obtener como ArrayBuffer directamente
    const arrayBuffer = await response.arrayBuffer();

    // Obtener filename del header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `segmentation_${imageId}.nii.gz`;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    console.log('✅ Imagen segmentada descargada:', filename);
    console.log('📦 Tamaño:', arrayBuffer.byteLength, 'bytes');

    return { arrayBuffer, filename };

  } catch (err) {
    console.error("❌ Error descargando segmentación:", err);
    throw err;
  }
}
// RICHARD
/**
 * 🆕 Carga la imagen segmentada SIN Web Worker (evita DataCloneError)
 */
async function loadSegmentationForDiagnosis() {
  if (!segmentationInfo.value || !segmentationInfo.value.image_id) {
    console.warn('⚠️ No hay información de segmentación disponible');
    showProfessionalNotification(
      '⚠️ Información',
      'No hay diagnóstico disponible',
      'warning'
    );
    return false;
  }

  try {
    isLoadingSegmentation.value = true;

    console.log('🔄 Cargando segmentación para diagnóstico...');
    console.log('📌 Image ID:', segmentationInfo.value.image_id);

    // 1️⃣ Descargar archivo como ArrayBuffer
    const { arrayBuffer, filename } = await downloadSegmentedImage(
      segmentationInfo.value.image_id,
      token
    );

    console.log('✅ Archivo descargado:', filename);
    console.log('📦 Tamaño ArrayBuffer:', arrayBuffer.byteLength, 'bytes');

    // 2️⃣ 🆕 PROCESAR DIRECTAMENTE SIN WEB WORKER
    console.log('🧠 Procesando archivo NIfTI directamente (sin worker)...');

    // Importar pako para descomprimir
    const pako = (await import('pako')).default;

    // Descomprimir si es .gz
    let decompressedData;
    if (filename.endsWith('.gz')) {
      console.log('📦 Descomprimiendo archivo .gz...');
      decompressedData = pako.ungzip(new Uint8Array(arrayBuffer));
    } else {
      decompressedData = new Uint8Array(arrayBuffer);
    }

    console.log('✅ Archivo descomprimido, tamaño:', decompressedData.byteLength, 'bytes');

    // Parsear con nifti-reader-js
    const nifti = await import('nifti-reader-js');

    // Verificar si es un archivo NIfTI válido
    if (!nifti.isNIFTI(decompressedData.buffer)) {
      throw new Error('El archivo no es un NIfTI válido');
    }

    // Leer header
    const header = nifti.readHeader(decompressedData.buffer);
    if (!header) {
      throw new Error('No se pudo leer el header del NIfTI');
    }

    console.log('📋 Header NIfTI leído:', {
      dims: header.dims,
      datatypeCode: header.datatypeCode,
      numBitsPerVoxel: header.numBitsPerVoxel
    });

    // Leer datos de imagen
    const imageData = nifti.readImage(header, decompressedData.buffer);
    if (!imageData) {
      throw new Error('No se pudieron leer los datos de la imagen');
    }

    // Convertir a Uint8Array
    let typedArray;
    if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
      typedArray = new Uint8Array(imageData);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
      typedArray = new Int16Array(imageData);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
      typedArray = new Float32Array(imageData);
    } else {
      typedArray = new Uint8Array(imageData);
    }

    console.log('✅ Datos extraídos:', {
      length: typedArray.length,
      type: typedArray.constructor.name
    });

    // 3️⃣ Crear objeto results (SIN guardar en volumeData global todavía)
    const results = {
      volumeData: typedArray,
      dimensions: [header.dims[1], header.dims[2], header.dims[3]],
      header: {
        dims: header.dims,
        pixDims: header.pixDims,
        qform_code: header.qform_code,
        sform_code: header.sform_code
      }
    };

    // 🔑 CLAVE: Guardar solo en segmentedImageData, NO en volumeData global
    segmentedImageData.value = results;

    console.log('✅ Segmentación cargada:', {
      dimensions: results.dimensions,
      voxels: typedArray.length
    });

    // 4️⃣ Forzar redibujado
    await nextTick();

    console.log('🎨 Forzando redibujado con overlay...');

    if (canvasMain.value) {
      updateDisplay();
      console.log('✅ Display actualizado');
    }

    showProfessionalNotification(
      '✅ Éxito',
      'Segmentación cargada correctamente',
      'success'
    );

    return true;

  } catch (error) {
    console.error('❌ Error completo cargando segmentación:', error);
    console.error('Stack trace:', error.stack);

    showProfessionalNotification(
      '❌ Error',
      `No se pudo cargar la imagen segmentada: ${error.message}`,
      'error'
    );

    return false;

  } finally {
    isLoadingSegmentation.value = false;
  }
}
/**
 * Procesar NIfTI de forma segura evitando DataCloneError
 */
async function processNiftiFileSafe(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;

        // Llamar al worker con ArrayBuffer directamente
        const result = await processNiftiFile(file);
        resolve(result);

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Método alternativo: Cargar como imagen PNG si es que el backend puede convertir
 */
async function loadSegmentationAsImage(blob) {
  console.log('🔄 Cargando segmentación como imagen...');

  // Crear URL temporal del blob
  const imageUrl = URL.createObjectURL(blob);

  // Crear elemento de imagen
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      console.log('✅ Imagen cargada:', img.width, 'x', img.height);

      // Dibujar en canvas
      if (canvasMain.value) {
        const ctx = canvasMain.value.getContext('2d');
        canvasMain.value.width = img.width;
        canvasMain.value.height = img.height;
        ctx.drawImage(img, 0, 0);

        console.log('🎨 Imagen dibujada en canvas');
      }

      URL.revokeObjectURL(imageUrl);
      resolve();
    };

    img.onerror = () => {
      console.error('❌ No se pudo cargar como imagen');
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Error cargando imagen'));
    };

    img.src = imageUrl;
  });
}
// RICHARD
/**
 * Dibuja la vista de diagnóstico con la segmentación
 */
function drawDiagnosisView() {
  if (!canvasMain.value || !segmentedImageData.value) {
    console.warn('⚠️ Canvas o datos de segmentación no disponibles');
    return;
  }

  const canvas = canvasMain.value;
  const ctx = canvas.getContext('2d');
  const data = segmentedImageData.value;

  console.log('🎨 Dibujando vista de diagnóstico...');

  // Usar la misma lógica de dibujado que tu vista principal
  // pero con los datos segmentados
  const currentView = mainView.value;
  const sliceIndex = currentSlices[currentView];

  // Extraer slice de los datos segmentados
  const sliceData = extractSliceFromVolume(
    data.volumeData,
    currentView,
    sliceIndex,
    data.dimensions
  );

  if (!sliceData) {
    console.error('❌ No se pudo extraer slice de segmentación');
    return;
  }

  // Dibujar en canvas
  drawSliceToCanvas(ctx, sliceData, canvas.width, canvas.height);

  // Aplicar mapa de colores para las clases
  applySegmentationColorMap(ctx, canvas);

  console.log('✅ Vista de diagnóstico dibujada');
}

// /**
//  * Aplica mapa de colores para visualizar las clases de segmentación
//  */
// function applySegmentationColorMap(ctx, canvas) {
//   const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//   const data = imageData.data;

//   // Colores para las clases BraTS
//   const classColors = {
//     0: [0, 0, 0],        // Background - Negro
//     1: [255, 0, 0],      // NCR/NET - Rojo
//     2: [0, 255, 0],      // ED - Verde
//     3: [0, 0, 255]       // ET - Azul
//   };

//   for (let i = 0; i < data.length; i += 4) {
//     const value = data[i]; // Valor de clase

//     if (classColors[value]) {
//       const [r, g, b] = classColors[value];
//       data[i] = r;
//       data[i + 1] = g;
//       data[i + 2] = b;
//       data[i + 3] = value === 0 ? 0 : 200; // Transparencia
//     }
//   }

//   ctx.putImageData(imageData, 0, 0);
// }

//RICHARD
/**
 * Aplica mapa de colores BraTS a los datos de segmentación
 */
function applySegmentationColorMap(ctx, canvas, imageData) {
  const data = imageData.data;

  // Mapa de colores BraTS
  const colorMap = {
    0: { r: 0, g: 0, b: 0, a: 0 },           // Background - Transparente
    1: { r: 255, g: 0, b: 0, a: 180 },       // NCR - Rojo
    2: { r: 0, g: 255, b: 0, a: 180 },       // ED - Verde
    3: { r: 0, g: 0, b: 255, a: 180 }        // ET - Azul
  };

  for (let i = 0; i < data.length; i += 4) {
    // El valor original está en escala de grises (0-255)
    // Convertir a clase (0, 1, 2, 3)
    const grayValue = data[i];
    let classValue = 0;

    if (grayValue > 200) classValue = 3;       // ET
    else if (grayValue > 150) classValue = 2;  // ED
    else if (grayValue > 100) classValue = 1;  // NCR
    else classValue = 0;                       // Background

    const color = colorMap[classValue];

    data[i] = color.r;       // R
    data[i + 1] = color.g;   // G
    data[i + 2] = color.b;   // B
    data[i + 3] = color.a;   // A (transparencia)
  }

  ctx.putImageData(imageData, 0, 0);
}
//RICHARD
/**
 * 🆕 VERSIÓN FINAL - Usa el mismo offset y transformaciones que drawMainView
 * Ahora la segmentación estará PERFECTAMENTE alineada con la imagen original
 */
function applySegmentationOverlay(ctx, canvas) {
  if (!ctx || !canvas || !segmentedImageData.value || !volumeData) {
    console.warn('⚠️ applySegmentationOverlay: Datos faltantes');
    return;
  }

  console.log('🎨 Aplicando overlay con mismo offset que imagen original...');

  try {
    // 1️⃣ Obtener dimensiones
    const origW = width;
    const origH = height;
    const origD = depth;

    const segData = segmentedImageData.value.volumeData;
    const [segW, segH, segD] = segmentedImageData.value.dimensions;

    if (origW !== segW || origH !== segH || origD !== segD) {
      console.error('❌ Dimensiones no coinciden');
      return;
    }

    // 2️⃣ Vista y slice actual
    const currentView = mainView.value;
    const sliceIndex = currentSlices[currentView];

    // 3️⃣ Determinar dimensiones del slice según la vista
    let w, h;
    if (currentView === 'axial') {
      w = segW;
      h = segH;
    } else if (currentView === 'coronal') {
      w = segW;
      h = segD;
    } else if (currentView === 'sagittal') {
      w = segH;
      h = segD;
    }

    console.log(`📐 Slice: ${w}x${h}`);

    // 4️⃣ Extraer slice 2D de segmentación
    const segSlice2D = [];

    if (currentView === 'axial') {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = x + y * segW + sliceIndex * segW * segH;
          segSlice2D.push(segData[idx] || 0);
        }
      }
    } else if (currentView === 'coronal') {
      for (let z = 0; z < h; z++) {
        for (let x = 0; x < w; x++) {
          const idx = x + sliceIndex * segW + z * segW * segH;
          segSlice2D.push(segData[idx] || 0);
        }
      }
    } else if (currentView === 'sagittal') {
      for (let z = 0; z < h; z++) {
        for (let y = 0; y < w; y++) {
          const idx = sliceIndex + y * segW + z * segW * segH;
          segSlice2D.push(segData[idx] || 0);
        }
      }
    }

    // 5️⃣ Crear canvas temporal con el slice de segmentación
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    const tempImageData = tempCtx.createImageData(w, h);
    const tempData = tempImageData.data;

    // 6️⃣ Mapa de colores
    const colorMap = {
      0: { r: 0, g: 0, b: 0, a: 0 },
      1: { r: 0, g: 0, b: 255, a: 180 },
      2: { r: 0, g: 255, b: 0, a: 180 },
      3: { r: 255, g: 0, b: 0, a: 180 }
    };

    // 7️⃣ Pintar el slice de segmentación
    for (let i = 0; i < segSlice2D.length; i++) {
      const segValue = segSlice2D[i];

      let classValue = 0;
      if (segValue >= 4) classValue = 3;
      else if (segValue === 3) classValue = 3;
      else if (segValue === 2) classValue = 2;
      else if (segValue === 1) classValue = 1;

      const color = colorMap[classValue];
      const pixelIndex = i * 4;

      tempData[pixelIndex] = color.r;
      tempData[pixelIndex + 1] = color.g;
      tempData[pixelIndex + 2] = color.b;
      tempData[pixelIndex + 3] = color.a;
    }

    tempCtx.putImageData(tempImageData, 0, 0);

    // 8️⃣ 🔑 CLAVE: Calcular el MISMO offset y escala que drawMainView
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const scaleX = canvasWidth / w;
    const scaleY = canvasHeight / h;
    const scale = Math.min(scaleX, scaleY); // ← MISMO CÁLCULO que drawMainView

    const scaledW = w * scale;
    const scaledH = h * scale;
    const offsetX = (canvasWidth - scaledW) / 2; // ← MISMO offset
    const offsetY = (canvasHeight - scaledH) / 2; // ← MISMO offset

    console.log(`📏 Escala: ${scale.toFixed(3)}, Offset: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);

    // 9️⃣ Aplicar las MISMAS transformaciones que drawMainView
    ctx.save();

    // Trasladar al centro (IGUAL que drawMainView línea 7576)
    ctx.translate(offsetX + scaledW / 2, offsetY + scaledH / 2);

    // Aplicar flip vertical (IGUAL que drawMainView línea 7579)
    ctx.scale(1, -1);

    // Configurar para overlay con transparencia
    ctx.globalCompositeOperation = 'source-over';

    // 🔟 Dibujar el canvas temporal escalado y con flip
    ctx.drawImage(tempCanvas, -scaledW / 2, -scaledH / 2, scaledW, scaledH);

    ctx.restore();

    console.log('✅ Overlay aplicado con offset correcto');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

// Variables reactivas para renderizado 3D
const renderer3DQuad = ref(null)
const scene3DQuad = ref(null)
const camera3DQuad = ref(null)
// Controles y recursos adicionales para el 3D del cuadrante
let controls3DQuad = null
let animationId3DQuad = null
let volumeMeshQuad = null
// Estado de errores del renderizado 3D
let quadRenderingError = false

// Configuración de pestañas
const tabs = ref([
  { title: 'Imagen Original' },
  { title: 'Diagnóstico IA' },
  { title: 'Doble Vista' }
])

// Configuración de vistas del cerebro
const brainViews = ref([
  {
    label: 'Sagital',
    type: 'sagittal',
    image: sagitalImage,
    canvas: null,
    active: false
  },
  {
    label: 'Frontal',
    type: 'coronal',
    image: frontalImage,
    canvas: null,
    active: false
  },
  {
    label: 'Axial',
    type: 'axial',
    image: axialImage,
    canvas: null,
    active: true
  },
  {
    label: '3D',
    type: '3d',
    image: cerebro3DImage,
    canvas: null,
    active: false
  }
])

// Computed properties
const allCollapsed = computed(() =>
  leftSidebarCollapsed.value &&
  rightSidebarCollapsed.value &&
  bottomSectionCollapsed.value
)

const tabContentHeight = computed(() => {
  if (bottomSectionCollapsed.value) {
    return 'calc(100% - 35px)'
  }
  return allCollapsed.value ? 'calc(100% - 70px)' : 'calc(100% - 140px)'
})

// Modalidades disponibles para el selector
const availableModalities = computed(() => {
  const modalities = []
  if (caseFiles.t1n) modalities.push({ value: 't1n', label: 'T1 Native' })
  if (caseFiles.t1c) modalities.push({ value: 't1c', label: 'T1 Contrast' })
  if (caseFiles.t2w) modalities.push({ value: 't2w', label: 'T2 Weighted' })
  if (caseFiles.t2f) modalities.push({ value: 't2f', label: 'T2 FLAIR' })
  if (caseFiles.seg) modalities.push({ value: 'seg', label: 'Segmentation' })
  return modalities
})

// Computed properties para información de imagen
const getImageResolution = computed(() => {
  if (!volumeData || !width || !height || !depth) {
    return 'No disponible'
  }
  return `${width} × ${height} × ${depth}`
})

const getImageQuality = computed(() => {
  if (!volumeData || !width || !height || !depth) {
    return 'No disponible'
  }

  // Calcular el total de voxels (píxeles 3D)
  const totalVoxels = width * height * depth

  // Definir umbrales para clasificar la calidad
  // Estos valores son aproximados para imágenes médicas típicas
  const lowQualityThreshold = 16777216   // 256³ = ~16M voxels
  const highQualityThreshold = 67108864  // 512³ = ~67M voxels

  if (totalVoxels >= highQualityThreshold) {
    return 'Alta'
  } else if (totalVoxels >= lowQualityThreshold) {
    return 'Media'
  } else {
    return 'Baja'
  }
})

const getImageQualityClass = computed(() => {
  const quality = getImageQuality.value
  switch (quality) {
    case 'Alta': return 'quality-high'
    case 'Media': return 'quality-medium'
    case 'Baja': return 'quality-low'
    default: return 'quality-unknown'
  }
})

const getImageQualityIcon = computed(() => {
  const quality = getImageQuality.value
  switch (quality) {
    case 'Alta': return '🟢'
    case 'Media': return '🟡'
    case 'Baja': return '🔴'
    default: return '⚪'
  }
})

// Variables para mejora automática de calidad de imagen 2D
const imageEnhancementEnabled = computed(() => {
  // Se activa automáticamente para todas las vistas 2D (no para 3D)
  // Solo verificamos que no sea vista 3D, el volumeData se verificará en tiempo real
  return mainView.value !== '3d'
})
const enhancementSettings = reactive({
  sharpening: 0.2,        // Factor de nitidez suave
  contrast: 1.8,         // Contraste muy leve
  brightness: 0.25,       // Brillo ligeramente menor
  denoising: 0.58,        // Reducción de ruido mínima
  interpolation: true,    // Usar interpolación bicúbica
  adaptiveContrast: false, // Desactivar contraste adaptativo
  histogramEqualization: false // Desactivar ecualización
})

// 🔽 NUEVAS FUNCIONES DEL MODAL 🔽

/**
 * Abre el modal de información de archivo y selector de archivos
 * Inicia el proceso de carga con el primer paso
 */
const handleDemoUpload = () => {
  showModal.value = true
  currentStep.value = 1
}

let charguePatientAndImage = true;
let flagRepeatedArchiveMessage = true;

const patientDataToSave = ref({})
const patientDataToShow = ref({})

let existingImage;
/**
 * Simula la carga de un archivo médico
 * Muestra progreso de carga y actualiza el estado
 * @param {Object} file - Objeto con información del archivo
 */
const simulateFileUpload = (file) => {
  isUploading.value = true

  setTimeout(() => {
    isUploading.value = false
    uploadedFiles.value = [file] // Solo un archivo
    currentStep.value = 2
  }, 2000)
}

const handleValidateAndConfirm = () => {
  if (currentStep.value === 2) {
    isLoading.value = true
    setTimeout(() => {
      isLoading.value = false
      currentStep.value = 3
    }, 2000)
  } else {
    currentStep.value = currentStep.value + 1
  }
}

// Funcion mejorada handleFinalConfirm
const handleFinalConfirm = async () => {

  // 🔧 Guardar copia de los datos ANTES de limpiar
  patientDataToSave.value = {
    fullName: patientData.fullName,
    age: patientData.age,
    patientId: patientData.patientId,
    gender: patientData.gender,
    clinicalReason: patientData.clinicalReason
  };

  patientDataToShow.value = patientDataToSave.value;



  console.log('DEBUG: Datos a guardar:', patientDataToSave);
  console.log('DEBUG: includePatientData:', includePatientData.value);

  // Guardar estudio localmente (IndexedDB + localStorage)
  console.log('DEBUG: Llamando a savePatientStudy...');
  const studyId = await savePatientStudy();
  console.log('DEBUG: Study ID generado:', studyId);

  // Indicador de carga y tiempo
  const startTime = performance.now();
  isLoading.value = true;

  // Cerrar modal y resetear paso
  showModal.value = false;
  currentStep.value = 1;

  let createdPatientId = null;

  // ✅ PASO 1: Crear paciente en el backend (SOLO si includePatientData está marcado)
  if (charguePatientAndImage) {
    if (includePatientData.value) {
      try {
        console.log('📤 Creando paciente en el backend...');

        const newPatient = await createPatient();
        createdPatientId = newPatient.id;

        console.log('✅ Paciente creado exitosamente en el backend');
        console.log('Patient ID:', createdPatientId);
        console.log('Respuesta completa:', newPatient);

        showProfessionalNotification(
          '✅ Paciente Creado',
          `Paciente "${patientData.fullName}" registrado exitosamente`,
          'success'
        );

      } catch (err) {
        console.error('❌ Error creando paciente en el backend:', err);
        console.error('Detalles del error:', {
          message: err.message,
          response: err.response,
          stack: err.stack
        });

        isLoading.value = false;

        showProfessionalNotification(
          '❌ Error al Crear Paciente',
          `No se pudo crear el paciente en el servidor: ${err.message}`,
          'error'
        );

        return; // ⚠️ ABORTAR si no se puede crear el paciente
      }
    } else {
      console.log('ℹ️ includePatientData es false se crea un paciente anonimo');
      const PatientAnonymous = await createPatientAnonymous();
      createdPatientId = PatientAnonymous.id;
      console.log('✅ Paciente anonimo creado exitosamente en el backend');
    }
  } else {
    const patientReload = await findPatientById(existingImage.image.patient_id);

    showPatientInfo(patientReload);

  }

  // ✅ PASO 2: Procesar archivo si existe
  if (uploadedFiles.value.length > 0 && uploadedFiles.value[0].realFile) {
    const file = uploadedFiles.value[0].realFile;


    console.log('=== PROCESANDO ARCHIVO REAL ===');
    console.log('Nombre del archivo:', file.name);
    console.log('Tamaño:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
    console.log('Tipo:', file.type);

    // Procesar el archivo localmente (para visualización)
    const event = { target: { files: [file] } };
    flagRepeatedArchiveMessage = false;
    handleFileUpload(event);

    // Verificar token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('❌ No hay token de autenticación');
      isLoading.value = false;
      showProfessionalNotification(
        '❌ Error de Autenticación',
        'No se encontró el token de acceso. Por favor, inicie sesión nuevamente.',
        'error'
      );
      return;
    }

    console.log('✅ Token de autenticación encontrado');

    // ✅ PASO 3: Preparar FormData para enviar al backend
    const formData = new FormData();
    formData.append('file', file);
    /*esta linea es para añadir la razon a la imagen, no es la forma correcta
    porque la razon clinica no deberia ser parte del paciente, si no de la imagen
    y puede confundir*/
    formData.append('clinical_reason', patientData.clinicalReason);

    // ✅ Asociar imagen con paciente (si se creó uno)
    if (createdPatientId) {
      formData.append('patient_id', createdPatientId);
      console.log(`🔗 Asociando imagen con paciente ID: ${createdPatientId}`);
    } else {
      console.log('ℹ️ Imagen sin paciente asociado');
    }

    // Log del FormData para debug
    console.log('📦 FormData preparado:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
    }

    if (charguePatientAndImage) {
      try {
        // Verificar salud del servidor
        console.log('🏥 Verificando salud del servidor...');
        const healthResponse = await fetch(`${backendURL}/health-check/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        if (!healthResponse.ok) {
          throw new Error('Servidor no disponible');
        }

        console.log('✅ Servidor disponible, iniciando subida de imagen...');

        // Subir imagen al backend
        const startTime = performance.now();
        let uploadData = null;
        try {
          // Llamas a la función centralizada
          uploadData = await uploadImageFile(formData, token);

          console.log('📊 Datos de la imagen subida:', uploadData);

          // 🆕 GUARDAR INFO DE SEGMENTACIÓN
          if (uploadData && uploadData.segmentation) {
            segmentationInfo.value = uploadData.segmentation;
            console.log('✅ Segmentación detectada:', segmentationInfo.value);

            // Guardar también el image_id para descargar después
            segmentationInfo.value.image_id = uploadData.image_id;
          }

        } catch (error) {
          console.error('❌ Falló la subida de la imagen:', error);
          // Aquí puedes manejar errores de UI o reintentos si quieres
        }
        const processingTime = ((performance.now() - startTime) / 1000).toFixed(2);

        // Construir mensaje de éxito
        let successMessage = `Imagen "${file.name}" guardada en ${processingTime}s`;
        if (createdPatientId) {
          successMessage += ` y asociada al paciente`;
        }

        showProfessionalNotification(
          '✅ Guardado Exitoso',
          successMessage,
          'success'
        );

        console.log(`✅ PROCESO COMPLETADO EN ${processingTime}s`);
        console.log('📊 Resumen:', {
          pacienteCreado: !!createdPatientId,
          patientId: createdPatientId,
          imagenSubida: true,
          imageId: uploadData.image_id,
          tiempoTotal: processingTime + 's'
        });

      } catch (error) {
        console.error('❌ Error en el proceso de subida:', error);

        let errorMessage = 'Ocurrió un error al procesar la imagen';

        if (error.message === 'Failed to fetch') {
          errorMessage = 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
        } else if (error.message === 'Servidor no disponible') {
          errorMessage = 'El servidor no está respondiendo. Inténtelo más tarde.';
        } else {
          errorMessage = error.message;
        }

        showProfessionalNotification(
          '❌ Error',
          errorMessage,
          'error'
        );
      } finally {
        isLoading.value = false;
      }
    }


  } else {
    console.log('=== NO HAY ARCHIVO REAL - ACTIVANDO SIMULACIÓN ===');
    canUploadImage.value = false;
    showOriginalImage.value = true;
    startAIAnalysis();
    isLoading.value = false;
  }

  // Limpiar datos del formulario DESPUÉS de todo el proceso
  clearDataPatient();
  console.log('DEBUG: Datos del formulario limpiados');
};

/**
 * Reinicia el modal y todos sus estados
 * Limpia datos del paciente, archivos y progreso de carga
 */
const resetModal = () => {
  showModal.value = false
  currentStep.value = 1
  patientData.value = {
    fullName: '',
    age: '',
    patientId: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    clinicalReason: ''

  }
  includePatientData.value = false
  isLoading.value = false
  isUploading.value = false
  uploadedFiles.value = []

}

// const handlePatientDataChange = (field, value) => {
//   patientData.value[field] = value
// }

const selectFile = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const clearFiles = () => {
  uploadedFiles.value = []

  // 🔧 SOLUCIÓN AL PROBLEMA: Limpiar valor del input file
  if (fileInput.value) {
    fileInput.value.value = ''
    console.log('🗑️ Input file limpiado - permitirá cargar el mismo archivo nuevamente')
  }
}

// Función temporal para probar el Web Worker
const testWorker = async () => {
  console.log('🔧 Probando Web Worker...')

  if (!isWorkerReady.value) {
    console.error('❌ Worker no está listo')
    alert('Worker no está listo')
    return
  }

  try {
    // Crear datos de prueba simulados
    const testData = { message: 'Test desde el componente', size: 1024 }

    const taskId = await workerTest(
      testData,
      {
        onSuccess: (result) => {
          console.log('✅ Test del Worker completado:', result)
          alert('Worker funcionando correctamente!\n\n' + JSON.stringify(result, null, 2))
        },
        onError: (error) => {
          console.error('❌ Error en test del Worker:', error)
          alert('Error en Worker: ' + error)
        }
      }
    )

    console.log('🚀 Test del Worker iniciado con ID:', taskId)

  } catch (error) {
    console.error('❌ Error iniciando test del Worker:', error)
    alert('Error iniciando Worker: ' + error.message)
  }
}

// 🔽 FUNCIONES EXISTENTES MODIFICADAS 🔽

// Funciones de navegación
const goToHome = () => {
  router.push('/')
}

const showStudyHistory = () => {
  router.push('/historial')
}

const logout = () => {
  console.log('Cerrando sesión...')
  localStorage.removeItem('authToken')        // Esto es para eliminar el token q se guardó de forma local.
  localStorage.removeItem('currentUser')
  userMenuActive.value = false
  router.push('/login')
  alert('Sesión cerrada exitosamente')
}

// Funciones de toggle de menús
const toggleUserMenu = () => {
  userMenuActive.value = !userMenuActive.value
}

// Funciones de toggle de sidebars
const toggleLeftSidebar = () => {
  leftSidebarCollapsed.value = !leftSidebarCollapsed.value
}

const toggleRightSidebar = () => {
  rightSidebarCollapsed.value = !rightSidebarCollapsed.value
}

const toggleBottomSection = () => {
  bottomSectionCollapsed.value = !bottomSectionCollapsed.value
}

// Función de expansión central
const toggleCenterExpansion = () => {
  const wasExpanded = allCollapsed.value; // 🎯 GUARDAR estado previo

  if (allCollapsed.value) {
    leftSidebarCollapsed.value = false
    rightSidebarCollapsed.value = false
    bottomSectionCollapsed.value = false
  } else {
    leftSidebarCollapsed.value = true
    rightSidebarCollapsed.value = true
    bottomSectionCollapsed.value = true
  }

  // 🆘 SOLUCIÓN: Manejo especial para restauración desde modo maximizado 3D
  if (wasExpanded && mainView.value !== '3d') {
    console.log('🔄 Restaurando desde modo maximizado - forzando regeneración de vista 2D');

    nextTick(() => {
      // Esperar a que las transiciones CSS terminen
      setTimeout(() => {
        if (canvasMain.value && volumeData) {
          console.log('🔧 Regenerando canvas principal tras restauración');

          // Limpiar contexto y forzar re-renderizado
          const ctx = canvasMain.value.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height);
          }

          // Sincronizar tamaño y actualizar
          syncCanvasSize(canvasMain.value);
          updateDisplay();
        }
      }, 300); // ⏱️ Delay para asegurar que las transiciones CSS terminen
    });
  }
}

function toggleControls3D() {
  controls3DVisible.value = !controls3DVisible.value
  console.log('🔄 Visibilidad del panel de controles 3D:', controls3DVisible.value ? 'visible' : 'oculto')

  // Forzar redibujado inmediato si hay datos cargados
  if (volumeData) {
    nextTick(() => {
      if (quadViewActive.value) {
        console.log('🎯 Redibujando 4 vistas tras expansión/colapso')
        setTimeout(() => {
          forceRedrawQuadViews()
        }, 150) // Delay más largo para asegurar transición CSS
      } else {
        console.log('🎯 Redibujando vista principal tras expansión/colapso')
        updateDisplay()
      }
    })
  }
}

// Funciones de herramientas
/**
 * Muestra una notificación profesional temporal
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje descriptivo
 * @param {string} type - Tipo: 'success', 'info', 'warning', 'error'
 */
function showProfessionalNotification(title, message, type = 'info') {
  // Notificaciones deshabilitadas - solo logs en consola
  console.log('Notificación:', title, message, type);
}

/**
 * Alterna el modo de cuatro vistas con animación suave
 * Incluye notificación visual profesional
 */
/**
 * Función principal para alternar las vistas cuádruples
 * Maneja la activación/desactivación y las notificaciones
 */
const toggleQuadView = async () => {
  if (isInitializing.value) {
    console.warn('⚠️ Sistema ocupado, espere...')
    return
  }

  try {
    const wasActive = quadViewActive.value
    quadViewActive.value = !wasActive
    console.log(`🔄 Cambiando a modo ${quadViewActive.value ? 'cuádruple' : 'único'}...`)

    // Coordinar sistemas 3D antes del cambio
    coordinateThreeSystems()

    if (!quadViewActive.value) {
      // Desactivación de vista cuádruple
      if (renderer) {
        console.log('🧹 Limpieza de renderizador 3D')
        cleanupQuadViews()
      }

      showProfessionalNotification(
        '📄 Vista múltiple desactivada',
        'Volviendo a vista única',
        'info'
      )

      await nextTick()
      updateDisplay()
    } else {
      // Activación de vista cuádruple
      showProfessionalNotification(
        '🔲 Inicializando vista múltiple',
        'Preparando vistas...',
        'info'
      )

      if (!volumeData) {
        throw new Error('No hay datos volumétricos cargados')
      }

      await initializeQuadViewsProgressively()
    }

    console.log('🔄 Estado de vistas múltiples:', quadViewActive.value ? 'activado' : 'desactivado')
  } catch (error) {
    console.error('❌ Error al cambiar vista:', error)

    // Solo resetear si el error no es de limpieza de DOM
    if (!error.message?.includes('removeChild') && !error.message?.includes('Context Lost')) {
      quadViewActive.value = false
      cleanupQuadViews()
      showProfessionalNotification(
        '❌ Error',
        'No se pudo cambiar el modo de visualización',
        'error'
      )
    } else {
      // Para errores de DOM/WebGL, solo limpiar suavemente
      console.log('🔧 Error de limpieza DOM/WebGL detectado, continuando...')
      if (error.message?.includes('removeChild')) {
        console.log('🔧 Error de removeChild ignorado - el nodo ya fue removido')
      }
      if (error.message?.includes('Context Lost')) {
        console.log('🔧 Context Lost detectado - esto es normal durante la limpieza')
      }
    }
  }
}

// Variables de control para el sistema 3D
const quadViewInitTimeout = ref(null)
const isInitializing = ref(false)
const animationFrameId = ref(null)
const isThreeInitialized = ref(false)

// Configuración 3D

/**
 * Función para coordinar la alternancia entre sistemas 3D
 * Evita conflictos de contextos WebGL
 */
function coordinateThreeSystems() {
  const has3DMain = !!(renderer && scene && camera)
  const has3DQuad = !!(renderer3DQuad.value && scene3DQuad.value && camera3DQuad.value)

  console.log('🔧 Estado de sistemas 3D:', {
    principal: has3DMain,
    cuadrante: has3DQuad,
    quadViewActive: quadViewActive.value
  })

  // Si se está activando vista cuádruple y existe sistema principal, limpiarlo suavemente
  if (quadViewActive.value && has3DMain) {
    console.log('🔄 Pausando sistema 3D principal para vista cuádruple...')
    // No eliminar completamente, solo pausar animaciones
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  // Si se está desactivando vista cuádruple y existe sistema principal, reactivarlo
  if (!quadViewActive.value && has3DMain) {
    console.log('🔄 Reactivando sistema 3D principal...')
    // Reactivar si es necesario
  }
}

/**
 * Limpia los recursos y timeouts de las vistas cuádruples,
 * incluyendo el renderizador 3D
 */
function cleanupQuadViews() {
  // Resetear estado de error
  quadRenderingError = false

  // Limpiar timeouts
  if (quadViewInitTimeout.value) {
    clearTimeout(quadViewInitTimeout.value)
    quadViewInitTimeout.value = null
  }

  // Limpiar listeners y observers del responsive 3D
  if (window._quadView3DCleanups) {
    console.log('🧹 Limpiando listeners de resize observers...')
    window._quadView3DCleanups.forEach(cleanup => {
      try {
        cleanup()
      } catch (err) {
        console.warn('⚠️ Error en limpieza de observer:', err)
      }
    })
    window._quadView3DCleanups = []
  }

  // Limpiar recursos 3D
  if (renderer3DQuad.value || scene3DQuad.value || camera3DQuad.value) {
    console.log('🧹 Limpiando recursos Three.js del cuadrante')

    // Cancelar animación
    if (animationId3DQuad) {
      try { cancelAnimationFrame(animationId3DQuad) } catch (err) { console.warn('⚠️ Error cancelando animación 3D quad:', err) }
      animationId3DQuad = null
    }

    // Limpiar controles
    if (controls3DQuad) {
      try { controls3DQuad.dispose() } catch (err) { console.warn('⚠️ Error liberando controles 3D quad:', err) }
      controls3DQuad = null
    }

    // Remover y limpiar mesh del cuadrante
    if (scene3DQuad.value && volumeMeshQuad) {
      try { scene3DQuad.value.remove(volumeMeshQuad) } catch (err) { console.warn('⚠️ Error removiendo mesh 3D quad:', err) }
    }
    if (volumeMeshQuad) {
      try {
        // Si el material fue clonado (no es exactamente el mismo objeto que el principal), liberarlo
        if (volumeMesh && volumeMeshQuad.material && volumeMeshQuad.material !== volumeMesh.material) {
          volumeMeshQuad.material.dispose()
        }
        // La geometría es compartida, no la liberamos aquí
      } catch (err) { console.warn('⚠️ Error liberando material 3D quad:', err) }
      volumeMeshQuad = null
    }

    // Limpiar renderer del cuadrante sin forzar pérdida de contexto
    if (renderer3DQuad.value) {
      try {
        renderer3DQuad.value.dispose()
        console.log('✅ Renderer 3D quad limpiado')
      } catch (err) {
        console.warn('⚠️ Error liberando renderer 3D quad:', err)
      }
      renderer3DQuad.value = null
    }

    // Limpiar referencias sin forzar dispose de elementos compartidos
    scene3DQuad.value = null
    camera3DQuad.value = null
  }

  isInitializing.value = false
}

/**
 * Inicializa el renderizador 3D para la vista en cuadrante
 */
function initQuadView3D() {
  if (!canvas3DRef.value) {
    console.error('❌ Canvas 3D no encontrado')
    return false
  }

  try {
    const canvas = canvas3DRef.value
    // Sincronizar tamaño del canvas con su tamaño visual
    syncCanvasSize(canvas)
    const width = canvas.width || canvas.clientWidth || 290
    const height = canvas.height || canvas.clientHeight || 230

    // Crear renderizador con mismas opciones que el principal
    renderer3DQuad.value = markRaw(new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false
    }))
    renderer3DQuad.value.setClearColor(0x000000, 1)
    renderer3DQuad.value.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer3DQuad.value.setSize(width, height, false)

    // Ajustes WebGL similares
    const gl = renderer3DQuad.value.getContext()
    if (gl) {
      try {
        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      } catch (err) {
        console.warn('⚠️ Error configurando estado WebGL para cuadrante:', err)
      }
    }

    // Crear escena y cámara del cuadrante
    scene3DQuad.value = markRaw(new THREE.Scene())
    const fov = camera ? camera.fov : 45
    const near = camera ? camera.near : 0.1
    const far = camera ? camera.far : 1000
    camera3DQuad.value = markRaw(new THREE.PerspectiveCamera(fov, width / height, near, far))

    // Sincronizar posición/orientación con la cámara principal si existe
    if (camera) {
      camera3DQuad.value.position.copy(camera.position)
      camera3DQuad.value.quaternion.copy(camera.quaternion)
      camera3DQuad.value.updateProjectionMatrix()
    } else {
      camera3DQuad.value.position.set(2, 2, 2)
      camera3DQuad.value.lookAt(0, 0, 0)
    }

    // Controles (deshabilitados para mantener espejo del 3D principal)
    controls3DQuad = markRaw(new OrbitControls(camera3DQuad.value, canvas))
    controls3DQuad.enableDamping = true
    controls3DQuad.dampingFactor = 0.05
    controls3DQuad.enabled = false // espejo del principal

    // Luces iguales al principal
    const ambientLight = markRaw(new THREE.AmbientLight(0xffffff, 0.3))
    scene3DQuad.value.add(ambientLight)
    const directionalLight = markRaw(new THREE.DirectionalLight(0xffffff, 0.7))
    directionalLight.position.set(1, 1, 1)
    scene3DQuad.value.add(directionalLight)

    // Ejes de referencia (opcional, comentar si no se desea)
    const axesHelper = markRaw(new THREE.AxesHelper(1))
    scene3DQuad.value.add(axesHelper)

    // Crear un mesh para el cuadrante con material clonado
    if (volumeMesh) {
      console.log('✅ volumeMesh encontrado, clonando para el cuadrante...')
      try {
        // Crear material clonado sin reactividad de Vue
        let materialQuad
        if (volumeMesh.material?.clone && typeof volumeMesh.material.clone === 'function') {
          materialQuad = markRaw(volumeMesh.material.clone())

          // Asegurar que los uniforms no sean reactivos
          if (materialQuad.uniforms) {
            const uniforms = {}
            Object.keys(materialQuad.uniforms).forEach(key => {
              const uniform = materialQuad.uniforms[key]
              // Crear nueva referencia sin reactividad
              uniforms[key] = {
                value: uniform.value
              }
              // Para matrices y vectores, clonar adecuadamente
              if (uniform.value && typeof uniform.value.clone === 'function') {
                uniforms[key].value = uniform.value.clone()
              }
            })
            materialQuad.uniforms = markRaw(uniforms)

            // 🎨 Aplicar preset de colores seleccionado (Escala de Grises por defecto)
            const preset = colorPresets.value[selectedColorPreset.value]
            if (preset) {
              console.log(`🎨 Aplicando preset "${preset.name}" (índice ${selectedColorPreset.value}) al cuadrante 3D`)

              if (materialQuad.uniforms.lowColor) {
                const oldLow = materialQuad.uniforms.lowColor.value.toArray()
                materialQuad.uniforms.lowColor.value = new THREE.Vector3(
                  preset.colors.low[0],
                  preset.colors.low[1],
                  preset.colors.low[2]
                )
                console.log(`    lowColor: [${oldLow}] → [${preset.colors.low}]`)
              }
              if (materialQuad.uniforms.midColor) {
                const oldMid = materialQuad.uniforms.midColor.value.toArray()
                materialQuad.uniforms.midColor.value = new THREE.Vector3(
                  preset.colors.mid[0],
                  preset.colors.mid[1],
                  preset.colors.mid[2]
                )
                console.log(`    midColor: [${oldMid}] → [${preset.colors.mid}]`)
              }
              if (materialQuad.uniforms.highColor) {
                const oldHigh = materialQuad.uniforms.highColor.value.toArray()
                materialQuad.uniforms.highColor.value = new THREE.Vector3(
                  preset.colors.high[0],
                  preset.colors.high[1],
                  preset.colors.high[2]
                )
                console.log(`    highColor: [${oldHigh}] → [${preset.colors.high}]`)
              }

              // Marcar material para actualización
              materialQuad.needsUpdate = true
              console.log(`  ✅ Colores aplicados y material marcado para actualización`)
            }

            // 🚫 Desactivar volumen mejorado IA en vista cuadrante 3D
            // El cuadrante SIEMPRE muestra el volumen original sin procesamiento IA
            if (materialQuad.uniforms.useEnhanced) {
              materialQuad.uniforms.useEnhanced.value = false
              console.log('  🚫 Volumen mejorado IA desactivado para cuadrante 3D (siempre usa volumen original)')
            }
          }
        } else {
          materialQuad = volumeMesh.material
        }

        volumeMeshQuad = markRaw(new THREE.Mesh(volumeMesh.geometry, materialQuad))
        volumeMeshQuad.position.copy(volumeMesh.position)
        scene3DQuad.value.add(volumeMeshQuad)
        console.log('✅ volumeMeshQuad agregado a la escena')
      } catch (e) {
        console.warn('⚠️ No se pudo clonar material del volumen, usando el mismo:', e)
        volumeMeshQuad = markRaw(new THREE.Mesh(volumeMesh.geometry, volumeMesh.material))
        scene3DQuad.value.add(volumeMeshQuad)
      }
    } else {
      console.warn('⚠️ volumeMesh no disponible - solo se mostrarán los ejes')
      // Intentar crear el volumen si no existe
      if (volumeData && volumeTexture) {
        console.log('🔄 Intentando crear volumeMesh...')
        try {
          createVolumeMesh3D()
          // Verificar si ahora tenemos el mesh después de crearlo
          if (volumeMesh) {
            console.log('✅ volumeMesh creado exitosamente, agregando al cuadrante...')
            const materialQuad = volumeMesh.material?.clone?.() || volumeMesh.material
            volumeMeshQuad = markRaw(new THREE.Mesh(volumeMesh.geometry, materialQuad))
            volumeMeshQuad.position.copy(volumeMesh.position)
            scene3DQuad.value.add(volumeMeshQuad)
            console.log('✅ volumeMeshQuad agregado a la escena del cuadrante')
          } else {
            console.warn('⚠️ No se pudo crear volumeMesh')
          }
        } catch (createError) {
          console.error('❌ Error creando volumeMesh:', createError)
        }
      } else {
        console.warn('⚠️ No hay datos suficientes para crear el volumen:', {
          volumeData: !!volumeData,
          volumeTexture: !!volumeTexture
        })
      }
    }

    console.log('✅ Vista 3D en cuadrante inicializada')

    // 🎯 CREAR PLANOS CROSSHAIRS 3D después de crear la escena
    if (volumeData && crosshairsEnabled.value) {
      console.log('🎯 Creando planos crosshairs 3D en cuadrante...')
      createCrosshairPlanes3D()
    }

    // Iniciar animación
    startQuadAnimationLoop()
    return true
  } catch (error) {
    console.error('❌ Error al inicializar vista 3D en cuadrante:', error)
    return false
  }
}

// Sistema Three.js duplicado eliminado: ahora usamos initThree()/animate3D() del pipeline principal

// Manejadores de eventos para vista 3D
const isDragging = ref(false)
const previousMousePosition = ref({ x: 0, y: 0 })

function handle3DCanvasMouseDown(event) {
  // 🎯 Si se hace click con Ctrl/Cmd, sincronizar crosshairs desde vista 3D
  if ((event.ctrlKey || event.metaKey) && crosshairsEnabled.value && quadViewActive.value) {
    console.log('🎯 Click en vista 3D con Ctrl - sincronizando desde planos actuales')

    // Usar las posiciones actuales de los slices como referencia
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)

    // Sincronizar usando los slices actuales (que ya están reflejados en los planos 3D)
    syncViewsFromCrosshair('axial', centerX, centerY)

    return
  }

  isDragging.value = true
  previousMousePosition.value = {
    x: event.clientX,
    y: event.clientY
  }
}

function handle3DCanvasMouseMove(event) {
  if (!isDragging.value || !controls.value) return

  const deltaX = event.clientX - previousMousePosition.value.x
  const deltaY = event.clientY - previousMousePosition.value.y

  controls.value.rotateLeft(deltaX * 0.005)
  controls.value.rotateUp(deltaY * 0.005)

  previousMousePosition.value = {
    x: event.clientX,
    y: event.clientY
  }
}

function handle3DCanvasMouseUp() {
  isDragging.value = false
}

function handle3DCanvasMouseLeave() {
  isDragging.value = false
}

function handle3DCanvasWheel(event) {
  if (!camera.value) return

  const zoomSpeed = 0.1
  const delta = event.deltaY > 0 ? 1 : -1

  camera.value.position.z = Math.max(2, Math.min(10, camera.value.position.z + delta * zoomSpeed))
  camera.value.updateProjectionMatrix()
}

function reset3DView() {
  if (!camera.value || !controls.value) return

  // Restablecer posición de la cámara
  camera.value.position.set(0, 0, 5)
  camera.value.lookAt(0, 0, 0)
  camera.value.updateProjectionMatrix()

  // Restablecer controles
  controls.value.reset()
}

// Limpieza de recursos Three.js
let isCleanedUp = false

function cleanupThreeSystem() {
  if (isCleanedUp) {
    console.log('♻️ Limpieza Three.js ya ejecutada, se omite.')
    return
  }
  isCleanedUp = true

  console.log('🧹 Limpiando sistema Three.js...')

  if (animationFrameId?.value) {
    try {
      cancelAnimationFrame(animationFrameId.value)
    } catch (error) {
      console.warn('⚠️ Error al cancelar animación:', error)
    }
    animationFrameId.value = null
  }

  if (controls?.value) {
    try {
      controls.value.dispose()
    } catch (error) {
      console.warn('⚠️ Error al liberar controles:', error)
    }
    controls.value = null
  }

  if (renderer?.value) {
    try {
      renderer.value.forceContextLoss()
      renderer.value.dispose()
    } catch (error) {
      console.warn('⚠️ Error al liberar renderizador:', error)
    }
    renderer.value = null
  }

  if (scene?.value) {
    try {
      scene.value.traverse((object) => {
        if (object.isMesh) {
          object.geometry?.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose())
            } else {
              object.material.dispose()
            }
          }
        }
      })
    } catch (error) {
      console.warn('⚠️ Error al limpiar escena:', error)
    }
    scene.value = null
  }

  isThreeInitialized.value = false
  console.log('✅ Sistema Three.js limpiado completamente')
}


/**
 * Función de utilidad para crear delays
 */
const delay = ms => new Promise(resolve => {
  const timeout = setTimeout(resolve, ms)
  quadViewInitTimeout.value = timeout
  return timeout
})

/**
 * Redimensiona la vista 3D del cuadrante cuando cambia el tamaño
 */
function resizeQuadView3D() {
  if (!canvas3DRef.value || !renderer3DQuad.value || !camera3DQuad.value) return

  const canvas = canvas3DRef.value
  // Sincronizar atributos width/height con el tamaño visual
  const changed = syncCanvasSize(canvas)
  const width = canvas.width
  const height = canvas.height

  renderer3DQuad.value.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer3DQuad.value.setSize(width, height, false)
  camera3DQuad.value.aspect = width / height
  camera3DQuad.value.updateProjectionMatrix()

  // Re-render inmediato si cambió el tamaño
  if (changed) {
    renderQuadView3D()
  }
}

/**
 * Renderiza la escena 3D en el cuadrante
 */
// Función para manejar errores de renderizado 3D
function handleRenderingError(error) {
  console.error('❌ Error crítico en renderizado 3D:', error)

  quadRenderingError = true

  // Pausar el bucle de animación
  if (animationId3DQuad) {
    cancelAnimationFrame(animationId3DQuad)
    animationId3DQuad = null
  }

  // Si es un error crítico de Three.js, limpiar y reinicializar
  if (error.message?.includes('modelViewMatrix') ||
    error.message?.includes('proxy') ||
    error.message?.includes('WebGL')) {

    console.warn('⚠️ Error de Three.js detectado, limpiando recursos...')

    // Limpiar y reintentar después de un delay
    setTimeout(() => {
      if (quadViewActive.value) {
        console.log('🔄 Reintentando inicialización del cuadrante 3D...')
        cleanupQuadViews()
        setTimeout(() => {
          if (quadViewActive.value) {
            quadRenderingError = false
            initQuadView3D()
          }
        }, 1000)
      }
    }, 2000)
  }
}

function renderQuadView3D() {
  if (!renderer3DQuad.value || !scene3DQuad.value || !camera3DQuad.value) return

  try {
    // Sincronizar cámara del cuadrante con la principal si existe
    if (camera) {
      camera3DQuad.value.position.copy(camera.position)
      camera3DQuad.value.quaternion.copy(camera.quaternion)
      // Sincronizar target si existe
      if (controls && controls.target && controls3DQuad) {
        controls3DQuad.target.copy(controls.target)
      }
    }

    // Sincronizar uniforms del material (si se clonó)
    if (volumeMesh && volumeMeshQuad && volumeMeshQuad.material && volumeMesh.material && volumeMeshQuad.material !== volumeMesh.material) {
      const uMain = volumeMesh.material.uniforms
      const uQuad = volumeMeshQuad.material.uniforms
      if (uMain && uQuad) {
        // Copiar valores relevantes de forma segura
        const keys = ['steps', 'opacity', 'threshold', 'brightness', 'contrast', 'lowColor', 'midColor', 'highColor', 'clippingPlane', 'useTransferFunction', 'showSegmentation', 'segOpacity', 'tumorColor', 'edemaColor', 'necrosisColor', 'useEnhanced', 'mixRatio']
        keys.forEach(k => {
          if (uMain[k] && uQuad[k] && uMain[k].value !== undefined) {
            try {
              if (uMain[k].value && typeof uMain[k].value.copy === 'function' && uQuad[k].value && typeof uQuad[k].value.copy === 'function') {
                // Para vectores y colores
                uQuad[k].value.copy(uMain[k].value)
              } else {
                // Para valores primitivos
                uQuad[k].value = uMain[k].value
              }
            } catch {
              // En caso de error, asignar directamente
              uQuad[k].value = uMain[k].value
            }
          }
        })

        // Actualizar cameraPos para el cuadrante según su cámara de forma segura
        if (uQuad.cameraPos && uQuad.cameraPos.value && camera3DQuad.value) {
          try {
            if (typeof uQuad.cameraPos.value.copy === 'function') {
              uQuad.cameraPos.value.copy(camera3DQuad.value.position)
            } else {
              uQuad.cameraPos.value = camera3DQuad.value.position.clone()
            }
          } catch (cameraError) {
            console.warn('⚠️ Error actualizando cameraPos:', cameraError)
          }
        }

        volumeMeshQuad.material.needsUpdate = true
      }
    }

    // 🎯 ASEGURAR VISIBILIDAD DE PLANOS CROSSHAIRS 3D
    if (crosshairsEnabled.value && crosshairPlanes3D.axial && crosshairPlanes3D.coronal && crosshairPlanes3D.sagittal) {
      crosshairPlanes3D.axial.visible = true
      crosshairPlanes3D.coronal.visible = true
      crosshairPlanes3D.sagittal.visible = true
    }

    renderer3DQuad.value.render(scene3DQuad.value, camera3DQuad.value)
  } catch (error) {
    handleRenderingError(error)
  }
}

// Bucle de animación del cuadrante
function startQuadAnimationLoop() {
  if (!renderer3DQuad.value || !scene3DQuad.value || !camera3DQuad.value || quadRenderingError) {
    console.warn('⚠️ No se puede iniciar bucle de animación - recursos no disponibles o error previo')
    return
  }

  const loop = () => {
    if (!quadViewActive.value || quadRenderingError) {
      if (animationId3DQuad) {
        cancelAnimationFrame(animationId3DQuad)
        animationId3DQuad = null
      }
      return
    }

    try {
      animationId3DQuad = requestAnimationFrame(loop)

      // Actualizar controles (aunque están deshabilitados, mantienen damping/target)
      if (controls3DQuad && controls3DQuad.enabled) {
        controls3DQuad.update()
      }

      renderQuadView3D()
    } catch (error) {
      handleRenderingError(error)
    }
  }

  // Iniciar solo si no hay un bucle activo
  if (animationId3DQuad) {
    cancelAnimationFrame(animationId3DQuad)
  }

  // Resetear estado de error al iniciar nuevo bucle
  quadRenderingError = false
  loop()
}

/**
 * Inicializa las vistas de forma progresiva y segura,
 * incluyendo la vista 3D en el cuadrante
 */
async function initializeQuadViewsProgressively() {
  if (isInitializing.value) return
  isInitializing.value = true
  cleanupQuadViews()

  const viewSteps = [
    { index: 1, label: 'Axial', init: () => updateDisplay() },
    { index: 2, label: 'Sagital', init: () => updateDisplay() },
    { index: 3, label: 'Coronal', init: () => updateDisplay() },
    {
      index: 4,
      label: 'Volumétrica',
      init: async () => {
        console.log('🧠 Iniciando vista volumétrica...')

        // Esperar a que el volumen esté disponible
        let retries = 0
        const maxRetries = 20 // 2 segundos máximo

        while (!volumeMesh && retries < maxRetries) {
          console.log(`⏳ Esperando volumeMesh (intento ${retries + 1}/${maxRetries})...`)
          if (!volumeTexture) {
            // Si no hay textura, intentar crear el volumen
            console.log('🔄 Creando volumen 3D desde datos existentes...')
            create3DVolumeFromExistingData()
          }
          await new Promise(resolve => setTimeout(resolve, 100))
          retries++
        }

        if (!volumeMesh) {
          console.warn('⚠️ volumeMesh no disponible después de espera, continuando solo con ejes')
        }

        const success = initQuadView3D()
        if (success) {
          // Configurar observador de redimensionamiento
          const resizeObserver = new ResizeObserver(() => {
            if (quadViewActive.value) {
              resizeQuadView3D()
            }
          })
          if (canvas3DRef.value) {
            resizeObserver.observe(canvas3DRef.value)
          }

          // 🎨 Forzar actualización de uniformes para sincronizar colores con preset seleccionado
          await nextTick()
          console.log('🎨 Forzando actualización de uniformes después de inicializar vista 3D cuadrante...')
          updateUniforms3D()

          // Renderizar vista inicial
          renderQuadView3D()
        }
        return success
      }
    }
  ]

  try {
    for (const { index, label, init } of viewSteps) {
      console.log(`🎯 Inicializando vista ${index} (${label})...`)

      if (!quadViewActive.value) {
        throw new Error('Inicialización cancelada')
      }

      await nextTick()
      const success = await init()

      if (success === false) {
        throw new Error(`Falló la inicialización de la vista ${label}`)
      }

      await delay(100)
    }

    if (quadViewActive.value) {
      showProfessionalNotification(
        '✅ Vista múltiple activada',
        'Las 4 vistas están listas',
        'success'
      )
    }
  } catch (error) {
    console.warn('⚠️ Inicialización interrumpida:', error.message)
    cleanupQuadViews()
  } finally {
    isInitializing.value = false
  }
}

/**
 * Alterna el modo de zoom interactivo (lupa) con notificación profesional
 * Permite hacer zoom in/out haciendo clic en la imagen
 */
const toggleZoom = () => {
  zoomActive.value = !zoomActive.value

  if (zoomActive.value) {
    // Activar modo zoom de acercamiento por defecto
    zoomMode.value = 'in'
    // Desactivar otros modos
    measureActive.value = false
    // Desactivar navegación de slices para permitir zoom con scroll
    sliceNavigationActive.value = false

    showProfessionalNotification(
      '🔍 Modo Zoom activado',
      'Usa la rueda del mouse para hacer zoom focal',
      'info'
    )
    console.log('🔍 Modo Lupa ACTIVADO - Clic para hacer zoom')
  } else {
    // Desactivar modo zoom
    zoomMode.value = null
    // Reactivar navegación de slices
    sliceNavigationActive.value = true

    showProfessionalNotification(
      '🔍 Modo Zoom desactivado',
      'Navegación de slices con scroll reactivada',
      'info'
    )
    console.log('🔍 Modo Lupa DESACTIVADO')
  }
}

/**
 * Maneja el evento de rueda del mouse para zoom
 * Solo funciona cuando el modo zoom está activado
 * @param {WheelEvent} event - Evento de rueda del mouse
 */
// Variables para control de zoom
let zoomTimeout = null

const handleWheelZoom = (event) => {
  // Solo permitir zoom con rueda si el modo zoom está activado
  if (!zoomActive.value) {
    return // No prevenir evento para permitir scroll normal
  }

  event.preventDefault()

  // Obtener coordenadas del mouse relativas al canvas
  const canvas = event.target
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const delta = event.deltaY
  // Zoom más suave: factor menor para mejor control
  const zoomDirection = delta > 0 ? 'out' : 'in'
  const zoomFactor = zoomDirection === 'in' ? 1.05 : 0.95

  const oldZoomLevel = zoomLevel.value
  const newZoomLevel = Math.max(0.5, Math.min(5, oldZoomLevel * zoomFactor))

  if (newZoomLevel !== oldZoomLevel) {
    // Calcular el nuevo desplazamiento para mantener el punto del mouse fijo
    const zoomRatio = newZoomLevel / oldZoomLevel

    // Punto de origen del zoom en coordenadas del canvas
    const zoomCenterX = mouseX
    const zoomCenterY = mouseY

    // Calcular nuevo desplazamiento
    zoomTranslate.value.x = zoomCenterX - (zoomCenterX - zoomTranslate.value.x) * zoomRatio
    zoomTranslate.value.y = zoomCenterY - (zoomCenterY - zoomTranslate.value.y) * zoomRatio

    // Actualizar nivel de zoom
    zoomLevel.value = newZoomLevel

    // Guardar punto focal para referencia
    zoomOrigin.value.x = zoomCenterX
    zoomOrigin.value.y = zoomCenterY

    // Actualizar el modo visual para mostrar la dirección del zoom
    zoomMode.value = zoomDirection

    console.log(`🔍 Zoom focal ${zoomDirection}: ${(zoomLevel.value * 100).toFixed(0)}% en (${mouseX}, ${mouseY})`)

    // Cancelar redibujado anterior si existe
    if (zoomTimeout) {
      clearTimeout(zoomTimeout)
    }

    // Redibujado inmediato para feedback rápido
    updateDisplay()

    // Redibujado final después de un pequeño delay
    zoomTimeout = setTimeout(() => {
      updateDisplay()
      zoomTimeout = null
    }, 50)
  }
}

/**
 * Maneja la navegación de slices usando el scroll del mouse
 * Solo funciona cuando zoom y medición están desactivados
 * @param {WheelEvent} event - Evento de rueda del mouse
 */
const handleSliceNavigation = (event) => {
  // No navegar slices si zoom o medición están activos
  if (zoomActive.value || measureActive.value) {
    return false // Permitir que otras funciones manejen el evento
  }

  // Solo proceder si la navegación de slices está activa y hay datos cargados
  if (!sliceNavigationActive.value || !volumeData) {
    return false
  }

  event.preventDefault()

  const delta = event.deltaY
  const direction = delta > 0 ? 1 : -1

  // Determinar qué slice cambiar basado en la vista actual
  let currentSlice, maxSlices, sliceType

  switch (mainView.value) {
    case 'axial':
      currentSlice = currentSlices.axial
      maxSlices = depth
      sliceType = 'axial'
      break
    case 'coronal':
      currentSlice = currentSlices.coronal
      maxSlices = height
      sliceType = 'coronal'
      break
    case 'sagittal':
      currentSlice = currentSlices.sagittal
      maxSlices = width
      sliceType = 'sagittal'
      break
    default:
      return false // No aplicar en vista 3D
  }

  // Calcular nuevo slice
  const newSlice = Math.max(0, Math.min(maxSlices - 1, currentSlice + direction))

  // Solo actualizar si hay cambio
  if (newSlice !== currentSlice) {
    currentSlices[sliceType] = newSlice

    console.log(`🔄 Navegación slice ${sliceType}: ${newSlice + 1}/${maxSlices} (dirección: ${direction > 0 ? 'siguiente' : 'anterior'})`)

    // 🗑️ LIMPIAR IMAGEN ORIGINAL AL CAMBIAR SLICE EN VISTA PRINCIPAL
    // Cuando cambia el slice, necesitamos limpiar la imagen original para forzar
    // que se guarde la nueva imagen del slice actual la próxima vez que se aplique un filtro
    console.log(`🗑️ Limpiando imagen original al cambiar slice en vista principal (${sliceType})`)

    // Limpiar todas las imágenes originales que contengan información de slice obsoleta
    Object.keys(originalImagesByView.value).forEach(key => {
      if (key.includes('mainView')) {
        delete originalImagesByView.value[key]
      }
    })

    console.log(`✅ Imágenes originales limpiadas - nueva imagen se guardará para el slice actual`)

    // Actualizar display inmediatamente
    updateDisplay()

    // Mostrar notificación visual sutil
    showSliceChangeNotification(sliceType, newSlice + 1, maxSlices)
  }

  return true // Evento manejado
}

/**
 * Muestra una notificación sutil del cambio de slice
 */
const showSliceChangeNotification = (sliceType, current, total) => {
  // Crear notificación temporal muy discreta
  const notification = document.createElement('div')
  notification.textContent = `${sliceType.toUpperCase()} ${current}/${total}`
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    pointer-events: none;
    animation: fadeInOut 0.8s ease-in-out;
  `

  // Agregar CSS de animación si no existe
  if (!document.querySelector('#slice-notification-style')) {
    const style = document.createElement('style')
    style.id = 'slice-notification-style'
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        30% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `
    document.head.appendChild(style)
  }

  document.body.appendChild(notification)

  // Remover después de la animación
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
  }, 800)
}

/**
 * Función principal para manejar eventos de rueda del mouse
 * Delega entre zoom y navegación de slices según las herramientas activas
 * @param {WheelEvent} event - Evento de rueda del mouse
 */
const handleMainWheelEvent = (event) => {
  // Primero intentar zoom si está activo
  if (zoomActive.value) {
    handleWheelZoom(event)
    return
  }

  // Si zoom no está activo, intentar navegación de slices
  if (handleSliceNavigation(event)) {
    return // Evento manejado por navegación de slices
  }

  // Si ninguna función maneja el evento, permitir comportamiento por defecto
  // (esto permite scroll normal cuando no hay herramientas activas)
}

/**

/**
 * Alterna el modo de medición interactivo con notificación profesional
 * Permite medir distancias haciendo clic en la imagen
 */
const toggleMeasure = () => {
  measureActive.value = !measureActive.value

  if (measureActive.value) {
    // Activar modo medición
    measureMode.value = true
    // Desactivar zoom si está activo
    zoomActive.value = false
    zoomMode.value = null
    // Desactivar navegación de slices para evitar interferencias
    sliceNavigationActive.value = false

    showProfessionalNotification(
      '📏 Modo Medición activado',
      'Haz clic en dos puntos para medir distancia',
      'success'
    )
    console.log('📏 Modo Medición ACTIVADO - Clic para medir distancias')
  } else {
    // Desactivar modo medición
    measureMode.value = false
    // Reactivar navegación de slices
    sliceNavigationActive.value = true

    showProfessionalNotification(
      '📏 Modo Medición desactivado',
      'Navegación de slices con scroll reactivada',
      'info'
    )
    console.log('📏 Modo Medición DESACTIVADO')
  }
}

const toggleLimpiar = () => {
  limpiarActive.value = !limpiarActive.value

  // LIMPIAR archivos y REACTIVAR la capacidad de cargar
  uploadedFiles.value = []
  canUploadImage.value = true
  aiAnalysisComplete.value = false
  showOriginalImage.value = false

  // 🔧 SOLUCIÓN AL PROBLEMA: Limpiar valor del input file para permitir cargar el mismo archivo
  if (fileInput.value) {
    fileInput.value.value = ''
    console.log('🗑️ Input file limpiado - permitirá cargar el mismo archivo nuevamente')
  }

  // ===== CAMBIAR A VISTA AXIAL =====
  console.log('🔄 Cambiando a vista axial...')
  setMainView('axial')

  // ===== LIMPIAR MEMORIA DE DATOS VOLUMÉTRICOS =====
  console.log('🧹 Limpiando memoria de datos volumétricos...')

  // Limpiar datos principales
  volumeData = null
  width = 0
  height = 0
  depth = 0

  // Resetear rangos de datos
  originalDataMin = 0
  originalDataMax = 255

  // ===== LIMPIAR DATOS DE IA =====
  console.log('🤖 Limpiando datos de IA...')

  // Limpiar texturas de IA
  if (segmentationTexture) {
    segmentationTexture.dispose()
    segmentationTexture = null
  }

  if (enhancedVolumeTexture) {
    enhancedVolumeTexture.dispose()
    enhancedVolumeTexture = null
  }

  // Limpiar datos de IA
  aiVolumeData = null
  // segmentationData = null  // DESHABILITADA TEMPORALMENTE

  // Resetear estados de IA
  showIASegmentation3D.value = false
  useEnhancedVolume.value = false
  aiProcessingStatus.value = {
    isProcessing: false,
    progress: 0,
    currentTask: '',
    error: null
  }

  aiAnalysisResults.value = {
    tumorVolume: 0,
    tumorPosition: { x: 0, y: 0, z: 0 },
    confidence: 0,
    findings: [],
    processingTime: 0,
    segmentationFound: false,
    recommendations: []
  }

  // ===== LIMPIAR RECURSOS 3D =====
  console.log('🎬 Limpiando recursos 3D...')
  cleanup3DResources()

  // ===== RESETEAR ESTADOS DE VISUALIZACIÓN =====
  console.log('📊 Reseteando estados de visualización...')

  // Resetear slices
  currentSlices.axial = 0
  currentSlices.coronal = 0
  currentSlices.sagittal = 0

  // Resetear zoom
  zoomLevel.value = 1
  zoomOrigin.value = { x: 0, y: 0 }
  zoomTranslate.value = { x: 0, y: 0 }

  // Resetear window/level
  windowLevel.window = 255
  windowLevel.level = 128

  // Resetear información del archivo
  volumeLoaded.value = false
  currentDataType.value = {
    name: '',
    description: '',
    isOptimized: false,
    notes: '',
    hasIssues: false,
    issueType: ''
  }
  hasProblematicData.value = false
  currentOrientation.value = {
    orientation: 'UNKNOWN',
    needsCorrection: false,
    method: 'fallback',
    displayInfo: null
  }

  // Limpiar mediciones
  measurements.value = []
  currentMeasurement.value = { view: null, slice: null, points: [] }
  measureMode.value = false
  measuredDistance.value = null
  measuredDistanceMm.value = null

  // Resetear estados de herramientas
  quadViewActive.value = false
  zoomActive.value = false
  measureActive.value = false
  showCrosshairs.value = false

  // Resetear modalidad y archivos
  selectedModality.value = ''
  currentModality.value = 't1n'
  showSegmentation.value = false
  hasMeasures.value = false

  // Resetear información de archivos del caso
  caseFiles.caseName = ''

  // Resetear configuraciones de zoom para quad view
  quadZoomLevels.main = 1
  quadZoomOrigins.main = { x: 0, y: 0 }
  quadZoomTranslates.main = { x: 0, y: 0 }
  quadViewDragging.main = false
  quadViewLastY.main = 0

  // ===== FORZAR GARBAGE COLLECTION (sugerencia al navegador) =====
  console.log('♻️ Sugiriendo limpieza de memoria...')
  if (window.gc) {
    window.gc() // Solo disponible en modo desarrollo de Chrome
  }

  console.log('Toggle Limpiar:', limpiarActive.value)
  console.log('✅ Limpieza completa realizada: archivos, memoria volumétrica, datos IA, recursos 3D y estados')
}


/**
 * Alterna la navegación de slices con scroll del mouse
 * Se desactiva automáticamente cuando zoom o medición están activos
 */
const toggleSliceNavigation = () => {
  // Solo permitir toggle si zoom y medición están desactivados
  if (zoomActive.value || measureActive.value) {
    showProfessionalNotification(
      '⚠️ Navegación de slices bloqueada',
      'Desactiva zoom o medición para usar navegación con scroll',
      'warning'
    )
    return
  }

  sliceNavigationActive.value = !sliceNavigationActive.value

  if (sliceNavigationActive.value) {
    showProfessionalNotification(
      '↕️ Navegación de slices activada',
      'Usa la rueda del mouse para cambiar entre slices',
      'success'
    )
    console.log('↕️ Navegación de slices ACTIVADA - Scroll para cambiar slices')
  } else {
    showProfessionalNotification(
      '⏸️ Navegación de slices desactivada',
      'Scroll del mouse disponible para otras funciones',
      'info'
    )
    console.log('⏸️ Navegación de slices DESACTIVADA')
  }
}

/**
 * Selecciona una vista específica del cerebro en el sidebar
 * Activa la vista seleccionada y desactiva las demás
 * Inicia renderizado 3D si se selecciona vista 3D
 * @param {number} index - Índice de la vista a seleccionar
 */
const selectBrainView = (index) => {
  brainViews.value.forEach(view => view.active = false)
  brainViews.value[index].active = true

  const selectedView = brainViews.value[index]
  console.log(`Vista del cerebro seleccionada: ${selectedView.label}`)

  // Si se selecciona vista 3D, manejar inicialización con validaciones
  if (selectedView.type === '3d') {
    if (!volumeData) {
      console.warn('⚠️ No hay datos volumétricos para renderizado 3D');
      // Revertir selección
      brainViews.value[index].active = false;
      const fallbackIndex = brainViews.value.findIndex(v => v.type === 'axial');
      if (fallbackIndex >= 0) {
        brainViews.value[fallbackIndex].active = true;
      }
      return;
    }

    // Verificar si ya está en vista 3D
    if (mainView.value === '3d' && renderer && scene && camera) {
      console.log('✅ Ya en vista 3D, no es necesario reinicializar');
      return;
    }

    console.log('🎯 Iniciando renderizado 3D...')

    // Usar nextTick para asegurar que el DOM esté actualizado
    nextTick(() => {
      // Esperar un frame adicional para asegurar que el canvas esté listo
      requestAnimationFrame(async () => {
        try {
          const success = await initThree();
          if (success) {
            create3DVolumeFromExistingData();
            // Actualizar mainView solo si la inicialización fue exitosa
            mainView.value = selectedView.type;
          } else {
            console.error('❌ Inicialización 3D falló, manteniendo vista anterior');
            // Revertir selección
            brainViews.value[index].active = false;
            // Buscar vista activa anterior o usar axial por defecto
            const fallbackIndex = brainViews.value.findIndex(v => v.type === 'axial');
            if (fallbackIndex >= 0) {
              brainViews.value[fallbackIndex].active = true;
            }
          }
        } catch (error) {
          console.error('❌ Error inesperado en inicialización 3D:', error);
          // Manejar error igual que el caso anterior
          brainViews.value[index].active = false;
          const fallbackIndex = brainViews.value.findIndex(v => v.type === 'axial');
          if (fallbackIndex >= 0) {
            brainViews.value[fallbackIndex].active = true;
          }
        }
      });
    });
  } else {
    // Para vistas 2D, actualizar inmediatamente con validación de datos
    console.log(`🎯 Cambiando a vista 2D: ${selectedView.type}`)

    // Verificar que hay datos volumétricos antes de cambiar vista
    if (!volumeData) {
      console.warn('⚠️ No hay datos volumétricos para vista 2D');
      showProfessionalNotification(
        '⚠️ Sin datos médicos',
        'Carga una imagen médica antes de cambiar de vista',
        'warning'
      );
      return;
    }

    // Cambiar la vista principal
    mainView.value = selectedView.type;

    // 🔧 SOLUCIÓN: Forzar actualización inmediata del canvas principal
    nextTick(() => {
      console.log(`✅ Forzando actualización de vista ${selectedView.type}`);

      // Limpiar canvas principal antes de redibujar
      if (canvasMain.value) {
        const ctx = canvasMain.value.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height);
        }
      }

      // Forzar redibujado inmediato
      updateDisplay();

      // 🎯 Verificación adicional: Asegurar que la vista se dibujó correctamente
      setTimeout(() => {
        if (canvasMain.value) {
          const ctx = canvasMain.value.getContext('2d');
          const imageData = ctx.getImageData(0, 0, canvasMain.value.width, canvasMain.value.height);
          const hasContent = Array.from(imageData.data).some(pixel => pixel > 0);

          if (!hasContent) {
            console.warn('⚠️ Canvas principal parece estar vacío, forzando redibujado adicional');
            drawMainView();
          } else {
            console.log(`✅ Vista ${selectedView.type} cargada correctamente`);
          }
        }
      }, 100);
    });
  }
}

/**
 * Cambia entre pestañas en la interfaz
 * @param {number} tabIndex - Índice de la pestaña a activar
 */
const switchTab = (tabIndex) => {
  console.log(`🔄 Cambiando de pestaña ${activeTab.value} a ${tabIndex}`)
  activeTab.value = tabIndex
  console.log(`Cambiado a pestaña: ${tabs.value[tabIndex].title}`)

  // Forzar redibujado cuando cambies a la pestaña principal (0)
  if (tabIndex === 0) {
    console.log('🎯 Cambiando a pestaña principal - forzando redibujado')
    nextTick(() => {
      updateDisplay()

      // 🔧 NUEVO: Recarga automática adicional para asegurar carga
      if (volumeData) {
        autoReloadWithDelay('tab-change-main', 150)
      }
    })
  }

  // Forzar dibujado de vista doble cuando cambies a la pestaña 2
if (tabIndex === 2) {
  console.log('Cambiando a pestaña doble vista')

  nextTick(() => {
    if (canvasDoubleOriginal.value) {
      drawDoubleOriginalView()
    }

    // Nuevo: Redibujar diagnóstico en doble vista
    if (canvasDoubleDiagnosis.value && segmentedImageData.value) {
      setTimeout(() => drawDoubleDiagnosisView(), 100)
    } else if (segmentedImageData.value) {
      // El canvas puede no estar montado aún, reintentar
      setTimeout(() => {
        if (canvasDoubleDiagnosis.value) {
          drawDoubleDiagnosisView()
        }
      }, 300)
    }

    if (volumeData) {
      autoReloadWithDelay('tab-change-double', 150)
    }
  })
}
}

/**
 * Maneja la carga de imágenes médicas
 * Solo permite abrir el modal si la carga está habilitada
 */
const uploadImage = () => {
  // Solo permite abrir el modal si canUploadImage es true
  if (!canUploadImage.value) {
    return; // No hace nada si ya hay un archivo cargado
  }
  handleDemoUpload()
  // Abrir modal para mostrar información del archivo y datos del paciente
}

// const handleFileUpload = (event) => {
//   const files = Array.from(event.target.files)
//   if (files.length > 0) {
//     const file = files[0] // Solo tomar el primer archivo

//     // Crear objeto de archivo con datos reales
//     const fileData = {
//       name: file.name,
//       size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
//       type: "DICOM",
//       status: "completed",
//       uploadDate: new Date().toLocaleString(),
//       preview: "🧠"
//     }

//     simulateFileUpload(fileData)
//   }
// }

/**
 * Inicia el análisis de inteligencia artificial de las imágenes médicas
 * Simula un proceso de análisis que toma 3 segundos
 */
const startAIAnalysis = () => {
  aiAnalysisComplete.value = false
  console.log('Iniciando análisis IA...')

  setTimeout(() => {
    aiAnalysisComplete.value = true
    console.log('Análisis IA completado')
  }, 3000)
}

/**
 * Activa el editor de diagnóstico y coloca el foco en el textarea
 * Permite edición directa del diagnóstico médico
 */
const activateDiagnosisEditor = () => {
  if (!diagnosisEditorActive.value) {
    diagnosisEditorActive.value = true
    nextTick(() => {
      if (diagnosisTextarea.value) {
        diagnosisTextarea.value.focus()
      }
    })
  }
}

/**
 * Desactiva el editor de diagnóstico
 * Vuelve al modo de solo lectura
 */
const deactivateDiagnosisEditor = () => {
  diagnosisEditorActive.value = false
}

// Función para cerrar menús al hacer clic fuera
const handleClickOutside = (event) => {
  const userIcon = document.querySelector('.user-icon')
  if (userIcon && !userIcon.contains(event.target)) {
    userMenuActive.value = false
  }

  // Cerrar menú de mediciones si se hace clic fuera
  const measurementMenu = document.querySelector('.measurement-menu')
  if (measurementMenu && !measurementMenu.contains(event.target)) {
    showMeasurementMenu.value = false
  }
}

// Variable para rastrear el estado de pantalla completa
const isFullscreenActive = ref(false)

// Función para alternar pantalla completa programáticamente
const toggleProgrammaticFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      // Entrar en pantalla completa
      await document.documentElement.requestFullscreen()
      console.log('✅ Entrando en pantalla completa programáticamente')
    } else {
      // Salir de pantalla completa
      await document.exitFullscreen()
      console.log('✅ Saliendo de pantalla completa programáticamente')
    }
  } catch (error) {
    console.error('❌ Error al alternar pantalla completa:', error)
  }
}

// Función para manejar teclas de acceso rápido
const handleKeyPress = (event) => {
  // Solo procesar si no estamos escribiendo en un input
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return
  }

  // Tecla F11 para pantalla completa programática
  if (event.key === 'F11') {
    event.preventDefault() // Prevenir el comportamiento nativo de F11
    toggleProgrammaticFullscreen()
    console.log('⌨️ F11 detectado - alternando pantalla completa programáticamente')
    return
  }

  // Tecla ESC para salir de pantalla completa si está activa
  if (event.key === 'Escape') {
    if (document.fullscreenElement) {
      event.preventDefault() // Prevenir comportamiento por defecto
      toggleProgrammaticFullscreen() // Salir de fullscreen
      console.log('⌨️ ESC detectado - saliendo de pantalla completa')
      return
    }
    // Si no estamos en fullscreen, ESC puede usarse para otras cosas (zoom, medición, etc.)
  }

  // Tecla F1 para maximizar/restaurar el visor
  if (event.key === 'F1') {
    event.preventDefault() // Evitar comportamiento por defecto del navegador (ayuda)
    toggleCenterExpansion()
    console.log('⌨️ Modo maximizado alternado con tecla F1')

    showProfessionalNotification(
      allCollapsed.value ? '🖼️ Vista Maximizada' : '📐 Vista Restaurada',
      'Presiona F1 para alternar entre modo maximizado y normal',
      'info'
    )
    return
  }

  // Tecla R para reset de zoom
  if (event.key === 'r' || event.key === 'R') {
    if (zoomActive.value && zoomLevel.value !== 1) {
      resetZoom()
      console.log('⌨️ Reset zoom activado con tecla R')
    }
  }

  // Tecla C para alternar crosshairs
  if (event.key === 'c' || event.key === 'C') {
    toggleCrosshairs()
    console.log('⌨️ Crosshairs alternados con tecla C')
  }
}

// ================================
// FUNCIONES DE REDIMENSIONAMIENTO DEL CANVAS DOBLE
// ================================

function resizeDoubleCanvas() {
  if (!canvasDoubleOriginal.value) return

  const container = canvasDoubleOriginal.value.parentElement
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const newWidth = Math.floor(containerRect.width)
  const newHeight = Math.floor(containerRect.height)

  if (newWidth > 0 && newHeight > 0) {
    canvasDoubleOriginal.value.width = newWidth
    canvasDoubleOriginal.value.height = newHeight

    console.log('📏 Canvas doble redimensionado:', newWidth, 'x', newHeight)

    // Redibujar después del redimensionamiento
    nextTick(() => {
      drawDoubleOriginalView()
    })
  }
}

function initDoubleCanvasResize() {
  if (!canvasDoubleOriginal.value) return

  // Redimensionar inmediatamente
  resizeDoubleCanvas()

  // Agregar listener para redimensionamiento de ventana
  const resizeObserver = new ResizeObserver(() => {
    resizeDoubleCanvas()
  })

  if (canvasDoubleOriginal.value.parentElement) {
    resizeObserver.observe(canvasDoubleOriginal.value.parentElement)
  }

  console.log('🔧 Sistema de redimensionamiento del canvas doble inicializado')
}

// La función handleFullscreenChange está definida anteriormente
if (!document.fullscreenElement) {
  // Salimos de pantalla completa
  console.log('🔲 Saliendo de pantalla completa')

  showProfessionalNotification(
    '📐 Pantalla Completa Desactivada',
    'Modo maximizado mantenido. Presiona F1 si deseas restaurar la vista normal',
    'info'
  )
} else {
  // Entramos en pantalla completa
  console.log('🔲 Entrando en pantalla completa')
  console.log('🚨 DEBUG: Estado antes de activar:', { allCollapsed: allCollapsed.value })

  isFullscreenActive.value = true

  // Activar modo maximizado automáticamente cuando se entra en pantalla completa
  if (!allCollapsed.value) {
    console.log('🔲 Activando modo maximizado automáticamente')
    console.log('🚨 DEBUG: Llamando toggleCenterExpansion...')

    try {
      toggleCenterExpansion()
      console.log('🚨 DEBUG: toggleCenterExpansion ejecutado exitosamente')
      console.log('🚨 DEBUG: Estado después de activar:', { allCollapsed: allCollapsed.value })

      showProfessionalNotification(
        '🔲 Pantalla Completa Activada',
        'Modo maximizado activado automáticamente. Presiona F11 o Esc para salir',
        'success'
      )
    } catch (error) {
      console.error('🚨 ERROR en toggleCenterExpansion:', error)
    }
  } else {
    console.log('🚨 DEBUG: Ya está maximizado, no es necesario activar')
    // Si ya estamos maximizados, solo mostrar notificación
    showProfessionalNotification(
      '🔲 Pantalla Completa Activada',
      'Ya estás en modo maximizado. Presiona F11 o Esc para salir',
      'info'
    )
  }
}

// Lifecycle hooks
onMounted(() => {
  console.log('🚀 DASHBOARD MOUNTED - Iniciando configuración de listeners')

  // Listeners básicos
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyPress)

  // Listeners de fullscreen con compatibilidad cross-browser
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)

  console.log('✅ Todos los listeners registrados correctamente')
  document.addEventListener('MSFullscreenChange', handleFullscreenChange) // IE/Edge

  console.log('🔲 Listeners de pantalla completa registrados')
  console.log('🔲 Estado inicial allCollapsed:', allCollapsed.value)
  console.log('Panel de diagnóstico cargado correctamente')
  console.log('Vistas del cerebro disponibles:', brainViews.value.map(v => v.label))
  console.log('Pestañas disponibles:', tabs.value.map(t => t.title))

  // Verificar y migrar mediciones existentes
  checkAndMigrateMeasurements()

  // Inicializar sistema de canvas responsivo
  initResponsiveCanvas()

  // Inicializar monitoreo de scroll para controles 3D
  initScrollMonitoring()

  // 🔧 NUEVO: Inicializar sistema de recarga automática
  initAutoReloadSystem()

  // Mostrar notificación de optimización
  setTimeout(() => {
    showProfessionalNotification(
      '📊 Layout Optimizado',
      'El sistema de 4 vistas ha sido optimizado para utilizar mejor el espacio disponible con canvas de 290x230px',
      'success'
    )
  }, 1000)

  // Mostrar notificación de optimizaciones 3D
  setTimeout(() => {
    showProfessionalNotification(
      '🚀 Renderizado 3D Optimizado',
      'Se han aplicado optimizaciones de shader, LOD adaptativo y control de framerate para mejor rendimiento',
      'info'
    )
  }, 2500)

  // Mostrar notificación de nueva interfaz 3D
  setTimeout(() => {
    showProfessionalNotification(
      '🎛️ Nueva Interfaz 3D',
      'Los controles 3D ahora aparecen en la parte inferior cuando se activa la vista 3D, optimizando el espacio',
      'success'
    )
  }, 4000)

  // Mostrar notificación del sistema de mediciones mejorado
  setTimeout(() => {
    showProfessionalNotification(
      '📏 Sistema de Mediciones Mejorado',
      'Las mediciones ahora usan coordenadas relativas y se adaptan automáticamente al cambio de tamaño del área de visualización',
      'success'
    )
  }, 5500)

  // Configurar observer para detectar cuando el canvas principal se vuelve visible
  nextTick(() => {
    const setupCanvasObserver = () => {
      if (canvasMain.value) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0) {
              console.log('🎯 Canvas principal visible, verificando si necesita redibujado...')
              // Solo redibujar si tenemos datos y no estamos en modo 4 vistas
              if (volumeData && !quadViewActive.value) {
                setTimeout(() => {
                  console.log('🔄 Forzando redibujado por visibilidad del canvas')
                  updateDisplay()
                }, 100)
              }
            }
          })
        }, { threshold: 0.1 })

        observer.observe(canvasMain.value)

        // Cleanup del observer cuando el componente se desmonte
        // El cleanup se maneja en onUnmounted del componente principal
      } else {
        // Reintentar si el canvas no está disponible aún
        setTimeout(setupCanvasObserver, 100)
      }
    }

    setupCanvasObserver()

    // Inicializar vista doble si el canvas está disponible
    setTimeout(() => {
      if (canvasDoubleOriginal.value) {
        console.log('🔧 Inicializando vista doble en onMounted')
        initDoubleCanvasResize() // Inicializar redimensionamiento automático
        drawDoubleOriginalView()
      }
    }, 300)
  })

  // Exponer funciones de debugging globalmente
  if (typeof window !== 'undefined') {
    window.repairQuadViews = repairQuadViews
    window.diagnoseQuadViews = diagnoseQuadViews
    window.testQuadViews = testQuadViews
    window.debugState = debugState
    window.debugImageLoadingState = debugImageLoadingState
    window.forceReloadCurrentView = forceReloadCurrentView
    window.toggleAutoReload = toggleAutoReload

    // Debugging específico para corrección de brillo en modo 4 vistas
    window.testQuadViewBrightness = () => {
      if (!quadViewActive.value) {
        console.log('🔧 Activando modo 4 vistas para probar corrección de brillo...')
        quadViewActive.value = true
        nextTick(() => {
          console.log('🔧 Modo 4 vistas activado, redibujando vistas con corrección de brillo...')
          redrawQuadViews()
        })
      } else {
        console.log('🔧 Redibujando vistas 4 con corrección de brillo aplicada...')
        redrawQuadViews()
      }
    }

    // Función para ajustar dinámicamente el nivel de brillo en modo 4 vistas
    window.adjustQuadViewBrightness = (factor = 0.6) => {
      console.log(`🔧 Ajustando brillo de modo 4 vistas a factor: ${factor}`)
      // Esto requeriría modificar el código para usar una variable global
      // Por ahora, simplemente informa qué factor usar en el código
      console.log(`💡 Para cambiar permanentemente, modifica el valor 0.6 por ${factor} en las funciones de renderizado`)
      if (quadViewActive.value) {
        redrawQuadViews()
      }
    }

    console.log('🔧 Funciones de debugging disponibles:')
    console.log('  - window.repairQuadViews() - Repara problemas de 4 vistas')
    console.log('  - window.diagnoseQuadViews() - Diagnostica estado de 4 vistas')
    console.log('  - window.testQuadViews() - Test rápido de 4 vistas')
    console.log('  - window.testQuadViewBrightness() - Probar corrección de brillo específica para modo 4 vistas')
    console.log('  - window.adjustQuadViewBrightness(factor) - Ajustar brillo modo 4 vistas (ej: 0.5=muy oscuro, 0.8=claro)')
    console.log('  - window.debugState() - Muestra estado general')
    console.log('  - window.debugImageLoadingState() - Diagnóstico completo de carga de imágenes')
    console.log('  - window.forceReloadCurrentView() - Fuerza recarga manual (solo para debugging)')
    console.log('  - window.toggleAutoReload() - Alternar sistema de recarga automática')
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyPress) // Remover listener de teclado

  // Remover listeners de pantalla completa
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange)

  // Remover listener de evento personalizado F11
  window.removeEventListener('activateMaximized', handleActivateMaximized)
  console.log('🧹 Listener de evento personalizado F11 removido')

  // 🚀 OPTIMIZACIÓN CRÍTICA: Limpiar sistemas de renderizado
  renderDebounce.cancelAll()
  canvasPool.clearPool()
  logger.critical('🧹 Sistemas de renderizado y canvas limpiados en onUnmounted')

  // 🔧 NUEVO: Limpiar sistema de recarga automática
  autoReloadTimers.forEach(timer => clearTimeout(timer))
  autoReloadTimers.clear()
  console.log('🧹 Sistema de recarga automática limpiado')

  // Cleanup completo de recursos 3D
  cleanup3DResources();
})

// Funciones de desarrollo/debug
const debugState = () => {
  console.log('🔍 Estado actual del componente:')
  console.log('  Pestaña activa:', activeTab.value)
  console.log('  Modalidad seleccionada:', selectedModality.value)
  console.log('  Archivos cargados:', uploadedFiles.value.length)
  console.log('  IA completada:', aiAnalysisComplete.value)
  console.log('  Modal activo:', showModal.value)
  console.log('  Paso actual:', currentStep.value)
}

/**
 * 🔧 NUEVA FUNCIÓN: Diagnóstico completo del estado de carga de imágenes
 * Útil para debugging cuando las vistas no se cargan correctamente
 */
const debugImageLoadingState = () => {
  console.log('🔍 === DIAGNÓSTICO COMPLETO DE CARGA DE IMÁGENES ===')

  // Estado de datos volumétricos
  console.log('📊 Datos volumétricos:')
  console.log('  - volumeData disponible:', !!volumeData)
  console.log('  - Dimensiones:', volumeData ? `${width}x${height}x${depth}` : 'N/A')
  console.log('  - Rango de datos:', volumeData ? `${originalDataMin} - ${originalDataMax}` : 'N/A')
  console.log('  - volumeLoaded:', volumeLoaded.value)

  // Estado de modalidades
  console.log('📁 Modalidades:')
  console.log('  - currentModality:', currentModality.value)
  console.log('  - selectedModality:', selectedModality.value)
  console.log('  - Modalidades disponibles:', Object.keys(caseFiles).filter(k => k !== 'caseName' && caseFiles[k]))

  // Estado de vistas
  console.log('👁️ Estado de vistas:')
  console.log('  - mainView actual:', mainView.value)
  console.log('  - Vista 3D activa:', mainView.value === '3d')
  console.log('  - Quad view activo:', quadViewActive.value)
  console.log('  - Pestaña activa:', activeTab.value)

  // Estado de canvas
  console.log('🖼️ Estado de canvas:')
  console.log('  - canvasMain disponible:', !!canvasMain.value)
  if (canvasMain.value) {
    console.log('    - Dimensiones:', `${canvasMain.value.width}x${canvasMain.value.height}`)

    // Verificar si tiene contenido
    const ctx = canvasMain.value.getContext('2d')
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, Math.min(100, canvasMain.value.width), Math.min(100, canvasMain.value.height))
      const hasContent = Array.from(imageData.data).some(pixel => pixel > 0)
      console.log('    - Tiene contenido visual:', hasContent)
    }
  }

  // Estado de slices
  console.log('📏 Estado de slices:')
  console.log('  - currentSlices:', currentSlices)
  console.log('  - Límites válidos:')
  console.log('    - Axial: 0 -', depth - 1)
  console.log('    - Coronal: 0 -', height - 1)
  console.log('    - Sagital: 0 -', width - 1)

  // Configuración de window/level
  console.log('🎚️ Window/Level:')
  console.log('  - windowLevel:', windowLevel)
  console.log('  - hasProblematicData:', hasProblematicData.value)

  // Estado de brainViews
  console.log('🧠 Brain Views:')
  brainViews.value.forEach((view, index) => {
    console.log(`  - ${index}: ${view.label} (${view.type}) - Activo: ${view.active}`)
  })

  // Recomendaciones
  console.log('💡 Recomendaciones:')
  if (!volumeData) {
    console.log('  ❌ CRÍTICO: No hay datos volumétricos - cargar imagen médica')
  }
  if (canvasMain.value && canvasMain.value.width === 0) {
    console.log('  ⚠️ Canvas principal tiene dimensiones inválidas')
  }
  if (currentSlices.axial >= depth) {
    console.log('  ⚠️ Slice axial fuera de rango')
  }
  if (currentSlices.coronal >= height) {
    console.log('  ⚠️ Slice coronal fuera de rango')
  }
  if (currentSlices.sagittal >= width) {
    console.log('  ⚠️ Slice sagital fuera de rango')
  }

  console.log('🔍 === FIN DIAGNÓSTICO ===')
}

/**
 * 🔧 NUEVA FUNCIÓN: Forzar recarga completa de la vista actual
 * Útil cuando las imágenes no se cargan correctamente
 */
const forceReloadCurrentView = () => {
  console.log('🔄 Forzando recarga completa de la vista actual...')

  if (!volumeData) {
    console.error('❌ No se puede recargar: no hay datos volumétricos')
    showProfessionalNotification(
      '❌ Error de recarga',
      'No hay datos volumétricos para recargar',
      'error'
    )
    return
  }

  const currentView = mainView.value
  console.log(`🎯 Recargando vista: ${currentView}`)

  // Limpiar canvas principal
  if (canvasMain.value) {
    const ctx = canvasMain.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height)
      console.log('🧹 Canvas principal limpiado')
    }
  }

  // Forzar redibujado múltiple para asegurar que se cargue
  const attemptRedraw = (attempt = 1, maxAttempts = 3) => {
    console.log(`🎯 Intento de redibujado ${attempt}/${maxAttempts}`)

    updateDisplay()

    // Verificar si se dibujó correctamente
    setTimeout(() => {
      if (canvasMain.value) {
        const ctx = canvasMain.value.getContext('2d')
        const imageData = ctx.getImageData(0, 0, canvasMain.value.width, canvasMain.value.height)
        const hasContent = Array.from(imageData.data).some(pixel => pixel > 0)

        if (!hasContent && attempt < maxAttempts) {
          console.warn(`⚠️ Intento ${attempt} falló, reintentando...`)
          attemptRedraw(attempt + 1, maxAttempts)
        } else if (hasContent) {
          console.log(`✅ Vista ${currentView} recargada exitosamente en intento ${attempt}`)
          showProfessionalNotification(
            '✅ Vista recargada',
            `Vista ${currentView} cargada correctamente`,
            'success'
          )
        } else {
          console.error(`❌ No se pudo recargar la vista después de ${maxAttempts} intentos`)
          showProfessionalNotification(
            '❌ Error de recarga',
            'No se pudo cargar la vista. Verifica los datos médicos.',
            'error'
          )
        }
      }
    }, 100 * attempt) // Aumentar delay en cada intento
  }

  attemptRedraw()
}

/**
 * 🔧 NUEVA FUNCIÓN: Controlar sistema de recarga automática
 */
let autoReloadEnabled = true

const toggleAutoReload = () => {
  autoReloadEnabled = !autoReloadEnabled

  if (autoReloadEnabled) {
    console.log('✅ Sistema de recarga automática ACTIVADO')
    showProfessionalNotification(
      '✅ Auto-recarga activada',
      'Las vistas se recargarán automáticamente',
      'success'
    )
  } else {
    console.log('⚠️ Sistema de recarga automática DESACTIVADO')
    showProfessionalNotification(
      '⚠️ Auto-recarga desactivada',
      'Solo recarga manual disponible',
      'warning'
    )
  }
}

// Exportar funciones para uso en template
defineExpose({
  debugState,
  debugImageLoadingState,
  forceReloadCurrentView,
  toggleAutoReload,
  uploadedFiles,
  aiAnalysisComplete,
  showModal,
  currentStep
})
// Parte Uno Luis

import { applyOrientationCorrection, detectNiftiOrientation, getOrientationDisplayInfo } from '@/utils/niftiOrientation'
import JSZip from 'jszip'
import * as nifti from 'nifti-reader-js'
import pako from 'pako'

// ========================================
// SISTEMA DE RENDERING OPTIMIZADO CON DEBOUNCING
// ========================================

// Sistema de debouncing para evitar redibujados excesivos
const renderDebounce = {
  timers: new Map(),

  // Debounce específico para diferentes tipos de rendering
  debounceRender(key, callback, delay = 16) { // 60fps max por defecto
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }

    const timer = setTimeout(() => {
      callback()
      this.timers.delete(key)
      logger.performance(`🎬 Renderizado ${key} ejecutado tras debounce`)
    }, delay)

    this.timers.set(key, timer)
    logger.sample(`⏱️ Renderizado ${key} programado para ${delay}ms`, 0.1)
  },

  // Cancelar todos los timers pendientes
  cancelAll() {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    logger.debug('🚫 Todos los renders debounced cancelados')
  }
}

// ========================================
// SISTEMA DE GESTIÓN DE MEMORIA PARA CANVAS
// ========================================

// Pool de canvas para reutilización y evitar memory leaks
const canvasPool = {
  available: [],
  inUse: new Set(),

  getCanvas(width, height) {
    let canvas = this.available.find(c => c.width >= width && c.height >= height)

    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      logger.debug(`📝 Nuevo canvas creado: ${width}x${height}`)
    } else {
      this.available = this.available.filter(c => c !== canvas)
      canvas.width = width
      canvas.height = height
      logger.debug(`♻️ Canvas reutilizado: ${width}x${height}`)
    }

    this.inUse.add(canvas)
    return canvas
  },

  releaseCanvas(canvas) {
    if (this.inUse.has(canvas)) {
      this.inUse.delete(canvas)

      // Limpiar el canvas antes de reutilizar
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.resetTransform()

      // Limitar el pool a 5 canvas para evitar usar demasiada memoria
      if (this.available.length < 5) {
        this.available.push(canvas)
        logger.debug(`📦 Canvas agregado al pool (${this.available.length}/5)`)
      } else {
        // Liberar memoria del canvas excedente
        canvas.width = 0
        canvas.height = 0
        logger.debug(`🗑️ Canvas liberado de memoria`)
      }
    }
  },

  clearPool() {
    // Limpiar todos los canvas del pool
    [...this.available, ...this.inUse].forEach(canvas => {
      canvas.width = 0
      canvas.height = 0
    })
    this.available = []
    this.inUse.clear()
    logger.debug(`🧹 Pool de canvas completamente limpiado`)
  }
}

// ========================================
// SISTEMA DE LOGGING OPTIMIZADO PARA RENDIMIENTO
// ========================================
const IS_DEVELOPMENT = import.meta.env.DEV
const IS_DEBUG = IS_DEVELOPMENT && true // Cambiar a false para desactivar logs en desarrollo

// Sistema de logging condicional para evitar impacto en rendimiento
const logger = {
  log: IS_DEBUG ? console.log.bind(console) : () => { },
  warn: IS_DEBUG ? console.warn.bind(console) : () => { },
  error: console.error.bind(console), // Siempre mantener errores
  debug: IS_DEBUG ? console.log.bind(console, '[DEBUG]') : () => { },
  performance: IS_DEBUG ? console.log.bind(console, '[PERF]') : () => { },

  // Logging específico para funciones críticas
  critical: console.log.bind(console, '[CRITICAL]'),

  // Logging con sampling para bucles pesados
  sample: (message, sampleRate = 0.001) => {
    if (IS_DEBUG && Math.random() < sampleRate) {
      console.log(`[SAMPLE] ${message}`)
    }
  }
}

const mainView = ref('axial')
const canvasMain = ref(null)
const canvasDoubleOriginal = ref(null) // Canvas para vista doble original
const threeCanvas = ref(null) // Canvas para renderizado 3D
const canvasAxial = ref(null)
const canvasCoronal = ref(null)
const canvasSagittal = ref(null)
// ✅ ELIMINADO: canvasMainQuad - En modo 4 vistas, el cuadrante inferior derecho usa canvas3DRef directamente
// Canvas para vista 3D en modo 4 vistas - Ahora usando composable
// const canvas3DQuad = ref(null) // Reemplazado por fourViews3DCanvas del composable


const error = ref('')
const volumeLoaded = ref(false)
const zoomLevel = ref(1)
const zoomOrigin = ref({ x: 0, y: 0 }) // Punto focal del zoom
const zoomTranslate = ref({ x: 0, y: 0 }) // Desplazamiento acumulado del zoom
const currentModality = ref('t1n')
const showSegmentation = ref(false)
const hasMeasures = ref(false)
const zoomMode = ref(null)


const caseFiles = reactive({
  t1n: null,
  t1c: null,
  t2f: null,
  t2w: null,
  seg: null,
  caseName: ''
})

/**
 * Restablece el zoom a su nivel original (1:1)
 * Se puede activar con doble clic en el canvas, botón de reset, o tecla R
 */
function resetZoom() {
  if (zoomLevel.value !== 1) {
    const previousZoom = zoomLevel.value
    zoomLevel.value = 1

    // Resetear también las variables de translación del zoom focal
    zoomTranslate.value.x = 0
    zoomTranslate.value.y = 0
    zoomOrigin.value.x = 0
    zoomOrigin.value.y = 0

    // Limpiar completamente el canvas antes de redibujar
    if (canvasMain.value) {
      const ctx = canvasMain.value.getContext('2d')
      ctx.resetTransform() // Resetear todas las transformaciones
      ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height)
    }

    // Forzar redibujado completo
    updateDisplay()

    // Feedback visual mejorado
    console.log(`🔄 Zoom focal restablecido: ${(previousZoom * 100).toFixed(0)}% → 100%`)

    // Mostrar notificación temporal en pantalla
    showZoomResetNotification()
  } else {
    console.log('ℹ️ Zoom ya está en 100%')
  }
}

// Función para mostrar notificación visual de reset
function showZoomResetNotification() {
  // Crear elemento de notificación temporal
  const notification = document.createElement('div')
  notification.textContent = '🔄 Zoom restablecido a 100%'
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    pointer-events: none;
    animation: fadeInOut 1.5s ease-in-out;
  `

  // Agregar CSS de animación
  if (!document.querySelector('#zoom-notification-style')) {
    const style = document.createElement('style')
    style.id = 'zoom-notification-style'
    style.textContent = `
      @keyframes fadeInOut {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }

  document.body.appendChild(notification)

  // Remover después de la animación
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
  }, 1500)
}

// Variable para rastrear si el archivo actual tiene problemas conocidos
const hasProblematicData = ref(false)

// Variables para información de orientación automática
const currentOrientation = ref({
  orientation: 'UNKNOWN',
  needsCorrection: false,
  method: 'fallback',
  confidence: 'low',
  displayInfo: null
})

const measureMode = ref(false)
const measuredDistance = ref(null)
const measuredDistanceMm = ref(null)

const physicalMeasures = ref({
  pixDims: [],
  units: ''
})

const measurements = ref([]) // [{view, slice, points: [{x, y}, {x, y}], distancePx, distanceMm}]
const currentMeasurement = ref({ view: null, slice: null, points: [] })

// Propiedades computadas para mediciones
const hasCurrentViewMeasurements = computed(() => {
  const currentView = mainView.value
  const currentSlice = getCurrentSliceForMainView()
  return measurements.value.some(m => m.view === currentView && m.slice === currentSlice)
})

// Estado del menú de opciones de mediciones
const showMeasurementMenu = ref(false)

// Variable para controlar el estado del arrastre de slice
const draggingSlice = ref(null)
const lastY = ref(0)

// Variables de zoom para las 4 vistas
const quadZoomLevels = reactive({
  axial: 1,
  coronal: 1,
  sagittal: 1,
  main: 1,
  threeD: 1  // Nivel de zoom para vista 3D
})

const quadZoomOrigins = reactive({
  axial: { x: 0, y: 0 },
  coronal: { x: 0, y: 0 },
  sagittal: { x: 0, y: 0 },
  main: { x: 0, y: 0 },
  threeD: { x: 0, y: 0 }  // Origen del zoom 3D
})

const quadZoomTranslates = reactive({
  axial: { x: 0, y: 0 },
  coronal: { x: 0, y: 0 },
  sagittal: { x: 0, y: 0 },
  main: { x: 0, y: 0 },
  threeD: { x: 0, y: 0 }  // Posición de traslación para vista 3D
})

// Variables para navegación de slices independiente en las 4 vistas
const quadViewDragging = reactive({
  axial: false,
  coronal: false,
  sagittal: false,
  main: false,
  threeD: false  // Estado de arrastre para vista 3D
})

const quadViewLastY = reactive({
  axial: 0,
  coronal: 0,
  sagittal: 0,
  main: 0,
  threeD: 0  // Posición Y del último mouse para vista 3D
})

// Variables específicas para controles 3D
// Variables movidas a la implementación de controles 3D
const quad3DRotation = reactive({ theta: 0, phi: Math.PI / 2 }) // Rotación específica para cuadrante 3D

// ========================================
// VARIABLES PARA RENDERIZADO 3D (complementarias)
// ========================================

// Algunas variables ya se declaran más arriba (renderer, scene, camera, controls, volumeMesh)
let volumeTexture = null
let animationId = null

// ========================================
// 🔧 SOLUCIÓN VISTA 3D EN 4 VISTAS - COMPOSABLE INDEPENDIENTE
// ========================================
console.log('🔧 Configurando sistema 3D independiente para 4 vistas...')

// Referencias para la vista 3D
const canvas3DRef = ref(null)

// Usar el composable para manejar la vista 3D de forma independiente
// Funciones de manejo 3D implementadas directamente en el componente
const initFourViews3D = async () => {
  console.log('🔍 initFourViews3D - verificando condiciones...')
  console.log('🔍 canvas3DRef.value:', !!canvas3DRef.value)
  console.log('🔍 volumeMesh:', !!volumeMesh)
  console.log('🔍 volumeTexture:', !!volumeTexture)
  console.log('🔍 scene:', !!scene)

  if (!canvas3DRef.value) {
    console.log('⚠️ Canvas 3D no está disponible aún')
    return
  }

  // Asegurar que el sistema 3D básico esté iniciado
  if (!scene || !camera || !renderer) {
    console.log('🔄 Sistema 3D básico no disponible, inicializando...')
    const success = await ensureThreeRenderer()
    if (!success) {
      console.error('❌ No se pudo inicializar el sistema 3D básico')
      return
    }
  }

  // Si no hay volumeMesh pero tenemos datos, intentar crearlo
  if (!volumeMesh && volumeTexture && scene) {
    console.log('🔄 Creando volumeMesh...')
    createVolumeMesh3D()
    // Esperar un poco para que se complete la creación
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('✅ Condiciones verificadas, procediendo con la inicialización...')
  // Crear la escena del cuadrante
  initQuadView3D()
}

const cleanupFourViews3D = () => {
  console.log('🧹 Limpiando sistema 3D de cuatro vistas...')

  // Limpiar renderer específico del cuadrante
  if (renderer3DQuad.value) {
    try {
      renderer3DQuad.value.dispose()
      console.log('✅ Renderer 3D cuadrante limpiado')
    } catch (err) {
      console.warn('⚠️ Error limpiando renderer 3D cuadrante:', err)
    }
    renderer3DQuad.value = null
  }

  // Limpiar referencias de escena y cámara del cuadrante
  scene3DQuad.value = null
  camera3DQuad.value = null

  // Limpiar mesh del cuadrante si existe
  if (volumeMeshQuad) {
    try {
      // Solo limpiar el material si es diferente del principal
      if (volumeMesh && volumeMeshQuad.material && volumeMeshQuad.material !== volumeMesh.material) {
        volumeMeshQuad.material.dispose()
      }
      volumeMeshQuad = null
      console.log('✅ Mesh de cuadrante limpiado')
    } catch (err) {
      console.warn('⚠️ Error limpiando mesh de cuadrante:', err)
    }
  }

  console.log('✅ Sistema 3D de cuatro vistas limpiado completamente')
}

const resizeThreeRenderer = (width, height) => {
  if (renderer3DQuad.value && camera3DQuad.value) {
    renderer3DQuad.value.setSize(width, height)
    camera3DQuad.value.aspect = width / height
    camera3DQuad.value.updateProjectionMatrix()
  }
}

const resizeFourViews3D = () => {
  if (canvas3DRef.value) {
    const { width, height } = canvas3DRef.value.getBoundingClientRect()
    resizeThreeRenderer(width, height)
  }
}

const forceSimulation3D = () => {
  if (renderer3DQuad.value && scene3DQuad.value && camera3DQuad.value) {
    // 🎯 Asegurar que los planos crosshairs estén visibles si están habilitados
    if (crosshairsEnabled.value && crosshairPlanes3D.axial && crosshairPlanes3D.coronal && crosshairPlanes3D.sagittal) {
      crosshairPlanes3D.axial.visible = true
      crosshairPlanes3D.coronal.visible = true
      crosshairPlanes3D.sagittal.visible = true
    }

    renderer3DQuad.value.render(scene3DQuad.value, camera3DQuad.value)
  }
}

console.log('✅ Composable 3D para 4 vistas configurado')
// ========================================

// ========================================
// VARIABLES PARA IA Y SEGMENTACIÓN 3D
// ========================================

// Texturas adicionales para IA
let segmentationTexture = null  // Textura de segmentación IA - DESHABILITADA
let enhancedVolumeTexture = null  // Volumen mejorado por IA
let aiVolumeData = null  // Datos del volumen procesado por IA
// let segmentationData = null  // Datos de segmentación IA - DESHABILITADA TEMPORALMENTE

// Estados de IA
const showIASegmentation3D = ref(false)  // Mostrar segmentación IA en 3D - DESHABILITADA
const useEnhancedVolume = ref(false)     // Usar volumen mejorado por IA
const aiSegmentationOpacity = ref(0.7)   // Opacidad de la segmentación IA - DESHABILITADA
const aiVolumeMixRatio = ref(0.5)        // Ratio de mezcla volumen original/IA
const autoFocusOnTumor = ref(false)      // Auto-centrar en tumor detectado - DESHABILITADA

// Configuración de colores para diferentes tipos de segmentación IA - DESHABILITADA
const aiSegmentationColors = ref({
  tumor: new THREE.Vector3(1.0, 0.2, 0.2),      // Rojo para tumor
  edema: new THREE.Vector3(1.0, 0.8, 0.0),      // Amarillo para edema
  necrosis: new THREE.Vector3(0.8, 0.0, 0.8),   // Magenta para necrosis
  enhancing: new THREE.Vector3(0.0, 1.0, 0.5),  // Verde claro para tumor realzado
  normal: new THREE.Vector3(0.5, 0.5, 0.5)      // Gris para tejido normal
})

// Estados de procesamiento IA
const aiProcessingStatus = ref({
  isProcessing: false,
  progress: 0,
  currentTask: '',
  error: null
})

// Información del análisis IA
const aiAnalysisResults = ref({
  tumorVolume: 0,
  tumorPosition: { x: 0, y: 0, z: 0 },
  confidence: 0,
  findings: [],
  processingTime: 0
})

// Parámetros de renderizado 3D optimizados
const opacity3D = ref(1.0)
const baseSteps = ref(256)
const threshold3D = ref(0.010)
const brightness3D = ref(1.70)
const contrast3D = ref(2.10)
const useAdaptiveLOD = ref(true)
const useTransferFunction = ref(false)

// Control de LOD dinámico mejorado
const maxSteps = ref(128)
const minSteps = ref(32)

// ===== SISTEMA AVANZADO DE STEPS ADAPTATIVOS BASADO EN ZOOM =====
const minStepsZoom = ref(128)  // Steps mínimos (zoom out / vista general)
const maxStepsZoom = ref(1024) // Steps máximos (zoom in / vista detallada)
const minZoomDistance = ref(0.5) // Distancia mínima de cámara (máximo zoom)
const maxZoomDistance = ref(10)  // Distancia máxima de cámara (mínimo zoom)
const zoomStepsEnabled = ref(true) // Habilitar ajuste dinámico por zoom
const smoothTransitionEnabled = ref(true) // Transiciones suaves de steps

// Variable para almacenar los steps actuales con suavizado
const currentSmoothedSteps = ref(256)

// Debounce para actualizaciones de shader
let shaderUpdateTimeout = null
const shaderUpdateDelay = 16 // ~60fps

// Control de framerate
let lastFrameTime = 0
const targetFrameTime = 16.67 // 60fps

// Colores para renderizado volumétrico - INICIALIZADOS CON ESCALA DE GRISES (Preset 1)
// Esto asegura que al crear volumeMesh use los colores correctos desde el inicio
const lowColor = ref(new THREE.Vector3(0, 0, 0))       // Negro (grayscale low)
const midColor = ref(new THREE.Vector3(0.5, 0.5, 0.5)) // Gris medio (grayscale mid)
const highColor = ref(new THREE.Vector3(1, 1, 1))      // Blanco (grayscale high)

// Presets de colores para diferentes tipos de visualización
const colorPresets = ref([
  {
    name: 'Médico Clásico',
    description: 'Azul → Verde → Rojo (estándar médico)',
    colors: { low: [0, 0, 1], mid: [0, 1, 0], high: [1, 0, 0] }
  },
  {
    name: 'Escala de Grises',
    description: 'Negro → Gris → Blanco',
    colors: { low: [0, 0, 0], mid: [0.5, 0.5, 0.5], high: [1, 1, 1] }
  },
  {
    name: 'Térmico',
    description: 'Negro → Rojo → Amarillo → Blanco',
    colors: { low: [0, 0, 0], mid: [1, 0, 0], high: [1, 1, 0] }
  },
  {
    name: 'Arcoíris',
    description: 'Violeta → Azul → Verde → Rojo',
    colors: { low: [0.5, 0, 1], mid: [0, 0.5, 1], high: [1, 0.5, 0] }
  },
  {
    name: 'Hueso',
    description: 'Optimizado para tejido óseo',
    colors: { low: [0, 0, 0.2], mid: [0.8, 0.8, 0.6], high: [1, 1, 1] }
  },
  {
    name: 'Contraste Alto',
    description: 'Magenta → Cyan → Amarillo',
    colors: { low: [1, 0, 1], mid: [0, 1, 1], high: [1, 1, 0] }
  }
])

// Por defecto usar 'Escala de Grises' para el primer render 3D
const selectedColorPreset = ref(1) // Índice del preset seleccionado (1 = Escala de Grises)
const showAdvancedControls = ref(false) // Mostrar/ocultar controles avanzados

// Controles de corte 3D - valores por defecto para mostrar todo el volumen
const clippingX = ref(1.0)
const clippingY = ref(1.0)
const clippingZ = ref(1.0)

// Performance monitoring 3D
const performanceInfo3D = ref({
  fps: 0,
  memoryMB: 0
})

let lastTime = 0
let frameCount = 0

// LOD adaptativo básico (computed sin efectos secundarios)
const adaptiveSteps = computed(() => {
  if (!useAdaptiveLOD.value || !camera || !volumeMesh) return baseSteps.value

  // Si el sistema de zoom está habilitado, usar los steps suavizados
  if (zoomStepsEnabled.value) {
    return Math.round(currentSmoothedSteps.value)
  }

  // Sistema original como fallback
  const distance = camera.position.distanceTo(volumeMesh.position)
  const baseLOD = baseSteps.value
  const factor = Math.max(0.3, Math.min(1.0, 2.0 / distance))
  return Math.floor(baseLOD * factor)
})

/**
 * Actualiza los steps adaptativos basado en el zoom/distancia de la cámara
 * Esta función se llama desde el loop de animación 3D
 */
function updateAdaptiveSteps() {
  if (!zoomStepsEnabled.value || !camera || !volumeMesh) return

  const distance = camera.position.distanceTo(volumeMesh.position)

  // Normalizar la distancia a un rango 0-1
  // 0 = máximo zoom (distancia mínima), 1 = mínimo zoom (distancia máxima)
  const normalizedDistance = Math.max(0, Math.min(1,
    (distance - minZoomDistance.value) / (maxZoomDistance.value - minZoomDistance.value)
  ))

  // Invertir para que menor distancia = más steps
  const zoomFactor = 1 - normalizedDistance

  // Interpolar entre minStepsZoom y maxStepsZoom
  const targetSteps = Math.round(
    minStepsZoom.value + zoomFactor * (maxStepsZoom.value - minStepsZoom.value)
  )

  // Aplicar suavizado para evitar saltos bruscos
  if (smoothTransitionEnabled.value) {
    const currentSteps = currentSmoothedSteps.value
    const stepDifference = targetSteps - currentSteps
    const smoothingFactor = 0.1 // Ajusta la velocidad de transición (0.1 = suave)

    currentSmoothedSteps.value = currentSteps + stepDifference * smoothingFactor

    // Log de debug para monitoreo (solo cambios significativos)
    if (Math.abs(stepDifference) > 10) {
      console.log(`🔍 Zoom Steps: dist=${distance.toFixed(2)}, factor=${zoomFactor.toFixed(2)}, target=${targetSteps}, current=${Math.round(currentSmoothedSteps.value)}`)
    }
  } else {
    currentSmoothedSteps.value = targetSteps
  }
}

// ========================================
// FIN VARIABLES 3D
// ========================================

/**
 * Maneja la carga de archivos médicos desde el input de archivos
 *
 * SOPORTE DE FORMATOS:
 * - Archivos NIfTI individuales (.nii, .nii.gz)
 * - Archivos DICOM (.dcm)
 * - Archivos ZIP conteniendo múltiples modalidades
 *
 * SOPORTE DE NOMBRES:
 * - Archivos con patrones BraTS estándar: -t1n, -t1c, -t2w, -t2f, -seg
 * - Archivos con patrones BraTS-GLI: _t1, _t1ce, _t2, _flair, _seg
 * - ✅ NUEVOS: Archivos con CUALQUIER NOMBRE (se cargan como modalidad T1N por defecto)
 *
 * EJEMPLOS DE NOMBRES ACEPTADOS:
 * - BraTS-GLI-00001-000-t1n.nii.gz (patrón estándar)
 * - paciente_t1.nii (patrón GLI)
 * - resonancia_cerebral.nii.gz (nombre libre - se carga como T1N)
 * - mi_imagen_medica.nii (nombre libre - se carga como T1N)
 *
 * @param {Event} event - Evento del input de archivos
 */

const imageFormat = ref('—')
const imageSize = ref('—')
const imageModality = ref('—')
const imageDimensions = ref('—')
const showPatientSection = ref(true);
const showUploadSection = ref(true);


//----FUNCIONES PARA DETECTAR PROPIEDADES DE LA IMAGEN---
//esta funcion devuelve la extension del archivo basado en el nombre, lo uso mandando getFileType(files[0].name) desde handleFileUpload
const getFileType = (fileName) => {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.dcm')) return 'DICOM'
  if (lowerName.endsWith('.nii') || lowerName.endsWith('.nii.gz')) return 'NIfTI'
  if (lowerName.endsWith('.zip')) return 'ZIP'
  return 'Unknown'
}
// Valida la extensión del archivo
const validateFileExtension = (fileName) => {
  const validExtensions = ['.dcm', '.nii', '.nii.gz', '.zip']
  const lowerFileName = fileName.toLowerCase()
  return validExtensions.some(ext => lowerFileName.endsWith(ext))
}
// esto es para cargar el info en los labels de las propiedades del archivo en el modal de carga
const chargueImageData = (format, size, modalities = [], dimensions = '—') => {
  imageFormat.value = format;
  imageSize.value = (size / (1024 * 1024)).toFixed(1) + " MB";
  imageModality.value = modalities.length > 0 ? modalities.join(', ').toUpperCase() : 'No detectada';
  imageDimensions.value = dimensions;
};

//esta funcion es para detectar la modalidad basado en el nombre del archivo, lo uso mandando detectModalityFromName(files[0].name) desde handleFileUpload
const detectModalityFromName = (fileName) => {
  const lower = fileName.toLowerCase();
  const modalities = [];

  if (lower.includes('-t1n')) modalities.push('T1N');
  if (lower.includes('-t1c')) modalities.push('T1C');
  if (lower.includes('-t2f')) modalities.push('T2F');
  if (lower.includes('-t2w')) modalities.push('T2W');
  if (lower.includes('-seg')) modalities.push('SEG');

  return modalities.length > 0 ? modalities.join('-') : 'GENÉRICA';
};
//esta funcion es para extraer las dimensiones, queria hacerlo con la otra funcion de extraccion pero se me complicaba sacar su logcia, asi que hay codigo redundante
async function extractImageDimensions(file) {
  try {
    const fileName = file.name.toLowerCase()
    // Caso 1: archivo ZIP con .nii o .nii.gz dentro
    if (fileName.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file)
      const niiFileName = Object.keys(zip.files).find(name =>
        name.endsWith('.nii') || name.endsWith('.nii.gz')
      )
      if (!niiFileName) throw new Error('No se encontró ningún archivo NIfTI dentro del ZIP.')
      const niiData = await zip.files[niiFileName].async('uint8array')
      return parseNiftiDimensions(niiData)
    }
    // Caso 2: archivo .nii.gz
    if (fileName.endsWith('.nii.gz')) {
      const arrayBuffer = await file.arrayBuffer()
      const decompressed = pako.inflate(new Uint8Array(arrayBuffer))
      return parseNiftiDimensions(decompressed)
    }
    // Caso 3: archivo .nii sin comprimir
    if (fileName.endsWith('.nii')) {
      const arrayBuffer = await file.arrayBuffer()
      return parseNiftiDimensions(new Uint8Array(arrayBuffer))
    }
    // Otros formatos no compatibles
    return '—'
  } catch (error) {
    console.error('Error al extraer dimensiones:', error)
    return '—'
  }
}

// Función auxiliar para leer dimensiones NIfTI
function parseNiftiDimensions(data) {
  const buffer = data instanceof ArrayBuffer ? data : data.buffer

  if (!nifti.isNIFTI(buffer)) throw new Error('Archivo no es un NIfTI válido.')
  const header = nifti.readHeader(buffer)
  const dims = header.dims.slice(1, 4) // [x, y, z]

  return `${dims[0]} × ${dims[1]} × ${dims[2]}`
}

const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files)
  error.value = ''
  volumeLoaded.value = false

  if (!files || files.length === 0) {
    error.value = 'No se seleccionaron archivos'
    return
  }

  console.log('=== INICIANDO CARGA DE ARCHIVOS ===')
  console.log('Estado del modal:', showModal.value)

  //verificar si ya existe alguna imagen antes de continuar ===
  for (let i = 0; i < files.length; i++) {
    const file = files[0];
    try {
      existingImage = await getImageByFilename(file.name, token);
      if (existingImage) {
        console.log(`La imagen "${file.name}" ya existe en el servidor. Descargando`);
        if (flagRepeatedArchiveMessage) {
          alert('Imagen ya subida con anterioridad, cargando');
        }
        flagRepeatedArchiveMessage = true;

        // Descargar la imagen por ID y reemplazar el archivo local
        const downloadedFile = await downloadImageById(existingImage.image.id, token, file.name);
        files[0] = downloadedFile; // con esto reeemplazo el file original por el descargado

        charguePatientAndImage = false;
        showPatientSection.value = false;
        showUploadSection.value = false;

        console.log(`✅ Imagen "${file.name}" reemplazada por la versión del servidor.`);
      } else {
        showPatientSection.value = true;
        showUploadSection.value = true;
        charguePatientAndImage = true;
      }
    } catch (err) {
      if (err.message.includes('404')) {
        console.log(`La imagen "${file.name}" no existe, continuando con la carga...`);
      } else {
        console.error('Error verificando/descargando imagen:', err);
        error.value = 'Error al verificar o descargar la imagen. Intenta nuevamente.';
        return;
      }
    }
  }



  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'DICOM': return '🏥'
      case 'NIfTI': return '🧠'
      case 'ZIP': return '📦'
      default: return '📄'
    }
  }

  for (const file of files) {
    if (!validateFileExtension(file.name)) {
      error.value = `Archivo no válido: ${file.name}. FORMATOS ACEPTADOS: • Archivos NIfTI: .nii, .nii.gz • Archivos DICOM: .dcm • Archivos ZIP: .zip (conteniendo NIfTI) NOMBRES DE ARCHIVO: • ✅ Cualquier nombre es válido para archivos .nii/.nii.gz • Ejemplos: resonancia.nii, mi_imagen.nii.gz, scan_001.nii • Patrones específicos BraTS también son reconocidos automáticamente`
      return
    }
  }

  // Si es para el modal (simulación), usar el método simple
  if (showModal.value) {
    console.log('=== MODO MODAL ACTIVO - SIMULANDO CARGA ===')
    if (files.length > 0) {
      const file = files[0]
      const fileType = getFileType(file.name)
      const fileData = {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
        type: fileType,
        status: "completed",
        uploadDate: new Date().toLocaleString(),
        preview: getFileIcon(fileType),
        realFile: file
      }
      simulateFileUpload(fileData)
      const dimensions = await extractImageDimensions(files[0]);
      chargueImageData(getFileType(files[0].name), files[0].size, [detectModalityFromName(files[0].name)], dimensions);
    }
    return
  }



  // A partir de aquí es donde la magia ocurre
  console.log('=== MODO PROCESAMIENTO REAL ACTIVADO ===')

  // 🗑️ LIMPIEZA DE FILTROS Y IMÁGENES ANTERIORES
  // Limpiar imágenes originales guardadas del archivo anterior
  console.log('🗑️ Limpiando imágenes originales y filtros del archivo anterior...')
  originalImagesByView.value = {}
  originalImageData.value = null

  // Resetear configuraciones de filtros a valores por defecto
  Object.keys(webWorkerSettings).forEach(filterType => {
    webWorkerSettings[filterType].enabled = false
  })
  webWorkerSettings.sharpening.strength = 1.0
  webWorkerSettings.sharpening.radius = 1.0
  webWorkerSettings.denoising.strength = 0.5
  webWorkerSettings.denoising.threshold = 10
  webWorkerSettings.edgeDetection.threshold = 100
  webWorkerSettings.edgeDetection.method = 'sobel'
  webWorkerSettings.medicalEnhancement.preset = 'brain'
  webWorkerSettings.medicalEnhancement.contrast = 1.2
  webWorkerSettings.medicalEnhancement.brightness = 0.1

  console.log('✅ Limpieza completada - nuevo archivo cargará sin filtros previos')

  try {
    // 💾 LÓGICA DE GUARDADO EN INDEXEDDB
    // Se guarda el archivo en IndexedDB antes de procesarlo.
    // Usamos el nombre del archivo y una fecha para crear un ID único.
    for (const file of files) {
      const uniqueId = `${file.name}-${Date.now()}`;
      await saveImage(uniqueId, file);
      console.log(`✅ Archivo ${file.name} guardado en IndexedDB con ID: ${uniqueId}`);
    }

    // 🎨 PROCESAMIENTO MÉDICO REAL (el resto de tu código, sin cambios)
    console.log('=== REINICIANDO ESTRUCTURA DE DATOS ===')
    Object.keys(caseFiles).forEach(key => {
      if (key !== 'caseName') caseFiles[key] = null
    })
    caseFiles.caseName = ''

    // Manejar archivos ZIP con la nueva lógica mejorada
    if (files[0].name.toLowerCase().endsWith('.zip')) {
      console.log('=== PROCESANDO ARCHIVO ZIP ===')
      await handleZipArchive(files[0])
      return
    }

    console.log('=== PROCESANDO ARCHIVOS INDIVIDUALES ===')
    // Procesar cada archivo individual (versión funcional original)
    for (const file of files) {
      const fileName = file.name.toLowerCase()
      console.log(`Procesando archivo: ${file.name}`)

      // Extraer nombre del caso
      const caseMatch = file.name.match(/(BraTS-GLI-\d{5}-\d{3})/i)
      if (caseMatch) {
        caseFiles.caseName = caseMatch[0]
        console.log(`Caso identificado: ${caseFiles.caseName}`)
      }

      // Identificar tipo de modalidad usando la lógica original funcional
      if (fileName.includes('-t1n.nii')) {
        console.log('Cargando modalidad T1N')
        await loadModalityFile(file, 't1n')
      } else if (fileName.includes('-t1c.nii')) {
        console.log('Cargando modalidad T1C')
        await loadModalityFile(file, 't1c')
      } else if (fileName.includes('-t2f.nii')) {
        console.log('Cargando modalidad T2F')
        await loadModalityFile(file, 't2f')
      } else if (fileName.includes('-t2w.nii')) {
        console.log('Cargando modalidad T2W')
        await loadModalityFile(file, 't2w')
      } else if (fileName.includes('-seg.nii')) {
        console.log('Cargando segmentación')
        await loadModalityFile(file, 'seg')
      } else {
        console.log('Archivo no reconocido como modalidad BraTS, intentando cargar como genérico')
        // Cargar archivo genérico como T1N por defecto
        console.log('Cargando archivo genérico como modalidad T1N:', file.name)
        await loadModalityFile(file, 't1n')
      }
    }

    console.log('=== VERIFICANDO ARCHIVOS CARGADOS ===')
    // Verificar que se cargaron archivos válidos (lógica original)
    const hasValidFiles = caseFiles.t1n || caseFiles.t1c || caseFiles.t2f || caseFiles.t2w
    console.log('Modalidades disponibles:', {
      t1n: !!caseFiles.t1n,
      t1c: !!caseFiles.t1c,
      t2f: !!caseFiles.t2f,
      t2w: !!caseFiles.t2w,
      seg: !!caseFiles.seg
    })

    if (!hasValidFiles) {
      error.value = 'No se pudieron cargar los archivos médicos. Verifique que sean archivos NIfTI válidos (.nii o .nii.gz)'
      console.error('ERROR: No se encontraron modalidades válidas')
      return
    }

    console.log('=== CARGANDO MODALIDAD POR DEFECTO ===')
    // Cargar modalidad por defecto (lógica original funcional)
    if (caseFiles.t1n) {
      console.log('Cargando T1N por defecto')
      loadSelectedModality('t1n')
    } else if (caseFiles.t1c) {
      console.log('Cargando T1C por defecto')
      loadSelectedModality('t1c')
    } else if (caseFiles.t2f) {
      console.log('Cargando T2F por defecto')
      loadSelectedModality('t2f')
    } else {
      console.log('Cargando T2W por defecto')
      loadSelectedModality('t2w')
    }

    // Actualizar estados de la UI
    canUploadImage.value = false
    showOriginalImage.value = true
    console.log('=== CARGA COMPLETADA EXITOSAMENTE ===')

  } catch (err) {
    error.value = `Error al procesar archivos: ${err.message}`
    console.error('Error detallado en handleFileUpload:', err)
  }
}
// fin del metodo

/**
 * Maneja la extracción y procesamiento de archivos ZIP
 * Extrae archivos NIfTI organizados por casos médicos
 * @param {File} file - Archivo ZIP a procesar
 */
async function handleZipArchive(file) {
  try {
    console.log('Procesando archivo ZIP:', file.name);

    // TEMPORAL: Forzar método tradicional para ZIP
    const useWorkerForZip = true; // Cambiar a true para usar Worker
    if (useWorkerForZip && isWorkerReady.value) {
      console.log('=== METODO DE PROCESAMIENTO ZIP: WEB WORKER ===');
      console.log('Procesando ZIP con Web Worker...');

      try {
        const fileBuffer = await file.arrayBuffer();
        const taskId = await processZipFile(
          fileBuffer,
          file.name,
          {
            onSuccess: (result) => {
              console.log('=== SUCCESS: WEB WORKER ZIP COMPLETADO ===');
              console.log('Worker completo procesamiento ZIP:', result);
              // Llamar a la función de integración
              handleWorkerZipResult(result);
            },
            onError: (error) => {
              console.error('=== ERROR: WEB WORKER ZIP FALLO ===');
              console.error('Error en Worker ZIP:', error);
              console.log('=== FALLBACK ZIP: USANDO PROCESAMIENTO TRADICIONAL ===');
              // Fallback al procesamiento tradicional
              handleZipArchiveTraditional(file);
            }
          }
        );

        console.log('WEB WORKER ZIP: Tarea iniciada con ID:', taskId);
        return;

      } catch (error) {
        console.error('=== ERROR: WEB WORKER ZIP NO PUDO INICIARSE ===');
        console.error('Error iniciando Worker ZIP:', error);
        console.log('=== FALLBACK ZIP: USANDO PROCESAMIENTO TRADICIONAL ===');
        // Fallback al procesamiento tradicional
        await handleZipArchiveTraditional(file);
      }
    } else {
      // Usar procesamiento tradicional si no hay worker
      console.log('=== METODO DE PROCESAMIENTO ZIP: TRADICIONAL (Worker no disponible) ===');
      console.log('Procesamiento ZIP tradicional...');
      await handleZipArchiveTraditional(file);
    }

  } catch (error) {
    console.error('Error procesando archivo ZIP:', error);
    error.value = 'Error procesando archivo ZIP: ' + error.message;
  }
}

/**
 * Maneja los resultados del procesamiento ZIP por Web Worker
 */
function handleWorkerZipResult(result) {
  console.log('🔄 Procesando resultados del Worker ZIP...');
  console.log('📊 Resultado completo del Worker:', result);

  // El Worker devuelve result.files (objeto con modalidades)
  if (result.files && Object.keys(result.files).length > 0) {
    console.log('📁 Archivos procesados por Worker:', result.files);
    console.log('📈 Total de archivos procesados:', result.totalFiles);

    // Procesar cada modalidad desde el Worker
    Object.entries(result.files).forEach(([modalityType, fileData]) => {
      console.log(`🧠 Integrando modalidad ${modalityType}:`, fileData);

      // Integrar los datos procesados por el Worker al sistema principal
      if (fileData.header && fileData.imageData) {
        // Asignar al sistema de archivos del caso
        caseFiles[modalityType] = {
          file: fileData.originalFile,
          originalFile: fileData.originalFile,
          data: fileData.imageData,  // Worker devuelve imageData, pero el sistema espera data
          header: fileData.header,
          metadata: fileData.metadata || {},
          modalityType: modalityType,
          fileName: fileData.fileName,
          processedBy: 'web-worker'
        };

        console.log(`✅ Modalidad ${modalityType} integrada exitosamente`);
      } else {
        console.warn(`⚠️ Modalidad ${modalityType} no tiene datos completos:`, fileData);
      }
    });

    console.log('✅ Resultados del Worker ZIP integrados exitosamente');
    console.log('📊 Estado actual de modalidades:', Object.keys(caseFiles).filter(key => key !== 'caseName'));

    // Disparar actualización de la interfaz
    nextTick(() => {
      console.log('🔄 Activando actualización de interfaz después de Worker ZIP');
      // Verificar si todas las modalidades están cargadas
      const loadedModalities = Object.keys(caseFiles).filter(key => key !== 'caseName' && caseFiles[key]);
      console.log('🎯 Modalidades cargadas:', loadedModalities);

      // Si tenemos modalidades cargadas, cargar la primera disponible
      if (loadedModalities.length > 0) {
        const firstModality = loadedModalities[0];
        console.log(`🚀 Cargando primera modalidad disponible: ${firstModality}`);
        loadSelectedModality(firstModality);
      }
    });

  } else {
    console.warn('⚠️ El Worker no devolvió archivos procesados');
    console.log('📋 Estructura del resultado:', Object.keys(result));
  }
}

/**
 * Procesamiento tradicional de archivos ZIP (fallback)
 */
async function handleZipArchiveTraditional(file) {
  try {
    console.log('Procesando archivo ZIP:', file.name);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(file);

    const caseMap = new Map(); // Para agrupar por caso

    // Procesar cada archivo en el ZIP
    for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
      if (!zipEntry.dir) {
        const fileName = relativePath.split('/').pop().toLowerCase();
        console.log(`Examinando archivo en ZIP: ${fileName} en ${relativePath}`);

        // Buscar archivos .nii.gz y .nii
        if (fileName.endsWith('.nii.gz') || fileName.endsWith('.nii')) {
          try {
            let fileData;

            if (fileName.endsWith('.nii.gz')) {
              // Descomprimir archivo .nii.gz
              const compressedData = await zipEntry.async('uint8array');
              const decompressedData = pako.inflate(compressedData);
              fileData = decompressedData.buffer;
            } else {
              // Archivo .nii directo
              fileData = await zipEntry.async('arraybuffer');
            }

            // Verificar si es NIfTI válido
            if (nifti.isNIFTI(fileData)) {
              console.log(`Archivo NIfTI válido: ${fileName}`);

              // Extraer nombre del caso
              const pathParts = relativePath.split('/');
              const caseMatch = pathParts.find(part => part.match(/BraTS-GLI-\d{5}-\d{3}/i)) ||
                fileName.match(/(BraTS-GLI-\d{5}-\d{3})/i)?.[0];
              const caseName = caseMatch || 'default';

              if (!caseMap.has(caseName)) {
                caseMap.set(caseName, []);
              }

              caseMap.get(caseName).push({
                name: fileName,
                data: fileData,
                path: relativePath
              });

              console.log(`Archivo agregado al caso ${caseName}: ${fileName}`);
            }
          } catch (err) {
            console.error(`Error procesando ${fileName}:`, err);
          }
        }
      }
    }

    console.log(`Casos encontrados: ${caseMap.size}`);

    // Procesar cada caso encontrado
    for (const [caseName, files] of caseMap) {
      await processFilesFromZip(caseName, files);
    }

    if (caseMap.size === 0) {
      error.value = 'No se encontraron archivos NIfTI válidos en el ZIP';
    }

  } catch (err) {
    error.value = 'Error al procesar archivo ZIP: ' + err.message;
    console.error('Error detallado en ZIP:', err);
  }
}

/**
 * Procesa archivos NIfTI extraídos del ZIP para un caso específico
 * Identifica modalidades (T1, T2, FLAIR, etc.) y segmentaciones
 * @param {string} caseName - Nombre del caso médico
 * @param {Array} files - Lista de archivos del caso
 */
async function processFilesFromZip(caseName, files) {
  caseFiles.caseName = caseName;
  console.log('=== PROCESANDO ARCHIVOS DEL ZIP PARA CASO:', caseName, '===');
  console.log('Archivos recibidos:', files.map(f => ({ name: f.name, path: f.path })));

  for (const file of files) {
    try {
      const modalityType = getModalityType(file.name);
      console.log(`Examinando archivo: ${file.name} -> Modalidad: ${modalityType}`);

      if (modalityType) {
        console.log(`=== PROCESANDO MODALIDAD ${modalityType.toUpperCase()} ===`);
        console.log(`Archivo: ${file.name}`);
        console.log(`Data type:`, typeof file.data, file.data?.constructor?.name);
        console.log(`Data size:`, file.data?.byteLength || file.data?.length || 'unknown');

        // Los datos ya vienen como ArrayBuffer del ZIP
        const arrayBuffer = file.data;

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          console.error(`ArrayBuffer vacío para ${file.name}`);
          continue;
        }

        // Verificar que sea NIfTI válido
        if (!nifti.isNIFTI(arrayBuffer)) {
          console.error(`Archivo ${file.name} no es NIfTI válido`);
          continue;
        }

        // Leer header e imagen directamente del ArrayBuffer
        const header = nifti.readHeader(arrayBuffer);
        const imageData = nifti.readImage(header, arrayBuffer);

        const dims = header.dims.slice(1, 4).join(' × ');
        onMetaLoaded(
          getFileType(file.name),
          file.data.byteLength,
          [detectModalityFromName(file.name)],
          dims
        );

        console.log(`Header leído - dims: [${header.dims}]`);
        console.log(`ImageData leído - size: ${imageData?.byteLength || 'unknown'}`);

        // Almacenar en caseFiles como en el código funcional
        // Para archivos ZIP, crear un File object válido para Web Worker
        const originalFileBlob = new File([arrayBuffer], file.name, {
          type: 'application/octet-stream'
        });

        caseFiles[modalityType] = {
          name: file.name,
          header: header,
          data: imageData, // Datos ya procesados por nifti.readImage()
          originalFile: originalFileBlob // File object válido para Web Worker
        };

        console.log(`✅ Modalidad ${modalityType} almacenada exitosamente`);
        console.log('📁 Archivo original guardado para Web Worker:', file.name);
      } else {
        // Como getModalityType ahora siempre devuelve un tipo (nunca null),
        // todos los archivos NIfTI válidos serán procesados
        console.log(`✅ Archivo procesado con modalidad automática: ${modalityType}`);
      }
    } catch (e) {
      console.error(`❌ Error procesando ${file.name}:`, e);
    }
  }

  const loadedModalities = Object.keys(caseFiles).filter(key => key !== 'caseName' && caseFiles[key]);
  console.log('=== RESUMEN DE MODALIDADES CARGADAS ===');
  console.log('Modalidades disponibles:', loadedModalities);

  // Mostrar detalles de cada modalidad cargada
  loadedModalities.forEach(mod => {
    const modData = caseFiles[mod];
    console.log(`${mod.toUpperCase()}:`, {
      name: modData.name,
      dims: modData.header?.dims,
      dataSize: modData.data?.length || modData.data?.byteLength
    });
  });

  if (loadedModalities.length === 0) {
    error.value = 'No se pudieron cargar modalidades válidas del archivo ZIP';
    console.error('❌ ERROR: No se cargaron modalidades válidas');
    return;
  }

  // Cargar la primera modalidad disponible (lógica del código funcional)
  console.log('=== CARGANDO MODALIDAD POR DEFECTO ===');
  if (caseFiles.t1n) {
    console.log('Cargando T1N por defecto');
    loadSelectedModality('t1n');
  } else if (caseFiles.t1c) {
    console.log('Cargando T1C por defecto');
    loadSelectedModality('t1c');
  } else if (caseFiles.t2f) {
    console.log('Cargando T2F por defecto');
    loadSelectedModality('t2f');
  } else if (caseFiles.t2w) {
    console.log('Cargando T2W por defecto');
    loadSelectedModality('t2w');
  } else {
    console.log('Cargando primera modalidad disponible:', loadedModalities[0]);
    loadSelectedModality(loadedModalities[0]);
  }
}

/**
 * Determina el tipo de modalidad médica basado en el nombre del archivo
 *
 * PATRONES RECONOCIDOS:
 * - BraTS estándar: -t1n, -t1c, -t2w, -t2f, -seg
 * - BraTS-GLI: _t1, _t1ce, _t2, _flair, _seg
 * - ✅ FALLBACK: Archivos con nombres libres se clasifican como 't1n' por defecto
 *
 * EJEMPLOS:
 * - "paciente-t1n.nii" → 't1n'
 * - "imagen_t2.nii.gz" → 't2w'
 * - "mi_resonancia.nii" → 't1n' (fallback)
 * - "cualquier_nombre.nii.gz" → 't1n' (fallback)
 *
 * @param {string} fileName - Nombre del archivo NIfTI
 * @returns {string} - Tipo de modalidad identificada (nunca null)
 */
function getModalityType(fileName) {
  const lowerName = fileName.toLowerCase();
  console.log(`Analizando modalidad para: ${fileName} -> ${lowerName}`);

  // Patrones originales BraTS (por compatibilidad)
  if (lowerName.includes('-t1n.')) {
    console.log('Modalidad detectada: t1n (patrón original)');
    return 't1n';
  }
  if (lowerName.includes('-t1c.')) {
    console.log('Modalidad detectada: t1c (patrón original)');
    return 't1c';
  }
  if (lowerName.includes('-t2f.')) {
    console.log('Modalidad detectada: t2f (patrón original)');
    return 't2f';
  }
  if (lowerName.includes('-t2w.')) {
    console.log('Modalidad detectada: t2w (patrón original)');
    return 't2w';
  }
  if (lowerName.includes('-seg.')) {
    console.log('Modalidad detectada: seg (patrón original)');
    return 'seg';
  }

  // Nuevos patrones BraTS-GLI (tu estructura actual)
  if (lowerName.includes('_t1.') || lowerName.includes('_t1ce.')) {
    if (lowerName.includes('_t1ce.')) {
      console.log('Modalidad detectada: t1c (patrón _t1ce)');
      return 't1c'; // T1 con contraste
    } else {
      console.log('Modalidad detectada: t1n (patrón _t1)');
      return 't1n'; // T1 nativo
    }
  }
  if (lowerName.includes('_t2.')) {
    console.log('Modalidad detectada: t2w (patrón _t2)');
    return 't2w'; // T2 weighted
  }
  if (lowerName.includes('_flair.')) {
    console.log('Modalidad detectada: t2f (patrón _flair)');
    return 't2f'; // T2 FLAIR
  }
  if (lowerName.includes('_seg.')) {
    console.log('Modalidad detectada: seg (patrón _seg)');
    return 'seg'; // Segmentación
  }

  console.log('No se detectó modalidad específica para:', fileName);

  // Si no se reconoce el patrón específico, intentar cargar como modalidad genérica
  // Esto permite cargar archivos con cualquier nombre como T1N por defecto
  console.log('Aplicando modalidad por defecto: t1n para archivo genérico');
  return 't1n';
}

/**
 * Carga y procesa un archivo de modalidad médica específica
 * Lee archivos NIfTI y extrae header + datos de imagen
 * @param {File} file - Archivo NIfTI a cargar
 * @param {string} modalityType - Tipo de modalidad (t1n, t1c, etc.)
 * @returns {Promise} - Promesa que resuelve con los datos procesados
 */
async function loadModalityFile(file, modalityType) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = reader.result

        // Manejar archivos comprimidos
        if (file.name.toLowerCase().endsWith('.gz')) {
          const decompressedData = pako.inflate(new Uint8Array(data))
          if (nifti.isNIFTI(decompressedData.buffer)) {
            const header = nifti.readHeader(decompressedData.buffer);
            const imageData = nifti.readImage(header, decompressedData.buffer);

            caseFiles[modalityType] = {
              name: file.name,
              header: header,
              data: imageData,
              originalFile: file
            }
            console.log(`Modalidad ${modalityType} cargada desde .gz:`, file.name);
            console.log('📁 Archivo original guardado para Web Worker:', file.name);
          }
        } else if (nifti.isNIFTI(data)) {
          const header = nifti.readHeader(data);
          const imageData = nifti.readImage(header, data);

          caseFiles[modalityType] = {
            name: file.name,
            header: header,
            data: imageData,
            originalFile: file
          }
          console.log(`Modalidad ${modalityType} cargada desde .nii:`, file.name);
          console.log('📁 Archivo original guardado para Web Worker:', file.name);
        }
        resolve()
      } catch (err) {
        console.error(`Error loading ${modalityType}:`, err)
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Error reading file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Carga una modalidad específica seleccionada por el usuario
 * Cambia la modalidad actual y actualiza la visualización
 * @param {string} modalityType - Tipo de modalidad a cargar
 */
async function loadSelectedModality(modalityType) {
  if (!caseFiles[modalityType]) {
    console.warn(`Modalidad ${modalityType} no disponible`);
    return;
  }

  // Evitar llamadas duplicadas
  if (isLoadingModality.value) {
    console.log(`⚠️ Ya se está cargando una modalidad, ignorando solicitud para: ${modalityType}`);
    return;
  }

  console.log(`Cargando modalidad: ${modalityType}`);
  isLoadingModality.value = true;

  // Limpiar recursos 3D antes de cambiar modalidad para evitar memory leaks
  if (mainView.value === '3d' || volumeMesh || volumeTexture) {
    console.log('🧹 Limpiando recursos 3D antes de cambiar modalidad...');
    // Solo limpiar mesh y textura, mantener renderer/scene/camera para reutilizar
    if (volumeTexture) {
      volumeTexture.dispose();
      volumeTexture = null;
    }
    if (volumeMesh) {
      if (scene) scene.remove(volumeMesh);
      if (volumeMesh.geometry) volumeMesh.geometry.dispose();
      if (volumeMesh.material) {
        if (volumeMesh.material.uniforms) {
          Object.values(volumeMesh.material.uniforms).forEach(uniform => {
            if (uniform.value && uniform.value.dispose) {
              uniform.value.dispose();
            }
          });
        }
        volumeMesh.material.dispose();
      }
      volumeMesh = null;
    }
  }

  currentModality.value = modalityType
  selectedModality.value = modalityType // Sincronizar con el selector
  showSegmentation.value = false
  const modality = caseFiles[modalityType]

  // Verificar si los datos ya fueron procesados por el Worker
  if (modality.processedBy === 'web-worker') {
    console.log('=== METODO DE PROCESAMIENTO: USANDO DATOS DEL WEB WORKER ===');
    console.log('📊 Datos ya procesados por Worker, usando directamente...');
    console.log('🔍 Debug: modalidad procesada por:', modality.processedBy);
    console.log('🔍 Debug: datos disponibles - data:', !!modality.data, 'header:', !!modality.header);

    // Usar los datos ya procesados por el Worker directamente
    processNIFTI(modality.data, modality.header, modalityType);
    // Nota: isLoadingModality se libera dentro de processNIFTI
    return;
  }

  // TEMPORAL: Forzar método tradicional para archivos individuales
  const useWorkerForIndividual = false; // Cambiar a true para usar Worker
  if (useWorkerForIndividual && isWorkerReady.value && modality.originalFile) {
    console.log('=== METODO DE PROCESAMIENTO: WEB WORKER (procesamiento en segundo plano) ===');
    console.log('Archivo original encontrado:', modality.originalFile.name);
    console.log('Iniciando procesamiento con Web Worker...');

    try {
      // Convertir File a ArrayBuffer para el Worker
      const fileReader = new FileReader();
      const fileBuffer = await new Promise((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = () => reject(fileReader.error);
        fileReader.readAsArrayBuffer(modality.originalFile);
      });

      const taskId = await processNiftiFile(
        fileBuffer,
        modality.originalFile.name,
        {
          modalityType: modalityType, // Agregar modalityType a los datos
          onSuccess: (result) => {
            console.log('=== SUCCESS: WEB WORKER COMPLETADO ===');
            console.log('Resultado del Worker:', result);
            console.log('🔍 Debug - Header del Worker:', result.header);
            console.log('🔍 Debug - Header.dims:', result.header?.dims);
            console.log('🔍 Debug - Header.dim:', result.header?.dim);
            // Usar los datos procesados por el worker
            if (result.data && result.header) {
              processNIFTI(result.data, result.header, modalityType);
            }
            isLoadingModality.value = false; // Liberar bloqueo
          },
          onError: (error) => {
            console.error('=== ERROR: WEB WORKER FALLO ===');
            console.error('Error en procesamiento:', error);
            console.log('=== FALLBACK: CAMBIANDO A PROCESAMIENTO TRADICIONAL ===');
            // Fallback al procesamiento tradicional
            processNIFTI(modality.data, modality.header, modalityType);
            isLoadingModality.value = false; // Liberar bloqueo
          }
        }
      );

      console.log('WEB WORKER: Tarea iniciada con ID:', taskId);

    } catch (error) {
      console.error('=== ERROR: WEB WORKER NO PUDO INICIARSE ===');
      console.error('Error iniciando worker:', error);
      console.log('=== FALLBACK: USANDO PROCESAMIENTO TRADICIONAL ===');
      // Fallback al procesamiento tradicional
      processNIFTI(modality.data, modality.header, modalityType);
      isLoadingModality.value = false; // Liberar bloqueo
    }
  } else {
    // Usar los datos de imagen directamente si no hay worker disponible
    const reason = !isWorkerReady.value ? 'Worker no disponible' : 'Archivo original no encontrado';
    console.log(`=== METODO DE PROCESAMIENTO: TRADICIONAL (${reason}) ===`);
    if (!modality.originalFile) {
      console.log('🔍 Debug: modality.originalFile =', modality.originalFile);
      console.log('🔍 Debug: modality keys:', Object.keys(modality));
    }
    console.log('Procesando con metodo tradicional sincrono...');
    processNIFTI(modality.data, modality.header, modalityType);
    console.log('=== SUCCESS: PROCESAMIENTO TRADICIONAL COMPLETADO ===');
    isLoadingModality.value = false; // Liberar bloqueo
  }
}

/**
 * Procesa archivos NIfTI cargados y prepara los datos para visualización
 * Funciona con datos ya procesados por nifti.readImage() (TypedArray)
 * @param {TypedArray} data - Datos de imagen ya procesados
 * @param {Object} header - Header del archivo NIfTI con metadatos
 * @param {string} modalityType - Tipo de modalidad médica
 */
function processNIFTI(data, header, modalityType) {
  try {
    // Reset variables globales para nuevo archivo
    lastNormalizationLog = null;
    loggedStrategies.clear();

    console.log(`=== PROCESANDO NIFTI PARA ${modalityType} ===`)
    console.log('Data type:', typeof data, 'constructor:', data?.constructor?.name)
    console.log('Data length:', data?.length || 'unknown')
    console.log('Header provided:', !!header)

    if (!header) {
      error.value = 'Header NIfTI requerido para processNIFTI.'
      console.error('ERROR: Header requerido')
      return
    }

    console.log('Header NIfTI válido:', header)

    // Compatibilidad con header del Worker: crear dims si no existe
    if (!header.dims && header.dim) {
      header.dims = header.dim;
      console.log('🔄 Convirtiendo header.dim a header.dims para compatibilidad');
    }

    if (!header.dims || header.dims.length < 4) {
      error.value = 'El header NIfTI no contiene dimensiones válidas.'
      console.error('ERROR: Dimensiones inválidas en header:', header.dims)
      return
    }

    console.log('Extrayendo dimensiones del header...')

    // Compatibilidad con header del Worker: pixDims vs pixdim
    const pixDimsArray = header.pixDims || header.pixdim;
    if (pixDimsArray) {
      physicalMeasures.value.pixDims = pixDimsArray.slice(1, 4);
    } else {
      console.warn('⚠️ pixDims no encontrado en header, usando valores por defecto');
      physicalMeasures.value.pixDims = [1, 1, 1];
    }

    // ESTABLECER DIMENSIONES GLOBALES
    width = header.dims[1]
    height = header.dims[2]
    depth = header.dims[3]

    console.log('=== DIMENSIONES ESTABLECIDAS ===')
    console.log('Width:', width)
    console.log('Height:', height)
    console.log('Depth:', depth)
    console.log('Modalidad:', modalityType)
    console.log('Dims completas:', header.dims)

    // ===== DETECCIÓN AUTOMÁTICA DE ORIENTACIÓN =====
    console.log('=== INICIANDO DETECCIÓN DE ORIENTACIÓN ===')
    const orientationInfo = detectNiftiOrientation(header)

    // Actualizar información de orientación en la UI
    currentOrientation.value = orientationInfo
    currentOrientation.value.displayInfo = getOrientationDisplayInfo(orientationInfo)

    console.log('=== INFORMACIÓN DE ORIENTACIÓN ===')
    console.log('Orientación detectada:', orientationInfo.orientation)
    console.log('Necesita corrección:', orientationInfo.needsCorrection)
    console.log('Método de detección:', orientationInfo.method)
    console.log('Confianza:', orientationInfo.confidence)

    // Extraer datatypeCode del header ANTES de las verificaciones
    const datatypeCode = header.datatypeCode || header.datatype; // Compatibilidad Worker
    console.log('DataType Code extraído:', datatypeCode);

    // DETECCIÓN DE PROBLEMAS DE ORIENTACIÓN Y METADATOS
    let hasOrientationIssues = false
    let hasMetadataErrors = false

    // Verificar problemas de orientación SOLO para archivos float32
    // Los archivos int16 BRATS pueden tener códigos 0 sin ser problemáticos
    if (header.qform_code !== undefined && header.sform_code !== undefined) {
      console.log(`🧭 Códigos de orientación: qform=${header.qform_code}, sform=${header.sform_code}`)

      // SOLO marcar como problemático si es float32 Y tiene códigos de orientación en 0
      if (datatypeCode === 16 && header.qform_code === 0 && header.sform_code === 0) {
        hasOrientationIssues = true
        console.log('⚠️ PROBLEMA DETECTADO: Archivo float32 con orientación indefinida (RAS problemático)')
      } else if (header.qform_code === 0 && header.sform_code === 0) {
        console.log('ℹ️ Códigos de orientación en 0 - normal para archivos BRATS int16')
      }
    }

    // Verificar errores de metadatos (como los que mencionas en archivos problemáticos)
    try {
      if (header.descrip && typeof header.descrip === 'object') {
        // Intentar procesar descripción
        console.log('📝 Descripción del archivo disponible')
      }
    } catch (e) {
      hasMetadataErrors = true
      console.log('⚠️ PROBLEMA DETECTADO: Error en metadatos -', e.message)
    }

    // Verificación adicional para archivos float32: si tiene muchos valores NaN/infinitos
    let hasFloat32Issues = false
    if (datatypeCode === 16) {
      // Esta verificación se hará después de crear imageArray
      console.log('🔍 Se verificarán problemas adicionales en datos float32...')
    }

    if (hasOrientationIssues || hasMetadataErrors) {
      console.log('🔧 APLICANDO CORRECCIONES PARA ARCHIVO PROBLEMÁTICO...')
    }

    // Convertir ArrayBuffer al tipo correcto según datatypeCode
    let imageArray
    console.log('DataType Code:', datatypeCode, 'ArrayBuffer size:', data.byteLength)

    // Convertir según el tipo de dato NIfTI con detección mejorada
    if (datatypeCode === 2) { // DT_UNSIGNED_CHAR
      imageArray = new Uint8Array(data)
      console.log('🔢 Usando Uint8Array para datos de 8 bits')
    } else if (datatypeCode === 4) { // DT_SIGNED_SHORT (int16)
      imageArray = new Int16Array(data)
      console.log('🔢 Usando Int16Array para datos int16 - soporte optimizado activado')
    } else if (datatypeCode === 8) { // DT_SIGNED_INT
      imageArray = new Int32Array(data)
      console.log('🔢 Usando Int32Array para datos de 32 bits enteros')
    } else if (datatypeCode === 16) { // DT_FLOAT (float32)
      imageArray = new Float32Array(data)
      console.log('🔢 Usando Float32Array para datos float32 - soporte optimizado activado')

      // CORRECCIÓN ESPECIAL PARA ARCHIVOS FLOAT32 PROBLEMÁTICOS
      console.log('🔧 Aplicando correcciones para archivos float32 con orientación RAS...')

      // Verificar y corregir valores NaN o infinitos
      let nanCount = 0, infCount = 0
      for (let i = 0; i < imageArray.length; i++) {
        if (isNaN(imageArray[i])) {
          imageArray[i] = 0
          nanCount++
        } else if (!isFinite(imageArray[i])) {
          imageArray[i] = 0
          infCount++
        }
      }

      // Marcar como problemático si tiene muchos valores NaN/infinitos (más del 1%)
      if (nanCount > 0 || infCount > 0) {
        const totalBadValues = nanCount + infCount
        const percentageBad = (totalBadValues / imageArray.length) * 100
        console.log(`🛠️ Corregidos ${nanCount} valores NaN y ${infCount} valores infinitos (${percentageBad.toFixed(2)}%)`)

        if (percentageBad > 1) {
          hasFloat32Issues = true
          console.log('⚠️ ARCHIVO FLOAT32 PROBLEMÁTICO: Alto porcentaje de valores inválidos')
        }
      }

    } else if (datatypeCode === 64) { // DT_DOUBLE
      imageArray = new Float64Array(data)
      console.log('🔢 Usando Float64Array para datos de doble precisión')
    } else if (datatypeCode === 512) { // DT_UINT16
      imageArray = new Uint16Array(data)
      console.log('🔢 Usando Uint16Array para datos de 16 bits sin signo')
    } else {
      // Por defecto usar Float32Array para máxima compatibilidad
      console.warn('⚠️ Tipo de dato desconocido:', datatypeCode, '- usando Float32Array por defecto')
      imageArray = new Float32Array(data)
    }

    console.log('ImageArray convertido, length:', imageArray.length, 'constructor:', imageArray.constructor.name)

    if (!imageArray || imageArray.length === 0) {
      error.value = 'No se pudieron extraer los datos de imagen.'
      console.error('ERROR: ImageArray vacío o inválido')
      return
    }

    let min = imageArray[0]
    let max = imageArray[0]

    for (let i = 1; i < imageArray.length; i++) {
      if (imageArray[i] < min) min = imageArray[i]
      if (imageArray[i] > max) max = imageArray[i]
    }

    // Guardar los valores originales para usar en normalizeProblematicValue
    originalDataMin = min
    originalDataMax = max

    console.log('Rango de valores - Min:', min, 'Max:', max)

    // DETECCIÓN ADICIONAL DE PROBLEMAS FLOAT32 BASADA EN RANGOS DE DATOS
    if (datatypeCode === 16) { // Solo para float32
      const range = max - min
      console.log(`🔍 Analizando características float32: range=${range}, min=${min}, max=${max}`)

      // Detectar patrones problemáticos comunes en archivos float32
      if (range < 0.001 && range > 0) {
        hasFloat32Issues = true
        console.log('⚠️ FLOAT32 PROBLEMÁTICO: Rango extremadamente pequeño detectado')
      } else if (min === max) {
        hasFloat32Issues = true
        console.log('⚠️ FLOAT32 PROBLEMÁTICO: Datos constantes (sin variación)')
      } else if (Math.abs(min) > 10000 || Math.abs(max) > 10000) {
        hasFloat32Issues = true
        console.log('⚠️ FLOAT32 PROBLEMÁTICO: Valores extremadamente grandes detectados')
      } else if (range > 0 && range < 1 && min >= 0 && max <= 1) {
        // Archivos float32 normalizados [0-1] pueden ser problemáticos para visualización
        console.log('ℹ️ FLOAT32: Datos normalizados [0-1] detectados - puede requerir ajuste especial')
        hasFloat32Issues = true
      }
    }

    // Obtener información detallada del tipo de datos
    const dataTypeInfo = getDataTypeInfo(datatypeCode, min, max)
    console.log('📊 Información de tipo de datos:', dataTypeInfo)

    // Actualizar la información del tipo de datos para la UI
    currentDataType.value = dataTypeInfo

    // Marcar problemas detectados en la UI - LÓGICA MEJORADA
    const hasTrueProblems = hasOrientationIssues || hasMetadataErrors || hasFloat32Issues

    if (hasTrueProblems) {
      currentDataType.value.hasIssues = true
      let issueTypes = []
      if (hasOrientationIssues) issueTypes.push('orientación')
      if (hasMetadataErrors) issueTypes.push('metadatos')
      if (hasFloat32Issues) issueTypes.push('datos inválidos')
      currentDataType.value.issueType = issueTypes.join(', ')
      currentDataType.value.notes += ' (problemas de ' + currentDataType.value.issueType + ' corregidos)'
      hasProblematicData.value = true
      console.log('🚨 ARCHIVO MARCADO COMO PROBLEMÁTICO:', currentDataType.value.issueType)
    } else {
      hasProblematicData.value = false
      console.log('✅ ARCHIVO NORMAL - sin problemas detectados')
    }

    const range = max - min

    // Procesamiento especial para segmentación
    if (modalityType === 'seg') {
      console.log('Procesando como segmentación...')
      const segData = new Uint8Array(imageArray.length)
      for (let i = 0; i < imageArray.length; i++) {
        switch (imageArray[i]) {
          case 1: segData[i] = 50; break   // Necrotic core - Rojo
          case 2: segData[i] = 150; break  // Edema - Verde
          case 4: segData[i] = 250; break  // Enhancing tumor - Azul
          default: segData[i] = 0
        }
      }
      volumeData = segData
    } else {
      console.log('Normalizando datos para visualización...')
      // Normalizar datos para visualización
      if (range === 0) {
        volumeData = new Uint8Array(imageArray.length).fill(128)
      } else {
        volumeData = new Uint8Array(imageArray.length)
        for (let i = 0; i < imageArray.length; i++) {
          volumeData[i] = Math.round(((imageArray[i] - min) / range) * 255)
        }
      }
    }

    console.log('VolumeData creado, length:', volumeData.length)

    // EXPONER DATOS PARA VISTA 3D EN CUADRANTES
    // Hacer disponibles los datos volumétricos para el composable useFourViews3D
    window.dashboardVolumeData = {
      data: volumeData,
      width: width,
      height: height,
      depth: depth,
      header: header,
      modalityType: modalityType,
      timestamp: Date.now()
    }
    console.log('✅ [DashboardView] Datos volumétricos expuestos para vista 3D:', width, 'x', height, 'x', depth)

    // ===== APLICAR CORRECCIÓN DE ORIENTACIÓN =====
    console.log('=== APLICANDO CORRECCIÓN DE ORIENTACIÓN ===')
    if (orientationInfo.needsCorrection) {
      console.log('🔧 Aplicando corrección para orientación:', orientationInfo.orientation)
      volumeData = applyOrientationCorrection(volumeData, width, height, depth, orientationInfo)
      console.log('✅ Corrección de orientación completada')
    } else {
      console.log('ℹ️ No se requiere corrección de orientación para:', orientationInfo.orientation)
    }

    // Ajustar window/level según el tipo de dato con soporte optimizado para int16 y float32
    const datatype = header.datatypeCode
    console.log(`🔧 Configurando window/level para datatype: ${datatype}`)

    // CORRECCIÓN IMPORTANTE: Como normalizamos volumeData a [0, 255],
    // window/level debe estar configurado para ese rango, no para los datos originales
    if (datatype === 4) { // DT_SIGNED_SHORT (int16)
      // Para datos normalizados a [0, 255], usar configuración óptima
      windowLevel.window = 255
      windowLevel.level = 128
      console.log(`📊 INT16 configurado para datos normalizados: window=${windowLevel.window}, level=${windowLevel.level}`)
    } else if (datatype === 16) { // DT_FLOAT (float32)
      if (hasProblematicData.value) {
        // Para archivos problemáticos, usar configuración especial
        windowLevel.window = 255
        windowLevel.level = 128
      } else {
        // Para float32 normal, usar configuración estándar
        windowLevel.window = 255
        windowLevel.level = 128
      }
      console.log(`  FLOAT32 configurado para datos normalizados: window=${windowLevel.window}, level=${windowLevel.level}`)
    } else if (datatype === 512) { // DT_UINT16
      windowLevel.window = 255
      windowLevel.level = 128
      console.log(`📊 UINT16 configurado para datos normalizados: window=${windowLevel.window}, level=${windowLevel.level}`)
    } else {
      // Por defecto usar configuración estándar para datos normalizados
      windowLevel.window = 255
      windowLevel.level = 128
      console.log(`📊 DEFECTO configurado para datos normalizados: datatype ${datatype}`)
    }

    console.log('Window/Level configurado:', windowLevel)

    // CONFIGURAR SLICES INICIALES
    currentSlices.axial = Math.floor(depth / 2)
    currentSlices.coronal = Math.floor(height / 2)
    currentSlices.sagittal = Math.floor(width / 2)

    console.log('=== SLICES INICIALES CONFIGURADOS ===')
    console.log('Current slices:', {
      axial: currentSlices.axial,
      coronal: currentSlices.coronal,
      sagittal: currentSlices.sagittal
    })

    // Verificar si hay medidas físicas en el header
    if (hasPhysicalMeasures(header)) {
      console.log('El archivo NIfTI tiene información de medidas físicas (espaciado y unidades).')
    } else {
      console.log('El archivo NIfTI NO tiene información de medidas físicas.')
    }

    hasMeasures.value = hasPhysicalMeasures(header)

    // Extraer medidas físicas si existen
    if (header && header.pixDims) {
      physicalMeasures.value.pixDims = header.pixDims.slice(1, 4) // [x, y, z]
      // Unidades: header.xyzt_units puede ser un número codificado
      const unitsCode = header.xyzt_units || header.xyztUnits || 0
      let unitsStr = ''
      if (unitsCode & 0x01) unitsStr = 'metros'
      else if (unitsCode & 0x02) unitsStr = 'milímetros'
      else if (unitsCode & 0x03) unitsStr = 'micrómetros'
      else unitsStr = 'desconocidas'
      physicalMeasures.value.units = unitsStr
    } else {
      physicalMeasures.value.pixDims = []
      physicalMeasures.value.units = ''
    }

    console.log('=== LLAMANDO updateDisplay() ===')
    updateDisplay()

    // Redibujar las 4 vistas si están activas
    if (quadViewActive.value) {
      initializeQuadViews()
    }

    volumeLoaded.value = true
    console.log('=== PROCESAMIENTO NIFTI COMPLETADO ===')

    // Actualizar uploadedFiles para mostrar el estado correcto en la UI
    if (uploadedFiles.value.length === 0 && currentModality.value) {
      const fileName = caseFiles.caseName || currentModality.value
      uploadedFiles.value = [{
        name: fileName,
        size: `${(data.byteLength / (1024 * 1024)).toFixed(1)} MB`,
        type: 'NIfTI Medical Image',
        status: 'completed',
        uploadDate: new Date().toLocaleString()
      }]
      console.log('=== ARCHIVO MÉDICO AGREGADO A uploadedFiles ===')
      console.log('Estado uploadedFiles:', uploadedFiles.value)
    }

    // Liberar flag de carga al completar exitosamente
    isLoadingModality.value = false;

  } catch (err) {
    error.value = `Error al procesar ${modalityType}: ${err.message}`
    console.error('Error detallado en processNIFTI:', err)
    // Liberar flag de carga también en caso de error
    isLoadingModality.value = false;
  }
}

/**
 * 🆘 FUNCIÓN DE RECUPERACIÓN: Detecta canvas en negro y los regenera
 * Útil después de transiciones de modo maximizado o cambios de vista
 */
function detectAndRecoverBlackCanvas() {
  if (!canvasMain.value || !volumeData || quadViewActive.value) return;

  const ctx = canvasMain.value.getContext('2d');
  if (!ctx) return;

  // 🛡️ VALIDACIÓN DE TAMAÑO antes de getImageData
  if (canvasMain.value.width <= 0 || canvasMain.value.height <= 0) {
    console.warn(`🆘 Canvas con tamaño inválido: ${canvasMain.value.width}x${canvasMain.value.height}, sincronizando...`);
    syncCanvasSize(canvasMain.value);

    // Reintentar después de sincronizar
    setTimeout(() => {
      if (canvasMain.value.width > 0 && canvasMain.value.height > 0) {
        updateDisplay();
      }
    }, 100);
    return true;
  }

  // Verificar si el canvas está vacío/negro
  const imageData = ctx.getImageData(0, 0, canvasMain.value.width, canvasMain.value.height);
  const hasContent = Array.from(imageData.data).some(pixel => pixel > 0);

  if (!hasContent) {
    console.warn(`🆘 Canvas principal en negro detectado para vista ${mainView.value}, recuperando...`);

    // Limpiar y regenerar
    ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height);
    syncCanvasSize(canvasMain.value);

    // Forzar actualización con delay escalonado
    setTimeout(() => updateDisplay(), 50);
    setTimeout(() => updateDisplay(), 200);

    return true; // Indica que se intentó recuperación
  }

  return false; // Canvas está bien
}

/**
 * Actualiza la visualización completa de todas las vistas
 * Redibuja la vista principal, miniaturas y vistas ortogonales
 */
function updateDisplay() {
  // Verificar que tenemos datos volumétricos
  if (!volumeData) {
    console.warn('⚠️ updateDisplay: No hay datos volumétricos disponibles')
    return
  }

  console.log(`🎯 updateDisplay: Actualizando vista ${mainView.value}`)

  // Forzar redibujado inmediato del canvas principal
  requestAnimationFrame(() => {
    // Verificar que el canvas principal esté disponible antes de dibujar
    if (canvasMain.value && !quadViewActive.value) {
      console.log(`🎯 updateDisplay: Redibujando canvas principal para vista ${mainView.value}`)

      // 🔧 MEJORA: Limpiar canvas antes de redibujar para evitar artefactos
      // ✅ OPTIMIZACIÓN: Añadido { willReadFrequently: true } para mejorar rendimiento con getImageData
      const ctx = canvasMain.value.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        // 🛡️ VALIDACIÓN: Verificar dimensiones antes de clearRect
        if (canvasMain.value.width > 0 && canvasMain.value.height > 0) {
          ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height);
        } else {
          console.warn(`⚠️ updateDisplay: Canvas con tamaño inválido antes de clearRect: ${canvasMain.value.width}x${canvasMain.value.height}`);
          syncCanvasSize(canvasMain.value);
        }
      }

      drawMainView()

      // RICHARD
      if (activeTab.value === 1 && segmentedImageData.value && ctx) {
        console.log('🎨 Aplicando overlay de segmentación sobre imagen original...');

        if (canvasMain.value && canvasMain.value.width > 0 && canvasMain.value.height > 0) {
          try {
            // Llamar a la nueva función de overlay
            applySegmentationOverlay(ctx, canvasMain.value);
            console.log('✅ Overlay aplicado');
          } catch (error) {
            console.error('❌ Error aplicando overlay:', error);
          }
        } else {
          console.warn('⚠️ Canvas no tiene dimensiones válidas');
        }
      }

      // 🔍 Verificar que se dibujó contenido
      setTimeout(() => {
        if (ctx && canvasMain.value.width > 0 && canvasMain.value.height > 0) {
          const imageData = ctx.getImageData(0, 0, canvasMain.value.width, canvasMain.value.height);
          const hasContent = Array.from(imageData.data).some(pixel => pixel > 0);

          if (!hasContent) {
            console.warn(`⚠️ updateDisplay: Canvas principal vacío para vista ${mainView.value}, reintentando...`);
            // Reintentar dibujo después de un pequeño delay
            setTimeout(() => drawMainView(), 50);
          } else {
            console.log(`✅ updateDisplay: Vista ${mainView.value} actualizada correctamente`);
          }
        } else if (ctx) {
          console.warn(`⚠️ updateDisplay: Canvas con tamaño inválido: ${canvasMain.value.width}x${canvasMain.value.height}`);
          // Intentar sincronizar tamaño del canvas
          syncCanvasSize(canvasMain.value);
          setTimeout(() => drawMainView(), 100);
        }
      }, 100);

    } else if (!canvasMain.value && activeTab.value !== 2 && !quadViewActive.value) {
      // Solo mostrar warning si no estamos en la pestaña de vista doble NI en modo 4 vistas
      console.warn('⚠️ updateDisplay: Canvas principal no disponible')
    }

    // Solo dibujar vista doble si el canvas existe (está en la pestaña correcta)
if (canvasDoubleOriginal.value) {
  drawDoubleOriginalView()
}
// Actualizar canvas de diagnóstico en doble vista si hay segmentación y estamos en esa pestaña
if (canvasDoubleDiagnosis.value && segmentedImageData.value && activeTab.value === 2) {
  drawDoubleDiagnosisView()
}
  })
}

/**
 * Establece qué vista se muestra en el panel principal
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal', '3d')
 */
function setMainView(viewType) {
  const previousView = mainView.value;

  // ===== OPTIMIZACIÓN: CAMBIO DE VISTA 3D A 2D =====
  if (previousView === '3d' && viewType !== '3d') {
    console.log(`🔄 Cambiando de vista 3D a 2D (${viewType}) - optimizando recursos...`);

    // Limpiar recursos 3D
    cleanup3DResources();

    // 🔧 SOLUCIÓN CRÍTICA: Asegurar que el cambio de vista se procese correctamente
    mainView.value = viewType;

    // Preparar el sistema para renderizado 2D optimizado
    nextTick(() => {
      prepare2DRendering();

      // 🎯 Forzar redibujado inmediato de la nueva vista 2D
      console.log(`✅ Forzando renderizado de vista ${viewType}`);

      // Limpiar canvas principal antes de redibujar
      if (canvasMain.value) {
        const ctx = canvasMain.value.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height);
          console.log('🧹 Canvas principal limpiado para nueva vista');
        }
      }

      // Renderizar inmediatamente
      updateDisplay();

      // 🔍 Verificación de que el contenido se dibujó correctamente
      setTimeout(() => {
        if (canvasMain.value && volumeData) {
          const ctx = canvasMain.value.getContext('2d');
          if (ctx && canvasMain.value.width > 0 && canvasMain.value.height > 0) {
            const imageData = ctx.getImageData(0, 0, canvasMain.value.width, canvasMain.value.height);
            const hasContent = Array.from(imageData.data).some(pixel => pixel > 0);

            if (!hasContent) {
              console.warn(`⚠️ Vista ${viewType} parece estar vacía, forzando redibujado adicional`);
              drawMainView();
            } else {
              console.log(`✅ Vista ${viewType} renderizada exitosamente`);
              showProfessionalNotification(
                `📊 Vista ${viewType.charAt(0).toUpperCase() + viewType.slice(1)}`,
                'Vista cargada correctamente',
                'success'
              );
            }
          } else if (ctx) {
            console.warn(`⚠️ Canvas con tamaño inválido en verificación de ${viewType}: ${canvasMain.value.width}x${canvasMain.value.height}`);
            syncCanvasSize(canvasMain.value);
            setTimeout(() => drawMainView(), 100);
          }
        }
      }, 150);
    });

    return; // Salir temprano para evitar procesamiento adicional
  }

  // ===== OPTIMIZACIÓN: CAMBIO DE VISTA 2D A 3D =====
  if (viewType === '3d' && previousView !== '3d') {
    console.log('🔄 Cambiando a vista 3D - inicializando recursos...');

    // Preparar el sistema para renderizado 3D
    prepare3DRendering();

    // Inicializar Three.js si no está inicializado
    if (!renderer || !scene || !camera) {
      nextTick(async () => {
        const success = await initThree();
        if (success && volumeData) {
          create3DVolumeFromExistingData();
        } else if (!success) {
          console.error('❌ No se pudo inicializar renderizado 3D');
          // Volver a vista anterior si falla
          mainView.value = previousView;
          return;
        }
      });
    } else {
      // Reanudar animación con parámetros optimizados
      animate3D();
      if (volumeData && !volumeMesh) {
        create3DVolumeFromExistingData();
      }
    }
  }

  mainView.value = viewType

  // ===== RENDERIZADO OPTIMIZADO SEGÚN TIPO DE VISTA =====
  if (viewType !== '3d') {
    // Para vistas 2D, usar renderizado optimizado
    nextTick(() => {
      console.log(`🎯 setMainView: Redibujando vista ${viewType} con optimizaciones 2D`);
      updateDisplay()
    });
  } else {
    // Para vista 3D, renderizado inmediato
    updateDisplay()
  }
}

/**
 * ===== FUNCIONES DE OPTIMIZACIÓN DE RECURSOS =====
 */

/**
 * Prepara el sistema para renderizado optimizado en vista 2D
 */
function prepare2DRendering() {
  console.log('🎨 Preparando renderizado optimizado para vista 2D...');

  try {
    // 1. Limpiar todos los canvas 2D
    const canvasIds = ['main-canvas', 'axial-canvas', 'coronal-canvas', 'sagittal-canvas'];
    let cleanedCanvases = 0;

    canvasIds.forEach(canvasId => {
      const canvas = document.getElementById(canvasId);
      if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Asegurar que el contexto esté en estado limpio
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.restore();
          cleanedCanvases++;
        }
      }
    });

    console.log(`✅ ${cleanedCanvases} canvas 2D preparados para renderizado`);

    // 2. Resetear variables de estado que podrían afectar 2D
    lastFrameTime = 0;

    // 3. Forzar garbage collection del navegador (si está disponible)
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
      console.log('✅ Garbage collection forzado');
    }

    console.log('✅ Sistema preparado para renderizado 2D optimizado');
  } catch (error) {
    console.error('❌ Error preparando renderizado 2D:', error);
  }
}

/**
 * Optimiza el sistema para renderizado 3D de alta calidad
 */
function prepare3DRendering() {
  console.log('🎬 Preparando renderizado 3D de alta calidad...');

  try {
    // 1. Reactivar sistemas de optimización
    if (!zoomStepsEnabled.value) {
      zoomStepsEnabled.value = true;
      console.log('✅ Steps adaptativos reactivados');
    }

    // 2. Restaurar parámetros de calidad base
    const baseSteps3D = baseSteps.value || 256;
    currentSmoothedSteps.value = baseSteps3D;

    // 3. Preparar shader uniforms si existen
    if (volumeMesh && volumeMesh.material && volumeMesh.material.uniforms) {
      volumeMesh.material.uniforms.steps.value = baseSteps3D;
    }

    console.log('✅ Sistema preparado para renderizado 3D de alta calidad');
  } catch (error) {
    console.error('❌ Error preparando renderizado 3D:', error);
  }
}

/**
 * Detecta si el panel de controles 3D necesita scroll y actualiza el indicador
 */
function checkScrollIndicator() {
  nextTick(() => {
    const controlsPanel = document.querySelector('.controls-3d-bottom');
    if (controlsPanel) {
      const needsScroll = controlsPanel.scrollHeight > controlsPanel.clientHeight;

      if (needsScroll) {
        controlsPanel.classList.add('scrollable');
      } else {
        controlsPanel.classList.remove('scrollable');
      }

      console.log(`📏 Panel de controles 3D - Scroll necesario: ${needsScroll}`);
      console.log(`   📊 ScrollHeight: ${controlsPanel.scrollHeight}, ClientHeight: ${controlsPanel.clientHeight}`);
    }
  });
}

/**
 * Inicializa el monitoreo de scroll para controles 3D
 */
function initScrollMonitoring() {
  // Verificar al cargar
  checkScrollIndicator();

  // Verificar cuando cambie el contenido
  watch(mainView, () => {
    if (mainView.value === '3d') {
      setTimeout(checkScrollIndicator, 100);
    }
  });

  // Verificar cuando cambien los estados de IA
  watch([showIASegmentation3D, useEnhancedVolume, aiProcessingStatus], () => {
    if (mainView.value === '3d') {
      setTimeout(checkScrollIndicator, 50);
    }
  }, { deep: true });
}

/**
 * 🔧 NUEVA FUNCIÓN: Sistema de recarga automática
 * Recarga automáticamente las vistas cuando hay cambios críticos
 */
function initAutoReloadSystem() {
  console.log('🔄 Inicializando sistema de recarga automática...')

  let resizeTimeout = null
  let lastWindowSize = { width: window.innerWidth, height: window.innerHeight }

  // 📏 Recarga automática en cambios de tamaño de ventana
  const handleWindowResize = () => {
    // Debounce para evitar recargas excesivas
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }

    resizeTimeout = setTimeout(() => {
      const currentSize = { width: window.innerWidth, height: window.innerHeight }

      // Solo recargar si hay un cambio significativo (>50px en cualquier dimensión)
      const widthDiff = Math.abs(currentSize.width - lastWindowSize.width)
      const heightDiff = Math.abs(currentSize.height - lastWindowSize.height)

      if (widthDiff > 50 || heightDiff > 50) {
        console.log(`📏 Cambio de tamaño detectado: ${lastWindowSize.width}x${lastWindowSize.height} → ${currentSize.width}x${currentSize.height}`)

        if (volumeData && canvasMain.value) {
          console.log('🔄 Recarga automática por cambio de tamaño de ventana')

          // 🔧 NUEVO: Redimensionar vista 3D del composable si está activa
          if (quadViewActive.value && canvas3DRef.value) {
            console.log('🎯 Redimensionando vista 3D del composable...')
            resizeFourViews3D()
          }

          autoReloadWithDelay('resize', 200)
        }

        lastWindowSize = currentSize
      }
    }, 300) // 300ms de debounce
  }

  // 🔄 Recarga automática cuando el canvas principal se redimensiona
  const handleCanvasResize = () => {
    if (volumeData && canvasMain.value) {
      console.log('🔄 Recarga automática por redimensionamiento de canvas')
      autoReloadWithDelay('canvas-resize', 150)
    }
  }

  // 👁️ Recarga automática cuando cambia la vista principal
  const handleViewChange = () => {
    if (volumeData && canvasMain.value) {
      console.log('🔄 Recarga automática por cambio de vista')
      autoReloadWithDelay('view-change', 100)
    }
  }

  // 📊 Recarga automática cuando cambian los datos volumétricos
  const handleVolumeDataChange = () => {
    if (volumeData) {
      console.log('🔄 Recarga automática por cambio de datos volumétricos')
      autoReloadWithDelay('volume-data', 300)
    }
  }

  // 🎯 Recarga automática cuando se activa/desactiva quad view
  const handleQuadViewToggle = () => {
    if (volumeData) {
      console.log('🔄 Recarga automática por toggle de quad view')
      autoReloadWithDelay('quad-view', 400)
    }
  }

  // Agregar listeners
  window.addEventListener('resize', handleWindowResize)

  // Watchers para cambios internos
  watch(mainView, handleViewChange)
  watch(() => volumeLoaded.value, handleVolumeDataChange)
  watch(quadViewActive, handleQuadViewToggle)

  // Observer para cambios de tamaño del canvas principal
  if (window.ResizeObserver && canvasMain.value) {
    const canvasResizeObserver = new ResizeObserver(handleCanvasResize)
    canvasResizeObserver.observe(canvasMain.value)

    // Limpiar observer al desmontar
    onUnmounted(() => {
      canvasResizeObserver.disconnect()
    })
  }

  // Limpiar listeners al desmontar
  onUnmounted(() => {
    window.removeEventListener('resize', handleWindowResize)
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
  })

  console.log('✅ Sistema de recarga automática inicializado')
  console.log('📋 Triggers de recarga automática:')
  console.log('  - Cambio de tamaño de ventana (>50px)')
  console.log('  - Redimensionamiento de canvas')
  console.log('  - Cambio de vista principal')
  console.log('  - Cambio de datos volumétricos')
  console.log('  - Toggle de quad view')
  console.log('  - Cambios de zoom')
  console.log('  - Cambios de pestaña')

  // Mostrar notificación al usuario
  setTimeout(() => {
    showProfessionalNotification(
      '🔄 Recarga Automática',
      'Sistema de recarga automática activado para mejor experiencia',
      'success'
    )
  }, 2000)
}

/**
 * 🔧 Función auxiliar para recarga automática con delay y prevención de spam
 */
let autoReloadTimers = new Map()

function autoReloadWithDelay(reason, delayMs = 200) {
  // Verificar si la recarga automática está habilitada
  if (!autoReloadEnabled) {
    console.log(`⚠️ Recarga automática deshabilitada - ignorando: ${reason}`)
    return
  }

  // Cancelar timer anterior para este tipo de recarga
  if (autoReloadTimers.has(reason)) {
    clearTimeout(autoReloadTimers.get(reason))
  }

  // Programar nueva recarga
  const timer = setTimeout(() => {
    console.log(`🔄 Ejecutando recarga automática: ${reason}`)

    // Verificar condiciones antes de recargar
    if (!volumeData) {
      console.log('⚠️ Recarga cancelada: no hay datos volumétricos')
      return
    }

    if (!canvasMain.value) {
      console.log('⚠️ Recarga cancelada: canvas principal no disponible')
      return
    }

    // Ejecutar recarga con verificación de éxito
    try {
      updateDisplay()

      // Verificar que se dibujó contenido después de un pequeño delay
      setTimeout(() => {
        if (canvasMain.value) {
          const ctx = canvasMain.value.getContext('2d')
          const imageData = ctx.getImageData(0, 0, Math.min(100, canvasMain.value.width), Math.min(100, canvasMain.value.height))
          const hasContent = Array.from(imageData.data).some(pixel => pixel > 0)

          if (hasContent) {
            console.log(`✅ Recarga automática exitosa: ${reason}`)
          } else {
            console.warn(`⚠️ Recarga automática falló: ${reason} - canvas vacío`)
            // Reintentar una vez más
            setTimeout(() => updateDisplay(), 100)
          }
        }
      }, 50)

    } catch (error) {
      console.error(`❌ Error en recarga automática (${reason}):`, error)
    }

    // Limpiar timer
    autoReloadTimers.delete(reason)
  }, delayMs)

  autoReloadTimers.set(reason, timer)
}

/**
 * ===== SISTEMA DE MONITOREO DE RENDIMIENTO Y OPTIMIZACIÓN AUTOMÁTICA =====
 */

// Variables para monitoreo de rendimiento
let performanceMonitor = {
  frameCount: 0,
  lastCheck: performance.now(),
  currentFPS: 60,
  lowFPSCount: 0,
  optimizationApplied: false
};

const FPS_THRESHOLD = 30; // FPS mínimo antes de aplicar optimizaciones
const LOW_FPS_CONSECUTIVE_CHECKS = 3; // Checks consecutivos de bajo FPS antes de optimizar

/**
 * Monitorea el rendimiento y aplica optimizaciones automáticas si es necesario
 */
function monitorPerformance() {
  const currentTime = performance.now();
  const deltaTime = currentTime - performanceMonitor.lastCheck;

  // Verificar FPS cada segundo
  if (deltaTime >= 1000) {
    performanceMonitor.currentFPS = (performanceMonitor.frameCount * 1000) / deltaTime;

    // Detectar bajo rendimiento
    if (performanceMonitor.currentFPS < FPS_THRESHOLD) {
      performanceMonitor.lowFPSCount++;
      console.log(`⚠️ Bajo rendimiento detectado: ${performanceMonitor.currentFPS.toFixed(1)} FPS (${performanceMonitor.lowFPSCount}/${LOW_FPS_CONSECUTIVE_CHECKS})`);

      // Aplicar optimizaciones si el rendimiento es consistentemente bajo
      if (performanceMonitor.lowFPSCount >= LOW_FPS_CONSECUTIVE_CHECKS && !performanceMonitor.optimizationApplied) {
        applyEmergencyOptimizations();
        performanceMonitor.optimizationApplied = true;
      }
    } else {
      // Restablecer contador si el rendimiento mejora
      if (performanceMonitor.lowFPSCount > 0) {
        console.log(`✅ Rendimiento recuperado: ${performanceMonitor.currentFPS.toFixed(1)} FPS`);
        performanceMonitor.lowFPSCount = 0;
      }

      // Remover optimizaciones de emergencia si el rendimiento es bueno
      if (performanceMonitor.optimizationApplied && performanceMonitor.currentFPS > FPS_THRESHOLD + 10) {
        removeEmergencyOptimizations();
        performanceMonitor.optimizationApplied = false;
      }
    }

    // Actualizar información de performance UI
    if (performanceInfo3D.value) {
      performanceInfo3D.value.fps = Math.round(performanceMonitor.currentFPS);

      // Estimar uso de memoria
      if (performance.memory) {
        performanceInfo3D.value.memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      }
    }

    // Reset para próximo ciclo
    performanceMonitor.frameCount = 0;
    performanceMonitor.lastCheck = currentTime;
  }

  performanceMonitor.frameCount++;
}

/**
 * Aplica optimizaciones de emergencia cuando el rendimiento es bajo
 */
function applyEmergencyOptimizations() {
  console.log('🚨 Aplicando optimizaciones de emergencia para mejorar rendimiento...');

  try {
    // 1. Reducir steps dramáticamente
    if (volumeMesh && volumeMesh.material && volumeMesh.material.uniforms) {
      const emergencySteps = 64; // Muy bajo para recuperar FPS
      volumeMesh.material.uniforms.steps.value = emergencySteps;
      currentSmoothedSteps.value = emergencySteps;
      console.log(`✅ Steps reducidos a ${emergencySteps} (modo emergencia)`);
    }

    // 2. Deshabilitar optimizaciones automáticas que consumen CPU
    if (zoomStepsEnabled.value) {
      zoomStepsEnabled.value = false;
      console.log('✅ Steps adaptativos deshabilitados (modo emergencia)');
    }

    // 3. Reducir calidad de renderizado
    if (renderer) {
      renderer.setPixelRatio(Math.min(0.5, window.devicePixelRatio));
      console.log('✅ Pixel ratio reducido (modo emergencia)');
    }

    // 4. Notificar al usuario
    showProfessionalNotification(
      '⚡ Optimización Automática',
      'Se han aplicado optimizaciones para mejorar el rendimiento. La calidad visual puede verse reducida temporalmente.',
      'warning'
    );

    console.log('✅ Optimizaciones de emergencia aplicadas exitosamente');
  } catch (error) {
    console.error('❌ Error aplicando optimizaciones de emergencia:', error);
  }
}

/**
 * Remueve las optimizaciones de emergencia cuando el rendimiento mejora
 */
function removeEmergencyOptimizations() {
  console.log('🎯 Removiendo optimizaciones de emergencia - rendimiento recuperado');

  try {
    // 1. Restaurar steps originales
    if (volumeMesh && volumeMesh.material && volumeMesh.material.uniforms) {
      const normalSteps = baseSteps.value || 256;
      volumeMesh.material.uniforms.steps.value = normalSteps;
      currentSmoothedSteps.value = normalSteps;
      console.log(`✅ Steps restaurados a ${normalSteps}`);
    }

    // 2. Reactivar optimizaciones automáticas
    if (mainView.value === '3d') {
      zoomStepsEnabled.value = true;
      console.log('✅ Steps adaptativos reactivados');
    }

    // 3. Restaurar calidad de renderizado
    if (renderer) {
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      console.log('✅ Pixel ratio restaurado');
    }

    // 4. Notificar al usuario
    showProfessionalNotification(
      '✅ Calidad Restaurada',
      'El rendimiento se ha recuperado. Se ha restaurado la calidad visual original.',
      'success'
    );

    console.log('✅ Optimizaciones de emergencia removidas exitosamente');
  } catch (error) {
    console.error('❌ Error removiendo optimizaciones de emergencia:', error);
  }
}

/**
 * Normaliza valores para archivos problemáticos (float32 con orientación RAS)
 * @param {number} value - Valor original
 * @param {number} min - Valor mínimo del dataset
 * @param {number} max - Valor máximo del dataset
 * @param {boolean} isProblematic - Si el archivo tiene problemas conocidos
 * @returns {number} - Valor normalizado para visualización
 */

// Variables globales para evitar logs repetitivos
let lastNormalizationLog = null;
let loggedStrategies = new Set();

function normalizeProblematicValue(value, min, max, isProblematic = false) {
  if (!isProblematic) {
    return applyWindowLevel(value)
  }

  // Validar entrada
  if (isNaN(value) || !isFinite(value)) {
    return 0
  }

  // Para archivos float32 problemáticos, aplicar normalización especial
  const range = max - min

  if (range === 0 || !isFinite(range)) {
    return 128 // Valor medio si no hay rango válido
  }

  // Log inteligente: solo una vez por estrategia por dataset
  const datasetKey = `${min.toFixed(6)}_${max.toFixed(6)}`;
  if (lastNormalizationLog !== datasetKey) {
    lastNormalizationLog = datasetKey;

    let strategy = '';
    if (min < 0 && max > 0) {
      strategy = 'datos centrados en cero';
    } else if (Math.abs(range) < 1) {
      strategy = 'datos pequeños normalizados';
    } else if (max < 1 && min >= 0) {
      strategy = 'datos [0-1]';
    } else if (range > 1000) {
      strategy = 'normalización logarítmica para rango amplio';
    } else {
      strategy = 'normalización estándar';
    }

    if (!loggedStrategies.has(strategy)) {
      console.log(`🎯 ESTRATEGIA FLOAT32: ${strategy} (min: ${min.toFixed(6)}, max: ${max.toFixed(6)}, range: ${range.toFixed(6)})`);
      loggedStrategies.add(strategy);
    }
  }

  // ESTRATEGIAS ESPECÍFICAS PARA DIFERENTES TIPOS DE DATOS FLOAT32 PROBLEMÁTICOS

  if (min < 0 && max > 0) {
    // Caso 1: Datos centrados en cero (ej: [-1.5, 2.3])
    // console.log('🎯 Aplicando normalización para datos centrados en cero') // REMOVIDO: causaba bucle infinito
    const normalized = (value - min) / range
    const result = Math.max(0, Math.min(255, Math.round(normalized * 255)))
    return result
  } else if (Math.abs(range) < 1) {
    // Caso 2: Datos muy pequeños normalizados (ej: [0.001, 0.999])
    // console.log('🎯 Aplicando normalización para datos pequeños normalizados') // REMOVIDO: causaba bucle infinito
    const normalized = (value - min) / range
    const result = Math.max(0, Math.min(255, Math.round(normalized * 255)))
    return result
  } else if (max < 1 && min >= 0) {
    // Caso 3: Datos en rango [0-1] típicos de algunos float32
    // console.log('🎯 Aplicando normalización para datos [0-1]') // REMOVIDO: causaba bucle infinito
    const result = Math.max(0, Math.min(255, Math.round(value * 255)))
    return result
  } else if (range > 1000) {
    // Caso 4: Rango muy amplio - aplicar compresión logarítmica
    // console.log('🎯 Aplicando normalización logarítmica para rango amplio') // REMOVIDO: causaba bucle infinito
    const logMin = Math.log(Math.max(1, Math.abs(min) + 1))
    const logMax = Math.log(Math.abs(max) + 1)
    const logValue = Math.log(Math.abs(value) + 1)
    const normalized = (logValue - logMin) / (logMax - logMin)
    const result = Math.max(0, Math.min(255, Math.round(normalized * 255)))
    return result
  } else {
    // Caso 5: Normalización estándar
    // console.log('🎯 Aplicando normalización estándar') // REMOVIDO: causaba bucle infinito
    const normalized = (value - min) / range
    const result = Math.max(0, Math.min(255, Math.round(normalized * 255)))
    return result
  }
}

/**
 * Obtiene información detallada sobre el tipo de datos médicos
 * @param {number} datatypeCode - Código del tipo de dato NIfTI
 * @param {number} min - Valor mínimo en los datos
 * @param {number} max - Valor máximo en los datos
 * @returns {object} - Información del tipo de datos
 */
function getDataTypeInfo(datatypeCode, min, max) {
  const range = max - min

  switch (datatypeCode) {
    case 2: // DT_UNSIGNED_CHAR
      return {
        name: 'uint8',
        description: 'Entero sin signo 8 bits',
        isInteger: true,
        recommendedWindow: Math.min(255, range),
        isOptimized: true
      }
    case 4: // DT_SIGNED_SHORT (int16)
      return {
        name: 'int16',
        description: 'Entero con signo 16 bits',
        isInteger: true,
        recommendedWindow: Math.min(65535, Math.max(1000, range)),
        isOptimized: true,
        notes: 'Tipo optimizado - común en DICOM y imágenes médicas'
      }
    case 16: // DT_FLOAT (float32)
      return {
        name: 'float32',
        description: 'Punto flotante 32 bits',
        isInteger: false,
        recommendedWindow: range > 1000 ? Math.min(4000, range) : Math.max(1, range),
        isOptimized: true,
        notes: 'Tipo optimizado - valores de alta precisión'
      }
    case 512: // DT_UINT16
      return {
        name: 'uint16',
        description: 'Entero sin signo 16 bits',
        isInteger: true,
        recommendedWindow: Math.min(65535, range),
        isOptimized: true
      }
    default:
      return {
        name: `unknown_${datatypeCode}`,
        description: `Tipo desconocido (${datatypeCode})`,
        isInteger: false,
        recommendedWindow: 255,
        isOptimized: false,
        notes: 'Usando configuración por defecto'
      }
  }
}

/**
 * Aplica window/level a un valor de pixel con soporte optimizado para int16 y float32
 * @param {number} value - Valor del pixel
 * @returns {number} - Valor ajustado (0-255)
 */
function applyWindowLevel(value) {
  const half = windowLevel.window / 2
  const min = windowLevel.level - half
  const max = windowLevel.level + half

  // Debug temporal - log algunos valores para verificar
  if (Math.random() < 0.0001) { // Solo log ocasional
    console.log(`🔧 applyWindowLevel: value=${value}, window=${windowLevel.window}, level=${windowLevel.level}, min=${min}, max=${max}`)
  }

  // Manejo optimizado para diferentes rangos de datos
  if (value <= min) return 0
  if (value >= max) return 255

  // CORRECCIÓN ESPECIAL PARA DATOS FLOAT32 PROBLEMÁTICOS
  // Si la ventana es muy pequeña (datos normalizados), usar escalado mejorado
  if (windowLevel.window < 1) {
    // Para datos float32 normalizados [0-1] o similares
    const normalized = Math.max(0, Math.min(1, (value - min) / windowLevel.window))
    return Math.round(normalized * 255)
  }

  // Calcular con mayor precisión para evitar pérdida de información
  const normalized = (value - min) / windowLevel.window
  const scaled = normalized * 255

  // Usar Math.round para mejor distribución de intensidades
  const result = Math.max(0, Math.min(255, Math.round(scaled)))

  // Debug temporal para valores intermedios
  if (Math.random() < 0.0001) {
    console.log(`🔧 applyWindowLevel result: ${value} -> ${result} (normalized: ${normalized}, scaled: ${scaled})`)
  }

  return result
}

/**
 * Dibuja la vista principal seleccionada en el canvas central
 * Maneja zoom, aplicación de window/level y renderizado de mediciones
 */
function drawMainView() {
  if (!volumeData || !canvasMain.value) return

  // 🛡️ VALIDACIÓN CRÍTICA: Verificar que el canvas tenga dimensiones válidas
  if (canvasMain.value.width <= 0 || canvasMain.value.height <= 0) {
    console.warn(`⚠️ drawMainView: Canvas con tamaño inválido ${canvasMain.value.width}x${canvasMain.value.height}, sincronizando...`)
    syncCanvasSize(canvasMain.value)

    // Si después de sincronizar sigue siendo inválido, salir
    if (canvasMain.value.width <= 0 || canvasMain.value.height <= 0) {
      console.error(`❌ drawMainView: No se pudo corregir el tamaño del canvas`)
      return
    }
  }

  const ctx = canvasMain.value.getContext('2d')

  // Resetear completamente las transformaciones antes de comenzar
  ctx.resetTransform()
  ctx.save()
  ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height)

  // Log para debug de dimensiones del canvas (optimizado)
  logger.sample(`🖼️ Canvas dimensions: ${canvasMain.value.width}x${canvasMain.value.height}`, 0.01)
  logger.sample(`🖼️ Redibujando con zoom focal: ${(zoomLevel.value * 100).toFixed(0)}% en (${zoomOrigin.value.x}, ${zoomOrigin.value.y})`, 0.01)

  let imageData, w, h, sliceIndex

  switch (mainView.value) {
    case 'axial':
      w = width
      h = height
      sliceIndex = parseInt(currentSlices.axial)
      imageData = ctx.createImageData(w, h)

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = x + y * width + sliceIndex * width * height
          let value = volumeData[idx] || 0
          const pixelIndex = (x + y * w) * 4

          if (currentModality.value === 'seg' || showSegmentation.value) {
            switch (value) {
              case 50: // Necrotic core - Rojo
                imageData.data[pixelIndex] = 255
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
                break
              case 150: // Edema - Verde
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 255
                imageData.data[pixelIndex + 2] = 0
                break
              case 250: // Enhancing tumor - Azul
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 255
                break
              default: // Fondo
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
            }
          } else {
            value = applyWindowLevel(value)
            imageData.data[pixelIndex] = value
            imageData.data[pixelIndex + 1] = value
            imageData.data[pixelIndex + 2] = value
          }

          imageData.data[pixelIndex + 3] = 255
        }
      }
      break

    case 'coronal':
      w = width
      h = depth
      sliceIndex = parseInt(currentSlices.coronal)
      imageData = ctx.createImageData(w, h)

      for (let z = 0; z < h; z++) {
        for (let x = 0; x < w; x++) {
          const idx = x + sliceIndex * width + z * width * height
          let value = volumeData[idx] || 0
          const pixelIndex = (x + z * w) * 4

          if (currentModality.value === 'seg' || showSegmentation.value) {
            switch (value) {
              case 50: // Necrotic core - Rojo
                imageData.data[pixelIndex] = 255
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
                break
              case 150: // Edema - Verde
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 255
                imageData.data[pixelIndex + 2] = 0
                break
              case 250: // Enhancing tumor - Azul
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 255
                break
              default: // Fondo
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
            }
          } else {
            value = applyWindowLevel(value)
            imageData.data[pixelIndex] = value
            imageData.data[pixelIndex + 1] = value
            imageData.data[pixelIndex + 2] = value
          }

          imageData.data[pixelIndex + 3] = 255
        }
      }
      break

    case 'sagittal':
      w = height
      h = depth
      sliceIndex = parseInt(currentSlices.sagittal)
      imageData = ctx.createImageData(w, h)

      for (let z = 0; z < h; z++) {
        for (let y = 0; y < w; y++) {
          const idx = sliceIndex + y * width + z * width * height
          let value = volumeData[idx] || 0
          const pixelIndex = (y + z * w) * 4

          if (currentModality.value === 'seg' || showSegmentation.value) {
            switch (value) {
              case 50:
                imageData.data[pixelIndex] = 255
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
                break
              case 150:
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 255
                imageData.data[pixelIndex + 2] = 0
                break
              case 250:
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 255
                break
              default:
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
            }
          } else {
            value = applyWindowLevel(value)
            imageData.data[pixelIndex] = value
            imageData.data[pixelIndex + 1] = value
            imageData.data[pixelIndex + 2] = value
          }

          imageData.data[pixelIndex + 3] = 255
        }
      }
      break
  }

  if (imageData) {
    // === APLICAR MEJORAS AUTOMÁTICAS ===
    imageData = applyImageEnhancements(imageData)
    // 🚀 OPTIMIZACIÓN CRÍTICA: Usar pool de canvas para evitar memory leaks
    const tempCanvas = canvasPool.getCanvas(w, h)
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(imageData, 0, 0)

    // Usar las dimensiones reales del canvas en lugar de valores fijos
    const canvasWidth = canvasMain.value.width
    const canvasHeight = canvasMain.value.height

    // 🛡️ VALIDACIÓN CRÍTICA: Verificar que las dimensiones sean válidas antes del escalado
    if (canvasWidth <= 0 || canvasHeight <= 0) {
      console.error(`❌ drawMainView: Canvas con dimensiones inválidas en punto de escalado: ${canvasWidth}x${canvasHeight}`)
      canvasPool.releaseCanvas(tempCanvas) // Liberar el canvas temporal
      return
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // ===== CONFIGURACIÓN DE CALIDAD DE RENDERIZADO =====
    // Para mejores resultados visuales, habilitar suavizado de alta calidad
    if (imageEnhancementEnabled.value) {
      console.log('🎨 Activando renderizado de alta calidad con suavizado')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    } else {
      // Mantener renderizado pixelado para visualización médica tradicional
      ctx.imageSmoothingEnabled = false
    }

    // APLICAR ZOOM FOCAL - GUARDAR ESTADO ANTES
    ctx.save()
    if (zoomLevel.value !== 1) {
      // Aplicar translación del zoom focal
      ctx.translate(zoomTranslate.value.x, zoomTranslate.value.y)

      // Escalar desde el punto focal
      ctx.translate(zoomOrigin.value.x, zoomOrigin.value.y)
      ctx.scale(zoomLevel.value, zoomLevel.value)
      ctx.translate(-zoomOrigin.value.x, -zoomOrigin.value.y)
    }

    const scaleX = canvasWidth / w
    const scaleY = canvasHeight / h
    const scale = Math.min(scaleX, scaleY) // Usar 100% del espacio para visualización sin contornos

    const scaledW = w * scale
    const scaledH = h * scale
    let offsetX = (canvasWidth - scaledW) / 2
    let offsetY = (canvasHeight - scaledH) / 2

    // Log para debug del escalado
    console.log(`📏 Escalado: imagen ${w}x${h} -> ${scaledW.toFixed(0)}x${scaledH.toFixed(0)} en canvas ${canvasWidth}x${canvasHeight}`)

    // ===== APLICAR CORRECCIÓN DE ORIENTACIÓN 2D =====
    // PROBLEMA: Las imágenes 2D siempre aparecen de cabeza, independientemente de la orientación
    // SOLUCIÓN: Aplicar flip vertical universal para corregir la visualización 2D
    console.log('🔄 Aplicando corrección de orientación 2D (flip vertical universal)')

    ctx.save() // Guardar estado antes de transformaciones

    // Trasladar al centro de la imagen para hacer el flip
    ctx.translate(offsetX + scaledW / 2, offsetY + scaledH / 2)

    // Aplicar flip vertical (escala Y negativa)
    ctx.scale(1, -1)

    // Dibujar la imagen centrada (offset negativo porque ya estamos en el centro)
    ctx.drawImage(tempCanvas, -scaledW / 2, -scaledH / 2, scaledW, scaledH)

    ctx.restore() // Restaurar estado original

    drawCrosshairs(ctx, canvasWidth, canvasHeight, offsetX, offsetY, scaledW, scaledH, mainView.value)

    // DIBUJAR MEDICIONES ANTES DEL RESTORE para que hereden las transformaciones de zoom
    // Dibujar medición actual si corresponde a la vista y slice actual
    if (
      currentMeasurement.value.view === mainView.value &&
      currentMeasurement.value.slice === getCurrentSliceForMainView() &&
      currentMeasurement.value.points.length === 2
    ) {
      const p1 = currentMeasurement.value.points[0]
      const p2 = currentMeasurement.value.points[1]

      // Convertir coordenadas relativas a píxeles del canvas actual
      const px1 = {
        x: p1.x * canvasWidth,
        y: p1.y * canvasHeight
      };
      const px2 = {
        x: p2.x * canvasWidth,
        y: p2.y * canvasHeight
      };

      ctx.save()
      // Dibujar línea de medición
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px1.x, px1.y)
      ctx.lineTo(px2.x, px2.y)
      ctx.stroke()

      // Dibujar puntos de inicio y fin
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.arc(px1.x, px1.y, 3, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(px2.x, px2.y, 3, 0, 2 * Math.PI)
      ctx.fill()

      // Calcular posición del texto (punto medio de la línea)
      const midX = (px1.x + px2.x) / 2
      const midY = (px1.y + px2.y) / 2

      // Preparar información de la medición
      const currentSlice = getCurrentSliceForMainView()
      const modalityName = selectedModality.value ? modalityDisplayNames[selectedModality.value] : 'N/A'
      const viewName = mainView.value === 'axial' ? 'Axial' :
        mainView.value === 'sagittal' ? 'Sagital' : 'Coronal'

      let measureText = `${measuredDistance.value} px`
      if (measuredDistanceMm.value) {
        measureText += ` (${measuredDistanceMm.value} mm)`
      }

      const infoText = `${viewName} - Slice ${currentSlice} - ${modalityName}`

      // Configurar estilo del texto
      ctx.font = '12px Arial'
      ctx.fillStyle = 'white'
      ctx.strokeStyle = 'black'
      ctx.lineWidth = 3

      // Medir ancho del texto para centrar
      const measureWidth = ctx.measureText(measureText).width
      const infoWidth = ctx.measureText(infoText).width
      const maxWidth = Math.max(measureWidth, infoWidth)

      // Dibujar fondo semi-transparente
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(midX - maxWidth / 2 - 5, midY - 25, maxWidth + 10, 35)

      // Dibujar texto de medida con borde
      ctx.strokeText(measureText, midX - measureWidth / 2, midY - 8)
      ctx.fillStyle = 'yellow'
      ctx.fillText(measureText, midX - measureWidth / 2, midY - 8)

      // Dibujar texto de información con borde
      ctx.strokeText(infoText, midX - infoWidth / 2, midY + 8)
      ctx.fillStyle = 'white'
      ctx.fillText(infoText, midX - infoWidth / 2, midY + 8)

      ctx.restore()
    }

    // Dibujar todas las mediciones guardadas que correspondan a la vista y slice actual
    measurements.value.forEach((m) => {
      if (
        m.view === mainView.value &&
        m.slice === getCurrentSliceForMainView() &&
        m.points.length === 2
      ) {
        const p1 = m.points[0]
        const p2 = m.points[1]

        // Convertir coordenadas relativas a píxeles del canvas actual
        const px1 = {
          x: p1.x * canvasWidth,
          y: p1.y * canvasHeight
        };
        const px2 = {
          x: p2.x * canvasWidth,
          y: p2.y * canvasHeight
        };

        ctx.save()
        // Dibujar línea de medición (color ligeramente diferente para mediciones guardadas)
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(px1.x, px1.y)
        ctx.lineTo(px2.x, px2.y)
        ctx.stroke()

        // Dibujar puntos de inicio y fin
        ctx.fillStyle = '#ff6b6b'
        ctx.beginPath()
        ctx.arc(px1.x, px1.y, 3, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px2.x, px2.y, 3, 0, 2 * Math.PI)
        ctx.fill()

        // Mostrar información de medición guardada (opcional, para no saturar la vista)
        if (measurements.value.length <= 3) { // Solo mostrar texto si hay pocas mediciones
          const midX = (p1.x + p2.x) / 2
          const midY = (p1.y + p2.y) / 2

          ctx.font = '10px Arial'
          ctx.fillStyle = 'white'
          ctx.strokeStyle = 'black'
          ctx.lineWidth = 2

          let measureText = `${m.distance} px`
          if (m.distanceMm) {
            measureText += ` (${m.distanceMm} mm)`
          }

          const textWidth = ctx.measureText(measureText).width

          // Fondo semi-transparente
          ctx.fillStyle = 'rgba(255, 107, 107, 0.8)'
          ctx.fillRect(midX - textWidth / 2 - 3, midY - 15, textWidth + 6, 15)

          // Texto con borde
          ctx.strokeText(measureText, midX - textWidth / 2, midY - 5)
          ctx.fillStyle = 'white'
          ctx.fillText(measureText, midX - textWidth / 2, midY - 5)
        }

        ctx.restore()
      }
    })

    // RESTAURAR ESTADO DESPUÉS DEL DIBUJO CON ZOOM Y MEDICIONES
    ctx.restore()
  }
}

/**
 * Dibuja la vista original duplicada en el canvas de la doble vista
 * Es una réplica exacta del canvas principal pero en tamaño reducido
 */
function drawDoubleOriginalView() {
  logger.debug('📋 drawDoubleOriginalView iniciada')
  logger.sample('📋 canvasDoubleOriginal.value:', !!canvasDoubleOriginal.value, 0.01)
  logger.sample('📋 volumeData:', !!volumeData, 0.01)
  logger.sample('📋 showOriginalImage:', showOriginalImage.value, 0.01)
  logger.sample('📋 uploadedFiles:', uploadedFiles.value.length, 0.01)
  logger.sample('📋 zoomLevel:', zoomLevel.value, 0.01)
  logger.sample('📋 measurements:', measurements.value.length, 0.01)
  logger.sample('📋 currentMeasurement activo:', !!currentMeasurement.value.points.length, 0.01)

  if (!canvasDoubleOriginal.value) {
    console.log('📋 ❌ Canvas doble no disponible')
    return
  }

  const ctx = canvasDoubleOriginal.value.getContext('2d')

  // Resetear completamente las transformaciones antes de comenzar
  ctx.resetTransform()
  ctx.save()
  ctx.clearRect(0, 0, canvasDoubleOriginal.value.width, canvasDoubleOriginal.value.height)

  // Si no hay datos volumétricos, mostrar imagen estática como placeholder
  if (!volumeData) {
    console.log('📋 No hay datos volumétricos - mostrando imagen estática en vista doble')

    // Usar la imagen de posgrado (la misma que se ve en la vista principal)
    const img = new Image()
    img.onload = () => {
      console.log('📋 Imagen placeholder cargada para vista doble')
      // Centrar la imagen en el canvas manteniendo proporción
      const scale = Math.min(300 / img.width, 256 / img.height)
      const scaledW = img.width * scale
      const scaledH = img.height * scale
      const offsetX = (300 - scaledW) / 2
      const offsetY = (256 - scaledH) / 2

      ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH)
      console.log('📋 ✅ Imagen placeholder dibujada en vista doble')
    }
    img.onerror = () => {
      console.log('📋 ❌ Error cargando imagen placeholder para vista doble')
      // Como fallback, dibujar un rectángulo con texto
      ctx.fillStyle = '#2a2a2a'
      ctx.fillRect(0, 0, 300, 256)
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Imagen Original', 150, 128)
    }
    // Usar la imagen de cerebro que se ve en la vista principal
    img.src = pruebascerebrloImage

    ctx.restore()
    return
  }

  console.log('📋 Dibujando vista doble con datos volumétricos reales')

  // Aplicar zoom focal proporcional (mismo que canvas principal pero escalado)
  if (zoomLevel.value !== 1) {
    console.log('📋 🔍 Aplicando zoom en vista doble:', zoomLevel.value)
    console.log('📋 🔍 zoomTranslate:', zoomTranslate.value)
    console.log('📋 🔍 zoomOrigin:', zoomOrigin.value)

    // Escalar las transformaciones proporcionalmente al tamaño del canvas
    const scaleFactorX = canvasDoubleOriginal.value.width / 1000  // Canvas doble es más pequeño
    const scaleFactorY = canvasDoubleOriginal.value.height / 700

    // Aplicar translación acumulada escalada
    ctx.translate(zoomTranslate.value.x * scaleFactorX, zoomTranslate.value.y * scaleFactorY)

    // Mover origen al punto de zoom escalado
    ctx.translate(zoomOrigin.value.x * scaleFactorX, zoomOrigin.value.y * scaleFactorY)

    // Aplicar escala
    ctx.scale(zoomLevel.value, zoomLevel.value)

    // Regresar origen escalado
    ctx.translate(-zoomOrigin.value.x * scaleFactorX, -zoomOrigin.value.y * scaleFactorY)

    console.log('📋 ✅ Zoom aplicado en vista doble')
  } else {
    console.log('📋 Sin zoom en vista doble (zoomLevel = 1)')
  }

  let imageData, w, h, sliceIndex

  switch (mainView.value) {
    case 'axial':
      w = width
      h = height
      sliceIndex = parseInt(currentSlices.axial)
      imageData = ctx.createImageData(w, h)

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = x + y * width + sliceIndex * width * height
          let value = volumeData[idx] || 0
          const pixelIndex = (x + y * w) * 4

          if (currentModality.value === 'seg' || showSegmentation.value) {
            switch (value) {
              case 50: // Necrotic core - Rojo
                imageData.data[pixelIndex] = 255
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
                break
              case 150: // Edema - Verde
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 255
                imageData.data[pixelIndex + 2] = 0
                break
              case 250: // Enhancing tumor - Azul
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 255
                break
              default: // Fondo
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
            }
          } else {
            value = applyWindowLevel(value)
            imageData.data[pixelIndex] = value
            imageData.data[pixelIndex + 1] = value
            imageData.data[pixelIndex + 2] = value
          }

          imageData.data[pixelIndex + 3] = 255
        }
      }
      break

    case 'coronal':
      w = width
      h = depth
      sliceIndex = parseInt(currentSlices.coronal)
      imageData = ctx.createImageData(w, h)

      for (let z = 0; z < h; z++) {
        for (let x = 0; x < w; x++) {
          const idx = x + sliceIndex * width + z * width * height
          let value = volumeData[idx] || 0
          const pixelIndex = (x + z * w) * 4

          if (currentModality.value === 'seg' || showSegmentation.value) {
            switch (value) {
              case 50: // Necrotic core - Rojo
                imageData.data[pixelIndex] = 255
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
                break
              case 150: // Edema - Verde
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 255
                imageData.data[pixelIndex + 2] = 0
                break
              case 250: // Enhancing tumor - Azul
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 255
                break
              default: // Fondo
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
            }
          } else {
            value = applyWindowLevel(value)
            imageData.data[pixelIndex] = value
            imageData.data[pixelIndex + 1] = value
            imageData.data[pixelIndex + 2] = value
          }

          imageData.data[pixelIndex + 3] = 255
        }
      }
      break

    case 'sagittal':
      w = height
      h = depth
      sliceIndex = parseInt(currentSlices.sagittal)
      imageData = ctx.createImageData(w, h)

      for (let z = 0; z < h; z++) {
        for (let y = 0; y < w; y++) {
          const idx = sliceIndex + y * width + z * width * height
          let value = volumeData[idx] || 0
          const pixelIndex = (y + z * w) * 4

          if (currentModality.value === 'seg' || showSegmentation.value) {
            switch (value) {
              case 50:
                imageData.data[pixelIndex] = 255
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
                break
              case 150:
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 255
                imageData.data[pixelIndex + 2] = 0
                break
              case 250:
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 255
                break
              default:
                imageData.data[pixelIndex] = 0
                imageData.data[pixelIndex + 1] = 0
                imageData.data[pixelIndex + 2] = 0
            }
          } else {
            value = applyWindowLevel(value)
            imageData.data[pixelIndex] = value
            imageData.data[pixelIndex + 1] = value
            imageData.data[pixelIndex + 2] = value
          }

          imageData.data[pixelIndex + 3] = 255
        }
      }
      break
  }

  if (imageData) {
    // === APLICAR MEJORAS AUTOMÁTICAS ===
    imageData = applyImageEnhancements(imageData)
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = w
    tempCanvas.height = h
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(imageData, 0, 0)

    ctx.clearRect(0, 0, 450, 384)

    // ===== CONFIGURACIÓN DE CALIDAD PARA VISTA DOBLE =====
    if (imageEnhancementEnabled.value) {
      console.log('📋 Vista doble: activando renderizado de alta calidad')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    } else {
      ctx.imageSmoothingEnabled = false
    }

    // Ya no aplicamos zoom aquí porque ya se aplicó al principio de la función
    ctx.save()

    const scaleX = 440 / w
    const scaleY = 374 / h
    const scale = Math.min(scaleX, scaleY)

    const scaledW = w * scale
    const scaledH = h * scale
    let offsetX = (440 - scaledW) / 2
    let offsetY = (374 - scaledH) / 2

    // ===== APLICAR CORRECCIÓN DE ORIENTACIÓN 2D EN VISTA DOBLE =====
    console.log('🔄 Aplicando corrección de orientación 2D en vista doble (flip vertical)')

    ctx.save() // Guardar estado antes de transformaciones

    // Trasladar al centro de la imagen para hacer el flip
    ctx.translate(offsetX + scaledW / 2, offsetY + scaledH / 2)

    // Aplicar flip vertical (escala Y negativa)
    ctx.scale(1, -1)

    // Dibujar la imagen centrada
    ctx.drawImage(tempCanvas, -scaledW / 2, -scaledH / 2, scaledW, scaledH)

    ctx.restore() // Restaurar estado original

    // Dibujar crosshairs adaptados al tamaño reducido
    drawCrosshairs(ctx, 450, 384, offsetX, offsetY, scaledW, scaledH)

    // Dibujar medición actual si corresponde a la vista y slice actual (ANTES del restore)
    if (
      currentMeasurement.value.view === mainView.value &&
      currentMeasurement.value.slice === getCurrentSliceForMainView() &&
      currentMeasurement.value.points.length === 2
    ) {
      console.log('📋 📏 Dibujando medición actual en vista doble')

      // Convertir coordenadas relativas a píxeles del canvas doble (450x384)
      const canvasWidth = 450;
      const canvasHeight = 384;
      const p1 = {
        x: currentMeasurement.value.points[0].x * canvasWidth,
        y: currentMeasurement.value.points[0].y * canvasHeight
      };
      const p2 = {
        x: currentMeasurement.value.points[1].x * canvasWidth,
        y: currentMeasurement.value.points[1].y * canvasHeight
      };

      // Dibujar línea de medición
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()

      // Dibujar puntos de inicio y fin (más pequeños)
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.arc(p1.x, p1.y, 2, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p2.x, p2.y, 2, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Dibujar todas las mediciones guardadas correspondientes a la vista y slice actual (ANTES del restore)
    console.log('📋 📏 Verificando mediciones guardadas:', measurements.value.length)
    measurements.value.forEach((m, index) => {
      if (
        m.view === mainView.value &&
        m.slice === getCurrentSliceForMainView() &&
        m.points.length === 2
      ) {
        console.log(`📋 📏 Dibujando medición guardada ${index} en vista doble`)

        // Convertir coordenadas relativas a píxeles del canvas doble (450x384)
        const canvasWidth = 450;
        const canvasHeight = 384;
        const p1 = {
          x: m.points[0].x * canvasWidth,
          y: m.points[0].y * canvasHeight
        };
        const p2 = {
          x: m.points[1].x * canvasWidth,
          y: m.points[1].y * canvasHeight
        };

        // Dibujar línea de medición (color ligeramente diferente para mediciones guardadas)
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()

        // Dibujar puntos de inicio y fin (más pequeños)
        ctx.fillStyle = '#ff6b6b'
        ctx.beginPath()
        ctx.arc(p1.x, p1.y, 2, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p2.x, p2.y, 2, 0, 2 * Math.PI)
        ctx.fill()
      }
    })

    // RESTAURAR ESTADO
    ctx.restore()

    // 🚀 OPTIMIZACIÓN CRÍTICA: Liberar canvas temporal para evitar memory leaks
    canvasPool.releaseCanvas(tempCanvas)
  }

  // Restaurar el contexto del canvas principal
  ctx.restore()
}

/**
 * Dibuja el canvas de diagnóstico en la doble vista
 * Replica exactamente lo que hace la pestaña Diagnóstico IA
 */
function drawDoubleDiagnosisView() {
  if (!canvasDoubleDiagnosis.value || !volumeData || !segmentedImageData.value) return

  const canvas = canvasDoubleDiagnosis.value
  const ctx = canvas.getContext('2d')

  // Sincronizar tamaño del canvas con su contenedor
  syncCanvasSize(canvas)

  ctx.resetTransform()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 1. Dibujar la imagen original (misma lógica que drawMainView)
  const currentView = mainView.value
  let w, h, sliceIndex, imageData

  if (currentView === 'axial') {
    w = width; h = height; sliceIndex = parseInt(currentSlices.axial)
  } else if (currentView === 'coronal') {
    w = width; h = depth; sliceIndex = parseInt(currentSlices.coronal)
  } else {
    w = height; h = depth; sliceIndex = parseInt(currentSlices.sagittal)
  }

  imageData = ctx.createImageData(w, h)

  if (currentView === 'axial') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = x + y * width + sliceIndex * width * height
        const value = applyWindowLevel(volumeData[idx] || 0)
        const p = (x + y * w) * 4
        imageData.data[p] = value
        imageData.data[p + 1] = value
        imageData.data[p + 2] = value
        imageData.data[p + 3] = 255
      }
    }
  } else if (currentView === 'coronal') {
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const idx = x + sliceIndex * width + z * width * height
        const value = applyWindowLevel(volumeData[idx] || 0)
        const p = (x + z * w) * 4
        imageData.data[p] = value
        imageData.data[p + 1] = value
        imageData.data[p + 2] = value
        imageData.data[p + 3] = 255
      }
    }
  } else {
    for (let z = 0; z < h; z++) {
      for (let y = 0; y < w; y++) {
        const idx = sliceIndex + y * width + z * width * height
        const value = applyWindowLevel(volumeData[idx] || 0)
        const p = (y + z * w) * 4
        imageData.data[p] = value
        imageData.data[p + 1] = value
        imageData.data[p + 2] = value
        imageData.data[p + 3] = 255
      }
    }
  }

  // Aplicar mejoras de imagen
  const enhancedData = applyImageEnhancements(imageData)

  // Dibujar imagen base con flip vertical (igual que drawMainView)
  const tempCanvas = canvasPool.getCanvas(w, h)
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.putImageData(enhancedData, 0, 0)

  const scaleX = canvas.width / w
  const scaleY = canvas.height / h
  const scale = Math.min(scaleX, scaleY)
  const scaledW = w * scale
  const scaledH = h * scale
  const offsetX = (canvas.width - scaledW) / 2
  const offsetY = (canvas.height - scaledH) / 2

  ctx.save()
  ctx.translate(offsetX + scaledW / 2, offsetY + scaledH / 2)
  ctx.scale(1, -1)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tempCanvas, -scaledW / 2, -scaledH / 2, scaledW, scaledH)
  ctx.restore()
  canvasPool.releaseCanvas(tempCanvas)

  // 2. Aplicar overlay de segmentación (igual que applySegmentationOverlay)
  applySegmentationOverlay(ctx, canvas)
}


/**
 * Dibuja crosshairs (líneas de referencia) en el canvas
 * Muestra líneas perpendiculares centradas en la imagen
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {number} canvasWidth - Ancho del canvas
 * @param {number} canvasHeight - Alto del canvas
 * @param {number} offsetX - Desplazamiento horizontal de la imagen
 * @param {number} offsetY - Desplazamiento vertical de la imagen
 * @param {number} imgWidth - Ancho de la imagen escalada
 * @param {number} imgHeight - Alto de la imagen escalada
 * @param {string} viewType - Tipo de vista: 'axial', 'coronal', 'sagittal'
 */
function drawCrosshairs(ctx, canvasWidth, canvasHeight, offsetX = 0, offsetY = 0, imgWidth = canvasWidth, imgHeight = canvasHeight, viewType = null) {
  if (!showCrosshairs.value) return

  ctx.strokeStyle = getMainViewColor()

  // Adaptar el grosor de línea según el tamaño del canvas
  const baseLineWidth = Math.min(canvasWidth, canvasHeight) / 200
  ctx.lineWidth = Math.max(1, Math.min(3, baseLineWidth))

  // Configurar líneas para mejor visibilidad
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.8

  ctx.beginPath()

  // Si hay un viewType especificado, usar posición personalizada
  let centerX, centerY
  if (viewType && crosshairPositions[viewType]) {
    centerX = offsetX + imgWidth * crosshairPositions[viewType].x
    centerY = offsetY + imgHeight * crosshairPositions[viewType].y
  } else {
    // Por defecto, centrar en la imagen
    centerX = offsetX + imgWidth / 2
    centerY = offsetY + imgHeight / 2
  }

  // Línea vertical
  ctx.moveTo(centerX, offsetY)
  ctx.lineTo(centerX, offsetY + imgHeight)

  // Línea horizontal
  ctx.moveTo(offsetX, centerY)
  ctx.lineTo(offsetX + imgWidth, centerY)

  ctx.stroke()

  // Restaurar configuración original
  ctx.globalAlpha = 1.0
  ctx.lineCap = 'butt'
}

// ================================
// FUNCIONES DEL WEB WORKER PARA PROCESAMIENTO DE IMÁGENES
// ================================

/**
 * Aplica filtro de Web Worker con configuración específica
 */
async function applyWebWorkerFilter(type, imageData) {
  console.log(`🔧 applyWebWorkerFilter: ${type}`)

  const settings = webWorkerSettings[type]

  try {
    let result = null

    switch (type) {
      case 'sharpening':
        result = await imageProcessingWorker.handleSharpeningFilter(imageData, settings.strength)
        break
      case 'denoising':
        result = await imageProcessingWorker.handleDenoisingFilter(imageData, settings.strength)
        break
      case 'edgeDetection':
        result = await imageProcessingWorker.handleEdgeDetection(imageData, settings.threshold, settings.method)
        break
      case 'medicalEnhancement':
        result = await imageProcessingWorker.handleMedicalEnhancement(imageData, settings.preset, {
          contrast: settings.contrast,
          brightness: settings.brightness
        })
        break
      case 'histogramEqualization':
        result = await imageProcessingWorker.handleHistogramEqualization(imageData)
        break
      default:
        console.warn(`⚠️ Tipo de filtro no reconocido: ${type}, usando filtro interno`)
        return applyInternalFilter(type, imageData, settings)
    }

    if (result && result.data) {
      return new ImageData(
        new Uint8ClampedArray(result.data),
        result.width,
        result.height
      )
    }

    console.warn(`⚠️ Resultado inválido del worker para ${type}, usando filtro interno`)
    return applyInternalFilter(type, imageData, settings)

  } catch (error) {
    console.error(`💥 Error aplicando filtro ${type} en worker:`, error)
    return applyInternalFilter(type, imageData, settings)
  }
}

/**
 * Aplica filtros internos como fallback
 */
function applyInternalFilter(type, imageData, settings) {
  console.log(`🔄 Usando filtro interno para: ${type}`)

  try {
    switch (type) {
      case 'sharpening':
        return applySharpeningFilter(imageData, settings.strength, false)
      case 'denoising':
        return applyDenoising(imageData, settings.strength)
      case 'edgeDetection':
        // Implementar detección de bordes real
        return applyEdgeDetection(imageData, settings.threshold, settings.method)
      case 'medicalEnhancement': {
        console.log('🏥 Aplicando mejora médica:', settings)

        try {
          // ✅ VERIFICAR DATOS DE ENTRADA
          const hasValidInput = Array.from(imageData.data).some((value, index) =>
            index % 4 !== 3 && value > 0
          )

          if (!hasValidInput) {
            console.error('❌ Datos de entrada inválidos para mejora médica')
            return imageData
          }

          // Usar las mejoras internas con validaciones
          const enhanced = applyContrastBrightness(imageData, settings.contrast, settings.brightness)

          // ✅ VERIFICAR DATOS DESPUÉS DE CONTRASTE/BRILLO
          const hasValidContrast = Array.from(enhanced.data).some((value, index) =>
            index % 4 !== 3 && value > 0
          )

          if (!hasValidContrast) {
            console.error('❌ Datos inválidos después de contraste/brillo, retornando imagen original')
            return imageData
          }

          const result = applyHistogramEqualization(enhanced)

          // ✅ VERIFICAR RESULTADO FINAL
          const hasValidResult = Array.from(result.data).some((value, index) =>
            index % 4 !== 3 && value > 0
          )

          if (!hasValidResult) {
            console.error('❌ Resultado final es negro, retornando imagen original')
            return imageData
          }

          console.log('✅ Mejora médica aplicada correctamente')
          return result

        } catch (error) {
          console.error('❌ Error en mejora médica:', error)
          return imageData
        }
      }
      case 'histogramEqualization': {
        try {
          return applyHistogramEqualization(imageData)
        } catch (error) {
          console.error('❌ Error en ecualización de histograma:', error)
          return imageData
        }
      }
      default:
        console.log(`⚠️ Filtro interno no disponible para: ${type}`)
        return imageData
    }
  } catch (error) {
    console.error(`💥 Error en filtro interno ${type}:`, error)
    return imageData
  }
}

/**
 * Aplica todos los filtros Web Worker habilitados
 */
async function applyAllWebWorkerFilters(imageData) {
  console.log('🎯 applyAllWebWorkerFilters iniciado con imageData:', imageData.width + 'x' + imageData.height)
  let processedData = imageData

  for (const [filterType, settings] of Object.entries(webWorkerSettings)) {
    if (settings.enabled) {
      console.log(`🔧 Aplicando filtro: ${filterType}`, settings)
      try {
        processedData = await applyWebWorkerFilter(filterType, processedData)
        console.log(`✅ Filtro ${filterType} aplicado exitosamente`)
      } catch (error) {
        console.error(`❌ Error en filtro ${filterType}:`, error)
        // Continuar con otros filtros aunque uno falle
      }
    }
  }

  console.log('✨ Todos los filtros procesados')
  return processedData
}

/**
 * Actualiza la imagen con filtros Web Worker
 */
async function updateImageWithWebWorkerFilters() {
  // ✅ PREVENIR DOBLE EJECUCIÓN
  if (isFilterProcessing.value) {
    console.log('⏸️ Filtro ya en proceso, cancelando duplicado')
    return
  }

  // Limpiar timer anterior
  if (filterDebounceTimer.value) {
    clearTimeout(filterDebounceTimer.value)
  }

  // Debounce de 100ms
  filterDebounceTimer.value = setTimeout(async () => {
    isFilterProcessing.value = true

    try {
      console.log('🔄 updateImageWithWebWorkerFilters iniciado')
      console.log('📊 volumeData:', !!volumeData)
      console.log('⏳ isImageProcessing:', isImageProcessing.value)
      console.log('🎛️ webWorkerSettings:', webWorkerSettings)

      if (!volumeData || isImageProcessing.value) {
        console.log('❌ Saliendo - sin volumeData o procesando')
        return
      }

      // Obtener imagen actual del canvas activo
      const activeCanvas = getActiveCanvas()
      console.log('🎨 Canvas activo:', activeCanvas?.tagName, activeCanvas)

      if (!activeCanvas) {
        console.log('❌ No se encontró canvas activo')
        return
      }

      const ctx = activeCanvas.getContext('2d')

      // ✅ GUARDAR IMAGEN ORIGINAL ANTES DE APLICAR FILTROS (solo la primera vez)
      const currentView = getCurrentViewKey()
      if (!originalImagesByView.value[currentView]) {
        originalImagesByView.value[currentView] = ctx.getImageData(0, 0, activeCanvas.width, activeCanvas.height)
        console.log(`💾 Imagen original guardada para vista: ${currentView}`)
      }

      // ✅ SIEMPRE RESTAURAR IMAGEN ORIGINAL ANTES DE APLICAR NUEVOS FILTROS
      const originalData = originalImagesByView.value[currentView]
      if (originalData) {
        ctx.putImageData(originalData, 0, 0)
        console.log('🔄 Imagen original restaurada antes de aplicar filtros')
      }

      // Obtener la imagen original para procesamiento
      const imageData = originalData || ctx.getImageData(0, 0, activeCanvas.width, activeCanvas.height)
      console.log('📸 ImageData obtenido:', imageData.width, 'x', imageData.height)

      // Verificar que hay filtros habilitados
      const enabledFilters = Object.entries(webWorkerSettings).filter(([, settings]) => settings.enabled)
      console.log('✅ Filtros habilitados:', enabledFilters.map(([name]) => name))

      if (enabledFilters.length === 0) {
        console.log('⚠️ No hay filtros habilitados - imagen original ya restaurada')
        return
      }

      // Aplicar filtros Web Worker
      console.log('🚀 Aplicando filtros...')
      const processedData = await applyAllWebWorkerFilters(imageData)
      console.log('✨ Filtros aplicados, resultado:', processedData)

      // Actualizar canvas
      ctx.putImageData(processedData, 0, 0)
      console.log('🎨 Canvas actualizado')

      // ✅ VERIFICAR QUE EL CANVAS NO ESTÉ NEGRO
      setTimeout(() => {
        const checkData = ctx.getImageData(0, 0, activeCanvas.width, activeCanvas.height)
        const hasNonBlackPixels = Array.from(checkData.data).some((value, index) =>
          index % 4 !== 3 && value > 0
        )

        if (!hasNonBlackPixels) {
          console.error('❌ CANVAS ESTÁ NEGRO - Restaurando imagen original')
          restoreOriginalImage()
        } else {
          console.log('✅ Canvas tiene contenido válido')
        }
      }, 50)

      // Mostrar resumen de procesamiento
      const enabledFiltersNames = enabledFilters.map(([name]) => name).join(', ')
      showProfessionalNotification(
        '✨ Procesamiento Completado',
        `Filtros aplicados: ${enabledFiltersNames}`,
        'success'
      )

    } catch (error) {
      console.error('💥 Error aplicando filtros Web Worker:', error)
      showProfessionalNotification('Error', 'Error al procesar imagen: ' + error.message, 'error')
    } finally {
      isFilterProcessing.value = false
    }
  }, 100)
}

/**
 * Restaura la imagen original guardada
 */
function restoreOriginalImage() {
  console.log('🔄 Iniciando restauración de imagen original...')

  const canvas = getActiveCanvas()
  if (!canvas) {
    console.log('❌ No se encontró canvas activo para restaurar')
    return
  }

  const currentView = getCurrentViewKey()
  const originalData = originalImagesByView.value[currentView]

  if (originalData) {
    const context = canvas.getContext('2d')
    context.putImageData(originalData, 0, 0)
    console.log(`🔄 Imagen original restaurada para vista: ${currentView}`)

    // Notificar al usuario
    showProfessionalNotification('✨ Imagen Restaurada', 'Se restauró la imagen original', 'success')
  } else {
    console.log(`⚠️ No hay imagen original guardada para vista: ${currentView}`)

    // Intentar con originalImageData legacy como fallback
    if (originalImageData.value) {
      const context = canvas.getContext('2d')
      context.putImageData(originalImageData.value, 0, 0)
      console.log('🔄 Imagen original restaurada (fallback legacy)')
      showProfessionalNotification('✨ Imagen Restaurada', 'Se restauró la imagen original', 'success')
    } else {
      showProfessionalNotification('⚠️ Sin Respaldo', 'No hay imagen original guardada', 'warning')
    }
  }
}

/**
 * Limpia las imágenes originales guardadas (útil al cargar nueva imagen)
 */
//function clearOriginalImages() {
//  console.log('🧹 Limpiando imágenes originales guardadas...')
//  originalImagesByView.value = {}
//  originalImageData.value = null
//  console.log('✅ Imágenes originales limpiadas')
//}

/**
 * Guarda la imagen original actual para la vista activa
 */
function saveCurrentOriginalImage() {
  const canvas = getActiveCanvas()
  if (!canvas) return

  const currentView = getCurrentViewKey()
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  originalImagesByView.value[currentView] = imageData
  console.log(`💾 Imagen original guardada para vista: ${currentView}`)
}

/**
 * Obtiene el canvas activo según la vista actual
 */
function getActiveCanvas() {
  console.log('🔍 Buscando canvas activo...')
  console.log('📱 Estado actual - show3DView:', show3DView.value, 'quadViewActive:', quadViewActive.value)

  let canvas = null

  if (show3DView.value) {
    // En vista 3D
    canvas = document.getElementById('canvas3D')
    console.log('🎯 Buscando canvas3D:', !!canvas)
  } else if (quadViewActive.value) {
    // En vista cuádruple - usar canvas axial principal
    canvas = document.getElementById('axialCanvas') ||
      document.querySelector('#axialCanvas') ||
      document.querySelector('[id*="axial"]')
    console.log('🎯 Buscando axialCanvas:', !!canvas)
  } else {
    // Vista principal
    canvas = document.getElementById('imageCanvas') ||
      document.querySelector('#imageCanvas') ||
      document.querySelector('[id*="image"]') ||
      document.querySelector('canvas')
    console.log('🎯 Buscando imageCanvas:', !!canvas)
  }

  if (!canvas) {
    // Fallback: buscar cualquier canvas visible
    const allCanvas = document.querySelectorAll('canvas')
    console.log('🔄 Fallback - todos los canvas encontrados:', allCanvas.length)

    for (let i = 0; i < allCanvas.length; i++) {
      const c = allCanvas[i]
      const rect = c.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        canvas = c
        console.log('✅ Usando canvas visible:', c.id || c.className)
        break
      }
    }
  }

  if (canvas) {
    console.log('✅ Canvas activo encontrado:', canvas.id, canvas.width + 'x' + canvas.height)
  } else {
    console.log('❌ No se encontró ningún canvas activo')
  }

  return canvas
}

/**
 * Obtiene la clave de la vista actual para manejar imágenes originales
 */
function getCurrentViewKey() {
  if (show3DView.value) {
    return 'view3D'
  } else if (quadViewActive.value) {
    // Incluir información específica de slice para cada vista en modo quad
    return `quadView-axial-${currentSlices.axial}-coronal-${currentSlices.coronal}-sagittal-${currentSlices.sagittal}`
  } else {
    // En vista principal, incluir el slice actual según la vista activa
    const currentView = mainView.value
    if (currentView === 'axial') {
      return `mainView-axial-${currentSlices.axial}`
    } else if (currentView === 'coronal') {
      return `mainView-coronal-${currentSlices.coronal}`
    } else if (currentView === 'sagittal') {
      return `mainView-sagittal-${currentSlices.sagittal}`
    } else {
      return 'mainView'
    }
  }
}

/**
 * Restablece todas las configuraciones del Web Worker
 */
function resetWebWorkerFilters() {
  console.log('🔄 Restableciendo filtros...')

  // Desactivar todos los filtros
  Object.keys(webWorkerSettings).forEach(filterType => {
    webWorkerSettings[filterType].enabled = false
  })

  // Restablecer valores por defecto
  webWorkerSettings.sharpening.strength = 1.0
  webWorkerSettings.sharpening.radius = 1.0
  webWorkerSettings.denoising.strength = 0.5
  webWorkerSettings.denoising.threshold = 10
  webWorkerSettings.edgeDetection.threshold = 100
  webWorkerSettings.edgeDetection.method = 'sobel'
  webWorkerSettings.medicalEnhancement.preset = 'brain'
  webWorkerSettings.medicalEnhancement.contrast = 1.2
  webWorkerSettings.medicalEnhancement.brightness = 0.1

  // Restaurar imagen original automáticamente (el watcher se encargará)
  console.log('🎨 Los filtros fueron deshabilitados - imagen se restaurará automáticamente...')

  showProfessionalNotification('✨ Filtros Restablecidos', 'Configuraciones restauradas y filtros desactivados', 'success')
}

/**
 * Guarda la imagen actual del canvas como archivo
 */
function saveCurrentImage() {
  console.log('💾 Guardando imagen actual...')

  try {
    // Buscar el canvas activo
    let canvas = null

    if (show3DView.value) {
      console.log('🎯 Buscando canvas 3D...')
      canvas = document.querySelector('.canvas-3d')
    } else if (quadViewActive.value) {
      console.log('🎯 Buscando canvas principal en vista cuádruple...')
      canvas = document.querySelector('.quad-view .main-canvas')
    } else {
      console.log('🎯 Buscando canvas principal...')
      canvas = document.querySelector('.main-canvas')
    }

    if (!canvas) {
      console.error('❌ No se encontró canvas activo')
      showProfessionalNotification('Error', 'No se encontró imagen para guardar', 'error')
      return
    }

    console.log(`✅ Canvas encontrado: ${canvas.width}x${canvas.height}`)

    // Crear enlace de descarga
    const link = document.createElement('a')

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const time = new Date().toLocaleTimeString('es-ES', { hour12: false }).replace(/:/g, '-')

    let fileName = `imagen-medica-${timestamp}-${time}`

    // Agregar información de filtros aplicados
    const activeFilters = Object.keys(webWorkerSettings).filter(key => webWorkerSettings[key].enabled)
    if (activeFilters.length > 0) {
      fileName += `-filtros-${activeFilters.join('-')}`
    }

    fileName += '.png'

    // Convertir canvas a blob y descargar
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        link.href = url
        link.download = fileName

        // Agregar al DOM temporalmente y hacer clic
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Limpiar URL
        URL.revokeObjectURL(url)

        console.log(`✅ Imagen guardada como: ${fileName}`)
        showProfessionalNotification(
          '💾 Imagen Guardada',
          `Descarga completada: ${fileName}`,
          'success'
        )
      } else {
        console.error('❌ Error al crear blob de la imagen')
        showProfessionalNotification('Error', 'No se pudo procesar la imagen para descarga', 'error')
      }
    }, 'image/png', 0.95) // Alta calidad

  } catch (error) {
    console.error('💥 Error al guardar imagen:', error)
    showProfessionalNotification('Error', 'Error al guardar la imagen: ' + error.message, 'error')
  }
}

/**
 * Aplica una configuración rápida de prueba para demostrar los filtros
 */
// async function applyQuickTestFilters() {
//   console.log('🚀 Aplicando configuración de prueba rápida...')

//   // Resetear primero
//   resetWebWorkerFilters()

//   // Habilitar filtros de demostración médica
//   webWorkerSettings.sharpening.enabled = true
//   webWorkerSettings.sharpening.strength = 1.5

//   webWorkerSettings.medicalEnhancement.enabled = true
//   webWorkerSettings.medicalEnhancement.preset = 'brain'
//   webWorkerSettings.medicalEnhancement.contrast = 1.3

//   showProfessionalNotification(
//     '🚀 Prueba Rápida Configurada',
//     'Aplicando: Nitidez + Mejoras Médicas',
//     'info'
//   )

//   // Aplicar automáticamente
//   await updateImageWithWebWorkerFilters()
// }

// ================================
// FUNCIONES INTERNAS DE PROCESAMIENTO DE IMÁGENES
// ================================

/**
 * Aplica mejoras de calidad automáticas a los datos de imagen en vistas 2D
 * Las mejoras se activan automáticamente para todas las vistas 2D (axial, coronal, sagital)
 * @param {ImageData} imageData - Datos de imagen originales
 * @returns {ImageData} - Datos de imagen mejorados
 */
function applyImageEnhancements(imageData) {
  // Verificar si las mejoras están habilitadas y si hay datos de volumen
  if (!imageEnhancementEnabled.value || !volumeData) {
    if (!volumeData) {
      console.log('🚫 Sin datos de volumen - mejoras no aplicables')
    } else {
      console.log('🚫 Mejoras de imagen desactivadas (vista 3D)')
    }
    return imageData
  }

  const imageSize = imageData.width * imageData.height
  const isLargeImage = imageSize > (400 * 400) // Detectar imágenes grandes

  const startTime = performance.now() // Medir tiempo de procesamiento

  console.log('🎨 Aplicando mejoras de calidad automáticas en vista 2D...')
  console.log(`📏 Tamaño de imagen: ${imageData.width}x${imageData.height} (${imageSize} píxeles)`)
  console.log(`⚡ Modo de procesamiento: ${isLargeImage ? 'OPTIMIZADO para imagen grande' : 'COMPLETO para imagen normal'}`)
  console.log('⚙️ Configuración automática:', {
    sharpening: enhancementSettings.sharpening,
    contrast: enhancementSettings.contrast,
    brightness: enhancementSettings.brightness,
    denoising: enhancementSettings.denoising,
    adaptiveContrast: enhancementSettings.adaptiveContrast,
    histogramEqualization: enhancementSettings.histogramEqualization
  })

  let enhanced = imageData

  // Para imágenes grandes, aplicar filtros de forma más eficiente
  if (isLargeImage) {
    console.log('⚡ Aplicando filtros optimizados para imagen grande...')

    // Solo aplicar los filtros más efectivos para imágenes grandes
    if (enhancementSettings.histogramEqualization) {
      console.log('🔧 Aplicando ecualización de histograma (rápida)')
      enhanced = applyHistogramEqualization(enhanced)
    }

    if (enhancementSettings.contrast !== 1.0 || enhancementSettings.brightness !== 1.0) {
      console.log(`🔧 Aplicando contraste/brillo: ${enhancementSettings.contrast}/${enhancementSettings.brightness}`)
      enhanced = applyContrastBrightness(enhanced, enhancementSettings.contrast, enhancementSettings.brightness)
    }

    // Para imágenes grandes, usar sharpening más ligero
    if (enhancementSettings.sharpening > 0) {
      console.log(`🔧 Aplicando sharpening ligero: ${enhancementSettings.sharpening * 0.7}`)
      enhanced = applySharpeningFilter(enhanced, enhancementSettings.sharpening * 0.7, true) // modo rápido
    }
  } else {
    console.log('🎨 Aplicando filtros completos para imagen normal...')

    // Aplicar ecualización de histograma primero para mejorar el contraste global
    if (enhancementSettings.histogramEqualization) {
      console.log('🔧 Aplicando ecualización de histograma')
      enhanced = applyHistogramEqualization(enhanced)
    }

    // Aplicar filtros según la configuración
    if (enhancementSettings.denoising > 0) {
      console.log(`🔧 Aplicando denoising con intensidad: ${enhancementSettings.denoising}`)
      enhanced = applyDenoising(enhanced, enhancementSettings.denoising)
    }

    if (enhancementSettings.sharpening > 0) {
      console.log(`🔧 Aplicando sharpening con intensidad: ${enhancementSettings.sharpening}`)
      enhanced = applySharpeningFilter(enhanced, enhancementSettings.sharpening, false) // modo completo
    }

    if (enhancementSettings.contrast !== 1.0 || enhancementSettings.brightness !== 1.0) {
      console.log(`🔧 Aplicando contraste: ${enhancementSettings.contrast}, brillo: ${enhancementSettings.brightness}`)
      enhanced = applyContrastBrightness(enhanced, enhancementSettings.contrast, enhancementSettings.brightness)
    }

    if (enhancementSettings.adaptiveContrast) {
      console.log('🔧 Aplicando contraste adaptativo')
      enhanced = applyAdaptiveContrast(enhanced)
    }
  }

  console.log('✨ Mejoras de calidad aplicadas correctamente')

  // ===== INFORMACIÓN DE RENDIMIENTO =====
  const endTime = performance.now()
  const processingTime = endTime - startTime
  console.log(`⏱️ Tiempo de procesamiento: ${processingTime.toFixed(2)}ms`)

  // ===== DETECCIÓN DE RESOLUCIÓN BAJA =====
  const imageResolution = imageData.width * imageData.height
  const isLowResolution = imageResolution < (200 * 200) // Menos de 200x200 píxeles

  if (isLowResolution) {
    console.log('⚠️ RESOLUCIÓN BAJA DETECTADA:')
    console.log(`   📏 Resolución actual: ${imageData.width}x${imageData.height} (${imageResolution} píxeles)`)
    console.log('   💡 RECOMENDACIÓN: Para mejor calidad visual en imágenes de muy baja resolución,')
    console.log('      considera usar técnicas de Super-Resolución con IA (ESRGAN, Real-ESRGAN, etc.)')
    console.log('   🔧 Los filtros aplicados han mejorado el contraste y nitidez dentro de las limitaciones')
    console.log('      de la resolución original.')
  }

  return enhanced
}

/**
 * Aplica filtro de nitidez usando convolución mejorado con optimización de rendimiento
 * @param {ImageData} imageData - Datos de imagen
 * @param {number} strength - Intensidad del filtro (0-1)
 * @param {boolean} fastMode - Usar modo rápido para imágenes grandes
 * @returns {ImageData} - Imagen con filtro aplicado
 */
function applySharpeningFilter(imageData, strength, fastMode = false) {
  const data = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height

  // 🚀 OPTIMIZACIÓN CRÍTICA: Detectar imágenes muy grandes y aplicar sampling
  const totalPixels = width * height
  const isVeryLargeImage = totalPixels > (512 * 512) // Más de 512x512

  if (fastMode || isVeryLargeImage) {
    // Modo rápido: kernel más simple para imágenes grandes
    logger.performance('🔪 Aplicando sharpening RÁPIDO/OPTIMIZADO para imagen grande')

    const multiplier = strength * 1.5

    // 🚀 OPTIMIZACIÓN: Procesar solo cada N píxeles según el tamaño
    const step = isVeryLargeImage ? Math.max(2, Math.floor(width / 256)) : (width > 512 ? 2 : 1)
    logger.performance(`📊 Usando step optimizado: ${step} (reduce procesamiento en ${(step * step)}x)`)

    // 🚀 OPTIMIZACIÓN: Usar yield point para no bloquear UI
    let processedRows = 0

    for (let y = step; y < height - step; y += step) {
      // Yield control cada 50 filas para evitar bloquear UI
      if (++processedRows % 50 === 0) {
        logger.sample(`Procesando fila ${y}/${height}`, 0.01)
      }

      for (let x = step; x < width - step; x += step) {
        for (let c = 0; c < 3; c++) {
          const centerIdx = (y * width + x) * 4 + c
          const centerValue = imageData.data[centerIdx]

          // Kernel simple de 5 puntos (centro + 4 vecinos)
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

          // Rellenar píxeles intermedios si usamos step > 1
          if (step > 1 && x + 1 < width) {
            data[(y * width + (x + 1)) * 4 + c] = data[centerIdx]
          }
        }
      }
    }
  } else {
    // Modo completo: kernel más agresivo para mejor calidad
    logger.performance('🔪 Aplicando sharpening COMPLETO con kernel agresivo')

    const multiplier = strength * 2
    const kernel = [
      -multiplier, -multiplier, -multiplier,
      -multiplier, 1 + 8 * multiplier, -multiplier,
      -multiplier, -multiplier, -multiplier
    ]

    logger.debug('🔪 Kernel utilizado:', kernel)

    // 🚀 OPTIMIZACIÓN: Chunked processing para imágenes medianas
    const chunkSize = 64 // Procesar en chunks de 64 filas

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

      // Log progreso solo ocasionalmente
      if (yStart % (chunkSize * 4) === 0) {
        logger.sample(`Sharpening chunk completado: ${yStart}/${height}`, 0.1)
      }
    }
  }

  return new ImageData(data, width, height)
}

/**
 * Aplica reducción de ruido usando filtro gaussiano suave
 * @param {ImageData} imageData - Datos de imagen
 * @param {number} strength - Intensidad del filtro (0-1)
 * @returns {ImageData} - Imagen con ruido reducido
 */
function applyDenoising(imageData, strength) {
  const data = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height

  // Kernel gaussiano simple para reducción de ruido
  const kernel = [
    1, 2, 1,
    2, 4, 2,
    1, 2, 1
  ]
  const kernelSum = 16

  for (let y = 1; y < height - 1; y++) {
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

  return new ImageData(data, width, height)
}

/**
 * Aplica detección de bordes usando filtros Sobel o Laplacian
 * @param {ImageData} imageData - Datos de la imagen
 * @param {number} threshold - Umbral para la detección (0-255)
 * @param {string} method - Método: 'sobel' o 'laplacian'
 * @returns {ImageData} - Imagen con bordes detectados
 */
function applyEdgeDetection(imageData, threshold = 100, method = 'sobel') {
  const { width, height, data } = imageData
  const output = new Uint8ClampedArray(data.length)

  console.log(`🔍 Aplicando detección de bordes: ${method}, umbral: ${threshold}`)

  // Convertir a escala de grises primero para mejor detección
  const grayData = new Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    grayData[Math.floor(i / 4)] = gray
  }

  if (method === 'sobel') {
    // Operadores Sobel
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0

        // Aplicar kernel Sobel
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx)
            const kernelIdx = (ky + 1) * 3 + (kx + 1)

            gx += grayData[idx] * sobelX[kernelIdx]
            gy += grayData[idx] * sobelY[kernelIdx]
          }
        }

        // Calcular magnitud del gradiente
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        const edge = magnitude > threshold ? 255 : 0

        const outputIdx = (y * width + x) * 4
        output[outputIdx] = edge     // R
        output[outputIdx + 1] = edge // G
        output[outputIdx + 2] = edge // B
        output[outputIdx + 3] = 255  // A
      }
    }
  } else if (method === 'laplacian') {
    // Operador Laplaciano
    const laplacian = [0, -1, 0, -1, 4, -1, 0, -1, 0]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0

        // Aplicar kernel Laplaciano
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx)
            const kernelIdx = (ky + 1) * 3 + (kx + 1)
            sum += grayData[idx] * laplacian[kernelIdx]
          }
        }

        const edge = Math.abs(sum) > threshold ? 255 : 0

        const outputIdx = (y * width + x) * 4
        output[outputIdx] = edge     // R
        output[outputIdx + 1] = edge // G
        output[outputIdx + 2] = edge // B
        output[outputIdx + 3] = 255  // A
      }
    }
  }

  // Llenar los bordes con negro
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        const idx = (y * width + x) * 4
        output[idx] = 0     // R
        output[idx + 1] = 0 // G
        output[idx + 2] = 0 // B
        output[idx + 3] = 255 // A
      }
    }
  }

  return new ImageData(output, width, height)
}

/**
 * Aplica ajuste de contraste y brillo
 * @param {ImageData} imageData - Datos de imagen
 * @param {number} contrast - Factor de contraste (0.5-2.0)
 * @param {number} brightness - Factor de brillo (0.5-2.0)
 * @returns {ImageData} - Imagen ajustada
 */
function applyContrastBrightness(imageData, contrast, brightness) {
  const data = new Uint8ClampedArray(imageData.data)

  console.log(`💡 Aplicando contraste: ${contrast}x, brillo: ${brightness}x`)

  // ✅ VERIFICAR DATOS DE ENTRADA
  const sampleInput = Array.from(data.slice(0, 20)).filter((_, i) => i % 4 !== 3)
  console.log('📊 Muestra de entrada antes del contraste/brillo:', sampleInput.slice(0, 5))

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) { // Solo RGB
      let value = data[i + c]

      // Aplicar contraste y brillo con validación
      value = (value - 128) * contrast + 128 + (brightness * 255)

      // ✅ VALIDAR Y LIMITAR VALORES
      data[i + c] = Math.max(0, Math.min(255, Math.round(value || 0)))
    }
  }

  // ✅ VERIFICAR DATOS DE SALIDA
  const sampleOutput = Array.from(data.slice(0, 20)).filter((_, i) => i % 4 !== 3)
  console.log('📊 Muestra de salida después del contraste/brillo:', sampleOutput.slice(0, 5))

  return new ImageData(data, imageData.width, imageData.height)
}

/**
 * Aplica ecualización de histograma para mejorar el contraste global
 * @param {ImageData} imageData - Datos de imagen
 * @returns {ImageData} - Imagen con histograma ecualizado
 */
function applyHistogramEqualization(imageData) {
  const data = new Uint8ClampedArray(imageData.data)
  const histogram = new Array(256).fill(0)

  console.log('📊 Aplicando ecualización de histograma')

  // ✅ VERIFICAR DATOS DE ENTRADA
  const sampleInput = Array.from(data.slice(0, 20)).filter((_, i) => i % 4 !== 3)
  console.log('📊 Muestra de entrada antes de ecualización:', sampleInput.slice(0, 5))

  // Calcular histograma solo de luminancia
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    histogram[luminance]++
  }

  // Calcular CDF
  const cdf = new Array(256)
  cdf[0] = histogram[0]
  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + histogram[i]
  }

  const totalPixels = imageData.width * imageData.height

  // Aplicar ecualización con validación de valores
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round((cdf[data[i]] / totalPixels) * 255)
    const g = Math.round((cdf[data[i + 1]] / totalPixels) * 255)
    const b = Math.round((cdf[data[i + 2]] / totalPixels) * 255)

    // ✅ VALIDAR VALORES ANTES DE ASIGNAR
    data[i] = Math.max(0, Math.min(255, r || 0))
    data[i + 1] = Math.max(0, Math.min(255, g || 0))
    data[i + 2] = Math.max(0, Math.min(255, b || 0))
    // data[i + 3] se mantiene (alpha)
  }

  // ✅ VERIFICAR DATOS DE SALIDA
  const sampleOutput = Array.from(data.slice(0, 20)).filter((_, i) => i % 4 !== 3)
  console.log('📊 Muestra de salida después de ecualización:', sampleOutput.slice(0, 5))

  return new ImageData(data, imageData.width, imageData.height)
}

/**
 * Aplica ajuste de contraste adaptativo (CLAHE simplificado)
 * @param {ImageData} imageData - Datos de imagen
 * @returns {ImageData} - Imagen con contraste mejorado
 */
function applyAdaptiveContrast(imageData) {
  const data = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height

  // Calcular histograma local en ventanas pequeñas
  const tileSize = 32

  for (let tileY = 0; tileY < height; tileY += tileSize) {
    for (let tileX = 0; tileX < width; tileX += tileSize) {
      const endY = Math.min(tileY + tileSize, height)
      const endX = Math.min(tileX + tileSize, width)

      // Calcular histograma de esta región
      const histogram = new Array(256).fill(0)
      let totalPixels = 0

      for (let y = tileY; y < endY; y++) {
        for (let x = tileX; x < endX; x++) {
          const idx = (y * width + x) * 4
          const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2])
          histogram[gray]++
          totalPixels++
        }
      }

      // Crear función de mapeo basada en distribución acumulativa
      const cdf = new Array(256).fill(0)
      cdf[0] = histogram[0]
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i]
      }

      // Normalizar y aplicar mejora de contraste
      for (let y = tileY; y < endY; y++) {
        for (let x = tileX; x < endX; x++) {
          const idx = (y * width + x) * 4
          for (let c = 0; c < 3; c++) {
            const value = data[idx + c]
            const enhanced = Math.round((cdf[value] / totalPixels) * 255)
            // Mezclar con valor original para evitar sobre-mejora
            data[idx + c] = Math.round(value * 0.7 + enhanced * 0.3)
          }
        }
      }
    }
  }

  return new ImageData(data, width, height)
}

/**
 * Obtiene el color específico para cada vista anatómica
 * @returns {string} - Color hexadecimal para la vista actual
 */
function getMainViewColor() {
  switch (mainView.value) {
    case 'axial': return '#ffff00'
    case 'coronal': return '#ff0000'
    case 'sagittal': return '#00ff00'
    default: return '#ffffff'
  }
}

/**
 * Obtiene el índice del slice actual para la vista principal
 * @returns {number} - Índice del slice actual
 */
function getCurrentSliceForMainView() {
  let slice
  switch (mainView.value) {
    case 'axial': slice = currentSlices.axial; break
    case 'coronal': slice = currentSlices.coronal; break
    case 'sagittal': slice = currentSlices.sagittal; break
    default: slice = 0
  }
  // Remover console.log repetitivo - solo debug cuando necesario
  return slice
}

/**
 * Dibuja la vista axial (corte horizontal - vista superior)
 * Muestra slices en el plano XY (desde arriba)
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {HTMLCanvasElement} canvas - Canvas de destino
 */
function drawAxialView(ctx, canvas, isInQuadView = false) {
  if (!volumeData || !canvas) {
    console.warn('⚠️ drawAxialView: volumeData o canvas no disponible')
    return
  }

  const currentSlice = currentSlices.axial
  const w = width
  const h = height

  logger.sample(`🟡 drawAxialView: slice=${currentSlice}, dimensiones=${w}x${h}, canvas=${canvas.width}x${canvas.height}, quadView=${isInQuadView}`, 0.01)

  console.log(`🔧 CORRECCIÓN DEBUG: isInQuadView = ${isInQuadView}, tipo = ${typeof isInQuadView}`)

  // Dibujar fondo negro para un aspecto más profesional
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Calcular escalas para maximizar el uso del espacio disponible
  const scaleX = canvas.width / w
  const scaleY = canvas.height / h
  const scale = Math.min(scaleX, scaleY) // Usar 100% del espacio para visualización sin contornos

  // Calcular dimensiones escaladas
  const scaledWidth = Math.floor(w * scale)
  const scaledHeight = Math.floor(h * scale)

  // Centrar la imagen perfectamente
  const offsetX = Math.floor((canvas.width - scaledWidth) / 2)
  const offsetY = Math.floor((canvas.height - scaledHeight) / 2)

  const imageData = ctx.createImageData(w, h)

  // Recorrer el slice axial actual (plano XY en posición Z = currentSlice)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = x + y * width + currentSlice * width * height
      let value = volumeData[idx] || 0
      const pixelIndex = (x + y * w) * 4

      // Aplicar configuración de ventana y nivel con soporte para archivos problemáticos
      value = hasProblematicData.value ?
        normalizeProblematicValue(value, originalDataMin, originalDataMax, true) :
        applyWindowLevel(value)

      if (currentModality.value === 'seg' || showSegmentation.value) {
        // Renderizado de segmentación
        const colors = getSegmentationColors(value)
        imageData.data[pixelIndex] = colors.r
        imageData.data[pixelIndex + 1] = colors.g
        imageData.data[pixelIndex + 2] = colors.b
        imageData.data[pixelIndex + 3] = colors.a
      } else {
        // Renderizado en escala de grises AXIAL
        // ✅ Sin modificaciones artificiales de brillo - los filtros se encargan de la calidad
        const pixelValue = value

        imageData.data[pixelIndex] = pixelValue
        imageData.data[pixelIndex + 1] = pixelValue
        imageData.data[pixelIndex + 2] = pixelValue
        imageData.data[pixelIndex + 3] = 255
      }
    }
  }

  // ***** APLICAR MEJORAS DE CALIDAD ANTES DE MOSTRAR LA IMAGEN *****
  // ✅ CORRECCIÓN: Aplicar mejoras siempre, sin importar el modo de vista
  const enhancedImageData = applyImageEnhancements(imageData)

  console.log(`🎨 Mejoras de imagen aplicadas para vista AXIAL (quadView=${isInQuadView})`)

  // 🚀 OPTIMIZACIÓN CRÍTICA: Usar pool de canvas
  const tempCanvas = canvasPool.getCanvas(w, h)
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.putImageData(enhancedImageData, 0, 0)

  // Dibujar imagen escalada y centrada con alta calidad
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // NO dibujar fondo negro para evitar contornos - imagen ocupa todo el espacio disponible
  // ctx.fillStyle = '#000000'
  // ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Dibujar la imagen centrada
  // ===== APLICAR CORRECCIÓN DE ORIENTACIÓN 2D EN VISTA AXIAL =====
  console.log('🔄 Aplicando corrección de orientación 2D en vista axial (flip vertical)')

  ctx.save() // Guardar estado antes de transformaciones

  // Trasladar al centro de la imagen para hacer el flip
  ctx.translate(offsetX + scaledWidth / 2, offsetY + scaledHeight / 2)

  // Aplicar flip vertical (escala Y negativa)
  ctx.scale(1, -1)

  // Dibujar la imagen centrada
  ctx.drawImage(tempCanvas, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)

  ctx.restore() // Restaurar estado original
  ctx.restore()

  // Dibujar crosshairs y anotaciones ajustados al área escalada
  if (showCrosshairs.value) {
    drawCrosshairs(ctx, canvas.width, canvas.height, offsetX, offsetY, scaledWidth, scaledHeight, 'axial')
  }

  // 🎯 Dibujar crosshairs interactivos si están habilitados y es modo 4 vistas
  if (isInQuadView && crosshairsEnabled.value) {
    drawInteractiveCrosshairs(ctx, canvas, 'axial')
  }

  if (showAxialMeasurements.value) {
    drawMeasurementsForView(ctx, 'axial', canvas.width, canvas.height)
  }

  // 🚀 OPTIMIZACIÓN CRÍTICA: Liberar canvas temporal
  canvasPool.releaseCanvas(tempCanvas)

  logger.debug('✅ drawAxialView: completado exitosamente')
}

/**
 * Dibuja la vista coronal (corte frontal - vista frontal)
 * Muestra slices en el plano XZ (desde el frente)
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {HTMLCanvasElement} canvas - Canvas de destino
 */
function drawCoronalView(ctx, canvas, isInQuadView = false) {
  if (!volumeData || !canvas) {
    console.warn('⚠️ drawCoronalView: volumeData o canvas no disponible')
    return
  }

  const currentSlice = currentSlices.coronal
  const w = width
  const h = depth

  console.log(`🔴 drawCoronalView: slice=${currentSlice}, dimensiones=${w}x${h}, canvas=${canvas.width}x${canvas.height}`)

  // Dibujar fondo negro para un aspecto más profesional
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Calcular escalas para maximizar el uso del espacio disponible
  const scaleX = canvas.width / w
  const scaleY = canvas.height / h
  const scale = Math.min(scaleX, scaleY) // Usar 100% del espacio para visualización sin contornos

  const scaledWidth = Math.floor(w * scale)
  const scaledHeight = Math.floor(h * scale)
  const offsetX = Math.floor((canvas.width - scaledWidth) / 2)
  const offsetY = Math.floor((canvas.height - scaledHeight) / 2)

  const imageData = ctx.createImageData(w, h)

  // Recorrer el slice coronal actual (plano XZ en posición Y = currentSlice)
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      const idx = x + currentSlice * width + z * width * height
      let value = volumeData[idx] || 0
      const pixelIndex = (x + z * w) * 4

      // Aplicar configuración de ventana y nivel con soporte para archivos problemáticos
      value = hasProblematicData.value ?
        normalizeProblematicValue(value, originalDataMin, originalDataMax, true) :
        applyWindowLevel(value)

      if (currentModality.value === 'seg' || showSegmentation.value) {
        // Renderizado de segmentación
        const colors = getSegmentationColors(value)
        imageData.data[pixelIndex] = colors.r
        imageData.data[pixelIndex + 1] = colors.g
        imageData.data[pixelIndex + 2] = colors.b
        imageData.data[pixelIndex + 3] = colors.a
      } else {
        // Renderizado en escala de grises CORONAL
        // ✅ Sin modificaciones artificiales de brillo - los filtros se encargan de la calidad
        const pixelValue = value

        imageData.data[pixelIndex] = pixelValue
        imageData.data[pixelIndex + 1] = pixelValue
        imageData.data[pixelIndex + 2] = pixelValue
        imageData.data[pixelIndex + 3] = 255
      }
    }
  }

  // ***** APLICAR MEJORAS DE CALIDAD ANTES DE MOSTRAR LA IMAGEN (CORONAL) *****
  // ✅ CORRECCIÓN: Aplicar mejoras siempre, sin importar el modo de vista
  const enhancedImageData = applyImageEnhancements(imageData)

  console.log(`🎨 Mejoras de imagen aplicadas para vista CORONAL (quadView=${isInQuadView})`)

  // Crear canvas temporal y escalar
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = w
  tempCanvas.height = h
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.putImageData(enhancedImageData, 0, 0)

  // Dibujar imagen escalada y centrada con alta calidad
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // NO dibujar fondo negro para evitar contornos - imagen ocupa todo el espacio disponible
  // ctx.fillStyle = '#000000'
  // ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Dibujar la imagen centrada
  // ===== APLICAR CORRECCIÓN DE ORIENTACIÓN 2D EN VISTA CORONAL =====
  console.log('🔄 Aplicando corrección de orientación 2D en vista coronal (flip vertical)')

  ctx.save() // Guardar estado antes de transformaciones

  // Trasladar al centro de la imagen para hacer el flip
  ctx.translate(offsetX + scaledWidth / 2, offsetY + scaledHeight / 2)

  // Aplicar flip vertical (escala Y negativa)
  ctx.scale(1, -1)

  // Dibujar la imagen centrada
  ctx.drawImage(tempCanvas, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)

  ctx.restore() // Restaurar estado original
  ctx.restore()

  // Dibujar crosshairs interactivos
  drawInteractiveCrosshairs(ctx, canvas, 'coronal')

  // Dibujar crosshairs y anotaciones ajustados
  if (showCrosshairs.value) {
    drawCrosshairs(ctx, canvas.width, canvas.height, offsetX, offsetY, scaledWidth, scaledHeight, 'coronal')
  }

  if (showCoronalMeasurements.value) {
    drawMeasurementsForView(ctx, 'coronal', canvas.width, canvas.height)
  }

  console.log('✅ drawCoronalView: completado exitosamente')
}

/**
 * Dibuja la vista sagital (corte lateral - vista lateral)
 * Muestra slices en el plano YZ (desde el lado)
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {HTMLCanvasElement} canvas - Canvas de destino
 */
function drawSagittalView(ctx, canvas, isInQuadView = false) {
  if (!volumeData || !canvas) {
    console.warn('⚠️ drawSagittalView: volumeData o canvas no disponible')
    return
  }

  const currentSlice = currentSlices.sagittal
  const w = height
  const h = depth

  console.log(`🟢 drawSagittalView: slice=${currentSlice}, dimensiones=${w}x${h}, canvas=${canvas.width}x${canvas.height}`)
  console.log(`🔧 drawSagittalView: hasProblematicData=${hasProblematicData.value}, originalDataMin=${originalDataMin}, originalDataMax=${originalDataMax}`)

  // Dibujar fondo negro para un aspecto más profesional
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Calcular escalas para maximizar el uso del espacio disponible
  const scaleX = canvas.width / w
  const scaleY = canvas.height / h
  const scale = Math.min(scaleX, scaleY) // Usar 100% del espacio para visualización sin contornos

  const scaledWidth = Math.floor(w * scale)
  const scaledHeight = Math.floor(h * scale)
  const offsetX = Math.floor((canvas.width - scaledWidth) / 2)
  const offsetY = Math.floor((canvas.height - scaledHeight) / 2)

  const imageData = ctx.createImageData(w, h)

  // Recorrer el slice sagital actual (plano YZ en posición X = currentSlice)
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      const idx = currentSlice + y * width + z * width * height
      let value = volumeData[idx] || 0
      const pixelIndex = (y + z * w) * 4

      // Aplicar configuración de ventana y nivel con soporte para archivos problemáticos
      value = hasProblematicData.value ?
        normalizeProblematicValue(value, originalDataMin, originalDataMax, true) :
        applyWindowLevel(value)

      if (currentModality.value === 'seg' || showSegmentation.value) {
        // Renderizado de segmentación
        const colors = getSegmentationColors(value)
        imageData.data[pixelIndex] = colors.r
        imageData.data[pixelIndex + 1] = colors.g
        imageData.data[pixelIndex + 2] = colors.b
        imageData.data[pixelIndex + 3] = colors.a
      } else {
        // Renderizado en escala de grises SAGITAL
        // ✅ Sin modificaciones artificiales de brillo - los filtros se encargan de la calidad
        const pixelValue = value

        imageData.data[pixelIndex] = pixelValue
        imageData.data[pixelIndex + 1] = pixelValue
        imageData.data[pixelIndex + 2] = pixelValue
        imageData.data[pixelIndex + 3] = 255
      }
    }
  }

  // ***** APLICAR MEJORAS DE CALIDAD ANTES DE MOSTRAR LA IMAGEN (SAGITAL) *****
  // ✅ CORRECCIÓN: Aplicar mejoras siempre, sin importar el modo de vista
  const enhancedImageData = applyImageEnhancements(imageData)

  console.log(`🎨 Mejoras de imagen aplicadas para vista SAGITAL (quadView=${isInQuadView})`)

  // Crear canvas temporal y escalar
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = w
  tempCanvas.height = h
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.putImageData(enhancedImageData, 0, 0)

  // Dibujar imagen escalada y centrada con alta calidad
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // NO dibujar fondo negro para evitar contornos - imagen ocupa todo el espacio disponible
  // ctx.fillStyle = '#000000'
  // ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Dibujar la imagen centrada
  // ===== APLICAR CORRECCIÓN DE ORIENTACIÓN 2D EN VISTA SAGITAL =====
  console.log('🔄 Aplicando corrección de orientación 2D en vista sagital (flip vertical)')

  ctx.save() // Guardar estado antes de transformaciones

  // Trasladar al centro de la imagen para hacer el flip
  ctx.translate(offsetX + scaledWidth / 2, offsetY + scaledHeight / 2)

  // Aplicar flip vertical (escala Y negativa)
  ctx.scale(1, -1)

  // Dibujar la imagen centrada
  ctx.drawImage(tempCanvas, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)

  ctx.restore() // Restaurar estado original
  ctx.restore()

  // Dibujar crosshairs interactivos
  drawInteractiveCrosshairs(ctx, canvas, 'sagittal')

  // Dibujar crosshairs y anotaciones ajustados
  if (showCrosshairs.value) {
    drawCrosshairs(ctx, canvas.width, canvas.height, offsetX, offsetY, scaledWidth, scaledHeight, 'sagittal')
  }

  if (showSagittalMeasurements.value) {
    drawMeasurementsForView(ctx, 'sagital', canvas.width, canvas.height)
  }

  console.log('✅ drawSagittalView: completado exitosamente')
}

/**
 * Dibuja la vista principal (cuadrante inferior derecho)
 * Puede mostrar cualquiera de las vistas 2D o la vista 3D
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {HTMLCanvasElement} canvas - Canvas de destino
 */
function drawMainQuadView(ctx, canvas) {
  console.log(`🎯 drawMainQuadView: show3DView=${show3DView.value}, mainView=${mainView.value}`)

  if (show3DView.value) {
    // Si está activa la vista 3D, renderizar el volumen 3D
    console.log('🎯 Renderizando vista 3D en cuadrante principal')
    draw3DView(ctx, canvas)
  } else {
    // Si no, mostrar la vista 2D seleccionada con mayor resolución
    console.log(`🎯 Renderizando vista 2D: ${mainView.value}`)
    switch (mainView.value) {
      case 'axial':
        drawAxialView(ctx, canvas)
        break
      case 'coronal':
        drawCoronalView(ctx, canvas)
        break
      case 'sagittal':
        drawSagittalView(ctx, canvas)
        break
      default:
        drawAxialView(ctx, canvas) // Por defecto axial
    }
  }

  console.log('✅ drawMainQuadView: completado exitosamente')
}

/**
 * Dibuja la vista 3D volumétrica usando Three.js
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {HTMLCanvasElement} canvas - Canvas de destino
 */
function draw3DView(ctx, canvas) {
  if (!volumeData) {
    console.warn('⚠️ draw3DView: no hay datos volumétricos')
    return
  }

  // Si el canvas está siendo renderizado por el sistema 3D avanzado, no sobrescribir
  if (canvas._renderingWith3D) {
    console.log('🎯 draw3DView: saltando renderizado - canvas ya renderizado por sistema 3D avanzado')
    return
  }

  console.log('🎯 draw3DView: iniciando renderizado 3D...')

  // Verificar si existe el renderer principal (no renderer3D)
  if (renderer && scene && camera && volumeMesh) {
    console.log('🎯 Usando renderer 3D principal')

    // Guardar configuración original
    const originalSize = renderer.getSize(new THREE.Vector2())
    const originalRenderTarget = renderer.getRenderTarget()

    // Configurar para el canvas actual
    renderer.setSize(canvas.width, canvas.height, false)

    // Renderizar a un render target temporal
    const renderTarget = new THREE.WebGLRenderTarget(canvas.width, canvas.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    })

    renderer.setRenderTarget(renderTarget)
    renderer.render(scene, camera)

    // Leer los píxeles
    const pixels = new Uint8Array(canvas.width * canvas.height * 4)
    renderer.readRenderTargetPixels(renderTarget, 0, 0, canvas.width, canvas.height, pixels)

    // Transferir al canvas 2D
    const imageData = ctx.createImageData(canvas.width, canvas.height)

    // Convertir RGBA a formato canvas (voltear Y)
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const srcIndex = ((canvas.height - 1 - y) * canvas.width + x) * 4
        const dstIndex = (y * canvas.width + x) * 4

        imageData.data[dstIndex] = pixels[srcIndex]     // R
        imageData.data[dstIndex + 1] = pixels[srcIndex + 1] // G
        imageData.data[dstIndex + 2] = pixels[srcIndex + 2] // B
        imageData.data[dstIndex + 3] = pixels[srcIndex + 3] // A
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Limpiar
    renderTarget.dispose()
    renderer.setRenderTarget(originalRenderTarget)
    renderer.setSize(originalSize.x, originalSize.y, false)

    console.log('✅ Vista 3D real renderizada con renderer principal')
  } else {
    // Crear una vista 3D simulada combinando las 3 vistas anatómicas
    console.log('🎯 Generando vista 3D simulada (renderer principal no disponible)...')
    draw3DSimulatedView(ctx, canvas)
  }

  console.log('✅ draw3DView: completado exitosamente')
}


/**
 * Dibuja una vista 3D simulada combinando las vistas anatómicas
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {HTMLCanvasElement} canvas - Canvas de destino
 */
function draw3DSimulatedView(ctx, canvas) {
  // Fondo negro consistente
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Título optimizado para el tamaño del canvas
  const titleFontSize = Math.max(14, Math.min(20, canvas.width / 25))
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${titleFontSize}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('Vista 3D Volumétrica', canvas.width / 2, titleFontSize + 10)

  // Información del volumen con tamaño de fuente adaptativo
  const infoFontSize = Math.max(10, Math.min(14, canvas.width / 35))
  ctx.font = `${infoFontSize}px Arial`
  ctx.fillStyle = '#ccc'

  const infoY = titleFontSize + 25
  const lineHeight = infoFontSize + 5

  ctx.fillText(`Dimensiones: ${width} × ${height} × ${depth}`, canvas.width / 2, infoY)
  ctx.fillText(`Slice Axial: ${currentSlices.axial + 1}/${depth}`, canvas.width / 2, infoY + lineHeight)
  ctx.fillText(`Slice Coronal: ${currentSlices.coronal + 1}/${height}`, canvas.width / 2, infoY + lineHeight * 2)
  ctx.fillText(`Slice Sagital: ${currentSlices.sagittal + 1}/${width}`, canvas.width / 2, infoY + lineHeight * 3)

  // Dibujar mini-vistas de las 3 perspectivas anatómicas con tamaño optimizado
  const availableHeight = canvas.height - (infoY + lineHeight * 4 + 40)
  const availableWidth = canvas.width - 40
  const miniSize = Math.min(availableWidth / 3.5, availableHeight * 0.7, 120) // Tamaño máximo 120px
  const spacing = (availableWidth - miniSize * 3) / 4 // Espaciado uniforme

  // Posiciones centradas para las mini-vistas
  const startY = infoY + lineHeight * 4 + 20
  const positions = [
    { x: spacing, y: startY, label: 'Axial' },
    { x: spacing * 2 + miniSize, y: startY, label: 'Coronal' },
    { x: spacing * 3 + miniSize * 2, y: startY, label: 'Sagital' }
  ]

  positions.forEach((pos, index) => {
    // Marco para cada mini-vista con colores más vibrantes
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4']
    ctx.strokeStyle = colors[index]
    ctx.lineWidth = 2
    ctx.strokeRect(pos.x, pos.y, miniSize, miniSize)

    // Etiqueta con mejor posicionamiento
    ctx.fillStyle = colors[index]
    ctx.font = `bold ${Math.max(8, Math.min(12, miniSize / 10))}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText(pos.label, pos.x + miniSize / 2, pos.y - 8)

    // Generar mini-imagen simplificada
    drawMiniView(ctx, pos.x, pos.y, miniSize, index)
  })

  // Indicador central 3D mejorado
  const centerX = canvas.width / 2
  const centerY = startY + miniSize + 30
  const cubeSize = Math.min(80, Math.max(40, canvas.height * 0.15))

  // Verificar que hay espacio suficiente para el cubo
  if (centerY + cubeSize + 20 <= canvas.height) {
    draw3DCube(ctx, centerX, centerY, cubeSize)

    // Añadir etiqueta del cubo
    ctx.fillStyle = '#4ecdc4'
    ctx.font = `bold ${Math.max(8, Math.min(12, cubeSize / 8))}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText('Representación 3D', centerX, centerY + cubeSize + 15)
  }
}

/**
 * Dibuja una mini-vista simplificada de cada plano anatómico
 */
function drawMiniView(ctx, x, y, size, viewType) {
  // Usar un tamaño de muestra optimizado para mejor rendimiento
  const sampleSize = Math.max(32, Math.min(128, size))
  const imageData = ctx.createImageData(sampleSize, sampleSize)

  let currentSlice, maxDim1, maxDim2

  switch (viewType) {
    case 0: // Axial
      currentSlice = currentSlices.axial
      maxDim1 = width
      maxDim2 = height
      break
    case 1: // Coronal
      currentSlice = currentSlices.coronal
      maxDim1 = width
      maxDim2 = depth
      break
    case 2: // Sagital
      currentSlice = currentSlices.sagittal
      maxDim1 = height
      maxDim2 = depth
      break
  }

  // Generar datos simplificados con mejor calidad
  for (let py = 0; py < sampleSize; py++) {
    for (let px = 0; px < sampleSize; px++) {
      const dataX = Math.floor((px / sampleSize) * maxDim1)
      const dataY = Math.floor((py / sampleSize) * maxDim2)

      let idx
      switch (viewType) {
        case 0: // Axial
          idx = dataX + dataY * width + currentSlice * width * height
          break
        case 1: // Coronal
          idx = dataX + currentSlice * width + dataY * width * height
          break
        case 2: // Sagital
          idx = currentSlice + dataY * width + dataX * width * height
          break
      }

      let value = volumeData[idx] || 0

      // Aplicar window/level para mejor contraste
      value = Math.min(255, Math.max(0, (value - windowLevel.center + windowLevel.width / 2) * 255 / windowLevel.width))

      // Aplicar un ligero realce de contraste
      value = Math.min(255, Math.pow(value / 255, 0.85) * 255)

      const pixelIndex = (px + py * sampleSize) * 4
      imageData.data[pixelIndex] = value
      imageData.data[pixelIndex + 1] = value
      imageData.data[pixelIndex + 2] = value
      imageData.data[pixelIndex + 3] = 255
    }
  }

  // Crear canvas temporal para la mini-vista
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = sampleSize
  tempCanvas.height = sampleSize
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.putImageData(imageData, 0, 0)

  // Dibujar la mini-vista escalada con suavizado y padding
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tempCanvas, x + 3, y + 3, size - 6, size - 6) // Padding de 3px
  ctx.restore()
}

/**
 * Dibuja un cubo 3D simplificado con mejor visualización
 */
function draw3DCube(ctx, centerX, centerY, size) {
  const half = size / 2

  // Puntos del cubo en 3D (proyección isométrica optimizada)
  const angle = Math.PI / 6 // 30 grados
  const cos30 = Math.cos(angle)
  const sin30 = Math.sin(angle)

  // Escala ajustada para mejor proporción
  const scale = 0.85
  const depth = size * 0.4

  const points = {
    // Cara frontal
    a: { x: centerX - half * scale, y: centerY - half * scale },
    b: { x: centerX + half * scale, y: centerY - half * scale },
    c: { x: centerX + half * scale, y: centerY + half * scale },
    d: { x: centerX - half * scale, y: centerY + half * scale },
    // Cara trasera (con proyección optimizada)
    e: { x: centerX - half * scale + cos30 * depth, y: centerY - half * scale - sin30 * depth },
    f: { x: centerX + half * scale + cos30 * depth, y: centerY - half * scale - sin30 * depth },
    g: { x: centerX + half * scale + cos30 * depth, y: centerY + half * scale - sin30 * depth },
    h: { x: centerX - half * scale + cos30 * depth, y: centerY + half * scale - sin30 * depth }
  }

  // Configurar stroke con grosor adaptativo
  ctx.strokeStyle = '#4ecdc4'
  ctx.lineWidth = Math.max(1.5, size / 35)

  // Dibujar aristas traseras con menor opacidad
  ctx.save()
  ctx.globalAlpha = 0.6

  // Cara trasera
  const backEdges = [['e', 'f'], ['f', 'g'], ['g', 'h'], ['h', 'e']]
  backEdges.forEach(([start, end]) => {
    ctx.beginPath()
    ctx.moveTo(points[start].x, points[start].y)
    ctx.lineTo(points[end].x, points[end].y)
    ctx.stroke()
  })

  // Conexiones profundidad
  const depthEdges = [['a', 'e'], ['b', 'f'], ['c', 'g'], ['d', 'h']]
  depthEdges.forEach(([start, end]) => {
    ctx.beginPath()
    ctx.moveTo(points[start].x, points[start].y)
    ctx.lineTo(points[end].x, points[end].y)
    ctx.stroke()
  })

  ctx.restore()

  // Dibujar cara frontal con opacidad completa
  const frontEdges = [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']]
  frontEdges.forEach(([start, end]) => {
    ctx.beginPath()
    ctx.moveTo(points[start].x, points[start].y)
    ctx.lineTo(points[end].x, points[end].y)
    ctx.stroke()
  })

  // Rellenar caras para dar sensación de volumen
  // Cara superior (más visible)
  ctx.fillStyle = 'rgba(78, 205, 196, 0.4)'
  ctx.beginPath()
  ctx.moveTo(points.a.x, points.a.y)
  ctx.lineTo(points.b.x, points.b.y)
  ctx.lineTo(points.f.x, points.f.y)
  ctx.lineTo(points.e.x, points.e.y)
  ctx.closePath()
  ctx.fill()

  // Cara derecha (sombra)
  ctx.fillStyle = 'rgba(78, 205, 196, 0.25)'
  ctx.beginPath()
  ctx.moveTo(points.b.x, points.b.y)
  ctx.lineTo(points.c.x, points.c.y)
  ctx.lineTo(points.g.x, points.g.y)
  ctx.lineTo(points.f.x, points.f.y)
  ctx.closePath()
  ctx.fill()

  // Cara frontal (la más clara)
  ctx.fillStyle = 'rgba(78, 205, 196, 0.15)'
  ctx.beginPath()
  ctx.moveTo(points.a.x, points.a.y)
  ctx.lineTo(points.b.x, points.b.y)
  ctx.lineTo(points.c.x, points.c.y)
  ctx.lineTo(points.d.x, points.d.y)
  ctx.closePath()
  ctx.fill()
}

/**
 * Obtiene los colores para valores de segmentación
 * @param {number} value - Valor de segmentación
 * @returns {Object} - Colores RGBA
 */
function getSegmentationColors(value) {
  switch (value) {
    case 50: return { r: 255, g: 100, b: 100, a: 180 } // Tumor - Rojo
    case 100: return { r: 100, g: 255, b: 100, a: 180 } // Tejido sano - Verde
    case 150: return { r: 100, g: 100, b: 255, a: 180 } // Hueso - Azul
    case 200: return { r: 255, g: 255, b: 100, a: 180 } // Líquido - Amarillo
    default: return { r: 128, g: 128, b: 128, a: 100 } // Otros - Gris
  }
}

/**
 * Dibuja las mediciones específicas para una vista - VERSIÓN CON COORDENADAS RELATIVAS
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {string} viewType - Tipo de vista
 * @param {number} canvasWidth - Ancho del canvas
 * @param {number} canvasHeight - Alto del canvas
 */
function drawMeasurementsForView(ctx, viewType, canvasWidth, canvasHeight) {
  // Filtrar mediciones para la vista actual y slice correspondiente
  let currentSlice;
  switch (viewType) {
    case 'axial':
      currentSlice = currentSlices.axial;
      break;
    case 'coronal':
      currentSlice = currentSlices.coronal;
      break;
    case 'sagittal':
      currentSlice = currentSlices.sagittal;
      break;
    default:
      currentSlice = getCurrentSliceForMainView();
  }

  const viewMeasurements = measurements.value.filter(m =>
    m.view === viewType && m.slice === currentSlice
  );

  console.log(`📏 Dibujando ${viewMeasurements.length} mediciones para vista ${viewType}, slice ${currentSlice}`);

  viewMeasurements.forEach((measurement, index) => {
    if (measurement.points && measurement.points.length === 2) {
      ctx.save()
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.font = '12px Arial'
      ctx.fillStyle = '#00ff00'

      // Convertir coordenadas relativas a píxeles del canvas actual
      const p1 = {
        x: measurement.points[0].x * canvasWidth,
        y: measurement.points[0].y * canvasHeight
      };
      const p2 = {
        x: measurement.points[1].x * canvasWidth,
        y: measurement.points[1].y * canvasHeight
      };

      // Dibujar línea de medición
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()

      // Dibujar puntos de inicio y fin
      ctx.fillStyle = '#00ff00'
      ctx.beginPath()
      ctx.arc(p1.x, p1.y, 3, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p2.x, p2.y, 3, 0, 2 * Math.PI)
      ctx.fill()

      // Dibujar texto con distancia en el punto medio
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2

      let distanceText = `${measurement.distance} px`;
      if (measurement.distanceMm) {
        distanceText += ` (${measurement.distanceMm} mm)`;
      }

      ctx.fillStyle = '#00ff00'
      ctx.fillText(distanceText, midX + 5, midY - 5)

      ctx.restore()

      console.log(`📏 Medición ${index} dibujada: ${p1.x},${p1.y} -> ${p2.x},${p2.y}`);
    }
  })
}

/**
 * Ajusta el tamaño del canvas al tamaño de su contenedor
 * @param {HTMLCanvasElement} canvas - Canvas a ajustar
 */
function resizeCanvasToContainer(canvas) {
  if (!canvas || !canvas.parentElement) {
    console.warn('⚠️ resizeCanvasToContainer: canvas o contenedor no disponible')
    return
  }

  const container = canvas.parentElement
  const containerRect = container.getBoundingClientRect()

  // Obtener el estilo computado para considerar padding y border
  const containerStyle = window.getComputedStyle(container)
  const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight)
  const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom)
  const borderX = parseFloat(containerStyle.borderLeftWidth) + parseFloat(containerStyle.borderRightWidth)
  const borderY = parseFloat(containerStyle.borderTopWidth) + parseFloat(containerStyle.borderBottomWidth)

  // Calcular el tamaño disponible considerando padding y border
  const availableWidth = containerRect.width - paddingX - borderX - 8 // 8px de margen adicional
  const availableHeight = containerRect.height - paddingY - borderY - 35 // 35px para el título

  // Asegurar tamaños mínimos
  const finalWidth = Math.max(availableWidth, 110)
  const finalHeight = Math.max(availableHeight, 80)

  // Ajustar el tamaño del canvas
  canvas.width = finalWidth
  canvas.height = finalHeight

  // También ajustar el estilo CSS para que coincida
  canvas.style.width = `${finalWidth}px`
  canvas.style.height = `${finalHeight}px`

  console.log(`📏 Canvas redimensionado: ${finalWidth}x${finalHeight}`)
  return { width: finalWidth, height: finalHeight }
}

/**
 * Inicializa el tamaño de todos los canvas de las 4 vistas
 */
function initializeQuadrantCanvasSizes() {
  console.log('🔧 Inicializando tamaños de canvas de 4 vistas...')

  nextTick(() => {
    const canvases = [
      { canvas: canvasSagittal.value, name: 'sagital' },
      { canvas: canvasAxial.value, name: 'axial' },
      { canvas: canvasCoronal.value, name: 'coronal' },
      { canvas: canvas3DRef.value, name: '3D' }  // ✅ Corregido: usar canvas3DRef en lugar de canvasMainQuad
    ]

    canvases.forEach(({ canvas, name }) => {
      if (canvas) {
        const size = resizeCanvasToContainer(canvas)
        console.log(`✅ Canvas ${name} inicializado: ${size.width}x${size.height}`)
      } else {
        console.warn(`⚠️ Canvas ${name} no disponible para inicialización`)
      }
    })
  })
}

/**
 * Renderiza una vista específica con zoom aplicado
 * @param {HTMLCanvasElement} canvas - Canvas donde renderizar
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal', 'main')
 */
function drawViewWithZoom(canvas, viewType) {
  if (!volumeData || !canvas) {
    console.warn(`⚠️ drawViewWithZoom(${viewType}): volumeData=${!!volumeData}, canvas=${!!canvas}`)
    return
  }

  // Ajustar automáticamente el tamaño del canvas a su contenedor
  resizeCanvasToContainer(canvas)

  console.log(`🎨 drawViewWithZoom(${viewType}): iniciando renderizado...`)

  const ctx = canvas.getContext('2d')
  ctx.resetTransform()
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Aplicar transformaciones de zoom
  const zoomLevel = quadZoomLevels[viewType]
  const zoomOrigin = quadZoomOrigins[viewType]
  const zoomTranslate = quadZoomTranslates[viewType]

  if (zoomLevel !== 1) {
    // Aplicar translación acumulada del zoom focal
    ctx.translate(zoomTranslate.x, zoomTranslate.y)

    // Mover origen al punto de zoom
    ctx.translate(zoomOrigin.x, zoomOrigin.y)

    // Aplicar escala
    ctx.scale(zoomLevel, zoomLevel)

    // Regresar origen
    ctx.translate(-zoomOrigin.x, -zoomOrigin.y)
  }

  // Usar las funciones específicas para cada vista
  // Usar las funciones específicas para cada vista
  switch (viewType) {
    case 'axial': {
      console.log(`🟡 Llamando drawAxialView para slice ${currentSlices.axial}`)
      // Detectar si estamos en modo 4 vistas
      const isInQuadView = quadViewActive.value
      console.log(`🔧 DEBUG: isInQuadView = ${isInQuadView}`)
      drawAxialView(ctx, canvas, isInQuadView)
      break
    }
    case 'coronal': {
      console.log(`🔴 Llamando drawCoronalView para slice ${currentSlices.coronal}`)
      console.log(`🔧 DEBUG: isInQuadView = ${quadViewActive.value}`)
      drawCoronalView(ctx, canvas, quadViewActive.value)
      break
    }
    case 'sagittal': {
      console.log(`🟢 Llamando drawSagittalView para slice ${currentSlices.sagittal}`)
      console.log(`🔧 DEBUG: isInQuadView = ${quadViewActive.value}`)
      drawSagittalView(ctx, canvas, quadViewActive.value)
      break
    }
    case 'main': {
      console.log(`🎯 Llamando drawMainQuadView`)
      drawMainQuadView(ctx, canvas)
      break
    }
    default: {
      console.warn(`Vista desconocida: ${viewType}`)
      drawAxialView(ctx, canvas, false) // Fallback a axial
    }
  }

  console.log(`✅ drawViewWithZoom(${viewType}): renderizado completado`)
  ctx.restore()
}

/**
 * Maneja eventos de rueda en las 4 vistas (zoom si está activo, navegación de slices si no)
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal', 'main')
 * @param {WheelEvent} event - Evento de la rueda del mouse
 */
function handleQuadViewWheel(viewType, event) {
  event.preventDefault()

  // Si el zoom está activo, hacer zoom focal
  if (zoomActive.value) {
    handleQuadViewZoom(viewType, event)
  } else {
    // Si no, navegar entre slices
    handleQuadViewSliceChange(viewType, event)
  }
}

/**
 * Maneja el zoom focal en las 4 vistas
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal', 'main')
 * @param {WheelEvent} event - Evento de la rueda del mouse
 */
function handleQuadViewZoom(viewType, event) {
  const canvas = event.target
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const delta = event.deltaY
  const zoomDirection = delta > 0 ? 'out' : 'in'
  const zoomFactor = zoomDirection === 'in' ? 1.05 : 0.95

  const oldZoomLevel = quadZoomLevels[viewType]
  const newZoomLevel = Math.max(0.5, Math.min(5, oldZoomLevel * zoomFactor))

  if (newZoomLevel !== oldZoomLevel) {
    // Calcular el nuevo desplazamiento para mantener el punto del mouse fijo
    const zoomRatio = newZoomLevel / oldZoomLevel

    // Actualizar origen del zoom
    quadZoomOrigins[viewType].x = mouseX
    quadZoomOrigins[viewType].y = mouseY

    // Calcular nueva translación acumulada
    const currentTranslateX = quadZoomTranslates[viewType].x
    const currentTranslateY = quadZoomTranslates[viewType].y

    const newTranslateX = mouseX - (mouseX - currentTranslateX) * zoomRatio
    const newTranslateY = mouseY - (mouseY - currentTranslateY) * zoomRatio

    // Actualizar valores
    quadZoomLevels[viewType] = newZoomLevel
    quadZoomTranslates[viewType].x = newTranslateX
    quadZoomTranslates[viewType].y = newTranslateY

    console.log(`🔍 Zoom ${zoomDirection} en ${viewType}: ${(newZoomLevel * 100).toFixed(0)}% en (${mouseX}, ${mouseY})`)

    // Redibujar la vista
    nextTick(() => {
      const canvasRef = getCanvasRefForView(viewType)
      if (canvasRef?.value) {
        drawViewWithZoom(canvasRef.value, viewType)
      }
    })
  }
}

/**
 * Obtiene la referencia del canvas para un tipo de vista
 * @param {string} viewType - Tipo de vista
 * @returns {Ref} - Referencia del canvas
 */
function getCanvasRefForView(viewType) {
  switch (viewType) {
    case 'axial': return canvasAxial
    case 'coronal': return canvasCoronal
    case 'sagittal': return canvasSagittal
    case 'main': return canvas3DRef  // ✅ Corregido: 'main' usa canvas3DRef en modo 4 vistas
    case '3d': return canvas3DRef
    default: return null
  }
}

/**
 * Maneja el cambio de slice en el modo de 4 vistas
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal')
 * @param {WheelEvent} event - Evento de la rueda del mouse
 */
function handleQuadViewSliceChange(viewType, event) {
  const delta = event.deltaY > 0 ? 1 : -1
  let maxSlices

  switch (viewType) {
    case 'axial':
      maxSlices = depth - 1
      currentSlices.axial = Math.max(0, Math.min(maxSlices, currentSlices.axial + delta))
      break

    case 'coronal':
      maxSlices = height - 1
      currentSlices.coronal = Math.max(0, Math.min(maxSlices, currentSlices.coronal + delta))
      break

    case 'sagittal':
      maxSlices = width - 1
      currentSlices.sagittal = Math.max(0, Math.min(maxSlices, currentSlices.sagittal + delta))
      break

    case 'main': {
      // Para la vista principal, usar la navegación existente
      const currentView = mainView.value
      if (currentView === 'axial') {
        maxSlices = depth - 1
        currentSlices.axial = Math.max(0, Math.min(maxSlices, currentSlices.axial + delta))
      } else if (currentView === 'coronal') {
        maxSlices = height - 1
        currentSlices.coronal = Math.max(0, Math.min(maxSlices, currentSlices.coronal + delta))
      } else if (currentView === 'sagittal') {
        maxSlices = width - 1
        currentSlices.sagittal = Math.max(0, Math.min(maxSlices, currentSlices.sagittal + delta))
      }
      break
    }
  }

  // 🗑️ LIMPIAR IMAGEN ORIGINAL AL CAMBIAR SLICE EN QUAD VIEW
  // Esto asegura que los filtros se apliquen correctamente al nuevo slice
  console.log(`🗑️ Limpiando imagen original al cambiar slice en ${viewType}`)

  Object.keys(originalImagesByView.value).forEach(key => {
    if (key.includes('quadView') || key.includes('mainView')) {
      delete originalImagesByView.value[key]
    }
  })

  console.log(`✅ Imágenes originales limpiadas - nueva imagen se guardará para el slice actual`)

  // 🎯 SINCRONIZAR CROSSHAIRS cuando cambia el slice con scroll
  if (crosshairsEnabled.value) {
    syncCrosshairsFromSliceChange(viewType)
  }

  console.log(`🎡 Slice cambio en ${viewType}: ${viewType === 'main' ? getCurrentSliceForMainView() : currentSlices[viewType]}`)
}

/**
 * Redibuja todas las vistas en el modo de 4 vistas
 */
function redrawQuadViews() {
  if (!quadViewActive.value) {
    console.log('⚠️ redrawQuadViews: modo 4 vistas no activo')
    return
  }

  console.log('🔄 redrawQuadViews: iniciando redibujado...')

  nextTick(() => {
    let redrawn = 0

    if (canvasAxial.value) {
      console.log('🟡 Redibujando axial desde redrawQuadViews')
      drawViewWithZoom(canvasAxial.value, 'axial')
      redrawn++
    } else {
      console.warn('⚠️ canvasAxial no disponible en redrawQuadViews')
    }

    if (canvasCoronal.value) {
      console.log('🔴 Redibujando coronal desde redrawQuadViews')
      drawViewWithZoom(canvasCoronal.value, 'coronal')
      redrawn++
    } else {
      console.warn('⚠️ canvasCoronal no disponible en redrawQuadViews')
    }

    if (canvasSagittal.value) {
      console.log('🟢 Redibujando sagital desde redrawQuadViews')
      drawViewWithZoom(canvasSagittal.value, 'sagittal')
      redrawn++
    } else {
      console.warn('⚠️ canvasSagittal no disponible en redrawQuadViews')
    }

    // ✅ Renderizar vista 3D en el cuadrante inferior derecho (no hay canvas "main" separado)
    if (canvas3DRef.value) {
      console.log('🧠 Redibujando vista 3D desde redrawQuadViews')
      update3DQuadrantView()
      redrawn++
    } else {
      console.warn('⚠️ canvas3DRef no disponible en redrawQuadViews')
    }

    console.log(`✅ redrawQuadViews completado: ${redrawn}/5 vistas redibujadas`)
  })
}

/**
 * Obtiene el total de slices para la vista principal
 * @returns {number} - Número total de slices
 */
function getTotalSlicesForMainView() {
  let total
  switch (mainView.value) {
    case 'axial': total = depth; break
    case 'coronal': total = height; break
    case 'sagittal': total = width; break
    default: total = 1
  }
  console.log('getTotalSlicesForMainView - mainView:', mainView.value, 'total:', total, 'dimensions:', { width, height, depth })
  return total
}

// Variables para el control de gestos de navegación de slices
const isDraggingForSliceNavigation = ref(false)
const startDragPosition = ref({ x: 0, y: 0 })
const dragThreshold = 5 // Píxeles mínimos para considerar un arrastre

/**
 * Convierte coordenadas del mouse a coordenadas de imagen considerando zoom focal
 * @param {number} mouseX - Coordenada X del mouse en el canvas
 * @param {number} mouseY - Coordenada Y del mouse en el canvas
 * @returns {Object} - Coordenadas convertidas {x, y}
 */
function convertMouseToImageCoords(mouseX, mouseY) {
  if (zoomLevel.value === 1) {
    // Sin zoom, las coordenadas son directas
    return { x: mouseX, y: mouseY }
  }

  // Con zoom focal, necesitamos "invertir" la transformación
  // La transformación aplicada en el canvas es:
  // 1. translate(zoomTranslate.x, zoomTranslate.y)
  // 2. translate(zoomOrigin.x, zoomOrigin.y)
  // 3. scale(zoomLevel, zoomLevel)
  // 4. translate(-zoomOrigin.x, -zoomOrigin.y)

  // Para invertir, aplicamos los pasos en orden inverso:

  // Paso 1: Deshacer la translación final aplicada
  let x = mouseX - zoomTranslate.value.x
  let y = mouseY - zoomTranslate.value.y

  // Paso 2: Mover al punto de origen del zoom
  x -= zoomOrigin.value.x
  y -= zoomOrigin.value.y

  // Paso 3: Dividir por la escala (invertir el zoom)
  x /= zoomLevel.value
  y /= zoomLevel.value

  // Paso 4: Restaurar la posición relativa al origen
  x += zoomOrigin.value.x
  y += zoomOrigin.value.y

  return { x, y }
}

/**
 * Maneja el inicio del arrastre del crosshair con Ctrl+Click
 */
function handleCrosshairDragStart(event, viewType) {
  // Solo activar con Ctrl presionado
  if (!event.ctrlKey || !showCrosshairs.value) return

  event.preventDefault()
  crosshairDragging.isDragging = true
  crosshairDragging.view = viewType
  showCrosshairTooltip.value = true

  console.log(`🎯 Moviendo crosshair en vista ${viewType} - Ctrl+Arrastrar para ajustar posición`)
}

/**
 * Maneja el movimiento del crosshair durante el arrastre
 */
function handleCrosshairDragMove(event, viewType) {
  if (!crosshairDragging.isDragging || crosshairDragging.view !== viewType) return

  event.preventDefault()

  // Obtener el canvas según la vista
  let canvas
  let isMainView = false
  let actualViewType = viewType

  switch (viewType) {
    case 'axial':
      canvas = canvasAxial.value
      break
    case 'coronal':
      canvas = canvasCoronal.value
      break
    case 'sagittal':
      canvas = canvasSagittal.value
      break
    case 'main':
      // Vista principal - usar el mainView actual
      canvas = canvasMain.value
      isMainView = true
      actualViewType = mainView.value // Para actualizar crosshairPositions
      break
    default:
      canvas = canvasMain.value
      isMainView = true
      actualViewType = mainView.value
  }

  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Convertir a porcentajes (0.0 - 1.0)
  const relX = Math.max(0, Math.min(1, x / canvas.width))
  const relY = Math.max(0, Math.min(1, y / canvas.height))

  // Actualizar posición del crosshair usando el tipo de vista actual
  crosshairPositions[actualViewType].x = relX
  crosshairPositions[actualViewType].y = relY

  // Redibujar la vista INMEDIATAMENTE (sin nextTick para feedback visual instantáneo)
  if (isMainView) {
    // Si es vista principal, siempre usar drawMainView
    drawMainView()
  } else {
    // Si es quad view, usar la función específica de cada vista
    switch (viewType) {
      case 'axial':
        drawAxialView()
        break
      case 'coronal':
        drawCoronalView()
        break
      case 'sagittal':
        drawSagittalView()
        break
    }
  }
}

/**
 * Maneja el fin del arrastre del crosshair
 */
function handleCrosshairDragEnd() {
  if (crosshairDragging.isDragging) {
    console.log(`✅ Crosshair reposicionado en vista ${crosshairDragging.view}`)
    crosshairDragging.isDragging = false
    crosshairDragging.view = null
    showCrosshairTooltip.value = false
  }
}

/**
 * Maneja los clics en el canvas principal
 * Solo maneja mediciones, el zoom se hace con rueda del mouse
 * @param {MouseEvent} event - Evento de clic
 * @param {string} viewType - Tipo de vista (para modo quad view)
 */
function handleCanvasClick(event, viewType = null) {
  console.log('🎯 handleCanvasClick ejecutado - measureActive:', measureActive.value, 'viewType:', viewType)

  if (!volumeData) {
    console.log('❌ Falta volumeData')
    return
  }

  let canvas, rect, mouseX, mouseY

  // Determinar el canvas según el modo
  if (viewType) {
    // Modo quad view - usar el canvas específico de la vista
    switch (viewType) {
      case 'axial':
        canvas = canvasAxial.value
        break
      case 'coronal':
        canvas = canvasCoronal.value
        break
      case 'sagittal':
        canvas = canvasSagittal.value
        break
      case 'main':
        canvas = canvas3DRef.value  // ✅ Corregido: usar canvas3DRef
        break
      default:
        console.log('❌ Tipo de vista no válido:', viewType)
        return
    }
  } else {
    // Modo single view - usar canvas principal
    canvas = canvasMain.value
  }

  if (!canvas) {
    console.log('❌ Canvas no encontrado para vista:', viewType || 'main')
    return
  }

  rect = canvas.getBoundingClientRect()
  mouseX = event.clientX - rect.left
  mouseY = event.clientY - rect.top

  // Convertir coordenadas del mouse a coordenadas de imagen considerando zoom focal
  const imageCoords = convertMouseToImageCoords(mouseX, mouseY)

  console.log('Coordenadas del clic:', {
    mouse: { x: mouseX, y: mouseY },
    imagen: imageCoords,
    zoom: `${(zoomLevel.value * 100).toFixed(0)}%`,
    vista: viewType || 'main'
  })

  // 🎯 ACTUALIZAR CROSSHAIRS EN MODO QUAD VIEW
  if (quadViewActive.value && viewType && crosshairsEnabled.value) {
    const coords = canvasToVolumeCoords(mouseX, mouseY, canvas, viewType)
    console.log('🎯 Actualizando crosshairs desde click en', viewType, ':', coords)
    syncViewsFromCrosshair(viewType, coords.x, coords.y)
  }

  // Solo modo medición activo
  if (measureActive.value) {
    console.log('📏 Iniciando medición con coordenadas convertidas...')
    handleMeasureClick(imageCoords.x, imageCoords.y, viewType)
    return
  }

  console.log('ℹ️ Clic en canvas - usar rueda del mouse para zoom')
}

/**
 * Función auxiliar para obtener el pixel spacing según la vista
 * @param {string} viewType - Tipo de vista
 * @returns {Object} Objeto con dx y dy para el spacing
 */
function getPixelSpacingForView(viewType) {
  if (!physicalMeasures.value.pixDims || physicalMeasures.value.pixDims.length < 3) {
    return { dx: 1, dy: 1 } // Valores por defecto
  }

  const pixDims = physicalMeasures.value.pixDims

  switch (viewType) {
    case 'axial':
      return { dx: pixDims[1], dy: pixDims[2] } // X e Y
    case 'coronal':
      return { dx: pixDims[1], dy: pixDims[3] } // X y Z
    case 'sagittal':
      return { dx: pixDims[2], dy: pixDims[3] } // Y y Z
    default:
      return { dx: pixDims[1], dy: pixDims[2] } // Por defecto X e Y
  }
}

/**
 * Maneja los clics para medición de distancias - VERSIÓN CON COORDENADAS RELATIVAS
 * @param {number} x - Coordenada X del clic
 * @param {number} y - Coordenada Y del clic
 * @param {string} viewType - Tipo de vista (para modo quad view)
 */
function handleMeasureClick(x, y, viewType = null) {
  // Determinar el canvas correcto
  let canvas;
  if (viewType) {
    const canvasRef = getCanvasRefForView(viewType);
    canvas = canvasRef?.value;
  } else {
    canvas = canvasMain.value;
  }

  if (!canvas) {
    console.warn('No se pudo obtener canvas para medición');
    return;
  }

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Guardar coordenadas normalizadas (relativas)
  const relX = x / canvasWidth;
  const relY = y / canvasHeight;

  // Determinar la vista actual
  const currentView = viewType || mainView.value

  // Obtener el slice actual según la vista
  let currentSlice
  if (viewType) {
    // Modo quad view - usar el slice específico
    switch (viewType) {
      case 'axial':
        currentSlice = currentSlices.axial
        break
      case 'coronal':
        currentSlice = currentSlices.coronal
        break
      case 'sagittal':
        currentSlice = currentSlices.sagittal
        break
      case 'main':
        currentSlice = getCurrentSliceForMainView()
        break
      default:
        currentSlice = getCurrentSliceForMainView()
    }
  } else {
    // Modo single view
    currentSlice = getCurrentSliceForMainView()
  }

  // Si ya hay una medición en esta vista/slice, reiniciar
  if (currentMeasurement.value.view === currentView &&
    currentMeasurement.value.slice === currentSlice &&
    currentMeasurement.value.points.length >= 2) {
    currentMeasurement.value = { view: currentView, slice: currentSlice, points: [] }
    measuredDistance.value = null
    measuredDistanceMm.value = null
    updateDisplay()
    return
  }

  // Si es una medición nueva o diferente vista/slice
  if (currentMeasurement.value.view !== currentView ||
    currentMeasurement.value.slice !== currentSlice) {
    currentMeasurement.value = { view: currentView, slice: currentSlice, points: [] }
  }

  // Agregar punto con coordenadas RELATIVAS
  currentMeasurement.value.points.push({ x: relX, y: relY })

  // Si tenemos 2 puntos, calcular distancia y guardar medición completa
  if (currentMeasurement.value.points.length === 2) {
    // Obtener canvas actual para cálculos precisos
    const currentCanvas = getCurrentCanvas(viewType);
    if (!currentCanvas) {
      console.warn('⚠️ No se puede calcular distancia: canvas no disponible');
      return;
    }

    // Sincronizar tamaño del canvas antes de calcular
    syncCanvasSize(currentCanvas);

    // Usar la nueva función para calcular distancia con el tamaño ACTUAL del canvas
    const result = calculateDistanceBetweenRelativePoints(
      currentMeasurement.value.points[0],
      currentMeasurement.value.points[1],
      currentCanvas,
      currentView
    );

    // Actualizar valores de distancia
    measuredDistance.value = result.pixels.toFixed(1);
    measuredDistanceMm.value = result.mm > 0 ? result.mm.toFixed(2) : null;

    if (measuredDistanceMm.value) {
      console.log(`📏 Distancia medida: ${measuredDistance.value} px (${measuredDistanceMm.value} mm)`);
    } else {
      console.log(`📏 Distancia medida: ${measuredDistance.value} px`);
    }

    // Guardar medición completa con coordenadas RELATIVAS
    const completeMeasurement = {
      view: currentView,
      slice: currentSlice,
      modality: selectedModality.value,
      points: [...currentMeasurement.value.points], // <- siempre relativos
      distance: measuredDistance.value,
      distanceMm: measuredDistanceMm.value,
      timestamp: new Date().toISOString()
    }

    // Agregar a las mediciones guardadas
    measurements.value.push(completeMeasurement)

    console.log('📏 Medición guardada (coordenadas relativas):', completeMeasurement)

    // Limpiar medición actual después de un breve delay para mostrar el resultado
    setTimeout(() => {
      currentMeasurement.value = { view: currentView, slice: currentSlice, points: [] }
      measuredDistance.value = null
      measuredDistanceMm.value = null
      updateDisplay()
    }, 2000) // Mostrar por 2 segundos antes de limpiar
  }

  updateDisplay()
}

/**
 * Maneja el inicio del evento de mouse/touch en el canvas principal
 * Detecta si es para navegación de slices o para otras herramientas
 * @param {MouseEvent|TouchEvent} event - Evento de mouse o touch
 */
function handleMouseDown(event) {
  console.log('🖱️ handleMouseDown ejecutado - zoomActive:', zoomActive.value, 'measureActive:', measureActive.value)

  // Si el crosshair está siendo arrastrado, no hacer nada con la navegación de slices
  if (crosshairDragging.isDragging) {
    console.log('🎯 Crosshair en arrastre - ignorando navegación de slices')
    return
  }

  // Si está en modo zoom o medición, NO prevenir el evento para permitir click
  if (zoomActive.value || measureActive.value) {
    console.log('Modo zoom/medición activo - NO previniendo evento')
    return
  }

  // Solo prevenir el evento para navegación de slices
  console.log('Modo navegación - previniendo evento')
  event.preventDefault()

  // Obtener coordenadas del evento (compatible con mouse y touch)
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY

  // Iniciar seguimiento para navegación de slices
  isDraggingForSliceNavigation.value = true
  startDragPosition.value = { x: clientX, y: clientY }

  // Iniciar arrastre de slice para la vista principal
  startSliceDrag(mainView.value, { clientY })

  console.log(`🖱️ Inicio de arrastre para navegación de slices en vista ${mainView.value}`)
}

/**
 * Maneja el movimiento del mouse/touch durante el arrastre
 * Navega entre slices basado en el movimiento vertical
 * @param {MouseEvent|TouchEvent} event - Evento de movimiento
 */
function handleMouseMove(event) {
  // Si el crosshair está siendo arrastrado, no navegar slices
  if (crosshairDragging.isDragging) return

  if (!isDraggingForSliceNavigation.value) return

  event.preventDefault()

  // Obtener coordenadas del evento (compatible con mouse y touch)
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY

  // Calcular distancia desde el punto inicial
  const deltaX = clientX - startDragPosition.value.x
  const deltaY = clientY - startDragPosition.value.y
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  // Solo procesar si el movimiento supera el umbral
  if (distance > dragThreshold) {
    // Usar principalmente el movimiento vertical para navegación de slices
    onSliceDrag(mainView.value, { clientY })

    // Mostrar feedback visual del slice actual
    const currentSlice = getCurrentSliceForMainView()
    const totalSlices = getTotalSlicesForMainView()
    console.log(`📊 Navegando: slice ${currentSlice + 1}/${totalSlices} en vista ${mainView.value}`)
  }
}

/**
 * Maneja el final del evento de mouse/touch
 * Termina la navegación de slices y limpia los estados
 * @param {MouseEvent|TouchEvent} event - Evento de finalización
 */
function handleMouseUp(event) {
  if (!isDraggingForSliceNavigation.value) return

  event.preventDefault()

  // Terminar arrastre de slice
  stopSliceDrag()

  // Limpiar estados de arrastre
  isDraggingForSliceNavigation.value = false
  startDragPosition.value = { x: 0, y: 0 }

  console.log(`🖱️ Fin de arrastre para navegación de slices`)
}

/**
 * Inicia el arrastre para navegación de slices
 * Permite cambiar slice arrastrando verticalmente sobre las vistas
 * @param {string} view - Vista a arrastrar ('axial', 'coronal', 'sagittal')
 * @param {MouseEvent} event - Evento de mouse
 */
function startSliceDrag(view, event) {
  console.log('🎯 Iniciando arrastre de slice:', { view, clientY: event.clientY })
  draggingSlice.value = view
  lastY.value = event.clientY
  console.log('✅ Estado después de iniciar arrastre:', { draggingSlice: draggingSlice.value, lastY: lastY.value })
}

/**
 * Maneja el arrastre activo para navegación de slices
 * Cambia el slice actual basado en el movimiento vertical del mouse
 * @param {string} view - Vista que se está arrastrando
 * @param {MouseEvent} event - Evento de movimiento del mouse
 */
function onSliceDrag(view, event) {
  console.log('🔄 onSliceDrag llamado:', { view, draggingSlice: draggingSlice.value, eventClientY: event.clientY, lastY: lastY.value })

  if (draggingSlice.value !== view) {
    console.log('❌ No coincide la vista de arrastre:', { draggingSlice: draggingSlice.value, view })
    return
  }

  const deltaY = event.clientY - lastY.value
  console.log('📏 DeltaY calculado:', { deltaY, clientY: event.clientY, lastY: lastY.value })

  if (Math.abs(deltaY) > 5) {
    let key, max
    if (view === 'axial') {
      key = 'axial'
      max = depth - 1
    } else if (view === 'coronal') {
      key = 'coronal'
      max = height - 1
    } else if (view === 'sagittal') {
      key = 'sagittal'
      max = width - 1
    }

    console.log('📊 Dimensiones para navegación:', { key, max, width, height, depth })

    const oldSlice = currentSlices[key]
    let next = currentSlices[key] + (deltaY > 0 ? 1 : -1)
    next = Math.max(0, Math.min(max, next))

    console.log('🔄 Cambio de slice:', {
      key,
      oldSlice,
      newSlice: next,
      deltaY,
      direction: deltaY > 0 ? 'down' : 'up',
      currentSlices: { ...currentSlices }
    })

    currentSlices[key] = next
    lastY.value = event.clientY
    updateDisplay()
  } else {
    console.log('⏸️ DeltaY muy pequeño, no hay cambio:', Math.abs(deltaY))
  }
}

/**
 * Termina el arrastre de slice
 * Limpia el estado de arrastre activo
 */
function stopSliceDrag() {
  draggingSlice.value = null
}

/**
 * Diagnóstico de las 4 vistas - muestra información detallada del estado
 */
function diagnoseQuadViews() {
  console.log('🔍 === DIAGNÓSTICO DE 4 VISTAS ===')
  console.log('📊 Estado general:')
  console.log(`  - quadViewActive: ${quadViewActive.value}`)
  console.log(`  - volumeData disponible: ${!!volumeData}`)
  console.log(`  - Dimensiones: ${width}x${height}x${depth}`)

  console.log('📋 Canvas disponibles:')
  console.log(`  - canvasAxial: ${!!canvasAxial.value}`)
  console.log(`  - canvasCoronal: ${!!canvasCoronal.value}`)
  console.log(`  - canvasSagittal: ${!!canvasSagittal.value}`)
  console.log(`  - canvas3DRef: ${!!canvas3DRef.value}`)

  console.log('🎯 Slices actuales:')
  console.log(`  - Axial: ${currentSlices.axial}/${depth}`)
  console.log(`  - Coronal: ${currentSlices.coronal}/${height}`)
  console.log(`  - Sagital: ${currentSlices.sagittal}/${width}`)

  console.log('🔍 Zoom levels:')
  console.log(`  - Axial: ${quadZoomLevels.axial}x`)
  console.log(`  - Coronal: ${quadZoomLevels.coronal}x`)
  console.log(`  - Sagital: ${quadZoomLevels.sagittal}x`)
  console.log(`  - Main: ${quadZoomLevels.main}x`)

  console.log('🎨 Configuración de vista:')
  console.log(`  - showCrosshairs: ${showCrosshairs.value}`)
  console.log(`  - show3DView: ${show3DView.value}`)
  console.log(`  - mainView: ${mainView.value}`)

  console.log('🔍 === FIN DIAGNÓSTICO ===')
}

/**
 * Función simple para testear las 4 vistas desde la consola
 * Ejecuta: window.testQuadViews()
 */
function testQuadViews() {
  console.log('🧪 === TEST DE 4 VISTAS ===')

  if (!volumeData) {
    console.log('❌ No hay datos - carga una imagen primero')
    return
  }

  if (!quadViewActive.value) {
    console.log('⚠️ Activando modo 4 vistas...')
    quadViewActive.value = true
    setTimeout(() => testQuadViews(), 2000)
    return
  }

  console.log('✅ Datos y modo activo - ejecutando test...')

  setTimeout(() => {
    try {
      updateDisplay()
      console.log('✅ Test completado')
    } catch (error) {
      console.error('❌ Error en test:', error)
    }
  }, 500)
}

/**
 * Función de reparación de 4 vistas - diagnóstica y corrige problemas
 * Ejecuta desde la consola con: window.repairQuadViews()
 */
function repairQuadViews() {
  console.log('🔧 === REPARACIÓN DE 4 VISTAS ===')

  if (!quadViewActive.value) {
    console.log('❌ Modo 4 vistas no está activo')
    return
  }

  if (!volumeData) {
    console.log('❌ No hay datos volumétricos cargados')
    return
  }

  console.log('1️⃣ Verificando estado de canvas...')
  const canvasStates = {
    axial: !!canvasAxial.value,
    coronal: !!canvasCoronal.value,
    sagittal: !!canvasSagittal.value,
    threeD: !!canvas3DRef.value  // ✅ Corregido: verificar canvas3DRef en lugar de canvasMainQuad
  }

  console.log('📊 Estado de canvas:', canvasStates)

  const problemCanvases = Object.entries(canvasStates)
    .filter(([, isReady]) => !isReady)
    .map(([name]) => name)

  if (problemCanvases.length > 0) {
    console.log(`❌ Canvas problemáticos: ${problemCanvases.join(', ')}`)
    console.log('💡 Intenta desactivar y reactivar el modo 4 vistas')
    return
  }

  console.log('2️⃣ Verificando rangos de slices...')
  if (volumeData) {
    const sliceRanges = {
      axial: `${currentSlices.axial}/${depth}`,
      coronal: `${currentSlices.coronal}/${height}`,
      sagittal: `${currentSlices.sagittal}/${width}`
    }

    console.log('🎯 Slices actuales:', sliceRanges)

    // Reparar slices fuera de rango
    if (currentSlices.axial >= depth) {
      currentSlices.axial = Math.floor(depth / 2)
      console.log(`🔧 Slice axial corregido a ${currentSlices.axial}`)
    }
    if (currentSlices.coronal >= height) {
      currentSlices.coronal = Math.floor(height / 2)
      console.log(`🔧 Slice coronal corregido a ${currentSlices.coronal}`)
    }
    if (currentSlices.sagittal >= width) {
      currentSlices.sagittal = Math.floor(width / 2)
      console.log(`🔧 Slice sagittal corregido a ${currentSlices.sagittal}`)
    }
  }

  console.log('3️⃣ Ejecutando reparación...')

  // Forzar redibujado inmediato
  setTimeout(() => {
    try {
      updateDisplay()
      console.log('✅ Reparación completada - todas las vistas deberían estar funcionando')
    } catch (error) {
      console.error('❌ Error durante la reparación:', error)
    }
  }, 100)
}

/**
 * Fuerza el redibujado de las 4 vistas
 * Útil para cuando hay cambios de datos o configuración
 */
async function forceRedrawQuadViews() {
  if (!quadViewActive.value || !volumeData) {
    console.log('⚠️ No se puede redibujar: quadViewActive=', quadViewActive.value, 'volumeData=', !!volumeData)
    return
  }

  console.log('🔄 Forzando redibujado de las 4 vistas...')
  console.log('🔍 Estado expandido:', allCollapsed.value)

  // Asegurar que todos los canvas estén disponibles y con dimensiones correctas
  await nextTick(async () => {
    try {
      let successCount = 0

      // Validar y redibujar cada vista con logging de dimensiones
      if (canvasAxial.value) {
        console.log(`🟡 Redibujando vista AXIAL - Dimensiones: ${canvasAxial.value.width}x${canvasAxial.value.height}`)
        drawViewWithZoom(canvasAxial.value, 'axial')
        successCount++
      } else {
        console.warn('⚠️ canvasAxial no disponible')
      }

      if (canvasCoronal.value) {
        console.log(`🔴 Redibujando vista CORONAL - Dimensiones: ${canvasCoronal.value.width}x${canvasCoronal.value.height}`)
        drawViewWithZoom(canvasCoronal.value, 'coronal')
        successCount++
      } else {
        console.warn('⚠️ canvasCoronal no disponible')
      }

      if (canvasSagittal.value) {
        console.log(`🟢 Redibujando vista SAGITAL - Dimensiones: ${canvasSagittal.value.width}x${canvasSagittal.value.height}`)
        drawViewWithZoom(canvasSagittal.value, 'sagittal')
        successCount++
      } else {
        console.warn('⚠️ canvasSagittal no disponible')
      }

      if (canvas3DRef.value) {
        console.log(`🧠 Redibujando vista 3D VOLUMÉTRICA - Dimensiones: ${canvas3DRef.value.width}x${canvas3DRef.value.height}`)
        update3DQuadrantView()
        successCount++
      } else {
        console.warn('⚠️ Canvas 3D no disponible')
      }

      console.log(`✅ ${successCount}/5 vistas redibujadas exitosamente`)

      if (successCount === 0) {
        console.error('❌ Ninguna vista pudo ser redibujada - problema con canvas')
        // Intentar reinicializar después de un delay
        setTimeout(() => {
          if (quadViewActive.value) {
            console.log('🔄 Reintentando redibujado...')
            forceRedrawQuadViews()
          }
        }, 200)
      }
    } catch (error) {
      console.error('❌ Error redibujando las 4 vistas:', error)
    }
  })
}

/**
 * Inicializa las 4 vistas cuando se activa el modo quad view
 * Se asegura de que todas las vistas se dibujen correctamente
 */
function initializeQuadViews() {
  if (!volumeData) {
    console.log('⚠️ No hay datos volumétricos para inicializar las 4 vistas')
    return
  }

  console.log('🎯 Inicializando las 4 vistas anatómicas...')

  // Ejecutar diagnóstico para verificar el estado
  diagnoseQuadViews()

  // Asegurar que los slices estén en posiciones válidas
  if (currentSlices.axial >= depth) currentSlices.axial = Math.floor(depth / 2)
  if (currentSlices.coronal >= height) currentSlices.coronal = Math.floor(height / 2)
  if (currentSlices.sagittal >= width) currentSlices.sagittal = Math.floor(width / 2)

  // Activar vista 3D por defecto en el cuadrante principal
  show3DView.value = true
  console.log('🎯 Vista 3D activada para cuadrante principal')

  // Reset de zoom para todas las vistas
  quadZoomLevels.axial = 1
  quadZoomLevels.coronal = 1
  quadZoomLevels.sagittal = 1
  quadZoomLevels.main = 1
  quadZoomLevels.threeD = 1

  quadZoomOrigins.axial = { x: 0, y: 0 }
  quadZoomOrigins.coronal = { x: 0, y: 0 }
  quadZoomOrigins.sagittal = { x: 0, y: 0 }
  quadZoomOrigins.main = { x: 0, y: 0 }
  quadZoomOrigins.threeD = { x: 0, y: 0 }

  quadZoomTranslates.axial = { x: 0, y: 0 }
  quadZoomTranslates.coronal = { x: 0, y: 0 }
  quadZoomTranslates.sagittal = { x: 0, y: 0 }
  quadZoomTranslates.main = { x: 0, y: 0 }
  quadZoomTranslates.threeD = { x: 0, y: 0 }

  // Resetear rotación 3D del cuadrante
  quad3DRotation.theta = 0
  quad3DRotation.phi = Math.PI / 2

  // Redibujar todas las vistas después de un pequeño delay
  setTimeout(async () => {
    console.log('🎯 Inicializando 4 vistas...')

    // 🔥 INICIALIZACIÓN COMPLETA DEL RENDERIZADOR 3D 🔥
    console.log('🎯 Asegurando renderizador 3D completo para 4 vistas...')

    // Paso 1: Inicializar Three.js si no existe
    if (!renderer || !scene || !camera) {
      console.log('🔧 Inicializando Three.js desde cero...')
      await initThree()
    }

    // Paso 2: Crear mesh volumétrico si no existe
    if (volumeData && !volumeMesh) {
      console.log('🧊 Creando mesh volumétrico para 4 vistas...')
      create3DVolumeFromExistingData()
    }

    // Paso 3: Verificar que todo esté listo
    const rendererReady = renderer && scene && camera && volumeMesh
    console.log(`🎯 Renderizador 3D completo: ${rendererReady ? 'LISTO' : 'FALLÓ'}`)

    if (rendererReady) {
      console.log('✅ Vista 3D completamente inicializada para 4 vistas')
    } else {
      console.warn('⚠️ Vista 3D no se pudo inicializar completamente')
    }

    // Inicializar crosshairs para las 4 vistas
    initializeCrosshairs()

    // NOTA: Los planos 3D de crosshairs se crean en initQuadView3D()
    // después de que la escena 3D esté lista

    // Redibujar todas las vistas
    await forceRedrawQuadViews()

    // Inicializar la vista 3D en el cuadrante
    await initialize3DViewInQuadrant()

    showProfessionalNotification(
      '🎯 4 Vistas Activadas',
      `Axial (${depth} slices) | Coronal (${height} slices) | Sagital (${width} slices) | Vista 3D`,
      'success'
    )
  }, 150)

  console.log('✅ 4 vistas inicializadas correctamente')
}

/**
 * Fuerza la inicialización del renderizador 3D si no está disponible
 */
async function ensureThreeRenderer() {
  console.log('🎯 Verificando renderizador 3D...')

  // Si ya tenemos renderizador, está listo
  if (renderer && scene && camera) {
    console.log('✅ Renderizador 3D ya disponible')
    return true
  }

  console.log('🎯 Inicializando renderizador 3D básico...')

  try {
    // 🔥 NUEVO: Verificar canvas según el modo activo
    const targetCanvas = quadViewActive.value ? canvas3DRef.value : threeCanvas.value
    if (!targetCanvas) {
      console.warn('⚠️ No hay canvas 3D disponible para el modo actual')
      return false
    }

    // Inicializar Three.js directamente
    const success = await initThree()

    if (success && renderer && scene && camera) {
      console.log('✅ Renderizador 3D inicializado exitosamente')
      return true
    } else {
      console.warn('⚠️ Falló la inicialización del renderizador 3D')
      return false
    }
  } catch (error) {
    console.error('❌ Error al inicializar renderizador 3D:', error)
    return false
  }
}

/**
 * Inicializa la vista 3D volumétrica en el cuadrante inferior derecho
 * Crea un renderizador 3D específico para el modo de cuatro vistas
 */
async function initialize3DViewInQuadrant() {
  console.log('🧠 Intentando inicializar vista 3D volumétrica en cuadrante...')
  console.log('🔍 volumeData:', !!volumeData)
  console.log('🔍 canvas3DRef.value:', !!canvas3DRef.value)

  if (!volumeData) {
    console.log('⚠️ No se puede inicializar vista 3D: sin datos volumétricos')
    return
  }

  // Esperar a que el canvas esté disponible con reintentos
  let retries = 0
  const maxRetries = 10

  while (!canvas3DRef.value && retries < maxRetries) {
    console.log(`🔄 Esperando canvas 3D (intento ${retries + 1}/${maxRetries})...`)
    await new Promise(resolve => setTimeout(resolve, 100))
    retries++
  }

  if (!canvas3DRef.value) {
    console.log('❌ Canvas 3D no disponible después de múltiples intentos')
    return
  }

  console.log('🎯 Canvas encontrado, iniciando inicialización...')

  try {
    // 🔧 SIMPLIFICADO: Solo usar composable independiente
    console.log('🎯 Llamando initFourViews3D del composable...')
    await initFourViews3D()

    // Configurar canvas 3D responsive
    setupResponsive3DCanvas()

    // 🔥 Forzar simulación 3D inmediatamente después de la inicialización
    console.log('🔥 Forzando simulación 3D inmediatamente...')
    forceSimulation3D()

    // Y otra vez con delay para asegurar
    setTimeout(() => {
      console.log('🔥 Reforzando simulación 3D con delay...')
      forceSimulation3D()
    }, 200)

    console.log('✅ Vista 3D inicializada exitosamente en cuadrante')
  } catch (error) {
    console.error('❌ Error al inicializar vista 3D en cuadrante:', error)
  }
}

/**
 * Configura el canvas 3D para que sea responsive y escale con su contenedor
 */
function setupResponsive3DCanvas() {
  if (!canvas3DRef.value) {
    console.warn('⚠️ Canvas 3D no disponible para configuración responsive')
    return
  }

  const canvas = canvas3DRef.value
  const container = canvas.parentElement

  if (!container) {
    console.warn('⚠️ Contenedor del canvas 3D no encontrado')
    return
  }

  console.log('🎯 Configurando canvas 3D responsive...')

  // Función para redimensionar el canvas
  const resizeCanvas = () => {
    if (!canvas || !container) return

    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // Calcular dimensiones con padding y mínimos
    const padding = 20
    const headerSpace = 30 // Espacio para etiquetas

    const newWidth = Math.max(containerWidth - padding, 300)
    const newHeight = Math.max(containerHeight - headerSpace, 200)

    // Solo actualizar si hay cambio significativo (evitar loops)
    if (Math.abs(canvas.width - newWidth) > 5 || Math.abs(canvas.height - newHeight) > 5) {
      canvas.width = newWidth
      canvas.height = newHeight

      console.log(`📐 Canvas 3D redimensionado: ${newWidth}x${newHeight}`)

      // Redibujar la vista 3D con las nuevas dimensiones
      if (quadViewActive.value) {
        update3DQuadrantView()

        // CRÍTICO: Actualizar también el renderer 3D y la cámara
        if (renderer3DQuad.value && camera3DQuad.value) {
          console.log('🔧 Sincronizando renderer 3D con nuevas dimensiones...')
          resizeQuadView3D()
        }
      }
    }
  }

  // Redimensionar inicialmente
  resizeCanvas()

  // Observar cambios de tamaño del contenedor
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          resizeCanvas()
        }
      }
    })

    resizeObserver.observe(container)

    // Guardar referencia para limpieza posterior (NO usar onUnmounted aquí por contexto async)
    if (!window._quadView3DCleanups) {
      window._quadView3DCleanups = []
    }
    window._quadView3DCleanups.push(() => resizeObserver.disconnect())
  } else {
    // Fallback para navegadores sin ResizeObserver
    window.addEventListener('resize', resizeCanvas)

    // Guardar referencia para limpieza posterior
    if (!window._quadView3DCleanups) {
      window._quadView3DCleanups = []
    }
    window._quadView3DCleanups.push(() => window.removeEventListener('resize', resizeCanvas))
  }

  console.log('✅ Canvas 3D configurado como responsive')
}

/**
 * Actualiza solo la vista 3D del cuadrante
 */
function update3DQuadrantView() {
  // Esta función ahora está manejada por el composable useFourViews3D
  // que proporciona renderizado 3D independiente para evitar conflictos de contexto WebGL
  console.log('🎯 3D Quad View: Usando sistema independiente de renderizado...')

  if (!quadViewActive.value) {
    return
  }

  // Asegurar que la simulación 3D esté activa al actualizar
  if (canvas3DRef.value && forceSimulation3D) {
    console.log('🔄 Asegurando simulación 3D en actualización...')
    forceSimulation3D()
  }
}

/**
 * Función de activación manual para las 4 vistas
 * Útil para debugging y activación desde consola
 */
function activateQuadViewsManually() {
  console.log('🔧 Activación manual de las 4 vistas...')

  if (!quadViewActive.value) {
    console.log('⚠️ Modo 4 vistas no está activo, activándolo...')
    quadViewActive.value = true
  }

  // Esperar a que el modo se active
  setTimeout(() => {
    if (volumeData) {
      initializeQuadViews()
    } else {
      console.error('❌ No hay datos volumétricos cargados')
    }
  }, 200)
}

// Exponer función para debugging en consola
if (typeof window !== 'undefined') {
  window.activateQuadViewsManually = activateQuadViewsManually

  // 🔧 NUEVO: Funciones de debugging y recarga automática
  window.dashboardDebug = {
    debugState,
    debugImageLoadingState,
    forceReloadCurrentView,
    toggleAutoReload,
    autoReloadEnabled: () => autoReloadEnabled,
    volumeData: () => volumeData,
    mainView: () => mainView.value,
    canvasMain: () => canvasMain.value
  }

  console.log('🔧 Sistema de recarga automática disponible en: window.dashboardDebug')
  console.log('📋 Funciones disponibles:')
  console.log('  - debugState(): Estado general del componente')
  console.log('  - debugImageLoadingState(): Diagnóstico de carga de imágenes')
  console.log('  - forceReloadCurrentView(): Forzar recarga manual (solo para debugging)')
  console.log('  ✅ RECARGA AUTOMÁTICA: Siempre activa en cambios de tamaño, vista y zoom')
  console.log('  - toggleAutoReload(): Activar/desactivar recarga automática')
  console.log('  - autoReloadEnabled(): Estado de la recarga automática')

  // Función de test completa
  window.testQuadViews = function () {
    console.log('🧪 === TEST DE 4 VISTAS ===')
    console.log('Estado inicial:')
    console.log(`- quadViewActive: ${quadViewActive.value}`)
    console.log(`- volumeData: ${!!volumeData}`)
    console.log(`- Dimensiones: ${width}x${height}x${depth}`)

    if (!volumeData) {
      console.error('❌ No hay datos volumétricos cargados')
      return
    }

    // Activar modo 4 vistas si no está activo
    if (!quadViewActive.value) {
      console.log('🔄 Activando modo 4 vistas...')
      quadViewActive.value = true
    }

    setTimeout(() => {
      console.log('🔍 Verificando canvas...')
      console.log(`- canvasAxial: ${!!canvasAxial.value}`)
      console.log(`- canvasCoronal: ${!!canvasCoronal.value}`)
      console.log(`- canvasSagittal: ${!!canvasSagittal.value}`)
      console.log(`- canvas3DRef: ${!!canvas3DRef.value}`)

      // Forzar inicialización
      initializeQuadViews()

      setTimeout(() => {
        // Test individual de cada vista
        console.log('🧪 Probando vista axial...')
        if (canvasAxial.value) {
          drawViewWithZoom(canvasAxial.value, 'axial')
        }

        console.log('🧪 Probando vista coronal...')
        if (canvasCoronal.value) {
          drawViewWithZoom(canvasCoronal.value, 'coronal')
        }

        console.log('🧪 Probando vista sagital...')
        if (canvasSagittal.value) {
          drawViewWithZoom(canvasSagittal.value, 'sagittal')
        }

        // ✅ Vista 3D se actualiza mediante update3DQuadrantView(), no drawViewWithZoom
        console.log('🧪 Probando vista 3D...')
        if (canvas3DRef.value) {
          update3DQuadrantView()
        }

        console.log('✅ === TEST COMPLETADO ===')
      }, 300)
    }, 200)
  }

  // Función para verificar datos
  window.checkVolumeData = function () {
    console.log('📊 === VERIFICACIÓN DE DATOS ===')
    console.log(`- volumeData existe: ${!!volumeData}`)
    if (volumeData) {
      console.log(`- Tamaño del array: ${volumeData.length}`)
      console.log(`- Tipo: ${typeof volumeData}`)
      console.log(`- Es array: ${Array.isArray(volumeData)}`)

      // Verificar algunos valores de ejemplo
      const axialSlice = currentSlices.axial
      const sampleIdx = 120 + 120 * width + axialSlice * width * height
      console.log(`- Valor de ejemplo (idx ${sampleIdx}): ${volumeData[sampleIdx]}`)

      // Verificar rango de valores
      let minVal = Infinity, maxVal = -Infinity
      for (let i = 0; i < Math.min(1000, volumeData.length); i++) {
        const val = volumeData[i]
        if (val < minVal) minVal = val
        if (val > maxVal) maxVal = val
      }
      console.log(`- Rango de valores (primeros 1000): ${minVal} - ${maxVal}`)
    }
    console.log(`- width: ${width}`)
    console.log(`- height: ${height}`)
    console.log(`- depth: ${depth}`)
    console.log(`- currentSlices: ${JSON.stringify(currentSlices)}`)
    console.log('=========================')
  }

  // Función para probar renderizado simple
  window.testSimpleRender = function () {
    console.log('🧪 === TEST DE RENDERIZADO SIMPLE ===')

    if (!volumeData) {
      console.error('❌ No hay datos volumétricos')
      return
    }

    // Probar crear imageData simple
    try {
      if (canvasAxial.value) {
        const ctx = canvasAxial.value.getContext('2d')
        const testImageData = ctx.createImageData(240, 240)

        // Llenar con patrón de prueba
        for (let i = 0; i < testImageData.data.length; i += 4) {
          const x = Math.floor((i / 4) % 240)
          const y = Math.floor((i / 4) / 240)
          const intensity = ((x + y) % 100) * 2.55

          testImageData.data[i] = intensity     // R
          testImageData.data[i + 1] = intensity // G
          testImageData.data[i + 2] = intensity // B
          testImageData.data[i + 3] = 255       // A
        }

        ctx.putImageData(testImageData, 0, 0)
        console.log('✅ Patrón de prueba aplicado a canvas axial')
      }
    } catch (error) {
      console.error('❌ Error en test de renderizado:', error)
    }
  }
}

/**
 * Alterna la vista 3D en el cuadrante principal
 */

/**
 * Alterna la visibilidad de crosshairs en todas las vistas
 */
function toggleCrosshairs() {
  showCrosshairs.value = !showCrosshairs.value

  showProfessionalNotification(
    showCrosshairs.value ? '✚ Crosshairs Visibles' : '✚ Crosshairs Ocultos',
    'Referencias cruzadas ' + (showCrosshairs.value ? 'activadas' : 'desactivadas'),
    'info'
  )

  // Redibujar todas las vistas activas
  if (quadViewActive.value) {
    redrawQuadViews()
  } else {
    nextTick(() => {
      drawMainView()
    })
  }
}

/**
 * Alterna la visibilidad del panel de información
 */
function toggleInfoPanel() {
  showInfoPanel.value = !showInfoPanel.value

  showProfessionalNotification(
    showInfoPanel.value ? '📊 Panel de Información Visible' : '📊 Panel de Información Oculto',
    'Panel de datos médicos ' + (showInfoPanel.value ? 'mostrado' : 'ocultado'),
    'info'
  )
}

// ========================================
// FUNCIONES ESPECIALIZADAS PARA LAS 4 VISTAS
// ========================================

/**
 * Maneja el mousedown específicamente para las vistas del quad view
 * Permite navegación de slices independiente en cada vista
 * @param {MouseEvent} event - Evento de mouse
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal', 'main')
 */
function handleQuadViewMouseDown(event, viewType) {
  // Si el crosshair está siendo arrastrado, no iniciar navegación de slices
  if (crosshairDragging.isDragging) {
    return
  }

  // Si está en modo zoom o medición, no prevenir el comportamiento normal
  if (zoomActive.value || measureActive.value) {
    return
  }

  event.preventDefault()

  // Iniciar arrastre para esta vista específica
  quadViewDragging[viewType] = true
  quadViewLastY[viewType] = event.clientY
}

/**
 * Maneja el mousemove específicamente para las vistas del quad view
 * Navega entre slices basado en el movimiento vertical
 * @param {MouseEvent} event - Evento de mouse
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal', 'main')
 */
function handleQuadViewMouseMove(event, viewType) {
  // Si el crosshair está siendo arrastrado, no procesar navegación de slices
  if (crosshairDragging.isDragging) {
    return
  }

  if (!quadViewDragging[viewType]) return

  event.preventDefault()

  const deltaY = event.clientY - quadViewLastY[viewType]

  // Solo procesar si el movimiento es significativo
  if (Math.abs(deltaY) > 5) {
    // Determinar qué slice cambiar basado en el tipo de vista
    let sliceKey, maxSlices

    if (viewType === 'axial') {
      sliceKey = 'axial'
      maxSlices = depth - 1
    } else if (viewType === 'coronal') {
      sliceKey = 'coronal'
      maxSlices = height - 1
    } else if (viewType === 'sagittal') {
      sliceKey = 'sagittal'
      maxSlices = width - 1
    } else if (viewType === 'main') {
      // Para la vista principal, usar la vista actual
      if (mainView.value === 'axial') {
        sliceKey = 'axial'
        maxSlices = depth - 1
      } else if (mainView.value === 'coronal') {
        sliceKey = 'coronal'
        maxSlices = height - 1
      } else if (mainView.value === 'sagittal') {
        sliceKey = 'sagittal'
        maxSlices = width - 1
      }
    }

    if (sliceKey && maxSlices > 0) {
      const direction = deltaY > 0 ? 1 : -1
      const oldSlice = currentSlices[sliceKey]
      const newSlice = Math.max(0, Math.min(maxSlices, oldSlice + direction))

      if (newSlice !== oldSlice) {
        currentSlices[sliceKey] = newSlice
        quadViewLastY[viewType] = event.clientY

        // 🎯 SINCRONIZAR CROSSHAIRS cuando cambia el slice
        if (quadViewActive.value && crosshairsEnabled.value) {
          syncCrosshairsFromSliceChange(viewType)
        }

        // Actualizar el canvas correspondiente
        nextTick(() => {
          if (viewType === 'main') {
            updateDisplay()
          } else {
            const canvasRef = getCanvasRefForView(viewType)
            if (canvasRef?.value) {
              drawViewWithZoom(canvasRef.value, viewType)
            }
          }
        })
        console.log(`📊 Vista ${viewType}: slice ${newSlice + 1}/${maxSlices + 1}`)
      }
    }
  }
}

/**
 * Maneja el mouseup específicamente para las vistas del quad view
 * Termina la navegación de slices
 * @param {MouseEvent} event - Evento de mouse
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal', 'main')
 */
function handleQuadViewMouseUp(event, viewType) {
  // Las funciones del sistema de crosshair antiguo están comentadas
  // El nuevo sistema de crosshairs se maneja con handleCrosshairDragEnd

  if (!quadViewDragging[viewType]) return

  event.preventDefault()

  // Terminar arrastre para esta vista
  quadViewDragging[viewType] = false
  quadViewLastY[viewType] = 0
}

// Todas las funciones de manejo 3D se han movido a la sección anterior


/**
 * Verifica si el header NIfTI contiene información de medidas físicas
 * Comprueba pixdim y unidades para determinar si se pueden hacer mediciones en mm
 * @param {Object} header - Header del archivo NIfTI
 * @returns {boolean} - True si hay información física válida
 */
function hasPhysicalMeasures(header) {
  // pixdim[1], pixdim[2], pixdim[3] suelen ser el tamaño del voxel en mm
  if (!header || !header.pixDims) return false

  const pixDims = header.pixDims
  // Verifica que los valores sean mayores a cero y razonables
  const hasValidPixDims = pixDims.slice(1, 4).every(dim => typeof dim === 'number' && dim > 0 && dim < 20)

  // xyzt_units indica las unidades (mm, μm, etc)
  const units = header.xyzt_units || header.xyztUnits
  const hasUnits = typeof units === 'number' && units !== 0

  return hasValidPixDims && hasUnits
}

watch(
  () => [mainView.value, getCurrentSliceForMainView()],
  () => {
    // Si la medición no corresponde a la vista/slice actual, límpiala
    if (
      currentMeasurement.value.view !== mainView.value ||
      currentMeasurement.value.slice !== getCurrentSliceForMainView()
    ) {
      currentMeasurement.value = { view: null, slice: null, points: [] }
      measuredDistance.value = null
      measuredDistanceMm.value = null
    }

    // Actualizar también la vista doble cuando cambie la vista o slice
    updateDisplay()
  }
)

// Watcher para cambios de modalidad
watch(selectedModality, (newModality) => {
  if (newModality && caseFiles[newModality.toLowerCase()]) {
    console.log(`Cambiando a modalidad: ${newModality}`)
    loadSelectedModality(newModality.toLowerCase())
  }
})

// Watcher para cambios de zoom
watch(zoomLevel, () => {
  updateDisplay()

  // 🔧 NUEVO: Recarga automática en cambios de zoom
  if (volumeData && canvasMain.value) {
    autoReloadWithDelay('zoom-change', 100)
  }
})

// Watcher para cambios en mediciones
watch(measurements, () => {
  updateDisplay()
}, { deep: true })

// Watcher para cambios de pestaña activa
watch(activeTab, (newTab, oldTab) => {
  console.log(`📋 Cambiando a pestaña: ${newTab} (${tabs.value[newTab]?.title}) desde ${oldTab}`)

  if (newTab === 0) { // Pestaña "Imagen Original"
    console.log('📋 Cambiando a imagen original - asegurando redibujado')
    nextTick(() => {
      if (canvasMain.value && !quadViewActive.value) {
        console.log('📋 Canvas principal encontrado, redibujando vista principal')
        updateDisplay()

        // 🔧 NUEVO: Recarga automática en cambio de pestaña
        if (volumeData) {
          autoReloadWithDelay('tab-change-main', 150)
        }
      } else if (quadViewActive.value) {
        console.log('📋 En modo 4 vistas, forzando redibujado de vistas cuádruples')
        forceRedrawQuadViews()
      }
    })
  } else if (newTab === 1) { // 🆕 Pestaña "Diagnóstico IA" Richard
    console.log('🧠 Cambiando a Diagnóstico IA');

    nextTick(async () => {
      // Verificar si hay información de segmentación
      if (!segmentationInfo.value) {
        console.warn('⚠️ No hay información de segmentación disponible');
        showProfessionalNotification(
          '⚠️ Información',
          'No hay diagnóstico disponible. Sube una imagen primero.',
          'warning'
        );
        return;
      }

      // Si ya tenemos los datos cargados, solo redibujar
      if (segmentedImageData.value && volumeData) {
        console.log('🎨 Redibujando segmentación existente...');
        if (canvasMain.value) {
          updateDisplay();
        }
      }
      // Si no, cargar por primera vez
      else {
        console.log('📥 Cargando segmentación por primera vez...');
        const success = await loadSegmentationForDiagnosis();

        if (success) {
          showProfessionalNotification(
            '✅ Éxito',
            'Segmentación cargada correctamente',
            'success'
          );
        }
      }
    });
  }
  else if (newTab === 2) { // Pestaña "Doble Vista"
  console.log('Cambiando a vista doble - actualizando canvas')
  console.log('Estado: uploadedFiles =', uploadedFiles.value.length)
  console.log('Estado: showOriginalImage =', showOriginalImage.value)

  console.log('Estado: volumeData =', !!volumeData)
  console.log('Estado: zoomLevel =', zoomLevel.value)
  console.log('Estado: measurements =', measurements.value.length)

  // Pequeño delay para asegurar que el DOM esté listo
  nextTick(() => {
    console.log('Buscando canvas doble...')

    if (canvasDoubleOriginal.value) {
      console.log('Canvas doble encontrado, actualizando...')
      drawDoubleOriginalView()
    }

    // Nuevo: Dibujar también el canvas de diagnóstico
    if (canvasDoubleDiagnosis.value && segmentedImageData.value) {
      console.log('Dibujando diagnóstico en vista doble...')
      drawDoubleDiagnosisView()
    }

    if (volumeData) {
      autoReloadWithDelay('tab-change-double', 150)
    }
  })
}
})

// Watcher para cambios en el modo de 4 vistas
watch(quadViewActive, (isActive) => {
  console.log(`🔄 Modo 4 vistas ${isActive ? 'ACTIVADO' : 'DESACTIVADO'}`)
  console.log('🔍 DEBUG WATCHER - allCollapsed.value al inicio:', allCollapsed.value)
  console.log('🔍 DEBUG WATCHER - volumeData existe:', !!volumeData)

  if (isActive) {
    // Esperar a que los canvas estén disponibles en el DOM
    nextTick(() => {
      setTimeout(() => {
        console.log('🔍 DEBUG WATCHER - Dentro del setTimeout de 100ms')
        // Verificar que todos los canvas estén disponibles (3 canvas 2D + 1 canvas 3D)
        const canvasesReady = canvasAxial.value && canvasCoronal.value &&
          canvasSagittal.value && canvas3DRef.value

        console.log('🔍 DEBUG - canvasesReady:', canvasesReady)
        console.log('🔍 DEBUG - canvasAxial:', !!canvasAxial.value)
        console.log('🔍 DEBUG - canvasCoronal:', !!canvasCoronal.value)
        console.log('🔍 DEBUG - canvasSagittal:', !!canvasSagittal.value)
        console.log('🔍 DEBUG - canvas3DRef:', !!canvas3DRef.value)

        if (canvasesReady && volumeData) {
          console.log('🎯 Canvas disponibles, inicializando vistas completas...')

          // Inicializar tamaños de canvas
          initializeQuadrantCanvasSizes()

          // 🔥 INICIALIZAR COMPLETAMENTE LAS 4 VISTAS CON RENDERIZADOR 3D 🔥
          setTimeout(() => {
            console.log('🎯 Ejecutando inicialización completa de 4 vistas...')
            initializeQuadViews()
          }, 200)

          // Dibujar las vistas iniciales inmediatamente
          setTimeout(() => {
            console.log('🖼️ Dibujando vistas iniciales...')
            if (canvasAxial.value) {
              const ctx = canvasAxial.value.getContext('2d')
              drawAxialView(ctx, canvasAxial.value)
            }
            if (canvasCoronal.value) {
              const ctx = canvasCoronal.value.getContext('2d')
              drawCoronalView(ctx, canvasCoronal.value)
            }
            if (canvasSagittal.value) {
              const ctx = canvasSagittal.value.getContext('2d')
              drawSagittalView(ctx, canvasSagittal.value)
            }
            update3DQuadrantView()
            console.log('✅ Vistas iniciales dibujadas')
          }, 300)

          // 🖼️ NUEVA FUNCIONALIDAD: Activar modo maximizado automáticamente DESPUÉS de inicializar vistas
          setTimeout(() => {
            console.log('✅ Vistas completas inicializadas')
            console.log('🔍 DEBUG - allCollapsed.value:', allCollapsed.value)
            console.log('🔍 DEBUG - quadViewActive.value:', quadViewActive.value)
            console.log('🔍 DEBUG - typeof toggleCenterExpansion:', typeof toggleCenterExpansion)

            if (!allCollapsed.value) {
              console.log('🖼️ Activando modo maximizado automáticamente por modo 4 vistas')
              try {
                console.log('🔍 DEBUG - Llamando a toggleCenterExpansion()...')
                toggleCenterExpansion()
                console.log('🔍 DEBUG - toggleCenterExpansion() ejecutado')
                console.log('🔍 DEBUG - allCollapsed.value después:', allCollapsed.value)

                showProfessionalNotification(
                  '🖼️ Modo Maximizado Activado',
                  'Vista maximizada activada automáticamente para mejor experiencia en 4 vistas',
                  'success'
                )
                console.log('✅ Modo maximizado activado por modo 4 vistas')
              } catch (error) {
                console.error('❌ Error al activar modo maximizado:', error)
              }
            } else {
              console.log('ℹ️ Ya está en modo maximizado')
            }
          }, 500)
        } else {
          console.warn('⚠️ Canvas o datos no disponibles, reintentando...')
          // Reintentar después de un delay más largo
          setTimeout(() => {
            if (quadViewActive.value) {
              console.log('🔄 Reintentando inicialización completa de canvas...')
              initializeQuadrantCanvasSizes()

              // 🔥 TAMBIÉN EJECUTAR INICIALIZACIÓN COMPLETA EN REINTENTO 🔥
              setTimeout(() => {
                console.log('🎯 Ejecutando inicialización completa en reintento...')
                initializeQuadViews()
              }, 200)

              // También dibujar las vistas en el reintento
              setTimeout(() => {
                if (volumeData) {
                  console.log('🖼️ Dibujando vistas en reintento...')
                  if (canvasAxial.value) {
                    const ctx = canvasAxial.value.getContext('2d')
                    drawAxialView(ctx, canvasAxial.value)
                  }
                  if (canvasCoronal.value) {
                    const ctx = canvasCoronal.value.getContext('2d')
                    drawCoronalView(ctx, canvasCoronal.value)
                  }
                  if (canvasSagittal.value) {
                    const ctx = canvasSagittal.value.getContext('2d')
                    drawSagittalView(ctx, canvasSagittal.value)
                  }
                  update3DQuadrantView()
                }
              }, 300)
            }
          }, 500)
        }
      }, 100)
    })
  } else {
    // Al desactivar 4 vistas, redibujar la vista principal
    console.log('🔄 Desactivando 4 vistas, redibujando vista principal...')

    // 🔧 NUEVO: Limpiar 3D del composable
    console.log('🧹 Limpiando vista 3D del composable...')
    cleanupFourViews3D()

    // 🧹 LIMPIEZA DE CANVAS WEBGL SEPARADO
    if (renderer && renderer.domElement) {
      console.log('🧹 Limpiando canvas WebGL del renderer principal...')
      const canvas = renderer.domElement

      // Solo intentar remover si el canvas tiene un padre
      if (canvas.parentNode) {
        try {
          canvas.parentNode.removeChild(canvas)
          console.log('✅ Canvas WebGL removido del DOM')
        } catch (removeError) {
          console.warn('⚠️ No se pudo remover canvas del DOM:', removeError.message)
        }
      }

      // Limpiar el renderer
      try {
        renderer.dispose()
        console.log('✅ Renderer WebGL limpiado')
      } catch (disposeError) {
        console.warn('⚠️ Error limpiando renderer:', disposeError.message)
      }

      renderer = null
    }

    // 🧹 LIMPIEZA OPCIONAL DE RECURSOS 3D (comentado para mantener rendimiento)
    // Si quieres liberar memoria cuando sales de 4 vistas, descomenta lo siguiente:
    /*
    console.log('🧹 Limpiando recursos 3D innecesarios...')
    if (volumeMesh && scene) {
      scene.remove(volumeMesh)
      volumeMesh.geometry?.dispose()
      volumeMesh.material?.dispose()
      volumeMesh = null
      console.log('✅ Mesh volumétrico liberado')
    }
    */

    nextTick(() => {
      setTimeout(() => {
        if (volumeData && canvasMain.value) {
          console.log('🎯 Canvas principal disponible, forzando redibujado...')
          updateDisplay()
        } else {
          console.warn('⚠️ Canvas principal no disponible después de desactivar 4 vistas')
        }
      }, 50) // Dar un poco más de tiempo para que el DOM se actualice
    })

    // 📐 OPCIONAL: Desactivar modo maximizado cuando se desactiva modo 4 vistas
    if (allCollapsed.value) {
      console.log('📐 Desactivando modo maximizado por salir de modo 4 vistas')
      try {
        toggleCenterExpansion()

        showProfessionalNotification(
          '📐 Modo Normal Restaurado',
          'Vista normal restaurada al salir del modo 4 vistas',
          'info'
        )
        console.log('✅ Modo maximizado desactivado por salir de modo 4 vistas')
      } catch (error) {
        console.error('❌ Error al desactivar modo maximizado:', error)
      }
    }
  }
})

// Watchers para slices individuales en modo 4 vistas
watch(() => currentSlices.axial, (newSlice) => {
  if (quadViewActive.value && canvasAxial.value) {
    console.log(`🎯 Slice axial cambió a ${newSlice}, redibujando...`)
    nextTick(() => {
      drawViewWithZoom(canvasAxial.value, 'axial')
      // Actualizar vista 3D también
      update3DQuadrantView()
    })
  }
})

watch(() => currentSlices.coronal, (newSlice) => {
  if (quadViewActive.value && canvasCoronal.value) {
    console.log(`🎯 Slice coronal cambió a ${newSlice}, redibujando...`)
    nextTick(() => {
      drawViewWithZoom(canvasCoronal.value, 'coronal')
      // Actualizar vista 3D también
      update3DQuadrantView()
    })
  }
})

watch(() => currentSlices.sagittal, (newSlice) => {
  if (quadViewActive.value && canvasSagittal.value) {
    console.log(`🎯 Slice sagittal cambió a ${newSlice}, redibujando...`)
    nextTick(() => {
      drawViewWithZoom(canvasSagittal.value, 'sagittal')
      // Actualizar vista 3D también
      update3DQuadrantView()
    })
  }
})

watch(() => mainView.value, (newMainView, oldMainView) => {
  console.log(`🔄 Cambio de vista: ${oldMainView} → ${newMainView}`);

  // ===== OPTIMIZACIÓN AUTOMÁTICA DE RECURSOS =====
  // Si salimos de vista 3D a vista 2D, aplicar optimizaciones
  if (oldMainView === '3d' && newMainView !== '3d') {
    console.log('🔄 Detectado cambio de 3D a 2D - aplicando optimizaciones automáticas...');

    // Usar limpieza automática de recursos (sin duplicar la lógica de setMainView)
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
      console.log('✅ Render loop 3D detenido automáticamente');
    }

    // 🆘 SOLUCIÓN MEJORADA: Forzar regeneración completa del canvas 2D
    nextTick(() => {
      if (volumeData && canvasMain.value) {
        console.log(`🔧 Regenerando canvas 2D para vista ${newMainView}`);

        // Limpiar contexto 2D completamente
        const ctx = canvasMain.value.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height);
          // Resetear estado del contexto
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.restore();
        }

        // Forzar actualización con pequeño delay para evitar conflictos
        setTimeout(() => {
          updateDisplay();

          // Verificar que el renderizado fue exitoso
          setTimeout(() => {
            if (ctx && canvasMain.value.width > 0 && canvasMain.value.height > 0) {
              const imageData = ctx.getImageData(0, 0, canvasMain.value.width, canvasMain.value.height);
              const hasContent = Array.from(imageData.data).some(pixel => pixel > 0);

              if (!hasContent) {
                console.warn('⚠️ Canvas 2D vacío después de transición desde 3D, forzando re-renderizado...');
                forceCompleteRerender();
              } else {
                console.log(`✅ Transición 3D → 2D completada exitosamente para vista ${newMainView}`);
              }
            } else if (ctx) {
              console.warn(`⚠️ Canvas con tamaño inválido en transición 3D→2D: ${canvasMain.value.width}x${canvasMain.value.height}`);
              syncCanvasSize(canvasMain.value);
              setTimeout(() => updateDisplay(), 100);
            }
          }, 150);
        }, 50);
      }
    });
  }

  // Si entramos a vista 3D desde vista 2D, preparar recursos
  if (oldMainView !== '3d' && newMainView === '3d') {
    console.log('🔄 Detectado cambio de 2D a 3D - preparando recursos...');

    // Reactivar optimizaciones automáticamente si estaban deshabilitadas
    if (!zoomStepsEnabled.value) {
      zoomStepsEnabled.value = true;
      console.log('✅ Steps adaptativos reactivados automáticamente');
    }
  }

  // 🔧 MEJORA GENERAL: Asegurar actualización para cualquier cambio de vista
  if (newMainView !== oldMainView && volumeData && !quadViewActive.value) {
    console.log(`🎯 Actualizando vista tras cambio a ${newMainView}`);

    // Pequeño delay para asegurar que el DOM se haya actualizado
    setTimeout(() => {
      updateDisplay();
    }, 50);
  }

  // ✅ En modo 4 vistas, la vista principal es siempre 3D, no hay canvas "main" separado
  // La actualización se maneja mediante update3DQuadrantView() automáticamente

  // Manejar transición A vista 3D
  if (newMainView === '3d') {
    console.log('🎮 Entrando a vista 3D...');
    bottomSectionCollapsed.value = false
    showProfessionalNotification(
      '🎛️ Controles 3D Activados',
      'Los controles de renderizado 3D están ahora disponibles en la parte inferior',
      'info'
    )

    // Asegurar que el renderer 3D esté listo y correctamente dimensionado
    nextTick(() => {
      if (selectedColorPreset.value >= 0) {
        console.log(`🎨 Aplicando preset ${selectedColorPreset.value} al entrar a vista 3D`);
        applyColorPreset();
      }

      // Forzar actualización del renderer 3D después del cambio de vista
      setTimeout(() => {
        if (renderer && threeCanvas.value) {
          console.log('🎮 Forzando actualización del renderer al cambiar a vista 3D...');
          // Asegurar que el canvas tiene el tamaño correcto
          syncCanvasSize(threeCanvas.value);
          forceUpdate3DRenderer();
        }
      }, 200);
    })
  }

  // Manejar transición DESDE vista 3D hacia vista 2D
  if (oldMainView === '3d' && newMainView !== '3d') {
    console.log(`Saliendo de vista 3D hacia vista 2D: ${newMainView}`);

    // Aplicar limpieza adicional para asegurar rendimiento óptimo en 2D
    nextTick(() => {
      console.log('🧹 Aplicando limpieza adicional para vista 2D...');

      // Llamar a la función de preparación 2D
      prepare2DRendering();
    });

    // Forzar sincronización y actualización del canvas principal
    nextTick(() => {
      if (canvasMain.value) {
        console.log('🔄 Sincronizando canvas principal para vista 2D...');

        // Sincronizar tamaño del canvas
        syncCanvasSize(canvasMain.value);

        // Forzar redibujado independientemente de si cambió el tamaño
        if (volumeData) {
          console.log(`📐 Forzando redibujado para vista ${newMainView}`);
          setTimeout(() => {
            updateDisplay();
          }, 100);

          // Segundo intento para asegurar que se renderice
          setTimeout(() => {
            updateDisplay();
          }, 300);
        }
      }
    });
  }

  // Manejar cambios entre vistas 2D (axial, coronal, sagittal)
  if (oldMainView !== '3d' && newMainView !== '3d' && oldMainView !== newMainView) {
    console.log(`🔄 Cambio entre vistas 2D: ${oldMainView} → ${newMainView}`);

    nextTick(() => {
      if (canvasMain.value && volumeData) {
        // Pequeño delay para asegurar que la vista se haya actualizado
        setTimeout(() => {
          updateDisplay();
        }, 50);
      }
    });
  }
})

// Watcher para modo expandido - redimensiona canvas automáticamente
watch(() => allCollapsed.value, (isExpanded) => {
  console.log(`🔄 Modo expandido: ${isExpanded ? 'Activado' : 'Desactivado'}`)

  nextTick(() => {
    // Redimensionar canvas para adaptarse al nuevo modo
    resizeMainCanvasToContainer()

    if (quadViewActive.value) {
      // Si estamos en modo 4 vistas, sincronizar todos los canvas y redibujar
      console.log('🔄 Sincronizando canvas del quad view tras cambio de modo expandido')
      setTimeout(() => {
        syncAllQuadCanvases();
        forceRedrawQuadViews();
      }, 100);
    } else if (mainView.value !== '3d') {
      // Forzar re-renderización completa después del redimensionamiento
      setTimeout(() => {
        forceCompleteRerender();

        // 🆘 DETECCIÓN DE CANVAS EN NEGRO después de cambio de modo
        setTimeout(() => {
          detectAndRecoverBlackCanvas();
        }, 300);
      }, 150); // Delay para asegurar que el redimensionamiento haya terminado
    }

    // Mostrar notificación
    if (isExpanded) {
      showProfessionalNotification(
        '🔍 Modo Expandido Activado',
        'El canvas se ha expandido para mejor visualización',
        'success'
      )
    } else {
      showProfessionalNotification(
        '↩️ Modo Normal Restaurado',
        'El canvas ha vuelto a su tamaño normal',
        'info'
      )
    }
  })
}, { immediate: false })

// ========================================
// WATCHERS OPTIMIZADOS PARA RENDERIZADO 3D
// ========================================

// Watcher optimizado para controles 3D con debounce
watch([opacity3D, threshold3D, brightness3D, contrast3D], () => {
  if (volumeMesh) {
    debouncedUpdateUniforms3D();
  }
}, { immediate: false })

// Watcher para clipping planes
watch([clippingX, clippingY, clippingZ], () => {
  if (volumeMesh) {
    updateUniforms3D();
  }
}, { immediate: false })

// Watcher para colores con debounce
watch([lowColor, midColor, highColor], (newColors) => {
  console.log('🎨 Watcher de colores disparado:', {
    lowColor: newColors[0],
    midColor: newColors[1],
    highColor: newColors[2],
    volumeMesh: !!volumeMesh,
    mainView: mainView.value
  });

  if (volumeMesh && mainView.value === '3d') {
    console.log('🔄 Actualizando uniformes desde watcher de colores...');

    // Actualización inmediata para cambios de colores
    updateUniforms3D();

    // Forzar renderizado inmediato
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
      console.log('🎯 Renderizado forzado después de cambio de colores');
    }
  } else {
    console.log('⏸️ No se actualiza: volumeMesh =', !!volumeMesh, 'mainView =', mainView.value);
  }
}, { immediate: false, deep: true })

// Watcher para cambio de preset de colores - actualización automática
watch(() => selectedColorPreset.value, (newPresetIndex, oldPresetIndex) => {
  // Solo aplicar si realmente cambió
  if (newPresetIndex !== oldPresetIndex) {
    console.log(`🎨 Preset cambió de ${oldPresetIndex} a ${newPresetIndex}, aplicando automáticamente...`);

    // Aplicar siempre para preparar colores, independientemente de la vista actual
    applyColorPreset();

    // Si estamos en vista 3D, la actualización se maneja por el watcher de colores
    if (mainView.value === '3d' && volumeMesh) {
      console.log(`✅ Vista 3D se actualizará automáticamente`);
    } else {
      console.log(`📋 Colores preparados para cuando se active vista 3D`);
    }
  }
}, { immediate: false })

// ========================================
// FUNCIONES PARA BORRAR MEDICIONES
// ========================================

/**
 * Alterna la visibilidad del menú de opciones de mediciones
 */
function toggleMeasurementMenu() {
  showMeasurementMenu.value = !showMeasurementMenu.value
  console.log('🔧 Menú de mediciones:', showMeasurementMenu.value ? 'ABIERTO' : 'CERRADO')
}

/**
 * Alterna la visibilidad del panel de filtros AI
 */
function toggleAIFilterPanel() {
  showAIFilterPanel.value = !showAIFilterPanel.value
  console.log('🔬 Panel de filtros AI:', showAIFilterPanel.value ? 'ABIERTO' : 'CERRADO')
}

/**
 * Obtiene el número de mediciones en la vista y slice actual
 * @returns {number} - Cantidad de mediciones en la vista actual
 */
function getCurrentViewMeasurementCount() {
  const currentView = mainView.value
  const currentSlice = getCurrentSliceForMainView()
  return measurements.value.filter(m => m.view === currentView && m.slice === currentSlice).length
}

/**
 * Calcula la distancia perpendicular de un punto a una línea
 * @param {Object} point - Punto {x, y}
 * @param {Object} lineStart - Punto inicial de la línea {x, y}
 * @param {Object} lineEnd - Punto final de la línea {x, y}
 * @returns {number} - Distancia perpendicular en píxeles
 */
function pointToLineDistance(point, lineStart, lineEnd) {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  if (lenSq === 0) {
    // La línea es en realidad un punto
    return Math.sqrt(A * A + B * B)
  }

  let param = dot / lenSq

  let xx, yy

  if (param < 0) {
    xx = lineStart.x
    yy = lineStart.y
  } else if (param > 1) {
    xx = lineEnd.x
    yy = lineEnd.y
  } else {
    xx = lineStart.x + param * C
    yy = lineStart.y + param * D
  }

  const dx = point.x - xx
  const dy = point.y - yy
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Encuentra la medición más cercana al punto de click
 * @param {Object} clickPoint - Punto donde se hizo click {x, y}
 * @param {number} tolerance - Tolerancia en píxeles para considerar un hit
 * @returns {number|null} - Índice de la medición encontrada o null
 */
function findMeasurementNearClick(clickPoint, tolerance = 10) {
  const currentView = mainView.value
  const currentSlice = getCurrentSliceForMainView()

  let closestIndex = null
  let closestDistance = tolerance

  measurements.value.forEach((measurement, index) => {
    // Solo considerar mediciones de la vista y slice actual
    if (measurement.view === currentView && measurement.slice === currentSlice && measurement.points.length === 2) {
      const distance = pointToLineDistance(clickPoint, measurement.points[0], measurement.points[1])

      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    }
  })

  return closestIndex
}

/**
 * Borra una medición específica
 * @param {number} index - Índice de la medición a borrar
 */
function deleteMeasurement(index) {
  if (index >= 0 && index < measurements.value.length) {
    const measurement = measurements.value[index]
    console.log(`🗑️ Borrando medición ${index + 1}: ${measurement.distance || 'Sin calcular'} px`)

    measurements.value.splice(index, 1)
    updateDisplay()

    // Mostrar mensaje de confirmación
    console.log(`✅ Medición borrada. Quedan ${measurements.value.length} mediciones`)
  }
}

/**
 * Migra mediciones antiguas con coordenadas absolutas a coordenadas relativas
 * o las marca como incompatibles para ser limpiadas
 */
function checkAndMigrateMeasurements() {
  console.log('🔄 Verificando compatibilidad de mediciones existentes...');

  let incompatibleCount = 0;
  const validMeasurements = [];

  measurements.value.forEach((measurement, index) => {
    // Verificar si la medición tiene el formato nuevo (coordenadas relativas)
    const hasRelativeCoords = measurement.points &&
      measurement.points.length === 2 &&
      measurement.points[0].x <= 1 &&
      measurement.points[0].y <= 1 &&
      measurement.points[1].x <= 1 &&
      measurement.points[1].y <= 1;

    if (hasRelativeCoords) {
      // Medición ya está en formato relativo, mantenerla
      validMeasurements.push(measurement);
      console.log(`✅ Medición ${index} ya está en formato relativo`);
    } else {
      // Medición en formato absoluto o incompatible
      console.log(`❌ Medición ${index} en formato absoluto (incompatible)`, measurement);
      incompatibleCount++;
    }
  });

  if (incompatibleCount > 0) {
    console.log(`🗑️ Limpiando ${incompatibleCount} mediciones incompatibles`);
    measurements.value = validMeasurements;

    // Mostrar notificación al usuario
    showProfessionalNotification(
      '🔄 Mediciones actualizadas',
      `Se limpiaron ${incompatibleCount} mediciones incompatibles con el nuevo sistema de coordenadas`,
      'warning'
    );
  } else {
    console.log('✅ Todas las mediciones son compatibles');
  }
}

/**
 * Borra todas las mediciones de la vista y slice actual
 */
function clearCurrentViewMeasurements() {
  const currentView = mainView.value
  const currentSlice = getCurrentSliceForMainView()

  const initialCount = measurements.value.length
  measurements.value = measurements.value.filter(m =>
    m.view !== currentView || m.slice !== currentSlice
  )

  const deletedCount = initialCount - measurements.value.length
  if (deletedCount > 0) {
    console.log(`🗑️ Borradas ${deletedCount} mediciones de la vista ${currentView}, slice ${currentSlice + 1}`)
    updateDisplay()
  }

  // Cerrar menú después de la acción
  showMeasurementMenu.value = false
}

/**
 * Borra todas las mediciones
 */
function clearAllMeasurements() {
  const count = measurements.value.length
  measurements.value = []
  currentMeasurement.value = { view: null, slice: null, points: [] }
  measuredDistance.value = null
  measuredDistanceMm.value = null

  console.log(`🗑️ Borradas todas las mediciones (${count} total)`)
  updateDisplay()

  // Cerrar menú después de la acción
  showMeasurementMenu.value = false
}

/**
 * Maneja el evento de doble click en el canvas para borrar mediciones
 * @param {MouseEvent} event - Evento de doble click
 */
function handleMeasurementDoubleClick(event) {
  // Solo procesar si no estamos en modo de medición activa
  if (measureActive.value) {
    return
  }

  const canvas = event.target
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  // Convertir coordenadas del mouse a coordenadas de imagen considerando zoom focal
  const imageCoords = convertMouseToImageCoords(mouseX, mouseY)

  console.log('🖱️ Doble click detectado en:', {
    mouse: { x: mouseX, y: mouseY },
    imagen: imageCoords
  })

  const measurementIndex = findMeasurementNearClick(imageCoords)

  if (measurementIndex !== null) {
    deleteMeasurement(measurementIndex)
    console.log(`✅ Medición ${measurementIndex + 1} borrada por doble click`)
  } else {
    console.log('ℹ️ No hay mediciones cerca del punto de click')
  }
}

/**
 * Maneja el doble click específicamente para las vistas del quad view
 * Permite reset de zoom por vista y borrado de mediciones
 * @param {MouseEvent} event - Evento de doble click
 * @param {string} viewType - Tipo de vista ('axial', 'coronal', 'sagittal', 'main')
 */
function handleCanvasDoubleClick(event, viewType) {
  console.log(`🖱️ Doble click en vista ${viewType}`)

  if (zoomActive.value) {
    // Reset zoom para esta vista específica
    quadZoomLevels[viewType] = 1
    quadZoomOrigins[viewType] = { x: 0, y: 0 }
    quadZoomTranslates[viewType] = { x: 0, y: 0 }

    // Redibujar la vista
    nextTick(() => {
      const canvasRef = getCanvasRefForView(viewType)
      if (canvasRef?.value) {
        drawViewWithZoom(canvasRef.value, viewType)
      }
    })

    console.log(`🔄 Zoom reseteado para vista ${viewType}`)

    showProfessionalNotification(
      `🔄 Zoom Reseteado`,
      `Vista ${viewType.toUpperCase()} restaurada a 100%`,
      'info'
    )
  } else if (!measureActive.value) {
    // Si no estamos en modo medición, intentar borrar mediciones
    handleMeasurementDoubleClick(event)
  }
}

// ========================================
// FUNCIONES DE RENDERIZADO 3D
// ========================================

/**
 * Aplica un preset de colores a la visualización 3D
 */
function applyColorPreset() {
  const preset = colorPresets.value[selectedColorPreset.value];

  if (!preset) {
    console.warn('⚠️ Preset de color no encontrado:', selectedColorPreset.value);
    return;
  }

  console.log(`🎨 Aplicando preset: ${preset.name}`);

  // Actualizar colores - esto disparará automáticamente el watcher
  lowColor.value.set(preset.colors.low[0], preset.colors.low[1], preset.colors.low[2]);
  midColor.value.set(preset.colors.mid[0], preset.colors.mid[1], preset.colors.mid[2]);
  highColor.value.set(preset.colors.high[0], preset.colors.high[1], preset.colors.high[2]);

  // Mostrar notificación profesional
  showProfessionalNotification(
    '🎨 Esquema de Colores Aplicado',
    `Preset "${preset.name}" aplicado correctamente`,
    'success'
  );

  // Forzar actualización inmediata si estamos en vista 3D
  if (mainView.value === '3d' && volumeMesh) {
    console.log(`🔄 Forzando actualización inmediata de uniformes para preset: ${preset.name}`);

    // Usar nextTick para asegurar que los valores reactivos se hayan actualizado
    nextTick(() => {
      updateUniforms3D();

      // Forzar un frame de renderizado
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
        console.log(`🎯 Frame forzado renderizado con nuevos colores`);
      }
    });
  } else {
    console.log(`✅ Vista 3D se actualizará automáticamente con preset: ${preset.name}`);
  }
}

/**
 * Convierte un THREE.Vector3 a formato hexadecimal para color picker
 */
function vectorToHex(vector) {
  const r = Math.round(vector.x * 255).toString(16).padStart(2, '0');
  const g = Math.round(vector.y * 255).toString(16).padStart(2, '0');
  const b = Math.round(vector.z * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Convierte color hexadecimal a valores RGB normalizados
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

/**
 * Actualiza el color bajo desde el color picker
 */
function updateLowColor(event) {
  const rgb = hexToRgb(event.target.value);
  if (rgb) {
    lowColor.value.set(rgb.r, rgb.g, rgb.b);
  }
}

/**
 * Actualiza el color medio desde el color picker
 */
function updateMidColor(event) {
  const rgb = hexToRgb(event.target.value);
  if (rgb) {
    midColor.value.set(rgb.r, rgb.g, rgb.b);
  }
}

/**
 * Actualiza el color alto desde el color picker
 */
function updateHighColor(event) {
  const rgb = hexToRgb(event.target.value);
  if (rgb) {
    highColor.value.set(rgb.r, rgb.g, rgb.b);
  }
}

/**
 * Resetea todos los controles 3D a valores por defecto
 */
function resetToDefaults() {
  opacity3D.value = 1.0;
  threshold3D.value = 0.010;
  brightness3D.value = 1.70;
  contrast3D.value = 2.10;
  baseSteps.value = 256;
  clippingX.value = 1.0;
  clippingY.value = 1.0;
  clippingZ.value = 1.0;

  // Resetear al preset por defecto (Escala de Grises)
  selectedColorPreset.value = 1;
  applyColorPreset();

  console.log('🔄 Controles 3D reseteados a valores por defecto');
}

/**
 * Toma una captura de pantalla de la vista 3D
 */
function takeScreenshot3D() {
  if (!renderer) {
    console.warn('⚠️ Renderizador 3D no disponible para captura');
    return;
  }

  try {
    // Renderizar frame actual
    renderer.render(scene, camera);

    // Crear enlace de descarga
    const canvas = renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `volumen_3d_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = dataURL;
    link.click();

    console.log('📸 Captura 3D guardada exitosamente');
  } catch (error) {
    console.error('❌ Error tomando captura 3D:', error);
  }
}

/**
 * Monitorea el uso de memoria WebGL y alerta si es excesivo
 */
function monitorWebGLMemory() {
  if (!renderer || !renderer.info) return;

  const info = renderer.info;
  const memoryMB = (info.memory.geometries * 1000 + info.memory.textures * 1000) / (1024 * 1024);

  performanceInfo3D.value.memoryMB = Math.round(memoryMB);

  // Alertar si el uso de memoria es excesivo (más de 500MB)
  if (memoryMB > 500) {
    console.warn('⚠️ Uso excesivo de memoria WebGL:', memoryMB.toFixed(1), 'MB');
    console.warn('🧹 Considerando limpieza de recursos...');

    // Auto-limpieza si excede 1GB
    if (memoryMB > 1000) {
      console.error('🚨 Memoria crítica! Limpiando recursos 3D automáticamente...');
      cleanup3DResources();
    }
  }
}

/**
 * Limpia completamente todos los recursos 3D para evitar memory leaks
 */
function cleanup3DResources() {
  console.log('🧹 Limpiando recursos 3D...');

  try {
    // Detener el loop de animación
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Limpiar volumen mesh
    if (volumeMesh) {
      // Remover de la escena
      if (scene) {
        scene.remove(volumeMesh);
      }

      // Liberar geometría
      if (volumeMesh.geometry) {
        volumeMesh.geometry.dispose();
      }

      // Liberar material y uniformes
      if (volumeMesh.material) {
        // Liberar texturas de los uniformes
        if (volumeMesh.material.uniforms) {
          Object.values(volumeMesh.material.uniforms).forEach(uniform => {
            if (uniform.value && uniform.value.dispose) {
              uniform.value.dispose();
            }
          });
        }
        volumeMesh.material.dispose();
      }

      volumeMesh = null;
    }

    // Limpiar textura de volumen
    if (volumeTexture) {
      volumeTexture.dispose();
      volumeTexture = null;
    }

    // Limpiar controles
    if (controls) {
      controls.dispose();
      controls = null;
    }

    // Limpiar renderer
    if (renderer) {
      renderer.dispose();
      // NO forzar pérdida de contexto aquí - causa problemas de reinicialización
      // renderer.forceContextLoss();
      renderer.domElement = null;
      renderer = null;
    }

    // Limpiar escena
    if (scene) {
      // Remover todos los objetos de la escena
      while (scene.children.length > 0) {
        const object = scene.children[0];
        scene.remove(object);

        // Liberar recursos del objeto si los tiene
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
      scene = null;
    }

    // Limpiar cámara
    camera = null;

    // Forzar garbage collection si está disponible
    if (window.gc) {
      window.gc();
    }

    console.log('✅ Recursos 3D limpiados correctamente');

  } catch (error) {
    console.error('❌ Error al limpiar recursos 3D:', error);
  }
}

// Vertex shader para renderizado volumétrico
const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  void main() {
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader mejorado con soporte para IA y segmentación
const fragmentShader = `
  precision mediump float; // Cambiar a mediump para mejor rendimiento

  // Uniforms básicos del volumen
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

  // Función optimizada para intersección AABB
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

  // Función para obtener color de segmentación según el label
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

  void main() {
    vec3 rayDir = normalize(vWorldPosition - cameraPos);
    vec3 rayOrigin = cameraPos;

    // Límites del volumen optimizados
    vec3 adjustedBoxMin = vec3(-0.5) * clippingPlane;
    vec3 adjustedBoxMax = vec3(0.5) * clippingPlane;

    vec2 bounds = intersectAABB(rayOrigin, rayDir, adjustedBoxMin, adjustedBoxMax);

    if (bounds.x > bounds.y) discard;

    float rayLength = bounds.y - bounds.x;
    float stepSize = rayLength / steps;

    // Early exit si el step es muy pequeño
    if (stepSize < 0.001) discard;

    vec3 step = rayDir * stepSize;
    vec3 pos = rayOrigin + rayDir * bounds.x;

    vec4 color = vec4(0.0);
    float totalAlpha = 0.0;

    // Loop optimizado con soporte para IA
    for (float i = 0.0; i < steps; i++) {
      vec3 samplePos = pos + 0.5;

      // Verificación de límites simplificada
      if (any(lessThan(samplePos, vec3(0.0))) ||
          any(greaterThan(samplePos, vec3(1.0)))) {
        pos += step;
        continue;
      }

      // ========================================
      // OBTENER DENSIDAD DEL VOLUMEN (con soporte IA)
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

      // Aplicar ajustes de brillo y contraste al color base
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
`;

/**
 * Inicializa Three.js y configura el renderizador 3D
 */
async function initThree() {
  try {
    // 🔥 Usar el canvas correcto según el modo
    let canvas
    if (quadViewActive.value && canvas3DRef.value) {
      canvas = canvas3DRef.value
      console.log('🎯 Usando canvas3DRef para modo cuádruple')
    } else if (threeCanvas.value) {
      canvas = threeCanvas.value
      console.log('🎯 Usando threeCanvas para modo normal')
    }

    if (!canvas) {
      console.warn('Canvas 3D no disponible para inicialización');
      return false;
    }

    console.log('🎯 Inicializando Three.js...');
    console.log('Canvas info:', {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    });

    // Verificar si ya hay un renderizador válido para este canvas
    if (renderer && renderer.domElement === canvas) {
      console.log('✅ Renderizador ya existe para este canvas, reutilizando...');
      return true;
    }

    // Solo limpiar si vamos a crear un nuevo renderizador
    if (renderer && renderer.domElement !== canvas) {
      console.log('🧹 Limpiando renderizador para canvas diferente...');
      cleanup3DResources();

      // Esperar un poco para que el contexto WebGL se limpie completamente
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verificar soporte de WebGL antes de crear el renderizador
    const tempCanvas = document.createElement('canvas');
    const testContext = tempCanvas.getContext('webgl2') || tempCanvas.getContext('webgl');
    if (!testContext) {
      console.error('❌ WebGL no está soportado en este navegador');
      return false;
    }

    console.log('✅ WebGL soportado, creando renderizador...');

    // Crear renderizador con configuración optimizada para rendimiento
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // Deshabilitar para mejor rendimiento
      alpha: true,
      powerPreference: 'high-performance', // Solicitar GPU dedicada
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false // Optimización de memoria
    });

    // 🎯 NUEVO: Marcar el canvas como renderizador 3D principal para detección
    canvas.setAttribute('data-engine', 'three.js')
    canvas.classList.add('three-canvas', 'medical-3d')
    console.log('🎯 Canvas marcado como renderizador 3D principal')

    // Configurar renderizador con optimizaciones
    renderer.setClearColor(0x000000, 1); // Negro igual que el main-canvas
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limitar pixel ratio

    // Optimizaciones adicionales del renderizador
    renderer.shadowMap.enabled = false; // Deshabilitar sombras
    renderer.physicallyCorrectLights = false; // Deshabilitar luces físicamente correctas

    // Configuraciones de contexto WebGL para rendimiento
    const gl = renderer.getContext();
    gl.disable(gl.DEPTH_TEST); // Deshabilitado para volúmenes transparentes
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Manejar eventos de contexto WebGL
    canvas.addEventListener('webglcontextlost', (event) => {
      console.warn('⚠️ Contexto WebGL perdido');
      event.preventDefault();
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.log('✅ Contexto WebGL restaurado');
      // Reinicializar recursos si es necesario
      if (volumeData) {
        create3DVolumeFromExistingData();
      }
      animate3D();
    });

    // Verificar que el contexto WebGL se creó correctamente
    const glContext = renderer.getContext();
    if (!glContext) {
      console.error('❌ No se pudo obtener contexto WebGL');
      return false;
    }

    console.log('✅ Contexto WebGL creado exitosamente');
    console.log('📊 WebGL Info:', {
      vendor: glContext.getParameter(glContext.VENDOR),
      renderer: glContext.getParameter(glContext.RENDERER),
      version: glContext.getParameter(glContext.VERSION),
      maxTextureSize: glContext.getParameter(glContext.MAX_TEXTURE_SIZE),
      max3DTextureSize: glContext.getParameter(glContext.MAX_3D_TEXTURE_SIZE) || 'No soportado'
    });

    // Crear escena
    scene = new THREE.Scene();

    // Crear cámara
    camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0); // Asegurar que mira al centro

    // Crear controles con configuración optimizada
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // Centro de rotación en el origen
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 10; // Limitar zoom out
    controls.minDistance = 0.5; // Limitar zoom in

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Ejes de referencia
    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);

    // Iniciar animación
    animate3D();

    console.log('✅ Three.js inicializado correctamente');
    return true;

  } catch (error) {
    console.error('❌ Error inicializando Three.js:', error);
    console.error('Stack trace:', error.stack);

    // Limpiar recursos parciales en caso de error
    if (renderer) {
      try {
        renderer.dispose();
      } catch (e) {
        console.warn('Error limpiando renderer:', e);
      }
      renderer = null;
    }

    scene = null;
    camera = null;
    controls = null;

    return false;
  }
}

/**
 * Loop de animación optimizado para Three.js
 */
function animate3D() {
  animationId = requestAnimationFrame(animate3D);

  // ===== MONITOREO DE RENDIMIENTO INTEGRADO =====
  monitorPerformance(); // Llamar al sistema de monitoreo automático

  const currentTime = performance.now();
  const deltaTime = currentTime - lastFrameTime;

  // Control de framerate - saltar frames si es necesario
  if (deltaTime < targetFrameTime) {
    return;
  }

  // Monitoreo de performance y memoria (mantenemos el sistema original también)
  frameCount++;

  if (currentTime - lastTime >= 1000) {
    performanceInfo3D.value.fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
    frameCount = 0;
    lastTime = currentTime;

    // Monitorear memoria cada segundo
    monitorWebGLMemory();

    // Ajustar LOD basado en FPS
    if (useAdaptiveLOD.value) {
      adjustAdaptiveLOD();
    }
  }

  // ===== OPTIMIZACIÓN: SOLO PROCESAR SI LA VISTA ES 3D =====
  if (mainView.value !== '3d') {
    // Si no estamos en vista 3D, salir temprano para ahorrar recursos
    return;
  }

  // Actualizar controles solo si es necesario
  if (controls && controls.enabled) {
    controls.update();
  }

  // Actualizar steps adaptativos basados en zoom
  updateAdaptiveSteps();

  // Actualizar uniformes del shader con menor frecuencia
  if (frameCount % 3 === 0) { // Cada 3 frames
    updateUniforms3D();
  }

  // Actualizar uniformes de la cámara
  if (volumeMesh && volumeMesh.material.uniforms.cameraPos) {
    volumeMesh.material.uniforms.cameraPos.value.copy(camera.position);
  }

  // Renderizar solo si hay cambios
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }

  lastFrameTime = currentTime;
}

/**
 * Ajusta automáticamente el LOD basado en rendimiento
 */
function adjustAdaptiveLOD() {
  const currentFPS = performanceInfo3D.value.fps;
  const currentSteps = adaptiveSteps.value;

  // En lugar de intentar escribir en adaptiveSteps (computed readonly),
  // ajustamos currentSmoothedSteps.value para influir en adaptiveSteps cuando zoomStepsEnabled está activo.
  if (currentFPS < 30 && currentSteps > minSteps.value) {
    // Reducir calidad si FPS es bajo
    currentSmoothedSteps.value = Math.max(minSteps.value, currentSteps - 8);
  } else if (currentFPS > 50 && currentSteps < maxSteps.value) {
    // Aumentar calidad si FPS es alto
    currentSmoothedSteps.value = Math.min(maxSteps.value, currentSteps + 4);
  }
}

/**
 * Crea una textura 3D y mesh volumétrico a partir de los datos existentes
 */
function create3DVolumeFromExistingData() {
  if (!volumeData || !width || !height || !depth) {
    console.warn('No hay datos volumétricos disponibles para renderizado 3D');
    return;
  }

  console.log('🎯 Creando volumen 3D a partir de datos existentes...');
  console.log('Dimensiones:', { width, height, depth });

  try {
    // Limpieza completa de recursos anteriores antes de crear nuevos
    console.log('🧹 Limpiando recursos anteriores...');

    // Limpiar solo el mesh y textura, manteniendo renderer/scene/camera
    if (volumeTexture) {
      volumeTexture.dispose();
      volumeTexture = null;
    }

    if (volumeMesh) {
      if (scene) {
        scene.remove(volumeMesh);
      }

      if (volumeMesh.geometry) {
        volumeMesh.geometry.dispose();
      }

      if (volumeMesh.material) {
        // Liberar uniformes del material
        if (volumeMesh.material.uniforms) {
          Object.values(volumeMesh.material.uniforms).forEach(uniform => {
            if (uniform.value && uniform.value.dispose) {
              uniform.value.dispose();
            }
          });
        }
        volumeMesh.material.dispose();
      }

      volumeMesh = null;
    }

    // Forzar liberación de memoria WebGL
    if (renderer && renderer.info) {
      console.log('📊 Memoria WebGL antes:', renderer.info.memory);
    }

    // Crear nueva textura 3D con configuración optimizada
    console.log('🎨 Creando nueva textura 3D...');

    // Detectar soporte de WebGL2 para decidir el tipo de textura (float vs 8-bit)
    let chosenType = THREE.UnsignedByteType;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl2 = probeCanvas.getContext('webgl2');

      if (gl2) {
        // Si hay WebGL2, preferimos FloatType para mayor precisión.
        // Evitamos HalfFloat porque en algunos entornos texSubImage3D falla al subir arrays.
        if (typeof THREE.FloatType !== 'undefined') {
          chosenType = THREE.FloatType;
        }
        console.log('🔎 WebGL2 detectado: usando textura 3D de mayor precisión:', chosenType === THREE.FloatType ? 'Float' : 'UnsignedByte');
      } else {
        console.log('🔎 WebGL2 no disponible: usando textura 8-bit UnsignedByte (fallback)');
      }
    } catch (err) {
      console.warn('⚠️ Error detectando soporte WebGL para texturas float, usando UnsignedByte como fallback', err);
      chosenType = THREE.UnsignedByteType;
    }

    // Preparar los datos con el tipo correcto (si usamos float, convertir/normalizar a Float32Array)
    const originalVolumeData = volumeData;
    let dataForTexture = volumeData;
    try {
      if (chosenType === THREE.FloatType || chosenType === THREE.HalfFloatType) {
        if (!(volumeData instanceof Float32Array)) {
          console.log('🔧 Convirtiendo volumen a Float32Array normalizado para textura float...');
          const src = volumeData;
          const n = src.length;
          const floatArr = new Float32Array(n);

          if (src instanceof Uint8Array) {
            for (let i = 0; i < n; i++) floatArr[i] = src[i] / 255.0;
          } else if (src instanceof Uint16Array) {
            for (let i = 0; i < n; i++) floatArr[i] = src[i] / 65535.0;
          } else {
            // Fallback: normalizar por valor máximo detectado
            let maxv = 0;
            for (let i = 0; i < n; i++) if (src[i] > maxv) maxv = src[i];
            if (maxv === 0) maxv = 1;
            for (let i = 0; i < n; i++) floatArr[i] = src[i] / maxv;
          }

          dataForTexture = floatArr;
        }
      }
    } catch (err) {
      console.warn('⚠️ Error convirtiendo datos a Float32Array, usando dato original como fallback', err);
      dataForTexture = volumeData;
      chosenType = THREE.UnsignedByteType;
    }

    // Verificar que el contexto soporte filtrado lineal en texturas float/half-float.
    // Si no, hacer fallback a UnsignedByteType y convertir los datos de vuelta a Uint8Array
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if ((chosenType === THREE.FloatType || chosenType === THREE.HalfFloatType) && gl) {
        // Comprobar extensiones necesarias para filtrado lineal en floats/half-floats
        const floatLinearExt = gl.getExtension && (gl.getExtension('OES_texture_float_linear') || gl.getExtension('OES_texture_half_float_linear'));
        const colorBufferExt = gl.getExtension && (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

        if (!floatLinearExt && !colorBufferExt) {
          console.warn('⚠️ El dispositivo no soporta filtrado lineal para texturas float/half-float. Haciendo fallback a 8-bit para evitar sampling inválido.');
          // Convertir dataForTexture (Float32Array) a Uint8Array si fue convertido
          if (dataForTexture instanceof Float32Array) {
            const n = dataForTexture.length;
            const backToUint8 = new Uint8Array(n);
            for (let i = 0; i < n; i++) backToUint8[i] = Math.round(Math.max(0, Math.min(1, dataForTexture[i])) * 255);
            dataForTexture = backToUint8;
          } else if (!(dataForTexture instanceof Uint8Array)) {
            // Fallback genérico: try to create a Uint8Array view
            try {
              dataForTexture = new Uint8Array(originalVolumeData);
            } catch (e) {
              console.warn('⚠️ No se pudo convertir los datos originales a Uint8Array, conservando los datos originales', e);
            }
          }

          chosenType = THREE.UnsignedByteType;
        } else {
          console.log('✅ Soporte de filtrado lineal para texturas float detectado');
        }
      }
    } catch (err) {
      console.warn('⚠️ Error verificando extensiones GL para texturas float, se utilizará fallback si es necesario', err);
    }

    // Crear la textura con el array correctamente tipado
    // Asegurar que el array coincida con el tipo elegido
    try {
      console.log('🔧 Preparando tipo para Data3DTexture:', { chosenType, dataCtor: dataForTexture && dataForTexture.constructor && dataForTexture.constructor.name });

      // Helper: convertir Float32Array a Uint16Array con float16 bits
      function float32ToFloat16Uint16Array(float32) {
        const n = float32.length;
        const out = new Uint16Array(n);
        const view = new DataView(new ArrayBuffer(4));
        for (let i = 0; i < n; ++i) {
          view.setFloat32(0, float32[i], false);
          const f = view.getUint32(0, false);
          const sign = (f >> 31) & 0x1;
          const exp = (f >> 23) & 0xff;
          const mant = f & 0x7fffff;
          let h;
          if (exp === 0) {
            h = sign << 15;
          } else if (exp === 0xff) {
            h = (sign << 15) | 0x7c00; // Inf/NaN
          } else {
            let newexp = exp - 127 + 15;
            if (newexp >= 0x1f) {
              h = (sign << 15) | 0x7c00; // overflow -> inf
            } else if (newexp <= 0) {
              // Underflow -> convert to subnormal
              const shift = 14 - newexp;
              let mant16 = (mant | 0x800000) >> (shift + 13);
              h = (sign << 15) | mant16;
            } else {
              const mant16 = mant >> 13;
              h = (sign << 15) | (newexp << 10) | mant16;
            }
          }
          out[i] = h;
        }
        return out;
      }

      if (chosenType === THREE.FloatType) {
        if (!(dataForTexture instanceof Float32Array)) {
          // Convertir a Float32Array si es necesario
          dataForTexture = new Float32Array(dataForTexture.buffer || dataForTexture);
        }
      } else if (typeof THREE.HalfFloatType !== 'undefined' && chosenType === THREE.HalfFloatType) {
        // Convertir Float32Array a Uint16Array con representación float16
        if (dataForTexture instanceof Float32Array) {
          dataForTexture = float32ToFloat16Uint16Array(dataForTexture);
        } else {
          // intentar convertir a Float32Array primero
          const tmp = new Float32Array(dataForTexture.length);
          for (let i = 0; i < dataForTexture.length; i++) tmp[i] = dataForTexture[i];
          dataForTexture = float32ToFloat16Uint16Array(tmp);
        }
      } else {
        // UnsignedByteType
        if (!(dataForTexture instanceof Uint8Array)) {
          try {
            dataForTexture = new Uint8Array(dataForTexture.buffer || dataForTexture);
          } catch (e) {
            console.warn('⚠️ Fallback conversion a Uint8Array falló, usando constructor manual', e);
            // fallback: create new Uint8Array from values
            const n = dataForTexture.length;
            const out = new Uint8Array(n);
            for (let i = 0; i < n; i++) out[i] = Math.round(Math.max(0, Math.min(255, dataForTexture[i] || 0)));
            dataForTexture = out;
          }
        }
      }

      console.log('🔧 Data array prepared for texture:', { chosenType, dataCtor: dataForTexture.constructor.name });

    } catch (err) {
      console.warn('⚠️ Error preparando array para Data3DTexture, procediendo con dato original', err);
    }

    volumeTexture = new THREE.Data3DTexture(dataForTexture, width, height, depth);
    volumeTexture.format = THREE.RedFormat;
    volumeTexture.type = chosenType;
    volumeTexture.minFilter = THREE.LinearFilter;
    volumeTexture.magFilter = THREE.LinearFilter;
    volumeTexture.unpackAlignment = 1;
    volumeTexture.generateMipmaps = false; // Deshabilitar mipmaps para ahorrar memoria
    volumeTexture.needsUpdate = true;

    // Estimar uso de memoria y avisar si es grande
    try {
      const bytesPerVoxel = (chosenType === THREE.FloatType) ? 4 : (chosenType === THREE.HalfFloatType ? 2 : 1);
      const estimatedBytes = width * height * depth * bytesPerVoxel;
      const estimatedMB = (estimatedBytes / (1024 * 1024)).toFixed(1);
      if (estimatedMB > 200) {
        console.warn(`⚠️ Textura 3D estimada en ${estimatedMB} MB — puede requerir mucha memoria GPU. Considera usar resolución menor o HalfFloat.`);
      } else {
        console.log(`ℹ️ Textura 3D estimada: ${estimatedMB} MB`);
      }
    } catch (err) {
      console.warn('⚠️ Error estimando memoria de textura 3D', err);
    }

    createVolumeMesh3D();

    // Verificar memoria después
    if (renderer && renderer.info) {
      console.log('📊 Memoria WebGL después:', renderer.info.memory);
    }

    console.log('✅ Volumen 3D creado exitosamente');

    // Inicializar renderizador 3D automáticamente para futuras cuatro vistas
    setTimeout(async () => {
      console.log('🎯 Inicializando renderizador 3D automáticamente en segundo plano...');
      try {
        const success = await ensureThreeRenderer();
        if (success) {
          console.log('✅ Renderizador 3D listo para cuatro vistas');

          // Si las vistas cuádruples están activas, actualizar el cuadrante
          if (quadViewActive.value && canvas3DRef.value && !volumeMeshQuad) {
            console.log('🔄 Actualizando vista 3D del cuadrante con el nuevo volumen...');
            initQuadView3D();
          }
        } else {
          console.log('⚠️ Renderizador 3D no se pudo inicializar automáticamente');
        }
      } catch (error) {
        console.warn('⚠️ Error en inicialización automática de renderizador 3D:', error);
      }
    }, 1000); // Delay para que se complete la creación del volumen

  } catch (error) {
    console.error('❌ Error creando volumen 3D:', error);
    // En caso de error, limpiar recursos parcialmente creados
    cleanup3DResources();
  }
}

/**
 * Crea el mesh volumétrico con shaders
 */
function createVolumeMesh3D() {
  if (!volumeTexture) {
    console.log('⚠️ volumeTexture no disponible para crear mesh')
    return;
  }

  console.log('🔧 Creando mesh volumétrico...')
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      volume: { value: volumeTexture },
      steps: { value: Number(adaptiveSteps.value) },
      opacity: { value: Number(opacity3D.value) },
      threshold: { value: Number(threshold3D.value) },
      brightness: { value: Number(brightness3D.value) },
      contrast: { value: Number(contrast3D.value) },
      cameraPos: { value: camera ? camera.position.clone() : new THREE.Vector3(2, 2, 2) },
      lowColor: { value: lowColor.value.clone() },
      midColor: { value: midColor.value.clone() },
      highColor: { value: highColor.value.clone() },
      clippingPlane: { value: new THREE.Vector3(clippingX.value, clippingY.value, clippingZ.value) },
      useTransferFunction: { value: useTransferFunction.value },

      // ========================================
      // UNIFORMS PARA IA Y SEGMENTACIÓN
      // ========================================
      segVolume: { value: segmentationTexture || volumeTexture }, // Fallback a volumen principal
      enhancedVolume: { value: enhancedVolumeTexture || volumeTexture }, // Fallback a volumen principal
      showSegmentation: { value: showIASegmentation3D.value },
      useEnhanced: { value: useEnhancedVolume.value },
      segOpacity: { value: aiSegmentationOpacity.value },
      mixRatio: { value: aiVolumeMixRatio.value },
      tumorColor: { value: aiSegmentationColors.value.tumor.clone() },
      edemaColor: { value: aiSegmentationColors.value.edema.clone() },
      necrosisColor: { value: aiSegmentationColors.value.necrosis.clone() }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  });

  volumeMesh = new THREE.Mesh(geometry, material);

  // Centrar el mesh en el origen
  volumeMesh.position.set(0, 0, 0);

  // Calcular el centro de la geometría y ajustar
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  volumeMesh.position.sub(center); // Centra el mesh

  // Solo agregar a la escena principal si existe
  if (scene) {
    scene.add(volumeMesh);
    console.log('✅ Mesh volumétrico agregado a escena principal');
  } else {
    console.log('✅ Mesh volumétrico creado (sin escena principal)');
  }

  console.log('✅ Mesh volumétrico creado');
}

/**
 * Actualiza los uniformes del shader con optimizaciones de rendimiento
 */
function updateUniforms3D() {
  if (!volumeMesh || !volumeMesh.material || !volumeMesh.material.uniforms) {
    console.log('⚠️ updateUniforms3D: No hay volumeMesh o material disponible');
    return;
  }

  try {
    const uniforms = volumeMesh.material.uniforms;
    console.log('🔍 Uniformes disponibles:', Object.keys(uniforms));

    // Actualizar solo si hay cambios significativos
    if (uniforms.opacity && uniforms.opacity.value !== Number(opacity3D.value)) {
      uniforms.opacity.value = Number(opacity3D.value);
    }

    if (uniforms.steps && uniforms.steps.value !== Number(adaptiveSteps.value)) {
      uniforms.steps.value = Number(adaptiveSteps.value);
    }

    if (uniforms.threshold && uniforms.threshold.value !== Number(threshold3D.value)) {
      uniforms.threshold.value = Number(threshold3D.value);
    }

    if (uniforms.brightness && uniforms.brightness.value !== Number(brightness3D.value)) {
      uniforms.brightness.value = Number(brightness3D.value);
    }

    if (uniforms.contrast && uniforms.contrast.value !== Number(contrast3D.value)) {
      uniforms.contrast.value = Number(contrast3D.value);
    }

    // Actualizar clipping plane
    if (uniforms.clippingPlane) {
      uniforms.clippingPlane.value.set(clippingX.value, clippingY.value, clippingZ.value);
    }

    if (uniforms.useTransferFunction) {
      uniforms.useTransferFunction.value = useTransferFunction.value;
    }

    // *** ACTUALIZAR COLORES - ESTO ES LO QUE FALTABA ***
    if (uniforms.lowColor) {
      uniforms.lowColor.value.copy(lowColor.value);
      console.log('✅ lowColor actualizado a:', lowColor.value);
    } else {
      console.warn('⚠️ Uniform lowColor no encontrado');
    }

    if (uniforms.midColor) {
      uniforms.midColor.value.copy(midColor.value);
      console.log('✅ midColor actualizado a:', midColor.value);
    } else {
      console.warn('⚠️ Uniform midColor no encontrado');
    }

    if (uniforms.highColor) {
      uniforms.highColor.value.copy(highColor.value);
      console.log('✅ highColor actualizado a:', highColor.value);
    } else {
      console.warn('⚠️ Uniform highColor no encontrado');
    }

    console.log('🎨 Uniformes de color actualizados:', {
      lowColor: lowColor.value,
      midColor: midColor.value,
      highColor: highColor.value
    });

    // ========================================
    // ACTUALIZAR UNIFORMS DE IA
    // ========================================

    // Uniforms de segmentación IA
    if (uniforms.showSegmentation) {
      uniforms.showSegmentation.value = showIASegmentation3D.value;
    }

    if (uniforms.segOpacity) {
      uniforms.segOpacity.value = aiSegmentationOpacity.value;
    }

    if (uniforms.tumorColor) {
      uniforms.tumorColor.value.copy(aiSegmentationColors.value.tumor);
    }

    if (uniforms.edemaColor) {
      uniforms.edemaColor.value.copy(aiSegmentationColors.value.edema);
    }

    if (uniforms.necrosisColor) {
      uniforms.necrosisColor.value.copy(aiSegmentationColors.value.necrosis);
    }

    // Uniforms de volumen mejorado IA
    if (uniforms.useEnhanced) {
      uniforms.useEnhanced.value = useEnhancedVolume.value;
    }

    if (uniforms.mixRatio) {
      uniforms.mixRatio.value = aiVolumeMixRatio.value;
    }

    // Marcar material para actualización
    volumeMesh.material.needsUpdate = true;

    // 🔄 ACTUALIZAR TAMBIÉN volumeMeshQuad SI EXISTE (para modo 4 vistas)
    if (volumeMeshQuad && volumeMeshQuad.material && volumeMeshQuad.material.uniforms) {
      console.log('🔄 Sincronizando uniformes con volumeMeshQuad (vista cuadrante 3D)...');
      const uniformsQuad = volumeMeshQuad.material.uniforms;

      // Copiar todos los uniformes al material del cuadrante
      if (uniformsQuad.opacity) uniformsQuad.opacity.value = Number(opacity3D.value);
      if (uniformsQuad.steps) uniformsQuad.steps.value = Number(adaptiveSteps.value);
      if (uniformsQuad.threshold) uniformsQuad.threshold.value = Number(threshold3D.value);
      if (uniformsQuad.brightness) uniformsQuad.brightness.value = Number(brightness3D.value);
      if (uniformsQuad.contrast) uniformsQuad.contrast.value = Number(contrast3D.value);

      if (uniformsQuad.clippingPlane) {
        uniformsQuad.clippingPlane.value.set(clippingX.value, clippingY.value, clippingZ.value);
      }

      if (uniformsQuad.useTransferFunction) {
        uniformsQuad.useTransferFunction.value = useTransferFunction.value;
      }

      // 🎨 SINCRONIZAR COLORES
      if (uniformsQuad.lowColor) {
        uniformsQuad.lowColor.value.copy(lowColor.value);
        console.log('  ✅ lowColor quad sincronizado');
      }
      if (uniformsQuad.midColor) {
        uniformsQuad.midColor.value.copy(midColor.value);
        console.log('  ✅ midColor quad sincronizado');
      }
      if (uniformsQuad.highColor) {
        uniformsQuad.highColor.value.copy(highColor.value);
        console.log('  ✅ highColor quad sincronizado');
      }

      // Sincronizar uniformes de IA
      if (uniformsQuad.showSegmentation) uniformsQuad.showSegmentation.value = showIASegmentation3D.value;
      if (uniformsQuad.segOpacity) uniformsQuad.segOpacity.value = aiSegmentationOpacity.value;
      if (uniformsQuad.tumorColor) uniformsQuad.tumorColor.value.copy(aiSegmentationColors.value.tumor);
      if (uniformsQuad.edemaColor) uniformsQuad.edemaColor.value.copy(aiSegmentationColors.value.edema);
      if (uniformsQuad.necrosisColor) uniformsQuad.necrosisColor.value.copy(aiSegmentationColors.value.necrosis);

      // 🚫 IMPORTANTE: El cuadrante 3D SIEMPRE usa volumen original (sin mejoras IA)
      if (uniformsQuad.useEnhanced) {
        uniformsQuad.useEnhanced.value = false; // Siempre false para cuadrante
        console.log('  🚫 useEnhanced forzado a false para cuadrante (volumen original)');
      }

      if (uniformsQuad.mixRatio) uniformsQuad.mixRatio.value = aiVolumeMixRatio.value;

      volumeMeshQuad.material.needsUpdate = true;
      console.log('✅ Uniformes del cuadrante 3D sincronizados correctamente');
    }

    console.log('✅ Uniformes 3D (incluyendo IA) actualizados correctamente');
  } catch (error) {
    console.warn('Error actualizando uniformes 3D:', error);
  }
}

/**
 * Actualización de uniformes con debounce para optimizar rendimiento
 */
function debouncedUpdateUniforms3D() {
  if (shaderUpdateTimeout) {
    clearTimeout(shaderUpdateTimeout);
  }

  shaderUpdateTimeout = setTimeout(() => {
    updateUniforms3D();
  }, shaderUpdateDelay);
}

// ========================================
// FUNCIONES DE CANVAS RESPONSIVO
// ========================================

/**
 * Convierte coordenadas relativas (0-1) a píxeles usando el tamaño ACTUAL del canvas
 * @param {Object} relPoint - Punto relativo {x, y}
 * @param {HTMLCanvasElement} canvas - Canvas de referencia
 * @returns {Object} Punto en píxeles {x, y}
 */
function relativeToPixels(relPoint, canvas) {
  if (!canvas || !relPoint) return { x: 0, y: 0 };

  return {
    x: relPoint.x * canvas.width,
    y: relPoint.y * canvas.height
  };
}

/**
 * Sincroniza el tamaño de atributos del canvas con su tamaño visual CSS
 * CRÍTICO: Los atributos width/height deben coincidir con el tamaño visible
 * @param {HTMLCanvasElement} canvas - Canvas a sincronizar
 */
function syncCanvasSize(canvas) {
  if (!canvas) return;

  try {
    const rect = canvas.getBoundingClientRect();
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;
    const newWidth = Math.round(rect.width);
    const newHeight = Math.round(rect.height);

    // 🛡️ VALIDACIÓN CRÍTICA: No permitir dimensiones 0 o negativas
    if (newWidth <= 0 || newHeight <= 0) {
      console.error(`❌ syncCanvasSize: getBoundingClientRect() devolvió dimensiones inválidas: ${newWidth}x${newHeight}.
                     Rect completo:`, rect);

      // Si el rect es inválido, mantener las dimensiones actuales (si son válidas)
      if (currentWidth > 0 && currentHeight > 0) {
        console.warn(`⚠️ Manteniendo dimensiones actuales: ${currentWidth}x${currentHeight}`);
        return false;
      } else {
        // Si tanto las nuevas como las actuales son inválidas, usar dimensiones por defecto
        console.warn(`⚠️ Usando dimensiones por defecto: 512x512`);
        canvas.width = 512;
        canvas.height = 512;
        return true;
      }
    }

    // Solo actualizar si hay cambio significativo (evitar redibujado innecesario)
    if (Math.abs(currentWidth - newWidth) > 2 || Math.abs(currentHeight - newHeight) > 2) {
      console.log(`🔄 Sincronizando canvas: ${currentWidth}x${currentHeight} → ${newWidth}x${newHeight}`);

      canvas.width = newWidth;
      canvas.height = newHeight;

      return true; // Indica que hubo cambio
    }

    return false; // No hubo cambio
  } catch (error) {
    console.warn('⚠️ Error sincronizando tamaño de canvas:', error);
    return false;
  }
}

/**
 * Calcula la distancia entre dos puntos relativos usando el tamaño ACTUAL del canvas
 * @param {Object} relPoint1 - Primer punto relativo {x, y}
 * @param {Object} relPoint2 - Segundo punto relativo {x, y}
 * @param {HTMLCanvasElement} canvas - Canvas de referencia para la conversión
 * @param {string} viewType - Tipo de vista para obtener el spacing físico
 * @returns {Object} {pixels: distancia_en_pixels, mm: distancia_en_mm}
 */
function calculateDistanceBetweenRelativePoints(relPoint1, relPoint2, canvas, viewType) {
  if (!canvas || !relPoint1 || !relPoint2) {
    return { pixels: 0, mm: 0 };
  }

  // Convertir puntos relativos a píxeles usando el tamaño ACTUAL del canvas
  const p1 = relativeToPixels(relPoint1, canvas);
  const p2 = relativeToPixels(relPoint2, canvas);

  // Calcular distancia en píxeles
  const distPixels = Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
  );

  // Calcular distancia en milímetros usando el spacing físico
  let distMm = 0;
  try {
    const spacing = getPixelSpacingForView(viewType);
    if (spacing && spacing.dx && spacing.dy) {
      distMm = Math.sqrt(
        Math.pow((p2.x - p1.x) * spacing.dx, 2) +
        Math.pow((p2.y - p1.y) * spacing.dy, 2)
      );
    } else {
      // Fallback: usar spacing estimado basado en el tamaño del canvas
      const estimatedSpacing = estimatePixelSpacing(canvas, viewType);
      distMm = distPixels * estimatedSpacing;
    }
  } catch (error) {
    console.warn('⚠️ Error calculando distancia física:', error);
    // Fallback: usar estimación básica
    const estimatedSpacing = estimatePixelSpacing(canvas, viewType);
    distMm = distPixels * estimatedSpacing;
  }

  return {
    pixels: Math.round(distPixels * 100) / 100, // 2 decimales
    mm: Math.round(distMm * 100) / 100 // 2 decimales
  };
}

/**
 * Sincroniza el tamaño de todos los canvas del quad view
 */
function syncAllQuadCanvases() {
  const canvases = [
    { ref: canvasAxial.value, name: 'Axial' },
    { ref: canvasCoronal.value, name: 'Coronal' },
    { ref: canvasSagittal.value, name: 'Sagittal' },
    { ref: canvas3DRef.value, name: '3D View' }  // ✅ Corregido: usar canvas3DRef
  ];

  let totalChanged = false;

  canvases.forEach(({ ref, name }) => {
    if (ref) {
      const changed = syncCanvasSize(ref);
      if (changed) {
        console.log(`🔄 Canvas ${name} sincronizado`);
        totalChanged = true;
      }
    }
  });

  if (totalChanged) {
    // Recalcular mediciones después de sincronizar todos los canvas
    recalculateAllMeasurementDistances();
  }

  return totalChanged;
}

/**
 * Recalcula las distancias de todas las mediciones existentes
 * cuando el tamaño del canvas cambia
 */
function recalculateAllMeasurementDistances() {
  if (!measurements.value || measurements.value.length === 0) return;

  let recalculatedCount = 0;

  measurements.value.forEach((measurement, index) => {
    if (measurement.points && measurement.points.length === 2) {
      try {
        // Obtener canvas apropiado para la vista de la medición
        const canvas = getCurrentCanvas(measurement.view === mainView.value ? null : measurement.view);
        if (!canvas) return;

        // Sincronizar tamaño del canvas
        syncCanvasSize(canvas);

        // Recalcular distancia con el tamaño actual
        const result = calculateDistanceBetweenRelativePoints(
          measurement.points[0],
          measurement.points[1],
          canvas,
          measurement.view
        );

        // Actualizar solo si hay cambio significativo
        const oldPixels = parseFloat(measurement.distance) || 0;
        const newPixels = result.pixels;

        if (Math.abs(oldPixels - newPixels) > 1) { // Solo si cambia más de 1 pixel
          measurement.distance = newPixels.toFixed(1);
          measurement.distanceMm = result.mm > 0 ? result.mm.toFixed(2) : null;
          recalculatedCount++;

          console.log(`📏 Medición ${index + 1} recalculada: ${oldPixels}px → ${newPixels}px`);
        }
      } catch (error) {
        console.warn(`⚠️ Error recalculando medición ${index + 1}:`, error);
      }
    }
  });

  if (recalculatedCount > 0) {
    console.log(`✅ ${recalculatedCount} mediciones recalculadas por cambio de tamaño`);
  }
}

/**
 * Obtiene el canvas actual basado en el contexto (quad view vs single view)
 * @param {string} viewType - Tipo de vista específica (para quad view)
 * @returns {HTMLCanvasElement|null} Canvas actual
 */
function getCurrentCanvas(viewType) {
  if (viewType) {
    // Modo quad view - obtener canvas específico
    switch (viewType) {
      case 'axial':
        return canvasAxial.value;
      case 'coronal':
        return canvasCoronal.value;
      case 'sagittal':
        return canvasSagittal.value;
      case 'main':
        return canvas3DRef.value;  // ✅ Corregido: usar canvas3DRef
      default:
        return canvasMain.value;
    }
  } else {
    // Modo single view - usar canvas principal o 3D
    if (mainView.value === '3d') {
      return threeCanvas.value;
    } else {
      return canvasMain.value;
    }
  }
}

/**
 * Estima el spacing de píxeles cuando no hay datos DICOM disponibles
 * @param {HTMLCanvasElement} canvas - Canvas de referencia
 * @param {string} viewType - Tipo de vista
 * @returns {number} Spacing estimado en mm/pixel
 */
function estimatePixelSpacing(canvas, viewType) {
  if (!canvas) return 1.0;

  // Estimaciones basadas en tamaños típicos de imágenes médicas
  const baseSpacing = viewType === 'sagittal' ? 0.8 : 0.7; // mm/pixel
  const scaleFactor = Math.min(canvas.width, canvas.height) / 512; // Normalizar a 512px base

  return baseSpacing / scaleFactor;
}

/**
 * Ajusta el tamaño del canvas principal para que coincida con su contenedor
 * Hace el canvas completamente responsivo
 */
function resizeMainCanvasToContainer() {
  nextTick(() => {
    try {
      const canvas = canvasMain.value;
      if (!canvas) return;

      // Obtener el contenedor padre (.single-view-mode)
      const container = canvas.closest('.single-view-mode');
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Calcular tamaño disponible con un margen pequeño para evitar overflow
      const availableWidth = Math.max(300, Math.floor(rect.width * 0.95));
      const availableHeight = Math.max(200, Math.floor(rect.height * 0.95));

      // Determinar el tamaño óptimo manteniendo una proporción razonable
      let newWidth, newHeight;

      if (allCollapsed.value && !quadViewActive.value) {
        // En modo maximizado, usar más espacio disponible
        const aspectRatio = 16 / 9;

        if (availableWidth / availableHeight > aspectRatio) {
          newHeight = availableHeight;
          newWidth = Math.floor(newHeight * aspectRatio);
        } else {
          newWidth = availableWidth;
          newHeight = Math.floor(newWidth / aspectRatio);
        }
      } else {
        // En modo normal, usar tamaños más conservadores
        newWidth = Math.min(1000, availableWidth);
        newHeight = Math.min(700, availableHeight);
      }

      // Asegurar tamaños mínimos
      newWidth = Math.max(400, newWidth);
      newHeight = Math.max(300, newHeight);

      // Actualizar las variables reactivas que controlan el tamaño CSS
      const widthChange = Math.abs(canvasDisplayWidth.value - newWidth);
      const heightChange = Math.abs(canvasDisplayHeight.value - newHeight);

      if (widthChange > 10 || heightChange > 10) {
        console.log(`📐 Redimensionando canvas principal: ${canvasDisplayWidth.value}x${canvasDisplayHeight.value} → ${newWidth}x${newHeight}`);

        canvasDisplayWidth.value = newWidth;
        canvasDisplayHeight.value = newHeight;

        // CRÍTICO: Sincronizar atributos del canvas con su tamaño visual después del cambio
        setTimeout(() => {
          const changed = syncCanvasSize(canvas);

          // También sincronizar canvas 3D si existe
          if (threeCanvas.value) {
            const threeDChanged = syncCanvasSize(threeCanvas.value);

            // Si el canvas 3D cambió de tamaño y el renderer existe, actualizarlo
            if (threeDChanged && renderer && mainView.value === '3d') {
              console.log(`🎮 Canvas 3D redimensionado, forzando actualización...`);
              forceUpdate3DRenderer();
            }
          }

          // Forzar redibujado si hubo cambio de tamaño y hay datos cargados
          if (changed && volumeData) {
            console.log('🔄 Canvas redimensionado, actualizando display...');

            // Recalcular mediciones existentes con el nuevo tamaño
            recalculateAllMeasurementDistances();

            // Solo actualizar display si no estamos en vista 3D
            if (mainView.value !== '3d') {
              updateDisplay();
            }
          }
        }, 100);
      }
    } catch (error) {
      console.warn('⚠️ Error al redimensionar canvas:', error);
    }
  });
}

/**
 * Maneja el evento de resize de la ventana
 */
function handleWindowResize() {
  // Usar debounce para evitar llamadas excesivas
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    resizeMainCanvasToContainer();

    // Si estamos en modo 4 vistas, redimensionar también esos canvas
    if (quadViewActive.value) {
      console.log('🔄 Redimensionando canvas de 4 vistas tras resize de ventana...')
      initializeQuadrantCanvasSizes()

      // Re-renderizar las vistas después del redimensionamiento
      setTimeout(() => {
        redrawQuadViews()
      }, 100)
    }
  }, 150); // 150ms de debounce
}

// Variable para debounce del resize
let resizeTimeout = null;

/**
 * Fuerza la re-renderización completa según el tipo de vista actual
 * Útil después de cambios de maximización/redimensionamiento
 */
function forceCompleteRerender() {
  console.log('🔄 Forzando re-renderización completa...');

  nextTick(() => {
    if (mainView.value === '3d') {
      // Para vista 3D
      if (renderer && threeCanvas.value) {
        console.log('🎮 Re-renderizando vista 3D...');
        syncCanvasSize(threeCanvas.value);
        forceUpdate3DRenderer();
      }
    } else {
      // Para vistas 2D - MEJORADO: forzar limpieza y regeneración completa
      if (canvasMain.value && volumeData) {
        console.log('🖼️ Re-renderizando vista 2D: ' + mainView.value);

        // 🆘 SOLUCIÓN: Forzar limpieza del contexto 2D y regeneración
        const ctx = canvasMain.value.getContext('2d');
        if (ctx) {
          // Limpiar completamente el canvas
          ctx.clearRect(0, 0, canvasMain.value.width, canvasMain.value.height);

          // Resetear transformaciones y estado del contexto
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          ctx.restore();
        }

        // Sincronizar tamaño del canvas
        syncCanvasSize(canvasMain.value);

        // Forzar actualización inmediata
        updateDisplay();

        // 🆘 BACKUP: Si el canvas sigue vacío después de 200ms, reintentar
        setTimeout(() => {
          if (ctx && canvasMain.value.width > 0 && canvasMain.value.height > 0) {
            const imageData = ctx.getImageData(0, 0, canvasMain.value.width, canvasMain.value.height);
            const hasContent = Array.from(imageData.data).some(pixel => pixel > 0);

            if (!hasContent) {
              console.warn('⚠️ Canvas principal vacío después de renderizado, reintentando...');
              updateDisplay();
            } else {
              console.log('✅ Vista 2D renderizada correctamente');
            }
          } else if (ctx) {
            console.warn(`⚠️ Canvas con tamaño inválido en backup check: ${canvasMain.value.width}x${canvasMain.value.height}`);
            syncCanvasSize(canvasMain.value);
            setTimeout(() => updateDisplay(), 100);
          }
        }, 200);
      }
    }

    // También actualizar quad view si está activo
    if (quadViewActive.value) {
      setTimeout(() => {
        forceRedrawQuadViews();
      }, 100);
    }
  });
}

/**
 * Fuerza la actualización del renderer 3D después de un redimensionamiento
 * Previene que el canvas se quede en negro
 */
function forceUpdate3DRenderer() {
  if (!renderer || !threeCanvas.value || mainView.value !== '3d') {
    return;
  }

  try {
    const canvas = threeCanvas.value;
    console.log(`🎮 Forzando actualización del renderer 3D: ${canvas.width}x${canvas.height}`);

    // Asegurar que el canvas tenga el tamaño correcto
    renderer.setSize(canvas.width, canvas.height, false);

    // Actualizar cámara
    if (camera) {
      camera.aspect = canvas.width / canvas.height;
      camera.updateProjectionMatrix();
    }

    // Forzar renderizado inmediato múltiples veces para evitar pantalla negra
    if (scene) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          renderer.render(scene, camera);
        }, i * 50);
      }
    }

    // Verificar estado del contexto WebGL
    const gl = renderer.getContext();
    if (gl.isContextLost()) {
      console.warn('⚠️ Contexto WebGL perdido, intentando recuperar...');
      return;
    }

    console.log('✅ Renderer 3D actualizado exitosamente');
  } catch (error) {
    console.error('❌ Error actualizando renderer 3D:', error);
  }
}

/**
 * Inicializa el sistema de canvas responsivo
 */
function initResponsiveCanvas() {
  // Configurar tamaño inicial
  resizeMainCanvasToContainer();

  // Configurar observer para detectar cambios en el contenedor
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      handleWindowResize();
    });

    // Observar el contenedor principal cuando esté disponible
    nextTick(() => {
      const container = document.querySelector('.single-view-mode');
      if (container) {
        resizeObserver.observe(container);
      }
    });

    // Limpiar observer al desmontar
    onUnmounted(() => {
      resizeObserver.disconnect();
    });
  }

  // Fallback: listener de resize de ventana
  window.addEventListener('resize', handleWindowResize);

  // Limpiar listeners al desmontar
  onUnmounted(() => {
    window.removeEventListener('resize', handleWindowResize);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
  });
}

/**
 * Genera volumen mejorado por IA usando Web Worker
 * Migrado del hilo principal al AI Worker para evitar bloqueo de UI
 */
async function generateAIEnhancement() {
  if (!volumeData) {
    console.warn('⚠️ No hay datos volumétricos para mejorar');
    return;
  }

  console.log('✨ Generando volumen mejorado por IA con Worker...');

  aiProcessingStatus.value = {
    isProcessing: true,
    progress: 0,
    currentTask: 'Iniciando mejora IA...',
    error: null
  };

  try {
    // Ejecutar enhancement en el AI Worker
    const results = await enhanceImage(volumeData, 'adaptive-contrast');

    // Procesar resultados
    aiVolumeData = results.enhancedData;

    aiProcessingStatus.value = {
      isProcessing: false,
      progress: 100,
      currentTask: 'Mejora IA completada',
      error: null
    };

    // Si está activo el volumen mejorado, actualizar la textura
    if (useEnhancedVolume.value) {
      await updateEnhancedVolumeTexture();
    }

    console.log('✅ Volumen mejorado por IA generado exitosamente con Worker');

  } catch (error) {
    console.error('❌ Error generando volumen mejorado con Worker:', error);
    aiProcessingStatus.value = {
      isProcessing: false,
      progress: 0,
      currentTask: 'Error en mejora IA',
      error: error.message
    };
  }
}


/**
 * Actualiza la textura del volumen mejorado por IA
 */
async function updateEnhancedVolumeTexture() {
  if (!aiVolumeData || !renderer || !volumeMesh) {
    console.warn('⚠️ No se puede actualizar textura mejorada - datos faltantes');
    return;
  }

  try {
    console.log('✨ Actualizando textura con volumen mejorado IA...');

    // Crear textura 3D para volumen mejorado
    if (enhancedVolumeTexture) {
      enhancedVolumeTexture.dispose();
    }

    enhancedVolumeTexture = new THREE.Data3DTexture(aiVolumeData, width, height, depth);
    enhancedVolumeTexture.format = THREE.RedFormat;
    enhancedVolumeTexture.type = THREE.FloatType;
    enhancedVolumeTexture.minFilter = THREE.LinearFilter;
    enhancedVolumeTexture.magFilter = THREE.LinearFilter;
    enhancedVolumeTexture.unpackAlignment = 1;
    enhancedVolumeTexture.generateMipmaps = false;
    enhancedVolumeTexture.needsUpdate = true;

    // Actualizar uniforms del shader
    if (volumeMesh.material && volumeMesh.material.uniforms) {
      volumeMesh.material.uniforms.enhancedVolume = { value: enhancedVolumeTexture };
      volumeMesh.material.uniforms.useEnhanced = { value: useEnhancedVolume.value };
      volumeMesh.material.uniforms.mixRatio = { value: aiVolumeMixRatio.value };
      volumeMesh.material.needsUpdate = true;
    }

    console.log('✅ Textura de volumen mejorado actualizada');

  } catch (error) {
    console.error('❌ Error actualizando textura mejorada:', error);
  }
}

/**
 * Centra automáticamente la cámara en el tumor detectado por IA
 */
function focusOnAITumor() {
  if (!aiAnalysisResults.value.tumorPosition || !controls) {
    console.warn('⚠️ No se puede centrar en tumor - datos faltantes');
    return;
  }

  const tumor = aiAnalysisResults.value.tumorPosition;
  console.log('🎯 Centrando cámara en tumor detectado:', tumor);

  // Convertir coordenadas del tumor al espacio de la cámara
  const normalizedX = (tumor.x / width) - 0.5;
  const normalizedY = (tumor.y / height) - 0.5;
  const normalizedZ = (tumor.z / depth) - 0.5;

  // Animar cámara hacia el tumor
  const targetPosition = new THREE.Vector3(
    normalizedX * 2,
    normalizedY * 2,
    normalizedZ * 2
  );

  if (controls.target) {
    // Animar target de los controles
    controls.target.copy(targetPosition);
    controls.update();
  }

  console.log('✅ Cámara centrada en tumor');
}

// Watchers para actualizar shaders cuando cambien los controles IA
// TODO: Reactivar cuando se tenga modelo de IA entrenado para segmentación
/*
watch(showIASegmentation3D, async (newValue) => {
  if (newValue && segmentationData) {
    await updateSegmentation3DShader();
  } else if (volumeMesh && volumeMesh.material && volumeMesh.material.uniforms) {
    volumeMesh.material.uniforms.showSegmentation = { value: false };
    volumeMesh.material.needsUpdate = true;
  }
});
*/

watch(useEnhancedVolume, async (newValue) => {
  if (newValue && aiVolumeData) {
    await updateEnhancedVolumeTexture();
  } else if (volumeMesh && volumeMesh.material && volumeMesh.material.uniforms) {
    volumeMesh.material.uniforms.useEnhanced = { value: false };
    volumeMesh.material.needsUpdate = true;
  }
});

watch(aiSegmentationOpacity, (newValue) => {
  if (volumeMesh && volumeMesh.material && volumeMesh.material.uniforms) {
    volumeMesh.material.uniforms.segOpacity = { value: newValue };
    volumeMesh.material.needsUpdate = true;
  }
});

watch(aiVolumeMixRatio, (newValue) => {
  if (volumeMesh && volumeMesh.material && volumeMesh.material.uniforms) {
    volumeMesh.material.uniforms.mixRatio = { value: newValue };
    volumeMesh.material.needsUpdate = true;
  }
});

watch(autoFocusOnTumor, (newValue) => {
  if (newValue && aiAnalysisResults.value.confidence > 0) {
    focusOnAITumor();
  }
});

// Watcher para redimensionar canvas 3D cuando cambien los paneles
watch(() => allCollapsed.value, () => {
  if (quadViewActive.value && canvas3DRef.value) {
    console.log('🎯 Redimensionando canvas 3D por cambio de paneles (modo maximizado)...')

    // Esperar un poco para que los paneles terminen de animarse
    setTimeout(() => {
      setupResponsive3DCanvas()

      // Forzar redimensionamiento del renderer 3D
      if (renderer3DQuad.value && camera3DQuad.value) {
        console.log('🔧 Forzando resize del renderer 3D en cuadrante...')
        resizeQuadView3D()
      }
    }, 350) // Tiempo aumentado para asegurar que la animación termine
  }
});

// ========================================
// FUNCIÓN DE DEMOSTRACIÓN AUTOMÁTICA
// ========================================

/**
 * Función de demostración que activa automáticamente las funciones de IA
 * cuando se carga un volumen médico
 */
async function demonstrateAIFeatures() {
  // Ejecutar si hay datos volumétricos y estamos en vista 3D o en cuatro vistas
  if (!volumeData || (mainView.value !== '3d' && !quadViewActive.value)) {
    return;
  }

  console.log('🎭 Iniciando demostración automática de funciones IA...');

  try {
    // Esperar un poco para que el volumen se cargue completamente
    await new Promise(resolve => setTimeout(resolve, 2000));

    // TODO: Reactivar cuando se tenga modelo de IA entrenado
    // Activar análisis de IA automáticamente
    // console.log('🤖 Ejecutando análisis de IA automático...');
    // await simulateAIAnalysis();

    // Esperar un poco después del análisis
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: Reactivar cuando se tenga modelo de IA entrenado
    // Activar segmentación IA automáticamente
    // if (segmentationData) {
    //   console.log('🎨 Activando visualización de segmentación IA...');
    //   showIASegmentation3D.value = true;
    //   aiSegmentationOpacity.value = 0.8;
    // }

    // Esperar un poco más
    await new Promise(resolve => setTimeout(resolve, 1500));

    // No generar ni activar automáticamente el volumen mejorado.
    // Dejar que el usuario lo solicite explícitamente desde la interfaz.
    console.log('ℹ️ Volumen mejorado disponible: para generarlo y activarlo, usa el botón correspondiente en el panel de IA.');

    console.log('✅ Demostración de funciones IA completada exitosamente');

  } catch (error) {
    console.error('❌ Error en demostración de IA:', error);
  }
}

// Activar demostración automáticamente cuando se cambie a vista 3D con datos
watch(mainView, async (newView) => {
  if (newView === '3d' && volumeData && !aiProcessingStatus.value.isProcessing) {
    // Pequeña demora para que se inicialice Three.js
    setTimeout(() => {
      demonstrateAIFeatures();
    }, 3000);
  }
});

// ========================================
// FIN FUNCIONES 3D
// ========================================

// ========================================
// 🔲 FUNCIONALIDAD F11 PANTALLA COMPLETA
// ========================================

</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.diagnostic-panel {
  background: #1a1a1a;
  color: #ffffff;
  min-height: 100vh;
}

/* HEADER - Mismo estilo que LoginView */
.medical-header {
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  padding: 15px 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  border-bottom: 1px solid rgba(30, 64, 175, 0.2);
}

.header-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-image {
  height: 40px;
  width: auto;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 30px;
}

.nav-menu {
  display: flex;
  gap: 25px;
}

.nav-link {
  color: #cccccc;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.nav-link:hover {
  color: #c6202a;
}

.nav-link::after {
  content: "";
  position: absolute;
  bottom: -5px;
  left: 0;
  width: 0;
  height: 2px;
  background: #c6202a;
  transition: width 0.3s ease;
}

.nav-link:hover::after {
  width: 100%;
}

.user-menu-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-icon {
  width: 40px;
  height: 40px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.user-dropdown {
  position: absolute;
  top: 50px;
  right: 0;
  background: #2b2b2b;
  border: 2px solid #404040;
  border-radius: 8px;
  width: 200px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s ease;
}

.user-dropdown.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 20px;
  color: #ffffff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid #404040;
  transition: all 0.3s ease;
  cursor: pointer;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #404040;
  color: #c6202a;
  transform: translateX(5px);
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
}

.main-container {
  flex: 1;
  display: flex;
  height: calc(100vh - 60px);
  padding: 1px;
  margin-top: 60px;
  overflow: hidden;
}

/* SECCIÓN 1: SIDEBAR IZQUIERDO */
.left-sidebar {
  width: 150px;
  background: #202020;
  display: flex;
  flex-direction: column;
  border: 1px solid #212121;
  border-radius: 8px;
  margin: 0px;
  position: relative;
  transition: width 0.3s ease;
}

.left-sidebar.collapsed {
  width: 0px;
  border: none;
  margin: 0;
  overflow: visible;
  position: relative;
}

.left-sidebar.collapsed .brain-label {
  display: none;
}

.left-sidebar.collapsed .brain-image {
  display: none;
}

.left-sidebar.collapsed .brain-view {
  display: none;
}

.left-sidebar.collapsed .sidebar-toggle-btn {
  position: fixed;
  left: 10px;
  top: 70px;
  background: transparent;
  border: 2px solid #ffffff;
  border-radius: 50%;
  z-index: 1001;
  color: #ffffff;
}

/* Ocultar completamente el sidebar en modo maximizado PERO mantener el botón visible */
.left-sidebar.hidden-maximized {
  width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  overflow: visible !important;
  /* Importante para que el botón se vea */
}

/* Ocultar el contenido del sidebar en modo maximizado */
.left-sidebar.hidden-maximized .view-selector {
  display: none !important;
}

.left-sidebar.hidden-maximized .view-info-panel {
  display: none !important;
}

/* Mantener visible el botón de toggle en modo maximizado con estilo destacado */
.left-sidebar.hidden-maximized .sidebar-toggle-btn {
  display: flex !important;
  position: fixed !important;
  left: 10px !important;
  top: 70px !important;
  background: rgba(0, 0, 0, 0.7) !important;
  border: 2px solid #ffffff !important;
  border-radius: 50% !important;
  z-index: 10000 !important;
  color: #ffffff !important;
  width: 36px !important;
  height: 36px !important;
  backdrop-filter: blur(6px) !important;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.5) !important;
  transition: all 0.3s ease !important;
}

.left-sidebar.hidden-maximized .sidebar-toggle-btn:hover {
  background: rgba(30, 144, 255, 0.8) !important;
  transform: scale(1.1) !important;
  box-shadow: 0 4px 16px rgba(30, 144, 255, 0.6) !important;
}

.sidebar-toggle-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 2px solid #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  font-size: 12px;
  font-weight: normal;
  z-index: 1000;
  transition: opacity 0.3s ease;
}

.sidebar-toggle-btn:hover {
  opacity: 0.7;
}

.right-sidebar-toggle-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 2px solid #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  font-size: 12px;
  font-weight: normal;
  z-index: 1000;
  transition: opacity 0.3s ease;
}

.right-sidebar-toggle-btn:hover {
  opacity: 0.7;
}

.bottom-toggle-btn {
  position: absolute;
  top: 5px;
  right: 50%;
  transform: translateX(50%);
  width: 25px;
  height: 25px;
  background: transparent;
  border: 2px solid #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  font-size: 10px;
  font-weight: normal;
  z-index: 1000;
  transition: all 0.3s ease;
}

.bottom-toggle-btn:hover {
  opacity: 0.7;
}

.brain-view {
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  border-bottom: 1px solid #404040;
  transition: background 0.2s;
}

.brain-view:first-child {
  padding-top: 45px;
}

.brain-view:hover {
  background: #363636;
}

.brain-view.active {
  background: #404040;
}

/* ========================================
   ESTILOS PARA BOTÓN VISTA 3D + IA
   ======================================== */

.view-3d-btn {
  position: relative;
  background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.view-3d-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #00ff88, #3498db);
  border-radius: inherit;
  z-index: -1;
  margin: -2px;
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.view-3d-btn:hover::before {
  opacity: 0.5;
}

.view-3d-btn.active {
  background: linear-gradient(135deg, #00ff88, #3498db) !important;
  color: #000 !important;
  font-weight: 700;
}

.view-3d-btn.active::before {
  opacity: 0;
}

.brain-image-3d {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  margin-bottom: 8px;
}

.brain-image-3d svg {
  color: #00ff88;
  transition: all 0.3s ease;
  filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.3));
}

.view-3d-btn:hover .brain-image-3d svg {
  transform: rotateY(15deg) rotateX(5deg) scale(1.1);
  filter: drop-shadow(0 0 12px rgba(0, 255, 136, 0.5));
}

.view-3d-btn.active .brain-image-3d svg {
  color: #000;
  transform: rotateY(10deg) rotateX(10deg) scale(1.2);
  filter: drop-shadow(0 0 16px rgba(0, 0, 0, 0.3));
}

.ai-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  animation: ai-pulse 2s infinite;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
}

@keyframes ai-pulse {

  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
  }

  50% {
    transform: scale(1.1);
    box-shadow: 0 4px 16px rgba(255, 107, 107, 0.6);
  }
}

.view-3d-btn .brain-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #00ff88;
  transition: color 0.3s ease;
}

/* ================================
     NUEVAS FUNCIONALIDADES DE LUIS
     ================================ */

/* Panel de información de vista */
.view-info-panel {
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid #444;
  border-radius: 8px;
  margin: 10px 0;
  padding: 8px;
  backdrop-filter: blur(4px);
  max-height: 400px;
  /* Limitar altura máxima */
  overflow-y: auto;
  /* Scroll si es necesario */
  font-size: 11px;
  /* Reducir tamaño de fuente base */
}

/* Scroll personalizado para el panel de información */
.view-info-panel::-webkit-scrollbar {
  width: 4px;
}

.view-info-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.view-info-panel::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 2px;
}

.view-info-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* Reducir espaciado entre elementos */
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  /* Reducir padding vertical */
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 18px;
  /* Altura mínima consistente */
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: #999;
  font-size: 9px;
  /* Reducir tamaño de etiquetas */
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
  /* No permitir que se comprima */
  width: 60px;
  /* Ancho fijo para alinear */
  text-align: left;
}

.info-value {
  color: #fff;
  font-size: 10px;
  /* Reducir tamaño de valores */
  font-weight: 600;
  background: rgba(59, 130, 246, 0.2);
  padding: 1px 6px;
  /* Reducir padding */
  border-radius: 3px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  white-space: nowrap;
  /* Evitar salto de línea */
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  /* Limitar ancho máximo */
}

/* Estilos especiales para diferentes tipos de valores */
.info-value.zoom-value {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
  color: #4ade80;
  font-size: 10px;
}

.info-value.tool-active {
  background: rgba(249, 115, 22, 0.2);
  border-color: rgba(249, 115, 22, 0.3);
  color: #fb923c;
  animation: pulse 2s infinite;
  font-size: 9px;
}

/* Estilos para información de tipo de datos */
.info-value.optimized-data {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
  color: #4ade80;
  position: relative;
  font-size: 9px;
}

.optimization-badge {
  display: inline-block;
  margin-left: 2px;
  font-size: 8px;
  color: #22c55e;
  font-weight: bold;
}

/* Estilos para información de orientación */
.orientation-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 9px;
}

.orientation-value.orientation-ras {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.orientation-value.orientation-lps {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.orientation-value.orientation-corrected {
  background: rgba(168, 85, 247, 0.15);
  border-color: rgba(168, 85, 247, 0.3);
  color: #a855f7;
}

.correction-badge {
  display: inline-block;
  margin-left: 2px;
  font-size: 8px;
  color: #a855f7;
  font-weight: bold;
}

/* Estilos para datos problemáticos (float32 con orientación RAS) */
.info-value.problematic-data {
  background: rgba(249, 115, 22, 0.2);
  border-color: rgba(249, 115, 22, 0.3);
  color: #fb923c;
  position: relative;
  font-size: 9px;
}

.issue-badge {
  display: inline-block;
  margin-left: 2px;
  font-size: 8px;
  color: #fb923c;
  font-weight: bold;
  cursor: help;
}

/* Estilos para indicadores de calidad de imagen */
.info-value.resolution-value {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.info-value.quality-value {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  /* Reducir espaciado */
  font-size: 9px;
}

.info-value.quality-high {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.info-value.quality-medium {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.info-value.quality-low {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.info-value.quality-unknown {
  background: rgba(156, 163, 175, 0.15);
  border-color: rgba(156, 163, 175, 0.3);
  color: #9ca3af;
}

.quality-indicator {
  font-size: 10px;
  /* Reducir tamaño del emoji */
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* Estilos para información de resolución */
.info-value.resolution-value {
  font-family: 'Courier New', monospace;
  font-size: 9px;
  font-weight: 600;
  background: rgba(168, 85, 247, 0.15);
  border-color: rgba(168, 85, 247, 0.3);
  color: #a855f7;
}

/* Estilos para el botón de mejora de calidad */
.enhancement-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  /* Reducir espaciado */
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  padding: 2px 6px;
  /* Reducir padding */
  border-radius: 3px;
  cursor: pointer;
  font-size: 9px;
  /* Reducir tamaño de fuente */
  font-size: 11px;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 70px;
  justify-content: center;
}

.enhancement-toggle:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
}

.enhancement-toggle.active {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.6);
  color: #16a34a;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
}

.enhancement-toggle.active:hover {
  background: rgba(34, 197, 94, 0.4);
}

.enhancement-icon {
  font-size: 12px;
  display: flex;
  align-items: center;
}

.enhancement-text {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

.brain-image {
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
  border-radius: 10px;
  border: 2px solid #666;
}

.brain-label {
  font-size: 14px;
  color: #ffffff;
  font-weight: 500;
}

/* SECCIÓN 2: ÁREA CENTRAL */
.center-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border: 1px solid #1a1a1a;
  border-radius: 8px;
  margin: 0px;
  height: 100%;
  overflow: hidden;
}

.top-controls {
  background: #2b2b2b;
  padding: 5px 15px;
  display: flex;
  align-items: center;
  gap: 30px;
  border-bottom: 1px solid #404040;
  justify-content: center;
}

/* BOTÓN DE EXPANDIR ÁREA CENTRAL */
.expand-center-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.expand-center-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
}

.expand-center-btn:active {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.2);
}

.expand-center-btn.expanded {
  background: rgba(74, 144, 226, 0.2);
  border-color: rgba(74, 144, 226, 0.4);
}

.expand-center-btn.expanded svg {
  stroke: #fcfcfc;
}

.expand-center-btn svg {
  transition: transform 0.3s ease;
}

.expand-center-btn:hover svg {
  transform: scale(1.1);
}

.expand-center-btn span {
  color: white;
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}

.modality-select {
  background: #404040;
  color: #ffffff;
  border: 1px solid #666;
  padding: 8px 15px;
  border-radius: 4px;
  font-size: 14px;
  min-width: 120px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modality-select:hover {
  background: #505050;
  border-color: #888;
  transform: translateY(-1px);
}

.top-right-labels {
  display: flex;
  gap: 30px;
  font-size: 12px;
  color: #cccccc;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.icon-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transform: translateY(-2px);
}

.icon-item:hover svg {
  stroke: #ffffff;
}

/* Estilos para iconos activos - NUEVO DE LUIS */
.icon-item.active {
  background: rgba(30, 64, 175, 0.3);
  color: #60a5fa;
  border: 1px solid rgba(30, 64, 175, 0.5);
}

.icon-item.active svg {
  stroke: #60a5fa;
}

.icon-item.active:hover {
  background: rgba(30, 64, 175, 0.4);
  color: #93c5fd;
  transform: translateY(-1px);
}

/* Botón de ayuda especial - NUEVO DE LUIS */
.icon-item.help-shortcuts {
  opacity: 0.6;
  margin-top: auto;
}

.icon-item.help-shortcuts:hover {
  opacity: 1;
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

/* Indicadores de modo y zoom - NUEVO DE LUIS */
.zoom-indicator {
  font-size: 0.8em;
  color: #60a5fa;
  font-weight: normal;
}

/* Indicador de zoom flotante - NUEVO DE LUIS */
.zoom-indicator-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  z-index: 10;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.zoom-indicator-overlay:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.05);
}

.mode-indicator {
  font-size: 0.7em;
  background: rgba(30, 64, 175, 0.3);
  color: #93c5fd;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: normal;
}

/* TABBED INTERFACE STYLES */
.medical-tabs {
  background: #1a1a1a;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-headers {
  display: flex;
  background: #2b2b2b;
  border-bottom: 1px solid #404040;
  height: 35px;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
}

.tab-header {
  flex: 1;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  font-weight: 600;
  color: #cccccc;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 0.4rem;
  height: 35px;
  min-height: 35px;
  border-top-left-radius: 1px;
  border-top-right-radius: 1px;
  border-bottom-right-radius: 6px;
  border-bottom-left-radius: 6px;
}

.tab-header:last-child {
  border-right: none;
}

.tab-header:hover {
  background: #404040;
  color: #ffffff;
  transform: translateY(-2px);
}

.tab-header.active {
  background: #c6202a;
  color: #ffffff;
  border-top-left-radius: 1px;
  border-top-right-radius: 1px;
  border-bottom-right-radius: 6px;
  border-bottom-left-radius: 6px;
}

.tab-content {
  flex: 1;
  background: #1a1a1a;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
  /* Eliminar cualquier borde azul o outline que pueda aparecer */
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 5px;
  animation: fadeInUp 0.4s ease-out;
  position: absolute;
  top: 0;
  left: 0;
  /* Eliminar cualquier borde azul o outline que pueda aparecer */
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.tab-panel:first-child {
  padding: 0;
}

.tab-panel.active {
  display: flex;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* IMAGEN ORIGINAL STYLES */
.image-container {
  background: #2b2b2b;
  border: none;
  /* Eliminar borde para evitar líneas azules alrededor de la imagen */
  border-radius: 12px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.image-container:hover {
  background: #333;
}

.image-container.has-image {
  background: #000;
  border: none;
  cursor: zoom-in;
}

/* Modo expandido - NUEVO DE LUIS */
.image-container.expanded-mode {
  border-radius: 0;
  margin: -5px;
  padding: 0;
}

.image-container.expanded-mode.has-image {
  background: #000;
  border: none;
  cursor: zoom-in;
}

.upload-prompt {
  text-align: center;
  color: #cccccc;
}

.upload-prompt i {
  font-size: 4rem;
  margin-bottom: 15px;
  color: #666;
}

.medical-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

/* DOBLE VISTA STYLES */
.double-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  height: 100%;
  padding: 1px;
}

.view-panel {
  background: #2b2b2b;
  border: 1px solid #404040;
  border-radius: 1px;
  position: relative;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  background: #2b2b2b;
  color: white;
  padding: 1px 4px;
  /* Padding extremadamente compacto */
  font-weight: 500;
  /* Peso de fuente más ligero */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* Reducir gap aún más */
  min-height: 20px;
  /* Altura mínima aún más pequeña */
  font-size: 9px;
  /* Tamaño de fuente más pequeño */
  flex-shrink: 0;
  /* No permitir que se encoja */
}

.view-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
  /* Evitar scroll en el contenido */
  min-height: 0;
  /* Permitir que se contraiga */
  padding: 0;
  /* Sin padding para maximizar espacio */
  position: relative;
  /* Para centrado absoluto si es necesario */
}

/* Estilos específicos para el canvas de la vista doble - NUEVO DE LUIS */
.canvas-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.double-view-canvas {
  background: #000;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.double-view-canvas.original-canvas {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Indicador de zoom para la vista doble - NUEVO DE LUIS */
.zoom-indicator-double {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  pointer-events: none;
  z-index: 10;
}

.view-placeholder {
  color: #6c757d;
  text-align: center;
  padding: 20px;
}

.bottom-section {
  background: #2b2b2b;
  padding: 8px 12px;
  border-top: 1px solid #404040;
  position: relative;
  transition: height 0.3s ease, padding 0.3s ease;
  overflow-y: auto;
  max-height: 320px;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.bottom-section.collapsed {
  height: 40px;
  padding: 2px 20px;
}

.bottom-section.collapsed .bottom-content {
  display: none;
}

.bottom-section.collapsed .bottom-toggle-btn {
  top: 3px;
  background: #2b2b2b;
  border: 2px solid #ffffff;
}

.bottom-content {
  padding-top: 3px;
  padding-bottom: 35px;
  transition: opacity 0.3s ease;
}

/* ========================================
     ESTILOS PARA CONTROLES 3D EN BOTTOM SECTION - NUEVO DE LUIS
     ======================================== */

.controls-3d-toggle-container {
  padding: 16px;
  text-align: center;
}

.controls-toggle-btn {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: #ffffff;
  border: 2px solid #3498db;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.controls-toggle-btn:hover {
  background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.controls-toggle-btn.active {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border-color: #2980b9;
}

.controls-3d-bottom {
  padding: 8px;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  border-radius: 4px;
  border: 2px solid #3498db;
  margin-bottom: 8px;
  position: relative;
}

.close-btn-3d {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e74c3c;
  color: white;
  border: none;
  font-size: 18px;
  line-height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.close-btn-3d:hover {
  background: #c0392b;
}

.close-btn-3d.sidebar {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  font-size: 16px;
}

/* ========================================
     CONFIGURACIÓN DE SCROLL PARA CONTROLES 3D
     ======================================== */

.controls-3d-bottom {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Estilos personalizados para scrollbar de controles 3D */
.controls-3d-bottom::-webkit-scrollbar {
  width: 8px;
}

.controls-3d-bottom::-webkit-scrollbar-track {
  background: rgba(52, 152, 219, 0.1);
  border-radius: 4px;
}

.controls-3d-bottom::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #3498db, #2980b9);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.controls-3d-bottom::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #4aa3df, #3498db);
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

.controls-3d-bottom::-webkit-scrollbar-corner {
  background: transparent;
}

/* Indicador de scroll para controles 3D */
.scroll-indicator {
  opacity: 0.6;
  animation: scroll-pulse 2s infinite;
  transition: opacity 0.3s ease;
}

.scroll-indicator:hover {
  opacity: 1;
}

@keyframes scroll-pulse {

  0%,
  100% {
    opacity: 0.6;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(2px);
  }
}

/* Ocultar indicador de scroll cuando no es necesario */
.controls-3d-bottom:not(.scrollable) .scroll-indicator {
  display: none;
}

.controls-3d-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}

.control-group-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 28px;
}

.control-label-inline {
  font-size: 9px;
  font-weight: 600;
  color: #ffffff;
  min-width: 45px;
  text-align: left;
  white-space: nowrap;
}

.control-slider-inline {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #ecf0f1;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.control-slider-inline::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.control-slider-inline::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.control-slider-inline::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.control-value {
  font-size: 8px;
  font-weight: 600;
  color: #3498db;
  min-width: 30px;
  text-align: right;
  font-family: "JetBrains Mono", monospace;
}

.color-preset-section {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.color-preset-select-inline {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #4a6741;
  border-radius: 4px;
  background: #2c3e50;
  color: #ffffff;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.color-preset-select-inline:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

/* ========================================
   ESTILOS PARA CONTROLES DE IA
   ======================================== */

.ai-controls-section {
  margin-top: 8px;
  padding: 6px;
  background: rgba(0, 255, 136, 0.05);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 4px;
}

.ai-label {
  color: #00ff88 !important;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 10px;
}

.ai-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border: 2px solid #00ff88;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.ai-checkbox:checked {
  background: #00ff88;
  border-color: #00ff88;
}

.ai-checkbox:checked::after {
  content: "✓";
  position: absolute;
  top: -2px;
  left: 2px;
  color: #000;
  font-size: 12px;
  font-weight: bold;
}

.ai-slider {
  background: linear-gradient(90deg, #00ff88 0%, #00cc6a 100%) !important;
}

.ai-slider::-webkit-slider-thumb {
  background: #00ff88 !important;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 255, 136, 0.4) !important;
}

.ai-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 3px 12px rgba(0, 255, 136, 0.6) !important;
}

.ai-value {
  color: #00ff88 !important;
  text-shadow: 0 0 4px rgba(0, 255, 136, 0.3);
}

.ai-sub-controls {
  margin-top: 10px;
  padding-left: 20px;
  border-left: 2px solid rgba(0, 255, 136, 0.3);
}

.ai-status {
  margin-top: 12px;
  padding: 8px;
  background: rgba(0, 255, 136, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(0, 255, 136, 0.2);
}

.ai-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 5px;
}

.ai-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #00cc6a);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.ai-status-text {
  font-size: 10px;
  color: #00ff88;
  text-align: center;
  font-weight: 600;
}

.ai-results {
  margin-top: 12px;
  padding: 10px;
  background: rgba(0, 255, 136, 0.08);
  border-radius: 6px;
  border: 1px solid rgba(0, 255, 136, 0.2);
}

.ai-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 11px;
}

.ai-result-label {
  color: #bdc3c7;
  font-weight: 500;
}

.ai-result-value {
  color: #00ff88;
  font-weight: 700;
  font-family: "JetBrains Mono", monospace;
  text-shadow: 0 0 4px rgba(0, 255, 136, 0.3);
}

.ai-action-buttons {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.ai-action-btn {
  flex: 1;
  padding: 4px 8px;
  border: none;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ai-analyze-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: 1px solid #3498db;
}

.ai-analyze-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4aa3df, #3498db);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  transform: translateY(-1px);
}

.ai-enhance-btn {
  background: linear-gradient(135deg, #00ff88, #00cc6a);
  color: #000;
  border: 1px solid #00ff88;
}

.ai-enhance-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1aff94, #00ff88);
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
  transform: translateY(-1px);
}

.ai-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.performance-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: "JetBrains Mono", monospace;
  font-size: 9px;
  margin-top: 6px;
}

.performance-label {
  color: #bdc3c7;
  font-weight: 500;
}

.performance-value {
  color: #3498db;
  font-weight: 600;
  margin-right: 8px;
}

/* Responsive para controles 3D bottom */
@media (max-width: 768px) {
  .controls-3d-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .control-group-inline {
    padding: 6px 8px;
  }

  .control-label-inline {
    min-width: 50px;
    font-size: 10px;
  }

  .performance-info {
    flex-wrap: wrap;
    gap: 8px;
  }
}

/* ========================================
     FIN ESTILOS CONTROLES 3D BOTTOM
     ======================================== */

.navigation-label {
  background: #2b2b2b;
  text-align: center;
  font-size: 14px;
  color: #cccccc;
  margin-bottom: 0px;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  border-top: 1px solid #404040;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.color-legend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #ffffff;
}

.color-box {
  width: 25px;
  height: 10px;
  border-radius: 2px;
}

.tumor-red {
  background: #dc3545;
}

.edema-yellow {
  background: #ffc107;
}

.necrotic-blue {
  background: #007bff;
}

.diagnosis-section {
  background: #404040;
  border: 1px solid #666;
  border-radius: 5px;
  padding: 15px;
  min-height: 100px;
  color: #cccccc;
  font-size: 14px;
  cursor: text;
  transition: all 0.3s ease;
}

.diagnosis-section:hover {
  background: #454545;
  border-color: #777;
}

/* SECCIÓN 3: SIDEBAR DERECHO */
.right-sidebar {
  width: 245px;
  background: #2b2b2b;
  border: 1px solid #212121;
  border-radius: 8px;
  margin: 0px;
  position: relative;
  transition: width 0.3s ease;
}

.right-sidebar.collapsed {
  width: 0px;
  border: none;
  margin: 0;
  overflow: visible;
  position: relative;
}

.right-sidebar.collapsed .sidebar-section {
  display: none;
}

.right-sidebar.collapsed .right-sidebar-toggle-btn {
  position: fixed;
  right: 10px;
  top: 70px;
  background: transparent;
  border: 2px solid #ffffff;
  border-radius: 50%;
  z-index: 1001;
  color: #ffffff;
}

.sidebar-section {
  border-bottom: 1px solid #404040;
}

.sidebar-section:first-child {
  padding-top: 45px;
}

.section-header {
  background: #2b2b2b;
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  padding: 12px 20px;
  border-bottom: 3px solid #730302;
}

.section-body {
  padding: 20px;
}

.section-content {
  background: #404040;
  border: 1px solid #666;
  border-radius: 5px;
  padding: 15px;
  min-height: 80px;
  font-size: 13px;
  color: #cccccc;
}

.optional-label {
  text-align: center;
  color: #999;
  font-style: italic;
  font-size: 13px;
}

/* ESTILOS PARA SOPORTE IA */
.ai-analyzing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.ai-loading {
  width: 60px;
  height: 60px;
  border: 4px solid #404040;
  border-top: 4px solid #8bb6ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.footer {
  background: #2b2b2b;
  text-align: center;
  padding: 20px;
  color: #cccccc;
  border-top: 1px solid #404040;
}

/* ESTADOS ESPECIALES */
.loading-state {
  opacity: 0.7;
  pointer-events: none;
}

.success-state {
  border-color: #f10706;
  background: rgba(40, 167, 69, 0.1);
}

.error-state {
  border-color: #c6202a;
  background: rgba(220, 53, 69, 0.1);
}

/* ANIMACIONES ADICIONALES */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(100%);
}

/* ========================================
     ESTILOS PARA RENDERIZADO 3D - NUEVO DE LUIS
     ======================================== */

.three-canvas {
  width: 100%;
  height: 100%;
  border: none;
  /* Eliminar borde para consistency con main-canvas */
  border-radius: 8px;
  display: block;
  background: #000;
  /* Mismo background que main-canvas */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  /* Mismo shadow que main-canvas */
  cursor: grab;
  margin: auto;
  /* Centrar como main-canvas */
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  /* Mismo comportamiento que main-canvas */
}

.three-canvas:active {
  cursor: grabbing;
}

/* Estados del canvas 3D */
.three-canvas.loading {
  opacity: 0.7;
  pointer-events: none;
}

.three-canvas.error {
  border-color: #ef4444;
  background: #1f1114;
}

/* Estilos para canvas expandido */
.main-canvas.expanded-canvas {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  object-fit: contain;
}

.three-canvas.expanded-canvas {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  border-radius: 0;
  border: none;
}

/* Estilos para modo maximizado de canvas */
.main-canvas.maximized-canvas,
.three-canvas.maximized-canvas {
  width: 1600px !important;
  height: 900px !important;
  max-width: 1600px !important;
  max-height: 900px !important;
  border-radius: 12px;
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
  background: #000;
  margin: 10px auto;
  display: block;
  transform: scale(1);
  transition: all 0.3s ease;
}

/* Contenedor de imagen optimizado para modo expandido */
.image-container.expanded-mode {
  padding: 8px !important;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0a0a0a;
  border-radius: 12px;
  width: 100% !important;
  height: calc(100vh - 80px) !important;
  box-sizing: border-box;
  overflow: hidden;
}

.medical-image-viewer.expanded-mode {
  width: 100% !important;
  height: 100% !important;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: none !important;
  max-height: none !important;
}

/* Indicador de optimización de espacio */
.space-optimization-indicator {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 1000;
  pointer-events: none;
}

.optimization-badge {
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  animation: optimizationPulse 2s ease-in-out infinite;
}

.optimization-badge svg {
  opacity: 0.9;
}

@keyframes optimizationPulse {

  0%,
  100% {
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 4px 16px rgba(25, 118, 210, 0.5);
    transform: scale(1.02);
  }
}

/* ========================================
     FIN ESTILOS 3D
     ======================================== */

/* ========================================
     ESTILOS PARA MENÚ DE MEDICIONES - NUEVO DE LUIS
     ======================================== */

.measurement-menu {
  position: relative;
  display: inline-block;
  z-index: 1000;
}

.measurement-options-trigger {
  cursor: pointer;
  position: relative;
  z-index: 1000;
}

.measurement-dropdown {
  position: fixed;
  top: 60px;
  right: 20px;
  min-width: 260px;
  background: #404040;
  border: 1px solid #505050;
  border-radius: 6px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  z-index: 1000;
  margin-top: 8px;
  margin-left: 8px;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #303030;
  color: white;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.close-dropdown {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.2s ease;
  font-weight: bold;
}

.close-dropdown:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}

.dropdown-info {
  padding: 12px;
  font-size: 11px;
  color: #ffffff;
  background: #353535;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.dropdown-actions {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #404040;
}

.dropdown-btn {
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  background: #c6202a;
  color: white;
}

.dropdown-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent);
  transition: left 0.5s ease;
}

.dropdown-btn:hover::before {
  left: 100%;
}

.btn-clear-current {
  background: #c6202a;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.btn-clear-current:hover:not(:disabled) {
  background: #d42530;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.btn-clear-all {
  background: #c6202a;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.btn-clear-all:hover:not(:disabled) {
  background: #d42530;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.dropdown-btn:disabled {
  background: linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%);
  color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none !important;
}

/* Triángulo indicador para el dropdown */
.measurement-dropdown::before {
  content: "";
  position: absolute;
  top: -6px;
  right: 20px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid #404040;
}

/* Animación de entrada */
.measurement-dropdown {
  animation: dropdownFadeIn 0.3s ease-out;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive para menú de mediciones */
@media (max-width: 768px) {
  .measurement-dropdown {
    right: 0;
    min-width: 240px;
  }

  .dropdown-btn {
    font-size: 10px;
    padding: 8px 12px;
  }

  .measurement-dropdown::before {
    top: 15px;
    right: -6px;
  }
}

/* ========================================
     FIN ESTILOS MENÚ MEDICIONES
     ======================================== */

/* ========================================
     ESTILOS MENÚ PROCESAMIENTO DE IMÁGENES WEB WORKER
     ======================================== */

.image-processing-menu {
  position: relative;
  display: inline-block;
}

.processing-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 320px;
  max-width: 380px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #4a90e2;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(74, 144, 226, 0.3);
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  max-height: 80vh;
  overflow-y: auto;
}

.processing-dropdown .dropdown-header {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  padding: 12px 15px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.processing-dropdown .dropdown-info {
  background: rgba(74, 144, 226, 0.1);
  color: #74c0fc;
  padding: 8px 15px;
  font-size: 11px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.filter-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 15px;
}

.filter-header {
  margin-bottom: 8px;
}

.filter-toggle {
  display: flex;
  align-items: center;
  color: white;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  gap: 8px;
}

.filter-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #4a90e2;
  cursor: pointer;
}

.filter-controls {
  margin-top: 10px;
  padding-left: 24px;
  border-left: 2px solid rgba(74, 144, 226, 0.3);
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.control-row label {
  color: #a8c8ec;
  font-size: 11px;
  min-width: 70px;
  font-weight: 500;
}

.control-row input[type="range"] {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  appearance: none;
}

.control-row input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #4a90e2;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.control-row input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #4a90e2;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.control-row select {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  padding: 4px 8px;
  font-size: 11px;
}

.control-row select option {
  background: #1a1a2e;
  color: white;
}

.control-row span {
  color: #74c0fc;
  font-size: 11px;
  min-width: 40px;
  text-align: right;
  font-weight: bold;
}

.processing-dropdown .dropdown-actions {
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.processing-dropdown .dropdown-btn {
  flex: 1;
  min-width: 90px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.btn-apply {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: white;
}

.btn-apply:hover:not(:disabled) {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(46, 204, 113, 0.3);
}

.btn-reset {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
}

.btn-reset:hover:not(:disabled) {
  background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
}

.btn-save {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #2980b9 0%, #3498db 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.btn-quick-test {
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  color: white;
}

.btn-quick-test:hover:not(:disabled) {
  background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(155, 89, 182, 0.3);
}

.processing-dropdown .dropdown-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.processing-dropdown .close-dropdown {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.processing-dropdown .close-dropdown:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Flecha del dropdown */
.processing-dropdown::before {
  content: '';
  position: absolute;
  top: -8px;
  right: 30px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #4a90e2;
}

/* Responsive para menú de procesamiento */
@media (max-width: 768px) {
  .processing-dropdown {
    right: -30px;
    min-width: 300px;
    max-width: 320px;
  }

  .processing-dropdown::before {
    right: 50px;
  }

  .control-row {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .control-row label {
    min-width: auto;
  }
}

/* ========================================
     FIN ESTILOS MENÚ PROCESAMIENTO WEB WORKER
     ======================================== */

/* ========================================
     ESTILOS PARA SISTEMA DE 4 VISTAS PROFESIONAL - NUEVO DE LUIS
     ======================================== */

.four-views-mode {
  width: 100%;
  height: 100%;
  /* Usar toda la altura del contenedor padre */
  padding: 2px;
  /* Padding mínimo para mejor ajuste */
  background: linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  border-radius: 12px;
  /* Bordes más redondeados */
  max-width: 100vw;
  box-sizing: border-box;
  overflow: hidden;
  /* Evitar scroll */
  display: flex;
  /* Usar flexbox para mejor control */
  flex-direction: column;
  /* Columna para organizar contenido */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Modo expandido optimizado para máximo aprovechamiento */
.four-views-mode.expanded-mode {
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
  /* Usar toda la altura del contenedor padre image-container */
  padding: 4px !important;
  /* Padding mínimo para mantener separación */
  margin: 0 !important;
  /* Sin márgenes */
  border-radius: 8px !important;
  /* Bordes menos redondeados para aprovechar espacio */
  z-index: 10;
  /* Asegurar que esté encima pero dentro del contenedor */
  box-sizing: border-box;
  /* Incluir padding en el cálculo del tamaño */
}

.four-views-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 0;
  /* ✂️ Sin separación entre vistas - apariencia unificada */
  width: 100%;
  height: 100%;
  /* Usar toda la altura disponible */
  flex: 1;
  /* Expandir para llenar el contenedor padre */
  min-height: 0;
  /* Permitir que el grid se contraiga */
  max-width: 100%;
  box-sizing: border-box;
  padding: 0;
  /* ✂️ Sin padding - vistas unidas completamente */
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0;
  /* ✂️ Sin bordes redondeados */
}

/* Grid optimizado para modo expandido */
.four-views-mode.expanded-mode .four-views-grid {
  width: 100% !important;
  height: calc(100% - 8px) !important;
  /* Usar toda la altura del contenedor padre menos padding */
  gap: 0 !important;
  /* ✂️ Sin gaps - vistas completamente unidas */
  padding: 0 !important;
  /* ✂️ Sin padding - aprovechamiento máximo del espacio */
  margin: 0 !important;
  box-sizing: border-box;
  /* Incluir padding y border en el cálculo */
  min-height: 400px;
  /* Altura mínima razonable */
  overflow: hidden;
  /* Evitar scroll interno */
}

.view-quadrant {
  position: relative;
  border: none;
  /* ✂️ Sin bordes - apariencia limpia */
  border-radius: 0;
  /* ✂️ Sin bordes redondeados - esquinas cuadradas */
  overflow: hidden;
  /* Asegurar que el contenido no exceda */
  background: #000000;
  /* Fondo negro sólido para aspecto médico profesional */
  display: flex;
  flex-direction: column;
  /* Organizar header y canvas verticalmente */
  justify-content: flex-start;
  align-items: center;
  /* Centrar contenido horizontalmente */
  box-sizing: border-box;
  /* Incluir bordes en el tamaño */
  transition: none;
  /* ✂️ Sin transiciones - respuesta inmediata */
  box-shadow: none;
  /* ✂️ Sin sombras - aspecto plano */
  /* Ajustarse al grid padre en lugar de usar altura fija */
  height: 100%;
  /* Llenar completamente la celda del grid */
  width: 100%;
  /* Llenar completamente la celda del grid */
  min-height: 200px;
  /* Altura mínima más pequeña y flexible */
  max-height: none;
  /* Permitir que crezca según el grid */
  padding: 0;
  /* ✂️ Sin padding - aprovechamiento máximo */
  backdrop-filter: none;
  /* ✂️ Sin efectos de desenfoque */
}

/* Optimización para cuadrantes en modo expandido */
.four-views-mode.expanded-mode .view-quadrant {
  height: 100% !important;
  /* Llenar completamente la celda del grid */
  width: 100% !important;
  /* Llenar completamente la celda del grid */
  min-height: auto !important;
  /* Dejar que el grid controle la altura mínima */
  max-height: none !important;
  /* Sin restricción de altura máxima, que el grid controle */
  border: none !important;
  /* ✂️ Sin bordes - apariencia completamente unificada */
  border-radius: 0 !important;
  /* ✂️ Esquinas cuadradas */
  box-shadow: none !important;
  /* ✂️ Sin sombras */
  padding: 0 !important;
  /* ✂️ Sin padding - aprovechamiento 100% del espacio */
  margin: 0 !important;
  /* Sin márgenes */
  overflow: hidden;
  /* Evitar desbordamiento */
}

.view-quadrant:hover {
  /* ✂️ Sin efectos hover - mantener apariencia estática */
  border-color: transparent;
  box-shadow: none;
  transform: none;
}

.view-quadrant.active-view {
  /* ✂️ Sin indicador visual de borde - solo background si es necesario */
  border-color: transparent;
  background: #000000;
  box-shadow: none;
}

.view-quadrant.active-main {
  /* ✂️ Sin indicador visual de borde - solo background si es necesario */
  border-color: transparent;
  background: #000000;
  box-shadow: none;
}

.view-quadrant.active-3d {
  /* ✂️ Sin indicador visual de borde - solo background si es necesario */
  border-color: transparent;
  background: #000000;
  box-shadow: none;
}

/* Headers más compactos */
.axial-header {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #1f2937;
}

.coronal-header {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
}

.sagittal-header {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
}

.main-header {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
}

.view-3d-header {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #ffffff;
}

/* Contenedor específico para vista 3D */
.view-3d-container {
  position: relative;
  background: linear-gradient(135deg, #000000 0%, #000000 100%);
}

.view-3d-canvas {
  background: #000;
  /* Mismo color negro que el main-canvas */
  /* Canvas responsive que escala con el contenedor */
  width: 100% !important;
  height: 100% !important;
  min-width: 300px;
  min-height: 200px;
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  /* Consistencia visual */
  border: none;
  /* Sin bordes para consistencia */
  object-fit: contain;
  /* Mantener aspecto y ajustarse al contenedor */
}

/* Clase específica para canvas responsive */
.responsive-canvas {
  display: block;
  box-sizing: border-box;
  /* Permitir que el canvas se ajuste fluidamente */
  transition: width 0.2s ease, height 0.2s ease;
}

/* Mensaje cuando no hay datos 3D */
.no-3d-data-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #a78bfa;
  z-index: 2;
}

.no-3d-data-message .message-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.no-3d-data-message .message-text p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.no-3d-data-message .message-text small {
  font-size: 12px;
  opacity: 0.8;
}

.view-title {
  display: flex;
  align-items: center;
  gap: 4px;
  /* Reducir espacio entre elementos */
  font-weight: 600;
  font-size: 10px;
  /* Reducir tamaño de fuente */
  text-transform: uppercase;
  letter-spacing: 0.3px;
  /* Reducir espaciado */
  padding: 4px 8px;
  /* Padding más compacto */
  margin: 0;
  /* Eliminar margins */
  line-height: 1.2;
  /* Línea más compacta */
}

.view-icon {
  font-size: 12px;
  font-weight: bold;
}

.view-name {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}

.view-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
}

.slice-info {
  background: rgba(255, 255, 255, 0.15);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: "JetBrains Mono", monospace;
  font-weight: 500;
  font-size: 9px;
}

.zoom-badge {
  background: rgba(59, 130, 246, 0.8);
  color: white;
  padding: 1px 4px;
  border-radius: 8px;
  font-family: "JetBrains Mono", monospace;
  font-weight: 600;
  font-size: 9px;
  min-width: 28px;
  text-align: center;
}

/* Contenedores de canvas optimizados para centrado perfecto */
.quadrant-canvas {
  border: none;
  cursor: crosshair;
  transition: transform 0.15s ease;
  border-radius: 6px;
  max-width: calc(100% - 8px);
  /* Margen más ajustado del contenedor */
  max-height: calc(100% - 35px);
  /* Espacio reducido para header y márgenes */
  object-fit: contain;
  /* Mantener proporciones sin exceder contenedor */
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
  width: calc(100% - 8px);
  /* Ancho controlado con menos márgenes */
  height: calc(100% - 35px);
  /* Altura controlada con menos espacio para header */
  min-width: 110px;
  /* Tamaño mínimo más pequeño */
  min-height: 80px;
  /* Altura mínima más pequeña */
  display: block;
  /* Asegurar display correcto */
  margin: 4px auto;
  /* Centrado horizontal con margen reducido */
  background: #000000 !important;
  /* Fondo negro sólido forzado */
  box-sizing: border-box;
  /* Incluir bordes en el cálculo del tamaño */
}

.quadrant-canvas:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
}

.single-view-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 500px;
  overflow: hidden;
  /* Evitar que el canvas se desborde */
  position: relative;
}

.main-canvas {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  margin: auto;
  display: block;
  background: #000;
  border: none;
  /* Eliminar borde para evitar líneas azules alrededor del canvas */
  /* Canvas responsivo - se ajusta al contenedor */
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.three-canvas {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  margin: auto;
  display: block;
  background: #000;
  /* Mismo color negro que el main-canvas */
  border: none;
  /* Eliminar borde para evitar líneas azules alrededor del canvas 3D */
  /* Canvas responsivo - se ajusta al contenedor */
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Overlays e indicadores más sutiles */
.zoom-overlay {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.crosshair-drag-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(245, 158, 11, 0.95);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {

  0%,
  100% {
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  }

  50% {
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.8);
  }
}

.tool-indicators {
  position: absolute;
  bottom: 6px;
  left: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tool-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 500;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.zoom-indicator {
  background: rgba(59, 130, 246, 0.9);
}

.measure-indicator {
  background: rgba(16, 185, 129, 0.9);
}

.tool-icon {
  font-size: 10px;
}

.tool-text {
  font-family: "Inter", sans-serif;
  font-size: 9px;
}

/* Cursores - NUEVO DE LUIS */
.zoom-in-cursor {
  cursor: zoom-in !important;
}

.zoom-out-cursor {
  cursor: zoom-out !important;
}

.measure-cursor {
  cursor: crosshair !important;
}

.cursor-grab {
  cursor: grab !important;
}

.cursor-grab:active {
  cursor: grabbing !important;
}

/* Estilos para cursores interactivos del canvas - NUEVO DE LUIS */
.main-canvas {
  cursor: default;
  transition: cursor 0.2s ease;
}

.main-canvas.zoom-in-cursor {
  cursor: zoom-in;
}

.main-canvas.zoom-out-cursor {
  cursor: zoom-out;
}

.main-canvas.measure-cursor {
  cursor: crosshair;
}

/* Fallback para navegadores que no soportan zoom cursors */
@supports not (cursor: zoom-in) {
  .main-canvas.zoom-in-cursor {
    cursor: pointer;
  }

  .main-canvas.zoom-out-cursor {
    cursor: pointer;
  }
}

/* Animaciones más suaves */
.view-quadrant {
  animation: fadeInUp 0.2s ease-out;
}

.view-quadrant:nth-child(1) {
  animation-delay: 0.05s;
}

.view-quadrant:nth-child(2) {
  animation-delay: 0.1s;
}

.view-quadrant:nth-child(3) {
  animation-delay: 0.15s;
}

.view-quadrant:nth-child(4) {
  animation-delay: 0.2s;
}

/* Estados específicos para cada vista */
.axial-view {
  --view-bg-color: #ffff00;
  --view-text-color: #000000;
  --view-border-color: #ffff00;
}

.coronal-view {
  --view-bg-color: #ff0000;
  --view-text-color: #ffffff;
  --view-border-color: #ff0000;
}

.sagittal-view {
  --view-bg-color: #00ff00;
  --view-text-color: #000000;
  --view-border-color: #00ff00;
}

.main-quad-view {
  --view-bg-color: #3b82f6;
  --view-text-color: #ffffff;
  --view-border-color: #3b82f6;
}

/* ========================================
     FIN ESTILOS SISTEMA DE 4 VISTAS
     ======================================== */

/* Botón para cambiar archivo en el visor médico - NUEVO DE LUIS */
.change-file-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  z-index: 10;
  transition: background 0.3s ease;
}

.change-file-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.medical-image-viewer {
  position: relative;
  width: 100%;
  height: calc(100vh - 120px);
  /* Usar toda la altura disponible */
  overflow: hidden;
  /* Evitar scroll innecesario */
  padding: 0;
  /* Eliminar padding interno */
  margin: 0;
  /* Eliminar margins */
}

/* Botones de vista - NUEVO DE LUIS */
.view-btn {
  padding: 8px 12px;
  border: 1px solid #555;
  background-color: #333;
  color: #ccc;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  text-transform: uppercase;
  transition: all 0.2s ease;
}

.axial-btn.active {
  background-color: #ffff00;
  color: #000;
  border-color: #ffff00;
}

.coronal-btn.active {
  background-color: #ff0000;
  color: #fff;
  border-color: #ff0000;
}

.sagittal-btn.active {
  background-color: #00ff00;
  color: #000;
  border-color: #00ff00;
}

/* RESPONSIVE DESIGN - SIGUIENDO EL PATRÓN DE LANDINGPAGE */

/* DESKTOP GRANDE (1200px+) - Layout completo */
@media (min-width: 1200px) {
  .main-container {
    padding: 3px;
    gap: 3px;
  }

  .left-sidebar {
    width: 125px;
  }

  .right-sidebar {
    width: 150px;
  }

  .top-controls {
    padding: 8px 20px;
    gap: 40px;
  }

  .brain-view {
    padding: 25px 20px;
  }

  .brain-image {
    width: 70px;
    height: 70px;
  }

  .tab-header {
    font-size: 1.2rem;
    padding: 12px 20px;
  }

  .section-content {
    min-height: 100px;
    font-size: 12px;
  }
}

/* TABLET HORIZONTAL (768px - 1199px) - Layout adaptado */
@media (min-width: 768px) and (max-width: 1199px) {
  .main-container {
    padding: 2px;
    gap: 2px;
  }

  .left-sidebar {
    width: 120px;
  }

  .right-sidebar {
    width: 245px;
  }

  .top-controls {
    padding: 5px 15px;
    gap: 25px;
  }

  .top-right-labels {
    gap: 20px;
  }

  .brain-view {
    padding: 18px 15px;
  }

  .brain-image {
    width: 75px;
    height: 75px;
  }

  .brain-label {
    font-size: 13px;
  }

  .tab-header {
    font-size: 1rem;
    padding: 8px 15px;
    gap: 8px;
  }

  .section-content {
    min-height: 70px;
    font-size: 12px;
    padding: 12px;
  }

  .modality-select {
    min-width: 100px;
    font-size: 13px;
    padding: 6px 12px;
  }

  .icon-item {
    padding: 6px 8px;
  }

  .icon-item span {
    font-size: 9px;
  }

  /* Responsivo mejorado para 4 vistas - NUEVO DE LUIS */
  .four-views-grid {
    gap: 6px;
    min-height: 450px;
  }

  .view-header {
    padding: 3px 6px;
    min-height: 26px;
  }

  .view-title {
    font-size: 10px;
  }

  .view-info {
    font-size: 9px;
  }

  .canvas-container {
    min-height: 180px;
    padding: 1px;
  }

  .quadrant-canvas {
    width: 260px;
    height: 200px;
  }
}

/* MÓVIL Y TABLET VERTICAL (max-width: 768px) - Layout en columna */
@media (max-width: 768px) {
  .tab-content {
    aspect-ratio: 1/2;
  }

  .diagnostic-panel {
    height: auto;
    min-height: 100vh;
  }

  .header {
    padding: 10px 15px;
    height: 50px;
  }

  .logo-image {
    height: 35px;
  }

  .user-icon {
    width: 32px;
    height: 32px;
  }

  .main-container {
    display: flex;
    width: 100%;
  }

  /* Sidebars se convierten en secciones horizontales */
  .left-sidebar {
    width: 100%;
    height: auto;
    margin: 2px 0;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    min-height: 120px;
    order: 1;
  }

  .center-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .right-sidebar {
    width: 100%;
    height: auto;
    margin: 2px 0;
    min-height: 200px;
    order: 3;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;
    padding: 10px;
  }

  /* Brain views en fila horizontal */
  .brain-view {
    padding: 15px 12px;
    min-width: 100px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }

  .brain-view:first-child {
    padding-top: 15px;
  }

  .brain-image {
    width: 65px;
    height: 65px;
    margin-bottom: 8px;
  }

  .brain-label {
    font-size: 12px;
  }

  /* Panel de información responsivo - NUEVO DE LUIS */
  .view-info-panel {
    margin: 6px 0;
    padding: 6px;
    max-height: 200px;
    /* Altura máxima reducida en mobile */
    overflow-y: auto;
  }

  .info-section {
    flex-direction: column;
    /* Mantener vertical en mobile para mejor legibilidad */
    gap: 3px;
  }

  .info-item {
    flex-direction: row;
    /* Mantener horizontal */
    justify-content: space-between;
    min-height: 16px;
    padding: 1px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    border-right: none;
  }

  .info-label {
    font-size: 8px;
    width: 50px;
    /* Ancho más pequeño en mobile */
  }

  .info-value {
    font-size: 8px;
    padding: 1px 4px;
    max-width: 100px;
  }

  .info-item:last-child {
    border-right: none;
  }

  .info-label {
    font-size: 10px;
    margin-bottom: 2px;
  }

  .info-value {
    font-size: 11px;
    padding: 1px 6px;
  }

  /* Sidebar derecho en grid */
  .sidebar-section {
    border: 1px solid #404040;
    border-radius: 8px;
    margin: 0;
  }

  .sidebar-section:first-child {
    padding-top: 0;
  }

  .section-header {
    font-size: 12px;
    padding: 8px 12px;
  }

  .section-body {
    padding: 10px;
  }

  .section-content {
    min-height: 50px;
    font-size: 10px;
    padding: 8px;
  }

  /* Controles superiores */
  .top-controls {
    padding: 4px 10px;
    gap: 15px;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .top-right-labels {
    gap: 12px;
  }

  .modality-select {
    min-width: 80px;
    font-size: 12px;
    padding: 5px 10px;
  }

  /* Pestañas */
  .tab-header {
    font-size: 0.9rem;
    padding: 6px 12px;
    gap: 6px;
  }

  /* Doble vista en columna */
  .double-view {
    grid-template-columns: 1fr;
    gap: 1px;
    padding: 1px;
  }

  .view-header {
    padding: 3px 8px;
    font-size: 10px;
  }

  /* Navigation label */
  .navigation-label {
    height: 50px;
    font-size: 13px;
  }

  /* Bottom section */
  .bottom-section {
    padding: 10px 15px;
  }

  .bottom-content {
    padding-top: 3px;
    padding-bottom: 40px;
  }

  .diagnosis-section {
    min-height: 80px;
    font-size: 13px;
    padding: 10px;
  }

  /* Responsive para 4 vistas - NUEVO DE LUIS */
  .four-views-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 1fr);
    gap: 4px;
    min-height: 600px;
  }

  .four-views-mode {
    padding: 3px;
  }

  .canvas-container {
    min-height: 140px;
    padding: 1px;
  }

  .quadrant-canvas {
    width: 100%;
    height: auto;
    max-width: 320px;
    max-height: 140px;
  }
}

/* MÓVIL PEQUEÑO (max-width: 480px) - Ultra compacto */
@media (max-width: 480px) {
  .header {
    padding: 8px 12px;
    height: 45px;
  }

  .logo-image {
    height: 30px;
  }

  .user-icon {
    width: 28px;
    height: 28px;
  }

  .header-right {
    gap: 8px;
  }

  .main-container {
    padding: 1px;
    gap: 1px;
  }

  /* Sidebars ultra compactos */
  .left-sidebar {
    min-height: 100px;
    padding: 5px;
  }

  .right-sidebar {
    min-height: 150px;
    padding: 5px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  /* Brain views mínimos */
  .brain-view {
    padding: 10px 8px;
    min-width: 80px;
  }

  .brain-image {
    width: 50px;
    height: 50px;
    margin-bottom: 5px;
  }

  .brain-label {
    font-size: 10px;
  }

  /* Sidebar derecho en columna */
  .sidebar-section {
    border: 1px solid #404040;
    border-radius: 6px;
    margin: 0;
  }

  .section-body {
    padding: 8px;
  }

  .section-content {
    min-height: 40px;
    font-size: 9px;
    padding: 6px;
  }

  /* Controles reorganizados */
  .top-controls {
    padding: 3px 8px;
    gap: 8px;
    flex-direction: column;
    align-items: stretch;
  }

  .top-right-labels {
    gap: 5px;
    order: 2;
    justify-content: space-around;
  }

  .modality-select {
    order: 1;
    width: 100%;
    font-size: 11px;
    padding: 4px 8px;
    margin-bottom: 5px;
  }

  .expand-center-btn {
    order: 3;
    align-self: center;
    padding: 4px 8px;
  }

  .expand-center-btn span {
    font-size: 8px;
  }

  .icon-item {
    padding: 3px 4px;
  }

  .icon-item span {
    font-size: 7px;
  }

  /* Pestañas ultra compactas */
  .tab-header {
    font-size: 0.8rem;
    padding: 4px 6px;
    gap: 3px;
  }

  /* Centro ajustado */
  .center-area {
    height: 60vh;
    min-height: 400px;
  }

  /* Upload minimalista */
  .upload-prompt h3 {
    font-size: 1.2rem;
    margin-bottom: 8px;
  }

  .upload-prompt p {
    font-size: 0.9rem;
    margin-bottom: 5px;
  }

  /* Leyenda de colores compacta */
  .color-legend {
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .legend-item {
    gap: 3px;
    font-size: 8px;
  }

  .color-box {
    width: 15px;
    height: 8px;
  }

  /* Footer compacto */
  .footer {
    background: #2b2b2b;
    text-align: center;
    padding: 12px;
    color: #cccccc;
    border-top: 1px solid #404040;
  }

  /* Navigation compacta */
  .navigation-label {
    height: 40px;
    font-size: 12px;
  }

  /* Bottom section compacta */
  .bottom-section {
    padding: 8px 10px;
  }

  .diagnosis-section {
    min-height: 60px;
    font-size: 11px;
    padding: 8px;
  }
}

/* ORIENTACIÓN LANDSCAPE EN MÓVILES - SIGUIENDO PATRÓN LANDINGPAGE */
@media (max-width: 768px) and (orientation: landscape) {
  .main-container {
    flex-direction: row;
    height: calc(100vh - 90px);
    gap: 2px;
    padding: 2px;
  }

  .left-sidebar {
    width: 25%;
    height: 100%;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    order: 1;
    min-height: auto;
  }

  .center-area {
    width: 50%;
    height: 100%;
    order: 2;
  }

  .right-sidebar {
    width: 25%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    order: 3;
    min-height: auto;
  }

  .brain-view {
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: auto;
  }

  .brain-view:first-child {
    padding-top: 40px;
  }

  .brain-image {
    width: 50px;
    height: 50px;
  }

  .brain-label {
    font-size: 10px;
  }

  /* Sidebar derecho vuelve a columna */
  .right-sidebar {
    grid-template-columns: none;
    gap: 5px;
    padding: 8px;
  }

  .section-header {
    font-size: 10px;
    padding: 6px 8px;
  }

  .section-content {
    min-height: 35px;
    font-size: 8px;
    padding: 5px;
  }
}

/* SCROLL OPTIMIZADO PARA MÓVILES - PATRÓN LANDINGPAGE ------------------------------------------*/
@media (max-width: 768px) {

  /* Layout general */
  .main-container {
    flex-direction: column;
    margin-top: 100px;
    padding: 0;
  }

  .right-sidebar-toggle-btn {
    display: none !important;
  }

  .sidebar-toggle-btn {
    display: none !important;
  }

  .left-sidebar,
  .right-sidebar {
    display: block !important;
  }

  .left-sidebar.collapsed,
  .right-sidebar.collapsed {
    display: none !important;
  }

  .section-content[data-v-ed7dad95] {
    font-size: 12px;
  }

  .tab-content {
    aspect-ratio: 1 / 1.5;
    flex: 1;
    background: #1a1a1a;
    position: relative;
    overflow: hidden;
    transition: aspect-ratio 0.3s ease;
  }

  .center-area {
    margin: 0 10px;
  }

  /* Tabs */
  .tab-headers {
    flex-wrap: wrap;
    height: auto;
  }

  .tab-header {
    font-size: 0.8rem;
    padding: 6px 10px;
    height: auto;
  }

  /* Doble vista se convierte en columna */
  .double-view {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .view-header {
    font-size: 12px;
    gap: 10px;
  }

  /* Bottom section */
  .bottom-section {
    padding: 20px;
  }

  .bottom-section.collapsed {
    height: 60px;
    padding: 2px 10px;
  }

  .bottom-toggle-btn {
    top: 3px;
    width: 20px;
    height: 20px;
    font-size: 8px;
  }

  .bottom-content {
    padding-top: 3px;
    padding-bottom: 5px;
  }

  .color-legend {
    flex-wrap: wrap;
    gap: 5px;
  }

  .legend-item {
    font-size: 10px;
  }

  /* Inputs y selects */
  .modality-select {
    font-size: 12px;
    padding: 6px 10px;
  }

  .expand-center-btn {
    padding: 6px 10px;
  }

  .expand-center-btn span {
    font-size: 9px;
  }

  /* Imagen */
  .image-container {
    gap: 10px;
    padding: 10px;
  }

  .upload-prompt i {
    font-size: 3rem;
  }

  /* Diagnóstico */
  .diagnosis-section {
    font-size: 13px;
    padding: 10px;
  }

  /* Footer */
  .footer {
    font-size: 12px;
    padding: 10px;
  }
}

/* UTILIDADES RESPONSIVAS - PATRÓN LANDINGPAGE */
.hidden-mobile {
  display: block;
}

.visible-mobile {
  display: none;
}

@media (max-width: 768px) {
  .hidden-mobile {
    display: none;
  }

  .visible-mobile {
    display: block;
  }
}

/* OPTIMIZACIONES ADICIONALES PARA MÓVILES */
@media (max-width: 768px) {

  /* Mejorar interactividad táctil */
  .brain-view,
  .icon-item,
  .tab-header,
  .sidebar-toggle-btn,
  .right-sidebar-toggle-btn,
  .bottom-toggle-btn,
  .expand-center-btn {
    touch-action: manipulation;
    -webkit-tap-highlight-color: rgba(220, 53, 69, 0.2);
  }

  /* Aumentar áreas de toque mínimas */
  .sidebar-toggle-btn,
  .right-sidebar-toggle-btn,
  .bottom-toggle-btn {
    min-width: 44px;
    min-height: 44px;
  }

  /* Mejorar legibilidad en pantallas pequeñas */
  .medical-tabs {
    font-size: 14px;
  }

  .tab-content {
    flex: 1;
    min-width: 0;
  }

  /* Optimizar espaciado para dedos */
  .brain-view {
    margin: 2px;
  }

  .icon-item {
    margin: 1px;
  }
}

/* MODO OSCURO OPTIMIZADO - SIGUIENDO PATRÓN LANDINGPAGE */
@media (prefers-color-scheme: dark) {
  .diagnostic-panel {
    background: #000000;
  }

  .header {
    background: #000000;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .left-sidebar,
  .right-sidebar,
  .center-area {
    background: #202020;
    border-color: #212121;
  }

  .top-controls,
  .bottom-section,
  .navigation-label {
    background: #2b2b2b;
    border-color: #404040;
  }
}

/* ALTO CONTRASTE PARA ACCESIBILIDAD */
@media (prefers-contrast: high) {
  .diagnostic-panel {
    background: #000000;
    color: #ffffff;
  }

  .left-sidebar,
  .right-sidebar,
  .center-area {
    border-width: 3px;
    border-color: #ffffff;
  }

  .tab-header.active {
    background: #ffffff;
    color: #000000;
  }

  .brain-view.active {
    background: #ffffff;
    color: #000000;
  }

  .btn {
    border: 2px solid #ffffff;
  }
}

/* REDUCIR ANIMACIONES PARA USUARIOS SENSIBLES */
@media (prefers-reduced-motion: reduce) {

  .diagnostic-panel *,
  .diagnostic-panel *::before,
  .diagnostic-panel *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .scan-overlay.scanning {
    animation: none;
  }

  .ai-loading {
    animation: none;
  }

  .indicator {
    animation: none;
  }
}

/* IMPRESIÓN - OPTIMIZADO PARA REPORTES MÉDICOS */
@media print {
  .diagnostic-panel {
    background: white !important;
    color: black !important;
  }

  .header,
  .footer,
  .top-controls,
  .sidebar-toggle-btn,
  .right-sidebar-toggle-btn,
  .bottom-toggle-btn,
  .expand-center-btn {
    display: none !important;
  }

  .main-container {
    flex-direction: column;
    height: auto;
    padding: 0;
    gap: 20px;
  }

  .left-sidebar,
  .right-sidebar,
  .center-area {
    width: 100% !important;
    height: auto !important;
    background: white !important;
    border: 1px solid black !important;
    margin: 10px 0;
  }

  .tab-content {
    page-break-inside: avoid;
  }

  .diagnosis-section {
    background: white !important;
    border: 1px solid black !important;
    color: black !important;
  }
}

/* PANTALLAS DE ALTA DENSIDAD (RETINA) */
@media (-webkit-min-device-pixel-ratio: 2),
(min-resolution: 192dpi) {

  .logo-image,
  .brain-image {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }

  .sidebar-toggle-btn,
  .right-sidebar-toggle-btn,
  .bottom-toggle-btn {
    border-width: 1px;
  }
}

/* OPTIMIZACIONES PARA RENDIMIENTO EN MÓVILES */
@media (max-width: 768px) {
  .diagnostic-panel {
    /* Optimizar compositing */
    will-change: scroll-position;
    transform: translateZ(0);
  }

  .left-sidebar,
  .right-sidebar {
    /* Optimizar scroll */
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .tab-content {
    /* Optimizar contenido de pestañas */
    contain: layout style paint;
  }

  .brain-image {
    /* Optimizar imágenes */
    will-change: transform;
  }
}

/* ========================================
   ESTILOS DEL MODAL - IMPORTAR IMAGEN MÉDICA
   ======================================== */

/* Overlay del modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/* Contenedor principal del modal */
.modal-container {
  background: #2b2b2b;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Header del modal */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 0 24px;
  margin-bottom: 24px;
}

.modal-title {
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.modal-subtitle {
  color: #cccccc;
  font-size: 14px;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

/* Indicadores de pasos */
.step-indicator-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
  padding: 0 24px;
}

.step-separator {
  width: 40px;
  height: 2px;
  background: #404040;
  border-radius: 1px;
}

/* Contenido del modal */
.modal-content {
  padding: 0 24px;
  margin-bottom: 24px;
}

.modal-step {
  animation: stepFadeIn 0.4s ease-out;
}

@keyframes stepFadeIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.step-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px 0;
  text-align: center;
}

/* PASO 1: Selección de archivo */
.step-content {
  text-align: center;
  margin-bottom: 24px;
}

.file-selected {
  background: rgba(221, 22, 22, 0.438);
  border: 1px solid rgba(223, 22, 22, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.file-selected-text {
  color: #ffffff;
  font-weight: 600;
  margin: 0;
}

.file-selected-name {
  color: #cccccc;
  font-size: 14px;
  margin: 0;
}

.select-file-btn {
  background: #c6202a;
  color: #ffffff;
  border: 1px solid #c6202a;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-file-btn:hover {
  background: #ca2d2d;
  border-color: #c52e2e;
  transform: translateY(-1px);
}

/* Progreso de carga */
.upload-progress {
  margin-top: 16px;
  padding: 16px;
  background: rgba(221, 22, 22, 0.438);
  border-radius: 8px;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  color: #ffffff;
  font-size: 14px;
  margin-bottom: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #404040;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #e24a4a, #fc0303);
  border-radius: 3px;
  animation: progressSlide 2s ease-in-out;
}

/* Estilos para el progreso del Web Worker */
.worker-progress {
  margin-top: 16px;
  padding: 16px;
  background: rgba(34, 139, 34, 0.2);
  border: 1px solid rgba(34, 139, 34, 0.3);
  border-radius: 8px;
}

.worker-progress .progress-fill {
  background: linear-gradient(90deg, #22c55e, #16a34a);
  transition: width 0.3s ease;
}

.worker-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #22c55e;
  font-size: 12px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Estilos para el botón de prueba del Worker */
.test-worker-btn {
  margin-top: 8px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.test-worker-btn:hover {
  background: linear-gradient(135deg, #16a34a, #15803d);
  transform: translateY(-1px);
}

.worker-status-mini {
  margin-top: 8px;
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 4px;
  text-align: center;
}

.worker-status-mini:contains("procesando") {
  background: rgba(34, 139, 34, 0.2);
  color: #22c55e;
}

.worker-status-mini:contains("no disponible") {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

@keyframes progressSlide {
  from {
    width: 0%;
  }

  to {
    width: 100%;
  }
}

/* Sección de formatos */
.formats-section {
  margin-bottom: 24px;
}

.formats-title {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.format-badge {
  display: inline-block;
  background: #404040;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
}

/* Lista de archivos */
.files-section {
  margin-bottom: 24px;
}

.files-title {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.files-count {
  color: #cccccc;
  font-size: 14px;
  margin: 0 0 16px 0;
}

.file-item {
  background: #404040;
  border: 1px solid #666666;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.file-icon {
  font-size: 20px;
}

.file-details {
  flex: 1;
}

.file-name {
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #cccccc;
}

.file-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ffffff;
}

.file-actions {
  display: flex;
  gap: 8px;
}

.file-action-btn {
  background: none;
  border: none;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn {
  color: #e42424;
}

.view-btn:hover {
  color: #6ba3f0;
  background: rgba(74, 144, 226, 0.1);
}

.delete-btn {
  color: #dc3545;
}

.delete-btn:hover {
  color: #ff6b7a;
  background: rgba(220, 53, 69, 0.1);
}

/* Datos del paciente */
.patient-data-section {
  background: #404040;
  border-radius: 8px;
  padding: 16px;
}

.patient-data-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.patient-checkbox {
  accent-color: #c73933;
  width: 16px;
  height: 16px;
}

.patient-label {
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.patient-form {
  animation: formSlideDown 0.3s ease-out;
}

@keyframes formSlideDown {
  from {
    opacity: 0;
    max-height: 0;
  }

  to {
    opacity: 1;
    max-height: 400px;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field-full {
  display: flex;
  flex-direction: column;
}


.field-label {
  color: #ffffff;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
}

.field-input,
.field-select,
.field-textarea {
  background: #2b2b2b;
  border: 1px solid #666666;
  border-radius: 6px;
  padding: 10px;
  color: #ffffff;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.field-input:focus,
.field-select:focus,
.field-textarea:focus {
  outline: none;
  border-color: #c73933;
}

.field-textarea {
  height: 80px;
  resize: vertical;
  font-family: inherit;
}

/* PASO 2: Validación */
.loading-state {
  text-align: center;
  padding: 40px 0;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #cf3d3d;
  border-top: 4px solid #ff0019;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.loading-text {
  color: #ffffff;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.loading-subtext {
  color: #cccccc;
  font-size: 14px;
  margin: 0;
}

.validation-success {
  text-align: center;
  padding: 24px;
  background: rgba(221, 22, 22, 0.438);
  border-radius: 8px;
  margin-bottom: 24px;
}

.success-text {
  color: #ffffff;
  font-weight: 600;
  margin: 8px 0 4px 0;
}

.success-filename {
  color: #cccccc;
  font-size: 14px;
  margin: 0;
}

.file-details-section {
  margin-bottom: 24px;
}

.details-title {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.details-grid {
  background: #404040;
  border-radius: 8px;
  padding: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #666666;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-value {
  color: #ffffff;
  font-weight: 600;
}

.detail-value.success {
  color: #ffffff;
}

.detail-value.primary {
  color: #ffffff;
}

.patient-summary {
  background: rgba(236, 16, 16, 0.39);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.summary-title {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 14px;
  color: #cccccc;
}

.summary-full {
  grid-column: span 2;
}

/* PASO 3: Confirmación */
.confirmation-alert {
  text-align: center;
  padding: 24px;
  background: rgba(218, 13, 13, 0.438);
  border-radius: 8px;
  margin-bottom: 24px;
}

.confirmation-text {
  color: #ffffff;
  font-weight: 600;
  margin: 8px 0 0 0;
}

.processing-summary {
  margin-bottom: 24px;
}

.summary-details {
  background: #404040;
  border-radius: 8px;
  padding: 16px;
}

.warning-notice {
  background: rgba(219, 3, 3, 0.466);
  border: 1px solid rgba(247, 0, 0, 0.473);
  border-radius: 8px;
  padding: 16px;
}

.warning-text {
  color: #ffffff;
  font-size: 14px;
  margin: 0;
}

/* Botones del modal */
.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-top: 1px solid #404040;
  background: rgba(43, 43, 43, 0.8);
  backdrop-filter: blur(10px);
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  background: none;
  border: none;
  color: #cccccc;
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease;
}

.btn-cancel:hover {
  color: #ffffff;
}

.btn-back {
  background: #404040;
  color: #ffffff;
  border: 1px solid #666666;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-find {
  background: #404040;
  cursor: pointer;
  border: 1px solid #666666;
  border-radius: 6px;
  padding: 10px;
  color: #ffffff;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.btn-back:hover {
  background: #505050;
  border-color: #777777;
}

.btn-primary {
  background: #c6202a;
  color: #ffffff;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.btn-primary:hover:not(:disabled) {
  background: #c6202a;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #404040;
  color: #666666;
  cursor: not-allowed;
}

.btn-confirm {
  background: #c6202a;
  color: #ffffff;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm:hover {
  background: #c72031;
  transform: translateY(-1px);
}

.bottom-separator {
  padding: 12px 0;
  border-bottom: 1px solid #666666;
}

.top-separator-without-margin {
  width: 100%;
  padding: 12px 0;
  border-top: 1px solid #666666;
}

.field-input:disabled,
.field-select:disabled,
.field-textarea:disabled,
.btn-find:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #3a3a3a;
  /* gris oscuro */
  color: #ccc;
}



/* Responsive para el modal */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-container {
    max-height: 95vh;
  }

  .step-indicator-container {
    gap: 12px;
  }

  .step-separator {
    width: 24px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .modal-header {
    padding: 16px 16px 0 16px;
  }

  .modal-content {
    padding: 0 16px;
  }

  .modal-actions {
    padding: 16px;
  }

  .step-indicator-container {
    padding: 0 16px;
  }
}

/* Estilos para los indicadores de paso */
.step-indicator-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.step-number.step-active {
  background-color: #c6202a;
  color: #ffffff;
}

.step-number.step-completed {
  background-color: #c6202a;
  color: #ffffff;
}

.step-number.step-inactive {
  background-color: #404040;
  color: #cccccc;
}

.step-label {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  transition: color 0.3s ease;
  color: #cccccc;
}

.step-label.label-active {
  color: #e63636;
}

/* Estilo para la imagen de preview */
.medical-preview-image {
  max-width: 80%;
  max-height: 200px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  margin: 15px 0;
  object-fit: contain;
  background-color: #333;
  border: 2px solid #555;
  transition: all 0.3s ease;
}

.medical-preview-image:hover {
  transform: scale(1.02);
  border-color: #c6202a;
  box-shadow: 0 6px 20px rgba(220, 53, 69, 0.2);
}

/* Responsive para la imagen */
@media (max-width: 768px) {
  .medical-preview-image {
    max-width: 90%;
    max-height: 150px;
  }
}

/* ========================================
   OPTIMIZACIONES DE ESPACIO RESPONSIVAS
   ======================================== */

/* Pantallas grandes (>1920px) - Modo Ultra Maximizado */
@media (min-width: 1921px) {

  .main-canvas.maximized-canvas,
  .three-canvas.maximized-canvas {
    width: 1600px !important;
    height: 900px !important;
    max-width: 1600px !important;
    max-height: 900px !important;
  }

  .four-views-mode.expanded-mode .view-quadrant {
    height: 100% !important;
    /* En pantallas grandes, seguir llenando la celda del grid */
    width: 100% !important;
    /* Llenar completamente la celda del grid */
  }

  .four-views-mode.expanded-mode .four-views-grid {
    gap: 8px;
    /* Gap más conservador para mejor ajuste */
    padding: 8px;
    /* Padding más conservador */
  }
}

/* Pantallas medianas (1366px-1920px) - Modo Estándar Optimizado */
@media (min-width: 1366px) and (max-width: 1920px) {

  .main-canvas.maximized-canvas,
  .three-canvas.maximized-canvas {
    width: 1400px !important;
    height: 800px !important;
    max-width: 1400px !important;
    max-height: 800px !important;
  }

  .four-views-mode.expanded-mode .quadrant-canvas {
    width: auto !important;
    /* Ancho automático para respetar proporciones */
    height: auto !important;
    /* Altura automática para respetar proporciones */
    min-width: 300px !important;
    /* Tamaño mínimo */
    min-height: 200px !important;
    /* Altura mínima */
    max-width: calc(100% - 8px) !important;
    /* Máximo ancho respetando padding */
    max-height: calc(100% - 40px) !important;
    /* Máximo altura respetando header */
    object-fit: contain !important;
    /* Mantener proporciones */
    margin: 4px auto !important;
    /* Centrado con margen seguro */
  }
}

/* Pantallas pequeñas (1024px-1365px) - Modo Compacto */
@media (min-width: 1024px) and (max-width: 1365px) {

  .main-canvas.maximized-canvas,
  .three-canvas.maximized-canvas {
    width: 1200px !important;
    height: 700px !important;
    max-width: 1200px !important;
    max-height: 700px !important;
  }

  .four-views-mode.expanded-mode .quadrant-canvas {
    width: auto !important;
    /* Ancho automático para respetar proporciones */
    height: auto !important;
    /* Altura automática para respetar proporciones */
    min-width: 250px !important;
    /* Tamaño mínimo para pantallas más pequeñas */
    min-height: 180px !important;
    /* Altura mínima para pantallas más pequeñas */
    max-width: calc(100% - 8px) !important;
    /* Máximo ancho respetando padding */
    max-height: calc(100% - 40px) !important;
    /* Máximo altura respetando header */
    object-fit: contain !important;
    /* Mantener proporciones */
    margin: 4px auto !important;
    /* Centrado con margen seguro */
  }

  .space-optimization-indicator {
    font-size: 10px;
    top: 5px;
    right: 10px;
  }
}

/* ===== ESTILOS PARA CONTROLES DE ZOOM ADAPTATIVO ===== */
.zoom-adaptive-controls {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
}

.zoom-adaptive-controls .control-subheader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: #a855f7;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(168, 85, 247, 0.2);
}

.zoom-controls-content {
  margin-top: 8px;
}

.zoom-controls-content .control-group {
  margin-bottom: 8px;
}

.zoom-info {
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 8px;
  border-radius: 4px;
  margin-top: 8px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: #a855f7;
}

.checkbox-inline {
  margin: 0;
  transform: scale(0.9);
}

/* Mejoras para control-group en contexto de zoom */
.zoom-adaptive-controls .control-group {
  background: rgba(255, 255, 255, 0.03);
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.zoom-adaptive-controls .control-label {
  font-size: 11px;
  color: #e2e8f0;
}

.zoom-adaptive-controls .control-slider {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.zoom-adaptive-controls .control-slider::-webkit-slider-thumb {
  background: #a855f7;
}

.zoom-adaptive-controls .control-slider::-moz-range-thumb {
  background: #a855f7;
}

/* ==========================================
   PANEL LATERAL DE CONTROLES 3D (MODO MAXIMIZADO)
   ========================================== */

.controls-3d-sidebar {
  position: fixed;
  top: 80px;
  right: 0;
  width: 300px;
  height: calc(100vh - 80px);
  background: rgba(13, 13, 13, 0.95);
  backdrop-filter: blur(10px);
  border-left: 1px solid #333;
  z-index: 1000;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #444 #1a1a1a;
}

.controls-3d-sidebar::-webkit-scrollbar {
  width: 6px;
}

.controls-3d-sidebar::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.controls-3d-sidebar::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #333;
  background: rgba(0, 0, 0, 0.5);
  position: relative;
}

.sidebar-header h3 {
  color: #ffffff;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.sidebar-content {
  padding: 20px;
}

.control-group-sidebar {
  margin-bottom: 20px;
}

.control-label-sidebar {
  display: block;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.control-slider-sidebar {
  width: 100%;
  height: 6px;
  background: #333;
  border-radius: 3px;
  outline: none;
  appearance: none;
  margin-bottom: 5px;
}

.control-slider-sidebar::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: #3498db;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(52, 152, 219, 0.4);
}

.control-slider-sidebar::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #3498db;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(52, 152, 219, 0.4);
}

.control-value-sidebar {
  display: inline-block;
  background: #1a1a1a;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  min-width: 50px;
  text-align: center;
}

.color-preset-section-sidebar {
  margin-bottom: 25px;
}

.color-preset-select-sidebar {
  width: 100%;
  background: #1a1a1a;
  color: #ffffff;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  margin-top: 5px;
}

.ai-controls-section-sidebar {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.ai-section-title {
  color: #00ff88;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #00ff88;
}

.ai-label {
  display: flex;
  align-items: center;
  color: #00ff88 !important;
  cursor: pointer;
}

.ai-checkbox {
  margin-right: 10px;
  accent-color: #00ff88;
}

.ai-sub-controls-sidebar {
  margin-left: 20px;
  margin-top: 10px;
  padding-left: 15px;
  border-left: 2px solid #00ff88;
}

.ai-slider::-webkit-slider-thumb {
  background: #00ff88 !important;
  box-shadow: 0 2px 6px rgba(0, 255, 136, 0.4) !important;
}

.ai-slider::-moz-range-thumb {
  background: #00ff88 !important;
  box-shadow: 0 2px 6px rgba(0, 255, 136, 0.4) !important;
}

.ai-value {
  background: #0a4d2a !important;
  color: #00ff88 !important;
}

.ai-action-buttons-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}

.ai-action-btn-sidebar {
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-analyze-btn {
  background: #00ff88;
  color: #000;
}

.ai-analyze-btn:hover {
  background: #00cc6a;
}

.ai-enhance-btn {
  background: #3498db;
  color: #fff;
}

.ai-enhance-btn:hover {
  background: #2980b9;
}

.ai-action-btn-sidebar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.performance-info-sidebar {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.performance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.performance-label {
  color: #999;
}

.performance-value {
  color: #ffffff;
  font-weight: 500;
}

/* Estilos para el panel de filtros AI flotante */
.ai-filter-panel {
  position: fixed;
  top: 80px;
  left: -400px;
  width: 380px;
  height: calc(100vh - 100px);
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border: 1px solid #333;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  transition: left 0.3s ease;
  overflow-y: auto;
}

.ai-filter-panel.panel-visible {
  left: 20px;
}

.ai-filter-panel .panel-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ai-filter-panel .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
}

.ai-filter-panel .panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #00ff88;
  font-size: 16px;
  font-weight: bold;
}

.ai-filter-panel .panel-close-btn {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.ai-filter-panel .panel-close-btn:hover {
  background: #333;
  color: #fff;
}

.ai-filter-panel .panel-info {
  background: #0a4d2a;
  color: #00ff88;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 20px;
  text-align: center;
}

.ai-filter-panel .filters-container {
  flex: 1;
  overflow-y: auto;
}

.ai-filter-panel .filter-section {
  margin-bottom: 20px;
  background: #2a2a3e;
  border-radius: 6px;
  overflow: hidden;
}

.ai-filter-panel .filter-header {
  background: #333;
  padding: 12px;
}

.ai-filter-panel .filter-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-weight: 500;
  cursor: pointer;
}

.ai-filter-panel .filter-toggle input[type="checkbox"] {
  margin: 0;
}

.ai-filter-panel .filter-icon {
  font-size: 16px;
}

.ai-filter-panel .filter-name {
  flex: 1;
}

.ai-filter-panel .filter-controls {
  padding: 15px;
  background: #1e1e2e;
}

.ai-filter-panel .control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ai-filter-panel .control-row:last-child {
  margin-bottom: 0;
}

.ai-filter-panel .control-row label {
  color: #ccc;
  font-size: 13px;
  min-width: 80px;
}

.ai-filter-panel .control-row input[type="range"] {
  flex: 1;
  margin: 0 10px;
  accent-color: #00ff88;
}

.ai-filter-panel .control-value {
  color: #00ff88;
  font-weight: bold;
  min-width: 40px;
  text-align: right;
  font-size: 13px;
}

.ai-filter-panel .panel-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.ai-filter-panel .action-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.ai-filter-panel .reset-btn {
  background: #e74c3c;
  color: #fff;
}

.ai-filter-panel .reset-btn:hover:not(:disabled) {
  background: #c0392b;
}

.ai-filter-panel .restore-btn {
  background: #3498db;
  color: #fff;
}

.ai-filter-panel .restore-btn:hover:not(:disabled) {
  background: #2980b9;
}

.ai-filter-panel .save-btn {
  background: #27ae60;
  color: #fff;
}

.ai-filter-panel .save-btn:hover:not(:disabled) {
  background: #229954;
}

.ai-filter-panel .action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-filter-panel .processing-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #ff9500;
  font-size: 13px;
  padding: 10px;
}

.ai-filter-panel .status-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid #ff9500;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  handleFinalConfirm 100% {
    transform: rotate(360deg);
  }
}

/* Richard */
.color-box {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  margin-right: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.legend-item {
  display: flex;
  align-items: center;
  margin: 0 10px;
  font-size: 0.9rem;
}

.main-canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
