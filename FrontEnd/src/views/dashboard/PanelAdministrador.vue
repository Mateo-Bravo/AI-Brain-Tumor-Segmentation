<template>
    <div class="panel-administrador">
        <!-- Header Medical (same style as LandingPage) -->
        <header class="medical-header">
            <div class="header-container">
                <div class="logo-section">
                    <img src="@/assets/images/logo-uc-posgrado.png" alt="UC Posgrado" class="logo-image" />
                </div>
                <div class="header-right">
                    <nav class="nav-menu">
                        <a href="/" class="nav-link">Inicio</a>
                        <a href="/dashboard" class="nav-link">Visor de Imágenes</a>
                        <a href="#" class="nav-link active">Panel</a>
                    </nav>

                    <div class="user-menu-container">
                        <div class="user-icon" @click="toggleUserMenu">
                            <div v-if="userInitials"
                                class="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                                {{ userInitials }}
                            </div>

                            <!-- Menú desplegable del usuario -->
                            <div class="user-dropdown" :class="{ active: showUserMenu }">
                                <a href="#" class="dropdown-item" @click="logout">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16,17 21,12 16,7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Cerrar Sesión
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="panel-content">
            <div class="panel-container">
                <h1 class="panel-title">Panel de Administración</h1>
                <p class="panel-subtitle">
                    Gestiona y administra todos los aspectos del sistema desde un solo lugar
                </p>

                <!-- Grid de opciones administrativas -->
                <div class="admin-grid">
                    <!-- Card 1: Gestión de Equipo (FUNCIONAL) -->
                    <div class="admin-card" @click="goToEquipo">
                        <div class="card-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <h3 class="card-title">Gestión de Equipo</h3>
                        <p class="card-description">
                            Administra los miembros del equipo médico y técnico
                        </p>
                    </div>

                    <!-- Card 2: Análisis Automatizado (Funcional) -->
                    <div class="admin-card" @click="goToUsuario">
                        <div class="card-icon">
                            <svg width="80" height="80" viewBox="-4 -7 40 40" fill="none" stroke="currentColor"
                                stroke-width="2" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                                <g transform="translate(22,6) scale(1.2)">
                                    <path d="M3 0v6"></path>
                                    <path d="M0 3h6"></path>
                                </g>
                                <g transform="translate(22,14) scale(1.2)">
                                    <path d="M0 3h6"></path>
                                </g>
                            </svg>

                        </div>
                        <h3 class="card-title">Gestión de Usuarios</h3>
                        <p class="card-description">
                            Administra los usuarios
                        </p>
                    </div>

                    <!-- Card 3: Localizar y Visualizar (PRÓXIMAMENTE) -->
                    <div class="admin-card" @click="goToImagePatient">
                        <div class="card-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </div>
                        <h3 class="card-title">Imagenes y pacientes</h3>
                        <p class="card-description">
                            Gestiona imagenes y pacientes
                        </p>
                    </div>

                    <!-- Card 4: Seguridad (PRÓXIMAMENTE) -->
                    <div class="admin-card disabled">
                        <div class="card-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h3 class="card-title">Seguridad de la Plataforma</h3>
                        <p class="card-description">
                            Administra permisos, roles y configuración de seguridad
                        </p>
                        <span class="badge-soon">Próximamente</span>
                    </div>

                    <!-- Card 5: Reportes PDF (PRÓXIMAMENTE) -->
                    <div class="admin-card disabled">
                        <div class="card-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10,9 9,9 8,9"></polyline>
                            </svg>
                        </div>
                        <h3 class="card-title">Reportes PDF</h3>
                        <p class="card-description">
                            Configura plantillas y genera reportes médicos
                        </p>
                        <span class="badge-soon">Próximamente</span>
                    </div>

                    <!-- Card 6: Historial Trazable (PRÓXIMAMENTE) -->
                    <div class="admin-card disabled">
                        <div class="card-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                        </div>
                        <h3 class="card-title">Historial Trazable</h3>
                        <p class="card-description">
                            Revisa el registro completo de análisis realizados
                        </p>
                        <span class="badge-soon">Próximamente</span>
                    </div>
                </div>
            </div>
            <footer class="medical-footer">
                <p>&copy; 2025 Copyright - Universidad Católica de Cuenca</p>
            </footer>
        </main>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentUser = ref(null)
const showUserMenu = ref(false)

// Computed property para las iniciales del usuario
const userInitials = computed(() => {
    if (!currentUser.value?.full_name) return ""
    return currentUser.value.full_name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
})

// Toggle del menú de usuario
const toggleUserMenu = () => {
    showUserMenu.value = !showUserMenu.value
}

// Navegación a CrudEquipo
const goToEquipo = () => {
    router.push('/crud-equipo')
}
const goToUsuario = () => {
    router.push('/crud-usuario')
}
const goToImagePatient = () => {
    router.push('/crud-imagen-paciente')
}
// Cerrar sesión
const logout = () => {
    console.log('Cerrando sesión...')
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
    alert('Sesión cerrada exitosamente')
    router.push('/')
}

// Cargar usuario desde localStorage
const loadUserFromLocalStorage = () => {
    const userData = localStorage.getItem("currentUser")
    if (userData) {
        try {
            currentUser.value = JSON.parse(userData)

            // Verificar que sea administrador
            if (currentUser.value.role !== 'Administrador') {
                alert('Acceso denegado. Solo administradores pueden acceder a este panel.')
                router.push('/')
            }
        } catch (e) {
            console.error("Error parsing currentUser:", e)
            router.push('/login')
        }
    } else {
        router.push('/login')
    }
}

// Cerrar menú al hacer clic fuera
const handleClickOutside = (event) => {
    const userContainer = document.querySelector('.user-menu-container')
    if (userContainer && !userContainer.contains(event.target)) {
        showUserMenu.value = false
    }
}

onMounted(() => {
    loadUserFromLocalStorage()
    document.addEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.panel-administrador {
    background: #1a1a1a;
    color: #ffffff;
    min-height: 100vh;
}

/* HEADER (same style as LandingPage) */
.medical-header {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
    padding: 15px 0;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    border-bottom: 1px solid rgba(30, 64, 175, 0.2);
}

.medical-footer {
    background: #2b2b2b;
    text-align: center;
    padding: 20px;
    color: #ccc;
    border-top: 1px solid #404040;
    margin-top: 40px
}

.header-container {
    max-width: 1500px;
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
    color: #f10706;
}

.nav-link.active {
    color: #f10706;
}

.nav-link::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 0;
    width: 0;
    height: 2px;
    background: #f10706;
    transition: width 0.3s ease;
}

.nav-link:hover::after,
.nav-link.active::after {
    width: 100%;
}

.user-menu-container {
    position: relative;
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
    border-color: #f10706;
    transform: scale(1.05);
}

.user-dropdown {
    position: absolute;
    top: 50px;
    right: 0;
    background: rgba(0, 0, 0, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    min-width: 200px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.user-dropdown.active {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    color: #cccccc;
    text-decoration: none;
    transition: all 0.3s ease;
}

.dropdown-item:hover {
    background: rgba(241, 7, 6, 0.1);
    color: #f10706;
}

/* MAIN CONTENT */
.panel-content {
    padding-top: 100px;
    min-height: 100vh;
}

.panel-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 20px;
}

.panel-title {
    font-size: 3rem;
    font-weight: 700;
    text-align: center;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #ffffff 0%, #f10706 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.panel-subtitle {
    text-align: center;
    font-size: 1.2rem;
    color: #cccccc;
    margin-bottom: 60px;
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
}

/* ADMIN GRID */
.admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 30px;
    margin-top: 40px;
}

.admin-card {
    background: rgba(30, 30, 30, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 40px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.admin-card:not(.disabled):hover {
    transform: translateY(-5px);
    border-color: #f10706;
    box-shadow: 0 10px 40px rgba(241, 7, 6, 0.3);
}

.admin-card.disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.admin-card.disabled:hover {
    transform: none;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: none;
}

.card-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #f10706 0%, #c10505 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    transition: all 0.3s ease;
}

.admin-card:not(.disabled):hover .card-icon {
    transform: scale(1.1) rotate(5deg);
}

.admin-card.disabled .card-icon {
    background: linear-gradient(135deg, #555555 0%, #333333 100%);
}

.card-icon svg {
    color: white;
}

.card-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 12px;
    color: #ffffff;
}

.card-description {
    font-size: 1rem;
    color: #cccccc;
    line-height: 1.6;
}

.badge-soon {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(241, 7, 6, 0.2);
    color: #f10706;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid rgba(241, 7, 6, 0.3);
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .admin-grid {
        grid-template-columns: 1fr;
    }

    .panel-title {
        font-size: 2rem;
    }

    .panel-subtitle {
        font-size: 1rem;
    }

    .nav-menu {
        display: none;
    }
}
</style>