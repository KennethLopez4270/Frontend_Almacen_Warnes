import type { AxiosInstance } from 'axios'

/**
 * ====================================================================
 * CONFIGURACIÓN CENTRALIZADA DE API Y URLS DEL ERP WARNES
 * ====================================================================
 * Provee la URL base y endpoint /api dinámicos según el entorno (.env)
 * y funciones de normalización de rutas internas de Vue Router.
 */

export const URL_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
export const API_URL = `${URL_BASE}/api`

const AUTH_STORAGE_KEYS = [
  'tw_jwt_token',
  'tw_user_id',
  'tw_sucursal_id',
  'tw_sucursal_original',
  'tw_sucursal_nombre',
  'tw_username',
  'tw_nombres',
  'tw_apellidos',
  'tw_rol_id',
  'tw_estado',
  'tw_sesion_id',
  'tw_hora_sesion_abierta',
]

let expulsionEnCurso = false

/**
 * Instala en cualquier instancia Axios:
 * 1) Inyección opcional de token JWT (para servicios que no lo tenían)
 * 2) Expulsión automática e inmediata a Login cuando el servidor devuelve 423 (CUENTA_BLOQUEADA)
 */
export function instalarInterceptorSesion(client: AxiosInstance, injectJwt = false): void {
  if (injectJwt) {
    client.interceptors.request.use((config) => {
      const token = localStorage.getItem('tw_jwt_token')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status
      const codigo = error?.response?.data?.codigo
      const url: string = error?.config?.url || ''

      const esEndpointPublicoAuth =
        url.includes('/auth/login') || url.includes('/auth/solicitar-recuperacion')

      if (!esEndpointPublicoAuth && (status === 423 || codigo === 'CUENTA_BLOQUEADA')) {
        if (!expulsionEnCurso) {
          expulsionEnCurso = true
          const msg =
            error?.response?.data?.error ||
            'Tu cuenta ha sido bloqueada o deshabilitada. Contacta con un propietario o administrador.'

          try {
            sessionStorage.setItem('tw_bloqueo_msg', msg)
          } catch {}

          AUTH_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k))

          if (window.location.pathname !== '/') {
            window.location.replace('/?bloqueado=1')
          } else {
            expulsionEnCurso = false
          }
        }
      }

      return Promise.reject(error)
    }
  )
}

/**
 * Normaliza cualquier ruta de redirección para que sea relativa a Vue Router,
 * limpiando protocolos, hosts o barras invertidas, y garantizando destinos válidos.
 */
export function normalizarDireccion(
  direccion?: string | null,
  tipoNotificacion?: number | null
): string {
  // 1. Mapeo estricto según Tipo de Notificación oficial (Grupo 10 de Conceptos)
  if (tipoNotificacion === 1 || tipoNotificacion === 2) {
    return '/inventario'
  }
  if (tipoNotificacion === 3 || tipoNotificacion === 4) {
    return '/inventario?tab=pendientes'
  }
  if (tipoNotificacion === 5 || tipoNotificacion === 6) {
    return '/dashboard'
  }
  if (tipoNotificacion === 7 || tipoNotificacion === 8) {
    return '/admin/usuarios'
  }

  // 2. Si no viene tipo explícito, sanear la cadena recibida
  if (!direccion || !direccion.trim()) {
    return '/notificaciones'
  }

  let ruta = direccion.trim().replace(/\\/g, '/')

  // Quitar protocolo y host si viniera una URL absoluta
  ruta = ruta.replace(/^https?:\/\/[^/]+/i, '')

  // Garantizar que comience con '/'
  if (!ruta.startsWith('/')) {
    ruta = '/' + ruta
  }

  // Si apunta a /usuarios sin el prefijo /admin, normalizar a /admin/usuarios
  if (ruta === '/usuarios' || ruta.startsWith('/usuarios/')) {
    ruta = '/admin/usuarios'
  }

  return ruta
}

/**
 * Identifica la sección temática del Grupo 10 de Conceptos para badges y filtros
 */
export function obtenerSeccionNotificacion(
  tipoNotificacion?: number | null,
  tipoAlerta?: string | null
): { id: string; label: string; chipClass: string } {
  if (
    tipoNotificacion === 1 ||
    tipoNotificacion === 2 ||
    tipoAlerta === 'STOCK_AGOTADO' ||
    tipoAlerta === 'STOCK_BAJO'
  ) {
    return { id: 'stock', label: 'Inventario y Stock', chipClass: 'seccion-stock' }
  }

  if (
    tipoNotificacion === 3 ||
    tipoNotificacion === 4 ||
    tipoAlerta === 'SALA_ESPERA' ||
    tipoAlerta === 'SALA_ESPERA_OBSERVADO'
  ) {
    return { id: 'espera', label: 'Sala de Espera', chipClass: 'seccion-espera' }
  }

  if (
    tipoNotificacion === 5 ||
    tipoNotificacion === 6 ||
    tipoAlerta === 'ACCESO_DASHBOARD' ||
    tipoAlerta === 'ACCESO_DASHBOARD_APROBADO'
  ) {
    return { id: 'dashboard', label: 'Acceso a Dashboard', chipClass: 'seccion-dashboard' }
  }

  if (
    tipoNotificacion === 7 ||
    tipoNotificacion === 8 ||
    tipoAlerta === 'RECUPERACION_PASSWORD' ||
    tipoAlerta === 'USUARIO_BLOQUEADO'
  ) {
    return { id: 'seguridad', label: 'Seguridad y Usuarios', chipClass: 'seccion-seguridad' }
  }

  return { id: 'general', label: 'General', chipClass: 'seccion-general' }
}
