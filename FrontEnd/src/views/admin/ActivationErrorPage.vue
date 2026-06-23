<template>
  <v-container class="error-container">
    <v-card elevation="8" class="mx-auto" max-width="600">
      <!-- Header -->
      <v-card-item class="bg-gradient-error">
        <div class="text-center py-4">
          <v-icon size="64" color="white" class="mb-3" style="filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4)); animation: shake 0.5s infinite alternate;">mdi-alert-circle</v-icon>
          <h1 class="text-h4 text-white font-weight-bold" style="text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            ❌ Error en la Activación
          </h1>
          <p class="text-white opacity-90 mb-0" style="text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
            Ha ocurrido un problema durante {{ actionText }}
          </p>
        </div>
      </v-card-item>

      <!-- Content -->
      <v-card-text class="pa-6">
        <div class="text-center">
          <!-- Error Alert -->
          <v-alert 
            type="error"
            variant="tonal"
            class="mb-4"
            icon="mdi-alert-circle"
          >
            <v-alert-title>{{ errorTitle }}</v-alert-title>
            {{ errorMessage }}
          </v-alert>

          <!-- Error Details Card -->
          <v-card variant="outlined" class="mb-6">
            <v-card-text>
              <h3 class="text-h6 mb-3 text-error">Detalles del Error</h3>
              
              <v-list lines="one" density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon color="error">mdi-cog-off</v-icon>
                  </template>
                  <v-list-item-title>Operación:</v-list-item-title>
                  <v-list-item-subtitle class="font-weight-medium">{{ actionText }}</v-list-item-subtitle>
                </v-list-item>
                
                <v-list-item>
                  <template #prepend>
                    <v-icon color="error">mdi-alert</v-icon>
                  </template>
                  <v-list-item-title>Error:</v-list-item-title>
                  <v-list-item-subtitle class="font-weight-medium">{{ errorMessage }}</v-list-item-subtitle>
                </v-list-item>
                
                <v-list-item>
                  <template #prepend>
                    <v-icon color="error">mdi-calendar-clock</v-icon>
                  </template>
                  <v-list-item-title>Fecha y hora:</v-list-item-title>
                  <v-list-item-subtitle class="font-weight-medium">{{ currentDateTime }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="tokenError">
                  <template #prepend>
                    <v-icon color="error">mdi-key-alert</v-icon>
                  </template>
                  <v-list-item-title>Estado del token:</v-list-item-title>
                  <v-list-item-subtitle class="font-weight-medium">Inválido o expirado</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- Troubleshooting Tips -->
          <v-card variant="outlined" color="info" class="mb-6">
            <v-card-text>
              <h4 class="text-h6 mb-3 d-flex align-center">
                <v-icon color="info" class="mr-2">mdi-lightbulb</v-icon>
                Posibles Soluciones
              </h4>
              
              <v-list density="compact">
                <v-list-item v-if="tokenError">
                  <template #prepend>
                    <v-icon size="20" color="info">mdi-refresh</v-icon>
                  </template>
                  <v-list-item-title>Solicita un nuevo enlace de activación</v-list-item-title>
                </v-list-item>
                
                <v-list-item>
                  <template #prepend>
                    <v-icon size="20" color="info">mdi-reload</v-icon>
                  </template>
                  <v-list-item-title>Recarga la página e intenta nuevamente</v-list-item-title>
                </v-list-item>
                
                <v-list-item>
                  <template #prepend>
                    <v-icon size="20" color="info">mdi-wifi-strength-alert-outline</v-icon>
                  </template>
                  <v-list-item-title>Verifica tu conexión a internet</v-list-item-title>
                </v-list-item>
                
                <v-list-item>
                  <template #prepend>
                    <v-icon size="20" color="info">mdi-email</v-icon>
                  </template>
                  <v-list-item-title>Contacta al administrador del sistema si persiste</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- Action Buttons -->
          <div class="d-flex flex-column flex-sm-row gap-3 justify-center">
            <v-btn
              color="primary"
              variant="elevated"
              size="large"
              @click="retryOperation"
              :disabled="!canRetry"
            >
              <v-icon start>mdi-refresh</v-icon>
              Reintentar
            </v-btn>

            <v-btn
              color="info"
              variant="elevated"
              size="large"
              @click="goToLogin"
            >
              <v-icon start>mdi-login</v-icon>
              Ir al Login ({{ countdown }}s)
            </v-btn>
          </div>

          <!-- Contact Information -->
          <v-alert 
            type="info"
            variant="outlined"
            class="mt-6"
            icon="mdi-clock"
          >
            <v-alert-title>Redirección Automática</v-alert-title>
            Serás redirigido automáticamente al login en {{ countdown }} segundos. Si el error persiste, contacta al administrador del sistema.
          </v-alert>

          <!-- Footer -->
          <div class="mt-6 text-center">
            <p class="text-body-2 text-medium-emphasis mb-0">
              <v-icon size="16" class="mr-1">mdi-shield-alert</v-icon>
              Error registrado en el sistema
            </p>
            <p class="text-caption text-medium-emphasis">
              Sistema Médico © 2025 | Soporte Técnico
            </p>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Router
const route = useRoute()
const router = useRouter()

// Reactive data
const action = ref('')
const errorMessage = ref('')
const currentDateTime = ref('')
const countdown = ref(5)
const countdownInterval = ref(null)

// Computed properties
const actionText = computed(() => {
  switch (action.value) {
    case 'approve':
      return 'la activación de la cuenta'
    case 'reject':
      return 'el rechazo de la solicitud'
    case 'load':
      return 'la carga de datos del usuario'
    default:
      return 'la operación'
  }
})

const errorTitle = computed(() => {
  switch (action.value) {
    case 'approve':
      return 'Error en la Activación'
    case 'reject':
      return 'Error en el Rechazo'
    case 'load':
      return 'Error de Carga'
    default:
      return 'Error del Sistema'
  }
})

const tokenError = computed(() => {
  const msg = errorMessage.value.toLowerCase()
  return msg.includes('token') && (msg.includes('inválido') || msg.includes('expirado'))
})

const canRetry = computed(() => {
  return action.value !== 'load' && !tokenError.value
})

// Methods
const formatCurrentDateTime = () => {
  const now = new Date()
  return now.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const retryOperation = () => {
  // Go back to the activation page with the same token
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  
  if (token) {
    router.push({
      name: 'AdminActivation',
      query: { token }
    })
  } else {
    // If no token, redirect to dashboard
    goToDashboard()
  }
}

const goToLogin = () => {
  router.push('/login')
}

const startCountdown = () => {
  countdownInterval.value = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownInterval.value)
      goToLogin()
    }
  }, 1000)
}

const closeWindow = () => {
  // Try to close the window/tab
  if (window.history.length > 1) {
    window.history.back()
  } else {
    // If no history, try to close window (may not work in all browsers)
    window.close()
    // Fallback: redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
  }
}

// Lifecycle
onMounted(() => {
  // Get data from query params
  action.value = route.query.action || 'unknown'
  errorMessage.value = route.query.error || 'Error desconocido del sistema'
  currentDateTime.value = formatCurrentDateTime()

  // Log error for debugging
  console.error('Activation Error:', {
    action: action.value,
    error: errorMessage.value,
    timestamp: currentDateTime.value,
    route: route.fullPath
  })

  // Iniciar countdown automático
  startCountdown()
})
</script>

<style scoped>
.error-container {
  padding: 24px;
  min-height: 100vh;
  background: linear-gradient(135deg, #202020 0%, #303030 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-gradient-error {
  background: linear-gradient(135deg, #730302 0%, #C6202A 100%) !important;
}

.gap-3 {
  gap: 0.75rem;
}

@media (max-width: 599px) {
  .error-container {
    padding: 16px;
  }
  
  .gap-3 {
    gap: 0.5rem;
  }
}

/* Efectos adicionales para mejorar el diseño */
.v-card {
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(115, 3, 2, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.v-btn {
  transition: all 0.3s ease;
}

.v-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(115, 3, 2, 0.4);
}

@keyframes shake {
  0% { transform: rotate(-5deg); }
  100% { transform: rotate(5deg); }
}
</style>