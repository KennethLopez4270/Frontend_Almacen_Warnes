import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  cajaService,
  type ArqueoResumenTurnoDTO,
  type PartidaArqueoDTO,
} from '../services/cajaService'

export interface PartidaArqueoFila extends PartidaArqueoDTO {
  esSistema?: boolean
  montoSistema?: number
}

export function useArqueoCaja() {
  const router = useRouter()
  const authStore = useAuthStore()

  const esCajero = computed(() => authStore.rolId === 1)
  const esSupervisor = computed(() => authStore.rolId === 2)
  const esPropietario = computed(() => authStore.rolId === 3)

  const cargando = ref(true)
  const guardando = ref(false)
  const omitiendo = ref(false)
  const error = ref<string | null>(null)
  const resumen = ref<ArqueoResumenTurnoDTO | null>(null)
  const sinTurnoActivo = ref(false)

  // Modales
  const modalOmitirVisible = ref(false)
  const modalConfirmarVisible = ref(false)
  const permanecerEnSistema = ref(!esCajero.value)

  // Partidas declaradas (las filas del sistema son de solo lectura para el cajero)
  const entradasDeclaradas = ref<PartidaArqueoFila[]>([])
  const salidasDeclaradas = ref<PartidaArqueoFila[]>([])

  // Nuevas filas borrador editables
  const nuevaEntrada = reactive<PartidaArqueoDTO>({ tipo: 1, monto: 0, descripcion: '' })
  const nuevaSalida = reactive<PartidaArqueoDTO>({ tipo: 1, monto: 0, descripcion: '' })

  const METODOS_CONCEPTO = [
    { id: 1, label: 'Efectivo' },
    { id: 2, label: 'QR' },
    { id: 3, label: 'Tarjeta' },
    { id: 4, label: 'Mixto' },
    { id: 5, label: 'Otro' },
  ]

  async function cargarResumenTurno() {
    cargando.value = true
    error.value = null
    sinTurnoActivo.value = false

    try {
      const data = await cajaService.obtenerResumenTurno()
      resumen.value = data

      // Filas automáticas de ventas recuperadas del sistema (no editables ni eliminables)
      entradasDeclaradas.value = [
        {
          tipo: 1,
          monto: Number(data.totalVentasEfectivo) || 0,
          descripcion: 'Ventas en Efectivo (Sistema)',
          esSistema: true,
          montoSistema: Number(data.totalVentasEfectivo) || 0,
        },
        {
          tipo: 2,
          monto: Number(data.totalVentasQr) || 0,
          descripcion: 'Ventas por QR (Digital)',
          esSistema: true,
          montoSistema: Number(data.totalVentasQr) || 0,
        },
        {
          tipo: 3,
          monto: Number(data.totalVentasTarjeta) || 0,
          descripcion: 'Ventas con Tarjeta (POS)',
          esSistema: true,
          montoSistema: Number(data.totalVentasTarjeta) || 0,
        },
      ]
      salidasDeclaradas.value = []
    } catch (err: any) {
      if (err.response?.status === 404 || err.message?.includes('No hay turno activo')) {
        sinTurnoActivo.value = true
        resumen.value = null
      } else {
        error.value = err.userMessage || 'No se pudo cargar el resumen de la jornada.'
      }
    } finally {
      cargando.value = false
    }
  }

  // Movimientos extra-venta registrados en el turno
  const movimientosEntradaList = computed(() =>
    (resumen.value?.movimientosDetalle || []).filter((m) => m.tipo_movimiento === 1)
  )
  const movimientosSalidaList = computed(() =>
    (resumen.value?.movimientosDetalle || []).filter((m) => m.tipo_movimiento === 2)
  )

  // Cálculos de Entradas
  const sumaEntradasDeclaradas = computed(() =>
    entradasDeclaradas.value.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  )
  const movEntradasTurno = computed(() => Number(resumen.value?.totalMovimientosEntrada) || 0)
  const totalEntradasFinal = computed(() => sumaEntradasDeclaradas.value + movEntradasTurno.value)

  // Cálculos de Salidas
  const sumaSalidasDeclaradas = computed(() =>
    salidasDeclaradas.value.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  )
  const movSalidasTurno = computed(() => Number(resumen.value?.totalMovimientosSalida) || 0)
  const totalSalidasFinal = computed(() => sumaSalidasDeclaradas.value + movSalidasTurno.value)

  // Balance y Diferencia de Arqueo:
  // Esperado en sistema = Ventas del POS + Movimientos de Entrada ya registrados en caja
  // Así solo se refleja Sobrante/Faltante si existen entradas adicionales o desajuste real.
  const utilidadArqueo = computed(() => totalEntradasFinal.value - totalSalidasFinal.value)
  const totalVentasEsperadas = computed(() => Number(resumen.value?.totalVentasGeneral) || 0)
  const totalEsperadoSistema = computed(() => totalVentasEsperadas.value + movEntradasTurno.value)
  const diferenciaVentas = computed(() => totalEntradasFinal.value - totalEsperadoSistema.value)

  function agregarEntrada() {
    if (!nuevaEntrada.monto || Number(nuevaEntrada.monto) <= 0) return
    entradasDeclaradas.value.push({
      tipo: nuevaEntrada.tipo,
      monto: Number(nuevaEntrada.monto),
      descripcion: (nuevaEntrada.descripcion || '').trim().slice(0, 40) || 'Ingreso adicional',
      esSistema: false,
    })
    nuevaEntrada.monto = 0
    nuevaEntrada.descripcion = ''
  }

  function eliminarEntrada(index: number) {
    if (entradasDeclaradas.value[index]?.esSistema) return
    entradasDeclaradas.value.splice(index, 1)
  }

  function agregarSalida() {
    if (!nuevaSalida.monto || Number(nuevaSalida.monto) <= 0) return
    salidasDeclaradas.value.push({
      tipo: nuevaSalida.tipo,
      monto: Number(nuevaSalida.monto),
      descripcion: (nuevaSalida.descripcion || '').trim().slice(0, 40) || 'Egreso / Retiro declarado',
      esSistema: false,
    })
    nuevaSalida.monto = 0
    nuevaSalida.descripcion = ''
  }

  function eliminarSalida(index: number) {
    salidasDeclaradas.value.splice(index, 1)
  }

  function abrirConfirmacionArqueo() {
    permanecerEnSistema.value = !esCajero.value
    modalConfirmarVisible.value = true
  }

  async function confirmarArqueoYCerrar() {
    if (!resumen.value) return
    guardando.value = true
    error.value = null

    try {
      const snapshot = {
        resumenVentas: {
          conteo: resumen.value.conteoVentas,
          efectivo: resumen.value.totalVentasEfectivo,
          qr: resumen.value.totalVentasQr,
          tarjeta: resumen.value.totalVentasTarjeta,
          total: resumen.value.totalVentasGeneral,
        },
        resumenMovimientos: {
          entradas: resumen.value.totalMovimientosEntrada,
          salidas: resumen.value.totalMovimientosSalida,
          cantidad: resumen.value.cantidadMovimientos,
        },
        totalesArqueo: {
          entradasDeclaradas: sumaEntradasDeclaradas.value,
          salidasDeclaradas: sumaSalidasDeclaradas.value,
          totalEntradasFinal: totalEntradasFinal.value,
          totalSalidasFinal: totalSalidasFinal.value,
          utilidad: utilidadArqueo.value,
          diferencia: diferenciaVentas.value,
        },
        topProductos: resumen.value.topProductos || [],
      }

      await cajaService.registrarArqueo({
        sesionId: resumen.value.sesionId,
        montoBase: null,
        datosSnapshot: snapshot,
        entradas: entradasDeclaradas.value
          .filter((e) => (Number(e.monto) || 0) > 0 || e.esSistema)
          .map((e) => ({ tipo: e.tipo, monto: Number(e.monto) || 0, descripcion: e.descripcion })),
        salidas: salidasDeclaradas.value
          .filter((s) => (Number(s.monto) || 0) > 0)
          .map((s) => ({ tipo: s.tipo, monto: Number(s.monto) || 0, descripcion: s.descripcion })),
        periodo: 'Turno',
      })

      modalConfirmarVisible.value = false

      if (permanecerEnSistema.value) {
        router.push('/caja/libro-mayor')
      } else {
        authStore.logout()
        router.push('/')
      }
    } catch (err: any) {
      error.value = err.userMessage || 'Error al registrar el arqueo de caja.'
    } finally {
      guardando.value = false
    }
  }

  async function ejecutarOmitirArqueo() {
    omitiendo.value = true
    try {
      await cajaService.cerrarSesionDirecta(resumen.value?.sesionId)
      modalOmitirVisible.value = false
      authStore.logout()
      router.push('/')
    } catch (err: any) {
      error.value = err.userMessage || 'No se pudo cerrar la sesión.'
    } finally {
      omitiendo.value = false
    }
  }

  function formatearFechaHora(fechaStr?: string | null): string {
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
    cargarResumenTurno()
  })

  return {
    authStore,
    esCajero,
    esSupervisor,
    esPropietario,
    cargando,
    guardando,
    omitiendo,
    error,
    resumen,
    sinTurnoActivo,
    modalOmitirVisible,
    modalConfirmarVisible,
    permanecerEnSistema,
    entradasDeclaradas,
    salidasDeclaradas,
    nuevaEntrada,
    nuevaSalida,
    METODOS_CONCEPTO,
    movimientosEntradaList,
    movimientosSalidaList,
    sumaEntradasDeclaradas,
    movEntradasTurno,
    totalEntradasFinal,
    sumaSalidasDeclaradas,
    movSalidasTurno,
    totalSalidasFinal,
    utilidadArqueo,
    totalVentasEsperadas,
    diferenciaVentas,
    agregarEntrada,
    eliminarEntrada,
    agregarSalida,
    eliminarSalida,
    abrirConfirmacionArqueo,
    confirmarArqueoYCerrar,
    ejecutarOmitirArqueo,
    formatearFechaHora,
    formatearMonto,
    cargarResumenTurno,
  }
}
