<template>
  <div class="fullscreen-activation">
    <!-- Barra Superior Estilo UPC -->
    <div class="top-bar">
      <div class="top-bar-content">
        <div class="logo-section">
          <div class="logo-container">
            <img 
              src="/src/assets/images/logo-uc-posgrado.png" 
              alt="UPC Posgrado" 
              class="upc-logo"
            />
          </div>
        </div>
        <div class="system-title">
          <span class="system-name">Sistema de Diagnóstico Automatizado con Redes Neuronales</span>
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
          <p class="text-body-1 mb-6" style="color: #262626;">{{ error }}</p>
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
          <h1 class="page-title">Sistema de Diagnóstico Automatizado - Activación de Administradores</h1>
          <p class="page-subtitle">Revisar y tomar decisión sobre la solicitud de acceso al sistema</p>
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
      <v-card style="background: #FFFFFF; border: 2px solid #F10706; border-radius: 16px;">
        <v-card-title style="background: linear-gradient(135deg, #F10706 0%, #C6202A 100%); color: white; padding: 20px; border-radius: 14px 14px 0 0;">
          <v-icon class="mr-2" style="color: white;">mdi-check-circle</v-icon>
          Confirmar Activación
        </v-card-title>
        <v-card-text style="padding: 24px; color: #262626; font-size: 1.1rem; line-height: 1.6;">
          ¿Estás seguro de que quieres <strong style="color: #F10706;">ACTIVAR</strong> esta cuenta de administrador?
          <br><br>
          <div style="background: #F2F2F2; padding: 16px; border-radius: 8px; border-left: 4px solid #F10706; margin-top: 16px;">
            <strong style="color: #730302;">Usuario:</strong> <span style="color: #262626;">{{ userData?.user.full_name }}</span><br>
            <strong style="color: #730302;">Email:</strong> <span style="color: #262626;">{{ userData?.user.email }}</span>
          </div>
        </v-card-text>
        <v-card-actions style="padding: 16px 24px 24px 24px; background: #FAFAFA;">
          <v-spacer></v-spacer>
          <v-btn 
            style="background: #A6A6A6; color: white; border-radius: 8px; font-weight: 600;"
            variant="elevated"
            @click="showApprovalDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn 
            style="background: linear-gradient(135deg, #F10706 0%, #C6202A 100%); color: white; border-radius: 8px; font-weight: 600; margin-left: 12px;"
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
      <v-card style="background: #FFFFFF; border: 2px solid #730302; border-radius: 16px;">
        <v-card-title style="background: linear-gradient(135deg, #730302 0%, #202020 100%); color: white; padding: 20px; border-radius: 14px 14px 0 0;">
          <v-icon class="mr-2" style="color: white;">mdi-close-circle</v-icon>
          Confirmar Rechazo
        </v-card-title>
        <v-card-text style="padding: 24px; color: #262626; font-size: 1.1rem; line-height: 1.6;">
          ¿Estás seguro de que quieres <strong style="color: #730302;">RECHAZAR y ELIMINAR</strong> esta cuenta?
          <br><br>
          <div style="background: #F2F2F2; padding: 16px; border-radius: 8px; border-left: 4px solid #730302; margin-top: 16px;">
            <strong style="color: #730302;">Usuario:</strong> <span style="color: #262626;">{{ userData?.user.full_name }}</span><br>
            <strong style="color: #730302;">Email:</strong> <span style="color: #262626;">{{ userData?.user.email }}</span>
          </div>
          <br>
          <div style="background: linear-gradient(135deg, rgba(115, 3, 2, 0.1) 0%, rgba(115, 3, 2, 0.05) 100%); border: 2px solid rgba(115, 3, 2, 0.3); border-radius: 12px; padding: 16px; margin-top: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; color: #730302; font-weight: 600;">
              <span style="font-size: 1.2rem;">⚠️</span>
              Esta acción es irreversible. La cuenta será eliminada del sistema.
            </div>
          </div>
        </v-card-text>
        <v-card-actions style="padding: 16px 24px 24px 24px; background: #FAFAFA;">
          <v-spacer></v-spacer>
          <v-btn 
            style="background: #A6A6A6; color: white; border-radius: 8px; font-weight: 600;"
            variant="elevated"
            @click="showRejectionDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn 
            style="background: linear-gradient(135deg, #730302 0%, #202020 100%); color: white; border-radius: 8px; font-weight: 600; margin-left: 12px;"
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
/* ===== FULLSCREEN LAYOUT ===== */
.fullscreen-activation {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #202020 0%, #262626 50%, #303030 100%);
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
}

/* ===== BARRA SUPERIOR ESTILO UPC ===== */
.top-bar {
  width: 100%;
  height: 80px;
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.top-bar-content {
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-section {
  display: flex;
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: center;
}

.upc-logo {
  height: 50px;
  width: auto;
  object-fit: contain;
  filter: brightness(1.1);
}

.system-title {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.system-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #F10706;
  letter-spacing: 0.5px;
  line-height: 1.3;
  text-align: right;
}

.system-subtitle {
  font-size: 0.85rem;
  color: #D9D9D9;
  font-weight: 400;
  margin-top: 4px;
}

/* ===== CONTENIDO PRINCIPAL ===== */
.main-content-wrapper {
  margin-top: 80px;
  min-height: calc(100vh - 80px);
  padding: 40px 32px;
}

/* ===== ESTADOS DE CARGA Y ERROR ===== */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
}

.loading-content {
  text-align: center;
  padding: 60px 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
}

.error-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 60px 40px;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.retry-btn {
  background: linear-gradient(135deg, #F10706 0%, #C6202A 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(241, 7, 6, 0.4);
}

/* ===== CONTENIDO DE ACTIVACIÓN ===== */
.activation-content {
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.page-header {
  background: linear-gradient(135deg, #F10706 0%, #D0021B 50%, #C6202A 100%);
  color: white;
  text-align: center;
  padding: 60px 40px;
  position: relative;
}

.header-icon {
  margin-bottom: 20px;
}

.page-title {
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.page-subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
}

/* ===== USER INFO SECTION ===== */
.user-info-section {
  padding: 50px 40px;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: #262626;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
  text-align: center;
}

.section-icon {
  color: #F10706;
  font-size: 2.2rem !important;
}

.user-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 32px;
  margin-bottom: 50px;
}

.info-card {
  background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%);
  border: 2px solid #F2F2F2;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(241, 7, 6, 0.1);
  transition: all 0.3s ease;
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(241, 7, 6, 0.15);
}

.info-card-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #262626;
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #F10706;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  border: 1px solid rgba(242, 242, 242, 0.5);
  transition: all 0.2s ease;
}

.info-item:hover {
  background: rgba(241, 7, 6, 0.02);
  transform: translateX(4px);
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F10706 0%, #D0021B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #404040;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 1.1rem;
  font-weight: 500;
  color: #262626;
}

/* ===== STATUS & ACTIONS SECTION ===== */
.status-actions-section {
  margin-top: 50px;
}

.status-card {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 235, 59, 0.05) 100%);
  border: 2px solid rgba(255, 193, 7, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  color: #ff9800;
  font-size: 1.5rem !important;
}

.status-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e65100;
}

.actions-card {
  background: linear-gradient(135deg, rgba(241, 7, 6, 0.03) 0%, rgba(198, 32, 42, 0.02) 100%);
  border: 2px solid rgba(241, 7, 6, 0.1);
  border-radius: 20px;
  padding: 40px;
}

.actions-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #262626;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
  text-align: center;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.action-btn {
  position: relative;
  height: 120px;
  border: none;
  border-radius: 20px;
  padding: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
  font-size: 1rem;
  overflow: hidden;
}

.action-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.approve-btn {
  background: linear-gradient(135deg, #D0021B 0%, #F10706 50%, #C6202A 100%);
  border: 3px solid #F10706;
}

.approve-btn:hover:not(:disabled) {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 32px rgba(241, 7, 6, 0.4);
  filter: brightness(1.1);
}

.reject-btn {
  background: linear-gradient(135deg, #730302 0%, #262626 50%, #404040 100%);
  border: 3px solid #730302;
}

.reject-btn:hover:not(:disabled) {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 32px rgba(115, 3, 2, 0.4);
  filter: brightness(1.1);
}

.btn-icon {
  font-size: 2rem !important;
  flex-shrink: 0;
}

.btn-content {
  flex: 1;
  text-align: left;
}

.btn-title {
  display: block;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 4px;
}

.btn-subtitle {
  display: block;
  font-size: 0.9rem;
  opacity: 0.9;
  font-weight: 400;
  line-height: 1.2;
}

.btn-loader {
  position: absolute;
  right: 20px;
}

.info-note {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(30, 136, 229, 0.05) 100%);
  border: 2px solid rgba(33, 150, 243, 0.2);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.note-icon {
  color: #1976d2;
  font-size: 1.3rem !important;
  flex-shrink: 0;
  margin-top: 2px;
}

.note-text {
  flex: 1;
  font-size: 1rem;
  line-height: 1.5;
  color: #1565c0;
  font-weight: 500;
}

/* ===== RESPONSIVE DESIGN ===== */
@media (max-width: 1200px) {
  .main-content-wrapper {
    padding: 32px 24px;
  }
  
  .user-info-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .user-info-section {
    padding: 40px 32px;
  }
}

@media (max-width: 768px) {
  .top-bar {
    height: 70px;
  }
  
  .main-content-wrapper {
    margin-top: 70px;
    padding: 24px 16px;
  }
  
  .top-bar-content {
    padding: 0 16px;
    flex-direction: row;
    gap: 16px;
    justify-content: space-between;
  }
  
  .upc-logo {
    height: 40px;
  }
  
  .system-name {
    font-size: 0.9rem;
  }
  
  .system-subtitle {
    font-size: 0.75rem;
  }
  
  .page-header {
    padding: 40px 24px;
  }
  
  .user-info-section {
    padding: 32px 24px;
  }
  
  .actions-card {
    padding: 24px 16px;
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .action-btn {
    height: 100px;
    gap: 12px;
  }
  
  .btn-title {
    font-size: 1rem;
  }
  
  .btn-subtitle {
    font-size: 0.8rem;
  }
  
  .user-info-grid {
    grid-template-columns: 1fr;
  }
  
  .info-card {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .top-bar {
    height: 60px;
  }
  
  .main-content-wrapper {
    margin-top: 60px;
    padding: 16px 8px;
  }
  
  .page-header {
    padding: 32px 16px;
  }
  
  .user-info-section {
    padding: 24px 16px;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .section-title {
    font-size: 1.5rem;
    flex-direction: column;
    gap: 8px;
  }
  
  .actions-title {
    font-size: 1.4rem;
    flex-direction: column;
    gap: 8px;
  }
  
  .action-btn {
    height: 90px;
    padding: 16px;
  }
  
  .info-item {
    padding: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .info-content {
    width: 100%;
  }
}
</style>