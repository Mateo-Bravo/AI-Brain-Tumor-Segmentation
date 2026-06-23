/**
 * @fileoverview Composable para segmentación REAL usando backend FastAPI + nnUNet
 * @module useAISegmentation
 *
 * Responsabilidad:
 * - Ejecutar segmentación en backend (NO WebWorker)
 * - Manejar estados: loading, error, progreso
 * - Devolver resultados listos para el visor
 *
 * Este archivo es el puente entre:
 * Frontend (Vue + Cornerstone) ↔ Backend (FastAPI)
 */

import { ref, computed } from 'vue'
import { useApi } from '@/composables/api/useApi'
import { API_ENDPOINTS } from '@/config/api'

// ==================================================
// 🧠 COMPOSABLE
// ==================================================
export function useAISegmentation() {
  // -----------------------------------------------
  // 🔌 API
  // -----------------------------------------------
  const { request } = useApi()

  // -----------------------------------------------
  // 📊 ESTADO REACTIVO
  // -----------------------------------------------
  const isRunning = ref(false)
  const progress = ref(0)
  const statusMessage = ref('')
  const error = ref(null)
  const result = ref(null)

  // -----------------------------------------------
  // 🧮 COMPUTED
  // -----------------------------------------------
  const hasResult = computed(() => result.value !== null)
  const hasError = computed(() => error.value !== null)

  // -----------------------------------------------
  // 🚀 EJECUTAR SEGMENTACIÓN REAL
  // -----------------------------------------------
  /**
   * Ejecuta la segmentación nnUNet en el backend
   *
   * @param {number} imageId - ID de la imagen ya subida
   * @returns {Promise<Object>} Resultado del diagnóstico
   */
  const runSegmentation = async (imageId) => {
    if (!imageId) {
      throw new Error('imageId es obligatorio para ejecutar la segmentación')
    }

    try {
      // Reset estado
      isRunning.value = true
      progress.value = 0
      statusMessage.value = 'Inicializando segmentación...'
      error.value = null
      result.value = null

      // 👉 Endpoint REAL
      const endpoint = `/diagnosis/run-nnunet/${imageId}`

      statusMessage.value = 'Enviando imagen al backend...'
      progress.value = 10

      // Llamada HTTP
      const response = await request({
        method: 'POST',
        url: endpoint,
      })

      // El backend ya terminó el proceso aquí
      progress.value = 100
      statusMessage.value = 'Segmentación completada'

      // Guardar resultado
      result.value = response

      return response

    } catch (err) {
      console.error('❌ Error en segmentación:', err)

      error.value =
        err?.response?.data?.detail ||
        err?.message ||
        'Error desconocido en segmentación'

      throw err

    } finally {
      isRunning.value = false
    }
  }

  // -----------------------------------------------
  // 🔄 RESET
  // -----------------------------------------------
  const reset = () => {
    isRunning.value = false
    progress.value = 0
    statusMessage.value = ''
    error.value = null
    result.value = null
  }

  // -----------------------------------------------
  // 📤 EXPORT
  // -----------------------------------------------
  return {
    // Estado
    isRunning,
    progress,
    statusMessage,
    error,
    result,

    // Computed
    hasResult,
    hasError,

    // Acciones
    runSegmentation,
    reset,
  }
}
