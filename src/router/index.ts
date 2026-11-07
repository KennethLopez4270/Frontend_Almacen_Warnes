import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/modules/seguridad/views/LoginView.vue'),
  },
  {
    path: '/pos',
    name: 'TerminalPOS',
    component: () => import('@/modules/ventas/views/TerminalPOSView.vue'),
  },
  {
    path: '/inventario',
    name: 'Inventario',
    component: () => import('@/modules/inventario/views/InventarioView.vue'),
  },
  {
    path: '/inventario/proveedores',
    name: 'Proveedores',
    component: () => import('@/modules/proveedores/views/ProveedoresView.vue'),
  },
  {
    path: '/inventario/kardex',
    name: 'Kardex',
    component: () => import('@/modules/inventario/views/KardexView.vue'),
  },
  {
    path: '/auditoria/sala-espera',
    name: 'SalaEspera',
    component: () => import('@/modules/inventario/views/SalaEsperaView.vue'),
  },
  {
    path: '/caja/arqueo',
    name: 'ArqueoCaja',
    component: () => import('@/modules/caja/views/ArqueoCajaView.vue'),
  },
  {
    path: '/caja/historial-ventas',
    name: 'HistorialVentas',
    component: () => import('@/modules/ventas/views/HistorialVentasView.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/modules/dashboard/views/DashboardView.vue'),
  },
  {
    path: '/admin/usuarios',
    name: 'Usuarios',
    component: () => import('@/modules/seguridad/views/UsuariosView.vue'),
  },
  {
    path: '/admin/configuracion',
    name: 'Configuracion',
    component: () => import('@/modules/configuracion/views/ConfiguracionView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router

