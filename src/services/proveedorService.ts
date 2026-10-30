import axios from 'axios'

// Cliente Axios dedicado para la API de Proveedores
const apiProveedores = axios.create({
  baseURL: import.meta.env.VITE_API_PROVEEDORES_URL || 'http://localhost:8080/api/proveedores',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

// Interceptor de respuesta para normalizar errores (RAISE EXCEPTION de PostgreSQL / Spring Boot)
apiProveedores.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error inesperado al procesar la solicitud del proveedor.'

    if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'object') {
        cleanMessage = data.mensaje || data.message || cleanMessage
      } else if (typeof data === 'string' && data.trim()) {
        cleanMessage = data
      }
    } else if (error.request) {
      cleanMessage = 'No se pudo conectar con el servidor (backend inalcanzable en http://localhost:8080).'
    } else if (error.message) {
      cleanMessage = error.message
    }

    ;(error as any).userMessage = cleanMessage
    return Promise.reject(error)
  }
)

// ====================================================================
// MODELOS E INTERFACES TIPADAS (ABM PROVEEDORES)
// ====================================================================

export interface ProveedorKpi {
  totalProveedoresActivos: number
  proveedoresAlertasVencimiento: number
  totalProductosAbastecidos: number
  totalLotesActivos: number
  valorTotalInventario: number
}

export interface ProveedorListado {
  proveedorId: number
  nombreEmpresa: string
  nombreContacto: string
  numeroContacto: string
  anotaciones: string
  marcaBaja: boolean
  fechaCreacion: string
  totalProductos: number
  totalLotes: number
  lotesActivos: number
  lotesEnRiesgo: number
  stockTotalAcumulado: number
  valorMercaderia: number
}

export interface ProveedorCatalogoProducto {
  productoId: number
  codigoInterno: string
  codigoBarras: string
  nombreProducto: string
  categoriaNombre: string
  precioCompra: number
  precioVenta: number
  estadoProducto: number
  stockActual: number
  totalLotesRecibidos: number
  fechaUltimaEntrega: string
}

export interface ProveedorHistorialLote {
  loteId: number
  descripcion: string
  productoId: number
  nombreProducto: string
  codigoInterno: string
  cantidadInicial: number
  stockActual: number
  costoUnitario: number
  precioLote: number
  fechaVencimiento: string | null
  diasParaVencer: number | null
  estadoCaducidad: 'VIGENTE' | 'PROXIMO' | 'CRITICO' | 'VENCIDO' | 'NO_PERECEDERO' | string
  fechaIngreso: string
}

export interface CrearProveedorRequest {
  nombreEmpresa: string
  nombreContacto: string
  numeroContacto: string
  anotaciones: string
  usuarioCreacion?: number
}

export interface ActualizarProveedorRequest {
  nombreEmpresa: string
  nombreContacto: string
  numeroContacto: string
  anotaciones: string
  usuarioModificacion?: number
}

// ====================================================================
// SERVICIO HTTP DE PROVEEDORES
// ====================================================================

export const proveedorService = {
  /**
   * GET /api/proveedores/kpis
   * Retorna métricas cuantitativas clave de proveedores y abastecimiento
   */
  async obtenerKpis(): Promise<ProveedorKpi> {
    const response = await apiProveedores.get<ProveedorKpi>('/kpis')
    return response.data
  },

  /**
   * GET /api/proveedores?busqueda={texto}&producto={texto}
   * Lista distribuidores con filtros combinados (empresa/contacto o producto abastecido)
   */
  async listarProveedores(busqueda?: string, producto?: string): Promise<ProveedorListado[]> {
    const params: Record<string, string> = {}
    if (busqueda && busqueda.trim()) params.busqueda = busqueda.trim()
    if (producto && producto.trim()) params.producto = producto.trim()

    const response = await apiProveedores.get<ProveedorListado[]>('', { params })
    return response.data
  },

  /**
   * GET /api/proveedores/{id}
   */
  async obtenerPorId(id: number): Promise<any> {
    const response = await apiProveedores.get(`/${id}`)
    return response.data
  },

  /**
   * POST /api/proveedores
   * Registra nuevo distribuidor
   */
  async registrarProveedor(datos: CrearProveedorRequest): Promise<{ mensaje: string; proveedorId: number }> {
    const response = await apiProveedores.post<{ mensaje: string; proveedorId: number }>('', datos)
    return response.data
  },

  /**
   * PUT /api/proveedores/{id}
   * Actualiza distribuidor y sus acuerdos contractuales
   */
  async actualizarProveedor(id: number, datos: ActualizarProveedorRequest): Promise<{ mensaje: string }> {
    const response = await apiProveedores.put<{ mensaje: string }>(`/${id}`, datos)
    return response.data
  },

  /**
   * DELETE /api/proveedores/{id}
   * Baja lógica de un distribuidor
   */
  async eliminarProveedor(id: number): Promise<{ mensaje: string }> {
    const response = await apiProveedores.delete<{ mensaje: string }>(`/${id}`)
    return response.data
  },

  /**
   * GET /api/proveedores/{id}/productos
   * Catálogo de productos vinculados a este distribuidor
   */
  async listarCatalogoProductos(id: number): Promise<ProveedorCatalogoProducto[]> {
    const response = await apiProveedores.get<ProveedorCatalogoProducto[]>(`/${id}/productos`)
    return response.data
  },

  /**
   * GET /api/proveedores/{id}/lotes?filtro={todos|activos|proximos_vencer|vencidos}
   * Verificación de lotes y estado de caducidad
   */
  async listarHistorialLotes(id: number, filtro: string = 'todos'): Promise<ProveedorHistorialLote[]> {
    const response = await apiProveedores.get<ProveedorHistorialLote[]>(`/${id}/lotes`, {
      params: { filtro },
    })
    return response.data
  },
}

export default proveedorService

