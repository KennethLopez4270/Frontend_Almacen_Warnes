import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  notificacionesService,
  type NotificacionItemDTO,
  type NotificacionResponseDTO,
  type CrearNotificacionRequestDTO,
  type VerificacionStockVentaDTO,
  type DashboardPermisoDTO,
  type ResolverDashboardRequestDTO,
} from '@/services/notificacionesService'
import { useAuthStore } from '@/stores/auth'

export interface AlertaEmergente {
  id: string
  titulo: string
  mensaje: string
  severidad: string
  tipoAlerta: string
  rutaAccion?: string
  fecha: Date
}

export const useNotificacionesStore = defineStore('notificaciones', () => {
  const authStore = useAuthStore()

  // State
  const notificaciones = ref<NotificacionItemDTO[]>([])
  const totalCriticas = ref<number>(0)
  const totalAltas = ref<number>(0)
  const totalAdvertencias = ref<number>(0)
  const totalInformativas = ref<number>(0)
  const totalGeneral = ref<number>(0)

  const cargando = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Alerta emergente (banner/toast) para eventos de alta severidad no vistos antes
  const alertaEmergente = ref<AlertaEmergente | null>(null)
  let alertaTimer: any = null

  // Estado del Dashboard para Supervisor
  const dashboardPermiso = ref<DashboardPermisoDTO | null>(null)
  const cargandoDashboard = ref<boolean>(false)

  // Polling automático
  let pollingInterval: any = null
  const idsNotificacionesPrevias = ref<Set<string>>(new Set())

  // Getters de lectura y estado
  const notificacionesNoLeidas = computed(() =>
    notificaciones.value.filter((n) => !n.leido)
  )

  const totalNoLeidas = computed(() => notificacionesNoLeidas.value.length)

  const tieneAlertas = computed(() => totalGeneral.value > 0)
  const tieneNoLeidas = computed(() => totalNoLeidas.value > 0)
  const tieneCriticas = computed(() => totalCriticas.value > 0)
  const tieneAltas = computed(() => totalAltas.value > 0)

  const tieneCriticasNoLeidas = computed(() =>
    notificaciones.value.some((n) => !n.leido && n.severidad === 'CRITICA')
  )

  // Filtros por Tipos de Notificación (Grupo 10 de Conceptos o códigos string)
  const notificacionesStock = computed(() =>
    notificaciones.value.filter(
      (n) =>
        n.tipoNotificacion === 1 ||
        n.tipoNotificacion === 2 ||
        n.tipoAlerta === 'STOCK_AGOTADO' ||
        n.tipoAlerta === 'STOCK_BAJO'
    )
  )

  const notificacionesEspera = computed(() =>
    notificaciones.value.filter(
      (n) =>
        n.tipoNotificacion === 3 ||
        n.tipoNotificacion === 4 ||
        n.tipoAlerta === 'SALA_ESPERA' ||
        n.tipoAlerta === 'SALA_ESPERA_OBSERVADO'
    )
  )

  const notificacionesSeguridad = computed(() =>
    notificaciones.value.filter(
      (n) =>
        n.tipoNotificacion === 5 ||
        n.tipoNotificacion === 6 ||
        n.tipoNotificacion === 7 ||
        n.tipoNotificacion === 8 ||
        n.tipoAlerta === 'ACCESO_DASHBOARD' ||
        n.tipoAlerta === 'ACCESO_DASHBOARD_APROBADO' ||
        n.tipoAlerta === 'RECUPERACION_PASSWORD' ||
        n.tipoAlerta === 'USUARIO_BLOQUEADO'
    )
  )

  // Actions
  /**
   * Carga el listado consolidado de notificaciones desde el backend
   */
  async function cargarNotificaciones(silencioso = false): Promise<void> {
    if (!authStore.isAuthenticated) {
      detenerPolling()
      return
    }

    if (!silencioso) {
      cargando.value = true
    }
    error.value = null

    try {
      // Si el Propietario tiene filtro de sucursal seleccionada (> 0), se envía
      const sucId = authStore.isPropietario
        ? (authStore.sucursalId && authStore.sucursalId > 0 ? authStore.sucursalId : null)
        : authStore.sucursalId

      const res: NotificacionResponseDTO = await notificacionesService.listarNotificaciones(
        sucId,
        authStore.usuarioId
      )

      // Detectar nuevas alertas no leídas CRITICAS o ALTAS que no estaban en la consulta anterior
      const nuevasAlertas = res.notificaciones.filter(
        (n) =>
          !n.leido &&
          !idsNotificacionesPrevias.value.has(n.idNotificacion) &&
          (n.severidad === 'CRITICA' || n.severidad === 'ALTA')
      )

      if (nuevasAlertas.length > 0 && idsNotificacionesPrevias.value.size > 0) {
        // Disparar banner emergente no intrusivo con la primera alerta nueva
        const primera = nuevasAlertas[0]
        if (primera) {
          mostrarAlertaEmergente({
            id: primera.idNotificacion,
            titulo: primera.titulo,
            mensaje: primera.mensaje,
            severidad: primera.severidad,
            tipoAlerta: primera.tipoAlerta,
            rutaAccion: primera.rutaAccion,
            fecha: new Date(),
          })
        }
      }

      // Actualizar el set de IDs conocidos
      idsNotificacionesPrevias.value = new Set(res.notificaciones.map((n) => n.idNotificacion))

      // Actualizar estado reactivo
      notificaciones.value = res.notificaciones
      totalCriticas.value = res.totalCriticas
      totalAltas.value = res.totalAltas
      totalAdvertencias.value = res.totalAdvertencias
      totalInformativas.value = res.totalInformativas
      totalGeneral.value = res.totalGeneral
    } catch (err: any) {
      error.value = err.userMessage || 'No se pudieron sincronizar las notificaciones.'
    } finally {
      if (!silencioso) {
        cargando.value = false
      }
    }
  }

  /**
   * Marca una notificación individual como leída en backend y reactivamente en local
   */
  async function marcarLeido(idNotificacion: string | number): Promise<void> {
    try {
      await notificacionesService.marcarLeido(idNotificacion, authStore.usuarioId)
    } catch (e) {
      console.warn('Error al marcar leída en backend, actualizando localmente:', e)
    }

    const item = notificaciones.value.find((n) => String(n.idNotificacion) === String(idNotificacion))
    if (item) {
      item.leido = true
      item.fechaLeido = new Date().toISOString()
    }
  }

  /**
   * Marca todas las notificaciones pendientes como leídas
   */
  async function marcarTodasLeidas(): Promise<void> {
    try {
      await notificacionesService.marcarTodasLeidas(authStore.usuarioId)
    } catch (e) {
      console.warn('Error al marcar todas leídas en backend:', e)
    }

    const nowIso = new Date().toISOString()
    notificaciones.value.forEach((n) => {
      n.leido = true
      if (!n.fechaLeido) {
        n.fechaLeido = nowIso
      }
    })
  }

  /**
   * Registra una nueva notificación formal en la base de datos
   */
  async function crearNotificacion(payload: CrearNotificacionRequestDTO): Promise<any> {
    const res = await notificacionesService.crearNotificacion(payload, authStore.usuarioId)
    await cargarNotificaciones(true)
    return res
  }

  /**
   * Muestra un banner emergente en pantalla para alertas de alta severidad
   */
  function mostrarAlertaEmergente(alerta: AlertaEmergente): void {
    if (alertaTimer) {
      clearTimeout(alertaTimer)
    }
    alertaEmergente.value = alerta
    alertaTimer = setTimeout(() => {
      alertaEmergente.value = null
    }, 8000)
  }

  function cerrarAlertaEmergente(): void {
    if (alertaTimer) {
      clearTimeout(alertaTimer)
      alertaTimer = null
    }
    alertaEmergente.value = null
  }

  /**
   * Inicia el ciclo de polling inteligente (cada 20 segundos)
   */
  function iniciarPolling(intervaloMs = 20000): void {
    detenerPolling()
    if (!authStore.isAuthenticated) return

    // Carga inicial
    cargarNotificaciones(true)

    pollingInterval = setInterval(() => {
      if (authStore.isAuthenticated) {
        cargarNotificaciones(true)
      } else {
        detenerPolling()
      }
    }, intervaloMs)
  }

  /**
   * Detiene el polling
   */
  function detenerPolling(): void {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  /**
   * Valida disponibilidad de stock físico previo a una venta
   */
  async function verificarStockVenta(
    sucursalId: number,
    productoId: number,
    cantidad: number
  ): Promise<VerificacionStockVentaDTO> {
    return await notificacionesService.verificarStockVenta(
      sucursalId,
      productoId,
      cantidad,
      authStore.usuarioId
    )
  }

  /**
   * Permite al Supervisor solicitar acceso al Dashboard
   */
  async function solicitarAccesoDashboard(): Promise<DashboardPermisoDTO> {
    cargandoDashboard.value = true
    try {
      const res = await notificacionesService.solicitarAccesoDashboard(authStore.usuarioId)
      dashboardPermiso.value = res
      await cargarNotificaciones(true)
      return res
    } finally {
      cargandoDashboard.value = false
    }
  }

  /**
   * Permite al Propietario resolver la solicitud de un Supervisor
   */
  async function resolverAccesoDashboard(
    supervisorId: number,
    autorizar: boolean
  ): Promise<DashboardPermisoDTO> {
    const res = await notificacionesService.resolverAccesoDashboard(
      { supervisorId, autorizar },
      authStore.usuarioId
    )
    // Refrescar inmediatamente el listado de notificaciones para reflejar el cambio en la campana
    await cargarNotificaciones(true)
    return res
  }

  /**
   * Consulta el estado de permiso al Dashboard para un Supervisor
   */
  async function consultarEstadoDashboard(supervisorId?: number): Promise<DashboardPermisoDTO> {
    cargandoDashboard.value = true
    try {
      const targetId = supervisorId || authStore.usuarioId
      const res = await notificacionesService.consultarEstadoDashboard(targetId, authStore.usuarioId)
      dashboardPermiso.value = res
      return res
    } finally {
      cargandoDashboard.value = false
    }
  }

  return {
    // State
    notificaciones,
    totalCriticas,
    totalAltas,
    totalAdvertencias,
    totalInformativas,
    totalGeneral,
    cargando,
    error,
    alertaEmergente,
    dashboardPermiso,
    cargandoDashboard,

    // Getters
    notificacionesNoLeidas,
    totalNoLeidas,
    tieneAlertas,
    tieneNoLeidas,
    tieneCriticas,
    tieneAltas,
    tieneCriticasNoLeidas,
    notificacionesStock,
    notificacionesEspera,
    notificacionesSeguridad,

    // Actions
    cargarNotificaciones,
    marcarLeido,
    marcarTodasLeidas,
    crearNotificacion,
    iniciarPolling,
    detenerPolling,
    verificarStockVenta,
    solicitarAccesoDashboard,
    solicitarDashboard: solicitarAccesoDashboard,
    resolverAccesoDashboard,
    resolverDashboard: resolverAccesoDashboard,
    consultarEstadoDashboard,
    cerrarAlertaEmergente,
    mostrarAlertaEmergente,
  }
})
