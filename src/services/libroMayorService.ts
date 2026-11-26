import axios from 'axios'
import { API_URL, instalarInterceptorSesion } from '@/config/api'

// ====================================================================
// CLIENTE AXIOS DEDICADO AL LIBRO MAYOR
// ====================================================================

const apiLibroMayor = axios.create({
  baseURL: `${API_URL}/libro-mayor`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

instalarInterceptorSesion(apiLibroMayor)

// Inyectar token JWT automáticamente
apiLibroMayor.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiLibroMayor.interceptors.response.use(
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
// INTERFACES TIPADAS DEL LIBRO MAYOR
// ====================================================================

export interface LibroMayorItemDTO {
  referenciaId: string
  fechaHora: string
  origen: 'VENTA' | 'EXTRA_VENTA'
  tipoMovimiento: number
  tipo: 'ENTRADA' | 'SALIDA'
  metodoMovimiento: number
  metodo: string
  categoriaId: number
  categoria: string
  detalle: string
  monto: number
  marcaBaja: boolean
  sucursalId: number
  sucursalNombre: string
  cajeroId?: number
  cajeroNombre?: string
  productosResumen?: string
  usuarioId?: number
  usuarioNombre?: string
}

export interface LibroMayorResumenDTO {
  totalVentasQr: number
  totalVentasEfectivo: number
  totalVentasTarjeta: number
  totalVentas: number
  totalEntradasExtra: number
  totalSalidasExtra: number
  totalEntradas: number
  totalSalidas: number
  totalBajasMonto: number
  cantidadBajas: number
  saldoNeto: number
}

export interface FiltrosLibroMayor {
  sucursalId?: number | null
  fechaInicio?: string
  fechaFin?: string
  horaInicio?: string
  horaFin?: string
  cajeroId?: number | null
  productoId?: number | null
  incluirBajas?: boolean
  tipoMovimiento?: number | null
  metodoMovimiento?: number | null
}

export interface MovimientoExtraVentaPayload {
  sucursalId: number
  tipoMovimiento: number // 1 = Entrada, 2 = Salida
  categoriaId?: number
  metodoPago: number // 1 = Efectivo, 2 = QR, 3 = Tarjeta, etc.
  monto: number
  detalle: string
}

export interface AnularMovimientoPayload {
  origen: 'VENTA' | 'EXTRA_VENTA'
  motivo?: string
}

export interface OperacionResultadoDTO {
  exito: boolean
  mensaje: string
  id?: number
}

export interface CajeroOpcionDTO {
  usuarioId: number
  usuario: string
  nombreCompleto: string
  sucursalId: number
}

export interface ProductoOpcionDTO {
  productoId: number
  codigoInterno: string
  nombreProducto: string
}

export interface FiltrosOpcionesDTO {
  cajeros: CajeroOpcionDTO[]
  productos: ProductoOpcionDTO[]
}

export interface ReciboDetalleItemDTO {
  detalleVentaId: number
  productoId: number
  codigoInterno: string
  codigoBarras: string
  nombreProducto: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface ReciboVentaDTO {
  ventaId: number
  codigoRecibo: string
  fechaHora: string
  sucursalId: number
  sucursalNombre: string
  sucursalDireccion: string
  sucursalTelefono: string
  cajeroId: number
  cajeroNombre: string
  cajeroUsuario: string
  clienteId: number
  clienteNombre: string
  clienteRazonSocial: string
  clienteNit: string
  clienteTelefono: string
  metodoVentaId: number
  metodoVentaNombre: string
  cobroEfectivo: number
  cobroQr: number
  cobroTarjeta: number
  montoRecibido: number
  cambio: number
  precioTotal: number
  estadoId: number
  estadoNombre: string
  marcaBaja: boolean
  anuladoPor?: number
  anuladoPorNombre?: string
  detalles: ReciboDetalleItemDTO[]
}

// ====================================================================
// METODOS DEL SERVICIO
// ====================================================================

export const libroMayorService = {
  /**
   * Consulta el listado detallado de movimientos y bajas del Libro Mayor.
   */
  async consultarLibroMayor(filtros: FiltrosLibroMayor = {}): Promise<LibroMayorItemDTO[]> {
    const params: Record<string, any> = {}
    if (filtros.sucursalId !== undefined && filtros.sucursalId !== null && filtros.sucursalId > 0) {
      params.sucursalId = filtros.sucursalId
    }
    if (filtros.fechaInicio) params.fechaInicio = filtros.fechaInicio
    if (filtros.fechaFin) params.fechaFin = filtros.fechaFin
    if (filtros.horaInicio) params.horaInicio = filtros.horaInicio
    if (filtros.horaFin) params.horaFin = filtros.horaFin
    if (filtros.cajeroId !== undefined && filtros.cajeroId !== null && filtros.cajeroId > 0) {
      params.cajeroId = filtros.cajeroId
    }
    if (filtros.productoId !== undefined && filtros.productoId !== null && filtros.productoId > 0) {
      params.productoId = filtros.productoId
    }
    if (filtros.incluirBajas !== undefined) params.incluirBajas = filtros.incluirBajas
    if (filtros.tipoMovimiento !== undefined && filtros.tipoMovimiento !== null && filtros.tipoMovimiento > 0) {
      params.tipoMovimiento = filtros.tipoMovimiento
    }
    if (filtros.metodoMovimiento !== undefined && filtros.metodoMovimiento !== null && filtros.metodoMovimiento > 0) {
      params.metodoMovimiento = filtros.metodoMovimiento
    }

    const { data } = await apiLibroMayor.get<LibroMayorItemDTO[]>('', { params })
    return data
  },

  /**
   * Consulta el resumen consolidado financiero y balance del Libro Mayor.
   */
  async consultarResumen(
    sucursalId?: number | null,
    fechaInicio?: string,
    fechaFin?: string,
    horaInicio?: string,
    horaFin?: string,
    cajeroId?: number | null,
    productoId?: number | null
  ): Promise<LibroMayorResumenDTO> {
    const params: Record<string, any> = {}
    if (sucursalId !== undefined && sucursalId !== null && sucursalId > 0) {
      params.sucursalId = sucursalId
    }
    if (fechaInicio) params.fechaInicio = fechaInicio
    if (fechaFin) params.fechaFin = fechaFin
    if (horaInicio) params.horaInicio = horaInicio
    if (horaFin) params.horaFin = horaFin
    if (cajeroId !== undefined && cajeroId !== null && cajeroId > 0) {
      params.cajeroId = cajeroId
    }
    if (productoId !== undefined && productoId !== null && productoId > 0) {
      params.productoId = productoId
    }

    const { data } = await apiLibroMayor.get<LibroMayorResumenDTO>('/resumen', { params })
    return data
  },

  /**
   * Obtiene los datos estructurados para emitir el recibo de venta en PDF.
   */
  async obtenerReciboVenta(ventaId: number): Promise<ReciboVentaDTO> {
    const { data } = await apiLibroMayor.get<ReciboVentaDTO>(`/ventas/${ventaId}/recibo`)
    return data
  },

  /**
   * Obtiene las opciones de cajeros y productos disponibles para selectores de filtro.
   */
  async obtenerFiltrosOpciones(sucursalId?: number | null): Promise<FiltrosOpcionesDTO> {
    const params: Record<string, any> = {}
    if (sucursalId !== undefined && sucursalId !== null && sucursalId > 0) {
      params.sucursalId = sucursalId
    }
    const { data } = await apiLibroMayor.get<FiltrosOpcionesDTO>('/filtros-opciones', { params })
    return data
  },

  /**
   * Registra un movimiento financiero fuera de venta (préstamo, adelanto, gasto, ingreso).
   */
  async registrarMovimientoExtra(payload: MovimientoExtraVentaPayload): Promise<OperacionResultadoDTO> {
    const { data } = await apiLibroMayor.post<OperacionResultadoDTO>('/movimientos-extra', payload)
    return data
  },

  /**
   * Anula o da de baja un movimiento o venta en el Libro Mayor.
   */
  async anularMovimiento(
    id: number,
    payload: AnularMovimientoPayload
  ): Promise<OperacionResultadoDTO> {
    const { data } = await apiLibroMayor.put<OperacionResultadoDTO>(`/movimientos/${id}/anular`, payload)
    return data
  },
}
