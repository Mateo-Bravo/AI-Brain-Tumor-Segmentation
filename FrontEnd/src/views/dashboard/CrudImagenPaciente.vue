<template>
  <div class="crud-equipo-view">
    <!-- Header Medical -->
    <header class="medical-header">
      <div class="header-container">
        <div class="logo-section">
          <img src="@/assets/images/logo-uc-posgrado.png" alt="UC Posgrado" class="logo-image" />
        </div>
        <div class="header-right">
          <nav class="nav-menu">
            <a href="#" class="nav-link" @click="goToHome">Inicio</a>
            <a href="#" class="nav-link" @click="goToDashboard">Visor de imágenes</a>
            <a href="#" class="nav-link" @click="goToPanel">Panel</a>
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

    <!-- Main Content -->
    <div class="content-container">
      <h1 class="page-title">Administración de imagenes y pacientes</h1>

      <!-- Tabs -->
      <div class="admin-tabs">

        <button class="tab-btn" :class="{ active: activeTab === 'pacientes' }" @click="activeTab = 'pacientes'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Pacientes
        </button>

        <button class="tab-btn" :class="{ active: activeTab === 'imagenes', disabled: activeTab !== 'imagenes' }"
          :disabled="activeTab !== 'imagenes'" @click="activeTab = 'imagenes'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Imagenes
        </button>

      </div>

      <!-- Tabla de Equipos -->
      <div v-show="activeTab === 'imagenes'" class="table-section">
        <div class="section-header">
          <h2>Gestión de Imagenes</h2>
        </div>

        <div class="search-box">
          <input v-model="searchImagen" type="text" placeholder="Buscar imagen por nombre..." class="search-input" />
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Formato</th>
                <th>Tipo de archivo</th>
                <th>peso</th>
                <th>modalidad</th>
                <th>Usuario</th>
                <th>Paciente</th>
                <th>Razon clinica</th>
                <th>Fecha de subida</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="imagen in filtrarImagenes" :key="imagen.id">
                <td>{{ cleanFilename(imagen.filename) }}</td>
                <td>{{ imagen.format }}</td>
                <td>{{ cleanFileType(imagen.file_type) }}</td>
                <td>{{ formatFileSize(imagen.file_size) }}</td>
                <td>{{ imagen.modality }}</td>
                <td>{{ getUserName(imagen.user_id) }}</td>
                <td>{{ getPatientName(imagen.patient_id) }}</td>
                <td>{{ imagen.clinical_reason }}</td>
                <td>{{ formatDate(imagen.upload_date) }}</td>
                <td class="actions-cell">
                  <button class="btn-action btn-delete" @click="confirmDelete('imagen', imagen)">🗑 Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabla de pacientes -->
      <div v-show="activeTab === 'pacientes'" class="table-section">
        <div class="section-header">
          <h2>Gestión de Pacientes</h2>
          <button class="btn-add" @click="openAddModal('paciente')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Agregar Paciente
          </button>
        </div>

        <div class="search-box">
          <input v-model="searchPaciente" type="text" placeholder="Buscar paciente por nombre..."
            class="search-input" />
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Usuario</th>
                <th>Historia Clinica</th>
                <th>Edad</th>
                <th>Sexo</th>
                <th>Telefono</th>
                <th>Correo</th>
                <th>Direccion</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="paciente in filteredPacientes" :key="paciente.id">
                <td class="actions-cell">
                  <button class="btn-action btn-edit" @click="verImagenesDePaciente(paciente.id)">
                    Ver imágenes
                  </button>

                </td>
                <td>{{ paciente.full_name }}</td>
                <td>{{ paciente.identity_id }}</td>
                <td>{{ getUserName(paciente.user_id) }}</td>
                <td>{{ paciente.clinical_history }}</td>
                <td>{{ paciente.age }}</td>
                <td>{{ paciente.sex }}</td>
                <td>{{ paciente.phone }}</td>
                <td>{{ paciente.email }}</td>
                <td>{{ paciente.address }}</td>
                <td class="actions-cell">
                  <button class="btn-action btn-edit" @click="openEditModal('paciente', paciente)">✏️ Editar</button>
                  <button class="btn-action btn-delete" @click="confirmDelete('paciente', paciente)">🗑
                    Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 🔶 MODAL PRINCIPAL -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ modalTitle }}</h2>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Equipo -->
          <div v-if="modalType === 'imagen'" class="form-group">
            <label>ID de usuario</label>
            <input v-model="formData.user_id" type="text" class="form-input" placeholder="ID usuario" />
            <label>ID de usuario</label>
            <input v-model="formData.patient_id" type="text" class="form-input" placeholder="ID paciente" />
            <label>Razon clinica</label>
            <textarea v-model="formData.medical_reason" class="form-textarea" placeholder="Razon clinica"></textarea>
          </div>

          <!-- Paciente -->
          <div v-if="modalType === 'paciente'" class="form-group">
            <label>Nombre Completo</label>
            <input v-model="formData.full_name" type="text" class="form-input" placeholder="Nombre completo" />
            <label>DNI</label>
            <input v-model="formData.identity_id" type="text" class="form-input" placeholder="Rol del miembro" />
            <label>Historia clinica</label>
            <input v-model="formData.clinical_history" type="text" class="form-input"
              placeholder="Historia Clinica"></input>
            <label>Edad</label>
            <input v-model="formData.age" type="number" class="form-input" placeholder="Edad"></input>
            <label>Sexo</label>
            <input v-model="formData.sex" type="text" class="form-input" placeholder="Sexo"></input>
            <label>Telefono</label>
            <input v-model="formData.phone" type="number" class="form-input" placeholder="Telefono"></input>
            <label>Correo</label>
            <input v-model="formData.email" type="text" class="form-input" placeholder="Correo"></input>
            <label>Direccion</label>
            <input v-model="formData.address" type="text" class="form-input" placeholder="Correo"></input>
          </div>

          <!-- Categoría -->
          <div v-if="modalType === 'categoria'" class="form-group">
            <label>Nombre de la Categoría</label>
            <input v-model="formData.name" type="text" class="form-input" placeholder="Nombre de la categoría" />

            <!-- 🔧 Nuevo campo: selección de equipo -->
            <label>Equipo</label>
            <select v-model.number="formData.team_id" class="form-select">
              <option :value="null">Seleccionar equipo</option>
              <option v-for="eq in [...equipos].sort((a, b) => a.name.localeCompare(b.name))" :key="eq.id"
                :value="eq.id">
                {{ eq.name }}
              </option>
            </select>

            <!-- 🔧 Buscador de iconos -->
            <label>Seleccionar Icono</label>
            <div class="icon-search-box">
              <input v-model="iconSearch" type="text" class="form-input icon-search-input"
                placeholder="Buscar icono (ej. heart, school, code)" />
              <svg class="search-icon-small" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>

            <!-- 🔧 Selector visual de iconos -->
            <div class="icon-picker-container">
              <div class="icon-grid-emoji">
                <div v-for="icon in filteredIcons" :key="icon.name" class="icon-item-emoji"
                  :class="{ selected: formData.icon === icon.name }" @click="formData.icon = icon.name"
                  :title="icon.name.replace('mdi', '').replace(/-/g, ' ')">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                    <path :d="icon.path" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- 🔧 Previsualización del icono elegido -->
            <div v-if="formData.icon" class="selected-icon-display">
              <span class="selected-label">Icono seleccionado:</span>
              <div class="selected-icon-box">
                <svg v-if="getMdiPath(formData.icon)" viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                  <path :d="getMdiPath(formData.icon)" />
                </svg>
                <span v-else>{{ formData.icon }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">Cancelar</button>
          <button class="btn-save" @click="saveData">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content modal-small" @click.stop>
        <div class="modal-header">
          <h2>Confirmar Eliminación</h2>
          <button class="close-btn" @click="closeDeleteModal">&times;</button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro que desea eliminar este registro?</p>
          <p class="warning-text" v-if="modalType === 'imagen'">Esta acción no se puede deshacer.</p>
          <p class="warning-text" v-if="modalType === 'paciente'">
            <template v-if="pacienteEliminarNombre === 'Consulta'">
              Se eliminará esta consulta y su imagen relacionada, esta acción es permanente.
            </template>

            <template v-else>
              Se eliminará el paciente <strong>{{ pacienteEliminarNombre }}</strong> y sus
              <strong>{{ pacienteEliminarTotalImagenes }}</strong> imágenes relacionadas,
              esta acción es permanente.
            </template>
          </p>


        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeDeleteModal">Cancelar</button>
          <button class="btn-delete-confirm" @click="deleteData">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="medical-footer">
      <p>&copy; 2025 Universidad Católica de Cuenca</p>
    </footer>
  </div>
</template>

<script setup>
import { cleanFilename, cleanFileType, formatDate, formatFileSize } from '@/utils/formatters'
import * as mdi from '@mdi/js'
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

// 🔧 Helpers seguros para nombres de íconos MDI
const isKebab = (v) => /^mdi-[a-z0-9-]+$/.test(v || '')
const isCamel = (v) => /^mdi[A-Z]/.test(v || '')

const toKebab = (v) => {
  if (!v) return ''
  if (isKebab(v)) return v
  if (isCamel(v)) {
    return 'mdi-' + v.slice(3).replace(/([A-Z])/g, '-$1').toLowerCase()
  }
  return v
}

const toCamel = (v) => {
  if (!v) return ''
  if (isCamel(v)) return v
  const core = v.replace(/^mdi-/, '')
  return 'mdi' + core.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
}

const getMdiPath = (name) => {
  if (!name) return null
  if (mdi[name]) return mdi[name]
  const camel = toCamel(name)
  return mdi[camel] || null
}

const getPatientName = (patientId) => {
  const p = pacientes.value.find(x => x.id === patientId)
  return p ? p.full_name : "Sin paciente"
}
const getUserName = (userId) => {
  const u = usuarios.value.find(x => x.id === userId)
  return u ? u.full_name : "Sin usuario"
}


/*para el axioss*/

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const router = useRouter()

// Estado usuario
const currentUser = ref(null)
const userMenuActive = ref(false)

// Tabs
const activeTab = ref('pacientes')

// Búsquedas
const searchImagen = ref('')
const searchPaciente = ref('')


// Datos
const equipos = ref([])
const imagenes = ref([])
const pacientes = ref([])
const usuarios = ref([])

// Modales
const showModal = ref(false)
const showDeleteModal = ref(false)
const modalType = ref('')
const modalMode = ref('add')
const formData = ref({})
const itemToDelete = ref(null)
const pacienteEliminarNombre = ref("")
const pacienteEliminarTotalImagenes = ref(0)


// Imagen
const imageInput = ref(null)
const imagePreview = ref(null)
const imageFileName = ref('')
const imageFile = ref(null)

// === Icon Picker ===
const iconSearch = ref('')

// Iconos populares y comunes
const popularIcons = [
  'mdiHeart', 'mdiHeartPulse', 'mdiSchool', 'mdiCodeBraces', 'mdiAccount',
  'mdiAccountGroup', 'mdiAccountStar', 'mdiDoctor', 'mdiStethoscope',
  'mdiHospitalBox', 'mdiMedicalBag', 'mdiNeedle', 'mdiPill', 'mdiTestTube',
  'mdiDna', 'mdiMicroscope', 'mdiClipboardPulse', 'mdiAmbulance', 'mdiHome',
  'mdiOfficeBuilding', 'mdiFlask', 'mdiChartLine', 'mdiCog', 'mdiTools',
  'mdiLaptop', 'mdiCellphone', 'mdiEmail', 'mdiCalendar', 'mdiClock',
  'mdiStar', 'mdiFlag', 'mdiBookOpen', 'mdiPencil', 'mdiCamera',
  'mdiImage', 'mdiMusic', 'mdiVideo', 'mdiFileDocument', 'mdiFolder',
  'mdiCloud', 'mdiDatabase', 'mdiServer', 'mdiLock', 'mdiShield',
  'mdiCart', 'mdiCreditCard', 'mdiCash', 'mdiGift', 'mdiTrophy',
  'mdiMedal', 'mdiBriefcase', 'mdiChartBar', 'mdiTrendingUp', 'mdiTarget'
]

const mdiIcons = computed(() => {
  // Filtrar solo iconos que existen en la librería
  return Object.keys(mdi)
    .filter(name => name.startsWith('mdi') && mdi[name])
    .map(name => ({
      name,
      path: mdi[name],
    }))
})

const filteredIcons = computed(() => {
  const q = iconSearch.value.toLowerCase().trim()

  if (!q) {
    // Mostrar iconos populares primero si no hay búsqueda
    const popular = mdiIcons.value.filter(i => popularIcons.includes(i.name))
    const others = mdiIcons.value.filter(i => !popularIcons.includes(i.name)).slice(0, 150)
    return [...popular, ...others]
  }

  return mdiIcons.value
    .filter(i => i.name.toLowerCase().includes(q))
    .slice(0, 200)
})

// =============== Computed ===============
const userInitials = computed(() => {
  if (!currentUser.value?.full_name) return ''
  return currentUser.value.full_name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
})

const modalTitle = computed(() => {
  const action = modalMode.value === 'add' ? 'Agregar' : 'Editar'
  const entity =
    modalType.value === 'imagen'
      ? 'imagen'
      : modalType.value === 'paciente'
        ? 'paciente'
        : 'Categoría'
  return `${action} ${entity}`
})

const filteredImagenes = computed(() => {
  const q = searchImagen.value.trim().toLowerCase()
  if (!q) return imagenes.value
  return imagenes.value.filter((e) => (e.filename || '').toLowerCase().includes(q))
})

const filteredPacientes = computed(() => {
  const q = searchPaciente.value.trim().toLowerCase()
  if (!q) return pacientes.value
  return pacientes.value.filter((m) => (m.full_name || '').toLowerCase().includes(q))
})


// =============== Métodos UI ===============
const toggleUserMenu = () => (userMenuActive.value = !userMenuActive.value)

const logout = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('currentUser')
  router.push('/login')
}
const goToHome = () => router.push('/')
const goToDashboard = () => router.push('/dashboard')
const goToPanel = () => {
  router.push('/panel-administrador')
}


const removeImage = () => {
  imageFile.value = null
  imageFileName.value = ''
  if (imagePreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }
  imagePreview.value = null
  if (imageInput.value) imageInput.value.value = ''

  if (modalMode.value === 'edit') {
    formData.value.deletePhoto = true
    formData.value.photo = null
  }
}

// =============== Fetchers ===============

const fetchImagenes = async () => {
  try {
    const { data } = await api.get('/images/')
    imagenes.value = Array.isArray(data.images)
      ? data.images.sort((a, b) => a.filename.localeCompare(b.filename))
      : []

  } catch (e) {
    console.error('Error fetching images:', e)
  }
}

const uploadImage = async (file, patientId) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('patient_id', patientId)

  const response = await api.post('/images/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  return response.data.image_id
}

const runSegmentation = async (imageId, file) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(
    `/diagnosis/run-nnunet/${imageId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

  return response.data
}

const uploadAndSegment = async () => {
  if (!imageFile.value || !idPatientSelected.value) {
    alert('Seleccione un paciente y una imagen')
    return
  }

  try {
    // 1. Subir imagen
    const imageId = await uploadImage(
      imageFile.value,
      idPatientSelected.value
    )

    // 2. Ejecutar IA
    const result = await runSegmentation(imageId, imageFile.value)

    // 3. Refrescar lista
    await fetchImagenes()

    // 4. Ir al visor
    router.push({
      name: 'visor-cornerstone',
      params: { imageId }
    })

  } catch (error) {
    console.error(error)
    alert('❌ Error ejecutando la segmentación')
  }
}


const fetchPacientes = async () => {
  try {
    const { data } = await api.get('/patients/')
    pacientes.value = Array.isArray(data)
      ? data.sort((a, b) => a.full_name.localeCompare(b.full_name))
      : []
  } catch (e) {
    console.error('Error fetching pacientes:', e)
  }
}

const fetchUsuarios = async () => {
  try {
    const { data } = await api.get('/users/')
    usuarios.value = Array.isArray(data)
      ? data.sort((a, b) => a.full_name.localeCompare(b.full_name))
      : []
  } catch (e) {
    console.error('Error fetching miembros:', e)
  }
}

const verImagenesDePaciente = (id) => {
  idPatientSelected.value = id;
  activeTab.value = "imagenes";
};



// =============== Modales ===============
const openAddModal = (type) => {
  modalType.value = type
  modalMode.value = 'add'
  formData.value = {}
  iconSearch.value = ''
  removeImage()
  showModal.value = true
}

const idPatientSelected = ref(0)

const filtrarImagenes = computed(() => {
  const patientId = idPatientSelected.value

  if (!patientId) return imagenes.value

  return imagenes.value.filter(img => img.patient_id === patientId)
})



const openEditModal = (type, item) => {
  modalType.value = type
  modalMode.value = 'edit'
  formData.value = { ...item }
  iconSearch.value = ''

  if (type === 'miembro' && item?.photo) {
    imagePreview.value = getImageUrl(item.photo)
    imageFileName.value = item.photo
    imageFile.value = null
  } else {
    removeImage()
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  formData.value = {}
  iconSearch.value = ''
  removeImage()
}

const confirmDelete = (type, item) => {
  modalType.value = type
  itemToDelete.value = item
  showDeleteModal.value = true

  if (type === "paciente") {
    pacienteEliminarNombre.value = item.full_name

    pacienteEliminarTotalImagenes.value = imagenes.value.filter(
      img => img.patient_id === item.id
    ).length
  }
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  itemToDelete.value = null
}

// =============== Guardar / Eliminar ===============
const saveData = async () => {
  try {
    let endpoint = ''
    let res


    if (modalType.value === 'paciente') {

      const payload = {
        full_name: formData.value.full_name || '',
        identity_id: formData.value.identity_id || '',
        clinical_history: formData.value.clinical_history || '',
        age: formData.value.age || '',
        sex: formData.value.sex || '',
        phone: formData.value.phone || '',
        email: formData.value.email || '',
        address: formData.value.address || '',
      }

      if (modalMode.value === 'add') {
        endpoint = `/patients/`;
      }

      if (modalMode.value === 'edit') {
        endpoint = `/patients/by-id/${formData.value.id}`;
      }

      res =
        modalMode.value === 'edit'
          ? await api.put(endpoint, payload)
          : await api.post(endpoint, payload)

    }

    if (modalType.value === 'imagen') await fetchImagenes()
    if (modalType.value === 'paciente') await fetchPacientes()

    closeModal()
    alert('✅ Datos guardados exitosamente')
    return res?.data

  } catch (error) {
    const network = !error.response
    console.error('[SAVE] error:', error)
    console.error('[SAVE] config:', error.config)

    if (!network) {
      console.error('[SAVE] status:', error.response.status)
      console.error('[SAVE] data:', error.response.data)
      console.error('[SAVE] headers:', error.response.headers)
    }

    let msg = 'Error al guardar los datos: '

    if (error.response?.data?.detail) {
      if (Array.isArray(error.response.data.detail)) {
        msg += error.response.data.detail
          .map((e) => `(${e.loc?.join('.')}) ${e.msg}`)
          .join(', ')
      } else {
        msg += error.response.data.detail
      }
    } else if (error.response?.data?.message) {
      msg += error.response.data.message
    } else if (error.message) {
      msg += error.message
    } else {
      msg += 'Error desconocido'
    }

    if (network) {
      msg +=
        '\n• Revisa CORS en el backend (métodos: POST, PUT; headers; credenciales si aplica).'
    }

    alert(msg)
  }
}

const deleteData = async () => {
  try {
    let endpoint = ''
    if (modalType.value === 'imagen') endpoint = `/images/delete/${itemToDelete.value.id}`
    if (modalType.value === 'paciente') endpoint = `/patients/by-id/${itemToDelete.value.id}`

    await api.delete(endpoint)

    if (modalType.value === 'imagen') await fetchImagenes()
    if (modalType.value === 'paciente') await fetchPacientes()

    closeDeleteModal()
    alert('Registro eliminado exitosamente')
  } catch (e) {
    console.error('Error deleting:', e)
    alert('Error al eliminar el registro')
  }
}

// =============== Imagen: URL y eventos ===============
const getImageUrl = (photoFilename) => {
  if (!photoFilename) return ''
  if (/^https?:\/\//i.test(photoFilename)) return photoFilename
  if (photoFilename.startsWith('@/')) {
    try {
      return new URL(`../assets/${photoFilename.replace('@/', '')}`, import.meta.url).href
    } catch {
      return ''
    }
  }
  const base = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${base}/images/${encodeURIComponent(photoFilename)}`
}


// =============== Lifecycle ===============
const loadUser = () => {
  const raw = localStorage.getItem('currentUser')
  if (!raw) return
  try {
    currentUser.value = JSON.parse(raw)
  } catch (e) {
    console.error('currentUser corrupto:', e)
  }
}

const fetchData = async () => {
  await Promise.all([fetchImagenes(), fetchPacientes(), fetchUsuarios()])
}

onMounted(() => {
  loadUser()
  fetchData()
})
</script>

<style scoped>
.crud-equipo-view {
  background: #1a1a1a;
  color: #fff;
  min-height: 100vh
}

.medical-header {
  background: rgba(0, 0, 0, .95);
  backdrop-filter: blur(10px);
  padding: 15px 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  border-bottom: 1px solid rgba(30, 64, 175, .2)
}

.header-container {
  max-width: 1500px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px
}

.logo-image {
  height: 40px;
  width: auto
}

.header-right {
  display: flex;
  align-items: center;
  gap: 30px
}

.nav-menu {
  display: flex;
  gap: 25px
}

.nav-link {
  color: #ccc;
  text-decoration: none;
  font-weight: 500;
  transition: .3s;
  cursor: pointer;
  position: relative
}

.nav-link:hover {
  color: #c6202a
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 0;
  width: 0;
  height: 2px;
  background: #c6202a;
  transition: width .3s
}

.nav-link:hover::after {
  width: 100%
}

.user-menu-container {
  position: relative
}

.user-icon {
  width: 40px;
  height: 40px;
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: .3s
}

.user-icon:hover {
  background: rgba(255, 255, 255, .1);
  transform: scale(1.05)
}

.user-dropdown {
  position: absolute;
  top: 50px;
  right: 0;
  background: #2b2b2b;
  border: 2px solid #404040;
  border-radius: 8px;
  width: 200px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, .3);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: .3s
}

.user-dropdown.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0)
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 20px;
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid #404040;
  transition: .3s;
  cursor: pointer
}

.dropdown-item:last-child {
  border-bottom: none
}

.dropdown-item:hover {
  background: #404040;
  color: #c6202a;
  transform: translateX(5px)
}

.dropdown-item svg {
  width: 18px;
  height: 18px
}

.content-container {
  max-width: 1500px;
  margin: 0 auto;
  padding: 100px 20px 40px
}

.page-title {
  font-size: 3rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f10706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.admin-tabs {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  justify-content: center;
  flex-wrap: wrap
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: rgba(43, 43, 43, .8);
  border: 2px solid rgba(255, 255, 255, .1);
  border-radius: 8px;
  color: #ccc;
  font-weight: 600;
  cursor: pointer;
  transition: .3s
}

.tab-btn:hover {
  background: rgba(220, 53, 69, .1);
  border-color: rgba(220, 53, 69, .3);
  color: #fff;
  transform: translateY(-2px)
}

.tab-btn.disabled {
  background: rgba(80, 80, 80, 0.3);
  border-color: rgba(255, 255, 255, 0.05);
  color: #555;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none !important;
}

.tab-btn.disabled:hover {
  background: rgba(80, 80, 80, 0.3);
  color: #555;
  border-color: rgba(255, 255, 255, 0.05);
  transform: none;
}


.tab-btn.active {
  background: #c6202a;
  border-color: #c6202a;
  color: #fff;
  box-shadow: 0 4px 15px rgba(198, 32, 42, .3)
}

.table-section {
  background: #2b2b2b;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, .3);
  border: 1px solid #404040
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px
}

.section-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #c6202a
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #c6202a;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: .3s
}

.btn-add:hover {
  background: #a61a22;
  transform: translateY(-2px);
  box-shadow: 0 0 0 3px rgba(198, 32, 42, .1)
}

.search-box {
  position: relative;
  margin-bottom: 25px
}

.search-input {
  width: 100%;
  padding: 12px 45px 12px 15px;
  background: #404040;
  border: 1px solid #666;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  transition: .3s
}

.search-input:focus {
  outline: none;
  border-color: #c6202a;
  box-shadow: 0 0 0 3px rgba(198, 32, 42, .1)
}

.search-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  pointer-events: none
}

.table-container {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 500px;
  border-radius: 8px;
  border: 1px solid #404040
}

.data-table {
  width: 100%;
  border-collapse: collapse
}

.data-table thead {
  position: sticky;
  top: 0;
  background: #303030;
  z-index: 10
}

.data-table th {
  padding: 15px;
  text-align: left;
  color: #c6202a;
  font-weight: 600;
  text-transform: uppercase;
  font-size: .9rem;
  border-bottom: 2px solid #404040
}

.data-table td {
  padding: 15px;
  border-bottom: 1px solid #333;
  color: #ccc
}

.data-table tbody tr {
  transition: background .2s
}

.data-table tbody tr:hover {
  background: #333
}

.member-image-preview {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #404040;
  opacity: 0;
  transition: opacity .3s
}

.member-image-preview[style*="opacity: 1"] {
  opacity: 1
}

.icon-preview-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c6202a;
}

.icon-preview-cell svg {
  filter: drop-shadow(0 2px 4px rgba(198, 32, 42, 0.3));
}

.no-image,
.no-icon {
  color: #888;
  font-style: italic;
  font-size: .85rem
}

.actions-cell {
  display: flex;
  gap: 10px;
  align-items: center
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: .85rem;
  font-weight: 600;
  cursor: pointer;
  transition: .3s
}

.btn-edit {
  background: #0d6efd;
  color: #fff
}

.btn-edit:hover {
  background: #0a58ca;
  transform: translateY(-2px)
}

.btn-delete {
  background: #dc3545;
  color: #fff
}

.btn-delete:hover {
  background: #c82333;
  transform: translateY(-2px)
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, .8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn .3s
}

.modal-content {
  background: #2b2b2b;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #404040;
  animation: slideIn .3s
}

.modal-small {
  max-width: 400px
}

.modal-header {
  padding: 20px 25px;
  border-bottom: 1px solid #404040;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #c6202a
}

.modal-header h2 {
  color: #fff;
  margin: 0;
  font-size: 1.5rem
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #fff;
  cursor: pointer;
  transition: transform .2s
}

.close-btn:hover {
  transform: scale(1.1)
}

.modal-body {
  padding: 25px
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 15px
}

.form-group label {
  color: #ccc;
  font-weight: 600;
  font-size: .95rem
}

.form-input,
.form-textarea,
.form-select {
  padding: 12px;
  background: #404040;
  border: 1px solid #666;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  transition: .3s
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #c6202a;
  box-shadow: 0 0 0 3px rgba(198, 32, 42, .1)
}

.form-textarea {
  min-height: 100px;
  resize: vertical
}

.image-upload-container {
  display: flex;
  flex-direction: column;
  gap: 15px
}

.file-input {
  display: none
}

.file-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #404040;
  border: 2px dashed #666;
  border-radius: 8px;
  color: #ccc;
  font-weight: 600;
  cursor: pointer;
  transition: .3s;
  text-align: center;
  justify-content: center
}

.file-label:hover {
  border-color: #c6202a;
  background: rgba(198, 32, 42, .1);
  color: #fff
}

.image-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: #404040;
  border-radius: 8px
}

.image-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  border: 2px solid #666
}

.btn-remove-image {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #dc3545;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: .3s
}

.btn-remove-image:hover {
  background: #c82333;
  transform: translateY(-2px)
}

/* Icon Picker Styles - Estilo Emoji */
.icon-search-box {
  position: relative;
  margin-bottom: 10px;
}

.icon-search-input {
  padding-right: 40px;
}

.search-icon-small {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  pointer-events: none;
}

.icon-picker-container {
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 8px;
  padding: 15px;
  max-height: 350px;
  overflow-y: auto;
}

.icon-grid-emoji {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 8px;
}

.icon-item-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: #2b2b2b;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all .2s;
  color: #888;
  padding: 8px;
}

.icon-item-emoji:hover {
  background: #404040;
  color: #fff;
  transform: scale(1.1);
  border-color: #666;
}

.icon-item-emoji.selected {
  background: #c6202a;
  color: #fff;
  border-color: #c6202a;
  box-shadow: 0 0 0 3px rgba(198, 32, 42, 0.2);
}

.icon-item-emoji svg {
  width: 100%;
  height: 100%;
  max-width: 28px;
  max-height: 28px;
}

.selected-icon-display {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #1a1a1a;
  border: 2px solid #c6202a;
  border-radius: 8px;
  margin-top: 15px;
}

.selected-label {
  color: #ccc;
  font-weight: 600;
  font-size: 0.9rem;
}

.selected-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c6202a;
  border-radius: 8px;
  padding: 10px;
  color: #fff;
}

.warning-text {
  color: #ff6b6b;
  font-weight: 600;
  text-align: center;
  margin-top: 10px
}

.modal-footer {
  padding: 20px 25px;
  border-top: 1px solid #404040;
  display: flex;
  justify-content: flex-end;
  gap: 15px
}

.btn-cancel,
.btn-save,
.btn-delete-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: .3s
}

.btn-cancel {
  background: #666;
  color: #fff
}

.btn-cancel:hover {
  background: #555
}

.btn-save {
  background: #28a745;
  color: #fff
}

.btn-save:hover {
  background: #218838;
  transform: translateY(-2px)
}

.btn-delete-confirm {
  background: #dc3545;
  color: #fff
}

.btn-delete-confirm:hover {
  background: #c82333;
  transform: translateY(-2px)
}

.medical-footer {
  background: #2b2b2b;
  text-align: center;
  padding: 20px;
  color: #ccc;
  border-top: 1px solid #404040;
  margin-top: 40px
}

@keyframes fadeIn {
  from {
    opacity: 0
  }

  to {
    opacity: 1
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px)
  }

  to {
    opacity: 1;
    transform: translateY(0)
  }
}

/* Scrollbar personalizado para el picker de iconos */
.icon-picker-container::-webkit-scrollbar {
  width: 8px;
}

.icon-picker-container::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 4px;
}

.icon-picker-container::-webkit-scrollbar-thumb {
  background: #c6202a;
  border-radius: 4px;
}

.icon-picker-container::-webkit-scrollbar-thumb:hover {
  background: #a61a22;
}

@media (max-width:768px) {
  .page-title {
    font-size: 1.8rem
  }

  .admin-tabs {
    flex-direction: column
  }

  .section-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start
  }

  .table-container {
    max-height: 400px
  }

  .data-table th,
  .data-table td {
    padding: 10px;
    font-size: .85rem
  }

  .actions-cell {
    flex-direction: column
  }

  .modal-content {
    width: 95%
  }

  .icon-grid-emoji {
    grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
    gap: 6px;
  }

  .icon-item-emoji svg {
    max-width: 24px;
    max-height: 24px;
  }

  .descripcion-cell {
    max-width: 280px;
    white-space: normal;
    word-break: break-word;
  }

  .text-muted {
    color: #aaa;
    font-style: italic;
  }
}
</style>