<template>
  <div class="fullscreen-activation">
    <!-- Barra Superior Estilo UPC -->
    <div class="top-bar">
      <div class="top-bar-content">
        <div class="logo-section">
          <div class="logo-container">
            <div class="logo-text">
              <span class="upc-text">UPC</span>
              <span class="postgrado-text">POSGRADO</span>
            </div>
            <div class="university-name">Universidad Peruana de Ciencias Aplicadas</div>
          </div>
        </div>
        <div class="system-title">
          <span class="system-name">SISTEMA MÉDICO</span>
          <span class="system-subtitle">Activación de Administradores</span>
        </div>
      </div>
    </div>

    <!-- Contenido Principal -->
    <div class="main-content-wrapper">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-content">
          <v-progress-circular indeterminate size="80" width="6" color="#F10706" class="mb-6"></v-progress-circular>
          <h2 class="text-h5 text-white mb-2">Cargando información del usuario...</h2>
          <p class="text-white opacity-70">Por favor, espera un momento</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <div class="error-card">
          <v-icon size="80" color="#730302" class="mb-4">mdi-alert-circle</v-icon>
          <h2 class="text-h4 mb-4" style="color: #730302;">Error</h2>
          <p class="text-body-1 mb-6">{{ error }}</p>
          <button 
            class="retry-btn"
            @click="fetchUserData"
          >
            <v-icon class="mr-2">mdi-refresh</v-icon>
            Reintentar
          </button>
        </div>
      </div>

      <!-- Success State - User Data -->
      <div v-else-if="userData" class="activation-content">
        <!-- Título Principal -->
        <div class="page-header">
          <div class="header-icon">
            <v-icon size="48" color="#F10706">mdi-account-plus</v-icon>
          </div>
          <h1 class="page-title">Activación de Cuenta de Administrador</h1>
          <p class="page-subtitle">Revisar y tomar decisión sobre la solicitud</p>
        </div>

        <!-- User Information -->
        <div class="user-info-section">
          <h2 class="section-title">
            <v-icon class="section-icon">mdi-account</v-icon>
            Información del Solicitante
          </h2>

          <div class="user-info-grid">
            <div class="info-card personal-info">
              <h3 class="info-card-title">
                <v-icon class="mr-2">mdi-account-details</v-icon>
                Datos Personales
              </h3>
              <div class="info-list">
                <div class="info-item">
                  <div class="info-icon">
                    <v-icon color="white">mdi-account-circle</v-icon>
                  </div>
                  <div class="info-content">
                    <span class="info-label">Nombre Completo</span>
                    <span class="info-value">{{ userData.user.full_name }}</span>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-icon">
                    <v-icon color="white">mdi-email</v-icon>
                  </div>
                  <div class="info-content">
                    <span class="info-label">Email</span>
                    <span class="info-value">{{ userData.user.email }}</span>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-icon">
                    <v-icon color="white">mdi-shield-account</v-icon>
                  </div>
                  <div class="info-content">
                    <span class="info-label">Rol Solicitado</span>
                    <span class="info-value">{{ userData.user.role }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="info-card professional-info">
              <h3 class="info-card-title">
                <v-icon class="mr-2">mdi-hospital-building</v-icon>
                Información Profesional
              </h3>
              <div class="info-list">
                <div class="info-item">
                  <div class="info-icon">
                    <v-icon color="white">mdi-hospital</v-icon>
                  </div>
                  <div class="info-content">
                    <span class="info-label">Área/Especialidad</span>
                    <span class="info-value">{{ userData.user.specialty }}</span>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-icon">
                    <v-icon color="white">mdi-phone</v-icon>
                  </div>
                  <div class="info-content">
                    <span class="info-label">Teléfono</span>
                    <span class="info-value">{{ userData.user.phone }}</span>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-icon">
                    <v-icon color="white">mdi-calendar</v-icon>
                  </div>
                  <div class="info-content">
                    <span class="info-label">Fecha de Solicitud</span>
                    <span class="info-value">{{ formatDate(userData.user.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Estado y Acciones -->
          <div class="status-actions-section">
            <!-- Current Status -->
            <div class="status-card">
              <div class="status-header">
                <v-icon class="status-icon">mdi-clock-alert</v-icon>
                <span class="status-text">Estado: INACTIVO - Esperando activación</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="actions-card">
              <h3 class="actions-title">
                <v-icon class="mr-2">mdi-lightning-bolt</v-icon>
                Selecciona una Acción
              </h3>
              
              <div class="action-buttons">
                <button 
                  class="action-btn approve-btn"
                  :disabled="approving"
                  @click="confirmApproval"
                >
                  <v-icon class="btn-icon">mdi-check-circle</v-icon>
                  <div class="btn-content">
                    <span class="btn-title">ACTIVAR CUENTA</span>
                    <span class="btn-subtitle">Aprobar y dar acceso al sistema</span>
                  </div>
                  <v-progress-circular v-if="approving" indeterminate size="24" color="white" class="btn-loader"></v-progress-circular>
                </button>

                <button 
                  class="action-btn reject-btn"
                  :disabled="rejecting"
                  @click="confirmRejection"
                >
                  <v-icon class="btn-icon">mdi-close-circle</v-icon>
                  <div class="btn-content">
                    <span class="btn-title">RECHAZAR Y ELIMINAR</span>
                    <span class="btn-subtitle">Denegar acceso y eliminar solicitud</span>
                  </div>
                  <v-progress-circular v-if="rejecting" indeterminate size="24" color="white" class="btn-loader"></v-progress-circular>
                </button>
              </div>
              
              <div class="info-note">
                <v-icon class="note-icon">mdi-information</v-icon>
                <span class="note-text">
                  Una vez que tomes una decisión, el usuario será notificado automáticamente por correo electrónico.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialogs -->
    <v-dialog v-model="showApprovalDialog" max-width="500">
      <v-card>
        <v-card-title class="text-success">
          <v-icon class="mr-2">mdi-check-circle</v-icon>
          Confirmar Activación
        </v-card-title>
        <v-card-text>
          ¿Estás seguro de que quieres <strong>ACTIVAR</strong> esta cuenta de administrador?
          <br><br>
          <strong>Usuario:</strong> {{ userData?.user.full_name }}<br>
          <strong>Email:</strong> {{ userData?.user.email }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showApprovalDialog = false">
            Cancelar
          </v-btn>
          <v-btn 
            color="success" 
            variant="elevated"
            :loading="approving"
            @click="approveUser"
          >
            Sí, Activar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showRejectionDialog" max-width="500">
      <v-card>
        <v-card-title class="text-error">
          <v-icon class="mr-2">mdi-close-circle</v-icon>
          Confirmar Rechazo
        </v-card-title>
        <v-card-text>
          ¿Estás seguro de que quieres <strong>RECHAZAR y ELIMINAR</strong> esta cuenta?
          <br><br>
          <strong>Usuario:</strong> {{ userData?.user.full_name }}<br>
          <strong>Email:</strong> {{ userData?.user.email }}
          <br><br>
          <v-alert type="error" variant="text" density="compact">
            ⚠️ Esta acción es irreversible. La cuenta será eliminada del sistema.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showRejectionDialog = false">
            Cancelar
          </v-btn>
          <v-btn 
            color="error" 
            variant="elevated"
            :loading="rejecting"
            @click="rejectUser"
          >
            Sí, Rechazar y Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

      <!-- Success State - User Data -->
      <div v-else-if="userData" class="activation-content">
        <!-- Título Principal -->
        <div class="page-header">
          <div class="header-icon">
            <v-icon size="48" color="#F10706">mdi-account-plus</v-icon>
          </div>
          <h1 class="page-title">Activación de Cuenta de Administrador</h1>
          <p class="page-subtitle">Revisar y tomar decisión sobre la solicitud</p>
        </div>      <!-- User Information -->
      <v-card-text class="content-section">
        <div class="info-header mb-6">
          <h2 class="section-title">
            <v-icon class="section-icon">mdi-account</v-icon>
            Información del Solicitante
          </h2>
        </div>

        <v-card variant="outlined" class="user-info-card mb-8">
          <v-card-text class="pa-8">
            <v-row class="user-details">
              <v-col cols="12" lg="6">
                <div class="info-section">
                  <h3 class="info-section-title mb-4">
                    <v-icon class="mr-2">mdi-account-details</v-icon>
                    Datos Personales
                  </h3>
                  <v-list class="custom-list">
                    <v-list-item class="info-item">
                      <template #prepend>
                        <v-avatar size="40" color="#F10706">
                          <v-icon color="white">mdi-account-circle</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="item-title">Nombre Completo</v-list-item-title>
                      <v-list-item-subtitle class="item-subtitle">{{ userData.user.full_name }}</v-list-item-subtitle>
                    </v-list-item>
                    
                    <v-list-item class="info-item">
                      <template #prepend>
                        <v-avatar size="40" color="#D0021B">
                          <v-icon color="white">mdi-email</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="item-title">Email</v-list-item-title>
                      <v-list-item-subtitle class="item-subtitle">{{ userData.user.email }}</v-list-item-subtitle>
                    </v-list-item>
                    
                    <v-list-item class="info-item">
                      <template #prepend>
                        <v-avatar size="40" color="#C6202A">
                          <v-icon color="white">mdi-shield-account</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="item-title">Rol Solicitado</v-list-item-title>
                      <v-list-item-subtitle class="item-subtitle">{{ userData.user.role }}</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </div>
              </v-col>
              
              <v-col cols="12" lg="6">
                <div class="info-section">
                  <h3 class="info-section-title mb-4">
                    <v-icon class="mr-2">mdi-hospital-building</v-icon>
                    Información Profesional
                  </h3>
                  <v-list class="custom-list">
                    <v-list-item class="info-item">
                      <template #prepend>
                        <v-avatar size="40" color="#730302">
                          <v-icon color="white">mdi-hospital</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="item-title">Área/Especialidad</v-list-item-title>
                      <v-list-item-subtitle class="item-subtitle">{{ userData.user.specialty }}</v-list-item-subtitle>
                    </v-list-item>
                    
                    <v-list-item class="info-item">
                      <template #prepend>
                        <v-avatar size="40" color="#262626">
                          <v-icon color="white">mdi-phone</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="item-title">Teléfono</v-list-item-title>
                      <v-list-item-subtitle class="item-subtitle">{{ userData.user.phone }}</v-list-item-subtitle>
                    </v-list-item>
                    
                    <v-list-item class="info-item">
                      <template #prepend>
                        <v-avatar size="40" color="#404040">
                          <v-icon color="white">mdi-calendar</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="item-title">Fecha de Solicitud</v-list-item-title>
                      <v-list-item-subtitle class="item-subtitle">{{ formatDate(userData.user.created_at) }}</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </div>
              </v-col>
            </v-row>

            <!-- Current Status -->
            <div class="status-section mt-6">
              <v-alert 
                type="warning" 
                variant="elevated" 
                class="status-alert"
                icon="mdi-clock-alert"
                elevation="8"
              >
                <v-alert-title class="status-title">
                  <v-icon class="mr-2">mdi-account-clock</v-icon>
                  Estado Actual del Usuario
                </v-alert-title>
                <div class="d-flex align-center mt-2">
                  <v-chip color="warning" variant="elevated" size="large" class="status-chip">
                    <v-icon start>mdi-pause-circle</v-icon>
                    INACTIVO - Esperando activación
                  </v-chip>
                </div>
              </v-alert>
            </div>
          </v-card-text>
        </v-card>

        <!-- Action Buttons -->
        <div class="action-section">
          <div class="action-header text-center mb-6">
            <h3 class="action-title">
              <v-icon class="action-icon">mdi-lightning-bolt</v-icon>
              Selecciona una Acción
            </h3>
            <p class="action-subtitle">Toma una decisión sobre esta solicitud de cuenta</p>
          </div>

          <div class="action-buttons">
            <v-row class="action-row" justify="center">
              <v-col cols="12" md="5">
                <v-btn
                  block
                  size="x-large"
                  class="action-btn approve-btn"
                  :loading="approving"
                  @click="confirmApproval"
                >
                  <v-icon start size="28">mdi-check-circle</v-icon>
                  <div class="btn-content">
                    <div class="btn-title">ACTIVAR CUENTA</div>
                    <div class="btn-subtitle">Aprobar y dar acceso al sistema</div>
                  </div>
                </v-btn>
              </v-col>

              <v-col cols="12" md="5">
                <v-btn
                  block
                  size="x-large"
                  class="action-btn reject-btn"
                  :loading="rejecting"
                  @click="confirmRejection"
                >
                  <v-icon start size="28">mdi-close-circle</v-icon>
                  <div class="btn-content">
                    <div class="btn-title">RECHAZAR Y ELIMINAR</div>
                    <div class="btn-subtitle">Denegar acceso y eliminar solicitud</div>
                  </div>
                </v-btn>
              </v-col>
            </v-row>
          </div>
        </div>

        <!-- Info Note -->
        <v-alert 
          type="info" 
          variant="elevated" 
          class="info-note"
          icon="mdi-information"
          elevation="4"
        >
          <v-alert-title class="info-title">
            <v-icon class="mr-2">mdi-email-send</v-icon>
            Nota importante
          </v-alert-title>
          <p class="info-text">
            Una vez que tomes una decisión, el usuario será notificado automáticamente por correo electrónico 
            con los detalles de la activación o rechazo de su solicitud.
          </p>
        </v-alert>
      </v-card-text>
    </v-card>
    </div>

    <!-- Confirmation Dialogs -->
    <v-dialog v-model="showApprovalDialog" max-width="500">
      <v-card>
        <v-card-title class="text-success">
          <v-icon class="mr-2">mdi-check-circle</v-icon>
          Confirmar Activación
        </v-card-title>
        <v-card-text>
          ¿Estás seguro de que quieres <strong>ACTIVAR</strong> esta cuenta de administrador?
          <br><br>
          <strong>Usuario:</strong> {{ userData?.user.full_name }}<br>
          <strong>Email:</strong> {{ userData?.user.email }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showApprovalDialog = false">
            Cancelar
          </v-btn>
          <v-btn 
            color="success" 
            variant="elevated"
            :loading="approving"
            @click="approveUser"
          >
            Sí, Activar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showRejectionDialog" max-width="500">
      <v-card>
        <v-card-title class="text-error">
          <v-icon class="mr-2">mdi-close-circle</v-icon>
          Confirmar Rechazo
        </v-card-title>
        <v-card-text>
          ¿Estás seguro de que quieres <strong>RECHAZAR y ELIMINAR</strong> esta cuenta?
          <br><br>
          <strong>Usuario:</strong> {{ userData?.user.full_name }}<br>
          <strong>Email:</strong> {{ userData?.user.email }}
          <br><br>
          <v-alert type="error" variant="text" density="compact">
            ⚠️ Esta acción es irreversible. La cuenta será eliminada del sistema.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showRejectionDialog = false">
            Cancelar
          </v-btn>
          <v-btn 
            color="error" 
            variant="elevated"
            :loading="rejecting"
            @click="rejectUser"
          >
            Sí, Rechazar y Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/config/api'

// Router
const route = useRoute()
const router = useRouter()

// Reactive data
const loading = ref(true)
const error = ref('')
const userData = ref(null)
const approving = ref(false)
const rejecting = ref(false)
const showApprovalDialog = ref(false)
const showRejectionDialog = ref(false)

// Methods
const fetchUserData = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const token = route.query.token
    if (!token) {
      throw new Error('Token de activación requerido')
    }

    const response = await api.get(`/users/admin/activate-user?token=${token}`)
    userData.value = response.data
    
  } catch (err) {
    console.error('Error fetching user data:', err)
    
    if (err.response?.data?.detail) {
      if (err.response.data.detail.error === 'invalid_token') {
        error.value = 'El enlace de activación es inválido o ha expirado.'
      } else if (err.response.data.detail.error === 'user_not_found') {
        error.value = 'El usuario asociado a este enlace no existe.'
      } else {
        error.value = err.response.data.detail.message || 'Error al cargar datos del usuario'
      }
    } else {
      error.value = 'Error de conexión. Intenta nuevamente.'
    }
  } finally {
    loading.value = false
  }
}

const confirmApproval = () => {
  showApprovalDialog.value = true
}

const confirmRejection = () => {
  showRejectionDialog.value = true
}

const approveUser = async () => {
  try {
    approving.value = true
    
    const token = route.query.token
    // Usar ruta relativa sin '/api' porque axios ya tiene baseURL con '/api'
    const response = await api.post(`/users/admin/activate-user/approve?token=${token}`)
    
    // Redirect to success page with approval data
    router.push({
      name: 'ActivationSuccess',
      query: { 
        action: 'approved',
        userName: userData.value.user.full_name,
        userEmail: userData.value.user.email
      }
    })
    
  } catch (err) {
    console.error('Error approving user:', err)
    
    // Redirect to error page
    router.push({
      name: 'ActivationError',
      query: { 
        action: 'approve',
        error: err.response?.data?.detail?.message || 'Error al activar usuario'
      }
    })
  } finally {
    approving.value = false
    showApprovalDialog.value = false
  }
}

const rejectUser = async () => {
  try {
    rejecting.value = true
    
    const token = route.query.token
    // Usar ruta relativa sin '/api' porque axios ya tiene baseURL con '/api'
    const response = await api.post(`/users/admin/activate-user/reject?token=${token}`)
    
    // Redirect to success page with rejection data
    router.push({
      name: 'ActivationSuccess',
      query: { 
        action: 'rejected',
        userName: userData.value.user.full_name,
        userEmail: userData.value.user.email
      }
    })
    
  } catch (err) {
    console.error('Error rejecting user:', err)
    
    // Redirect to error page
    router.push({
      name: 'ActivationError',
      query: { 
        action: 'reject',
        error: err.response?.data?.detail?.message || 'Error al rechazar usuario'
      }
    })
  } finally {
    rejecting.value = false
    showRejectionDialog.value = false
  }
}

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

// Lifecycle
onMounted(() => {
  fetchUserData()
})
</script>

<style scoped>
/* ===== LAYOUT PRINCIPAL ===== */
.activation-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #202020 0%, #262626 50%, #303030 100%);
  position: relative;
  overflow-x: hidden;
}

.activation-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 80%, rgba(241, 7, 6, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(198, 32, 42, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(115, 3, 2, 0.05) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* ===== ESTADOS DE CARGA Y ERROR ===== */
.loading-state, .error-state {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-content {
  text-align: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.error-card {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(115, 3, 2, 0.2) !important;
}

/* ===== CONTENIDO PRINCIPAL ===== */
.main-content {
  position: relative;
  z-index: 1;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.main-card {
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 24px !important;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
}

/* ===== HEADER SECTION ===== */
.bg-gradient-primary {
  background: linear-gradient(135deg, #F10706 0%, #D0021B 25%, #C6202A 75%, #730302 100%) !important;
  position: relative;
  overflow: hidden;
}

.header-section {
  padding: 60px 40px !important;
}

.header-icon-wrapper {
  position: relative;
  display: inline-block;
}

.header-icon {
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
  animation: float 3s ease-in-out infinite;
}

.main-title {
  text-shadow: 0 4px 8px rgba(0,0,0,0.4);
  font-size: clamp(2rem, 5vw, 3.5rem) !important;
  line-height: 1.2;
  margin-bottom: 16px;
}

.subtitle {
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  font-size: clamp(1.1rem, 2.5vw, 1.4rem) !important;
  opacity: 0.95;
}

.decorative-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.08;
  background: radial-gradient(circle at 30px 30px, white 2px, transparent 2px);
  background-size: 60px 60px;
  animation: patternMove 20s linear infinite;
}

/* ===== CONTENT SECTION ===== */
.content-section {
  padding: 50px 40px !important;
}

.info-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #262626;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.section-icon {
  color: #F10706;
  font-size: 2.5rem !important;
}

/* ===== USER INFO CARD ===== */
.user-info-card {
  border: 3px solid #F2F2F2 !important;
  background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%) !important;
  border-radius: 20px !important;
  box-shadow: 0 8px 32px rgba(241, 7, 6, 0.1) !important;
  transition: all 0.3s ease;
}

.user-info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(241, 7, 6, 0.15) !important;
}

.user-details {
  gap: 32px;
}

.info-section {
  height: 100%;
}

.info-section-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #262626;
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #F10706;
}

.custom-list {
  padding: 0;
}

.info-item {
  padding: 16px 0;
  border-bottom: 1px solid rgba(242, 242, 242, 0.5);
  transition: all 0.2s ease;
}

.info-item:hover {
  background: rgba(241, 7, 6, 0.02);
  padding-left: 16px;
}

.item-title {
  font-weight: 600;
  color: #262626;
  font-size: 1.1rem;
}

.item-subtitle {
  font-weight: 500;
  color: #404040;
  font-size: 1rem;
  margin-top: 4px;
}

/* ===== STATUS SECTION ===== */
.status-section {
  margin-top: 32px;
}

.status-alert {
  border-radius: 16px !important;
  border: 2px solid rgba(255, 193, 7, 0.3) !important;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 235, 59, 0.05) 100%) !important;
}

.status-title {
  font-size: 1.2rem;
  font-weight: 600;
}

.status-chip {
  font-size: 1rem !important;
  font-weight: 600;
  padding: 12px 24px;
  height: 48px;
}

/* ===== ACTION SECTION ===== */
.action-section {
  margin: 50px 0;
  padding: 40px;
  background: linear-gradient(135deg, rgba(241, 7, 6, 0.03) 0%, rgba(198, 32, 42, 0.02) 100%);
  border-radius: 24px;
  border: 2px solid rgba(241, 7, 6, 0.1);
}

.action-header {
  margin-bottom: 40px;
}

.action-title {
  font-size: 2rem;
  font-weight: 700;
  color: #262626;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.action-icon {
  color: #F10706;
  font-size: 2.2rem !important;
  animation: pulse 2s ease-in-out infinite;
}

.action-subtitle {
  font-size: 1.1rem;
  color: #404040;
  margin: 0;
}

.action-buttons {
  margin-top: 32px;
}

.action-row {
  gap: 24px;
}

.action-btn {
  height: 120px !important;
  border-radius: 20px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  font-weight: 600;
  text-transform: none;
}

.approve-btn {
  background: linear-gradient(135deg, #D0021B 0%, #F10706 50%, #C6202A 100%) !important;
  color: white !important;
  border: 3px solid #F10706 !important;
}

.approve-btn:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 32px rgba(241, 7, 6, 0.4) !important;
  filter: brightness(1.1);
}

.reject-btn {
  background: linear-gradient(135deg, #730302 0%, #262626 50%, #404040 100%) !important;
  color: white !important;
  border: 3px solid #730302 !important;
}

.reject-btn:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 32px rgba(115, 3, 2, 0.4) !important;
  filter: brightness(1.1);
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
}

.btn-title {
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.2;
}

.btn-subtitle {
  font-size: 0.9rem;
  opacity: 0.9;
  font-weight: 400;
  line-height: 1.2;
}

/* ===== INFO NOTE ===== */
.info-note {
  margin-top: 40px;
  border-radius: 16px !important;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(30, 136, 229, 0.05) 100%) !important;
  border: 2px solid rgba(33, 150, 243, 0.2) !important;
}

.info-title {
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.info-text {
  margin: 8px 0 0 0;
  font-size: 1rem;
  line-height: 1.6;
  color: #404040;
}

/* ===== ANIMATIONS ===== */
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

@keyframes patternMove {
  0% { background-position: 0 0; }
  100% { background-position: 60px 60px; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

/* ===== RESPONSIVE DESIGN ===== */
@media (max-width: 1200px) {
  .main-content { padding: 16px; max-width: 100%; }
  .content-section { padding: 40px 32px !important; }
  .action-section { padding: 32px 24px; }
}

@media (max-width: 768px) {
  .header-section { padding: 40px 24px !important; }
  .content-section { padding: 32px 24px !important; }
  .action-section { padding: 24px 16px; margin: 32px 0; }
  .action-row { gap: 16px; }
  .action-btn { height: 100px !important; }
  .btn-title { font-size: 1rem; }
  .btn-subtitle { font-size: 0.8rem; }
  .user-details { gap: 16px; }
  .section-title { font-size: 1.8rem; }
  .action-title { font-size: 1.6rem; }
}

@media (max-width: 480px) {
  .main-content { padding: 8px; }
  .header-section { padding: 32px 16px !important; }
  .content-section { padding: 24px 16px !important; }
  .main-title { font-size: 1.8rem !important; }
  .subtitle { font-size: 1rem !important; }
  .action-btn { height: 80px !important; }
  .info-item { padding: 12px 0; }
}
</style>