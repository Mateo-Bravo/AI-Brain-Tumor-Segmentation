// ==================================================================
// CONFIGURACIÓN DE API - FRONTEND VUE.JS
// ==================================================================
// Este archivo centraliza toda la configuración para la comunicación
// entre el frontend Vue.js y el backend FastAPI.
//
// Funcionalidades:
// - Configuración de Axios para peticiones HTTP
// - URLs base según entorno (desarrollo, staging, producción)
// - Interceptores para manejo de tokens JWT
// - Logging y debugging para desarrollo
// - Manejo centralizado de errores
// ==================================================================

// ===== IMPORTACIONES =====
import axios from 'axios'  // Cliente HTTP para Vue.js

/**
 * Obtiene la configuración de API según el entorno actual
 * @returns {Object} Configuración con baseURL, timeout y otras opciones
 */
const getApiConfig = () => {
  const env = import.meta.env.MODE || 'development'

  const configs = {
    development: {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
      timeout: 10000,
      withCredentials: false,
      enableLogging: true
    },
    staging: {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api-staging.tu-dominio.com/api',
      timeout: 15000,
      withCredentials: true,
      enableLogging: false
    },
    production: {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.tu-dominio.com/api',
      timeout: 15000,
      withCredentials: true,
      enableLogging: false
    }
  }

  const config = configs[env] || configs.development

  if (env === 'development') {
    console.log('🔧 API Config:', {
      environment: env,
      baseURL: config.baseURL,
      timeout: config.timeout
    })
  }

  return config
}

export const apiConfig = getApiConfig()

// ==================================================================
// AXIOS INSTANCE
// ==================================================================
const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
})

// ==================================================================
// INTERCEPTORS
// ==================================================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (apiConfig.enableLogging) {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        fullURL: `${config.baseURL}${config.url}`
      })
    }

    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    if (apiConfig.enableLogging) {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      })
    }
    return response
  },
  (error) => {
    if (apiConfig.enableLogging) {
      console.error('❌ API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data
      })
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

// ==================================================================
// EXPORT DEFAULT
// ==================================================================
export default api

// ==================================================================
// ENDPOINTS (ALINEADOS AL BACKEND REAL)
// ==================================================================
export const API_ENDPOINTS = {
  // 👤 Usuarios
  REGISTER: '/users/register/',
  LOGIN: '/users/login/',
  CHECK_EMAIL: '/users/check-email',
  CHECK_PHONE: '/users/check-phone',
  PROFILE: '/users/me/',
  LOGOUT: '/users/logout/',
  VERIFY_TOKEN: '/users/verify-token/',

  // 🖼 Imágenes
  UPLOAD_IMAGE: '/images/upload/',
  GET_IMAGES: '/images/',

  // 🧠 Diagnóstico / IA
  RUN_NNUNET: '/diagnosis/run-nnunet/', // + image_id
  GET_DIAGNOSIS: '/diagnosis/',
  VIEW_BOTH: '/diagnosis/view-both/'    // + image_id
}

// ==================================================================
// VALIDACIONES
// ==================================================================
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PHONE_LENGTH: 10,
  NAME_MIN_LENGTH: 2,
  EMAIL_MAX_LENGTH: 100,
  PHONE_PATTERN: /^[0-9]{10}$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
}

// ==================================================================
// HELPER URL
// ==================================================================
export const buildApiUrl = (endpoint, params = {}) => {
  let url = `${apiConfig.baseURL}${endpoint}`

  Object.keys(params).forEach(key => {
    url = url.replace(`{${key}}`, encodeURIComponent(params[key]))
  })

  return url
}
