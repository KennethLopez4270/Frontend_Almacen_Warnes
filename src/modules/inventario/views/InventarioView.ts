import { ref, computed, reactive, nextTick, watch } from 'vue'
import router from '@/router'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  ROLES_USUARIO,
  MAPA_ROLES,
  MAPA_ESTADOS_PRODUCTO,
  MAPA_ESTADOS_SALA_ESPERA,
  ESTADOS_SALA_ESPERA,
  getBadgeRol,
  getBadgeEstadoProducto,
  getBadgeEstadoPendiente,
  type RolUsuarioId
} from '@/constants/mapeoEstados'
import {
  inventarioService,
  type InventarioKpi,
  type InventarioLote,
  type ProductoCatalogo,
  type InventarioPendiente as InventarioPendienteDTO,
  type RegistroPendienteRequest,
  type IngresoDirectoRequest,
  type DescontarUnidadesRequest,
  type ProveedorDTO,
  type CategoriaDTO
} from '@/services/inventarioService'
import { proveedorService } from '@/services/proveedorService'
import { useUsuarioActivo } from '@/composables/useUsuarioActivo'

// ====================================================================
// 1. CONSTANTES Y TABLA PARAMETRICA CONCEPTOS (MAPEO 1:1 BD)
// ====================================================================

export { router }

// Grupo 1: Roles de Usuario (centralizado desde @/constants/mapeoEstados)
export const ROLES = ROLES_USUARIO
type RolUsuario = RolUsuarioId

// Grupo 2: Categorías de Producto (100% dinámico poblado desde conceptos grupo 2)
export const CATEGORIAS: Record<number, string> = reactive({})
export const listaCategorias = ref<CategoriaDTO[]>([])

// Grupo 3: Estado de Productos en Catálogo (centralizado desde @/constants/mapeoEstados)
export const ESTADOS_PRODUCTO = MAPA_ESTADOS_PRODUCTO

// Grupo 7: Estado de Inventario Pendiente / Sala de Espera (centralizado desde @/constants/mapeoEstados)
export const ESTADOS_PENDIENTE = MAPA_ESTADOS_SALA_ESPERA

// ====================================================================
// 2. MODELOS E INTERFACES TIPADAS (POSTGRESQL & SPRING BOOT)
// ====================================================================

export interface Proveedor {
  proveedor_id: number
  nombre_empresa: string
  nombre_contacto: string
  numero_contacto: string
  anotaciones: string
  marca_baja: boolean
}

export interface Producto {
  producto_id: number
  categoria_id: number
  codigo_barras: string
  nombre_producto: string
  codigo_interno: string
  precio_compra: number
  precio_venta: number
  estado: number // 1: Activo, 2: Descontinuado, 3: Suspendido
  marca_baja: boolean
  fecha_creacion: string
  usuario_creacion: number
}

export interface Lote {
  lote_id: number
  proveedor_id: number | null
  descripcion: string
  cantidad: number
  precio_lote: number
  costo_unitario: number
  fecha_vencimiento: string | null
  marca_baja: boolean
  fecha_creacion: string
  usuario_creacion: number
}

export interface InventarioItem {
  inventario_id: number
  sucursal_id: number // Siempre 1
  lote_id: number
  producto_id: number
  stock: number
  en_descuento: boolean
  precio_descuento: number | null
  marca_baja: boolean
}

export interface InventarioPendiente {
  inventario_pendiente_id: number
  inventarioPendienteId?: number
  sucursal_id: number
  sucursalId?: number
  producto_id: number | null
  productoId?: number | null
  nombre_producto: string
  nombreProducto?: string
  codigo_barras: string | null
  codigoBarras?: string | null
  codigo_interno: string
  codigoInterno?: string
  categoria_id: number
  categoriaId?: number
  precio_compra: number
  precioCompra?: number
  precio_venta: number
  precioVenta?: number
  stock_ingresado: number
  stockIngresado?: number
  estado: number // 1: Pendiente, 2: Aprobado, 3: Rechazado
  proveedor_id: number | null
  proveedorId?: number | null
  nombre_proveedor?: string | null
  nombreProveedor?: string | null
  descripcion_lote: string
  descripcionLote?: string
  precio_lote: number
  precioLote?: number
  fecha_vencimiento: string | null
  fechaVencimiento?: string | null
  observacion_revision: string | null
  observacionRevision?: string | null
  fecha_subsanacion?: string | null
  fechaSubsanacion?: string | null
  fecha_creacion: string
  fechaCreacion?: string
  usuario_creacion: number
  usuarioCreacion?: number
  nombre_usuario_creacion?: string | null
  nombreUsuarioCreacion?: string | null
  fecha_revision: string | null
  fechaRevision?: string | null
  usuario_revision: number | null
  usuarioRevision?: number | null
  nombre_usuario_revision?: string | null
  nombreUsuarioRevision?: string | null
  marca_baja: boolean
  marcaBaja?: boolean
}

export interface ToastNotificacion {
  id: number
  titulo: string
  mensaje: string
  tipo: 'info' | 'success' | 'warning' | 'danger'
}

// ====================================================================
// 3. UTILIDADES DE FECHA, FORMATEO Y ERRORES
// ====================================================================

export function getDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function getDiasParaVencer(fechaStr: string | null): number | null {
  if (!fechaStr) return null
  const parts = fechaStr.split('-').map(Number)
  if (parts.length < 3) return null
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  const fechaVenc = new Date(year, month - 1, day)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  fechaVenc.setHours(0, 0, 0, 0)
  const diffTime = fechaVenc.getTime() - hoy.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function formatMontoBs(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || isNaN(monto)) return 'Bs 0.00'
  return `Bs ${Number(monto).toFixed(2)}`
}

/**
 * Extrae el mensaje de error exacto retornado por el backend de Spring Boot y PostgreSQL
 * (captura excepciones RAISE EXCEPTION, HTTP 400 Bad Request, HTTP 409 Conflict)
 */
export function extraerMensajeError(err: any): string {
  if (err?.userMessage) return err.userMessage
  if (err?.response?.data?.mensaje) return err.response.data.mensaje
  if (err?.response?.data?.message) return err.response.data.message
  if (typeof err?.response?.data === 'string' && err.response.data.trim()) return err.response.data
  return err?.message || 'Error al comunicarse con el servidor de la base de datos'
}

export function normalizarPendiente(p: any): InventarioPendiente {
  const fCreacion = p.fecha_creacion || p.fechaCreacion || new Date().toISOString()
  return {
    inventario_pendiente_id: p.inventario_pendiente_id || p.inventarioPendienteId || 0,
    inventarioPendienteId: p.inventarioPendienteId || p.inventario_pendiente_id || 0,
    sucursal_id: p.sucursal_id || p.sucursalId || 1,
    sucursalId: p.sucursalId || p.sucursal_id || 1,
    producto_id: p.producto_id !== undefined ? p.producto_id : (p.productoId !== undefined ? p.productoId : null),
    productoId: p.productoId !== undefined ? p.productoId : (p.producto_id !== undefined ? p.producto_id : null),
    nombre_producto: p.nombre_producto || p.nombreProducto || '',
    nombreProducto: p.nombreProducto || p.nombre_producto || '',
    codigo_barras: p.codigo_barras !== undefined ? p.codigo_barras : (p.codigoBarras !== undefined ? p.codigoBarras : null),
    codigoBarras: p.codigoBarras !== undefined ? p.codigoBarras : (p.codigo_barras !== undefined ? p.codigo_barras : null),
    codigo_interno: p.codigo_interno || p.codigoInterno || '',
    codigoInterno: p.codigoInterno || p.codigo_interno || '',
    categoria_id: p.categoria_id || p.categoriaId || 1,
    categoriaId: p.categoriaId || p.categoria_id || 1,
    precio_compra: Number(p.precio_compra ?? p.precioCompra ?? 0),
    precioCompra: Number(p.precioCompra ?? p.precio_compra ?? 0),
    precio_venta: Number(p.precio_venta ?? p.precioVenta ?? 0),
    precioVenta: Number(p.precioVenta ?? p.precio_venta ?? 0),
    stock_ingresado: Number(p.stock_ingresado ?? p.stockIngresado ?? 0),
    stockIngresado: Number(p.stockIngresado ?? p.stock_ingresado ?? 0),
    estado: p.estado ?? 1,
    proveedor_id: p.proveedor_id !== undefined ? p.proveedor_id : (p.proveedorId !== undefined ? p.proveedorId : null),
    proveedorId: p.proveedorId !== undefined ? p.proveedorId : (p.proveedor_id !== undefined ? p.proveedor_id : null),
    nombre_proveedor: p.nombre_proveedor || p.nombreProveedor || null,
    nombreProveedor: p.nombreProveedor || p.nombre_proveedor || null,
    descripcion_lote: p.descripcion_lote || p.descripcionLote || '',
    descripcionLote: p.descripcionLote || p.descripcion_lote || '',
    precio_lote: Number(p.precio_lote ?? p.precioLote ?? 0),
    precioLote: Number(p.precioLote ?? p.precio_lote ?? 0),
    fecha_vencimiento: p.fecha_vencimiento || p.fechaVencimiento || null,
    fechaVencimiento: p.fechaVencimiento || p.fecha_vencimiento || null,
    observacion_revision: p.observacion_revision || p.observacionRevision || null,
    observacionRevision: p.observacionRevision || p.observacion_revision || null,
    fecha_subsanacion: p.fecha_subsanacion || p.fechaSubsanacion || null,
    fechaSubsanacion: p.fechaSubsanacion || p.fecha_subsanacion || null,
    fecha_creacion: fCreacion,
    fechaCreacion: fCreacion,
    usuario_creacion: p.usuario_creacion ?? p.usuarioCreacion ?? 1,
    usuarioCreacion: p.usuarioCreacion ?? p.usuario_creacion ?? 1,
    nombre_usuario_creacion: p.nombre_usuario_creacion || p.nombreUsuarioCreacion || null,
    nombreUsuarioCreacion: p.nombreUsuarioCreacion || p.nombre_usuario_creacion || null,
    fecha_revision: p.fecha_revision || p.fechaRevision || null,
    fechaRevision: p.fechaRevision || p.fecha_revision || null,
    usuario_revision: p.usuario_revision ?? p.usuarioRevision ?? null,
    usuarioRevision: p.usuarioRevision ?? p.usuario_revision ?? null,
    nombre_usuario_revision: p.nombre_usuario_revision || p.nombreUsuarioRevision || null,
    nombreUsuarioRevision: p.nombreUsuarioRevision || p.nombre_usuario_revision || null,
    marca_baja: Boolean(p.marca_baja ?? p.marcaBaja ?? false),
    marcaBaja: Boolean(p.marcaBaja ?? p.marca_baja ?? false),
  }
}

// ====================================================================
// 4. ESTADO REACTIVO ASINCRONO (DATOS REALES DEL BACKEND)
// ====================================================================

export const cargando = ref(false)
export const kpisBackend = ref<InventarioKpi | null>(null)
export const lotesStock = ref<InventarioLote[]>([])
export const inventarioPendientes = ref<InventarioPendiente[]>([])
export const catalogoBackend = ref<ProductoCatalogo[]>([])
export const catalogoActivo = ref<ProductoCatalogo[]>([])
export const proveedores = ref<Proveedor[]>([])
export const productos = ref<Producto[]>([])

// ====================================================================
// 5. ESTADO GLOBAL DE LA VISTA
// ====================================================================

export const {
  listaUsuarios,
  usuarioActivoId,
  usuarioActivo,
  rolActivo,
  cargarUsuarios,
  resolverNombreUsuario,
} = useUsuarioActivo()

export const puedeCrearProveedor = computed(() => {
  return rolActivo.value === ROLES.SUPERVISOR || rolActivo.value === ROLES.PROPIETARIO
})
export const puedeCrearCategoria = computed(() => {
  return rolActivo.value === ROLES.SUPERVISOR || rolActivo.value === ROLES.PROPIETARIO
})
export const puedeVerMargen = computed(() => {
  return rolActivo.value === ROLES.SUPERVISOR || rolActivo.value === ROLES.PROPIETARIO
})

export const opcionesCategorias = computed(() => {
  return listaCategorias.value.map((c) => ({
    value: Number(c.codigo ?? c.categoria_id ?? c.categoriaId ?? 0),
    label: c.nombreCategoria || c.descripcion || c.nombre_categoria || `Categoría #${c.codigo}`
  }))
})

export const opcionesProveedores = computed(() => {
  const lista: { value: number | null; label: string; subtitle?: string }[] = [
    {
      value: null,
      label: 'Sin proveedor / Compra directa'
    }
  ]
  proveedores.value
    .filter((p) => p.marca_baja !== true && (p as any).marcaBaja !== true)
    .forEach((p) => {
      const contacto = [p.nombre_contacto, p.numero_contacto].filter(Boolean).join(' • ')
      lista.push({
        value: p.proveedor_id,
        label: p.nombre_empresa,
        subtitle: contacto || undefined
      })
    })
  return lista
})

export const opcionesProductosCatalogo = computed(() => {
  const fuente = catalogoActivo.value.length > 0 ? catalogoActivo.value : catalogoBackend.value
  return fuente
    .filter((p) => p.marca_baja !== true && (p as any).marcaBaja !== true)
    .map((p) => {
      const nombre = p.nombre_producto || p.nombreProducto || ''
      const cod = p.codigo_interno || p.codigoInterno || ''
      const cat = p.categoria_nombre || p.categoriaNombre || CATEGORIAS[p.categoria_id || p.categoriaId || 1] || ''
      const detalles = [cod, cat].filter(Boolean).join(' • ')
      return {
        value: p.producto_id || p.productoId || 0,
        label: nombre,
        subtitle: detalles || undefined
      }
    })
})

export const modoProductoNuevoRecepcion = ref(false)
export const productoSeleccionadoRecepcionId = ref<number | null>(null)

export function onSeleccionarProductoCatalogoRecepcion(productoId: number | null) {
  productoSeleccionadoRecepcionId.value = productoId
  if (!productoId) {
    formRecepcion.producto_id = null
    return
  }
  const fuente = catalogoActivo.value.length > 0 ? catalogoActivo.value : catalogoBackend.value
  const encontrado = fuente.find((p) => (p.producto_id || p.productoId) === productoId)
  if (encontrado) {
    formRecepcion.producto_id = encontrado.producto_id || encontrado.productoId || null
    formRecepcion.nombre_producto = encontrado.nombre_producto || encontrado.nombreProducto || ''
    formRecepcion.codigo_interno = encontrado.codigo_interno || encontrado.codigoInterno || ''
    formRecepcion.codigo_barras = encontrado.codigo_barras || encontrado.codigoBarras || ''
    formRecepcion.categoria_id = encontrado.categoria_id || encontrado.categoriaId || formRecepcion.categoria_id
    if (encontrado.precio_compra || (encontrado as any).precioCompra) {
      formRecepcion.precio_compra = Number(encontrado.precio_compra ?? (encontrado as any).precioCompra ?? 0)
    }
    if (encontrado.precio_venta || (encontrado as any).precioVenta) {
      formRecepcion.precio_venta = Number(encontrado.precio_venta ?? (encontrado as any).precioVenta ?? 0)
    }
    formRecepcion.descripcion_lote = `Lote ${formRecepcion.nombre_producto} ${new Date().toLocaleDateString('es-BO', { month: 'short', year: 'numeric' })}`
  }
}

export function alternarModoProductoRecepcion(esNuevo: boolean) {
  modoProductoNuevoRecepcion.value = esNuevo
  if (esNuevo) {
    productoSeleccionadoRecepcionId.value = null
    formRecepcion.producto_id = null
    formRecepcion.nombre_producto = ''
    formRecepcion.codigo_interno = ''
    autogenerarCodigoInterno('')
  } else {
    const fuente = catalogoActivo.value.length > 0 ? catalogoActivo.value : catalogoBackend.value
    if (fuente.length > 0) {
      const actual = fuente.find(p => (p.nombre_producto || p.nombreProducto) === formRecepcion.nombre_producto)
      if (actual) {
        onSeleccionarProductoCatalogoRecepcion(actual.producto_id || actual.productoId || null)
      } else {
        const primero = fuente[0]
        if (primero) {
          onSeleccionarProductoCatalogoRecepcion(primero.producto_id || primero.productoId || null)
        }
      }
    }
  }
}

export const modoProductoNuevoEdicion = ref(false)
export const productoSeleccionadoEdicionId = ref<number | null>(null)

export function onSeleccionarProductoCatalogoEdicion(productoId: number | null) {
  productoSeleccionadoEdicionId.value = productoId
  if (!productoId) {
    formEditarPendiente.producto_id = null
    return
  }
  const fuente = catalogoActivo.value.length > 0 ? catalogoActivo.value : catalogoBackend.value
  const encontrado = fuente.find((p) => (p.producto_id || p.productoId) === productoId)
  if (encontrado) {
    formEditarPendiente.producto_id = encontrado.producto_id || encontrado.productoId || null
    formEditarPendiente.nombre_producto = encontrado.nombre_producto || encontrado.nombreProducto || ''
    formEditarPendiente.codigo_interno = encontrado.codigo_interno || encontrado.codigoInterno || ''
    formEditarPendiente.codigo_barras = encontrado.codigo_barras || encontrado.codigoBarras || formEditarPendiente.codigo_barras
    formEditarPendiente.categoria_id = encontrado.categoria_id || encontrado.categoriaId || formEditarPendiente.categoria_id
    if (encontrado.precio_compra || (encontrado as any).precioCompra) {
      formEditarPendiente.precio_compra = Number(encontrado.precio_compra ?? (encontrado as any).precioCompra ?? 0)
    }
    if (encontrado.precio_venta || (encontrado as any).precioVenta) {
      formEditarPendiente.precio_venta = Number(encontrado.precio_venta ?? (encontrado as any).precioVenta ?? 0)
    }
    onEditarCalculoPrecioLote()
  }
}
export const activeTab = ref<'stock' | 'espera' | 'catalogo'>('stock')

// Filtros compartidos
export const searchQuery = ref('')
export const selectedCategoria = ref<number | ''>('')
export const selectedProveedor = ref<number | ''>('')
export const selectedEstadoProducto = ref<number | ''>('')
export const filterProximosVencer = ref(false)
export const filterEnOferta = ref(false)
export const filterEstadoPendiente = ref<number | ''>('') // '' = Todos los estados (Pendientes, Aprobados y Rechazados)
export const selectedEstadoRegistro = ref<'ACTIVOS' | 'INACTIVOS' | 'TODOS'>('ACTIVOS')

export async function onEstadoRegistroChange() {
  await recargarTodo()
}

// Umbral dinámico y configurable para alertas de vencimiento (por defecto 14 días / 2 semanas)
export const diasUmbralVencimientoPreset = ref<number | 'custom'>(14)
export const diasUmbralVencimiento = ref<number>(14)

export function onPresetVencimientoChange() {
  if (diasUmbralVencimientoPreset.value !== 'custom') {
    diasUmbralVencimiento.value = Number(diasUmbralVencimientoPreset.value)
  }
}

// Notificaciones Toast y Alertas
export const toasts = ref<ToastNotificacion[]>([])
export let toastCounter = 0

export function agregarToast(titulo: string, mensaje: string, tipo: 'info' | 'success' | 'warning' | 'danger' = 'info') {
  // Evitar duplicados idénticos en pantalla simultáneamente
  const yaExiste = toasts.value.some((t) => t.titulo === titulo && t.mensaje === mensaje)
  if (yaExiste) {
    return
  }

  const id = ++toastCounter
  toasts.value.push({ id, titulo, mensaje, tipo })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4500)
}

export function removerToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

// Panel de notificaciones emergente
export const showNotificationsDrawer = ref(false)


// ====================================================================
// GESTION DE AUDITORIA Y TRAZABILIDAD (QUIEN APRUEBA Y QUIEN RECHAZA)
// ====================================================================

export const STORAGE_KEY_AUDITORIA = 'almacen_warnes_historial_auditoria'

export interface InfoUsuario {
  nombreCompleto: string
  rolNombre: string
  cargo: string
  rolId: number
}

export function resolverInfoUsuario(id: number | null | undefined): InfoUsuario {
  if (id) {
    const u = listaUsuarios.value.find((user) => (user.usuarioId || user.usuario_id) === id)
    if (u) {
      const nombre = u.nombreCompleto || u.nombre_completo || `${u.nombres} ${u.apellidos}`
      const rol = u.rolNombre || u.rol_nombre || 'Personal'
      return {
        nombreCompleto: nombre.trim(),
        rolNombre: rol,
        cargo: rol,
        rolId: u.rolId || u.rol_id || 1,
      }
    }
  }
  return {
    nombreCompleto: id ? `Usuario #${id}` : 'Sistema',
    rolNombre: 'Personal',
    cargo: 'Turno Activo',
    rolId: 1,
  }
}

export function getBadgeUsuario(usuarioId: number | null | undefined) {
  const info = resolverInfoUsuario(usuarioId)
  return getBadgeRol(info.rolId)
}

export function formatearFechaCorta(fechaStr: string | null | undefined): string {
  if (!fechaStr) return ''
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr.slice(0, 10)
    return d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (_) {
    return fechaStr.slice(0, 10)
  }
}

export function formatearFechaHora(fechaStr: string | null | undefined): string {
  if (!fechaStr) return ''
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr.slice(0, 10)
    return d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (_) {
    return fechaStr.slice(0, 10)
  }
}

export function obtenerHistorialAuditoria(): InventarioPendiente[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDITORIA)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (_) {}

  // Datos iniciales de auditoria historica para visualizar aprobados y rechazados
  const inicial: InventarioPendiente[] = [
    {
      inventario_pendiente_id: 101,
      inventarioPendienteId: 101,
      sucursal_id: 1,
      sucursalId: 1,
      producto_id: 1,
      productoId: 1,
      nombre_producto: 'Leche Pil Entera 1L (Reposición)',
      nombreProducto: 'Leche Pil Entera 1L (Reposición)',
      codigo_barras: '7771234560012',
      codigoBarras: '7771234560012',
      codigo_interno: 'LEC001',
      codigoInterno: 'LEC001',
      categoria_id: 1,
      categoriaId: 1,
      precio_compra: 5.2,
      precioCompra: 5.2,
      precio_venta: 6.0,
      precioVenta: 6.0,
      stock_ingresado: 60,
      stockIngresado: 60,
      estado: 2, // 2: Aprobado
      proveedor_id: 1,
      proveedorId: 1,
      descripcion_lote: 'Lote Pil Reposición Quincenal',
      descripcionLote: 'Lote Pil Reposición Quincenal',
      precio_lote: 312.0,
      precioLote: 312.0,
      fecha_vencimiento: getDateOffset(45),
      fechaVencimiento: getDateOffset(45),
      observacion_revision: 'Aprobado sin observaciones. Mercadería en perfecto estado.',
      observacionRevision: 'Aprobado sin observaciones. Mercadería en perfecto estado.',
      fecha_creacion: getDateOffset(-2) + 'T09:15:00',
      fechaCreacion: getDateOffset(-2) + 'T09:15:00',
      usuario_creacion: 1, // Cajero Juan
      usuarioCreacion: 1,
      fecha_revision: getDateOffset(-2) + 'T10:30:00',
      fechaRevision: getDateOffset(-2) + 'T10:30:00',
      usuario_revision: 2, // Supervisor Carlos
      usuarioRevision: 2,
      marca_baja: false,
      marcaBaja: false
    },
    {
      inventario_pendiente_id: 102,
      inventarioPendienteId: 102,
      sucursal_id: 1,
      sucursalId: 1,
      producto_id: null,
      productoId: null,
      nombre_producto: 'Yogurt Frutilla 1L Dañado',
      nombreProducto: 'Yogurt Frutilla 1L Dañado',
      codigo_barras: '7779900112233',
      codigoBarras: '7779900112233',
      codigo_interno: 'YOG001',
      codigoInterno: 'YOG001',
      categoria_id: 1,
      categoriaId: 1,
      precio_compra: 8.5,
      precioCompra: 8.5,
      precio_venta: 11.0,
      precioVenta: 11.0,
      stock_ingresado: 24,
      stockIngresado: 24,
      estado: 3, // 3: Rechazado
      proveedor_id: 1,
      proveedorId: 1,
      descripcion_lote: 'Lote Yogurt Vencimiento Inmediato',
      descripcionLote: 'Lote Yogurt Vencimiento Inmediato',
      precio_lote: 204.0,
      precioLote: 204.0,
      fecha_vencimiento: getDateOffset(2),
      fechaVencimiento: getDateOffset(2),
      observacion_revision: 'Envases con pérdida de frío y vencimiento menor a 3 días. Rechazado y devuelto a proveedor.',
      observacionRevision: 'Envases con pérdida de frío y vencimiento menor a 3 días. Rechazado y devuelto a proveedor.',
      fecha_creacion: getDateOffset(-1) + 'T14:20:00',
      fechaCreacion: getDateOffset(-1) + 'T14:20:00',
      usuario_creacion: 1, // Cajero Juan
      usuarioCreacion: 1,
      fecha_revision: getDateOffset(-1) + 'T15:00:00',
      fechaRevision: getDateOffset(-1) + 'T15:00:00',
      usuario_revision: 2, // Supervisor Carlos
      usuarioRevision: 2,
      marca_baja: false,
      marcaBaja: false
    }
  ]
  guardarHistorialAuditoria(inicial)
  return inicial
}

export function guardarHistorialAuditoria(lista: InventarioPendiente[]) {
  try {
    localStorage.setItem(STORAGE_KEY_AUDITORIA, JSON.stringify(lista))
  } catch (_) {}
}

export const conteoEspera = computed(() => {
  const items = inventarioPendientes.value.filter((p) => !(p.marca_baja || p.marcaBaja))
  return {
    todos: items.length,
    pendientes: items.filter((p) => p.estado === 1).length,
    aprobados: items.filter((p) => p.estado === 2).length,
    rechazados: items.filter((p) => p.estado === 3).length,
    observados: items.filter((p) => p.estado === 4).length
  }
})

// ====================================================================
// 6. METRICAS SUPERIORES (KPIs DESDE GET /kpis)
// ====================================================================

export const totalProductosCatalogo = computed(() => {
  if (kpisBackend.value) {
    return Number(kpisBackend.value.total_productos_catalogo ?? kpisBackend.value.totalProductosCatalogo ?? 0)
  }
  return catalogoBackend.value.length
})

export const totalStockActivo = computed(() => {
  if (kpisBackend.value) {
    return Number(kpisBackend.value.unidades_stock_activo ?? kpisBackend.value.unidadesStockActivo ?? 0)
  }
  return lotesStock.value.reduce((acc, curr) => acc + (curr.stock || 0), 0)
})

export const totalEnSalaEspera = computed(() => {
  if (kpisBackend.value) {
    return Number(kpisBackend.value.lotes_sala_espera ?? kpisBackend.value.lotesSalaEspera ?? 0)
  }
  return inventarioPendientes.value.filter((p) => !(p.marca_baja || p.marcaBaja) && p.estado === 1).length
})

export const totalAlertasVencimiento = computed(() => {
  if (kpisBackend.value) {
    return Number(kpisBackend.value.alertas_vencimiento ?? kpisBackend.value.alertasVencimiento ?? 0)
  }
  return lotesStock.value.filter((l) => {
    const dias = l.dias_para_vencer ?? l.diasParaVencer ?? getDiasParaVencer(l.fecha_vencimiento || l.fechaVencimiento || null)
    return dias !== null && dias <= diasUmbralVencimiento.value
  }).length
})

// ====================================================================
// 7. TAB 1: STOCK POR LOTES (INVENTARIO ACTIVO DESDE GET /lotes)
// ====================================================================

export interface StockFilaCombinada {
  inventario_id: number
  sucursal_id: number
  stock: number
  en_descuento: boolean
  precio_descuento: number | null
  marca_baja: boolean
  // Datos Lote
  lote_id: number
  descripcion_lote: string
  cantidad_lote: number
  precio_lote: number
  costo_unitario: number
  fecha_vencimiento: string | null
  dias_vencimiento: number | null
  // Datos Producto
  producto_id: number
  codigo_interno: string
  codigo_barras: string
  nombre_producto: string
  categoria_id: number
  categoria_nombre: string
  precio_venta_producto: number
  estado_producto: number
  // Datos Proveedor
  proveedor_id: number | null
  nombre_proveedor: string
}

export const filasStock = computed<StockFilaCombinada[]>(() => {
  return lotesStock.value
    .map((item) => {
      const fechaVenc = item.fecha_vencimiento || item.fechaVencimiento || null
      const diasVenc = item.dias_para_vencer ?? item.diasParaVencer ?? getDiasParaVencer(fechaVenc)
      const fuente = catalogoActivo.value.length > 0 ? catalogoActivo.value : catalogoBackend.value
      const producto = fuente.find((p) => (p.producto_id || p.productoId) === (item.producto_id || item.productoId))
      const categoriaId = producto?.categoria_id || producto?.categoriaId || 1

      return {
        inventario_id: item.inventario_id || item.inventarioId || 0,
        sucursal_id: 1,
        stock: item.stock ?? 0,
        en_descuento: Boolean(item.en_descuento ?? item.enDescuento),
        precio_descuento: item.precio_descuento ?? item.precioDescuento ?? null,
        marca_baja: Boolean(item.marca_baja ?? item.marcaBaja ?? false),
        lote_id: item.lote_id || item.loteId || 0,
        descripcion_lote: item.descripcion_lote || item.descripcionLote || 'Sin descripción',
        cantidad_lote: item.stock ?? 0,
        precio_lote: Number((item.costo_unitario ?? item.costoUnitario ?? 0) * (item.stock ?? 0)),
        costo_unitario: Number(item.costo_unitario ?? item.costoUnitario ?? 0),
        fecha_vencimiento: fechaVenc,
        dias_vencimiento: diasVenc,
        producto_id: item.producto_id || item.productoId || 0,
        codigo_interno: item.codigo_interno || item.codigoInterno || '---',
        codigo_barras: item.codigo_barras || item.codigoBarras || '---',
        nombre_producto: item.nombre_producto || item.nombreProducto || 'Desconocido',
        categoria_id: categoriaId,
        categoria_nombre: CATEGORIAS[categoriaId] ?? 'General',
        precio_venta_producto: Number(item.precio_venta ?? item.precioVenta ?? 0),
        estado_producto: item.estado_producto ?? item.estadoProducto ?? 1,
        proveedor_id: null,
        nombre_proveedor: item.nombre_proveedor || item.nombreProveedor || 'Compra directa'
      }
    })
    .filter((fila) => {
      // Filtro de búsqueda general
      if (searchQuery.value.trim() !== '') {
        const q = searchQuery.value.toLowerCase().trim()
        const matchNombre = fila.nombre_producto.toLowerCase().includes(q)
        const matchInterno = fila.codigo_interno.toLowerCase().includes(q)
        const matchBarras = fila.codigo_barras.toLowerCase().includes(q)
        const matchLote = fila.descripcion_lote.toLowerCase().includes(q)
        if (!matchNombre && !matchInterno && !matchBarras && !matchLote) return false
      }
      // Filtro Categoría
      if (selectedCategoria.value !== '' && fila.categoria_id !== selectedCategoria.value) {
        return false
      }
      // Filtro Estado Producto
      if (selectedEstadoProducto.value !== '' && fila.estado_producto !== selectedEstadoProducto.value) {
        return false
      }
      // Filtro proximos a vencer (estricto segun umbral de dias)
      if (filterProximosVencer.value) {
        if (fila.dias_vencimiento === null || fila.dias_vencimiento > diasUmbralVencimiento.value) {
          return false
        }
      }
      // Filtro solo productos en oferta / descuento
      if (filterEnOferta.value) {
        if (!fila.en_descuento) {
          return false
        }
      }
      return true
    })
})

// ====================================================================
// MODAL GENERAL DE CONFIRMACIÓN (BAJA LÓGICA / REACTIVACIÓN)
// ====================================================================

export const modalConfirmacion = reactive({
  visible: false,
  titulo: '',
  subtitulo: '',
  mensaje: '',
  alerta: '',
  textoBoton: 'Confirmar',
  tipo: 'danger' as 'danger' | 'success' | 'warning',
  procesando: false,
  onConfirmar: null as (() => Promise<void>) | null
})

export function cerrarModalConfirmacion() {
  modalConfirmacion.visible = false
  modalConfirmacion.procesando = false
  modalConfirmacion.onConfirmar = null
}

export async function ejecutarAccionConfirmacion() {
  if (!modalConfirmacion.onConfirmar) return
  modalConfirmacion.procesando = true
  try {
    await modalConfirmacion.onConfirmar()
    cerrarModalConfirmacion()
  } catch (_) {
    modalConfirmacion.procesando = false
  }
}

export function darBajaItemInventario(inventarioId: number, loteId?: number, nombreProducto?: string) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acción Restringida', 'Solo Supervisores o Propietarios pueden dar de baja ítems de inventario.', 'warning')
    return
  }
  const itemDesc = loteId ? `el Lote #${loteId}${nombreProducto ? ` (${nombreProducto})` : ''}` : `el ítem de inventario #${inventarioId}`

  modalConfirmacion.titulo = 'Confirmar Baja Lógica de Lote'
  modalConfirmacion.subtitulo = 'Retiro de inventario del stock comercial (marca_baja = true)'
  modalConfirmacion.mensaje = `¿Está seguro de dar de baja lógica ${itemDesc}?`
  modalConfirmacion.alerta = 'Esta acción marcará el lote con baja lógica y retirará todas sus unidades físicas del stock comercial disponible. Los registros históricos se preservarán para auditoría.'
  modalConfirmacion.textoBoton = 'Confirmar Baja Lógica'
  modalConfirmacion.tipo = 'danger'
  modalConfirmacion.onConfirmar = async () => {
    try {
      const res = await inventarioService.darBajaLote(inventarioId)
      agregarToast('Baja Lógica Realizada', res.mensaje || `Ítem de inventario #${inventarioId} marcado como baja.`, 'info')
      await recargarTodo()
    } catch (err: any) {
      agregarToast('Error al Dar de Baja', extraerMensajeError(err), 'danger')
      throw err
    }
  }
  modalConfirmacion.visible = true
}

export function reactivarItemInventario(inventarioId: number, loteId?: number, nombreProducto?: string) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acción Restringida', 'Solo Supervisores o Propietarios pueden reactivar ítems de inventario.', 'warning')
    return
  }
  const itemDesc = loteId ? `el Lote #${loteId}${nombreProducto ? ` (${nombreProducto})` : ''}` : `el ítem de inventario #${inventarioId}`

  modalConfirmacion.titulo = 'Reactivar Lote de Inventario'
  modalConfirmacion.subtitulo = 'Restauración de inventario dado de baja (marca_baja = false)'
  modalConfirmacion.mensaje = `¿Está seguro de reactivar y restaurar ${itemDesc}?`
  modalConfirmacion.alerta = 'Se revertirá la baja lógica y volverá a estar disponible comercialmente en el inventario activo.'
  modalConfirmacion.textoBoton = 'Reactivar y Restaurar'
  modalConfirmacion.tipo = 'success'
  modalConfirmacion.onConfirmar = async () => {
    try {
      const res = await inventarioService.reactivarLote(inventarioId, usuarioActivoId.value)
      agregarToast('Lote Reactivado', res.mensaje || `Ítem #${inventarioId} reactivado exitosamente.`, 'success')
      await recargarTodo()
    } catch (err: any) {
      agregarToast('Error al Reactivar', extraerMensajeError(err), 'danger')
      throw err
    }
  }
  modalConfirmacion.visible = true
}

// Modal de Descuento / Oferta por Caducidad
export const modalDescuentoVisible = ref(false)
export const itemDescuentoActivo = ref<StockFilaCombinada | null>(null)
export const formDescuento = reactive({
  activar: false,
  precio_descuento: 0
})

export function abrirModalDescuento(fila: StockFilaCombinada) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Permiso Denegado', 'Solo el Supervisor o Propietario pueden fijar precios de oferta.', 'warning')
    return
  }
  itemDescuentoActivo.value = fila
  formDescuento.activar = fila.en_descuento
  formDescuento.precio_descuento = fila.precio_descuento ?? Math.max(1, +(fila.precio_venta_producto * 0.75).toFixed(2))
  modalDescuentoVisible.value = true
}

export async function guardarDescuento() {
  if (!itemDescuentoActivo.value) return
  const invId = itemDescuentoActivo.value.inventario_id

  try {
    const res = await inventarioService.actualizarDescuentoLote(invId, {
      enDescuento: formDescuento.activar,
      precioDescuento: formDescuento.activar ? Number(formDescuento.precio_descuento) : null
    })
    agregarToast(
      'Política de Oferta Actualizada',
      res.mensaje || (formDescuento.activar
        ? `Lote #${itemDescuentoActivo.value.lote_id} rebajado a Bs ${Number(formDescuento.precio_descuento).toFixed(2)}.`
        : `Oferta desactivada para el Lote #${itemDescuentoActivo.value.lote_id}.`),
      'success'
    )
    modalDescuentoVisible.value = false
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error al Guardar Descuento', extraerMensajeError(err), 'danger')
  }
}

// ====================================================================
// MODAL: DESCONTAR UNIDADES / MERMA (INDIVIDUAL POR LOTE)
// ====================================================================

export const modalDescontarVisible = ref(false)
export const itemDescontarActivo = ref<StockFilaCombinada | null>(null)
export const guardandoDescuentoUnidades = ref(false)
export const formDescontar = reactive({
  cantidad: 1,
  motivo: 'Merma / Rotura',
  otroMotivo: ''
})

export function abrirModalDescontar(fila: StockFilaCombinada) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acción Restringida', 'Solo Supervisores o Propietarios pueden descontar unidades de stock por merma.', 'warning')
    return
  }
  itemDescontarActivo.value = fila
  formDescontar.cantidad = 1
  formDescontar.motivo = 'Merma / Rotura'
  formDescontar.otroMotivo = ''
  modalDescontarVisible.value = true
}

export function cerrarModalDescontar() {
  modalDescontarVisible.value = false
  itemDescontarActivo.value = null
}

export async function ejecutarDescuentoUnidades() {
  if (!itemDescontarActivo.value) return
  const stockDisp = itemDescontarActivo.value.stock
  const cant = Number(formDescontar.cantidad)

  if (!cant || cant <= 0 || !Number.isInteger(cant)) {
    agregarToast('Validación', 'La cantidad a descontar debe ser un número entero positivo mayor a 0.', 'warning')
    return
  }
  if (cant > stockDisp) {
    agregarToast('Validación', `La cantidad a descontar (${cant} u.) supera el stock disponible en este lote (${stockDisp} u.).`, 'warning')
    return
  }

  const motivoFinal = formDescontar.motivo === 'Otro'
    ? (formDescontar.otroMotivo.trim() || 'Ajuste manual de stock')
    : formDescontar.motivo

  guardandoDescuentoUnidades.value = true
  try {
    const res = await inventarioService.descontarUnidades(itemDescontarActivo.value.inventario_id, {
      cantidad: cant,
      motivo: motivoFinal,
      usuarioId: usuarioActivoId.value
    })
    agregarToast(
      'Stock Descontado',
      res.mensaje || `Se descontaron ${cant} unidades del Lote #${itemDescontarActivo.value.lote_id} por "${motivoFinal}".`,
      'success'
    )
    cerrarModalDescontar()
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error al Descontar Unidades', extraerMensajeError(err), 'danger')
  } finally {
    guardandoDescuentoUnidades.value = false
  }
}

// ====================================================================
// 8. TAB 2: SALA DE ESPERA (INVENTARIO PENDIENTES DESDE GET /pendientes)
// ====================================================================

export const pendientesFiltrados = computed(() => {
  return inventarioPendientes.value
    .filter((p) => !(p.marca_baja || p.marcaBaja))
    .filter((p) => {
      if (filterEstadoPendiente.value !== '' && p.estado !== filterEstadoPendiente.value) {
        return false
      }
      if (searchQuery.value.trim() !== '') {
        const q = searchQuery.value.toLowerCase().trim()
        const nombre = (p.nombre_producto || p.nombreProducto || '').toLowerCase()
        const interno = (p.codigo_interno || p.codigoInterno || '').toLowerCase()
        const barras = (p.codigo_barras || p.codigoBarras || '').toLowerCase()
        if (!nombre.includes(q) && !interno.includes(q) && !barras.includes(q)) return false
      }
      return true
    })
})

/**
 * Supervisor aprueba un lote en Sala de Espera consumiendo PUT /pendientes/{id}/aprobar
 */
export async function aprobarIngreso(pendiente: InventarioPendiente) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acceso Denegado', 'El rol Cajero no tiene privilegios para aprobar lotes en Sala de Espera.', 'danger')
    return
  }

  const id = pendiente.inventario_pendiente_id || pendiente.inventarioPendienteId
  if (!id) return

  try {
    const res = await inventarioService.aprobarPendiente(id, null, usuarioActivoId.value)

    // Guardar en el historial de auditoria persistente
    const historial = obtenerHistorialAuditoria()
    const aprobado: InventarioPendiente = {
      ...pendiente,
      estado: 2, // 2: Aprobado
      usuario_revision: usuarioActivoId.value,
      usuarioRevision: usuarioActivoId.value,
      fecha_revision: new Date().toISOString(),
      fechaRevision: new Date().toISOString(),
      observacion_revision: 'Aprobado e ingresado a Stock Activo por Supervisor'
    }
    const idx = historial.findIndex((p) => p.inventario_pendiente_id === id)
    if (idx >= 0) {
      historial[idx] = aprobado
    } else {
      historial.unshift(aprobado)
    }
    guardarHistorialAuditoria(historial)

    // Actualizar estado en pantalla
    const locIdx = inventarioPendientes.value.findIndex((p) => p.inventario_pendiente_id === id)
    if (locIdx >= 0) {
      inventarioPendientes.value[locIdx] = aprobado
    }

    agregarToast(
      'Lote Aprobado con Éxito',
      res.mensaje || `${pendiente.stock_ingresado ?? pendiente.stockIngresado} unidades de "${pendiente.nombre_producto ?? pendiente.nombreProducto}" aprobadas por ${resolverNombreUsuario(rolActivo.value)}.`,
      'success'
    )
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error de Base de Datos', extraerMensajeError(err), 'danger')
  }
}

// Modal de Rechazo
export const modalRechazoVisible = ref(false)
export const pendienteARechazar = ref<InventarioPendiente | null>(null)
export const motivoRechazo = ref('')

export function abrirModalRechazo(pendiente: InventarioPendiente) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acceso Denegado', 'El rol Cajero no puede rechazar lotes en auditoría.', 'danger')
    return
  }
  pendienteARechazar.value = pendiente
  motivoRechazo.value = ''
  modalRechazoVisible.value = true
}

export async function confirmarRechazo() {
  if (!pendienteARechazar.value) return
  if (!motivoRechazo.value.trim()) {
    agregarToast('Dato Requerido', 'Por favor especifique la observación o motivo de rechazo.', 'warning')
    return
  }
  const id = pendienteARechazar.value.inventario_pendiente_id || pendienteARechazar.value.inventarioPendienteId
  if (!id) return

  const motivo = motivoRechazo.value.trim()

  try {
    const res = await inventarioService.rechazarPendiente(id, motivo, usuarioActivoId.value)

    const historial = obtenerHistorialAuditoria()
    const rechazado: InventarioPendiente = {
      ...pendienteARechazar.value,
      estado: 3, // 3: Rechazado
      usuario_revision: usuarioActivoId.value,
      usuarioRevision: usuarioActivoId.value,
      fecha_revision: new Date().toISOString(),
      fechaRevision: new Date().toISOString(),
      observacion_revision: motivo,
      observacionRevision: motivo
    }
    const idx = historial.findIndex((p) => p.inventario_pendiente_id === id)
    if (idx >= 0) {
      historial[idx] = rechazado
    } else {
      historial.unshift(rechazado)
    }
    guardarHistorialAuditoria(historial)

    const locIdx = inventarioPendientes.value.findIndex((p) => p.inventario_pendiente_id === id)
    if (locIdx >= 0) {
      inventarioPendientes.value[locIdx] = rechazado
    }

    agregarToast(
      'Lote Rechazado',
      res.mensaje || `Registro #${id} marcado como Rechazado por ${resolverNombreUsuario(rolActivo.value)}.`,
      'danger'
    )
    modalRechazoVisible.value = false
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error al Rechazar', extraerMensajeError(err), 'danger')
  }
}

// Modal de Observación / Mandar a Corregir
export const modalObservarVisible = ref(false)
export const pendienteAObservar = ref<InventarioPendiente | null>(null)
export const motivoObservacion = ref('')
export const enviandoObservacion = ref(false)

export function abrirModalObservar(pendiente: InventarioPendiente) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acceso Denegado', 'El rol Cajero no puede mandar a corregir registros.', 'danger')
    return
  }
  pendienteAObservar.value = pendiente
  motivoObservacion.value = ''
  modalObservarVisible.value = true
}

export async function confirmarObservacion() {
  if (!pendienteAObservar.value) return
  if (!motivoObservacion.value.trim()) {
    agregarToast('Dato Requerido', 'Por favor especifique la instrucción u observación de corrección para el cajero.', 'warning')
    return
  }
  const id = pendienteAObservar.value.inventario_pendiente_id || pendienteAObservar.value.inventarioPendienteId
  if (!id) return

  enviandoObservacion.value = true
  const textoObservacion = motivoObservacion.value.trim()

  try {
    const res = await inventarioService.observarPendiente(id, textoObservacion, usuarioActivoId.value)

    const historial = obtenerHistorialAuditoria()
    const observado: InventarioPendiente = {
      ...pendienteAObservar.value,
      estado: 4, // 4: Observado / Para Corrección
      usuario_revision: usuarioActivoId.value,
      usuarioRevision: usuarioActivoId.value,
      fecha_revision: new Date().toISOString(),
      fechaRevision: new Date().toISOString(),
      observacion_revision: textoObservacion,
      observacionRevision: textoObservacion
    }
    const idx = historial.findIndex((p) => p.inventario_pendiente_id === id)
    if (idx >= 0) {
      historial[idx] = observado
    } else {
      historial.unshift(observado)
    }
    guardarHistorialAuditoria(historial)

    const locIdx = inventarioPendientes.value.findIndex((p) => p.inventario_pendiente_id === id)
    if (locIdx >= 0) {
      inventarioPendientes.value[locIdx] = observado
    }

    agregarToast(
      'Enviado a Corrección',
      res.mensaje || `Registro #${id} devuelto al cajero con observación para su rectificación.`,
      'warning'
    )
    modalObservarVisible.value = false
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error al Observar', extraerMensajeError(err), 'danger')
  } finally {
    enviandoObservacion.value = false
  }
}

// Modal de Detalles y Trazabilidad (Auditoría Integral)
export const modalDetallesVisible = ref(false)
export const pendienteEnDetalle = ref<InventarioPendiente | null>(null)

export function abrirModalDetalles(item: InventarioPendiente) {
  pendienteEnDetalle.value = item
  modalDetallesVisible.value = true
}

export function abrirEdicionDesdeDetalles() {
  if (!pendienteEnDetalle.value) return
  const item = pendienteEnDetalle.value
  modalDetallesVisible.value = false
  abrirModalEditarPendiente(item)
}

// Modal de Rectificación / Edición de Pendientes
export const modalEditarPendienteVisible = ref(false)
export const pendienteEnEdicion = ref<InventarioPendiente | null>(null)
export const guardandoRectificacion = ref(false)
export const formEditarPendiente = reactive({
  producto_id: null as number | null,
  nombre_producto: '',
  codigo_barras: '',
  codigo_interno: '',
  categoria_id: 1,
  proveedor_id: 1,
  stock_ingresado: 0,
  precio_compra: 0,
  precio_venta: 0,
  precio_lote: 0,
  fecha_vencimiento: '',
  observacion_rectificacion: ''
})

export function onEditarCalculoPrecioLote() {
  const stock = Number(formEditarPendiente.stock_ingresado) || 0
  const costo = Number(formEditarPendiente.precio_compra) || 0
  formEditarPendiente.precio_lote = Number((stock * costo).toFixed(2))
}

export async function abrirModalEditarPendiente(pendiente: InventarioPendiente) {
  if (rolActivo.value === ROLES.CAJERO && pendiente.estado !== ESTADOS_SALA_ESPERA.OBSERVADO) {
    agregarToast('Acceso Restringido', 'Solo Supervisores o Propietarios pueden rectificar registros en Sala de Espera.', 'warning')
    return
  }
  if (catalogoActivo.value.length === 0 || proveedores.value.length === 0) {
    await asegurarDatosActivosModal()
  }
  pendienteEnEdicion.value = pendiente
  const fuente = catalogoActivo.value.length > 0 ? catalogoActivo.value : catalogoBackend.value
  const prodMatch = fuente.find(p => (p.producto_id || p.productoId) === (pendiente.producto_id || pendiente.productoId))
    || fuente.find(p => (p.nombre_producto || p.nombreProducto || '').toLowerCase() === (pendiente.nombre_producto || pendiente.nombreProducto || '').toLowerCase())
  if (prodMatch) {
    productoSeleccionadoEdicionId.value = prodMatch.producto_id || prodMatch.productoId || null
    modoProductoNuevoEdicion.value = false
  } else {
    productoSeleccionadoEdicionId.value = null
    modoProductoNuevoEdicion.value = true
  }
  formEditarPendiente.nombre_producto = pendiente.nombre_producto || pendiente.nombreProducto || ''
  formEditarPendiente.codigo_barras = pendiente.codigo_barras || pendiente.codigoBarras || ''
  formEditarPendiente.codigo_interno = pendiente.codigo_interno || pendiente.codigoInterno || ''
  formEditarPendiente.categoria_id = pendiente.categoria_id || pendiente.categoriaId || 1
  formEditarPendiente.proveedor_id = pendiente.proveedor_id || pendiente.proveedorId || (proveedores.value[0]?.proveedor_id ?? 1)
  formEditarPendiente.stock_ingresado = Number(pendiente.stock_ingresado ?? pendiente.stockIngresado ?? 0)
  formEditarPendiente.precio_compra = Number(pendiente.precio_compra ?? pendiente.precioCompra ?? 0)
  formEditarPendiente.precio_venta = Number(pendiente.precio_venta ?? pendiente.precioVenta ?? 0)
  formEditarPendiente.precio_lote = Number(pendiente.precio_lote ?? pendiente.precioLote ?? 0)
  formEditarPendiente.fecha_vencimiento = pendiente.fecha_vencimiento || pendiente.fechaVencimiento || ''
  formEditarPendiente.observacion_rectificacion = ''
  onEditarCalculoPrecioLote()
  modalEditarPendienteVisible.value = true
}

// 1. Guardar Rectificación (PUT /pendientes/{id}) -> Permanece en Sala de Espera (Flujo 4 -> 1)
export async function guardarRectificacionPendiente() {
  if (!pendienteEnEdicion.value) return
  const id = pendienteEnEdicion.value.inventario_pendiente_id || pendienteEnEdicion.value.inventarioPendienteId
  if (!id) return

  guardandoRectificacion.value = true
  const cambios: RegistroPendienteRequest = {
    sucursalId: pendienteEnEdicion.value.sucursal_id || 1,
    productoId: pendienteEnEdicion.value.producto_id,
    nombreProducto: formEditarPendiente.nombre_producto.trim(),
    codigoBarras: formEditarPendiente.codigo_barras?.trim() || null,
    codigoInterno: formEditarPendiente.codigo_interno?.trim() || pendienteEnEdicion.value.codigo_interno,
    categoriaId: Number(formEditarPendiente.categoria_id || 1),
    proveedorId: Number(formEditarPendiente.proveedor_id || 1),
    stockIngresado: Number(formEditarPendiente.stock_ingresado),
    precioCompra: Number(formEditarPendiente.precio_compra),
    precioVenta: Number(formEditarPendiente.precio_venta),
    precioLote: Number(formEditarPendiente.precio_lote),
    fechaVencimiento: formEditarPendiente.fecha_vencimiento || null,
    usuarioCreacion: pendienteEnEdicion.value.usuario_creacion || usuarioActivoId.value,
    usuarioRevision: undefined
  }

  try {
    await inventarioService.actualizarPendiente(id, cambios)

    // Actualizar historial local y memoria (retorna a estado 1: Pendiente de Revisión)
    const historial = obtenerHistorialAuditoria()
    const actualizado: InventarioPendiente = {
      ...pendienteEnEdicion.value,
      nombre_producto: formEditarPendiente.nombre_producto.trim(),
      nombreProducto: formEditarPendiente.nombre_producto.trim(),
      codigo_barras: formEditarPendiente.codigo_barras?.trim() || null,
      codigoBarras: formEditarPendiente.codigo_barras?.trim() || null,
      categoria_id: Number(formEditarPendiente.categoria_id || 1),
      categoriaId: Number(formEditarPendiente.categoria_id || 1),
      proveedor_id: Number(formEditarPendiente.proveedor_id || 1),
      proveedorId: Number(formEditarPendiente.proveedor_id || 1),
      stock_ingresado: Number(formEditarPendiente.stock_ingresado),
      stockIngresado: Number(formEditarPendiente.stock_ingresado),
      precio_compra: Number(formEditarPendiente.precio_compra),
      precioCompra: Number(formEditarPendiente.precio_compra),
      precio_venta: Number(formEditarPendiente.precio_venta),
      precioVenta: Number(formEditarPendiente.precio_venta),
      precio_lote: Number(formEditarPendiente.precio_lote),
      precioLote: Number(formEditarPendiente.precio_lote),
      fecha_vencimiento: formEditarPendiente.fecha_vencimiento || null,
      fechaVencimiento: formEditarPendiente.fecha_vencimiento || null,
      estado: 1, // Retorna a estado 1 (Pendiente de Revisión)
      fecha_revision: null,
      fechaRevision: null,
      usuario_revision: null,
      usuarioRevision: null,
      observacion_revision: formEditarPendiente.observacion_rectificacion.trim() || (rolActivo.value === ROLES.CAJERO ? 'Subsanado y re-enviado por Cajero para auditoría.' : 'Datos del lote rectificados por Supervisor.')
    }

    const idx = historial.findIndex((p) => p.inventario_pendiente_id === id)
    if (idx >= 0) {
      historial[idx] = actualizado
    } else {
      historial.unshift(actualizado)
    }
    guardarHistorialAuditoria(historial)

    const locIdx = inventarioPendientes.value.findIndex((p) => p.inventario_pendiente_id === id)
    if (locIdx >= 0) {
      inventarioPendientes.value[locIdx] = actualizado
    }

    const mensajeExito = rolActivo.value === ROLES.CAJERO
      ? `Registro #${id} subsanado y re-enviado a Sala de Espera para nueva revisión del Supervisor.`
      : `Registro #${id} rectificado exitosamente por ${resolverNombreUsuario(rolActivo.value)}. Permanece en espera para su aprobación.`

    agregarToast(
      rolActivo.value === ROLES.CAJERO ? 'Corrección Re-enviada' : 'Rectificación Guardada',
      mensajeExito,
      'success'
    )
    modalEditarPendienteVisible.value = false
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error al Rectificar', extraerMensajeError(err), 'danger')
  } finally {
    guardandoRectificacion.value = false
  }
}

// 2. Guardar y Aprobar (PUT /pendientes/{id}/aprobar) -> Asienta en stock activo
export async function guardarYaprobarPendiente() {
  if (!pendienteEnEdicion.value) return
  const id = pendienteEnEdicion.value.inventario_pendiente_id || pendienteEnEdicion.value.inventarioPendienteId
  if (!id) return

  const cambios: Partial<RegistroPendienteRequest> = {
    nombreProducto: formEditarPendiente.nombre_producto.trim(),
    codigoBarras: formEditarPendiente.codigo_barras?.trim() || null,
    codigoInterno: formEditarPendiente.codigo_interno?.trim() || pendienteEnEdicion.value.codigo_interno,
    categoriaId: Number(formEditarPendiente.categoria_id || 1),
    proveedorId: Number(formEditarPendiente.proveedor_id || 1),
    stockIngresado: Number(formEditarPendiente.stock_ingresado),
    precioCompra: Number(formEditarPendiente.precio_compra),
    precioVenta: Number(formEditarPendiente.precio_venta),
    precioLote: Number(formEditarPendiente.precio_lote),
    fechaVencimiento: formEditarPendiente.fecha_vencimiento || null,
    usuarioRevision: usuarioActivoId.value
  }

  try {
    const res = await inventarioService.aprobarPendiente(id, cambios, usuarioActivoId.value)

    const historial = obtenerHistorialAuditoria()
    const aprobado: InventarioPendiente = {
      ...pendienteEnEdicion.value,
      nombre_producto: formEditarPendiente.nombre_producto.trim(),
      nombreProducto: formEditarPendiente.nombre_producto.trim(),
      codigo_barras: formEditarPendiente.codigo_barras?.trim() || null,
      codigoBarras: formEditarPendiente.codigo_barras?.trim() || null,
      categoria_id: Number(formEditarPendiente.categoria_id || 1),
      categoriaId: Number(formEditarPendiente.categoria_id || 1),
      proveedor_id: Number(formEditarPendiente.proveedor_id || 1),
      proveedorId: Number(formEditarPendiente.proveedor_id || 1),
      stock_ingresado: Number(formEditarPendiente.stock_ingresado),
      stockIngresado: Number(formEditarPendiente.stock_ingresado),
      precio_compra: Number(formEditarPendiente.precio_compra),
      precioCompra: Number(formEditarPendiente.precio_compra),
      precio_venta: Number(formEditarPendiente.precio_venta),
      precioVenta: Number(formEditarPendiente.precio_venta),
      precio_lote: Number(formEditarPendiente.precio_lote),
      precioLote: Number(formEditarPendiente.precio_lote),
      fecha_vencimiento: formEditarPendiente.fecha_vencimiento || null,
      fechaVencimiento: formEditarPendiente.fecha_vencimiento || null,
      estado: 2,
      usuario_revision: usuarioActivoId.value,
      usuarioRevision: usuarioActivoId.value,
      fecha_revision: new Date().toISOString(),
      fechaRevision: new Date().toISOString(),
      observacion_revision: formEditarPendiente.observacion_rectificacion.trim() || 'Aprobado con correcciones por Supervisor.'
    }
    const idx = historial.findIndex((p) => p.inventario_pendiente_id === id)
    if (idx >= 0) {
      historial[idx] = aprobado
    } else {
      historial.unshift(aprobado)
    }
    guardarHistorialAuditoria(historial)

    const locIdx = inventarioPendientes.value.findIndex((p) => p.inventario_pendiente_id === id)
    if (locIdx >= 0) {
      inventarioPendientes.value[locIdx] = aprobado
    }

    agregarToast(
      'Lote Aprobado y Actualizado',
      res.mensaje || `Registro #${id} corregido y aprobado exitosamente por ${resolverNombreUsuario(rolActivo.value)}.`,
      'success'
    )
    modalEditarPendienteVisible.value = false
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error de Base de Datos', extraerMensajeError(err), 'danger')
  }
}

// ====================================================================
// 9. TAB 3: CATALOGO MAESTRO (PRODUCTOS DESDE GET /catalogo)
// ====================================================================

export interface ProductoCatalogoVista {
  producto_id: number
  codigo_interno: string
  codigo_barras: string
  nombre_producto: string
  categoria_id: number
  categoria_nombre: string
  precio_compra: number
  precio_venta: number
  stock_total: number
  estado: number
  marca_baja: boolean
}

export const productosCatalogo = computed<ProductoCatalogoVista[]>(() => {
  return catalogoBackend.value.map((p) => {
    const catId = p.categoria_id || p.categoriaId || 1
    return {
      producto_id: p.producto_id || p.productoId || 0,
      codigo_interno: p.codigo_interno || p.codigoInterno || '---',
      codigo_barras: p.codigo_barras || p.codigoBarras || '---',
      nombre_producto: p.nombre_producto || p.nombreProducto || 'Sin nombre',
      categoria_id: catId,
      categoria_nombre: p.categoria_nombre || (p as any).categoriaNombre || CATEGORIAS[catId] || 'General',
      precio_compra: Number(p.precio_compra ?? p.precioCompra ?? 0),
      precio_venta: Number(p.precio_venta ?? p.precioVenta ?? 0),
      stock_total: Number(p.stock_total_acumulado ?? p.stockTotalAcumulado ?? 0),
      estado: p.estado ?? 1,
      marca_baja: Boolean(p.marca_baja ?? p.marcaBaja ?? false)
    }
  }).filter((p) => {
    if (searchQuery.value.trim() !== '') {
      const q = searchQuery.value.toLowerCase().trim()
      const matchNombre = p.nombre_producto.toLowerCase().includes(q)
      const matchInterno = p.codigo_interno.toLowerCase().includes(q)
      const matchBarras = p.codigo_barras.toLowerCase().includes(q)
      if (!matchNombre && !matchInterno && !matchBarras) return false
    }
    if (selectedCategoria.value !== '' && p.categoria_id !== selectedCategoria.value) {
      return false
    }
    if (selectedEstadoProducto.value !== '' && p.estado !== selectedEstadoProducto.value) {
      return false
    }
    return true
  })
})

export function darBajaProductoCatalogo(productoId: number, nombreProducto?: string) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acción Restringida', 'Solo Supervisores o Propietarios pueden dar de baja productos.', 'warning')
    return
  }
  const desc = nombreProducto ? `el producto "${nombreProducto}"` : `el producto #${productoId}`

  modalConfirmacion.titulo = 'Confirmar Baja de Producto'
  modalConfirmacion.subtitulo = 'Inactivación en catálogo maestro (marca_baja = true)'
  modalConfirmacion.mensaje = `¿Está seguro de dar de baja lógica a ${desc}?`
  modalConfirmacion.alerta = 'El producto se marcará como inactivo para nuevos ingresos y compras, pero se mantendrá su historial contable y trazabilidad de lotes.'
  modalConfirmacion.textoBoton = 'Confirmar Baja Lógica'
  modalConfirmacion.tipo = 'danger'
  modalConfirmacion.onConfirmar = async () => {
    try {
      const res = await inventarioService.darBajaProducto(productoId)
      agregarToast('Producto Dado de Baja', res.mensaje || `Producto #${productoId} marcado como baja lógica.`, 'info')
      await recargarTodo()
    } catch (err: any) {
      agregarToast('Error al Dar de Baja', extraerMensajeError(err), 'danger')
      throw err
    }
  }
  modalConfirmacion.visible = true
}

export function reactivarProductoCatalogo(productoId: number, nombreProducto?: string) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acción Restringida', 'Solo Supervisores o Propietarios pueden reactivar productos.', 'warning')
    return
  }
  const desc = nombreProducto ? `el producto "${nombreProducto}"` : `el producto #${productoId}`

  modalConfirmacion.titulo = 'Reactivar Producto del Catálogo'
  modalConfirmacion.subtitulo = 'Restauración en el maestro de productos (marca_baja = false)'
  modalConfirmacion.mensaje = `¿Está seguro de reactivar y restaurar ${desc}?`
  modalConfirmacion.alerta = 'El producto volverá a estar habilitado para compras, selección en sala de espera e inventario comercial.'
  modalConfirmacion.textoBoton = 'Reactivar Producto'
  modalConfirmacion.tipo = 'success'
  modalConfirmacion.onConfirmar = async () => {
    try {
      const res = await inventarioService.reactivarProducto(productoId, usuarioActivoId.value)
      agregarToast('Producto Reactivado', res.mensaje || `Producto #${productoId} reactivado exitosamente.`, 'success')
      await recargarTodo()
    } catch (err: any) {
      agregarToast('Error al Reactivar', extraerMensajeError(err), 'danger')
      throw err
    }
  }
  modalConfirmacion.visible = true
}

export async function cambiarEstadoProducto(productoId: number, nuevoEstado: number) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acción Bloqueada', 'El Cajero no puede cambiar el estado comercial de un producto.', 'warning')
    return
  }
  try {
    const res = await inventarioService.actualizarEstadoProducto(productoId, nuevoEstado)
    const estadoInfo = ESTADOS_PRODUCTO[nuevoEstado]
    const label = estadoInfo ? estadoInfo.label : 'Actualizado'
    agregarToast('Estado Actualizado', res.mensaje || `Estado comercial actualizado a: ${label}.`, 'info')
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error al Cambiar Estado', extraerMensajeError(err), 'danger')
  }
}

// ====================================================================
// 10. MODAL DE RECEPCION DE MERCADERIA (ABM CON API REAL)
// ====================================================================

export const modalRecepcionVisible = ref(false)
export const modalCamaraVisible = ref(false)
export const barcodeInputRef = ref<HTMLInputElement | null>(null)

export const formRecepcion = reactive({
  codigo_barras: '',
  producto_id: null as number | null,
  nombre_producto: '',
  codigo_interno: '',
  categoria_id: 1,
  proveedor_id: null as number | null,
  descripcion_lote: '',
  stock_ingresado: 50,
  precio_lote: 250,
  precio_compra: 5.0, // Costo unitario
  precio_venta: 6.5,
  es_perecedero: true,
  fecha_vencimiento: getDateOffset(45),
  ingresar_directo_aprobado: false
})

export async function asegurarDatosActivosModal() {
  try {
    const promises: Promise<any>[] = []
    if (catalogoActivo.value.length === 0) {
      promises.push(
        inventarioService.listarCatalogo('ACTIVOS').then((res) => {
          catalogoActivo.value = res || []
        }).catch((err) => console.error('Error al precargar catalogo activo para modal:', err))
      )
    }
    if (proveedores.value.length === 0) {
      promises.push(
        proveedorService.listarProveedores('', '', 'ACTIVOS').then((res) => {
          proveedores.value = (res || []).map((p: any) => ({
            proveedor_id: p.proveedorId ?? p.proveedor_id ?? 1,
            nombre_empresa: p.nombreEmpresa ?? p.nombre_empresa ?? '',
            nombre_contacto: p.nombreContacto ?? p.nombre_contacto ?? '',
            numero_contacto: p.numeroContacto ?? p.numero_contacto ?? '',
            anotaciones: p.anotaciones ?? '',
            marca_baja: Boolean(p.marcaBaja ?? p.marca_baja)
          }))
        }).catch((err) => console.error('Error al precargar proveedores para modal:', err))
      )
    }
    if (listaCategorias.value.length === 0) {
      promises.push(
        inventarioService.listarCategorias().then((res) => {
          listaCategorias.value = res || []
          ;(res || []).forEach((c) => {
            const id = c.codigo ?? c.categoria_id ?? c.categoriaId
            const nombre = c.nombreCategoria ?? c.descripcion ?? c.nombre_categoria
            if (id != null && nombre) CATEGORIAS[id] = nombre
          })
        }).catch((err) => console.error('Error al precargar categorias para modal:', err))
      )
    }
    if (promises.length > 0) {
      await Promise.all(promises)
    }
  } catch (err: any) {
    console.error('Error en asegurarDatosActivosModal:', err)
  }
}

export async function abrirModalRecepcion() {
  ultimoCodigoBuscado = ''
  buscandoCodigo = false
  formRecepcion.codigo_barras = ''
  formRecepcion.producto_id = null
  formRecepcion.nombre_producto = ''
  formRecepcion.codigo_interno = ''
  formRecepcion.categoria_id = 1
  formRecepcion.descripcion_lote = ''
  formRecepcion.stock_ingresado = 50
  formRecepcion.precio_lote = 250
  formRecepcion.precio_compra = 5.0
  formRecepcion.precio_venta = 6.5
  formRecepcion.es_perecedero = true
  formRecepcion.fecha_vencimiento = getDateOffset(45)
  formRecepcion.ingresar_directo_aprobado = false

  modoProductoNuevoRecepcion.value = false
  productoSeleccionadoRecepcionId.value = null

  // Asegurar que catálogo activo, proveedores y categorías estén listos
  if (catalogoActivo.value.length === 0 || proveedores.value.length === 0 || listaCategorias.value.length === 0) {
    await asegurarDatosActivosModal()
  }

  // Preseleccionar distribuidor por defecto válido
  const primerProv = proveedores.value.find((p) => !p.marca_baja)
  formRecepcion.proveedor_id = primerProv ? primerProv.proveedor_id : null

  // Preseleccionar primera categoría válida
  if (listaCategorias.value.length > 0 && listaCategorias.value[0]?.codigo) {
    formRecepcion.categoria_id = listaCategorias.value[0].codigo!
  }

  modalRecepcionVisible.value = true

  nextTick(() => {
    barcodeInputRef.value?.focus()
  })
}

export function autogenerarCodigoInterno(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()

  if (limpio.length === 0) return ''
  const prefijo = limpio.slice(0, 3).padEnd(3, 'X')

  const fuente = catalogoActivo.value.length > 0 ? catalogoActivo.value : catalogoBackend.value
  const existentes = [
    ...fuente.map((p) => p.codigo_interno || p.codigoInterno || ''),
    ...lotesStock.value.map((l) => l.codigo_interno || l.codigoInterno || ''),
    ...inventarioPendientes.value.map((p) => p.codigo_interno || p.codigoInterno || '')
  ].filter((c) => c.startsWith(prefijo))

  const maxCorrelativo = existentes.reduce((max, cod) => {
    const numPart = parseInt(cod.slice(3), 10)
    return !isNaN(numPart) && numPart > max ? numPart : max
  }, 0)

  const siguiente = maxCorrelativo + 1
  return `${prefijo}${String(siguiente).padStart(3, '0')}`
}

export async function onNombreProductoInput() {
  if (formRecepcion.producto_id === null) {
    formRecepcion.codigo_interno = autogenerarCodigoInterno(formRecepcion.nombre_producto)
    if (!formRecepcion.descripcion_lote && formRecepcion.nombre_producto.trim()) {
      formRecepcion.descripcion_lote = `Lote ${formRecepcion.nombre_producto.trim()} ${new Date().toLocaleDateString('es-BO', { month: 'short', year: 'numeric' })}`
    }
    const limpio = formRecepcion.nombre_producto.replace(/[^a-zA-Z]/g, '').toUpperCase()
    if (limpio.length >= 3) {
      try {
        const res = await inventarioService.generarCodigoInterno(limpio.slice(0, 3))
        if (res?.codigoInterno && formRecepcion.producto_id === null) {
          formRecepcion.codigo_interno = res.codigoInterno
        }
      } catch (_) {}
    }
  }
}

let ultimoCodigoBuscado = ''
let buscandoCodigo = false

export function onCodigoBarrasInput() {
  if (formRecepcion.codigo_barras.trim() !== ultimoCodigoBuscado) {
    ultimoCodigoBuscado = ''
  }
}

/**
 * Búsqueda con escáner láser / lector de código de barras físico consumiendo
 * GET /productos/buscar?codigo={codigo}
 */
export async function handleBarcodeEnter() {
  const code = (formRecepcion.codigo_barras || '').trim()
  if (!code) {
    ultimoCodigoBuscado = ''
    return
  }

  // Evitar ejecuciones simultáneas o duplicadas sobre el mismo código
  if (buscandoCodigo || code === ultimoCodigoBuscado) {
    return
  }

  buscandoCodigo = true
  ultimoCodigoBuscado = code

  try {
    const encontrado = await inventarioService.buscarProductoPorCodigo(code)
    if (encontrado) {
      formRecepcion.producto_id = encontrado.producto_id || encontrado.productoId || null
      productoSeleccionadoRecepcionId.value = formRecepcion.producto_id
      modoProductoNuevoRecepcion.value = false
      formRecepcion.nombre_producto = encontrado.nombre_producto || encontrado.nombreProducto || ''
      formRecepcion.codigo_interno = encontrado.codigo_interno || encontrado.codigoInterno || ''
      formRecepcion.categoria_id = encontrado.categoria_id || encontrado.categoriaId || 1
      formRecepcion.precio_compra = Number(encontrado.precio_compra ?? encontrado.precioCompra ?? 0)
      formRecepcion.precio_venta = Number(encontrado.precio_venta ?? encontrado.precioVenta ?? 0)
      formRecepcion.descripcion_lote = `Reabastecimiento ${formRecepcion.nombre_producto} Lote-${new Date().toLocaleDateString('es-BO', { month: 'short' })}`
      agregarToast('Producto Encontrado', `Código asociado a "${formRecepcion.nombre_producto}". Datos autocompletados.`, 'info')
    } else {
      formRecepcion.producto_id = null
      productoSeleccionadoRecepcionId.value = null
      modoProductoNuevoRecepcion.value = true
      formRecepcion.codigo_interno = ''
      agregarToast('Código Nuevo', 'El código de barras no existe en el catálogo. Ingrese el nombre para autogenerar su código interno (SKU).', 'info')
    }
  } catch (err: any) {
    agregarToast('Error al Buscar Código', extraerMensajeError(err), 'danger')
  } finally {
    buscandoCodigo = false
  }
}

export function abrirVisorCamara() {
  modalCamaraVisible.value = true
}

export function simularEscaneo(codigo: string) {
  ultimoCodigoBuscado = ''
  formRecepcion.codigo_barras = codigo
  modalCamaraVisible.value = false
  handleBarcodeEnter()
}

export const costoSugeridoMatematico = computed(() => {
  if (formRecepcion.stock_ingresado > 0 && formRecepcion.precio_lote > 0) {
    return +(formRecepcion.precio_lote / formRecepcion.stock_ingresado).toFixed(2)
  }
  return 0
})

export function aplicarCostoSugerido() {
  formRecepcion.precio_compra = costoSugeridoMatematico.value
}

/**
 * Guarda la recepción de mercadería:
 * - Si es Supervisor con ingreso directo: POST /ingreso-directo
 * - En cualquier otro caso: POST /pendientes (Sala de espera)
 */
export async function guardarRecepcion() {
  if (!formRecepcion.nombre_producto.trim()) {
    agregarToast('Campo Requerido', 'Debe ingresar el nombre del producto.', 'warning')
    return
  }
  if (!formRecepcion.codigo_interno.trim()) {
    formRecepcion.codigo_interno = autogenerarCodigoInterno(formRecepcion.nombre_producto)
  }
  if (formRecepcion.stock_ingresado <= 0) {
    agregarToast('Cantidad Inválida', 'La cantidad del lote debe ser mayor a 0.', 'warning')
    return
  }
  if (formRecepcion.precio_compra <= 0 || formRecepcion.precio_venta <= 0) {
    agregarToast('Precios Inválidos', 'Los precios de compra y venta deben ser mayores a 0.', 'warning')
    return
  }

  const esDirecto =
    (rolActivo.value === ROLES.SUPERVISOR || rolActivo.value === ROLES.PROPIETARIO) &&
    formRecepcion.ingresar_directo_aprobado

  try {
    if (esDirecto) {
      const payload: IngresoDirectoRequest = {
        categoriaId: formRecepcion.categoria_id,
        nombreProducto: formRecepcion.nombre_producto,
        codigoInterno: formRecepcion.codigo_interno,
        descripcionLote: formRecepcion.descripcion_lote || `Lote ${formRecepcion.nombre_producto}`,
        stockIngresado: formRecepcion.stock_ingresado,
        precioLote: formRecepcion.precio_lote,
        precioCompra: formRecepcion.precio_compra,
        precioVenta: formRecepcion.precio_venta,
        usuarioCreacion: usuarioActivoId.value,
        productoId: formRecepcion.producto_id,
        codigoBarras: formRecepcion.codigo_barras || null,
        proveedorId: formRecepcion.proveedor_id,
        fechaVencimiento: formRecepcion.es_perecedero ? formRecepcion.fecha_vencimiento : null
      }
      const res = await inventarioService.ingresoDirectoSupervisor(payload)
      agregarToast(
        'Ingreso Directo Aprobado',
        res.mensaje || `${formRecepcion.stock_ingresado} unidades agregadas inmediatamente a Stock Activo.`,
        'success'
      )
    } else {
      const payload: RegistroPendienteRequest = {
        sucursalId: 1,
        productoId: formRecepcion.producto_id,
        nombreProducto: formRecepcion.nombre_producto,
        codigoBarras: formRecepcion.codigo_barras || null,
        codigoInterno: formRecepcion.codigo_interno,
        categoriaId: formRecepcion.categoria_id,
        precioCompra: formRecepcion.precio_compra,
        precioVenta: formRecepcion.precio_venta,
        stockIngresado: formRecepcion.stock_ingresado,
        proveedorId: formRecepcion.proveedor_id,
        descripcionLote: formRecepcion.descripcion_lote || `Lote ${formRecepcion.nombre_producto}`,
        precioLote: formRecepcion.precio_lote,
        fechaVencimiento: formRecepcion.es_perecedero ? formRecepcion.fecha_vencimiento : null,
        usuarioCreacion: usuarioActivoId.value
      }
      const res = await inventarioService.registrarPendiente(payload)
      agregarToast(
        'Enviado a Sala de Espera',
        `Registro #${res.inventario_pendiente_id || res.inventarioPendienteId} enviado a Sala de Espera para validación de auditoría.`,
        'info'
      )
    }

    modalRecepcionVisible.value = false
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error de Base de Datos', extraerMensajeError(err), 'danger')
  }
}

export async function resetFiltros() {
  searchQuery.value = ''
  selectedCategoria.value = ''
  selectedProveedor.value = ''
  selectedEstadoProducto.value = ''
  filterProximosVencer.value = false
  filterEnOferta.value = false
  diasUmbralVencimientoPreset.value = 14
  diasUmbralVencimiento.value = 14
  if (selectedEstadoRegistro.value !== 'ACTIVOS') {
    selectedEstadoRegistro.value = 'ACTIVOS'
    await recargarTodo()
  }
}

// ====================================================================
// GESTIÓN DE MODALES DE CREACIÓN RÁPIDA (CATEGORÍAS Y PROVEEDORES)
// ====================================================================

// 1. Modal Categoría (Tabla conceptos - Grupo 2)
export const modalCategoriaVisible = ref(false)
export const guardandoCategoria = ref(false)
export const nombreNuevaCategoria = ref('')

export function abrirModalCrearCategoria() {
  nombreNuevaCategoria.value = ''
  modalCategoriaVisible.value = true
}

export function cerrarModalCrearCategoria() {
  modalCategoriaVisible.value = false
  nombreNuevaCategoria.value = ''
}

export async function guardarNuevaCategoria() {
  const nombre = nombreNuevaCategoria.value.trim()
  if (!nombre) {
    agregarToast('Validación', 'El nombre de la categoría es obligatorio.', 'warning')
    return
  }
  guardandoCategoria.value = true
  try {
    const listadoActualizado = await inventarioService.crearCategoria(nombre, usuarioActivoId.value)
    listaCategorias.value = listadoActualizado

    // Sincronizar mapa reactivo CATEGORIAS
    listadoActualizado.forEach((c) => {
      const id = c.codigo ?? c.categoriaId ?? c.categoria_id
      const desc = c.nombreCategoria ?? c.descripcion ?? c.nombre_categoria
      if (id != null && desc) {
        CATEGORIAS[id] = desc
      }
    })

    // Dejar la categoría creada seleccionada en el formulario
    const creada = listadoActualizado.find(
      (c) => (c.nombreCategoria || c.descripcion || c.nombre_categoria || '').toLowerCase() === nombre.toLowerCase()
    )
    if (creada && creada.codigo != null) {
      formRecepcion.categoria_id = creada.codigo
      if (modalEditarPendienteVisible.value) {
        formEditarPendiente.categoria_id = creada.codigo
      }
    }

    agregarToast('Categoría Registrada', `La categoría "${nombre}" fue registrada en la tabla conceptos y seleccionada.`, 'success')
    cerrarModalCrearCategoria()
    if (modalGestionCategoriasVisible.value) {
      await recargarGestionCategorias()
    }
  } catch (err: any) {
    agregarToast('Error al crear categoría', extraerMensajeError(err), 'danger')
  } finally {
    guardandoCategoria.value = false
  }
}

// 1.1 Modal Gestión Completa de Categorías (Tabla conceptos - Grupo 2)
export const modalGestionCategoriasVisible = ref(false)
export const cargandoGestionCategorias = ref(false)
export const listaTodasCategorias = ref<CategoriaDTO[]>([])
export const categoriaEnEdicion = ref<{ codigo: number; nombre: string } | null>(null)
export const guardandoEdicionCategoria = ref(false)

export async function abrirModalGestionCategorias() {
  if (!puedeCrearCategoria.value) {
    agregarToast('Acceso Restringido', 'Solo los usuarios con rol Supervisor o Propietario pueden administrar las categorías maestras.', 'warning')
    return
  }
  categoriaEnEdicion.value = null
  modalGestionCategoriasVisible.value = true
  await recargarGestionCategorias()
}

export function cerrarModalGestionCategorias() {
  modalGestionCategoriasVisible.value = false
  categoriaEnEdicion.value = null
}

export async function recargarGestionCategorias() {
  cargandoGestionCategorias.value = true
  try {
    listaTodasCategorias.value = await inventarioService.listarTodasCategorias()
  } catch (err: any) {
    agregarToast('Error al cargar categorías', extraerMensajeError(err), 'danger')
  } finally {
    cargandoGestionCategorias.value = false
  }
}

export function iniciarEdicionCategoria(cat: CategoriaDTO) {
  const cod = cat.codigo ?? cat.categoriaId ?? cat.categoria_id
  const nom = cat.nombreCategoria ?? cat.descripcion ?? cat.nombre_categoria ?? ''
  if (cod != null) {
    categoriaEnEdicion.value = { codigo: cod, nombre: nom }
  }
}

export function cancelarEdicionCategoria() {
  categoriaEnEdicion.value = null
}

export async function recargarCategoriasActivas() {
  try {
    const cats = await inventarioService.listarCategorias()
    listaCategorias.value = cats
    for (const k in CATEGORIAS) {
      delete CATEGORIAS[k]
    }
    cats.forEach((c) => {
      const id = c.codigo ?? c.categoria_id ?? c.categoriaId
      const nombre = c.nombreCategoria ?? c.descripcion ?? c.nombre_categoria
      if (id != null && nombre) {
        CATEGORIAS[id] = nombre
      }
    })
  } catch (e) {
    console.error('Error recargando categorias activas:', e)
  }
}

export async function guardarEdicionCategoria() {
  if (!categoriaEnEdicion.value || !categoriaEnEdicion.value.nombre.trim()) {
    agregarToast('Validación', 'El nombre de la categoría no puede estar vacío.', 'warning')
    return
  }
  guardandoEdicionCategoria.value = true
  try {
    await inventarioService.actualizarCategoria(
      categoriaEnEdicion.value.codigo,
      categoriaEnEdicion.value.nombre.trim()
    )
    agregarToast('Categoría Actualizada', `Categoría #${categoriaEnEdicion.value.codigo} actualizada exitosamente.`, 'success')
    categoriaEnEdicion.value = null
    await Promise.all([recargarGestionCategorias(), recargarCategoriasActivas()])
  } catch (err: any) {
    agregarToast('Error al actualizar categoría', extraerMensajeError(err), 'danger')
  } finally {
    guardandoEdicionCategoria.value = false
  }
}

export async function alternarEstadoCategoria(cat: CategoriaDTO) {
  const cod = cat.codigo ?? cat.categoriaId ?? cat.categoria_id
  const nom = cat.nombreCategoria ?? cat.descripcion ?? cat.nombre_categoria ?? 'Categoría'
  const bajaActual = !!(cat.marcaBaja ?? cat.marca_baja)
  const nuevaBaja = !bajaActual
  const accion = nuevaBaja ? 'dar de baja lógica' : 'reactivar'

  if (!confirm(`¿Está seguro de ${accion} la categoría "${nom}" (#${cod})?`)) {
    return
  }

  try {
    if (cod != null) {
      await inventarioService.cambiarEstadoCategoria(cod, nuevaBaja)
      agregarToast('Estado Actualizado', `Categoría "${nom}" fue ${nuevaBaja ? 'dada de baja lógica' : 'reactivada'}.`, 'info')
      await Promise.all([recargarGestionCategorias(), recargarCategoriasActivas()])
    }
  } catch (err: any) {
    agregarToast('Error al cambiar estado de categoría', extraerMensajeError(err), 'danger')
  }
}

// 2. Modal Proveedor Rápido (Control RBAC: Solo Supervisor y Propietario)
export const modalProveedorRapidoVisible = ref(false)
export const guardandoProveedorRapido = ref(false)
export const formProveedorRapido = reactive({
  nombreEmpresa: '',
  nombreContacto: '',
  numeroContacto: '',
  anotaciones: ''
})

export function abrirModalCrearProveedor() {
  if (!puedeCrearProveedor.value) {
    agregarToast('Acceso Restringido', 'Solo los usuarios con rol Supervisor o Propietario pueden registrar distribuidores.', 'warning')
    return
  }
  formProveedorRapido.nombreEmpresa = ''
  formProveedorRapido.nombreContacto = ''
  formProveedorRapido.numeroContacto = ''
  formProveedorRapido.anotaciones = ''
  modalProveedorRapidoVisible.value = true
}

export function cerrarModalCrearProveedor() {
  modalProveedorRapidoVisible.value = false
}

export async function guardarProveedorRapido() {
  if (!puedeCrearProveedor.value) {
    agregarToast('Acceso Restringido', 'Solo los usuarios con rol Supervisor o Propietario pueden registrar distribuidores.', 'warning')
    return
  }
  if (!formProveedorRapido.nombreEmpresa.trim()) {
    agregarToast('Validación', 'El nombre o razón social de la empresa es obligatorio.', 'warning')
    return
  }
  if (!formProveedorRapido.nombreContacto.trim()) {
    agregarToast('Validación', 'El nombre del contacto logístico es obligatorio.', 'warning')
    return
  }
  if (!formProveedorRapido.numeroContacto.trim()) {
    agregarToast('Validación', 'El número de contacto o teléfono es obligatorio.', 'warning')
    return
  }

  guardandoProveedorRapido.value = true
  try {
    const res = await proveedorService.registrarProveedor({
      nombreEmpresa: formProveedorRapido.nombreEmpresa.trim(),
      nombreContacto: formProveedorRapido.nombreContacto.trim(),
      numeroContacto: formProveedorRapido.numeroContacto.trim(),
      anotaciones: formProveedorRapido.anotaciones.trim() || 'Registrado desde Ingreso de Mercadería',
      usuarioCreacion: usuarioActivoId.value
    })

    const nuevoId = res.proveedorId

    // Actualizar lista completa de proveedores desde GET /api/proveedores
    const listaActualizada = await proveedorService.listarProveedores()
    proveedores.value = listaActualizada.map((p: any) => ({
      proveedor_id: p.proveedorId ?? p.proveedor_id,
      nombre_empresa: p.nombreEmpresa ?? p.nombre_empresa,
      nombre_contacto: p.nombreContacto ?? p.nombre_contacto ?? '',
      numero_contacto: p.numeroContacto ?? p.numero_contacto ?? '',
      anotaciones: p.anotaciones ?? '',
      marca_baja: Boolean(p.marcaBaja ?? p.marca_baja)
    }))

    // Asignar el nuevo proveedor y dejarlo seleccionado sin perder datos del lote
    formRecepcion.proveedor_id = nuevoId
    if (modalEditarPendienteVisible.value) {
      formEditarPendiente.proveedor_id = nuevoId
    }

    agregarToast('Distribuidor Registrado', `El proveedor "${formProveedorRapido.nombreEmpresa}" fue registrado en la base de datos y seleccionado.`, 'success')
    cerrarModalCrearProveedor()
  } catch (err: any) {
    agregarToast('Error al registrar distribuidor', extraerMensajeError(err), 'danger')
  } finally {
    guardandoProveedorRapido.value = false
  }
}

export function redirigirAProveedores() {
  router.push('/inventario/proveedores')
}

// ====================================================================
// 11. CARGA INICIAL Y SINCRONIZACION CENTRALIZADA
// ====================================================================

let recargaEnProgreso = false
export async function recargarTodo() {
  if (recargaEnProgreso) return
  recargaEnProgreso = true
  cargando.value = true
  try {
    const estado = selectedEstadoRegistro.value || 'ACTIVOS'

    const peticionCatalogoFiltro = estado === 'ACTIVOS'
      ? inventarioService.listarCatalogo('ACTIVOS')
      : inventarioService.listarCatalogo(estado)

    const [kpiRes, lotesRes, pendientesRes, catalogoFiltroRes, catalogoActivoRes, provRes, catRes] = await Promise.allSettled([
      inventarioService.obtenerKpis(),
      inventarioService.listarLotes(estado),
      inventarioService.listarPendientes(),
      peticionCatalogoFiltro,
      estado === 'ACTIVOS' ? Promise.resolve(null) : inventarioService.listarCatalogo('ACTIVOS'),
      proveedorService.listarProveedores('', '', 'ACTIVOS'),
      inventarioService.listarCategorias()
    ])

    if (kpiRes.status === 'fulfilled' && kpiRes.value) {
      kpisBackend.value = kpiRes.value
    } else if (kpiRes.status === 'rejected') {
      console.error('Error al obtener KPIs:', kpiRes.reason)
    }

    if (lotesRes.status === 'fulfilled' && lotesRes.value) {
      lotesStock.value = lotesRes.value
    } else if (lotesRes.status === 'rejected') {
      console.error('Error al listar lotes:', lotesRes.reason)
    }

    if (pendientesRes.status === 'fulfilled' && pendientesRes.value) {
      const backendPendientes = pendientesRes.value.map(normalizarPendiente)
      const historial = obtenerHistorialAuditoria()
      const mapa = new Map<number, InventarioPendiente>()

      // 1. Agregar historial previo de auditoria (aprobados y rechazados)
      historial.forEach((item) => {
        mapa.set(item.inventario_pendiente_id, item)
      })

      // 2. Agregar / sobreescribir pendientes activos desde el backend
      backendPendientes.forEach((item) => {
        mapa.set(item.inventario_pendiente_id, item)
      })

      inventarioPendientes.value = Array.from(mapa.values())
    } else if (pendientesRes.status === 'rejected') {
      console.error('Error al listar pendientes:', pendientesRes.reason)
    }

    if (catalogoFiltroRes.status === 'fulfilled' && catalogoFiltroRes.value) {
      catalogoBackend.value = catalogoFiltroRes.value
      if (estado === 'ACTIVOS') {
        catalogoActivo.value = catalogoFiltroRes.value
      }
    } else if (catalogoFiltroRes.status === 'rejected') {
      console.error('Error al listar catálogo filtrado:', catalogoFiltroRes.reason)
    }

    if (catalogoActivoRes.status === 'fulfilled' && catalogoActivoRes.value) {
      catalogoActivo.value = catalogoActivoRes.value
    }

    if (provRes.status === 'fulfilled' && provRes.value) {
      proveedores.value = provRes.value.map((p: any) => ({
        proveedor_id: p.proveedorId ?? p.proveedor_id ?? 1,
        nombre_empresa: p.nombreEmpresa ?? p.nombre_empresa ?? '',
        nombre_contacto: p.nombreContacto ?? p.nombre_contacto ?? '',
        numero_contacto: p.numeroContacto ?? p.numero_contacto ?? '',
        anotaciones: p.anotaciones ?? '',
        marca_baja: Boolean(p.marcaBaja ?? p.marca_baja)
      }))
    } else if (provRes.status === 'rejected') {
      console.error('Error al listar proveedores:', provRes.reason)
    }

    if (catRes.status === 'fulfilled' && catRes.value) {
      listaCategorias.value = catRes.value
      // Limpiar y repoblar el mapa reactivo
      for (const k in CATEGORIAS) {
        delete CATEGORIAS[k]
      }
      catRes.value.forEach((c) => {
        const id = c.codigo ?? c.categoria_id ?? c.categoriaId
        const nombre = c.nombreCategoria ?? c.descripcion ?? c.nombre_categoria
        if (id != null && nombre) {
          CATEGORIAS[id] = nombre
        }
      })
      if (!formRecepcion.categoria_id && catRes.value.length && catRes.value[0]?.codigo) {
        formRecepcion.categoria_id = catRes.value[0].codigo!
      }
    } else if (catRes.status === 'rejected') {
      console.error('Error al listar categorías:', catRes.reason)
    }
  } catch (err: any) {
    agregarToast('Conexión con Backend', extraerMensajeError(err), 'warning')
  } finally {
    cargando.value = false
    recargaEnProgreso = false
  }
}

export async function inicializarInventario() {
  await cargarUsuarios()
  await recargarTodo()
}


// Re-exports para consumo en template
export { getBadgeRol, getBadgeEstadoProducto, getBadgeEstadoPendiente, ROLES_USUARIO, MAPA_ROLES, MAPA_ESTADOS_PRODUCTO, MAPA_ESTADOS_SALA_ESPERA, ESTADOS_SALA_ESPERA }