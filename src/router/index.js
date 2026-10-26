import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/pos',
    name: 'TerminalPOS',
    component: () => import('../views/TerminalPOSView.vue'),
  },
  {
    path: '/inventario',
    name: 'Inventario',
    component: () => import('../views/InventarioView.vue'),
  },
  {
    path: '/inventario/proveedores',
    name: 'Proveedores',
    component: () => import('../views/ProveedoresView.vue'),
  },
  {
    path: '/inventario/kardex',
    name: 'Kardex',
    component: () => import('../views/KardexView.vue'),
  },
  {
    path: '/auditoria/sala-espera',
    name: 'SalaEspera',
    component: () => import('../views/SalaEsperaView.vue'),
  },
  {
    path: '/caja/arqueo',
    name: 'ArqueoCaja',
    component: () => import('../views/ArqueoCajaView.vue'),
  },
  {
    path: '/caja/historial-ventas',
    name: 'HistorialVentas',
    component: () => import('../views/HistorialVentasView.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
  },
  {
    path: '/admin/usuarios',
    name: 'Usuarios',
    component: () => import('../views/UsuariosView.vue'),
  },
  {
    path: '/admin/configuracion',
    name: 'Configuracion',
    component: () => import('../views/ConfiguracionView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
