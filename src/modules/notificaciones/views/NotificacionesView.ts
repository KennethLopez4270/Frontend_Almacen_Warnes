import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificacionesStore } from '@/stores/notificaciones'
import { useAuthStore } from '@/stores/auth'
import { sucursalService, type SucursalDTO } from '@/modules/configuracion/services/sucursalService'
import type { NotificacionItemDTO } from '@/services/notificacionesService'
import { normalizarDireccion, obtenerSeccionNotificacion } from '@/config/api'

export function useNotificacionesView() {
  const router = useRouter()
  const notificacionesStore = useNotificacionesStore()
  const authStore = useAuthStore()

  // Lista de sucursales para el filtro (en caso de Propietario o multi-sucursal)
  const listaSucursales = ref<SucursalDTO[]>([])
  const cargandoSucursales = ref(false)

  // Filtros reactivos
  const searchQuery = ref('')
  const filtroSeccion = ref<string>('TODAS')
  const filtroTipoNotificacion = ref<number | ''>('')
  const filtroEstadoLectura = ref<'TODAS' | 'NO_LEIDAS' | 'LEIDAS'>('TODAS')
  const filtroSeveridad = ref<string>('TODAS')
  const filtroSucursal = ref<string>('TODAS')

  // Estado de operaciones
  const resolviendoId = ref<number | null>(null)
  const marcandoTodas = ref(false)
  const idProcesandoLectura = ref<string | number | null>(null)

  // Cargar sucursales
  async function cargarSucursales() {
    if (!authStore.isPropietario) return
    cargandoSucursales.value = true
    try {
      listaSucursales.value = await sucursalService.listar()
    } catch {
      listaSucursales.value = []
    } finally {
      cargandoSucursales.value = false
    }
  }

  onMounted(() => {
    if (authStore.isAuthenticated) {
      notificacionesStore.cargarNotificaciones(true)
      cargarSucursales()
      notificacionesStore.iniciarPolling(15000)
    }
  })

  onUnmounted(() => {
    notificacionesStore.detenerPolling()
  })

  // Refrescar si cambia la sucursal activa en el header
  watch(
    () => [authStore.sucursalId, authStore.usuarioId],
    () => {
      if (authStore.isAuthenticated) {
        notificacionesStore.cargarNotificaciones(true)
      }
    }
  )

  const listaCompleta = computed<NotificacionItemDTO[]>(() => {
    return notificacionesStore.notificaciones || []
  })

  // Metricas KPI
  const kpiTotal = computed(() => {
    return typeof notificacionesStore.totalGeneral === 'number'
      ? notificacionesStore.totalGeneral
      : listaCompleta.value.length
  })

  const kpiNoLeidas = computed(() => {
    return typeof notificacionesStore.totalNoLeidas === 'number'
      ? notificacionesStore.totalNoLeidas
      : listaCompleta.value.filter((n) => !n.leido).length
  })

  const kpiCriticasAltas = computed(() => {
    return listaCompleta.value.filter(
      (n) => n.severidad === 'CRITICA' || n.severidad === 'ALTA'
    ).length
  })

  const kpiLeidas = computed(() => {
    return listaCompleta.value.filter((n) => n.leido).length
  })

  // Lista filtrada
  const notificacionesFiltradas = computed<NotificacionItemDTO[]>(() => {
    let result = listaCompleta.value

    // 1. Busqueda por texto
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      result = result.filter(
        (n) =>
          (n.titulo && n.titulo.toLowerCase().includes(q)) ||
          (n.mensaje && n.mensaje.toLowerCase().includes(q)) ||
          (n.codigoSucursal && n.codigoSucursal.toLowerCase().includes(q)) ||
          (n.direccion ? n.direccion.toLowerCase().includes(q) : false) ||
          (n.rutaAccion && n.rutaAccion.toLowerCase().includes(q))
      )
    }

    // 2. Filtro por Seccion funcional
    if (filtroSeccion.value !== 'TODAS') {
      result = result.filter((n) => {
        const sec = obtenerSeccionNotificacion(n.tipoNotificacion, n.tipoAlerta)
        return sec.id === filtroSeccion.value
      })
    }

    // 3. Filtro por Tipo de Notificacion (Grupo 10)
    if (filtroTipoNotificacion.value !== '') {
      result = result.filter((n) => n.tipoNotificacion === filtroTipoNotificacion.value)
    }

    // 4. Filtro por Estado de Lectura
    if (filtroEstadoLectura.value === 'NO_LEIDAS') {
      result = result.filter((n) => !n.leido)
    } else if (filtroEstadoLectura.value === 'LEIDAS') {
      result = result.filter((n) => n.leido)
    }

    // 5. Filtro por Severidad
    if (filtroSeveridad.value !== 'TODAS') {
      result = result.filter((n) => n.severidad === filtroSeveridad.value)
    }

    // 6. Filtro por Sucursal
    if (filtroSucursal.value !== 'TODAS') {
      result = result.filter((n) => {
        if (filtroSucursal.value === 'GLOBAL') {
          return !n.codigoSucursal || n.codigoSucursal === 'GLOBAL'
        }
        return n.codigoSucursal === filtroSucursal.value
      })
    }

    return result
  })

  // Acciones
  async function recargar() {
    await notificacionesStore.cargarNotificaciones(true)
  }

  async function marcarLeida(idNotificacion: string | number) {
    idProcesandoLectura.value = idNotificacion
    try {
      await notificacionesStore.marcarLeido(idNotificacion)
    } finally {
      idProcesandoLectura.value = null
    }
  }

  async function marcarTodasLeidas() {
    marcandoTodas.value = true
    try {
      await notificacionesStore.marcarTodasLeidas()
    } finally {
      marcandoTodas.value = false
    }
  }

  async function navegarAlerta(item: NotificacionItemDTO) {
    if (!item.leido) {
      await notificacionesStore.marcarLeido(item.idNotificacion)
    }
    const ruta = normalizarDireccion(item.direccion || item.rutaAccion, item.tipoNotificacion)
    router.push(ruta)
  }

  async function resolverDashboard(supervisorId: number | null, autorizar: boolean) {
    if (!supervisorId) return
    resolviendoId.value = supervisorId
    try {
      await notificacionesStore.resolverDashboard(supervisorId, autorizar)
    } finally {
      resolviendoId.value = null
    }
  }

  function formatearFecha(fechaStr: string | null): string {
    if (!fechaStr) return '-'
    const f = new Date(fechaStr)
    return f.toLocaleString('es-BO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  function formatearTiempoRelativo(fechaStr: string | null): string {
    if (!fechaStr) return 'Reciente'
    const ahora = new Date()
    const fecha = new Date(fechaStr)
    const diffMs = ahora.getTime() - fecha.getTime()
    const diffSeg = Math.floor(diffMs / 1000)

    if (diffSeg < 60) return 'Hace unos segundos'
    const diffMin = Math.floor(diffSeg / 60)
    if (diffMin < 60) return `Hace ${diffMin} min`
    const diffHoras = Math.floor(diffMin / 60)
    if (diffHoras < 24) return `Hace ${diffHoras} h`
    const diffDias = Math.floor(diffHoras / 24)
    return `Hace ${diffDias} d`
  }

  function limpiarFiltros() {
    searchQuery.value = ''
    filtroSeccion.value = 'TODAS'
    filtroTipoNotificacion.value = ''
    filtroEstadoLectura.value = 'TODAS'
    filtroSeveridad.value = 'TODAS'
    filtroSucursal.value = 'TODAS'
  }

  return {
    authStore,
    notificacionesStore,
    listaSucursales,
    cargandoSucursales,
    searchQuery,
    filtroSeccion,
    filtroTipoNotificacion,
    filtroEstadoLectura,
    filtroSeveridad,
    filtroSucursal,
    resolviendoId,
    marcandoTodas,
    idProcesandoLectura,
    listaCompleta,
    kpiTotal,
    kpiNoLeidas,
    kpiCriticasAltas,
    kpiLeidas,
    notificacionesFiltradas,
    recargar,
    marcarLeida,
    marcarTodasLeidas,
    navegarAlerta,
    resolverDashboard,
    formatearFecha,
    formatearTiempoRelativo,
    limpiarFiltros,
    normalizarDireccion,
    obtenerSeccionNotificacion,
  }
}
