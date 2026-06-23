<template>
  <div class="visor-container">
    <!-- HEADER -->
    <header class="visor-header">
      <h1>Visor Médico de Imágenes</h1>
      <p>Visualización de imagen original y segmentación automática (nnU-Net)</p>
    </header>

    <!-- ESTADO -->
    <div v-if="loading" class="status loading">
      ⏳ Cargando imágenes médicas...
    </div>

    <div v-else-if="error" class="status error">
      ❌ {{ error }}
    </div>

    <!-- ESTADO IA -->
    <div v-else-if="isRunning" class="status loading">
      🧠 {{ statusMessage }} ({{ progress }}%)
    </div>

    <div v-else-if="segmentationError" class="status error">
      ❌ {{ segmentationError }}
    </div>

    <!-- VISOR -->
    <div v-else class="viewer-grid">
      <!-- Imagen Original -->
      <div class="viewer-card">
        <h3>Imagen Original</h3>
        <img
          v-if="originalImageUrl"
          :src="originalImageUrl"
          alt="Imagen original"
          class="medical-image"
        />
        <p v-else class="text-muted">No disponible</p>
      </div>

      <!-- Imagen Segmentada -->
      <div class="viewer-card">
        <h3>Segmentación (nnU-Net)</h3>
        <img
          v-if="segmentedImageUrl"
          :src="segmentedImageUrl"
          alt="Imagen segmentada"
          class="medical-image"
        />
        <p v-else class="text-muted">No disponible</p>
      </div>
    </div>

    <!-- INFO -->
    <div v-if="diagnosis" class="info-panel">
      <h3>Información del Diagnóstico</h3>
      <ul>
        <li><strong>Modelo:</strong> {{ diagnosis.model }}</li>
        <li><strong>Tiempo de procesamiento:</strong> {{ diagnosis.elapsed_time }} s</li>
        <li><strong>Estado:</strong> {{ diagnosis.estado }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
// ==============================
// IMPORTS
// ==============================
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useAISegmentation } from '@/composables/ai/useAISegmentation'

// ==============================
// ROUTE PARAM
// ==============================
const route = useRoute()
const imageId = route.params.imageId

// ==============================
// STATE
// ==============================
const loading = ref(true)
const error = ref(null)

const originalImageUrl = ref(null)
const segmentedImageUrl = ref(null)
const diagnosis = ref(null)

// ==============================
// IA SEGMENTATION
// ==============================
const {
  runSegmentation,
  isRunning,
  progress,
  statusMessage,
  error: segmentationError
} = useAISegmentation()

// ==============================
// API CONFIG
// ==============================
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

// ==============================
// FETCH DIAGNOSIS
// ==============================
const fetchDiagnosis = async () => {
  loading.value = true
  error.value = null

  try {
    const token = localStorage.getItem('authToken')

    const response = await axios.get(
      `${API_BASE_URL}/diagnosis/view-both/${imageId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const data = response.data

    diagnosis.value = data.diagnosis || null
    originalImageUrl.value = data.original_image_url || null
    segmentedImageUrl.value = data.segmented_image_url || null

  } catch (err) {
    console.error('❌ Error cargando visor:', err)
    error.value =
      err.response?.data?.detail ||
      'No se pudo cargar la información del diagnóstico'
  } finally {
    loading.value = false
  }
}

// ==============================
// EJECUTAR IA SI NO EXISTE
// ==============================
const runAISegmentation = async () => {
  try {
    await runSegmentation(imageId)
    await fetchDiagnosis()
  } catch (err) {
    console.error('❌ Falló la segmentación:', err)
  }
}

// ==============================
// LIFECYCLE
// ==============================
onMounted(async () => {
  if (!imageId) {
    error.value = 'ID de imagen no proporcionado'
    loading.value = false
    return
  }

  // 1️⃣ Intentar cargar resultados existentes
  await fetchDiagnosis()

  // 2️⃣ Si no hay segmentación, ejecutar nnU-Net
  if (!segmentedImageUrl.value) {
    console.log('🧠 No existe segmentación, ejecutando nnU-Net...')
    await runAISegmentation()
  }
})
</script>

<style scoped>
.visor-container {
  min-height: 100vh;
  background: #121212;
  color: #ffffff;
  padding: 30px;
}

.visor-header {
  text-align: center;
  margin-bottom: 30px;
}

.visor-header h1 {
  font-size: 2.5rem;
  color: #c6202a;
}

.visor-header p {
  color: #ccc;
}

.status {
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
}

.status.loading {
  color: #ffc107;
}

.status.error {
  color: #ff6b6b;
}

.viewer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 30px;
}

.viewer-card {
  background: #1f1f1f;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.viewer-card h3 {
  margin-bottom: 15px;
  color: #c6202a;
}

.medical-image {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
  border: 2px solid #444;
  background: #000;
}

.text-muted {
  color: #888;
  font-style: italic;
}

.info-panel {
  margin-top: 40px;
  background: #1f1f1f;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px;
}

.info-panel h3 {
  color: #c6202a;
  margin-bottom: 15px;
}

.info-panel ul {
  list-style: none;
  padding: 0;
}

.info-panel li {
  margin-bottom: 8px;
  color: #ccc;
}
</style>
