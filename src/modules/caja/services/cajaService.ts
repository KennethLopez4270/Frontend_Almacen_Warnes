import axios from 'axios'
import { API_URL, instalarInterceptorSesion } from '@/config/api'

// ====================================================================
// CLIENTE AXIOS DEDICADO A CAJA, SESIONES Y REPORTES
// ====================================================================

const apiCaja = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

instalarInterceptorSesion(apiCaja)

apiCaja.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiCaja.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error en el servidor.'
    if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'object') {
        cleanMessage = data.mensaje || data.error || data.message || cleanMessage
      } else if (typeof data === 'string' && data.trim()) {
        cleanMessage = data
      }
    } else if (error.request) {
      cleanMessage = 'No se pudo conectar con el servidor (backend inalcanzable).'
    } else if (error.message) {
      cleanMessage = error.message
    }
    ;(error as any).userMessage = cleanMessage
    return Promise.reject(error)
  }
)

// ====================================================================
// INTERFACES TIPADAS
// ====================================================================

export interface SesionDTO {
  sesionId: number
  usuarioId: number
  horaSesionAbierta: string
  minutosTranscurridos: number
}

export interface SesionListadoDTO {
  sesionId: number
  usuarioId: number
  usuario: string
  nombreCompleto: string
  descripcionRol: string
  sucursalId?: number | null
  codigoSucursal?: string | null
  horaSesionAbierta: string
  horaSesionCerrada?: string | null
  duracionSesion?: number | null
  estaActiva: boolean
  reporteId?: number | null
  estadoArqueo: string
  alertaSinArqueo: boolean
}

export interface FiltrosSesiones {
  usuarioId?: number
  sucursalId?: number
  soloActivas?: boolean
  fechaDesde?: string
  fechaHasta?: string
  textoBusqueda?: string
}

export interface MovimientoDTO {
  movimientoId: number
  reporteId?: number | null
  monto: number
  tipoMovimiento: number // 1=Entrada, 2=Salida
  descripcionTipo: string
  metodoMovimiento: number // 1=Efectivo, 2=QR, 3=Tarjeta, 4=Mixto, 5=Otro
  descripcionMetodo: string
  detalle: string
  usuarioCreacion: number
  nombreUsuario: string
  sucursalId: number
  fechaCreacion: string
  sellado: boolean
  rolUsuario?: number | null
  requiereConsolidacion?: boolean
}

export interface CrearMovimientoDTO {
  sucursalId?: number | null
  monto: number
  tipoMovimiento: number
  metodoMovimiento: number
  detalle: string
  consolidarDirecto?: boolean
}

export interface ModificarMovimientoDTO {
  monto?: number
  tipoMovimiento?: number
  metodoMovimiento?: number
  detalle?: string
}

export interface FiltrosMovimientos {
  sucursalId?: number
  reporteId?: number
  soloPendientes?: boolean
  tipoMovimiento?: number
  usuarioId?: number
  fechaDesde?: string
  fechaHasta?: string
  estado?: '' | 'PENDIENTES' | 'CONSOLIDADOS' | 'TODOS'
}

export interface ItemMovimientoTurno {
  movimiento_id: number
  tipo_movimiento: number
  descripcion_tipo: string
  metodo_movimiento: number
  descripcion_metodo: string
  monto: number
  detalle: string
  fecha_creacion: string
}

export interface TopProductoTurno {
  producto: string
  cantidad: number
  subtotal: number
}

export interface ArqueoResumenTurnoDTO {
  sesionId: number
  sucursalId: number
  horaInicioTurno: string
  conteoVentas: number
  totalVentasEfectivo: number
  totalVentasQr: number
  totalVentasTarjeta: number
  totalVentasGeneral: number
  totalMovimientosEntrada: number
  totalMovimientosSalida: number
  cantidadMovimientos: number
  requiereArqueo: boolean
  movimientosDetalle: ItemMovimientoTurno[]
  topProductos: TopProductoTurno[]
}

export interface PartidaArqueoDTO {
  tipo: number // Grupo 4: 1=Efectivo, 2=QR, 3=Tarjeta, 4=Mixto, 5=Otro
  monto: number
  descripcion: string
}

export interface RegistrarArqueoDTO {
  sesionId?: number
  montoBase?: number | null
  datosSnapshot?: Record<string, any>
  entradas: PartidaArqueoDTO[]
  salidas: PartidaArqueoDTO[]
  periodo?: string
}

export interface ReporteListadoDTO {
  reporteId: number
  sucursalId: number
  codigoSucursal: string
  nombreSucursal?: string
  periodo: string
  fechaInicio: string
  fechaFin: string
  montoBase?: number | null
  montoEntradas: number
  montoSalidas: number
  utilidad: number
  datosSnapshot?: any
  usuarioCreacion: number
  nombreUsuario: string
  fechaCreacion: string
}

export interface ReporteDetalleDTO {
  reporteId: number
  sucursalId: number
  codigoSucursal: string
  nombreSucursal?: string
  periodo: string
  fechaInicio: string
  fechaFin: string
  montoBase?: number | null
  montoEntradas: number
  montoSalidas: number
  utilidad: number
  datosSnapshot?: any
  nombreUsuario: string
  fechaCreacion: string
  entradas: Array<{
    entrada_id: number
    tipo_entrada: number
    descripcion_tipo: string
    monto: number
    descripcion: string
  }>
  salidas: Array<{
    salida_id: number
    tipo_salida: number
    descripcion_tipo: string
    monto: number
    descripcion: string
  }>
  movimientos: Array<{
    movimiento_id: number
    tipo_movimiento: number
    descripcion_tipo: string
    metodo_movimiento: number
    descripcion_metodo: string
    monto: number
    detalle: string
    fecha_creacion: string
  }>
}

export interface FiltrosReportes {
  sucursalId?: number
  periodo?: string
  fechaDesde?: string
  fechaHasta?: string
  usuarioId?: number
}

// ====================================================================
// SERVICIO PRINCIPAL
// ====================================================================

export const cajaService = {
  // ── Sesiones ──
  async obtenerSesionActiva(): Promise<SesionDTO> {
    const res = await apiCaja.get<SesionDTO>('/sesiones/activa')
    return res.data
  },

  async cerrarSesionDirecta(sesionId?: number): Promise<{ mensaje: string; duracionMinutos: number }> {
    const res = await apiCaja.post('/sesiones/cerrar', { sesionId })
    return res.data
  },

  async listarSesiones(filtros: FiltrosSesiones = {}): Promise<SesionListadoDTO[]> {
    const res = await apiCaja.get<SesionListadoDTO[]>('/sesiones', { params: filtros })
    return res.data
  },

  // ── Movimientos de Caja ──
  async listarMovimientos(filtros: FiltrosMovimientos = {}): Promise<MovimientoDTO[]> {
    const res = await apiCaja.get<MovimientoDTO[]>('/movimientos', { params: filtros })
    return res.data
  },

  async crearMovimiento(dto: CrearMovimientoDTO): Promise<{ mensaje: string; movimientoId: number; reporteId?: number }> {
    const res = await apiCaja.post('/movimientos', dto)
    return res.data
  },

  async consolidarMovimientos(movimientoIds: number[]): Promise<{ mensaje: string; reporteIds: number[] }> {
    const res = await apiCaja.post('/movimientos/consolidar', { movimientoIds })
    return res.data
  },

  async modificarMovimiento(id: number, dto: ModificarMovimientoDTO): Promise<{ mensaje: string }> {
    const res = await apiCaja.put(`/movimientos/${id}`, dto)
    return res.data
  },

  async eliminarMovimiento(id: number): Promise<{ mensaje: string }> {
    const res = await apiCaja.delete(`/movimientos/${id}`)
    return res.data
  },

  // ── Arqueo del Turno ──
  async obtenerResumenTurno(): Promise<ArqueoResumenTurnoDTO> {
    const res = await apiCaja.get<ArqueoResumenTurnoDTO>('/arqueo/resumen-turno')
    return res.data
  },

  async registrarArqueo(dto: RegistrarArqueoDTO): Promise<{ mensaje: string; reporteId: number }> {
    const res = await apiCaja.post('/arqueo/registrar', dto)
    return res.data
  },

  // ── Reportes / Libro Mayor ──
  async listarReportes(filtros: FiltrosReportes = {}): Promise<ReporteListadoDTO[]> {
    const res = await apiCaja.get<ReporteListadoDTO[]>('/reportes', { params: filtros })
    return res.data
  },

  async obtenerDetalleReporte(id: number): Promise<ReporteDetalleDTO> {
    const res = await apiCaja.get<ReporteDetalleDTO>(`/reportes/${id}`)
    return res.data
  },
}
