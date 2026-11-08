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
    ]

    const esRutaPermitida = rutasPermitidasSinSucursal.some((r) => to.path === r || to.path.startsWith('/admin'))
    if (!esRutaPermitida) {
      return next('/seleccionar-sucursal')
    }
    return next()
  }

  // 5. Restricción por Roles (Cajero o Supervisor intentando entrar a Administración)
  if (to.path.startsWith('/admin') || to.path === '/dashboard') {
    if (!authStore.isPropietario) {
      return next(authStore.isCajero ? '/pos' : '/inventario')
    }
  }

  return next()
})

export default router
