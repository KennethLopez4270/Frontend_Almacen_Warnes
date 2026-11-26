import axios from 'axios'
import { API_URL, URL_BASE, instalarInterceptorSesion } from '@/config/api'

// ====================================================================
// CLIENTE AXIOS DEDICADO A NOTIFICACIONES Y ALERTAS INTERNAS
// ====================================================================

const apiNotificaciones = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

instalarInterceptorSesion(apiNotificaciones)

// Inyectar token JWT automáticamente
apiNotificaciones.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Normalizador de respuestas y errores
apiNotificaciones.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error al procesar las notificaciones.'

    if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'object') {
        cleanMessage = data.mensaje || data.error || data.message || cleanMessage
      } else if (typeof data === 'string' && data.trim()) {
        cleanMessage = data
      }
    } else if (error.request) {
      cleanMessage = `No se pudo conectar con el servidor backend (${URL_BASE}).`
    } else if (error.message) {
      cleanMessage = error.message
    }

    ;(error as any).userMessage = cleanMessage
    return Promise.reject(error)
  }
)

// ====================================================================
// INTERFACES TIPADAS (MAPEO EXACTO A DTOS DE SPRING BOOT)
// ====================================================================

export type SeveridadAlerta = 'CRITICA' | 'ALTA' | 'ADVERTENCIA' | 'INFORMATIVA'

export type TipoAlerta =
  | 'STOCK_AGOTADO'
  | 'STOCK_BAJO'
  | 'SALA_ESPERA'
  | 'SALA_ESPERA_OBSERVADO'
  | 'ACCESO_DASHBOARD'
  | 'ACCESO_DASHBOARD_APROBADO'
  | 'RECUPERACION_PASSWORD'
  | 'USUARIO_BLOQUEADO'

export interface NotificacionItemDTO {
  idNotificacion: string
  tipoAlerta: TipoAlerta | string
  severidad: SeveridadAlerta | string
  titulo: string
  mensaje: string
  sucursalId: number | null
  codigoSucursal: string
  referenciaId: number | null
  rutaAccion: string
  direccion?: string
  fechaEvento: string
  leido: boolean
  fechaLeido: string | null
  tipoNotificacion: number | null
}

export interface NotificacionResponseDTO {
  notificaciones: NotificacionItemDTO[]
  totalCriticas: number
  totalAltas: number
  totalAdvertencias: number
  totalInformativas: number
  totalGeneral: number
}

export interface CrearNotificacionRequestDTO {
  usuarioDestino?: number | null
  rolDestino?: number | null
  tipoNotificacion: number
  tituloAlerta: string
  mensajeAlerta: string
  direccion: string
}

export type NivelAlertaStock =
  | 'OK'
  | 'STOCK_BAJO_POST_VENTA'
  | 'AGOTADO_POST_VENTA'
  | 'SIN_STOCK'
  | 'INVALIDO'

export interface VerificacionStockVentaDTO {
  puedeVender: boolean
  stockActual: number
  stockRestante: number
  nivelAlerta: NivelAlertaStock | string
  mensajeAlerta: string
}

export type EstadoDashboard = 'APROBADO' | 'PENDIENTE' | 'RECHAZADO' | 'NINGUNO' | 'PROPIETARIO' | 'DENEGADO'

export interface DashboardPermisoDTO {
  supervisorId: number | null
  tieneAcceso: boolean
  estado: EstadoDashboard | string
  mensaje: string
}

export interface ResolverDashboardRequestDTO {
  supervisorId: number
  autorizar: boolean
}

// ====================================================================
// SERVICIO DE COMUNICACIÓN CON SPRING BOOT (/api/notificaciones)
// ====================================================================

export const notificacionesService = {
  /**
   * Obtiene la lista consolidada de notificaciones activas y los contadores
   */
  async listarNotificaciones(sucursalId?: number | null, usuarioId?: number | null): Promise<NotificacionResponseDTO> {
    const params: Record<string, any> = {}
    if (sucursalId !== undefined && sucursalId !== null && sucursalId > 0) {
      params.sucursalId = sucursalId
    }
    if (usuarioId) {
      params.usuarioId = usuarioId
    }

    const { data } = await apiNotificaciones.get<NotificacionResponseDTO>('/notificaciones', { params })
    return data
  },

  /**
   * Marca una notificación individual como leída
   */
  async marcarLeido(id: string | number, usuarioId?: number | null): Promise<{ exito: boolean; mensaje: string }> {
    const params: Record<string, any> = {}
    if (usuarioId) {
      params.usuarioId = usuarioId
    }

    const { data } = await apiNotificaciones.put<{ exito: boolean; mensaje: string }>(
      `/notificaciones/${id}/leer`,
      null,
      { params }
    )
    return data
  },

  /**
   * Marca todas las notificaciones pendientes del usuario o su rol como leídas
   */
  async marcarTodasLeidas(usuarioId?: number | null): Promise<{ exito: boolean; totalAfectadas: number; mensaje: string }> {
    const params: Record<string, any> = {}
    if (usuarioId) {
      params.usuarioId = usuarioId
    }

    const { data } = await apiNotificaciones.put<{ exito: boolean; totalAfectadas: number; mensaje: string }>(
      '/notificaciones/marcar-todas-leidas',
      null,
      { params }
    )
    return data
  },

  /**
   * Registra una nueva notificación física en la base de datos
   */
  async crearNotificacion(payload: CrearNotificacionRequestDTO, usuarioId?: number | null): Promise<any> {
    const params: Record<string, any> = {}
    if (usuarioId) {
      params.usuarioId = usuarioId
    }

    const { data } = await apiNotificaciones.post('/notificaciones', payload, { params })
    return data
  },

  /**
   * Verifica la disponibilidad de stock en estantería previo a concretar una venta u operación
   */
  async verificarStockVenta(
    sucursalId: number,
    productoId: number,
    cantidad: number,
    usuarioId?: number | null
  ): Promise<VerificacionStockVentaDTO> {
    const params: Record<string, any> = {
      sucursalId,
      productoId,
      cantidad,
    }
    if (usuarioId) {
      params.usuarioId = usuarioId
    }

    const { data } = await apiNotificaciones.get<VerificacionStockVentaDTO>('/notificaciones/verificar-stock', { params })
    return data
  },

  /**
   * Envía la solicitud de un Supervisor para acceder al Dashboard gerencial
   */
  async solicitarAccesoDashboard(usuarioId?: number | null): Promise<DashboardPermisoDTO> {
    const params: Record<string, any> = {}
    if (usuarioId) {
      params.usuarioId = usuarioId
    }

    const { data } = await apiNotificaciones.post<DashboardPermisoDTO>('/notificaciones/dashboard/solicitar', null, { params })
    return data
  },

  /**
   * Permite al Propietario conceder o rechazar el acceso de un Supervisor al Dashboard
   */
  async resolverAccesoDashboard(
    payload: ResolverDashboardRequestDTO,
    usuarioId?: number | null
  ): Promise<DashboardPermisoDTO> {
    const params: Record<string, any> = {}
    if (usuarioId) {
      params.usuarioId = usuarioId
    }

    const { data } = await apiNotificaciones.post<DashboardPermisoDTO>('/notificaciones/dashboard/resolver', payload, { params })
    return data
  },

  /**
   * Consulta el estado actual de acceso al Dashboard
   */
  async consultarEstadoDashboard(
    supervisorId?: number | null,
    usuarioId?: number | null
  ): Promise<DashboardPermisoDTO> {
    const params: Record<string, any> = {}
    if (supervisorId) {
      params.supervisorId = supervisorId
    }
    if (usuarioId) {
      params.usuarioId = usuarioId
    }

    const { data } = await apiNotificaciones.get<DashboardPermisoDTO>('/notificaciones/dashboard/estado', { params })
    return data
  },
}

export default notificacionesService
