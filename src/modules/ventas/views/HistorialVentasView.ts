import { ref, computed } from 'vue'
import { ventaService, type VentaResponse } from '../services/ventaService'
import { useAuthStore } from '@/stores/auth'

// ====================================================================
// AUTENTICACIÓN Y ESTADO GENERAL
// ====================================================================

export const authStore = useAuthStore()
export const cargando = ref(false)
export const ventas = ref<VentaResponse[]>([])

// ====================================================================
// FILTROS
// ====================================================================

// Por defecto fecha actual (YYYY-MM-DD)
const hoyStr: string = new Date().toISOString().split('T')[0] ?? ''
export const fechaFiltro = ref<string>(hoyStr)
export const metodoFiltro = ref<number | null>(null)
export const estadoFiltro = ref<number | null>(null)
export const searchQuery = ref('')

// ====================================================================
// MODALES
// ====================================================================

// Modal Detalle / Recibo
export const modalDetalleVisible = ref(false)
export const ventaSeleccionada = ref<VentaResponse | null>(null)

// Modal Anular
export const modalAnularVisible = ref(false)
export const ventaAAnular = ref<VentaResponse | null>(null)
export const cargandoAnular = ref(false)

// ====================================================================
// TOASTS DE NOTIFICACIÓN
// ====================================================================

export interface ToastInfo {
  id: number
  tipo: 'success' | 'error' | 'info'
  mensaje: string
  titulo?: string
}

export const toasts = ref<ToastInfo[]>([])
let toastSeq = 0

export function agregarToast(tipo: 'success' | 'error' | 'info', mensaje: string, titulo?: string) {
  const id = ++toastSeq
  const tituloFinal =
    titulo || (tipo === 'success' ? 'Operación Exitosa' : tipo === 'error' ? 'Error' : 'Información')
  toasts.value.push({ id, tipo, mensaje, titulo: tituloFinal })
  setTimeout(() => cerrarToast(id), 4000)
}

export function cerrarToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

// ====================================================================
// CÓMPUTOS Y MÉTRICAS (KPIS)
// ====================================================================

export const ventasFiltradas = computed(() => {
  return ventas.value.filter((v) => {
    // Filtro por método de pago
    if (metodoFiltro.value !== null && v.metodoVenta !== metodoFiltro.value) {
      return false
    }
    // Filtro por estado
    if (estadoFiltro.value !== null && v.estado !== estadoFiltro.value) {
      return false
    }
    // Búsqueda de texto (ID venta o cajero)
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchId = String(v.ventaId).includes(q)
      const matchCajero = (v.cajeroNombre || '').toLowerCase().includes(q)
      if (!matchId && !matchCajero) return false
    }
    return true
  })
})

export const totalVentas = computed(() => ventasFiltradas.value.length)

export const totalRecaudado = computed(() => {
  return ventasFiltradas.value
    .filter((v) => v.estado !== 3) // Excluir anuladas del total recaudado
    .reduce((acc, v) => acc + (v.precioTotal || 0), 0)
})

export const totalFinalizadas = computed(() =>
  ventasFiltradas.value.filter((v) => v.estado === 2).length
)

export const totalAnuladas = computed(() =>
  ventasFiltradas.value.filter((v) => v.estado === 3).length
)

// ====================================================================
// ACCIONES DE CARGA Y SERVICIO
// ====================================================================

export async function cargarHistorial() {
  const sucursalId = authStore.sucursalId
  if (!sucursalId) {
    agregarToast('error', 'No se ha detectado sucursal activa.', 'Error')
    return
  }

  cargando.value = true
  try {
    const data = await ventaService.listarVentas(
      sucursalId,
      fechaFiltro.value || undefined,
      metodoFiltro.value ?? undefined,
      estadoFiltro.value ?? undefined
    )
    ventas.value = data
  } catch (err: any) {
    agregarToast('error', err.userMessage || 'Error al cargar el historial de ventas.', 'Error')
  } finally {
    cargando.value = false
  }
}

export function limpiarFiltros() {
  fechaFiltro.value = ''
  metodoFiltro.value = null
  estadoFiltro.value = null
  searchQuery.value = ''
  cargarHistorial()
}

// ====================================================================
// MODAL DETALLE Y REIMPRESIÓN
// ====================================================================

export function abrirModalDetalle(venta: VentaResponse) {
  ventaSeleccionada.value = venta
  modalDetalleVisible.value = true
}

export function cerrarModalDetalle() {
  modalDetalleVisible.value = false
  ventaSeleccionada.value = null
}

export function reimprimirRecibo(reciboHtml?: string) {
  const html = reciboHtml || ventaSeleccionada.value?.reciboHtml
  if (!html) {
    agregarToast('error', 'No se encontró el contenido del recibo.', 'Error de Impresión')
    return
  }

  let iframe = document.getElementById('iframe-impresion-recibo-historial') as HTMLIFrameElement
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = 'iframe-impresion-recibo-historial'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
  }

  const doc = iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(html)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }, 250)
}

// ====================================================================
// MODAL ANULACIÓN (SUPERVISOR / PROPIETARIO)
// ====================================================================

export function abrirModalAnular(venta: VentaResponse) {
  if (venta.estado === 3) {
    agregarToast('info', `La venta #${venta.ventaId} ya se encuentra anulada.`, 'Información')
    return
  }
  ventaAAnular.value = venta
  modalAnularVisible.value = true
}

export function cerrarModalAnular() {
  modalAnularVisible.value = false
  ventaAAnular.value = null
}

export async function confirmarAnulacion() {
  if (!ventaAAnular.value) return

  const usuarioId = authStore.usuarioId
  if (!usuarioId) {
    agregarToast('error', 'Usuario no autenticado para autorizar la anulación.', 'Error')
    return
  }

  cargandoAnular.value = true
  try {
    await ventaService.anularVenta(ventaAAnular.value.ventaId, usuarioId)
    agregarToast(
      'success',
      `Venta #${ventaAAnular.value.ventaId} anulada exitosamente. El stock fue revertido a los lotes.`,
      'Venta Anulada'
    )
    cerrarModalAnular()
    await cargarHistorial()
  } catch (err: any) {
    agregarToast('error', err.userMessage || 'No se pudo anular la venta.', 'Error de Anulación')
  } finally {
    cargandoAnular.value = false
  }
}

// ====================================================================
// FORMATEO
// ====================================================================

export function formatearMoneda(val?: number | null): string {
  if (val === undefined || val === null) return 'Bs. 0.00'
  return `Bs. ${Number(val).toFixed(2)}`
}

export function formatearFechaHora(fechaStr?: string): string {
  if (!fechaStr) return 'N/D'
  try {
    const d = new Date(fechaStr)
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fechaStr
  }
}
