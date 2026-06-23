/**
 * @fileoverview Composable base para comunicación con API
 * @module useApi
 * @description Cliente HTTP centralizado con Axios, interceptors y manejo de estado
 */

import { API_ENDPOINTS, apiConfig } from '@/config/api.js'
import axios from 'axios'
import { computed, ref } from 'vue'

// ========================================
// 🔧 CONFIGURACIÓN DE AXIOS
// ========================================

/**
 * Instancia de axios configurada para la API
 */
const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  withCredentials: apiConfig.withCredentials,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// ========================================
// 🔌 INTERCEPTORS
// ========================================

/**
 * Interceptor para requests (antes de enviar)
 */
apiClient.interceptors.request.use(
  (config) => {
    // 🆕 Agregar token automáticamente si existe
    const token = localStorage.getItem('authToken')
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (apiConfig.enableLogging) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data || 'No data',
        headers: config.headers
      })
    }

    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

/**
 * Interceptor para responses (después de recibir)
 */
apiClient.interceptors.response.use(
  (response) => {
    if (apiConfig.enableLogging) {
      console.log(`✅ Response ${response.status}:`, response.data)
    }
    return response
  },
  (error) => {
    if (apiConfig.enableLogging) {
      console.error('❌ API Error:', {
        status: error.response?.status,
        message: error.response?.data?.detail || error.message,
        url: error.config?.url,
        data: error.response?.data // 🆕 Log completo del error
      })
    }

    // 🆕 Manejar token expirado (401)
    if (error.response?.status === 401) {
      const token = localStorage.getItem('authToken')
      if (token) {
        console.warn('⚠️ Token expirado o inválido, limpiando sesión...')
        localStorage.removeItem('authToken')
        localStorage.removeItem('currentUser')
        // Opcional: redirigir a login
        // window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// ========================================
// 📦 COMPOSABLE
// ========================================

/**
 * Composable principal para comunicación con API
 * @returns {Object} Estado y métodos de API
 */
export const useApi = () => {
  // ========================================
  // 📊 ESTADO REACTIVO
  // ========================================

  /**
   * Indica si hay una petición en progreso
   */
  const loading = ref(false)

  /**
   * Error de la última petición
   */
  const error = ref(null)

  /**
   * Datos de la última petición exitosa
   */
  const data = ref(null)

  // ========================================
  // 🔄 COMPUTED PROPERTIES
  // ========================================

  const isLoading = computed(() => loading.value)
  const hasError = computed(() => error.value !== null)
  const isSuccess = computed(() => !loading.value && !error.value && data.value !== null)

  // ========================================
  // 🌐 MÉTODO GENÉRICO DE REQUEST
  // ========================================

  /**
   * Realiza una petición HTTP genérica
   * @param {Object} config - Configuración de Axios
   * @returns {Promise<any>}
   */
  const request = async (config) => {
    loading.value = true
    error.value = null
    data.value = null

    try {
      const response = await apiClient(config)
      data.value = response.data
      return response.data
    } catch (err) {
      error.value = err

      // 🆕 Log más detallado del error
      if (apiConfig.enableLogging) {
        console.error('❌ Request failed:', {
          url: config.url,
          method: config.method,
          error: err.message,
          response: err.response?.data
        })
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  // ========================================
  // 👤 MÉTODOS DE USUARIO
  // ========================================

  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>}
   */
  const registerUser = async (userData) => {
    if (apiConfig.enableLogging) {
      console.log('📝 Registrando usuario:', {
        email: userData.email,
        role: userData.role
      })
    }

    return request({
      method: 'POST',
      url: API_ENDPOINTS.REGISTER,
      data: userData
    })
  }

  /**
   * Verifica si un email ya está registrado
   * @param {string} email - Email a verificar
   * @returns {Promise<Object>}
   */
  const checkEmailExists = async (email) => {
    if (apiConfig.enableLogging) {
      console.log('🔍 Verificando email:', email)
    }

    return request({
      method: 'GET',
      url: `${API_ENDPOINTS.CHECK_EMAIL}/${encodeURIComponent(email)}`
    })
  }

  /**
   * Verifica si un teléfono ya está registrado
   * @param {string} phone - Teléfono a verificar
   * @returns {Promise<Object>}
   */
  const checkPhoneExists = async (phone) => {
    if (apiConfig.enableLogging) {
      console.log('🔍 Verificando teléfono:', phone)
    }

    return request({
      method: 'GET',
      url: `${API_ENDPOINTS.CHECK_PHONE}/${encodeURIComponent(phone)}`
    })
  }

  /**
   * Inicia sesión con credenciales
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>}
   */
  const loginUser = async (credentials) => {
    if (apiConfig.enableLogging) {
      console.log('🔐 Iniciando sesión:', credentials.email)
    }

    const response = await request({
      method: 'POST',
      url: API_ENDPOINTS.LOGIN,
      data: credentials
    })

    // 🆕 Guardar token automáticamente si existe
    if (response.token || response.access_token) {
      const token = response.token || response.access_token
      localStorage.setItem('authToken', token)
      console.log('✅ Token guardado automáticamente')
    }

    return response
  }

  /**
   * Obtiene el perfil del usuario autenticado
   * @param {string} token - Token de autenticación (opcional si ya está en localStorage)
   * @returns {Promise<Object>}
   */
  const getUserProfile = async (token) => {
    const headers = {}

    // Si se pasa token explícito, usarlo; sino, el interceptor lo manejará
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return request({
      method: 'GET',
      url: API_ENDPOINTS.PROFILE,
      headers
    })
  }

  /**
   * Cierra sesión del usuario
   * @returns {Promise<Object>}
   */
  const logoutUser = async () => {
    const response = await request({
      method: 'POST',
      url: API_ENDPOINTS.LOGOUT
    })

    // 🆕 Limpiar localStorage automáticamente
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
    console.log('✅ Sesión cerrada y localStorage limpiado')

    return response
  }

  // ========================================
  // 🔧 MÉTODOS UTILITARIOS
  // ========================================

  /**
   * Limpia el estado del composable
   */
  const clearState = () => {
    loading.value = false
    error.value = null
    data.value = null
  }

  /**
   * Obtiene mensaje de error legible
   * @param {Error} apiError - Error de Axios
   * @returns {string}
   */
  const getErrorMessage = (apiError) => {
    if (!apiError) return 'Error desconocido'

    // Error con detalle del servidor
    if (apiError.response?.data?.detail) {
      return apiError.response.data.detail
    }

    // 🆕 Error con mensaje del servidor
    if (apiError.response?.data?.message) {
      return apiError.response.data.message
    }

    // Errores por código HTTP
    switch (apiError.response?.status) {
      case 400:
        return 'Datos inválidos. Verifique la información.'
      case 401:
        return 'Email o contraseña incorrectos.'
      case 403:
        return 'No tiene permisos para realizar esta acción.'
      case 404:
        return 'Recurso no encontrado.'
      case 409:
        return 'El recurso ya existe.'
      case 422:
        return 'Datos no procesables. Verifique el formato.'
      case 500:
        return 'Error interno del servidor. Intente más tarde.'
      case 502:
        return 'Servidor no disponible. Intente más tarde.'
      case 503:
        return 'Servicio no disponible. Intente más tarde.'
      default:
        break
    }

    // Error de red
    if (apiError.request && !apiError.response) {
      return 'Error de conexión. Verifique que el servidor esté funcionando.'
    }

    // Error de timeout
    if (apiError.code === 'ECONNABORTED') {
      return 'Tiempo de espera agotado. Intente nuevamente.'
    }

    return apiError.message || 'Error inesperado. Intente nuevamente.'
  }

  // 🆕 Verifica si el usuario está autenticado
  const isAuthenticated = () => {
    return !!localStorage.getItem('authToken')
  }

  // 🆕 Obtiene el token actual
  const getToken = () => {
    return localStorage.getItem('authToken')
  }

  // ========================================
  // 📤 RETORNO
  // ========================================

  return {
    // Estado reactivo
    loading: isLoading,
    error,
    data,
    hasError,
    isSuccess,

    // Métodos de API de usuario
    registerUser,
    checkEmailExists,
    checkPhoneExists,
    loginUser,
    getUserProfile,
    logoutUser,

    // Métodos utilitarios
    clearState,
    getErrorMessage,
    request,
    isAuthenticated, // 🆕
    getToken, // 🆕

    // Exposer apiClient para uso avanzado
    apiClient // 🆕 Por si necesitas hacer requests personalizados
  }
}
