<template>
  <div class="fullscreen-success">
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
          <span class="system-subtitle">Resultado de Activación</span>
        </div>
      </div>
    </div>

    <!-- Contenido Principal -->
    <div class="main-content-wrapper">
      <div class="success-card">
        <!-- Header con resultado -->
        <div :class="headerClass">
          <div class="header-content">
            <v-icon :size="80" color="white" class="header-icon">{{ headerIcon }}</v-icon>
            <h1 class="header-title">{{ headerTitle }}</h1>
            <p class="header-subtitle">{{ headerSubtitle }}</p>
          </div>
        </div>

        <!-- Contenido -->
        <div class="card-content">
          <!-- Alert Principal -->
          <div :class="alertClass">
            <div class="alert-content">
              <v-icon :color="alertIconColor" size="32" class="alert-icon">{{ alertIcon }}</v-icon>
              <div class="alert-text">
                <h3 class="alert-title">{{ alertTitle }}</h3>
                <p class="alert-message">{{ alertMessage }}</p>
              </div>
            </div>
          </div>

          <!-- Detalles del Usuario -->
          <div class="user-details-section">
            <h3 class="section-title">
              <v-icon class="mr-2" color="#F10706">mdi-account-details</v-icon>
              Detalles del Usuario
            </h3>
            
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-icon">
                  <v-icon color="white">mdi-account-circle</v-icon>
                </div>
                <div class="detail-content">
                  <span class="detail-label">Usuario</span>
                  <span class="detail-value">{{ userName }}</span>
                </div>
              </div>

              <div class="detail-item">
                <div class="detail-icon">
                  <v-icon color="white">mdi-email</v-icon>
                </div>
                <div class="detail-content">
                  <span class="detail-label">Email</span>
                  <span class="detail-value">{{ userEmail }}</span>
                </div>
              </div>

              <div class="detail-item">
                <div class="detail-icon">
                  <v-icon color="white">mdi-calendar-check</v-icon>
                </div>
                <div class="detail-content">
                  <span class="detail-label">Fecha y Hora</span>
                  <span class="detail-value">{{ currentDateTime }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notificación por Email -->
          <div class="email-notification">
            <div class="notification-content">
              <v-icon color="#1976d2" size="24" class="mr-3">mdi-email-check</v-icon>
              <div>
                <h4 class="notification-title">Notificación por Email</h4>
                <p class="notification-text">{{ emailNotificationMessage }}</p>
              </div>
            </div>
          </div>

          <!-- Countdown y Botón -->
          <div class="countdown-section">
            <p class="countdown-text">
              <v-icon size="16" color="#dc3545" class="mr-1">mdi-timer-sand</v-icon>
              Será redirigido al login en {{ countdown }} segundos
            </p>
          </div>

          <!-- Botón de Acción -->
          <div class="action-buttons">
            <button class="action-btn primary-btn" @click="goToLogin">
              <v-icon class="mr-2">mdi-login</v-icon>
              Ir al Login
            </button>
          </div>

          <!-- Footer -->
          <div class="footer-section">
            <p class="footer-text">
              <v-icon size="16" color="#F10706" class="mr-1">mdi-shield-check</v-icon>
              Operación completada exitosamente
            </p>
            <p class="footer-copyright">
              Sistema de Diagnóstico Automatizado © 2025 | UPC Posgrado
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Router
const route = useRoute()
const router = useRouter()

// Reactive data
const userName = ref('')
const userEmail = ref('')
const action = ref('')
const currentDateTime = ref('')
const countdown = ref(5)
const countdownInterval = ref(null)

// Computed properties
const isApproved = computed(() => action.value === 'approved')
const isRejected = computed(() => action.value === 'rejected')

const headerClass = computed(() => 
  isApproved.value ? 'success-header' : 'rejection-header'
)

const headerIcon = computed(() => 
  isApproved.value ? 'mdi-check-circle' : 'mdi-close-circle'
)

const headerTitle = computed(() => 
  isApproved.value ? 'Cuenta Activada Exitosamente' : 'Solicitud Rechazada'
)

const headerSubtitle = computed(() => 
  isApproved.value 
    ? 'El administrador ya puede acceder al sistema'
    : 'La solicitud de acceso ha sido denegada'
)

const alertClass = computed(() => 
  isApproved.value ? 'success-alert' : 'warning-alert'
)

const alertIcon = computed(() => 
  isApproved.value ? 'mdi-check-circle' : 'mdi-alert-circle'
)

const alertIconColor = computed(() => 
  isApproved.value ? '#F10706' : '#730302'
)

const alertTitle = computed(() => 
  isApproved.value ? 'Activación Exitosa' : 'Solicitud Rechazada'
)

const alertMessage = computed(() => 
  isApproved.value 
    ? 'El usuario ha sido activado y ya puede acceder al sistema con sus credenciales.'
    : 'La solicitud ha sido rechazada y la cuenta ha sido eliminada del sistema.'
)

const emailNotificationMessage = computed(() => 
  isApproved.value 
    ? 'El usuario ha sido notificado por correo electrónico sobre la activación de su cuenta.'
    : 'El usuario ha sido notificado por correo electrónico sobre el rechazo de su solicitud.'
)

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

// Lifecycle
onMounted(() => {
  // Get data from query params
  userName.value = route.query.userName || 'Usuario desconocido'
  userEmail.value = route.query.userEmail || 'email@ejemplo.com'
  action.value = route.query.action || 'approved'
  currentDateTime.value = formatCurrentDateTime()

  // Validate action
  if (!['approved', 'rejected'].includes(action.value)) {
    console.warn('Invalid action parameter:', action.value)
    action.value = 'approved' // fallback
  }

  // Iniciar countdown automático
  startCountdown()
})
</script>

<style scoped>
/* ===== FULLSCREEN LAYOUT ===== */
.fullscreen-success {
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-card {
  max-width: 800px;
  width: 100%;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

/* ===== HEADER SECTION ===== */
.success-header {
  background: linear-gradient(135deg, #F10706 0%, #D0021B 50%, #C6202A 100%);
  color: white;
}

.rejection-header {
  background: linear-gradient(135deg, #730302 0%, #262626 50%, #404040 100%);
  color: white;
}

.header-content {
  text-align: center;
  padding: 60px 40px;
}

.header-icon {
  margin-bottom: 20px;
  animation: bounce 2s infinite;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
}

.header-title {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.header-subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

/* ===== CONTENIDO DE LA TARJETA ===== */
.card-content {
  padding: 50px 40px;
}

/* ===== ALERTAS ===== */
.success-alert {
  background: linear-gradient(135deg, rgba(241, 7, 6, 0.1) 0%, rgba(198, 32, 42, 0.05) 100%);
  border: 2px solid rgba(241, 7, 6, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 40px;
}

.warning-alert {
  background: linear-gradient(135deg, rgba(115, 3, 2, 0.1) 0%, rgba(115, 3, 2, 0.05) 100%);
  border: 2px solid rgba(115, 3, 2, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 40px;
}

.alert-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 4px;
}

.alert-text {
  flex: 1;
}

.alert-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #262626;
  margin-bottom: 8px;
}

.alert-message {
  font-size: 1.1rem;
  color: #404040;
  line-height: 1.5;
  margin: 0;
}

/* ===== DETALLES DEL USUARIO ===== */
.user-details-section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #262626;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  text-align: center;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%);
  border: 2px solid #F2F2F2;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.detail-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(241, 7, 6, 0.1);
  border-color: rgba(241, 7, 6, 0.3);
}

.detail-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F10706 0%, #D0021B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #404040;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 1.1rem;
  font-weight: 500;
  color: #262626;
}

/* ===== NOTIFICACIÓN EMAIL ===== */
.email-notification {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(30, 136, 229, 0.05) 100%);
  border: 2px solid rgba(33, 150, 243, 0.2);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 40px;
}

.notification-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.notification-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 8px;
}

.notification-text {
  font-size: 1rem;
  color: #1976d2;
  line-height: 1.5;
  margin: 0;
}

/* ===== CONTADOR DE REDIRECCIÓN ===== */
.countdown-section {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(30, 136, 229, 0.05) 100%);
  border: 2px solid rgba(33, 150, 243, 0.2);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 40px;
}

.countdown-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.countdown-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 8px;
}

.countdown-text {
  font-size: 1rem;
  color: #1976d2;
  line-height: 1.5;
  margin: 0;
}

/* ===== COUNTDOWN SECTION ===== */
.countdown-section {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.05), rgba(255, 107, 122, 0.05));
  border: 2px solid rgba(220, 53, 69, 0.2);
  border-radius: 12px;
}

.countdown-text {
  color: #dc3545;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* ===== BOTONES DE ACCIÓN ===== */
.action-buttons {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.action-btn {
  height: 60px;
  border: none;
  border-radius: 16px;
  padding: 16px 24px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  text-decoration: none;
}

.primary-btn {
  background: linear-gradient(135deg, #dc3545, #ff6b7a);
  color: white;
  border: 3px solid #dc3545;
}

.primary-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(220, 53, 69, 0.4);
  filter: brightness(1.1);
}

.secondary-btn {
  background: linear-gradient(135deg, #A6A6A6 0%, #D9D9D9 100%);
  color: #262626;
  border: 3px solid #A6A6A6;
}

.secondary-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(166, 166, 166, 0.4);
  filter: brightness(1.1);
}

/* ===== FOOTER ===== */
.footer-section {
  text-align: center;
  border-top: 2px solid #F2F2F2;
  padding-top: 32px;
}

.footer-text {
  font-size: 1rem;
  font-weight: 500;
  color: #404040;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 8px;
}

.footer-copyright {
  font-size: 0.9rem;
  color: #A6A6A6;
  margin: 0;
}

/* ===== ANIMACIONES ===== */
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-12px);
  }
  60% {
    transform: translateY(-6px);
  }
}

/* ===== RESPONSIVE DESIGN ===== */
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
  
  .header-content {
    padding: 40px 24px;
  }
  
  .card-content {
    padding: 32px 24px;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .detail-item {
    padding: 16px;
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
    gap: 16px;
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
  
  .header-content {
    padding: 32px 16px;
  }
  
  .card-content {
    padding: 24px 16px;
  }
  
  .header-title {
    font-size: 1.5rem;
  }
  
  .header-subtitle {
    font-size: 1rem;
  }
  
  .section-title {
    font-size: 1.4rem;
    flex-direction: column;
    gap: 8px;
  }
}
</style>