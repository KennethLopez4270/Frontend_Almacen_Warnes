<script setup lang="ts">
import { ref, computed, reactive, nextTick, onMounted } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  ROLES_USUARIO,
  MAPA_ROLES,
  MAPA_ESTADOS_PRODUCTO,
  MAPA_ESTADOS_SALA_ESPERA,
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
  type ProveedorDTO,
  type CategoriaDTO
} from '@/services/inventarioService'

// ====================================================================
// 1. CONSTANTES Y TABLA PARAMETRICA CONCEPTOS (MAPEO 1:1 BD)
// ====================================================================

// Grupo 1: Roles de Usuario (centralizado desde @/constants/mapeoEstados)
const ROLES = ROLES_USUARIO
type RolUsuario = RolUsuarioId

// Grupo 2: Categorías de Producto
const CATEGORIAS: Record<number, string> = reactive({
  1: 'Alimentos',
  2: 'Bebidas',
  3: 'Juguetes',
  4: 'Limpieza',
  5: 'Abarrotes'
})

// Grupo 3: Estado de Productos en Catálogo (centralizado desde @/constants/mapeoEstados)
const ESTADOS_PRODUCTO = MAPA_ESTADOS_PRODUCTO

// Grupo 7: Estado de Inventario Pendiente / Sala de Espera (centralizado desde @/constants/mapeoEstados)
const ESTADOS_PENDIENTE = MAPA_ESTADOS_SALA_ESPERA

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
  descripcion_lote: string
  descripcionLote?: string
  precio_lote: number
  precioLote?: number
  fecha_vencimiento: string | null
  fechaVencimiento?: string | null
  observacion_revision: string | null
  observacionRevision?: string | null
  fecha_creacion: string
  fechaCreacion?: string
  usuario_creacion: number
  usuarioCreacion?: number
  fecha_revision: string | null
  fechaRevision?: string | null
  usuario_revision: number | null
  usuarioRevision?: number | null
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

function getDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getDiasParaVencer(fechaStr: string | null): number | null {
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

function formatMontoBs(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || isNaN(monto)) return 'Bs 0.00'
  return `Bs ${Number(monto).toFixed(2)}`
}

/**
 * Extrae el mensaje de error exacto retornado por el backend de Spring Boot y PostgreSQL
 * (captura excepciones RAISE EXCEPTION, HTTP 400 Bad Request, HTTP 409 Conflict)
 */
function extraerMensajeError(err: any): string {
  if (err?.userMessage) return err.userMessage
  if (err?.response?.data?.mensaje) return err.response.data.mensaje
  if (err?.response?.data?.message) return err.response.data.message
  if (typeof err?.response?.data === 'string' && err.response.data.trim()) return err.response.data
  return err?.message || 'Error al comunicarse con el servidor de la base de datos'
}

function normalizarPendiente(p: any): InventarioPendiente {
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
    descripcion_lote: p.descripcion_lote || p.descripcionLote || '',
    descripcionLote: p.descripcionLote || p.descripcion_lote || '',
    precio_lote: Number(p.precio_lote ?? p.precioLote ?? 0),
    precioLote: Number(p.precioLote ?? p.precio_lote ?? 0),
    fecha_vencimiento: p.fecha_vencimiento || p.fechaVencimiento || null,
    fechaVencimiento: p.fechaVencimiento || p.fecha_vencimiento || null,
    observacion_revision: p.observacion_revision || p.observacionRevision || null,
    observacionRevision: p.observacionRevision || p.observacion_revision || null,
    fecha_creacion: fCreacion,
    fechaCreacion: fCreacion,
    usuario_creacion: p.usuario_creacion ?? p.usuarioCreacion ?? 1,
    usuarioCreacion: p.usuarioCreacion ?? p.usuario_creacion ?? 1,
    fecha_revision: p.fecha_revision || p.fechaRevision || null,
    fechaRevision: p.fechaRevision || p.fecha_revision || null,
    usuario_revision: p.usuario_revision ?? p.usuarioRevision ?? null,
    usuarioRevision: p.usuarioRevision ?? p.usuario_revision ?? null,
    marca_baja: Boolean(p.marca_baja ?? p.marcaBaja ?? false),
    marcaBaja: Boolean(p.marcaBaja ?? p.marca_baja ?? false),
  }
}

// ====================================================================
// 4. ESTADO REACTIVO ASINCRONO (DATOS REALES DEL BACKEND)
// ====================================================================

const cargando = ref(false)
const kpisBackend = ref<InventarioKpi | null>(null)
const lotesStock = ref<InventarioLote[]>([])
const inventarioPendientes = ref<InventarioPendiente[]>([])
const catalogoBackend = ref<ProductoCatalogo[]>([])
const proveedores = ref<Proveedor[]>([])
const productos = ref<Producto[]>([])

// ====================================================================
// 5. ESTADO GLOBAL DE LA VISTA
// ====================================================================

const rolActivo = ref<RolUsuario>(ROLES.SUPERVISOR) // Permite probar permisos
const activeTab = ref<'stock' | 'espera' | 'catalogo'>('stock')

// Filtros compartidos
const searchQuery = ref('')
const selectedCategoria = ref<number | ''>('')
const selectedProveedor = ref<number | ''>('')
const selectedEstadoProducto = ref<number | ''>('')
const filterProximosVencer = ref(false)
const filterEstadoPendiente = ref<number | ''>('') // '' = Todos los estados (Pendientes, Aprobados y Rechazados)

// Umbral dinámico y configurable para alertas de vencimiento (por defecto 14 días / 2 semanas)
const diasUmbralVencimientoPreset = ref<number | 'custom'>(14)
const diasUmbralVencimiento = ref<number>(14)

function onPresetVencimientoChange() {
  if (diasUmbralVencimientoPreset.value !== 'custom') {
    diasUmbralVencimiento.value = Number(diasUmbralVencimientoPreset.value)
  }
}

// Notificaciones Toast y Alertas
const toasts = ref<ToastNotificacion[]>([])
let toastCounter = 0

function agregarToast(titulo: string, mensaje: string, tipo: 'info' | 'success' | 'warning' | 'danger' = 'info') {
  const id = ++toastCounter
  toasts.value.push({ id, titulo, mensaje, tipo })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4500)
}

function removerToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

// Panel de notificaciones emergente
const showNotificationsDrawer = ref(false)


// ====================================================================
// GESTION DE AUDITORIA Y TRAZABILIDAD (QUIEN APRUEBA Y QUIEN RECHAZA)
// ====================================================================

const STORAGE_KEY_AUDITORIA = 'almacen_warnes_historial_auditoria'

export interface InfoUsuario {
  nombreCompleto: string
  rolNombre: string
  cargo: string
  rolId: number
}

const USUARIOS_SISTEMA: Record<number, InfoUsuario> = {
  1: {
    nombreCompleto: 'Juan Pérez',
    rolNombre: 'Cajero',
    cargo: 'Caja Central - Recepción',
    rolId: 1
  },
  2: {
    nombreCompleto: 'Carlos Mendoza',
    rolNombre: 'Supervisor',
    cargo: 'Supervisor de Turno e Inventarios',
    rolId: 2
  },
  3: {
    nombreCompleto: 'Don Roberto Warnes',
    rolNombre: 'Propietario / Admin',
    cargo: 'Administración General',
    rolId: 3
  }
}

function resolverNombreUsuario(id: number | null | undefined): string {
  if (!id) return 'Carlos Mendoza'
  return USUARIOS_SISTEMA[id]?.nombreCompleto ?? 'Personal Autorizado'
}

function resolverInfoUsuario(id: number | null | undefined): InfoUsuario {
  if (id && USUARIOS_SISTEMA[id]) {
    return USUARIOS_SISTEMA[id]
  }
  return {
    nombreCompleto: id ? `Personal #${id}` : 'Carlos Mendoza',
    rolNombre: 'Supervisor',
    cargo: 'Turno Activo',
    rolId: 2
  }
}

function formatearFechaCorta(fechaStr: string | null | undefined): string {
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

function formatearFechaHora(fechaStr: string | null | undefined): string {
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

function obtenerHistorialAuditoria(): InventarioPendiente[] {
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

function guardarHistorialAuditoria(lista: InventarioPendiente[]) {
  try {
    localStorage.setItem(STORAGE_KEY_AUDITORIA, JSON.stringify(lista))
  } catch (_) {}
}

const conteoEspera = computed(() => {
  const items = inventarioPendientes.value.filter((p) => !(p.marca_baja || p.marcaBaja))
  return {
    todos: items.length,
    pendientes: items.filter((p) => p.estado === 1).length,
    aprobados: items.filter((p) => p.estado === 2).length,
    rechazados: items.filter((p) => p.estado === 3).length
  }
})

// ====================================================================
// 6. METRICAS SUPERIORES (KPIs DESDE GET /kpis)
// ====================================================================

const totalProductosCatalogo = computed(() => {
  if (kpisBackend.value) {
    return Number(kpisBackend.value.total_productos_catalogo ?? kpisBackend.value.totalProductosCatalogo ?? 0)
  }
  return catalogoBackend.value.length
})

const totalStockActivo = computed(() => {
  if (kpisBackend.value) {
    return Number(kpisBackend.value.unidades_stock_activo ?? kpisBackend.value.unidadesStockActivo ?? 0)
  }
  return lotesStock.value.reduce((acc, curr) => acc + (curr.stock || 0), 0)
})

const totalEnSalaEspera = computed(() => {
  if (kpisBackend.value) {
    return Number(kpisBackend.value.lotes_sala_espera ?? kpisBackend.value.lotesSalaEspera ?? 0)
  }
  return inventarioPendientes.value.filter((p) => !(p.marca_baja || p.marcaBaja) && p.estado === 1).length
})

const totalAlertasVencimiento = computed(() => {
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

const filasStock = computed<StockFilaCombinada[]>(() => {
  return lotesStock.value
    .map((item) => {
      const fechaVenc = item.fecha_vencimiento || item.fechaVencimiento || null
      const diasVenc = item.dias_para_vencer ?? item.diasParaVencer ?? getDiasParaVencer(fechaVenc)
      const producto = catalogoBackend.value.find((p) => (p.producto_id || p.productoId) === (item.producto_id || item.productoId))
      const categoriaId = producto?.categoria_id || producto?.categoriaId || 1

      return {
        inventario_id: item.inventario_id || item.inventarioId || 0,
        sucursal_id: 1,
        stock: item.stock ?? 0,
        en_descuento: Boolean(item.en_descuento ?? item.enDescuento),
        precio_descuento: item.precio_descuento ?? item.precioDescuento ?? null,
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
      // Filtro próximos a vencer / en oferta
      if (filterProximosVencer.value) {
        const porVencer = fila.dias_vencimiento !== null && fila.dias_vencimiento <= diasUmbralVencimiento.value
        const enOferta = fila.en_descuento
        if (!porVencer && !enOferta) return false
      }
      return true
    })
})

async function darBajaItemInventario(inventarioId: number) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acción Restringida', 'Solo Supervisores o Propietarios pueden dar de baja ítems de inventario.', 'warning')
    return
  }
  try {
    const res = await inventarioService.darBajaLote(inventarioId)
    agregarToast('Baja Lógica Realizada', res.mensaje || `Ítem de inventario #${inventarioId} marcado como baja.`, 'info')
    await recargarTodo()
  } catch (err: any) {
    agregarToast('Error al Dar de Baja', extraerMensajeError(err), 'danger')
  }
}

// Modal de Descuento / Oferta por Caducidad
const modalDescuentoVisible = ref(false)
const itemDescuentoActivo = ref<StockFilaCombinada | null>(null)
const formDescuento = reactive({
  activar: false,
  precio_descuento: 0
})

function abrirModalDescuento(fila: StockFilaCombinada) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Permiso Denegado', 'Solo el Supervisor o Propietario pueden fijar precios de oferta.', 'warning')
    return
  }
  itemDescuentoActivo.value = fila
  formDescuento.activar = fila.en_descuento
  formDescuento.precio_descuento = fila.precio_descuento ?? Math.max(1, +(fila.precio_venta_producto * 0.75).toFixed(2))
  modalDescuentoVisible.value = true
}

async function guardarDescuento() {
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
// 8. TAB 2: SALA DE ESPERA (INVENTARIO PENDIENTES DESDE GET /pendientes)
// ====================================================================

const pendientesFiltrados = computed(() => {
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
async function aprobarIngreso(pendiente: InventarioPendiente) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acceso Denegado', 'El rol Cajero no tiene privilegios para aprobar lotes en Sala de Espera.', 'danger')
    return
  }

  const id = pendiente.inventario_pendiente_id || pendiente.inventarioPendienteId
  if (!id) return

  try {
    const res = await inventarioService.aprobarPendiente(id, null, rolActivo.value)

    // Guardar en el historial de auditoria persistente
    const historial = obtenerHistorialAuditoria()
    const aprobado: InventarioPendiente = {
      ...pendiente,
      estado: 2, // 2: Aprobado
      usuario_revision: rolActivo.value,
      usuarioRevision: rolActivo.value,
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
const modalRechazoVisible = ref(false)
const pendienteARechazar = ref<InventarioPendiente | null>(null)
const motivoRechazo = ref('')

function abrirModalRechazo(pendiente: InventarioPendiente) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acceso Denegado', 'El rol Cajero no puede rechazar lotes en auditoría.', 'danger')
    return
  }
  pendienteARechazar.value = pendiente
  motivoRechazo.value = ''
  modalRechazoVisible.value = true
}

async function confirmarRechazo() {
  if (!pendienteARechazar.value) return
  if (!motivoRechazo.value.trim()) {
    agregarToast('Dato Requerido', 'Por favor especifique la observación o motivo de rechazo.', 'warning')
    return
  }
  const id = pendienteARechazar.value.inventario_pendiente_id || pendienteARechazar.value.inventarioPendienteId
  if (!id) return

  const motivo = motivoRechazo.value.trim()

  try {
    const res = await inventarioService.rechazarPendiente(id, motivo, rolActivo.value)

    const historial = obtenerHistorialAuditoria()
    const rechazado: InventarioPendiente = {
      ...pendienteARechazar.value,
      estado: 3, // 3: Rechazado
      usuario_revision: rolActivo.value,
      usuarioRevision: rolActivo.value,
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

// Modal de Detalles y Trazabilidad (Auditoría Integral)
const modalDetallesVisible = ref(false)
const pendienteEnDetalle = ref<InventarioPendiente | null>(null)

function abrirModalDetalles(item: InventarioPendiente) {
  pendienteEnDetalle.value = item
  modalDetallesVisible.value = true
}

function abrirEdicionDesdeDetalles() {
  if (!pendienteEnDetalle.value) return
  const item = pendienteEnDetalle.value
  modalDetallesVisible.value = false
  abrirModalEditarPendiente(item)
}

// Modal de Rectificación / Edición de Pendientes
const modalEditarPendienteVisible = ref(false)
const pendienteEnEdicion = ref<InventarioPendiente | null>(null)
const guardandoRectificacion = ref(false)
const formEditarPendiente = reactive({
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

function onEditarCalculoPrecioLote() {
  const stock = Number(formEditarPendiente.stock_ingresado) || 0
  const costo = Number(formEditarPendiente.precio_compra) || 0
  formEditarPendiente.precio_lote = Number((stock * costo).toFixed(2))
}

function abrirModalEditarPendiente(pendiente: InventarioPendiente) {
  if (rolActivo.value === ROLES.CAJERO) {
    agregarToast('Acceso Restringido', 'Solo Supervisores o Propietarios pueden rectificar registros en Sala de Espera.', 'warning')
    return
  }
  pendienteEnEdicion.value = pendiente
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

// 1. Guardar Rectificación (PUT /pendientes/{id}) -> Permanece en Sala de Espera
async function guardarRectificacionPendiente() {
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
    usuarioCreacion: pendienteEnEdicion.value.usuario_creacion || 1,
    usuarioRevision: undefined
  }

  try {
    await inventarioService.actualizarPendiente(id, cambios)

    // Actualizar historial local y memoria
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
      estado: 1, // Permanece en espera
      fecha_revision: new Date().toISOString(),
      fechaRevision: new Date().toISOString(),
      usuario_revision: rolActivo.value,
      usuarioRevision: rolActivo.value,
      observacion_revision: formEditarPendiente.observacion_rectificacion.trim() || 'Datos del lote rectificados por Supervisor.'
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

    agregarToast(
      'Rectificación Guardada',
      `Registro #${id} rectificado exitosamente por ${resolverNombreUsuario(rolActivo.value)}. Permanece en espera para su aprobación.`,
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
async function guardarYaprobarPendiente() {
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
    usuarioRevision: rolActivo.value
  }

  try {
    const res = await inventarioService.aprobarPendiente(id, cambios, rolActivo.value)

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
      usuario_revision: rolActivo.value,
      usuarioRevision: rolActivo.value,
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
}

const productosCatalogo = computed<ProductoCatalogoVista[]>(() => {
  return catalogoBackend.value.map((p) => {
    const catId = p.categoria_id || p.categoriaId || 1
    return {
      producto_id: p.producto_id || p.productoId || 0,
      codigo_interno: p.codigo_interno || p.codigoInterno || '---',
      codigo_barras: p.codigo_barras || p.codigoBarras || '---',
      nombre_producto: p.nombre_producto || p.nombreProducto || 'Sin nombre',
      categoria_id: catId,
      categoria_nombre: CATEGORIAS[catId] ?? 'General',
      precio_compra: Number(p.precio_compra ?? p.precioCompra ?? 0),
      precio_venta: Number(p.precio_venta ?? p.precioVenta ?? 0),
      stock_total: Number(p.stock_total_acumulado ?? p.stockTotalAcumulado ?? 0),
      estado: p.estado ?? 1
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

async function cambiarEstadoProducto(productoId: number, nuevoEstado: number) {
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

const modalRecepcionVisible = ref(false)
const modalCamaraVisible = ref(false)
const barcodeInputRef = ref<HTMLInputElement | null>(null)

const formRecepcion = reactive({
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

async function abrirModalRecepcion() {
  formRecepcion.codigo_barras = ''
  formRecepcion.producto_id = null
  formRecepcion.nombre_producto = ''
  formRecepcion.codigo_interno = ''
  formRecepcion.categoria_id = 1
  formRecepcion.proveedor_id = proveedores.value.length ? (proveedores.value[0]?.proveedor_id ?? 1) : 1
  formRecepcion.descripcion_lote = ''
  formRecepcion.stock_ingresado = 50
  formRecepcion.precio_lote = 250
  formRecepcion.precio_compra = 5.0
  formRecepcion.precio_venta = 6.5
  formRecepcion.es_perecedero = true
  formRecepcion.fecha_vencimiento = getDateOffset(45)
  formRecepcion.ingresar_directo_aprobado = false

  modalRecepcionVisible.value = true

  nextTick(() => {
    barcodeInputRef.value?.focus()
  })

  // Obtener código sugerido del backend si está vacío
  try {
    const codRes = await inventarioService.generarCodigoInterno('PRO')
    if (codRes?.codigoInterno && !formRecepcion.codigo_interno) {
      formRecepcion.codigo_interno = codRes.codigoInterno
    }
  } catch (_) {}
}

function autogenerarCodigoInterno(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()

  if (limpio.length === 0) return ''
  const prefijo = limpio.slice(0, 3).padEnd(3, 'X')

  const existentes = [
    ...catalogoBackend.value.map((p) => p.codigo_interno || p.codigoInterno || ''),
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

async function onNombreProductoInput() {
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

/**
 * Búsqueda con escáner láser / lector de código de barras físico consumiendo
 * GET /productos/buscar?codigo={codigo}
 */
async function handleBarcodeEnter() {
  const code = formRecepcion.codigo_barras.trim()
  if (!code) return

  try {
    const encontrado = await inventarioService.buscarProductoPorCodigo(code)
    if (encontrado) {
      formRecepcion.producto_id = encontrado.producto_id || encontrado.productoId || null
      formRecepcion.nombre_producto = encontrado.nombre_producto || encontrado.nombreProducto || ''
      formRecepcion.codigo_interno = encontrado.codigo_interno || encontrado.codigoInterno || ''
      formRecepcion.categoria_id = encontrado.categoria_id || encontrado.categoriaId || 1
      formRecepcion.precio_compra = Number(encontrado.precio_compra ?? encontrado.precioCompra ?? 0)
      formRecepcion.precio_venta = Number(encontrado.precio_venta ?? encontrado.precioVenta ?? 0)
      formRecepcion.descripcion_lote = `Reabastecimiento ${formRecepcion.nombre_producto} Lote-${new Date().toLocaleDateString('es-BO', { month: 'short' })}`
      agregarToast('Producto Encontrado', `Código asociado a "${formRecepcion.nombre_producto}". Datos autocompletados.`, 'info')
    } else {
      formRecepcion.producto_id = null
      agregarToast('Código Nuevo', 'El código de barras no existe en el catálogo. Complete los datos para registrarlo.', 'info')
    }
  } catch (err: any) {
    agregarToast('Error al Buscar Código', extraerMensajeError(err), 'danger')
  }
}

function abrirVisorCamara() {
  modalCamaraVisible.value = true
}

function simularEscaneo(codigo: string) {
  formRecepcion.codigo_barras = codigo
  modalCamaraVisible.value = false
  handleBarcodeEnter()
}

const costoSugeridoMatematico = computed(() => {
  if (formRecepcion.stock_ingresado > 0 && formRecepcion.precio_lote > 0) {
    return +(formRecepcion.precio_lote / formRecepcion.stock_ingresado).toFixed(2)
  }
  return 0
})

function aplicarCostoSugerido() {
  formRecepcion.precio_compra = costoSugeridoMatematico.value
}

/**
 * Guarda la recepción de mercadería:
 * - Si es Supervisor con ingreso directo: POST /ingreso-directo
 * - En cualquier otro caso: POST /pendientes (Sala de espera)
 */
async function guardarRecepcion() {
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
        usuarioCreacion: rolActivo.value,
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
        usuarioCreacion: rolActivo.value
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

function resetFiltros() {
  searchQuery.value = ''
  selectedCategoria.value = ''
  selectedProveedor.value = ''
  selectedEstadoProducto.value = ''
  filterProximosVencer.value = false
  diasUmbralVencimientoPreset.value = 14
  diasUmbralVencimiento.value = 14
}

// ====================================================================
// 11. CARGA INICIAL Y SINCRONIZACION CENTRALIZADA
// ====================================================================

async function recargarTodo() {
  cargando.value = true
  try {
    const [kpiRes, lotesRes, pendientesRes, catalogoRes, provRes, catRes] = await Promise.allSettled([
      inventarioService.obtenerKpis(),
      inventarioService.listarLotes(),
      inventarioService.listarPendientes(),
      inventarioService.listarCatalogo(),
      inventarioService.listarProveedores(),
      inventarioService.listarCategorias()
    ])

    if (kpiRes.status === 'fulfilled') {
      kpisBackend.value = kpiRes.value
    }
    if (lotesRes.status === 'fulfilled') {
      lotesStock.value = lotesRes.value
    }
    if (pendientesRes.status === 'fulfilled') {
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
    }
    if (catalogoRes.status === 'fulfilled') {
      catalogoBackend.value = catalogoRes.value
    }
    if (provRes.status === 'fulfilled' && provRes.value?.length) {
      proveedores.value = provRes.value.map((p) => ({
        proveedor_id: p.proveedor_id || p.proveedorId || 1,
        nombre_empresa: p.nombre_empresa || p.nombreEmpresa || '',
        nombre_contacto: p.nombre_contacto || p.nombreContacto || '',
        numero_contacto: p.numero_contacto || p.numeroContacto || '',
        anotaciones: p.anotaciones || '',
        marca_baja: Boolean(p.marca_baja || p.marcaBaja)
      }))
    }
    if (catRes.status === 'fulfilled' && catRes.value?.length) {
      catRes.value.forEach((c) => {
        const id = c.categoria_id || c.categoriaId
        const nombre = c.nombre_categoria || c.nombreCategoria
        if (id && nombre) {
          CATEGORIAS[id] = nombre
        }
      })
    }
  } catch (err: any) {
    agregarToast('Conexión con Backend', extraerMensajeError(err), 'warning')
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  recargarTodo()
})
</script>


<template>
  <div class="inv-wrapper">
    <!-- BARRA SUPERIOR: CONTROL Y SIMULADOR DE SESION -->
    <header class="inv-topbar">
      <div class="inv-topbar-left">
        <div class="inv-page-title-box">
          <div class="inv-page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h1 class="inv-page-title">Gestión de Inventario y Recepción por Lotes</h1>
            <p class="inv-page-subtitle">Control de stock real, trazabilidad de vencimientos y auditoría en Sala de Espera</p>
          </div>
        </div>
      </div>

      <div class="inv-topbar-right">
        <!-- SIMULADOR DE ROL DISCRETO -->
        <div class="inv-role-selector-card">
          <span class="inv-role-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Rol Simulado:
          </span>
          <select v-model="rolActivo" class="inv-role-select">
            <option :value="ROLES.CAJERO">1: Cajero (Registro & Espera)</option>
            <option :value="ROLES.SUPERVISOR">2: Supervisor (Auditor Total)</option>
            <option :value="ROLES.PROPIETARIO">3: Propietario (Acceso Completo)</option>
          </select>
          <span
            class="inv-role-pill-badge"
            :style="{
              backgroundColor: getBadgeRol(rolActivo).bg,
              color: getBadgeRol(rolActivo).text,
              borderColor: getBadgeRol(rolActivo).border
            }"
          >
            {{ getBadgeRol(rolActivo).label }}
          </span>
        </div>

        <!-- CAMPANA DE NOTIFICACIONES INTERNAS -->
        <button
          type="button"
          class="inv-btn-icon-topbar"
          :class="{ 'has-unread': totalEnSalaEspera > 0 || totalAlertasVencimiento > 0 }"
          @click="showNotificationsDrawer = !showNotificationsDrawer"
          title="Notificaciones internas y alertas"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span v-if="totalEnSalaEspera + totalAlertasVencimiento > 0" class="inv-badge-counter">
            {{ totalEnSalaEspera + totalAlertasVencimiento }}
          </span>
        </button>

        <!-- BOTON PRIMARIO: REGISTRAR INGRESO -->
        <button type="button" class="inv-btn-primary" @click="abrirModalRecepcion">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Registrar Ingreso de Mercadería</span>
        </button>
      </div>
    </header>

    <!-- DRAWER FLOTANTE DE NOTIFICACIONES -->
    <div v-if="showNotificationsDrawer" class="inv-notif-dropdown">
      <div class="inv-notif-header">
        <span class="inv-notif-title">Alertas y Notificaciones Internas</span>
        <button type="button" class="inv-btn-close-sm" @click="showNotificationsDrawer = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="inv-notif-body">
        <div v-if="totalEnSalaEspera > 0" class="inv-notif-item alert-espera" @click="activeTab = 'espera'; showNotificationsDrawer = false">
          <div class="inv-notif-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="inv-notif-item-text">
            <strong>{{ totalEnSalaEspera }} lotes pendientes en Sala de Espera</strong>
            <p>Requieren validación o aprobación del Supervisor/Propietario.</p>
          </div>
        </div>

        <div v-if="totalAlertasVencimiento > 0" class="inv-notif-item alert-vencimiento" @click="activeTab = 'stock'; filterProximosVencer = true; showNotificationsDrawer = false">
          <div class="inv-notif-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div class="inv-notif-item-text">
            <strong>{{ totalAlertasVencimiento }} lotes próximos a vencer (≤ {{ diasUmbralVencimiento }} días)</strong>
            <p>Considere activar precios de oferta para acelerar su salida.</p>
          </div>
        </div>

        <div v-if="totalEnSalaEspera === 0 && totalAlertasVencimiento === 0" class="inv-notif-empty">
          <p>No hay alertas críticas en este momento. Todos los lotes están regulares.</p>
        </div>
      </div>
    </div>

    <!-- TARJETAS SUPERIORES DE METRICAS (KPIS) -->
    <section class="inv-kpi-grid">
      <div class="inv-kpi-card">
        <div class="inv-kpi-info">
          <span class="inv-kpi-label">Productos en Catálogo</span>
          <span class="inv-kpi-value font-mono">{{ totalProductosCatalogo }}</span>
          <span class="inv-kpi-sub">Definiciones maestras activas</span>
        </div>
        <div class="inv-kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>
      </div>

      <div class="inv-kpi-card">
        <div class="inv-kpi-info">
          <span class="inv-kpi-label">Unidades en Stock Activo</span>
          <span class="inv-kpi-value font-mono">{{ totalStockActivo }}</span>
          <span class="inv-kpi-sub">Excluye lotes en espera o rechazados</span>
        </div>
        <div class="inv-kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
      </div>

      <div class="inv-kpi-card" :class="{ 'inv-kpi-highlight-amber': totalEnSalaEspera > 0 }">
        <div class="inv-kpi-info">
          <span class="inv-kpi-label">En Sala de Espera</span>
          <span class="inv-kpi-value font-mono">{{ totalEnSalaEspera }}</span>
          <span class="inv-kpi-sub">Cola de auditoría (Pendiente = 1)</span>
        </div>
        <div class="inv-kpi-icon-box amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      <div class="inv-kpi-card" :class="{ 'inv-kpi-highlight-rose': totalAlertasVencimiento > 0 }">
        <div class="inv-kpi-info">
          <span class="inv-kpi-label">Alertas de Vencimiento (≤ {{ diasUmbralVencimiento }} días)</span>
          <span class="inv-kpi-value font-mono">{{ totalAlertasVencimiento }}</span>
          <span class="inv-kpi-sub">Umbral configurable (default 14 días)</span>
        </div>
        <div class="inv-kpi-icon-box rose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      </div>
    </section>

    <!-- NAVEGACION POR PESTAÑAS (3 TABS OPERATIVOS) -->
    <nav class="inv-tabs-bar">
      <button
        type="button"
        class="inv-tab-btn"
        :class="{ active: activeTab === 'stock' }"
        @click="activeTab = 'stock'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span>Stock por Lotes (Inventario)</span>
        <span class="inv-tab-counter font-mono">{{ filasStock.length }}</span>
      </button>

      <button
        type="button"
        class="inv-tab-btn"
        :class="{ active: activeTab === 'espera' }"
        @click="activeTab = 'espera'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Sala de Espera (Auditoría)</span>
        <span v-if="totalEnSalaEspera > 0" class="inv-tab-counter-alert font-mono">{{ totalEnSalaEspera }}</span>
        <span v-else class="inv-tab-counter font-mono">0</span>
      </button>

      <button
        type="button"
        class="inv-tab-btn"
        :class="{ active: activeTab === 'catalogo' }"
        @click="activeTab = 'catalogo'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>Catálogo Maestro (Productos)</span>
        <span class="inv-tab-counter font-mono">{{ productosCatalogo.length }}</span>
      </button>
    </nav>

    <!-- BARRA DE FILTROS Y BUSQUEDA GENERAL -->
    <div class="inv-filter-panel">
      <div class="inv-search-input-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm search-icon">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por Nombre, Código Interno o Código de Barras (soporta pistola lectora)..."
          class="inv-search-input"
        />
        <button v-if="searchQuery" type="button" class="inv-search-clear" @click="searchQuery = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="inv-filter-controls">
        <!-- Filtro Categoria -->
        <select v-model="selectedCategoria" class="inv-filter-select">
          <option value="">Todas las Categorías</option>
          <option v-for="(nombre, id) in CATEGORIAS" :key="id" :value="Number(id)">
            {{ nombre }}
          </option>
        </select>

        <!-- Filtro Proveedor (solo en stock) -->
        <select v-if="activeTab === 'stock'" v-model="selectedProveedor" class="inv-filter-select">
          <option value="">Todos los Proveedores</option>
          <option v-for="prov in proveedores" :key="prov.proveedor_id" :value="prov.proveedor_id">
            {{ prov.nombre_empresa }}
          </option>
        </select>

        <!-- Filtro Estado Producto (en stock o catálogo) -->
        <select v-if="activeTab !== 'espera'" v-model="selectedEstadoProducto" class="inv-filter-select">
          <option value="">Todos los Estados</option>
          <option :value="1">Activo</option>
          <option :value="2">Descontinuado</option>
          <option :value="3">Suspendido</option>
        </select>

        <!-- Filtro Estado Pendiente (Pills de Auditoría) -->
        <div v-if="activeTab === 'espera'" class="inv-filter-status-pills">
          <button
            type="button"
            class="inv-status-pill"
            :class="{ active: filterEstadoPendiente === '' }"
            @click="filterEstadoPendiente = ''"
          >
            Todos ({{ conteoEspera.todos }})
          </button>
          <button
            type="button"
            class="inv-status-pill pill-amber"
            :class="{ active: filterEstadoPendiente === 1 }"
            @click="filterEstadoPendiente = 1"
          >
            Pendientes ({{ conteoEspera.pendientes }})
          </button>
          <button
            type="button"
            class="inv-status-pill pill-green"
            :class="{ active: filterEstadoPendiente === 2 }"
            @click="filterEstadoPendiente = 2"
          >
            Aprobados ({{ conteoEspera.aprobados }})
          </button>
          <button
            type="button"
            class="inv-status-pill pill-rose"
            :class="{ active: filterEstadoPendiente === 3 }"
            @click="filterEstadoPendiente = 3"
          >
            Rechazados ({{ conteoEspera.rechazados }})
          </button>
        </div>

        <!-- Selector Configurable de Umbral de Vencimiento -->
        <div v-if="activeTab === 'stock'" class="inv-filter-venc-group">
          <label class="inv-filter-venc-label" title="Definir ventana de días para considerar un lote próximo a vencer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Alerta Vence en:</span>
          </label>
          <select
            v-model="diasUmbralVencimientoPreset"
            class="inv-filter-select font-mono"
            @change="onPresetVencimientoChange"
          >
            <option :value="7">≤ 7 días (1 semana)</option>
            <option :value="14">≤ 14 días (2 semanas - Default)</option>
            <option :value="30">≤ 30 días (1 mes)</option>
            <option :value="60">≤ 60 días (2 meses)</option>
            <option :value="90">≤ 90 días (3 meses)</option>
            <option value="custom">Personalizado...</option>
          </select>

          <!-- Input numérico si se elige Personalizado -->
          <div v-if="diasUmbralVencimientoPreset === 'custom'" class="inv-custom-days-wrapper">
            <input
              v-model.number="diasUmbralVencimiento"
              type="number"
              min="1"
              max="730"
              class="inv-input-custom-days font-mono"
              placeholder="Días"
            />
            <span class="inv-days-suffix">días</span>
          </div>
        </div>

        <!-- Toggle Rápido Próximos a Vencer (Tab Stock) -->
        <button
          v-if="activeTab === 'stock'"
          type="button"
          class="inv-filter-toggle-btn"
          :class="{ active: filterProximosVencer }"
          @click="filterProximosVencer = !filterProximosVencer"
          :title="`Filtrar lotes con caducidad menor o igual a ${diasUmbralVencimiento} días`"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span>Solo Próximos a Vencer (≤ {{ diasUmbralVencimiento }} días) / En Oferta</span>
        </button>

        <!-- Boton Reset Filtros -->
        <button
          v-if="searchQuery || selectedCategoria !== '' || selectedProveedor !== '' || selectedEstadoProducto !== '' || filterProximosVencer"
          type="button"
          class="inv-btn-reset-filters"
          @click="resetFiltros"
        >
          Limpiar Filtros
        </button>
      </div>
    </div>

    <!-- CONTENEDOR PRINCIPAL DE CONTENIDO SEGUN TAB -->

    <!-- ============================================================= -->
    <!-- TAB 1: STOCK POR LOTES (INVENTARIO) -->
    <!-- ============================================================= -->
    <main v-if="activeTab === 'stock'" class="inv-tab-content">
      <div class="inv-table-card">
        <div class="inv-table-responsive">
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width: 140px">Cód. Interno / Barras</th>
                <th>Producto y Categoría</th>
                <th>Detalle Lote / Proveedor</th>
                <th style="width: 170px">Vencimiento (≤ {{ diasUmbralVencimiento }} d)</th>
                <th class="text-right" style="width: 130px">Costo Unit. / Total</th>
                <th class="text-right" style="width: 150px">Precio Venta / Oferta</th>
                <th class="text-center" style="width: 110px">Stock Disp.</th>
                <th class="text-center" style="width: 110px">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filasStock.length === 0">
                <td colspan="8" class="inv-table-empty">
                  No se encontraron registros de inventario con los filtros aplicados.
                </td>
              </tr>
              <tr v-for="fila in filasStock" :key="fila.inventario_id" :class="{ 'row-warning-venc': fila.dias_vencimiento !== null && fila.dias_vencimiento <= diasUmbralVencimiento }">
                <!-- Codigos -->
                <td>
                  <div class="inv-col-code">
                    <span class="inv-badge-code font-mono">{{ fila.codigo_interno }}</span>
                    <span class="inv-sub-code font-mono">{{ fila.codigo_barras }}</span>
                  </div>
                </td>

                <!-- Producto -->
                <td>
                  <div class="inv-col-prod">
                    <span class="inv-prod-title">{{ fila.nombre_producto }}</span>
                    <div class="inv-prod-meta">
                      <span class="inv-tag-muted">{{ fila.categoria_nombre }}</span>
                      <span
                        class="inv-badge-status"
                        :style="{
                          backgroundColor: ESTADOS_PRODUCTO[fila.estado_producto]?.bg,
                          color: ESTADOS_PRODUCTO[fila.estado_producto]?.text,
                          borderColor: ESTADOS_PRODUCTO[fila.estado_producto]?.border
                        }"
                      >
                        {{ ESTADOS_PRODUCTO[fila.estado_producto]?.label }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Lote y Proveedor -->
                <td>
                  <div class="inv-col-lot">
                    <span class="inv-lot-id font-mono">#{{ fila.lote_id }} - {{ fila.descripcion_lote }}</span>
                    <span class="inv-lot-prov">{{ fila.nombre_proveedor }}</span>
                  </div>
                </td>

                <!-- Fecha de Vencimiento y Regla Configurable de Caducidad -->
                <td>
                  <div class="inv-col-venc">
                    <template v-if="fila.fecha_vencimiento">
                      <span class="inv-venc-date font-mono">{{ fila.fecha_vencimiento }}</span>

                      <!-- Indicador Dinamico de Caducidad -->
                      <div v-if="fila.dias_vencimiento !== null" class="inv-venc-alert-box">
                        <span v-if="fila.dias_vencimiento < 0" class="inv-badge-venc-danger">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                          Vencido hace {{ Math.abs(fila.dias_vencimiento) }} días
                        </span>

                        <span v-else-if="fila.dias_vencimiento === 0" class="inv-badge-venc-danger">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          Vence hoy
                        </span>

                        <span v-else-if="fila.dias_vencimiento <= diasUmbralVencimiento" class="inv-badge-venc-warn">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                          Vence en {{ fila.dias_vencimiento }} días
                        </span>

                        <span v-else class="inv-venc-ok">
                          Faltan {{ fila.dias_vencimiento }} días
                        </span>
                      </div>
                    </template>
                    <template v-else>
                      <span class="inv-venc-no-per">No perecedero</span>
                    </template>
                  </div>
                </td>

                <!-- Costos -->
                <td class="text-right">
                  <div class="inv-col-cost font-mono">
                    <span class="inv-cost-unit">{{ formatMontoBs(fila.costo_unitario) }} u.</span>
                    <span class="inv-cost-total">Lote: {{ formatMontoBs(fila.precio_lote) }}</span>
                  </div>
                </td>

                <!-- Precios de Venta y Oferta -->
                <td class="text-right">
                  <div class="inv-col-price font-mono">
                    <template v-if="fila.en_descuento && fila.precio_descuento">
                      <span class="inv-price-strike">{{ formatMontoBs(fila.precio_venta_producto) }}</span>
                      <span class="inv-price-discount">{{ formatMontoBs(fila.precio_descuento) }}</span>
                      <span class="inv-badge-offer">EN OFERTA</span>
                    </template>
                    <template v-else>
                      <span class="inv-price-regular">{{ formatMontoBs(fila.precio_venta_producto) }}</span>
                    </template>
                  </div>
                </td>

                <!-- Stock Disponible -->
                <td class="text-center">
                  <span
                    class="inv-stock-badge font-mono"
                    :class="{ 'stock-zero': fila.stock <= 0, 'stock-low': fila.stock > 0 && fila.stock <= 10 }"
                  >
                    {{ fila.stock }} u.
                  </span>
                </td>

                <!-- Acciones -->
                <td class="text-center">
                  <div class="inv-actions-box">
                    <!-- Boton Oferta / Descuento -->
                    <button
                      type="button"
                      class="inv-btn-action"
                      :class="{ 'active-offer': fila.en_descuento }"
                      @click="abrirModalDescuento(fila)"
                      :title="rolActivo === ROLES.CAJERO ? 'Solo Supervisor/Propietario' : 'Fijar precio de oferta / liquidación'"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                    </button>

                    <!-- Boton Baja Logica -->
                    <button
                      type="button"
                      class="inv-btn-action danger"
                      @click="darBajaItemInventario(fila.inventario_id)"
                      title="Dar de baja del inventario"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ============================================================= -->
    <!-- TAB 2: SALA DE ESPERA (INVENTARIO PENDIENTES) -->
    <!-- ============================================================= -->
    <main v-if="activeTab === 'espera'" class="inv-tab-content">
      <div class="inv-banner-audit">
        <div class="inv-banner-audit-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div class="inv-banner-audit-text">
          <h3>Bandeja de Auditoría y Validación de Mercadería</h3>
          <p>
            Los registros ingresados por cajeros permanecen aislados en esta cola (estado_auditoria = 'EN_ESPERA').
            <strong>No se sumarán a las unidades en stock activo</strong> hasta que un Supervisor o Propietario verifique costos, caducidad y apruebe el ingreso.
          </p>
        </div>
      </div>

      <div class="inv-table-card">
        <div class="inv-table-responsive">
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width: 140px">ID / Registro</th>
                <th>Producto y Código</th>
                <th>Lote Propuesto y Vencimiento</th>
                <th class="text-right" style="width: 120px">Ingreso / Costo</th>
                <th class="text-right" style="width: 100px">Precio Venta</th>
                <th class="text-center" style="width: 160px; min-width: 150px">Estado Auditoría</th>
                <th class="text-center" style="width: 280px; min-width: 270px">Acciones de Supervisor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pendientesFiltrados.length === 0">
                <td colspan="7" class="inv-table-empty">
                  No hay registros pendientes de revisión en la Sala de Espera.
                </td>
              </tr>
              <tr v-for="item in pendientesFiltrados" :key="item.inventario_pendiente_id">
                <!-- ID y Registro (Cajero con Nombre Completo) -->
                <td>
                  <div class="inv-col-pend-id">
                    <span class="inv-badge-id font-mono">#PEND-{{ item.inventario_pendiente_id }}</span>
                    <div class="inv-col-user-box">
                      <span class="inv-user-name">{{ resolverNombreUsuario(item.usuario_creacion) }}</span>
                      <div class="inv-user-subrow">
                        <span
                          class="inv-role-badge-tag"
                          :style="{
                            backgroundColor: getBadgeRol(item.usuario_creacion).bg,
                            color: getBadgeRol(item.usuario_creacion).text,
                            borderColor: getBadgeRol(item.usuario_creacion).border
                          }"
                        >
                          <span class="inv-role-dot" :style="{ backgroundColor: getBadgeRol(item.usuario_creacion).text }"></span>
                          {{ getBadgeRol(item.usuario_creacion).label }}
                        </span>
                        <span class="inv-pend-date font-mono">{{ formatearFechaCorta(item.fecha_creacion) }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Producto y Catalogacion -->
                <td>
                  <div class="inv-col-prod">
                    <div class="inv-pend-prod-header">
                      <span class="inv-prod-title">{{ item.nombre_producto }}</span>
                      <span v-if="item.producto_id === null" class="inv-badge-new-prod">
                        Producto Nuevo
                      </span>
                      <span v-else class="inv-badge-exist-prod">
                        Reabastecimiento
                      </span>
                    </div>
                    <div class="inv-prod-meta font-mono">
                      <span>Cód: {{ item.codigo_interno }}</span>
                      <span v-if="item.codigo_barras">Barras: {{ item.codigo_barras }}</span>
                    </div>
                  </div>
                </td>

                <!-- Lote propuesto -->
                <td>
                  <div class="inv-col-lot">
                    <span class="inv-lot-id">{{ item.descripcion_lote }}</span>
                    <span v-if="item.fecha_vencimiento" class="inv-lot-venc font-mono">
                      Vence: {{ item.fecha_vencimiento }}
                    </span>
                    <span v-else class="inv-venc-no-per">No perecedero</span>
                  </div>
                </td>

                <!-- Cantidades y Costos -->
                <td class="text-right">
                  <div class="inv-col-cost font-mono">
                    <span class="inv-stock-qty">{{ item.stock_ingresado }} unidades</span>
                    <span class="inv-cost-unit">Unit: {{ formatMontoBs(item.precio_compra) }}</span>
                    <span class="inv-cost-total">Total: {{ formatMontoBs(item.precio_lote) }}</span>
                  </div>
                </td>

                <!-- Precio Venta -->
                <td class="text-right">
                  <span class="inv-price-regular font-mono">{{ formatMontoBs(item.precio_venta) }}</span>
                </td>

                <!-- Estado Auditoría (Aprobado / Rechazado / Pendiente) -->
                <td class="text-center">
                  <div class="inv-status-audit-wrapper">
                    <span v-if="item.estado === 2" class="inv-badge-audit approved">
                      <span class="inv-badge-dot"></span>
                      <span>Aprobado</span>
                    </span>
                    <span v-else-if="item.estado === 3" class="inv-badge-audit rejected">
                      <span class="inv-badge-dot"></span>
                      <span>Rechazado</span>
                    </span>
                    <span v-else class="inv-badge-audit pending">
                      <span class="inv-badge-dot"></span>
                      <span>Pendiente</span>
                    </span>

                    <span v-if="item.usuario_revision" class="inv-audit-sub">
                      por {{ resolverNombreUsuario(item.usuario_revision) }}
                    </span>
                    <span v-else class="inv-audit-sub muted">
                      Por revisar
                    </span>
                  </div>
                </td>

                <!-- Acciones de Supervisor (Detalles, Editar, Aprobar, Rechazar) -->
                <td class="text-center">
                  <!-- CASO 1: PENDIENTE (ESTADO = 1) -->
                  <div v-if="item.estado === 1" class="inv-audit-actions">
                    <!-- Botón de Detalles (Espacioso, no aplastado) -->
                    <button
                      type="button"
                      class="inv-btn-detail-sm"
                      @click="abrirModalDetalles(item)"
                      title="Ver trazabilidad completa, observaciones y personal"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Detalles</span>
                    </button>

                    <template v-if="rolActivo === ROLES.SUPERVISOR || rolActivo === ROLES.PROPIETARIO">
                      <!-- Editar / Rectificar -->
                      <button
                        type="button"
                        class="inv-btn-edit-sm"
                        @click="abrirModalEditarPendiente(item)"
                        title="Rectificar datos antes de aprobar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Editar</span>
                      </button>

                      <!-- Aprobar -->
                      <button
                        type="button"
                        class="inv-btn-approve-sm"
                        @click="aprobarIngreso(item)"
                        title="Aprobar e ingresar stock a Inventario Activo"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Aprobar</span>
                      </button>

                      <!-- Rechazar -->
                      <button
                        type="button"
                        class="inv-btn-reject-sm"
                        @click="abrirModalRechazo(item)"
                        title="Rechazar ingreso y registrar motivo"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </template>
                    <template v-else>
                      <span class="inv-wait-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        En espera
                      </span>
                    </template>
                  </div>

                  <!-- CASO 2: PROCESADO (APROBADO O RECHAZADO) -->
                  <div v-else class="inv-actions-center">
                    <!-- Botón Detalles solo y perfectamente centrado -->
                    <button
                      type="button"
                      class="inv-btn-detail-sm"
                      @click="abrirModalDetalles(item)"
                      title="Ver auditoría completa, observaciones y dictamen"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Detalles</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ============================================================= -->
    <!-- TAB 3: CATALOGO MAESTRO (PRODUCTOS) -->
    <!-- ============================================================= -->
    <main v-if="activeTab === 'catalogo'" class="inv-tab-content">
      <div class="inv-table-card">
        <div class="inv-table-responsive">
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width: 140px">Cód. Interno / Barras</th>
                <th>Nombre del Producto</th>
                <th>Categoría</th>
                <th class="text-right" style="width: 130px">Costo Ref. (Compra)</th>
                <th class="text-right" style="width: 130px">Precio Venta (Góndola)</th>
                <th class="text-center" style="width: 130px">Stock Total Activo</th>
                <th class="text-center" style="width: 160px">Estado Comercial</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="productosCatalogo.length === 0">
                <td colspan="7" class="inv-table-empty">
                  No se encontraron productos en el catálogo maestro.
                </td>
              </tr>
              <tr v-for="prod in productosCatalogo" :key="prod.producto_id">
                <td>
                  <div class="inv-col-code">
                    <span class="inv-badge-code font-mono">{{ prod.codigo_interno }}</span>
                    <span class="inv-sub-code font-mono">{{ prod.codigo_barras }}</span>
                  </div>
                </td>

                <td>
                  <span class="inv-prod-title">{{ prod.nombre_producto }}</span>
                </td>

                <td>
                  <span class="inv-tag-muted">{{ prod.categoria_nombre }}</span>
                </td>

                <td class="text-right font-mono">
                  <span class="inv-cost-unit">{{ formatMontoBs(prod.precio_compra) }}</span>
                </td>

                <td class="text-right font-mono">
                  <span class="inv-price-regular">{{ formatMontoBs(prod.precio_venta) }}</span>
                </td>

                <td class="text-center font-mono">
                  <span class="inv-stock-badge" :class="{ 'stock-zero': prod.stock_total <= 0 }">
                    {{ prod.stock_total }} u.
                  </span>
                </td>

                <td class="text-center">
                  <select
                    :value="prod.estado"
                    class="inv-status-select"
                    :disabled="rolActivo === ROLES.CAJERO"
                    @change="cambiarEstadoProducto(prod.producto_id, Number(($event.target as HTMLSelectElement).value))"
                    :title="rolActivo === ROLES.CAJERO ? 'Permiso exclusivo de Supervisor' : 'Modificar estado comercial'"
                  >
                    <option :value="1">1: Activo</option>
                    <option :value="2">2: Descontinuado</option>
                    <option :value="3">3: Suspendido</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ============================================================= -->
    <!-- MODAL 1: RECEPCION DE MERCADERIA (ABM CON GENERADOR LEC001) -->
    <!-- ============================================================= -->
    <div v-if="modalRecepcionVisible" class="inv-modal-overlay">
      <div class="inv-modal-container">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Registrar Ingreso de Mercadería y Lote</h2>
            <p class="inv-modal-subtitle">Recepción física, lectura de código de barras y liquidación de costos</p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalRecepcionVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="guardarRecepcion" class="inv-modal-body">
          <!-- SECCION 1: IDENTIFICACION DEL PRODUCTO -->
          <div class="inv-form-section">
            <span class="inv-section-title">Paso 1: Identificación del Producto (Catálogo)</span>

            <!-- Codigo de Barras + Lector + Camara -->
            <div class="inv-field-group">
              <label class="inv-label">
                Código de Barras
                <span class="inv-label-hint">Presione Enter o escanee con pistola física</span>
              </label>
              <div class="inv-barcode-input-row">
                <div class="inv-barcode-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs barcode-icon">
                    <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
                  </svg>
                  <input
                    ref="barcodeInputRef"
                    v-model="formRecepcion.codigo_barras"
                    type="text"
                    placeholder="Ej. 7771234560012"
                    class="inv-input font-mono barcode-input"
                    @keydown.enter.prevent="handleBarcodeEnter"
                  />
                </div>
                <button
                  type="button"
                  class="inv-btn-camera"
                  @click="abrirVisorCamara"
                  title="Abrir simulador de cámara móvil"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Escanear con Cámara Móvil</span>
                </button>
              </div>
            </div>

            <!-- Nombre de Producto y Codigo Interno Autogenerado -->
            <div class="inv-grid-2">
              <div class="inv-field-group">
                <label class="inv-label">Nombre del Producto *</label>
                <input
                  v-model="formRecepcion.nombre_producto"
                  type="text"
                  placeholder="Ej. Leche Pil Entera 1L"
                  class="inv-input"
                  required
                  @input="onNombreProductoInput"
                />
              </div>

              <div class="inv-field-group">
                <label class="inv-label">
                  Código Interno
                  <span class="inv-badge-auto">Autogenerado</span>
                </label>
                <div class="inv-readonly-input-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    v-model="formRecepcion.codigo_interno"
                    type="text"
                    readonly
                    class="inv-input font-mono readonly-input"
                    placeholder="Ej. LEC001"
                  />
                </div>
              </div>
            </div>

            <!-- Categoria y Proveedor -->
            <div class="inv-grid-2">
              <div class="inv-field-group">
                <label class="inv-label">Categoría de Producto *</label>
                <select v-model="formRecepcion.categoria_id" class="inv-input" required>
                  <option v-for="(nombre, id) in CATEGORIAS" :key="id" :value="Number(id)">
                    {{ nombre }}
                  </option>
                </select>
              </div>

              <div class="inv-field-group">
                <label class="inv-label">Proveedor</label>
                <select v-model="formRecepcion.proveedor_id" class="inv-input">
                  <option :value="null">Sin proveedor / Compra directa (NULL)</option>
                  <option v-for="prov in proveedores" :key="prov.proveedor_id" :value="prov.proveedor_id">
                    {{ prov.nombre_empresa }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- SECCION 2: DATOS DEL LOTE Y COSTOS -->
          <div class="inv-form-section">
            <span class="inv-section-title">Paso 2: Datos de Partida del Lote y Liquidación de Costos</span>

            <div class="inv-field-group">
              <label class="inv-label">Descripción del Lote</label>
              <input
                v-model="formRecepcion.descripcion_lote"
                type="text"
                placeholder="Ej. Lote Leche Pil Oct-2026"
                class="inv-input"
              />
            </div>

            <div class="inv-grid-3">
              <!-- Stock Ingresado -->
              <div class="inv-field-group">
                <label class="inv-label">
                  Unidades Físicas (Cantidad) *
                  <span class="inv-label-sub">Incluye unidades regalo/bonificación</span>
                </label>
                <input
                  v-model.number="formRecepcion.stock_ingresado"
                  type="number"
                  min="1"
                  step="1"
                  class="inv-input font-mono"
                  required
                />
              </div>

              <!-- Precio Total del Lote -->
              <div class="inv-field-group">
                <label class="inv-label">Monto Total Lote (Bs) *</label>
                <input
                  v-model.number="formRecepcion.precio_lote"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="inv-input font-mono"
                  required
                />
              </div>

              <!-- Costo Unitario Manual con Sugerencia -->
              <div class="inv-field-group">
                <label class="inv-label">
                  Costo Unitario (Bs) *
                  <span class="inv-label-sub">Ingreso manual</span>
                </label>
                <input
                  v-model.number="formRecepcion.precio_compra"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="inv-input font-mono"
                  required
                />
                <div v-if="costoSugeridoMatematico > 0" class="inv-cost-sug-row">
                  <span>Sugerido (Total / Cant): Bs {{ costoSugeridoMatematico.toFixed(2) }}</span>
                  <button type="button" class="inv-btn-link-action" @click="aplicarCostoSugerido">
                    Usar sugerido
                  </button>
                </div>
              </div>
            </div>

            <div class="inv-grid-2">
              <!-- Precio de Venta Oficial -->
              <div class="inv-field-group">
                <label class="inv-label">Precio de Venta Oficial (Bs) *</label>
                <input
                  v-model.number="formRecepcion.precio_venta"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="inv-input font-mono"
                  required
                />
              </div>

              <!-- Perecedero y Fecha de Vencimiento -->
              <div class="inv-field-group">
                <div class="inv-checkbox-row">
                  <input
                    id="chkPerecedero"
                    v-model="formRecepcion.es_perecedero"
                    type="checkbox"
                    class="inv-checkbox"
                  />
                  <label for="chkPerecedero" class="inv-label-chk">¿Es producto perecedero con vencimiento?</label>
                </div>
                <input
                  v-if="formRecepcion.es_perecedero"
                  v-model="formRecepcion.fecha_vencimiento"
                  type="date"
                  class="inv-input font-mono"
                  required
                />
                <span v-else class="inv-text-muted-sm">Se registrará fecha_vencimiento = NULL</span>
              </div>
            </div>

            <!-- Checkbox supervisor de ingreso directo -->
            <div
              v-if="rolActivo === ROLES.SUPERVISOR || rolActivo === ROLES.PROPIETARIO"
              class="inv-direct-approval-box"
            >
              <input
                id="chkDirecto"
                v-model="formRecepcion.ingresar_directo_aprobado"
                type="checkbox"
                class="inv-checkbox"
              />
              <label for="chkDirecto" class="inv-direct-label">
                <strong>Ingresar directamente a Stock Activo</strong> (Omitir Sala de Espera para este lote con privilegios de Supervisor)
              </label>
            </div>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalRecepcionVisible = false">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ (rolActivo !== ROLES.CAJERO && formRecepcion.ingresar_directo_aprobado) ? 'Guardar y Aprobar a Stock' : 'Enviar a Sala de Espera' }}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 2: VISOR SIMULADO DE CAMARA MOVIL (ANDROID) -->
    <!-- ============================================================= -->
    <div v-if="modalCamaraVisible" class="inv-modal-overlay">
      <div class="inv-camera-modal-container">
        <header class="inv-camera-header">
          <div class="inv-camera-title-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Visor de Escáner de Código de Barras Móvil</span>
          </div>
          <button type="button" class="inv-btn-close-camera" @click="modalCamaraVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="inv-camera-viewport">
          <!-- Guias de esquinas de visor -->
          <div class="inv-viewfinder-frame">
            <div class="inv-viewfinder-laser"></div>
            <div class="inv-viewfinder-corners"></div>
          </div>
          <p class="inv-camera-prompt">Apunte la cámara al código de barras o use los botones de prueba:</p>
        </div>

        <div class="inv-camera-sim-controls">
          <button
            type="button"
            class="inv-btn-sim-code"
            @click="simularEscaneo('7771234560012')"
          >
            <span>Simular lectura existente: Leche Pil</span>
            <span class="font-mono">7771234560012</span>
          </button>

          <button
            type="button"
            class="inv-btn-sim-code"
            @click="simularEscaneo('7779988776655')"
          >
            <span>Simular lectura nuevo producto</span>
            <span class="font-mono">7779988776655</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 3: ASIGNAR PRECIO DE OFERTA / DESCUENTO -->
    <!-- ============================================================= -->
    <div v-if="modalDescuentoVisible" class="inv-modal-overlay">
      <div class="inv-modal-container small">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Gestión de Oferta por Vencimiento</h2>
            <p class="inv-modal-subtitle">{{ itemDescuentoActivo?.nombre_producto }} (Lote #{{ itemDescuentoActivo?.lote_id }})</p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalDescuentoVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="guardarDescuento" class="inv-modal-body">
          <div class="inv-offer-preview-box">
            <div class="inv-offer-detail-row">
              <span class="text-secondary">Precio Oficial Actual:</span>
              <span class="font-mono">{{ formatMontoBs(itemDescuentoActivo?.precio_venta_producto) }}</span>
            </div>
            <div class="inv-offer-detail-row">
              <span class="text-secondary">Días para Vencer:</span>
              <span class="font-mono">{{ itemDescuentoActivo?.dias_vencimiento ?? 'N/A' }} días</span>
            </div>
          </div>

          <div class="inv-checkbox-row">
            <input
              id="chkActivarOferta"
              v-model="formDescuento.activar"
              type="checkbox"
              class="inv-checkbox"
            />
            <label for="chkActivarOferta" class="inv-label-chk">
              Activar precio especial de liquidación (en_descuento = true)
            </label>
          </div>

          <div v-if="formDescuento.activar" class="inv-field-group">
            <label class="inv-label">Precio Rebajado de Oferta (Bs) *</label>
            <input
              v-model.number="formDescuento.precio_descuento"
              type="number"
              min="0.10"
              step="0.10"
              class="inv-input font-mono"
              required
            />
            <span class="inv-text-muted-sm">
              Este precio sustituirá al precio de venta oficial en el POS para este lote específico.
            </span>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalDescuentoVisible = false">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-primary">
              Guardar Política
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 4: RECHAZO DE LOTE EN SALA DE ESPERA -->
    <!-- ============================================================= -->
    <div v-if="modalRechazoVisible" class="inv-modal-overlay">
      <div class="inv-modal-container small">
        <header class="inv-modal-header danger">
          <div class="inv-modal-header-icon danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Rechazar Ingreso de Lote</h2>
            <p class="inv-modal-subtitle">Registro #{{ pendienteARechazar?.inventario_pendiente_id }} - {{ pendienteARechazar?.nombre_producto }}</p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalRechazoVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="confirmarRechazo" class="inv-modal-body">
          <div class="inv-field-group">
            <label class="inv-label">Motivo u Observación de Rechazo *</label>
            <textarea
              v-model="motivoRechazo"
              rows="3"
              class="inv-input"
              placeholder="Ej. Mercadería dañada en empaque, costo no coincide con orden de compra..."
              required
            ></textarea>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalRechazoVisible = false">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-danger">
              Confirmar Rechazo
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 5: EDITAR Y RECTIFICAR PENDIENTE (SUPERVISOR) -->
    <!-- ============================================================= -->
    <div v-if="modalEditarPendienteVisible" class="inv-modal-overlay" @click.self="modalEditarPendienteVisible = false">
      <div class="inv-modal-container inv-modal-edit-container">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon inv-icon-edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Rectificar Datos de Recepción</h2>
            <p class="inv-modal-subtitle">
              Registro #PEND-{{ pendienteEnEdicion?.inventario_pendiente_id }} &bull; Corrección de costos, cantidades o código
            </p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalEditarPendienteVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="guardarYaprobarPendiente" class="inv-modal-body">
          <div class="inv-grid-2">
            <div class="inv-field-group">
              <label class="inv-label">Nombre del Producto</label>
              <input v-model="formEditarPendiente.nombre_producto" type="text" class="inv-input" required />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Código de Barras (opcional / escáner)</label>
              <input v-model="formEditarPendiente.codigo_barras" type="text" class="inv-input font-mono" placeholder="Ej: 7771234560012" />
            </div>
          </div>

          <div class="inv-grid-2">
            <div class="inv-field-group">
              <label class="inv-label">Categoría</label>
              <select v-model.number="formEditarPendiente.categoria_id" class="inv-select" required>
                <option v-for="(nombre, id) in CATEGORIAS" :key="id" :value="Number(id)">
                  {{ nombre }}
                </option>
              </select>
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Proveedor</label>
              <select v-model.number="formEditarPendiente.proveedor_id" class="inv-select" required>
                <option v-for="prov in proveedores" :key="prov.proveedor_id" :value="prov.proveedor_id">
                  {{ prov.nombre_empresa }}
                </option>
              </select>
            </div>
          </div>

          <div class="inv-grid-3">
            <div class="inv-field-group">
              <label class="inv-label">Cantidad Recibida</label>
              <input
                v-model.number="formEditarPendiente.stock_ingresado"
                type="number"
                min="1"
                class="inv-input font-mono"
                required
                @input="onEditarCalculoPrecioLote"
              />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Costo Unitario (Bs)</label>
              <input
                v-model.number="formEditarPendiente.precio_compra"
                type="number"
                step="0.01"
                min="0"
                class="inv-input font-mono"
                required
                @input="onEditarCalculoPrecioLote"
              />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Precio Venta (Bs)</label>
              <input
                v-model.number="formEditarPendiente.precio_venta"
                type="number"
                step="0.01"
                min="0.01"
                class="inv-input font-mono"
                required
              />
            </div>
          </div>

          <div class="inv-grid-2">
            <div class="inv-field-group">
              <label class="inv-label">Costo Total del Lote (Bs)</label>
              <input
                v-model.number="formEditarPendiente.precio_lote"
                type="number"
                step="0.01"
                class="inv-input font-mono bg-slate-50"
                required
              />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Fecha de Vencimiento (opcional)</label>
              <input v-model="formEditarPendiente.fecha_vencimiento" type="date" class="inv-input font-mono" />
            </div>
          </div>

          <div class="inv-field-group">
            <label class="inv-label">Motivo o Nota de Rectificación (opcional)</label>
            <input
              v-model="formEditarPendiente.observacion_rectificacion"
              type="text"
              class="inv-input"
              placeholder="Ej: Se corrigió precio de venta y fecha de caducidad según empaque físico"
            />
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalEditarPendienteVisible = false">
              Cancelar
            </button>

            <!-- Opcion 1: Guardar rectificación y mantener en espera -->
            <button
              type="button"
              class="inv-btn-rectify"
              :disabled="guardandoRectificacion"
              @click="guardarRectificacionPendiente"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{{ guardandoRectificacion ? 'Guardando...' : 'Guardar Rectificación' }}</span>
            </button>

            <!-- Opcion 2: Guardar y Aprobar directamente -->
            <button type="submit" class="inv-btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Guardar y Aprobar Lote</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 6: DETALLES, AUDITORIA Y TRAZABILIDAD (SALA DE ESPERA) -->
    <!-- ============================================================= -->
    <div v-if="modalDetallesVisible && pendienteEnDetalle" class="inv-modal-overlay" @click.self="modalDetallesVisible = false">
      <div class="inv-modal-container inv-modal-details-container">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon inv-icon-details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Detalles de Auditoría y Trazabilidad</h2>
            <p class="inv-modal-subtitle">
              Registro #PEND-{{ pendienteEnDetalle.inventario_pendiente_id }} &bull; {{ pendienteEnDetalle.nombre_producto }}
            </p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalDetallesVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="inv-modal-body inv-details-body">
          <!-- BANNER DE ESTADO -->
          <div class="inv-detail-status-banner">
            <div class="inv-detail-status-left">
              <span class="inv-detail-status-caption">Estado actual de la mercadería:</span>
              <ConceptoBadge tipo="sala_espera" :valor="pendienteEnDetalle.estado" size="lg" />
            </div>
            <div class="inv-detail-status-right">
              <span class="inv-detail-chip">
                {{ pendienteEnDetalle.producto_id ? 'Reabastecimiento de Catálogo' : 'Nuevo Producto para Catálogo' }}
              </span>
            </div>
          </div>

          <!-- LINEA DE TIEMPO / TRAZABILIDAD DE PERSONAL -->
          <div class="inv-detail-section">
            <h3 class="inv-detail-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Personal Involucrado y Trazabilidad</span>
            </h3>

            <div class="inv-timeline">
              <!-- PASO 1: REGISTRO (CAJERO) -->
              <div class="inv-timeline-item">
                <div class="inv-timeline-marker reg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div class="inv-timeline-content">
                  <div class="inv-timeline-header">
                    <span class="inv-timeline-action">Registrado en Recepción por</span>
                    <span class="inv-timeline-time font-mono">{{ formatearFechaHora(pendienteEnDetalle.fecha_creacion) }}</span>
                  </div>
                  <div class="inv-timeline-person">
                    <strong>{{ resolverNombreUsuario(pendienteEnDetalle.usuario_creacion) }}</strong>
                    <span class="inv-timeline-role-tag cajero">Cajero</span>
                  </div>
                  <p class="inv-timeline-desc">
                    Recepción física en sucursal e ingreso a la cola de Sala de Espera para validación de costos.
                  </p>
                </div>
              </div>

              <!-- PASO 2: AUDITORIA / RESOLUCION (SUPERVISOR) -->
              <div class="inv-timeline-item">
                <div
                  class="inv-timeline-marker"
                  :class="{
                    approved: pendienteEnDetalle.estado === 2,
                    rejected: pendienteEnDetalle.estado === 3,
                    wait: pendienteEnDetalle.estado === 1
                  }"
                >
                  <svg v-if="pendienteEnDetalle.estado === 2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <svg v-else-if="pendienteEnDetalle.estado === 3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div class="inv-timeline-content">
                  <div class="inv-timeline-header">
                    <span class="inv-timeline-action">
                      {{ pendienteEnDetalle.estado === 2 ? 'Aprobado y Asentado por' : (pendienteEnDetalle.estado === 3 ? 'Rechazado y Anulado por' : 'Auditoría Pendiente') }}
                    </span>
                    <span v-if="pendienteEnDetalle.fecha_revision" class="inv-timeline-time font-mono">
                      {{ formatearFechaHora(pendienteEnDetalle.fecha_revision) }}
                    </span>
                  </div>
                  <div v-if="pendienteEnDetalle.estado !== 1" class="inv-timeline-person">
                    <strong>{{ resolverNombreUsuario(pendienteEnDetalle.usuario_revision) }}</strong>
                    <span class="inv-timeline-role-tag supervisor">Supervisor</span>
                  </div>
                  <p v-if="pendienteEnDetalle.estado === 2" class="inv-timeline-desc text-emerald-700">
                    Lote validado e ingresado a las existencias vendibles de stock activo.
                  </p>
                  <p v-else-if="pendienteEnDetalle.estado === 3" class="inv-timeline-desc text-rose-700">
                    Registro rechazado. La mercadería no ingresó a inventario y fue devuelta al proveedor o descartada.
                  </p>
                  <p v-else class="inv-timeline-desc text-amber-700">
                    Esperando verificación de cantidad física, costo de factura y caducidad por el Supervisor de turno.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- OBSERVACIONES Y MOTIVO -->
          <div class="inv-detail-section">
            <h3 class="inv-detail-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Observaciones y Justificación</span>
            </h3>
            <div
              class="inv-detail-obs-card"
              :class="{
                'obs-approved': pendienteEnDetalle.estado === 2,
                'obs-rejected': pendienteEnDetalle.estado === 3,
                'obs-pending': pendienteEnDetalle.estado === 1
              }"
            >
              <div class="inv-obs-header">
                <strong>
                  {{ pendienteEnDetalle.estado === 3 ? 'Motivo del Rechazo:' : (pendienteEnDetalle.estado === 2 ? 'Nota de Auditoría:' : 'Observaciones de Ingreso:') }}
                </strong>
              </div>
              <p class="inv-obs-text">
                {{ pendienteEnDetalle.observacion_revision || (pendienteEnDetalle.estado === 2 ? 'Aprobado sin observaciones adicionales. La mercadería cumple satisfactoriamente con los estándares de calidad y control de precios.' : (pendienteEnDetalle.estado === 3 ? 'Rechazado por el supervisor.' : 'Sin observaciones registradas durante la recepción.')) }}
              </p>
            </div>
          </div>

          <!-- FICHA TECNICA Y ECONOMICA -->
          <div class="inv-detail-section">
            <h3 class="inv-detail-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span>Ficha Técnica y Valores Económicos</span>
            </h3>

            <div class="inv-detail-grid">
              <!-- TARJETA 1: DATOS CATALOGO -->
              <div class="inv-detail-card">
                <span class="inv-detail-card-label">Identificación</span>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Cód. Interno:</span>
                  <span class="font-mono font-bold">{{ pendienteEnDetalle.codigo_interno }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Cód. Barras:</span>
                  <span class="font-mono">{{ pendienteEnDetalle.codigo_barras || 'Sin código' }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Categoría:</span>
                  <span>{{ CATEGORIAS[pendienteEnDetalle.categoria_id] ?? 'General' }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Proveedor:</span>
                  <span>{{ proveedores.find(pr => pr.proveedor_id === pendienteEnDetalle?.proveedor_id)?.nombre_empresa ?? 'Sin Proveedor' }}</span>
                </div>
              </div>

              <!-- TARJETA 2: COSTOS Y PRECIOS -->
              <div class="inv-detail-card">
                <span class="inv-detail-card-label">Precios y Existencia</span>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Cantidad Ingresada:</span>
                  <span class="font-bold text-slate-800">{{ pendienteEnDetalle.stock_ingresado }} unidades</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Costo Unitario:</span>
                  <span class="font-mono font-bold">{{ formatMontoBs(pendienteEnDetalle.precio_compra) }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Costo Total Lote:</span>
                  <span class="font-mono font-bold text-slate-900">{{ formatMontoBs(pendienteEnDetalle.precio_lote) }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Precio de Venta:</span>
                  <span class="font-mono font-bold text-emerald-700">{{ formatMontoBs(pendienteEnDetalle.precio_venta) }}</span>
                </div>
              </div>

              <!-- TARJETA 3: CADUCIDAD -->
              <div class="inv-detail-card">
                <span class="inv-detail-card-label">Lote y Caducidad</span>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Descripción Lote:</span>
                  <span>{{ pendienteEnDetalle.descripcion_lote || 'Lote General' }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Fecha Vencimiento:</span>
                  <span class="font-mono font-bold">{{ pendienteEnDetalle.fecha_vencimiento || 'No perecedero' }}</span>
                </div>
                <div v-if="pendienteEnDetalle.fecha_vencimiento" class="inv-detail-card-row">
                  <span class="text-muted">Días para Vencer:</span>
                  <span
                    class="inv-venc-tag"
                    :class="{
                      'venc-ok': (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 99) > 14,
                      'venc-warn': (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 99) <= 14 && (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 99) >= 0,
                      'venc-danger': (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 99) < 0
                    }"
                  >
                    {{ (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 0) < 0 ? 'Vencido' : `${getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento)} días` }}
                  </span>
                </div>
              </div>

              <!-- TARJETA 4: RENTABILIDAD -->
              <div class="inv-detail-card">
                <span class="inv-detail-card-label">Análisis de Margen</span>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Margen Unitario:</span>
                  <span class="font-mono font-bold text-emerald-600">
                    {{ formatMontoBs(pendienteEnDetalle.precio_venta - pendienteEnDetalle.precio_compra) }}
                  </span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">% Rentabilidad:</span>
                  <span class="font-mono font-bold text-emerald-700">
                    {{ pendienteEnDetalle.precio_compra > 0 ? (((pendienteEnDetalle.precio_venta - pendienteEnDetalle.precio_compra) / pendienteEnDetalle.precio_compra) * 100).toFixed(1) + '%' : '100%' }}
                  </span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Utilidad Estimada Lote:</span>
                  <span class="font-mono font-bold text-emerald-800">
                    {{ formatMontoBs((pendienteEnDetalle.precio_venta - pendienteEnDetalle.precio_compra) * pendienteEnDetalle.stock_ingresado) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="inv-modal-footer">
          <button type="button" class="inv-btn-secondary" @click="modalDetallesVisible = false">
            Cerrar
          </button>

          <!-- SI ES PENDIENTE Y EL ROL TIENE PERMISO: ACCIONES RAPIDAS -->
          <template v-if="pendienteEnDetalle.estado === 1 && (rolActivo === ROLES.SUPERVISOR || rolActivo === ROLES.PROPIETARIO)">
            <button
              type="button"
              class="inv-btn-rectify"
              @click="abrirEdicionDesdeDetalles"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Editar / Rectificar</span>
            </button>

            <button
              type="button"
              class="inv-btn-reject-sm px-3"
              @click="modalDetallesVisible = false; abrirModalRechazo(pendienteEnDetalle)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Rechazar</span>
            </button>

            <button
              type="button"
              class="inv-btn-primary"
              @click="modalDetallesVisible = false; aprobarIngreso(pendienteEnDetalle)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Aprobar Ingreso</span>
            </button>
          </template>
        </footer>
      </div>
    </div>

    <!-- TOAST NOTIFICATIONS CONTAINER -->
    <div class="inv-toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="inv-toast"
        :class="`toast-${toast.tipo}`"
      >
        <div class="inv-toast-icon">
          <svg v-if="toast.tipo === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg v-else-if="toast.tipo === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <svg v-else-if="toast.tipo === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div class="inv-toast-content">
          <strong class="inv-toast-title">{{ toast.titulo }}</strong>
          <p class="inv-toast-msg">{{ toast.mensaje }}</p>
        </div>
        <button type="button" class="inv-toast-close" @click="removerToast(toast.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ====================================================================
   ESTILOS MINIMALISTAS Y SOBRIOS - ERP EMPRESARIAL
   Paleta: #0F172A, #1E293B, #F8FAFC, #FFFFFF, #E2E8F0, #CBD5E1
   ==================================================================== */

.inv-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  color: #0f172a;
  background-color: #f8fafc;
  min-height: calc(100vh - 80px);
  font-family: inherit;
}

/* Tipografia Monoespaciada */
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/* Iconos Utilitarios */
.inv-icon-xs {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.inv-icon-sm {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.inv-icon-md {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

/* BARRA SUPERIOR */
.inv-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.inv-topbar-left {
  display: flex;
  align-items: center;
}

.inv-page-title-box {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.inv-page-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.inv-page-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.015em;
  margin: 0;
}

.inv-page-subtitle {
  font-size: 0.85rem;
  color: #475569;
  margin-top: 0.15rem;
}

.inv-topbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Selector de Rol Discreto */
.inv-role-selector-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
}

.inv-role-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.inv-role-select {
  border: none;
  background: transparent;
  font-size: 0.825rem;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  outline: none;
}

.inv-btn-icon-topbar {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.inv-btn-icon-topbar:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.inv-btn-icon-topbar.has-unread {
  color: #0f172a;
  border-color: #cbd5e1;
}

.inv-badge-counter {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #991b1b;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid #ffffff;
}

/* Botones Principales */
.inv-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  background-color: #0f172a;
  color: #ffffff;
  border: 1px solid #0f172a;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.inv-btn-primary:hover {
  background-color: #1e293b;
  border-color: #1e293b;
}

.inv-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  background-color: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.inv-btn-secondary:hover {
  background-color: #f1f5f9;
}

.inv-btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  background-color: #991b1b;
  color: #ffffff;
  border: 1px solid #991b1b;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.inv-btn-danger:hover {
  background-color: #7f1d1d;
}

/* DRAWER NOTIFICACIONES */
.inv-notif-dropdown {
  position: absolute;
  top: 75px;
  right: 2rem;
  width: 380px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.inv-notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.inv-notif-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}

.inv-btn-close-sm {
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.inv-notif-body {
  padding: 0.5rem;
  max-height: 320px;
  overflow-y: auto;
}

.inv-notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 0.35rem;
  transition: background-color 0.15s ease;
}

.inv-notif-item:hover {
  background-color: #f8fafc;
}

.inv-notif-item.alert-espera .inv-notif-item-icon {
  color: #92400e;
}

.inv-notif-item.alert-vencimiento .inv-notif-item-icon {
  color: #991b1b;
}

.inv-notif-item-text strong {
  display: block;
  font-size: 0.8rem;
  color: #0f172a;
}

.inv-notif-item-text p {
  font-size: 0.75rem;
  color: #475569;
  margin-top: 0.15rem;
}

.inv-notif-empty {
  padding: 1.5rem 1rem;
  text-align: center;
  font-size: 0.8rem;
  color: #64748b;
}

/* TARJETAS KPIS */
.inv-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.inv-kpi-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.15rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.03);
}

.inv-kpi-info {
  display: flex;
  flex-direction: column;
}

.inv-kpi-label {
  font-size: 0.775rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.inv-kpi-value {
  font-size: 1.65rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0.25rem 0 0.15rem;
  line-height: 1.1;
}

.inv-kpi-sub {
  font-size: 0.725rem;
  color: #64748b;
}

.inv-kpi-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
}

.inv-kpi-icon-box.amber {
  background-color: #fffbeb;
  color: #92400e;
}

.inv-kpi-icon-box.rose {
  background-color: #fef2f2;
  color: #991b1b;
}

.inv-kpi-highlight-amber {
  border-color: #fde68a;
}

.inv-kpi-highlight-rose {
  border-color: #fecaca;
}

/* PESTAÑAS (TABS) */
.inv-tabs-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.25rem;
  overflow-x: auto;
}

.inv-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.inv-tab-btn:hover {
  color: #0f172a;
}

.inv-tab-btn.active {
  color: #0f172a;
  border-bottom-color: #0f172a;
}

.inv-tab-counter {
  background-color: #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
}

.inv-tab-counter-alert {
  background-color: #fef2f2;
  color: #991b1b;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
  border: 1px solid #fecaca;
}

/* FILTROS */
.inv-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.875rem 1rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
}

.inv-search-input-box {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 0.85rem;
  transform: translateY(-50%);
  color: #94a3b8;
}

.inv-search-input {
  width: 100%;
  padding: 0.6rem 2.2rem 0.6rem 2.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #0f172a;
  outline: none;
  background-color: #ffffff;
}

.inv-search-input:focus {
  border-color: #0f172a;
}

.inv-search-clear {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.inv-filter-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.inv-filter-select {
  padding: 0.45rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #334155;
  background-color: #ffffff;
  outline: none;
  cursor: pointer;
}

.inv-filter-venc-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background-color: #ffffff;
  border-radius: 6px;
  flex-wrap: wrap;
}

.inv-filter-venc-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.inv-custom-days-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.inv-input-custom-days {
  width: 65px;
  padding: 0.4rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #0f172a;
  outline: none;
  background-color: #ffffff;
}

.inv-input-custom-days:focus {
  border-color: #0f172a;
}

.inv-days-suffix {
  font-size: 0.75rem;
  color: #64748b;
}

.inv-filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #ffffff;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.inv-filter-toggle-btn:hover {
  background-color: #f8fafc;
}

.inv-filter-toggle-btn.active {
  background-color: #fffbeb;
  color: #92400e;
  border-color: #fde68a;
  font-weight: 600;
}

.inv-btn-reset-filters {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 500;
  text-decoration: underline;
  cursor: pointer;
}

/* TABLAS ERP */
.inv-table-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.03);
}

.inv-table-responsive {
  width: 100%;
  overflow-x: auto;
}

.inv-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.85rem;
}

.inv-table thead th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.inv-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.12s ease;
}

.inv-table tbody tr:hover {
  background-color: #f8fafc;
}

.inv-table tbody tr.row-warning-venc {
  background-color: #fffdfa;
}

.inv-table tbody td {
  padding: 0.85rem 1rem;
  vertical-align: middle;
}

.inv-table-empty {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #64748b;
  font-size: 0.85rem;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

/* Celdas y Badges */
.inv-col-code {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.inv-badge-code {
  font-weight: 700;
  color: #0f172a;
}

.inv-sub-code {
  font-size: 0.75rem;
  color: #64748b;
}

.inv-col-prod {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.inv-prod-title {
  font-weight: 600;
  color: #0f172a;
}

.inv-prod-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.inv-tag-muted {
  font-size: 0.725rem;
  background-color: #f1f5f9;
  color: #475569;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.inv-badge-status {
  font-size: 0.725rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  border: 1px solid;
}

.inv-col-lot {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.inv-lot-id {
  font-weight: 600;
  color: #334155;
  font-size: 0.8rem;
}

.inv-lot-prov {
  font-size: 0.75rem;
  color: #64748b;
}

/* Indicadores de Vencimiento */
.inv-col-venc {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.inv-venc-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f172a;
}

.inv-badge-venc-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.725rem;
  font-weight: 600;
}

.inv-badge-venc-warn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background-color: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.725rem;
  font-weight: 600;
}

.inv-venc-ok {
  font-size: 0.725rem;
  color: #64748b;
}

.inv-venc-no-per {
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
}

/* Precios y Costos */
.inv-col-cost,
.inv-col-price {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.inv-cost-unit {
  font-weight: 600;
  color: #334155;
}

.inv-cost-total {
  font-size: 0.725rem;
  color: #64748b;
}

.inv-price-regular {
  font-weight: 700;
  color: #0f172a;
}

.inv-price-strike {
  font-size: 0.75rem;
  color: #94a3b8;
  text-decoration: line-through;
}

.inv-price-discount {
  font-weight: 700;
  color: #991b1b;
}

.inv-badge-offer {
  font-size: 0.65rem;
  font-weight: 700;
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  width: fit-content;
  align-self: flex-end;
}

/* Badges de Stock */
.inv-stock-badge {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #0f172a;
  font-weight: 700;
  font-size: 0.8rem;
}

.inv-stock-badge.stock-low {
  background-color: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.inv-stock-badge.stock-zero {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Acciones en Tabla */
.inv-actions-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.inv-btn-action {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.12s ease;
}

.inv-btn-action:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.inv-btn-action.active-offer {
  background-color: #fffbeb;
  color: #92400e;
  border-color: #fde68a;
}

.inv-btn-action.danger:hover {
  background-color: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

/* BANNER DE AUDITORIA (TAB 2) */
.inv-banner-audit {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #0f172a;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
}

.inv-banner-audit-icon {
  color: #0f172a;
  margin-top: 0.15rem;
}

.inv-banner-audit-text h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.inv-banner-audit-text p {
  font-size: 0.8rem;
  color: #475569;
  margin-top: 0.25rem;
  line-height: 1.4;
}

/* Columnas de Sala de Espera */
.inv-col-pend-id {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.inv-badge-id {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.8rem;
}

.inv-pend-user {
  font-size: 0.725rem;
  color: #475569;
}

.inv-pend-date {
  font-size: 0.725rem;
  color: #94a3b8;
}

.inv-pend-prod-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.inv-badge-new-prod {
  font-size: 0.65rem;
  font-weight: 700;
  background-color: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.inv-badge-exist-prod {
  font-size: 0.65rem;
  font-weight: 700;
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.inv-rejection-note {
  font-size: 0.7rem;
  color: #991b1b;
  margin-top: 0.25rem;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inv-audit-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.inv-btn-approve-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.8rem;
  background-color: #166534;
  color: #ffffff;
  border: 1px solid #166534;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.inv-btn-approve-sm:hover {
  background-color: #14532d;
}

.inv-btn-edit-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.inv-btn-edit-sm:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.inv-btn-reject-sm {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid #fecaca;
  background-color: #fef2f2;
  color: #991b1b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.inv-btn-reject-sm:hover {
  background-color: #fee2e2;
}

.inv-wait-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.725rem;
  color: #64748b;
  font-style: italic;
}

.inv-reviewed-info {
  font-size: 0.75rem;
}
.text-success {
  color: #166534;
  font-weight: 600;
}
.text-danger {
  color: #991b1b;
  font-weight: 600;
}

/* Selector de Estado Comercial en Catalogo */
.inv-status-select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
  background-color: #ffffff;
  outline: none;
  cursor: pointer;
}

.inv-status-select:disabled {
  background-color: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

/* MODALES SOBRIOS */
.inv-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}

.inv-modal-container {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
}

.inv-modal-container.small {
  max-width: 460px;
}

.inv-modal-header {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1.15rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.inv-modal-header.danger {
  border-bottom-color: #fecaca;
}

.inv-modal-header-icon {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
}

.inv-modal-header-icon.danger {
  background-color: #fef2f2;
  color: #991b1b;
}

.inv-modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.inv-modal-subtitle {
  font-size: 0.775rem;
  color: #475569;
  margin-top: 0.15rem;
}

.inv-btn-close {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 4px;
}

.inv-btn-close:hover {
  color: #0f172a;
}

.inv-modal-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.inv-form-section {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.inv-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.inv-field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.inv-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inv-label-hint {
  font-size: 0.7rem;
  font-weight: 400;
  color: #64748b;
}

.inv-label-sub {
  font-size: 0.7rem;
  font-weight: 400;
  color: #64748b;
  display: block;
}

.inv-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #0f172a;
  outline: none;
  background-color: #ffffff;
}

.inv-input:focus {
  border-color: #0f172a;
}

.inv-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
}

.inv-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.875rem;
}

/* Escaneo y Codigo de Barras */
.inv-barcode-input-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.inv-barcode-wrapper {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.barcode-icon {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  transform: translateY(-50%);
  color: #64748b;
}

.barcode-input {
  padding-left: 2.2rem;
}

.inv-btn-camera {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #f8fafc;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.inv-btn-camera:hover {
  background-color: #f1f5f9;
}

.inv-badge-auto {
  font-size: 0.65rem;
  font-weight: 700;
  background-color: #f1f5f9;
  color: #475569;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
}

.inv-readonly-input-box {
  position: relative;
  display: flex;
  align-items: center;
}

.inv-readonly-input-box svg {
  position: absolute;
  left: 0.75rem;
  color: #94a3b8;
}

.readonly-input {
  padding-left: 2.2rem;
  background-color: #f8fafc;
  color: #475569;
  border-color: #e2e8f0;
  cursor: not-allowed;
}

.inv-cost-sug-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.inv-btn-link-action {
  border: none;
  background: transparent;
  color: #0f172a;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: 0.7rem;
}

.inv-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inv-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #0f172a;
  cursor: pointer;
}

.inv-label-chk {
  font-size: 0.8rem;
  color: #334155;
  cursor: pointer;
}

.inv-direct-approval-box {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 0.75rem 1rem;
}

.inv-direct-label {
  font-size: 0.775rem;
  color: #166534;
  cursor: pointer;
  line-height: 1.4;
}

.inv-text-muted-sm {
  font-size: 0.725rem;
  color: #64748b;
}

.inv-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

/* MODAL DE CAMARA */
.inv-camera-modal-container {
  background-color: #0f172a;
  color: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 440px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.inv-camera-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.inv-camera-title-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.inv-btn-close-camera {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.inv-camera-viewport {
  height: 240px;
  background-color: #020617;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.inv-viewfinder-frame {
  width: 220px;
  height: 140px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.inv-viewfinder-laser {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #ef4444;
  box-shadow: 0 0 8px #ef4444;
  animation: laserScan 2s ease-in-out infinite alternate;
}

@keyframes laserScan {
  0% {
    top: 5%;
  }
  100% {
    top: 95%;
  }
}

.inv-camera-prompt {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 1rem;
  text-align: center;
  padding: 0 1rem;
}

.inv-camera-sim-controls {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: #0f172a;
}

.inv-btn-sim-code {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.775rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.inv-btn-sim-code:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

/* DETALLES DE MODAL OFERTA */
.inv-offer-preview-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.inv-offer-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}

.text-secondary {
  color: #475569;
}

/* TOASTS */
.inv-toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  z-index: 2000;
  max-width: 380px;
}

.inv-toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
  animation: toastSlideIn 0.2s ease-out;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.inv-toast.toast-success {
  border-left: 4px solid #166534;
}
.inv-toast.toast-success .inv-toast-icon {
  color: #166534;
}

.inv-toast.toast-info {
  border-left: 4px solid #0f172a;
}
.inv-toast.toast-info .inv-toast-icon {
  color: #0f172a;
}

.inv-toast.toast-warning {
  border-left: 4px solid #92400e;
}
.inv-toast.toast-warning .inv-toast-icon {
  color: #92400e;
}

.inv-toast.toast-danger {
  border-left: 4px solid #991b1b;
}
.inv-toast.toast-danger .inv-toast-icon {
  color: #991b1b;
}

.inv-toast-content {
  flex: 1;
}

.inv-toast-title {
  display: block;
  font-size: 0.825rem;
  font-weight: 700;
  color: #0f172a;
}

.inv-toast-msg {
  font-size: 0.775rem;
  color: #475569;
  margin-top: 0.15rem;
  line-height: 1.35;
}

.inv-toast-close {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
}

/* RESPONSIVIDAD (MOBILE ANDROID Y PANTALLAS PEQUEÑAS) */
@media (max-width: 768px) {
  .inv-wrapper {
    padding: 1rem 0.75rem;
  }

  .inv-topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .inv-topbar-right {
    justify-content: space-between;
  }

  .inv-btn-primary {
    width: 100%;
    justify-content: center;
  }

  .inv-grid-2,
  .inv-grid-3 {
    grid-template-columns: 1fr;
  }

  .inv-notif-dropdown {
    width: 92%;
    right: 4%;
  }

  .inv-filter-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .inv-filter-select,
  .inv-filter-venc-group,
  .inv-filter-toggle-btn {
    width: 100%;
  }
}


/* BADGES PARAMETRICOS DE ROLES Y ESTADOS */
.inv-role-badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  line-height: 1;
  margin-top: 0.15rem;
  margin-bottom: 0.15rem;
}
.inv-role-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}
.inv-role-pill-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

/* ==================================================================== */
/* ESTILOS DE AUDITORIA: APROBADOS Y RECHAZADOS (SALA DE ESPERA) */
/* ==================================================================== */
.inv-filter-status-pills {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
}
.inv-status-pill {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.inv-status-pill:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}
.inv-status-pill.active {
  background: #0ea5e9;
  color: #ffffff;
  border-color: #0284c7;
  box-shadow: 0 1px 3px rgba(14, 165, 233, 0.3);
}
.inv-status-pill.pill-amber.active {
  background: #f59e0b;
  color: #ffffff;
  border-color: #d97706;
  box-shadow: 0 1px 3px rgba(245, 158, 11, 0.3);
}
.inv-status-pill.pill-green.active {
  background: #10b981;
  color: #ffffff;
  border-color: #059669;
  box-shadow: 0 1px 3px rgba(16, 185, 129, 0.3);
}
.inv-status-pill.pill-rose.active {
  background: #f43f5e;
  color: #ffffff;
  border-color: #e11d48;
  box-shadow: 0 1px 3px rgba(244, 63, 94, 0.3);
}

/* --- ESTILOS MEJORADOS DE AUDITORIA Y ACCIONES DE SALA DE ESPERA --- */
.inv-col-user-box {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.inv-user-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}
.inv-user-subrow {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

/* Badges Oficiales de Estado Auditoria (Aprobado / Rechazado / Pendiente) */
.inv-status-audit-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.inv-badge-audit {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.32rem 0.8rem;
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}
.inv-badge-audit.approved {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}
.inv-badge-audit.rejected {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.inv-badge-audit.pending {
  background-color: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}
.inv-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  background-color: currentColor;
}
.inv-audit-sub {
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}
.inv-audit-sub.muted {
  color: #94a3b8;
  font-weight: 500;
}

/* Acciones Centradas */
.inv-actions-center {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

/* Boton de Detalles (Espacioso, no aplastado) */
.inv-btn-detail-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.08);
}
.inv-btn-detail-sm:hover {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1e40af;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.18);
}

/* Boton de Rectificar */
.inv-btn-rectify {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #f8fafc;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 0.5rem 0.9rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.inv-btn-rectify:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}
.inv-btn-rectify:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Celda procesada limpia */
.inv-audit-processed-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}
.inv-audit-summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
}
.inv-audit-summary-pill.approved {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}
.inv-audit-summary-pill.rejected {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.inv-icon-xxs {
  width: 12px;
  height: 12px;
}

/* Modal de Detalles Ampliado */
.inv-modal-details-container {
  max-width: 720px;
  width: 95%;
}
.inv-modal-edit-container {
  max-width: 680px;
  width: 95%;
}
.inv-icon-details {
  background: #eff6ff;
  color: #2563eb;
}
.inv-icon-edit {
  background: #fef3c7;
  color: #d97706;
}

.inv-details-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-height: 75vh;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.inv-detail-status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}
.inv-detail-status-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.inv-detail-status-caption {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}
.inv-detail-chip {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
}

.inv-detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.inv-detail-section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 0.35rem;
  margin: 0;
}

/* Timeline de Personal */
.inv-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
  padding-left: 0.5rem;
}
.inv-timeline-item {
  display: flex;
  gap: 0.75rem;
  position: relative;
}
.inv-timeline-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.inv-timeline-marker.reg {
  background: #e0f2fe;
  color: #0369a1;
}
.inv-timeline-marker.edit {
  background: #fef3c7;
  color: #b45309;
}
.inv-timeline-marker.approved {
  background: #dcfce7;
  color: #15803d;
}
.inv-timeline-marker.rejected {
  background: #fee2e2;
  color: #b91c1c;
}
.inv-timeline-marker.wait {
  background: #f1f5f9;
  color: #64748b;
}

.inv-timeline-content {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.6rem 0.85rem;
}
.inv-timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}
.inv-timeline-action {
  font-size: 0.74rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.inv-timeline-time {
  font-size: 0.72rem;
  color: #94a3b8;
}
.inv-timeline-person {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #0f172a;
}
.inv-timeline-role-tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}
.inv-timeline-role-tag.cajero {
  background: #e0f2fe;
  color: #0369a1;
}
.inv-timeline-role-tag.supervisor {
  background: #fef3c7;
  color: #92400e;
}
.inv-timeline-desc {
  font-size: 0.76rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
  line-height: 1.35;
}

/* Caja de Observaciones */
.inv-detail-obs-card {
  border-radius: 8px;
  padding: 0.75rem 1rem;
  border-left: 4px solid #cbd5e1;
}
.inv-detail-obs-card.obs-approved {
  background: #f0fdf4;
  border-color: #22c55e;
}
.inv-detail-obs-card.obs-rejected {
  background: #fef2f2;
  border-color: #ef4444;
}
.inv-detail-obs-card.obs-pending {
  background: #fffbeb;
  border-color: #f59e0b;
}
.inv-obs-header {
  font-size: 0.78rem;
  color: #475569;
  margin-bottom: 0.25rem;
}
.inv-obs-text {
  font-size: 0.88rem;
  color: #0f172a;
  margin: 0;
  line-height: 1.45;
}

/* Grid de Ficha Tecnica */
.inv-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.inv-detail-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.inv-detail-card-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.15rem;
}
.inv-detail-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.82rem;
}
.inv-venc-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}
.inv-venc-tag.venc-ok {
  background: #f0fdf4;
  color: #15803d;
}
.inv-venc-tag.venc-warn {
  background: #fef3c7;
  color: #b45309;
}
.inv-venc-tag.venc-danger {
  background: #fee2e2;
  color: #b91c1c;
}
</style>

