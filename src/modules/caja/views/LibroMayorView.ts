import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  cajaService,
  type ReporteListadoDTO,
  type ReporteDetalleDTO,
  type FiltrosReportes,
} from '../services/cajaService'
import { sucursalService, type SucursalDTO } from '@/modules/configuracion/services/sucursalService'

export function useLibroMayor() {
  const authStore = useAuthStore()

  const cargando = ref(false)
  const cargandoDetalle = ref(false)
  const error = ref<string | null>(null)

  const reportes = ref<ReporteListadoDTO[]>([])
  const sucursales = ref<SucursalDTO[]>([])

  // Filtros
  const filtroSucursal = ref<number | ''>('')
  const filtroPeriodo = ref<string>('')
  const filtroFechaDesde = ref<string>('')
  const filtroFechaHasta = ref<string>('')

  // Modal de detalle
  const modalDetalleVisible = ref(false)
  const reporteDetalle = ref<ReporteDetalleDTO | null>(null)

  async function cargarSucursales() {
    if (authStore.isPropietario) {
      try {
        sucursales.value = await sucursalService.listar(false)
      } catch (err) {
        console.warn('No se pudieron cargar sucursales:', err)
      }
    }
  }

  async function cargarReportes() {
    cargando.value = true
    error.value = null
    try {
      const filtros: FiltrosReportes = {
        sucursalId: filtroSucursal.value !== '' ? Number(filtroSucursal.value) : undefined,
        periodo: filtroPeriodo.value || undefined,
        fechaDesde: filtroFechaDesde.value || undefined,
        fechaHasta: filtroFechaHasta.value || undefined,
      }
      reportes.value = await cajaService.listarReportes(filtros)
    } catch (err: any) {
      error.value = err.userMessage || 'Error al cargar reportes del Libro Mayor.'
    } finally {
      cargando.value = false
    }
  }

  function limpiarFiltros() {
    filtroSucursal.value = ''
    filtroPeriodo.value = ''
    filtroFechaDesde.value = ''
    filtroFechaHasta.value = ''
    cargarReportes()
  }

  async function verDetalle(reporteId: number) {
    modalDetalleVisible.value = true
    cargandoDetalle.value = true
    reporteDetalle.value = null
    try {
      reporteDetalle.value = await cajaService.obtenerDetalleReporte(reporteId)
    } catch (err: any) {
      error.value = err.userMessage || 'No se pudo cargar el detalle del reporte.'
    } finally {
      cargandoDetalle.value = false
    }
  }

  function formatearFecha(fechaStr?: string | null): string {
    if (!fechaStr) return '-'
    const d = new Date(fechaStr)
    return d.toLocaleString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatearMonto(val?: number | null): string {
    const num = Number(val) || 0
    return `Bs. ${num.toFixed(2)}`
  }

  onMounted(() => {
    cargarSucursales()
    cargarReportes()
  })

  return {
    authStore,
    cargando,
    cargandoDetalle,
    error,
    reportes,
    sucursales,
    filtroSucursal,
    filtroPeriodo,
    filtroFechaDesde,
    filtroFechaHasta,
    modalDetalleVisible,
    reporteDetalle,
    cargarReportes,
    limpiarFiltros,
    verDetalle,
    formatearFecha,
    formatearMonto,
  }
}
