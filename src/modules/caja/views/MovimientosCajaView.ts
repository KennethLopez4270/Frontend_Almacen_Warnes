import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  cajaService,
  type MovimientoDTO,
  type CrearMovimientoDTO,
  type ModificarMovimientoDTO,
  type FiltrosMovimientos,
} from '../services/cajaService'
import { sucursalService, type SucursalDTO } from '@/modules/configuracion/services/sucursalService'

export function useMovimientosCaja() {
  const authStore = useAuthStore()

  const cargando = ref(false)
  const guardando = ref(false)
  const error = ref<string | null>(null)
  const mensajeExito = ref<string | null>(null)

  const movimientos = ref<MovimientoDTO[]>([])
  const sucursales = ref<SucursalDTO[]>([])

  // Filtros reactivos
  const filtroTipo = ref<number | ''>('')
  const filtroSoloPendientes = ref<boolean>(false)
  const filtroSucursal = ref<number | ''>('')
  const filtroFechaDesde = ref<string>('')
  const filtroFechaHasta = ref<string>('')

  // Modales
  const modalCrearVisible = ref(false)
  const modalEditarVisible = ref(false)
  const modalEliminarVisible = ref(false)
  const movimientoSeleccionado = ref<MovimientoDTO | null>(null)

  // Formularios
  const formCrear = reactive<CrearMovimientoDTO>({
    sucursalId: null,
    monto: 0,
    tipoMovimiento: 1, // 1=Entrada, 2=Salida
    metodoMovimiento: 1, // 1=Efectivo, 2=QR, 3=Tarjeta, 4=Mixto, 5=Otro
    detalle: '',
  })

  const formEditar = reactive<ModificarMovimientoDTO>({
    monto: 0,
    tipoMovimiento: 1,
    metodoMovimiento: 1,
    detalle: '',
  })

  const METODOS_CONCEPTO = [
    { id: 1, label: 'Efectivo' },
    { id: 2, label: 'QR' },
    { id: 3, label: 'Tarjeta' },
    { id: 4, label: 'Mixto' },
    { id: 5, label: 'Otro' },
  ]

  async function cargarSucursales() {
    if (authStore.isPropietario) {
      try {
        sucursales.value = await sucursalService.listar(false)
      } catch (err) {
        console.warn('No se pudieron cargar sucursales:', err)
      }
    }
  }

  async function cargarMovimientos() {
    cargando.value = true
    error.value = null
    try {
      const filtros: FiltrosMovimientos = {
        tipoMovimiento: filtroTipo.value !== '' ? Number(filtroTipo.value) : undefined,
        soloPendientes: filtroSoloPendientes.value || undefined,
        sucursalId: filtroSucursal.value !== '' ? Number(filtroSucursal.value) : undefined,
        fechaDesde: filtroFechaDesde.value || undefined,
        fechaHasta: filtroFechaHasta.value || undefined,
      }
      movimientos.value = await cajaService.listarMovimientos(filtros)
    } catch (err: any) {
      error.value = err.userMessage || 'Error al cargar movimientos de caja.'
    } finally {
      cargando.value = false
    }
  }

  function limpiarFiltros() {
    filtroTipo.value = ''
    filtroSoloPendientes.value = false
    filtroSucursal.value = ''
    filtroFechaDesde.value = ''
    filtroFechaHasta.value = ''
    cargarMovimientos()
  }

  function abrirModalCrear() {
    formCrear.sucursalId = authStore.isPropietario ? (authStore.sucursalId || null) : null
    formCrear.monto = 0
    formCrear.tipoMovimiento = 1
    formCrear.metodoMovimiento = 1
    formCrear.detalle = ''
    error.value = null
    modalCrearVisible.value = true
  }

  async function guardarNuevoMovimiento() {
    if (authStore.isPropietario && (!formCrear.sucursalId || formCrear.sucursalId <= 0)) {
      error.value = 'Debe seleccionar una sucursal para registrar el movimiento.'
      return
    }
    if (!formCrear.monto || formCrear.monto <= 0) {
      error.value = 'El monto debe ser mayor a 0.'
      return
    }
    if (!formCrear.detalle.trim()) {
      error.value = 'El detalle o descripción es obligatorio.'
      return
    }

    guardando.value = true
    error.value = null
    try {
      await cajaService.crearMovimiento({
        sucursalId: formCrear.sucursalId,
        monto: Number(formCrear.monto),
        tipoMovimiento: formCrear.tipoMovimiento,
        metodoMovimiento: formCrear.metodoMovimiento,
        detalle: formCrear.detalle.trim().slice(0, 40),
      })
      modalCrearVisible.value = false
      mensajeExito.value = 'Movimiento registrado con éxito.'
      setTimeout(() => (mensajeExito.value = null), 4000)
      cargarMovimientos()
    } catch (err: any) {
      error.value = err.userMessage || 'Error al guardar el movimiento.'
    } finally {
      guardando.value = false
    }
  }

  function abrirModalEditar(m: MovimientoDTO) {
    if (m.sellado) return
    movimientoSeleccionado.value = m
    formEditar.monto = m.monto
    formEditar.tipoMovimiento = m.tipoMovimiento
    formEditar.metodoMovimiento = m.metodoMovimiento
    formEditar.detalle = m.detalle
    error.value = null
    modalEditarVisible.value = true
  }

  async function guardarEdicion() {
    if (!movimientoSeleccionado.value) return
    if (!formEditar.monto || formEditar.monto <= 0) {
      error.value = 'El monto debe ser mayor a 0.'
      return
    }
    if (!formEditar.detalle?.trim()) {
      error.value = 'El detalle es obligatorio.'
      return
    }

    guardando.value = true
    error.value = null
    try {
      await cajaService.modificarMovimiento(movimientoSeleccionado.value.movimientoId, {
        monto: Number(formEditar.monto),
        tipoMovimiento: formEditar.tipoMovimiento,
        metodoMovimiento: formEditar.metodoMovimiento,
        detalle: formEditar.detalle.trim().slice(0, 40),
      })
      modalEditarVisible.value = false
      mensajeExito.value = 'Movimiento modificado correctamente.'
      setTimeout(() => (mensajeExito.value = null), 4000)
      cargarMovimientos()
    } catch (err: any) {
      error.value = err.userMessage || 'Error al modificar el movimiento.'
    } finally {
      guardando.value = false
    }
  }

  function abrirModalEliminar(m: MovimientoDTO) {
    if (m.sellado) return
    movimientoSeleccionado.value = m
    error.value = null
    modalEliminarVisible.value = true
  }

  async function confirmarEliminacion() {
    if (!movimientoSeleccionado.value) return
    guardando.value = true
    error.value = null
    try {
      await cajaService.eliminarMovimiento(movimientoSeleccionado.value.movimientoId)
      modalEliminarVisible.value = false
      mensajeExito.value = 'Movimiento dado de baja correctamente.'
      setTimeout(() => (mensajeExito.value = null), 4000)
      cargarMovimientos()
    } catch (err: any) {
      error.value = err.userMessage || 'Error al eliminar el movimiento.'
    } finally {
      guardando.value = false
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
    cargarMovimientos()
  })

  return {
    authStore,
    cargando,
    guardando,
    error,
    mensajeExito,
    movimientos,
    sucursales,
    filtroTipo,
    filtroSoloPendientes,
    filtroSucursal,
    filtroFechaDesde,
    filtroFechaHasta,
    modalCrearVisible,
    modalEditarVisible,
    modalEliminarVisible,
    movimientoSeleccionado,
    formCrear,
    formEditar,
    METODOS_CONCEPTO,
    cargarMovimientos,
    limpiarFiltros,
    abrirModalCrear,
    guardarNuevoMovimiento,
    abrirModalEditar,
    guardarEdicion,
    abrirModalEliminar,
    confirmarEliminacion,
    formatearFecha,
    formatearMonto,
  }
}
