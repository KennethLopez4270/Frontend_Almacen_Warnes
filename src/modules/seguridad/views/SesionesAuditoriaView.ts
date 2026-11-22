import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  cajaService,
  type SesionListadoDTO,
  type FiltrosSesiones,
  type ReporteDetalleDTO,
} from '@/modules/caja/services/cajaService'
import { sucursalService, type SucursalDTO } from '@/modules/configuracion/services/sucursalService'

export function useSesionesAuditoria() {
  const router = useRouter()
  const authStore = useAuthStore()

  const cargando = ref(false)
  const cargandoDetalle = ref(false)
  const error = ref<string | null>(null)

  const sesiones = ref<SesionListadoDTO[]>([])
  const sucursales = ref<SucursalDTO[]>([])

  // Filtros
  const filtroSucursal = ref<number | ''>('')
  const filtroSoloActivas = ref<string>('')
  const filtroFechaDesde = ref<string>('')
  const filtroFechaHasta = ref<string>('')
  const filtroTexto = ref<string>('')

  // Modal para ver reporte vinculado
  const modalReporteVisible = ref(false)
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

  async function cargarSesiones() {
    cargando.value = true
    error.value = null
    try {
      const filtros: FiltrosSesiones = {
        sucursalId: filtroSucursal.value !== '' ? Number(filtroSucursal.value) : undefined,
        soloActivas:
          filtroSoloActivas.value === 'true'
            ? true
            : filtroSoloActivas.value === 'false'
              ? false
              : undefined,
        fechaDesde: filtroFechaDesde.value || undefined,
        fechaHasta: filtroFechaHasta.value || undefined,
        textoBusqueda: filtroTexto.value.trim() || undefined,
      }
      sesiones.value = await cajaService.listarSesiones(filtros)
    } catch (err: any) {
      error.value = err.userMessage || 'Error al cargar auditoría de sesiones.'
    } finally {
      cargando.value = false
    }
  }

  function limpiarFiltros() {
    filtroSucursal.value = ''
    filtroSoloActivas.value = ''
    filtroFechaDesde.value = ''
    filtroFechaHasta.value = ''
    filtroTexto.value = ''
    cargarSesiones()
  }

  async function verReporte(reporteId: number) {
    modalReporteVisible.value = true
    cargandoDetalle.value = true
    reporteDetalle.value = null
    try {
      reporteDetalle.value = await cajaService.obtenerDetalleReporte(reporteId)
    } catch (err: any) {
      error.value = err.userMessage || 'No se pudo cargar el reporte de arqueo.'
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

  function formatearDuracion(minutos?: number | null): string {
    if (minutos === null || minutos === undefined) return '-'
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    if (h === 0) return `${m} min`
    return `${h}h ${m}m`
  }

  function formatearMonto(val?: number | null): string {
    const num = Number(val) || 0
    return `Bs. ${num.toFixed(2)}`
  }

  onMounted(() => {
    cargarSucursales()
    cargarSesiones()
  })

  return {
    authStore,
    cargando,
    cargandoDetalle,
    error,
    sesiones,
    sucursales,
    filtroSucursal,
    filtroSoloActivas,
    filtroFechaDesde,
    filtroFechaHasta,
    filtroTexto,
    modalReporteVisible,
    reporteDetalle,
    cargarSesiones,
    limpiarFiltros,
    verReporte,
    formatearFecha,
    formatearDuracion,
    formatearMonto,
  }
}
