import api from './api'

// ====================================================================
// INTERFACES TIPADAS (MAPEO EXACTO A DTOS DE SPRING BOOT & POSTGRESQL)
// ====================================================================

export interface InventarioKpi {
  totalProductosCatalogo?: number
  unidadesStockActivo?: number
  lotesSalaEspera?: number
  alertasVencimiento?: number
  total_productos_catalogo: number
  unidades_stock_activo: number
  lotes_sala_espera: number
  alertas_vencimiento: number
}

export interface InventarioLote {
  inventarioId?: number
  inventario_id: number
  stock: number
  enDescuento?: boolean
  en_descuento: boolean
  precioDescuento?: number | null
  precio_descuento: number | null
  productoId?: number
  producto_id: number
  codigoInterno?: string
  codigo_interno: string
  codigoBarras?: string
  codigo_barras: string
  nombreProducto?: string
  nombre_producto: string
  precioVenta?: number
  precio_venta: number
  estadoProducto?: number
  estado_producto: number
  loteId?: number
  lote_id: number
  descripcionLote?: string
  descripcion_lote: string
  costoUnitario?: number
  costo_unitario: number
  fechaVencimiento?: string | null
  fecha_vencimiento: string | null
  nombreProveedor?: string
  nombre_proveedor: string
  diasParaVencer?: number | null
  dias_para_vencer: number | null
}

export interface ProductoCatalogo {
  productoId?: number
  producto_id: number
  codigoInterno?: string
  codigo_interno: string
  codigoBarras?: string
  codigo_barras: string
  nombreProducto?: string
  nombre_producto: string
  categoriaId?: number
  categoria_id: number
  precioCompra?: number
  precio_compra: number
  precioVenta?: number
  precio_venta: number
  estado: number
  stockTotalAcumulado?: number
  stock_total_acumulado: number
}

export interface InventarioPendiente {
  inventarioPendienteId?: number
  inventario_pendiente_id: number
  sucursalId?: number
  sucursal_id: number
  productoId?: number | null
  producto_id: number | null
  nombreProducto?: string
  nombre_producto: string
  codigoBarras?: string | null
  codigo_barras: string | null
  codigoInterno?: string
  codigo_interno: string
  categoriaId?: number
  categoria_id: number
  precioCompra?: number
  precio_compra: number
  precioVenta?: number
  precio_venta: number
  stockIngresado?: number
  stock_ingresado: number
  estado: number // 1: Pendiente, 2: Aprobado, 3: Rechazado
  proveedorId?: number | null
  proveedor_id: number | null
  descripcionLote?: string
  descripcion_lote: string
  precioLote?: number
  precio_lote: number
  fechaVencimiento?: string | null
  fecha_vencimiento: string | null
  observacionRevision?: string | null
  observacion_revision?: string | null
  marcaBaja?: boolean
  marca_baja: boolean
  fechaCreacion?: string
  fecha_creacion: string
  usuarioCreacion?: number
  usuario_creacion: number
  fechaRevision?: string | null
  fecha_revision?: string | null
  usuarioRevision?: number | null
  usuario_revision?: number | null
}

export interface RegistroPendienteRequest {
  sucursalId?: number
  productoId?: number | null
  nombreProducto: string
  codigoBarras?: string | null
  codigoInterno: string
  categoriaId: number
  precioCompra: number
  precioVenta: number
  stockIngresado: number
  proveedorId?: number | null
  descripcionLote?: string
  precioLote?: number
  fechaVencimiento?: string | null
  usuarioCreacion?: number
  usuarioRevision?: number
}

export interface IngresoDirectoRequest {
  categoriaId: number
  nombreProducto: string
  codigoInterno: string
  descripcionLote?: string
  stockIngresado: number
  precioLote?: number
  precioCompra: number
  precioVenta: number
  usuarioCreacion?: number
  productoId?: number | null
  codigoBarras?: string | null
  proveedorId?: number | null
  fechaVencimiento?: string | null
}

export interface ProductoDTO {
  productoId?: number
  producto_id?: number
  categoriaId?: number
  categoria_id?: number
  codigoBarras?: string
  codigo_barras?: string
  nombreProducto?: string
  nombre_producto?: string
  codigoInterno?: string
  codigo_interno?: string
  precioCompra?: number
  precio_compra?: number
  precioVenta?: number
  precio_venta?: number
  estado?: number
  marcaBaja?: boolean
  marca_baja?: boolean
}

export interface ProveedorDTO {
  proveedorId?: number
  proveedor_id?: number
  nombreEmpresa?: string
  nombre_empresa?: string
  nombreContacto?: string
  nombre_contacto?: string
  numeroContacto?: string
  numero_contacto?: string
  anotaciones?: string
  marcaBaja?: boolean
  marca_baja?: boolean
}

export interface CategoriaDTO {
  categoriaId?: number
  categoria_id?: number
  codigo?: number
  nombreCategoria?: string
  nombre_categoria?: string
  descripcion?: string
}

export interface ActualizarDescuentoRequest {
  enDescuento: boolean
  precioDescuento?: number | null
}

export interface CodigoInternoResponse {
  prefijo: string
  codigoInterno: string
}

// ====================================================================
// SERVICIO CENTRALIZADO DE INVENTARIO
// ====================================================================

export const inventarioService = {
  /**
   * GET /kpis
   * Obtiene las métricas en tiempo real:
   * total_productos_catalogo, unidades_stock_activo, lotes_sala_espera, alertas_vencimiento
   */
  async obtenerKpis(): Promise<InventarioKpi> {
    const response = await api.get<InventarioKpi>('/kpis')
    return response.data
  },

  /**
   * GET /lotes
   * Listado de inventario activo por lotes (con cálculo de caducidad y datos de producto/proveedor)
   */
  async listarLotes(): Promise<InventarioLote[]> {
    const response = await api.get<InventarioLote[]>('/lotes')
    return response.data
  },

  /**
   * GET /catalogo
   * Maestro de productos registrados con su stock acumulado
   */
  async listarCatalogo(): Promise<ProductoCatalogo[]> {
    const response = await api.get<ProductoCatalogo[]>('/catalogo')
    return response.data
  },

  /**
   * GET /pendientes
   * Listado de la sala de espera (registros con estado = 1 pendientes de aprobación)
   */
  async listarPendientes(): Promise<InventarioPendiente[]> {
    const response = await api.get<InventarioPendiente[]>('/pendientes')
    return response.data
  },

  /**
   * POST /pendientes
   * Cajero envía un nuevo registro de mercadería a la sala de espera
   */
  async registrarPendiente(datos: RegistroPendienteRequest): Promise<InventarioPendiente> {
    const response = await api.post<InventarioPendiente>('/pendientes', datos)
    return response.data
  },

  /**
   * PUT /pendientes/{id}
   * Actualiza los datos de un registro pendiente en sala de espera antes de ser procesado
   */
  async actualizarPendiente(id: number, datos: RegistroPendienteRequest): Promise<InventarioPendiente> {
    const response = await api.put<InventarioPendiente>(`/pendientes/${id}`, datos)
    return response.data
  },

  /**
   * PUT /pendientes/{id}/aprobar
   * Supervisor o Propietario aprueba un registro de sala de espera.
   * Ejecuta el procedimiento almacenado en PostgreSQL para crear producto (si es nuevo),
   * generar lote y sumarlo al stock activo.
   */
  async aprobarPendiente(
    id: number,
    cambios?: Partial<RegistroPendienteRequest> | null,
    usuarioRevision: number = 2
  ): Promise<{ mensaje: string; inventarioPendienteId: number }> {
    const response = await api.put<{ mensaje: string; inventarioPendienteId: number }>(
      `/pendientes/${id}/aprobar`,
      cambios || {},
      {
        params: { usuarioRevision },
      }
    )
    return response.data
  },

  /**
   * PUT /pendientes/{id}/rechazar
   * Supervisor rechaza un registro de mercadería en sala de espera (anulado sin sumar stock)
   */
  async rechazarPendiente(
    id: number,
    motivoOUsuario?: string | number | null,
    usuarioRevision: number = 2
  ): Promise<{ mensaje: string; inventarioPendienteId: number }> {
    let motivo: string | undefined = undefined
    let usuarioRev = usuarioRevision

    if (typeof motivoOUsuario === 'number') {
      usuarioRev = motivoOUsuario
    } else if (typeof motivoOUsuario === 'string') {
      motivo = motivoOUsuario
    }

    const response = await api.put<{ mensaje: string; inventarioPendienteId: number }>(
      `/pendientes/${id}/rechazar`,
      null,
      {
        params: { motivo, usuarioRevision: usuarioRev },
      }
    )
    return response.data
  },

  /**
   * PUT /pendientes/{id}/observar
   * Supervisor devuelve el registro al cajero para corrección (estado = 4).
   */
  async observarPendiente(
    id: number,
    observacion?: string,
    usuarioRevision: number = 2
  ): Promise<{ mensaje: string; inventarioPendienteId: number }> {
    const response = await api.put<{ mensaje: string; inventarioPendienteId: number }>(
      `/pendientes/${id}/observar`,
      null,
      {
        params: { observacion, usuarioRevision },
      }
    )
    return response.data
  },

  /**
   * POST /ingreso-directo
   * Supervisor ingresa mercadería inmediatamente saltando la sala de espera
   */
  async ingresoDirectoSupervisor(datos: IngresoDirectoRequest): Promise<{ mensaje: string }> {
    const response = await api.post<{ mensaje: string }>('/ingreso-directo', datos)
    return response.data
  },

  /**
   * GET /productos/buscar?codigo={codigo}
   * Búsqueda por escáner láser o código manual (soporta código de barras o código interno)
   */
  async buscarProductoPorCodigo(codigo: string): Promise<ProductoDTO | null> {
    try {
      const response = await api.get<ProductoDTO>('/productos/buscar', {
        params: { codigo },
      })
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * PATCH /lotes/{inventarioId}/descuento
   * Activa/desactiva la oferta por fecha próxima a vencer y fija precio rebajado
   */
  async actualizarDescuentoLote(
    inventarioId: number,
    datos: ActualizarDescuentoRequest
  ): Promise<{ mensaje: string }> {
    const response = await api.patch<{ mensaje: string }>(`/lotes/${inventarioId}/descuento`, datos)
    return response.data
  },

  /**
   * PATCH /productos/{productoId}/estado
   * Cambia el estado del producto (1: Activo, 2: Descontinuado, 3: Suspendido)
   */
  async actualizarEstadoProducto(
    productoId: number,
    estado: number
  ): Promise<{ mensaje: string; estado: number }> {
    const response = await api.patch<{ mensaje: string; estado: number }>(
      `/productos/${productoId}/estado`,
      { estado }
    )
    return response.data
  },

  /**
   * DELETE /productos/{productoId}
   * Baja lógica de un producto del catálogo
   */
  async darBajaProducto(productoId: number): Promise<{ mensaje: string }> {
    const response = await api.delete<{ mensaje: string }>(`/productos/${productoId}`)
    return response.data
  },

  /**
   * DELETE /lotes/{inventarioId}
   * Baja lógica de un ítem de lote en el inventario activo
   */
  async darBajaLote(inventarioId: number): Promise<{ mensaje: string }> {
    const response = await api.delete<{ mensaje: string }>(`/lotes/${inventarioId}`)
    return response.data
  },

  /**
   * GET /proveedores
   * Listado de proveedores registrados activos
   */
  async listarProveedores(): Promise<ProveedorDTO[]> {
    const response = await api.get<ProveedorDTO[]>('/proveedores')
    return response.data
  },

  /**
   * GET /categorias
   * Listado de categorías de productos
   */
  async listarCategorias(): Promise<CategoriaDTO[]> {
    const response = await api.get<CategoriaDTO[]>('/categorias')
    return response.data
  },

  /**
   * GET /codigo-interno?prefijo={prefijo}
   * Obtiene correlativo autogenerado por la BD (ej: LEC003)
   */
  async generarCodigoInterno(prefijo: string = 'PRO'): Promise<CodigoInternoResponse> {
    const response = await api.get<CodigoInternoResponse>('/codigo-interno', {
      params: { prefijo },
    })
    return response.data
  },
}

export default inventarioService

