import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/modules/seguridad/views/LoginView.vue'),
  },
  {
    path: '/seleccionar-sucursal',
    name: 'SeleccionarSucursal',
    component: () => import('@/modules/seguridad/views/SeleccionarSucursalView.vue'),
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
    path: '/caja/movimientos',
    name: 'MovimientosCaja',
    component: () => import('@/modules/caja/views/MovimientosCajaView.vue'),
  },
  {
    path: '/caja/libro-mayor',
    name: 'LibroMayor',
    component: () => import('@/modules/caja/views/LibroMayorView.vue'),
  },
  {
    path: '/caja/historial-ventas',
    name: 'HistorialVentas',
    component: () => import('@/modules/ventas/views/HistorialVentasView.vue'),
  },
  {
    path: '/ventas/clientes',
    name: 'Clientes',
    component: () => import('@/modules/ventas/views/ClientesView.vue'),
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
    path: '/admin/sesiones',
    name: 'SesionesAuditoria',
    component: () => import('@/modules/seguridad/views/SesionesAuditoriaView.vue'),
  },
  {
    path: '/admin/configuracion',
    name: 'Configuracion',
    component: () => import('@/modules/configuracion/views/ConfiguracionView.vue'),
  },
  {
    path: '/notificaciones',
    name: 'Notificaciones',
    component: () => import('@/modules/notificaciones/views/NotificacionesView.vue'),
  },
  {
    path: '/usuarios',
    redirect: '/admin/usuarios',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ====================================================================
// GUARDIÁN DE RUTAS: PROTECCIÓN DE SESIÓN, SUCURSALES Y ROLES RBAC
// ====================================================================
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // 1. Si no está autenticado
  if (!authStore.isAuthenticated) {
    if (to.path !== '/') {
      return next('/')
    }
    return next()
  }

  // 2. Si ya está autenticado e intenta ir a Login
  if (to.path === '/') {
    if (authStore.sinSucursalAsignada || authStore.necesitaElegirSucursal) {
      return next('/seleccionar-sucursal')
    }
    return next(authStore.isCajero ? '/pos' : '/dashboard')
  }

  // 3. Usuario sin sucursal asignada en BD (sucursalOriginal === null)
  if (authStore.sinSucursalAsignada) {
    if (to.path !== '/seleccionar-sucursal') {
      return next('/seleccionar-sucursal')
    }
    return next()
  }

  // 4. Propietario que aún no ha seleccionado una sucursal física (sucursalId === 0)
  // Solo puede acceder a las pantallas del módulo de Administración y a seleccionar-sucursal
  if (authStore.necesitaElegirSucursal) {
    const rutasPermitidasSinSucursal = [
      '/seleccionar-sucursal',
      '/dashboard',
      '/admin/usuarios',
      '/admin/configuracion',
      '/notificaciones',
    ]

    const esRutaPermitida = rutasPermitidasSinSucursal.some((r) => to.path === r || to.path.startsWith('/admin'))
    if (!esRutaPermitida) {
      return next('/seleccionar-sucursal')
    }
    return next()
  }

  // 5. Restricción por Roles
  // /admin (Usuarios y Configuración) es exclusivo del Propietario
  if (to.path.startsWith('/admin')) {
    if (!authStore.isPropietario) {
      return next(authStore.isCajero ? '/pos' : '/inventario')
    }
  }

  // /dashboard accesible por Propietario y Supervisor (con control de autorización por backend)
  if (to.path === '/dashboard') {
    if (authStore.isCajero) {
      return next('/pos')
    }
  }

  return next()
})

export default router
