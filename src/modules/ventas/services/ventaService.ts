import axios from 'axios'

// ====================================================================
// CLIENTE AXIOS DEDICADO AL MÓDULO DE VENTAS
// ====================================================================

const apiVentas = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

// Interceptor JWT
apiVentas.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de errores
apiVentas.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error al procesar la operación de venta.'
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
// INTERFACES TIPADAS (mapeo a DTOs de Spring Boot)
// ====================================================================

/** Resultado del buscador POS — proyección de fn_pos_buscar_producto */
export interface ProductoPOS {
  inventarioId: number
  productoId: number
  codigoBarras: string | null
  codigoInterno: string | null
  nombreProducto: string
  precioVenta: number
  stockDisponible: number
  enDescuento: boolean
  precioDescuento: number | null
}

/** Un ítem del carrito que se envía al backend */
export interface DetalleVentaDTO {
  inventarioId: number
  productoId: number
  cantidad: number
  precioUnitario: number
}

/** Payload completo para registrar una venta (enviado cuando expiran los 5s) */
export interface RegistrarVentaDTO {
  sucursalId: number
  usuarioId: number
  clienteId: number | null
  metodoVenta: number          // 1=Efectivo 2=QR 3=Tarjeta 4=Mixto
  precioTotal: number
  cobroEfectivo: number
  cobroQr: number
  cobroTarjeta: number
  montoRecibido: number | null
  cambio: number | null
  detalles: DetalleVentaDTO[]
  duracionAtencionSegundos: number | null
}

/** Respuesta del backend al registrar o consultar una venta */
export interface VentaResponse {
  ventaId: number
  sucursalId: number
  sucursalNombre: string
  estado: number               // 1=Pendiente 2=Finalizada 3=Anulada
  precioTotal: number
  metodoVenta: number
  cobroEfectivo: number
  cobroQr: number
  cobroTarjeta: number
  montoRecibido: number | null
  cambio: number | null
  clienteId: number | null
  anuladoPor: number | null
  fechaCreacion: string
  cajeroNombre: string
  detalles: DetalleVentaDTO[]
  /** HTML del recibo térmico 80mm — inyectar en DOM e invocar window.print() */
  reciboHtml: string
}

/** Payload para anular una venta */
export interface AnularVentaDTO {
  ventaId: number
  usuarioAnulacion: number
}

/** Datos del cliente para facturación/recibo */
export interface ClienteDTO {
  clienteId: number | null
  nit: string
  nombres: string
  apellidos: string
  nombreRazonSocial: string
  telefono: string
}

// ====================================================================
// SERVICIO DE VENTAS
// ====================================================================

export const ventaService = {
  /**
   * Busca productos en el inventario de la sucursal dada.
   * Puede ser código de barras, código interno o parte del nombre.
   */
  async buscarProducto(sucursalId: number, criterio: string): Promise<ProductoPOS[]> {
    const { data } = await apiVentas.get<ProductoPOS[]>('/ventas/buscar-producto', {
      params: { sucursalId, criterio },
    })
    return data
  },

  /**
   * Registra la venta y descuenta el stock (atómico via SP).
   * El frontend debe llamar esto SOLO cuando los 5s de cuenta regresiva expiran.
   * Retorna el recibo HTML listo para window.print().
   */
  async registrarVenta(payload: RegistrarVentaDTO): Promise<VentaResponse> {
    const { data } = await apiVentas.post<VentaResponse>('/ventas/registrar', payload)
    return data
  },

  /**
   * Anula una venta y revierte el stock. Solo para Propietario/Supervisor.
   */
  async anularVenta(ventaId: number, usuarioAnulacion: number): Promise<void> {
    await apiVentas.post(`/ventas/anular/${ventaId}`, { ventaId, usuarioAnulacion })
  },

  /**
   * Obtiene el detalle completo de una venta con recibo regenerado.
   */
  async obtenerVenta(ventaId: number): Promise<VentaResponse> {
    const { data } = await apiVentas.get<VentaResponse>(`/ventas/${ventaId}`)
    return data
  },

  /**
   * Lista ventas de una sucursal mediante sp_ventas_listar.
   * Filtros opcionales: fecha (yyyy-MM-dd), metodoVenta, estado.
   */
  async listarVentas(
    sucursalId: number,
    fecha?: string,
    metodoVenta?: number | null,
    estado?: number | null
  ): Promise<VentaResponse[]> {
    const params: Record<string, any> = { sucursalId }
    if (fecha) params.fecha = fecha
    if (metodoVenta !== undefined && metodoVenta !== null) params.metodoVenta = metodoVenta
    if (estado !== undefined && estado !== null) params.estado = estado
    const { data } = await apiVentas.get<VentaResponse[]>('/ventas/historial', { params })
    return data
  },

  /**
   * Busca cliente por NIT/CI. Retorna null si no existe.
   */
  async buscarCliente(nit: string): Promise<ClienteDTO | null> {
    const { data } = await apiVentas.get<ClienteDTO | null>('/ventas/clientes/buscar', {
      params: { nit },
    })
    return data
  },

  /**
   * Crea un nuevo cliente (o retorna el existente si ya tiene ese NIT).
   */
  async crearCliente(dto: ClienteDTO, usuarioCreacion: number): Promise<ClienteDTO> {
    const { data } = await apiVentas.post<ClienteDTO>('/ventas/clientes', dto, {
      params: { usuarioCreacion },
    })
    return data
  },
}

