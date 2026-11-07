import { ref, computed } from 'vue'
import { useUsuarioActivo } from '@/composables/useUsuarioActivo'
import {
  proveedorService,
  type ProveedorKpi,
  type ProveedorListado,
  type ProveedorCatalogoProducto,
  type ProveedorHistorialLote,
  type CrearProveedorRequest,
  type ActualizarProveedorRequest,
} from '../services/proveedorService'
import { inventarioService, type SucursalDTO } from '@/modules/inventario/services/inventarioService'

export const { usuarioActivoId, rolActivo, sucursalActivaId, cargarUsuarios } = useUsuarioActivo()

// ====================================================================
// 1. ESTADO REACTIVO PRINCIPAL Y RBAC DE SUCURSAL
// ====================================================================

export const cargando = ref(false)
export const kpis = ref<ProveedorKpi>({
  totalProveedoresActivos: 0,
  proveedoresAlertasVencimiento: 0,
  totalProductosAbastecidos: 0,
  totalLotesActivos: 0,
  valorTotalInventario: 0,
})

export const listaProveedores = ref<ProveedorListado[]>([])
export const filtroBusqueda = ref('')
export const filtroProducto = ref('')
export const filtroEstado = ref<'ACTIVOS' | 'INACTIVOS' | 'TODOS'>('ACTIVOS')

export const listaSucursales = ref<SucursalDTO[]>([])
export const sucursalSeleccionadaId = ref<number | null>(null)

export const sucursalActivaNombre = computed(() => {
  const targetId = sucursalSeleccionadaId.value || sucursalActivaId.value || 1
  const suc = listaSucursales.value.find(s => (s.sucursalId || s.sucursal_id) === targetId)
  if (!suc) {
    return listaSucursales.value.length === 0 ? 'Cargando...' : `Sucursal #${targetId}`
  }
  const codigo = suc.codigoInterno || suc.codigo_interno || suc.codigo || `SUC-00${targetId}`
  const nombre = suc.ciudad || suc.nombre || suc.direccion || 'Sucursal'
  return `${codigo} - ${nombre}`
})

export const puedeGestionarProveedores = computed(() => {
  return rolActivo.value !== 1 // Cajero solo consulta lectura
})

// ====================================================================
// 2. GESTIÓN DE NOTIFICACIONES TOAST
// ====================================================================

export interface ToastItem {
  id: number
  titulo: string
  mensaje: string
  tipo: 'success' | 'danger' | 'warning' | 'info'
}

export const toasts = ref<ToastItem[]>([])
export let toastSeq = 0

export function agregarToast(titulo: string, mensaje: string, tipo: 'success' | 'danger' | 'warning' | 'info' = 'info') {
  const id = ++toastSeq
  toasts.value.push({ id, titulo, mensaje, tipo })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4500)
}

export function removerToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function extraerError(err: any): string {
  if (err?.userMessage) return err.userMessage
  if (err?.response?.data?.mensaje) return err.response.data.mensaje
  if (err?.response?.data?.message) return err.response.data.message
  if (typeof err?.response?.data === 'string' && err.response.data.trim()) return err.response.data
  return err?.message || 'Error al comunicarse con el servidor'
}

// ====================================================================
// 3. CARGA DE DATOS DESDE EL BACKEND
// ====================================================================

export async function cargarKpis() {
  try {
    const sucId = rolActivo.value !== 3 ? (sucursalActivaId.value || 1) : sucursalSeleccionadaId.value
    kpis.value = await proveedorService.obtenerKpis(sucId)
  } catch (err: any) {
    console.error('Error cargando KPIs:', err)
  }
}

export async function cargarProveedores() {
  cargando.value = true
  try {
    if (rolActivo.value !== 3) {
      sucursalSeleccionadaId.value = sucursalActivaId.value || 1
    }
    listaProveedores.value = await proveedorService.listarProveedores(
      filtroBusqueda.value,
      filtroProducto.value,
      filtroEstado.value,
      sucursalSeleccionadaId.value
    )
  } catch (err: any) {
    agregarToast('Error al cargar proveedores', extraerError(err), 'danger')
  } finally {
    cargando.value = false
  }
}

export async function cambiarSucursal() {
  await Promise.all([cargarKpis(), cargarProveedores()])
}

export async function aplicarFiltros() {
  await cargarProveedores()
}

export function limpiarFiltros() {
  filtroBusqueda.value = ''
  filtroProducto.value = ''
  filtroEstado.value = 'ACTIVOS'
  cargarProveedores()
}

// ====================================================================
// 4. MODAL ABM (CREAR / EDITAR)
// ====================================================================

export const modalAbmVisible = ref(false)
export const modoEdicion = ref(false)
export const guardando = ref(false)
export const proveedorIdEdicion = ref<number | null>(null)

export const formProveedor = ref({
  nombreEmpresa: '',
  nombreContacto: '',
  numeroContacto: '',
  anotaciones: '',
  sucursalId: null as number | null,
})

export function abrirModalCrear() {
  modoEdicion.value = false
  proveedorIdEdicion.value = null
  const sucPorDefecto = rolActivo.value !== 3
    ? (sucursalActivaId.value || 1)
    : (sucursalSeleccionadaId.value || listaSucursales.value[0]?.sucursalId || (listaSucursales.value[0] as any)?.sucursal_id || 1)
  formProveedor.value = {
    nombreEmpresa: '',
    nombreContacto: '',
    numeroContacto: '',
    anotaciones: '',
    sucursalId: sucPorDefecto,
  }
  modalAbmVisible.value = true
}

export function abrirModalEditar(p: ProveedorListado) {
  modoEdicion.value = true
  proveedorIdEdicion.value = p.proveedorId
  formProveedor.value = {
    nombreEmpresa: p.nombreEmpresa,
    nombreContacto: p.nombreContacto,
    numeroContacto: p.numeroContacto,
    anotaciones: p.anotaciones || '',
    sucursalId: p.sucursalId || (p as any).sucursal_id || (sucursalActivaId.value || 1),
  }
  modalAbmVisible.value = true
}

export function cerrarModalAbm() {
  modalAbmVisible.value = false
  guardando.value = false
}

export async function guardarProveedor() {
  if (!formProveedor.value.nombreEmpresa.trim()) {
    agregarToast('Validación', 'El nombre de la empresa es obligatorio.', 'warning')
    return
  }
  if (!formProveedor.value.nombreContacto.trim()) {
    agregarToast('Validación', 'El nombre del contacto logístico es obligatorio.', 'warning')
    return
  }
  if (!formProveedor.value.numeroContacto.trim()) {
    agregarToast('Validación', 'El número de contacto es obligatorio.', 'warning')
    return
  }
  if (!formProveedor.value.sucursalId) {
    agregarToast('Validación', 'Debe especificar la sucursal del distribuidor.', 'warning')
    return
  }

  guardando.value = true
  try {
    if (modoEdicion.value && proveedorIdEdicion.value) {
      const payload: ActualizarProveedorRequest = {
        nombreEmpresa: formProveedor.value.nombreEmpresa.trim(),
        nombreContacto: formProveedor.value.nombreContacto.trim(),
        numeroContacto: formProveedor.value.numeroContacto.trim(),
        anotaciones: formProveedor.value.anotaciones.trim(),
        usuarioModificacion: usuarioActivoId.value,
        sucursalId: formProveedor.value.sucursalId,
      }
      const res = await proveedorService.actualizarProveedor(proveedorIdEdicion.value, payload)
      agregarToast('Éxito', res.mensaje || 'Distribuidor actualizado correctamente.', 'success')
    } else {
      const payload: CrearProveedorRequest = {
        nombreEmpresa: formProveedor.value.nombreEmpresa.trim(),
        nombreContacto: formProveedor.value.nombreContacto.trim(),
        numeroContacto: formProveedor.value.numeroContacto.trim(),
        anotaciones: formProveedor.value.anotaciones.trim(),
        usuarioCreacion: usuarioActivoId.value,
        sucursalId: formProveedor.value.sucursalId,
      }
      const res = await proveedorService.registrarProveedor(payload)
      agregarToast('Éxito', res.mensaje || 'Distribuidor registrado correctamente.', 'success')
    }

    cerrarModalAbm()
    await Promise.all([cargarKpis(), cargarProveedores()])
  } catch (err: any) {
    agregarToast('Error al procesar solicitud', extraerError(err), 'danger')
  } finally {
    guardando.value = false
  }
}

// ====================================================================
// 5. MODAL DE CONFIRMACIÓN DE BAJA LÓGICA
// ====================================================================

export const modalBajaVisible = ref(false)
export const proveedorParaBaja = ref<ProveedorListado | null>(null)
export const eliminando = ref(false)

export function confirmarBaja(p: ProveedorListado) {
  proveedorParaBaja.value = p
  modalBajaVisible.value = true
}

export function cerrarModalBaja() {
  modalBajaVisible.value = false
  proveedorParaBaja.value = null
  eliminando.value = false
}

export async function ejecutarBaja() {
  if (!proveedorParaBaja.value) return
  eliminando.value = true
  try {
    const res = await proveedorService.eliminarProveedor(proveedorParaBaja.value.proveedorId)
    agregarToast('Baja Exitosa', res.mensaje || 'Distribuidor dado de baja en el sistema.', 'success')
    cerrarModalBaja()
    await Promise.all([cargarKpis(), cargarProveedores()])
  } catch (err: any) {
    agregarToast('Error al dar de baja', extraerError(err), 'danger')
  } finally {
    eliminando.value = false
  }
}

// Modal de confirmación de reactivación
export const modalReactivarVisible = ref(false)
export const proveedorParaReactivar = ref<ProveedorListado | null>(null)
export const reactivando = ref(false)

export function abrirModalReactivar(p: ProveedorListado) {
  proveedorParaReactivar.value = p
  modalReactivarVisible.value = true
}

export function cerrarModalReactivar() {
  modalReactivarVisible.value = false
  proveedorParaReactivar.value = null
  reactivando.value = false
}

export async function ejecutarReactivacion() {
  if (!proveedorParaReactivar.value) return
  reactivando.value = true
  try {
    const res = await proveedorService.reactivarProveedor(proveedorParaReactivar.value.proveedorId, usuarioActivoId.value)
    agregarToast('Distribuidor Reactivado', res.mensaje || `"${proveedorParaReactivar.value.nombreEmpresa}" ha sido reactivado exitosamente.`, 'success')
    cerrarModalReactivar()
    await Promise.all([cargarKpis(), cargarProveedores()])
  } catch (err: any) {
    agregarToast('Error al reactivar distribuidor', extraerError(err), 'danger')
  } finally {
    reactivando.value = false
  }
}

// ====================================================================
// 6. MODAL / AUDITORÍA: FICHA LOGÍSTICA DEL PROVEEDOR
// ====================================================================

export const modalFichaVisible = ref(false)
export const proveedorSeleccionado = ref<ProveedorListado | null>(null)
export const pestanaActivaFicha = ref<'catalogo' | 'lotes'>('catalogo')
export const cargandoDetalles = ref(false)

export const catalogoProductos = ref<ProveedorCatalogoProducto[]>([])
export const historialLotes = ref<ProveedorHistorialLote[]>([])
export const filtroLotesEstado = ref<string>('todos')

export async function abrirFichaLogistica(p: ProveedorListado) {
  proveedorSeleccionado.value = p
  pestanaActivaFicha.value = 'catalogo'
  filtroLotesEstado.value = 'todos'
  modalFichaVisible.value = true
  await recargarDetallesFicha()
}

export async function recargarDetallesFicha() {
  if (!proveedorSeleccionado.value) return
  cargandoDetalles.value = true
  try {
    const provId = proveedorSeleccionado.value.proveedorId
    const [prods, lots] = await Promise.all([
      proveedorService.listarCatalogoProductos(provId),
      proveedorService.listarHistorialLotes(provId, filtroLotesEstado.value),
    ])
    catalogoProductos.value = prods
    historialLotes.value = lots
  } catch (err: any) {
    agregarToast('Error al cargar ficha logística', extraerError(err), 'danger')
  } finally {
    cargandoDetalles.value = false
  }
}

export async function cambiarFiltroLotes(nuevoFiltro: string) {
  filtroLotesEstado.value = nuevoFiltro
  if (!proveedorSeleccionado.value) return
  try {
    historialLotes.value = await proveedorService.listarHistorialLotes(
      proveedorSeleccionado.value.proveedorId,
      nuevoFiltro
    )
  } catch (err: any) {
    agregarToast('Error al filtrar lotes', extraerError(err), 'danger')
  }
}

export function formatMontoBs(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || isNaN(monto)) return 'Bs 0.00'
  return `Bs ${Number(monto).toFixed(2)}`
}

export function formatFecha(fechaStr: string | null | undefined): string {
  if (!fechaStr) return 'N/A'
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return fechaStr
  }
}

export function getBadgeCaducidad(estado: string, dias: number | null) {
  switch (estado) {
    case 'VENCIDO':
      return {
        bg: '#FEE2E2',
        text: '#991B1B',
        border: '#F87171',
        label: dias !== null ? `Vencido hace ${Math.abs(dias)}d` : 'Vencido',
      }
    case 'CRITICO':
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FBBF24',
        label: dias !== null ? `Crítico: ${dias}d restantes` : 'Crítico',
      }
    case 'PROXIMO':
      return {
        bg: '#FEF9C3',
        text: '#854D0E',
        border: '#FACC15',
        label: dias !== null ? `Vence en ${dias}d` : 'Próximo',
      }
    case 'VIGENTE':
      return {
        bg: '#ECFDF5',
        text: '#065F46',
        border: '#34D399',
        label: dias !== null ? `Vigente (${dias}d)` : 'Vigente',
      }
    case 'NO_PERECEDERO':
    default:
      return {
        bg: '#F1F5F9',
        text: '#475569',
        border: '#CBD5E1',
        label: 'No perecedero',
      }
  }
}

export async function inicializarProveedores() {
  await cargarUsuarios()
  try {
    const sucs = await inventarioService.listarSucursales()
    listaSucursales.value = sucs || []
  } catch (e) {
    console.error('Error cargando sucursales en Proveedores:', e)
  }
  if (rolActivo.value !== 3) {
    sucursalSeleccionadaId.value = sucursalActivaId.value || 1
  }
  await Promise.all([cargarKpis(), cargarProveedores()])
}