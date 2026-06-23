import { createRouter, createWebHistory } from "vue-router"

// ======== DASHBOARD ========
import DashboardView from "@/views/dashboard/DashboardView.vue"

// ======== CRUD ========
import CrudEquipo from "@/views/dashboard/CrudEquipo.vue"
import CrudUsuario from "@/views/dashboard/CrudUsuario.vue"
import CrudImagenPaciente from "@/views/dashboard/CrudImagenPaciente.vue"

// ======== SISTEMA ========
import PanelAdministrador from "@/views/dashboard/PanelAdministrador.vue"

// ======== VISOR MÉDICO ========
import VisorcornerstonejsView from "@/views/dashboard/VisorcornerstonejsView.vue"

const routes = [
  // ======== HOME ========
  {
    path: "/",
    name: "Dashboard",
    component: DashboardView,
  },

  // ======== CRUD ========
  {
    path: "/crud-equipo",
    name: "CrudEquipo",
    component: CrudEquipo,
  },
  {
    path: "/crud-usuario",
    name: "CrudUsuario",
    component: CrudUsuario,
  },
  {
    path: "/crud-imagen-paciente",
    name: "CrudImagenPaciente",
    component: CrudImagenPaciente,
  },

  // ======== PANEL ========
  {
    path: "/panel-administrador",
    name: "PanelAdministrador",
    component: PanelAdministrador,
  },

  // ======== VISOR (CORRECTO) ========
  {
    path: "/visor/:imageId",
    name: "visor-cornerstone",
    component: VisorcornerstonejsView,
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 🔓 Sin guards por ahora (correcto para desarrollo)
router.beforeEach((to, from, next) => {
  next()
})

export default router
