import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import {
  cajaService,
  type ArqueoResumenTurnoDTO,
  type PartidaArqueoDTO,
  type ReporteListadoDTO,
  type ReporteDetalleDTO,
  type FiltrosReportes,
} from '../services/cajaService'
import { sucursalService, type SucursalDTO } from '@/modules/configuracion/services/sucursalService'
import { usuarioService, type UsuarioDTO } from '@/services/usuarioService'

export interface PartidaArqueoFila extends PartidaArqueoDTO {
  esSistema?: boolean
  montoSistema?: number
}

export function useLibroMayor(tabInicialParam?: 'arqueo' | 'reportes') {
  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()

  // ====================================================================
  // NAVEGACIÓN ENTRE PESTAÑAS (ARQUEO Y REPORTES)
  // ====================================================================
  const tabQuery = (route.query.tab as string)?.toLowerCase()
  const tabDefault = tabInicialParam || (tabQuery === 'reportes' ? 'reportes' : 'arqueo')
  const pestanaActiva = ref<'arqueo' | 'reportes'>(tabDefault)

  function cambiarPestana(tab: 'arqueo' | 'reportes') {
    pestanaActiva.value = tab
    router.replace({
      query: { ...route.query, tab },
    })
    if (tab === 'reportes' && listaReportes.value.length === 0) {
      cargarReportes()
    }
  }

  // ====================================================================
  // ESTADOS GENERALES, SUCURSALES Y USUARIOS
  // ====================================================================
  const listaSucursales = ref<SucursalDTO[]>([])
  const listaUsuarios = ref<UsuarioDTO[]>([])
  const mensajeExito = ref<string | null>(null)
  const errorGeneral = ref<string | null>(null)

  const esCajero = computed(() => authStore.rolId === 1)
  const esSupervisor = computed(() => authStore.rolId === 2)
  const esPropietario = computed(() => authStore.rolId === 3)

  // ====================================================================
  // PESTAÑA 1: ARQUEO DE CAJA DEL TURNO
  // ====================================================================
  const cargandoArqueo = ref(false)
  const guardandoArqueo = ref(false)
  const omitiendoArqueo = ref(false)
  const errorArqueo = ref<string | null>(null)
  const resumenTurno = ref<ArqueoResumenTurnoDTO | null>(null)
  const sinTurnoActivo = ref(false)

  // Diálogo para omitir arqueo
  const modalOmitirVisible = ref(false)
  // Diálogo para confirmar arqueo
  const modalConfirmarVisible = ref(false)
  const permanecerEnSistema = ref(!esCajero.value)

  // Partidas declaradas por el cajero
  const entradasDeclaradas = ref<PartidaArqueoFila[]>([])
  const salidasDeclaradas = ref<PartidaArqueoFila[]>([])

  // Nuevas partidas borrador
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
    cargandoArqueo.value = true
    errorArqueo.value = null
    sinTurnoActivo.value = false

    try {
      const data = await cajaService.obtenerResumenTurno()
      resumenTurno.value = data

      // Filas fijas del sistema
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
        resumenTurno.value = null
      } else {
        errorArqueo.value = err.userMessage || 'No se pudo cargar el resumen del turno activo.'
      }
    } finally {
      cargandoArqueo.value = false
    }
  }

  // Movimientos extra-venta del turno
  const movimientosEntradaList = computed(() =>
    (resumenTurno.value?.movimientosDetalle || []).filter((m) => m.tipo_movimiento === 1)
  )
  const movimientosSalidaList = computed(() =>
    (resumenTurno.value?.movimientosDetalle || []).filter((m) => m.tipo_movimiento === 2)
  )

  // Cálculos de Entradas
  const sumaEntradasDeclaradas = computed(() =>
    entradasDeclaradas.value.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  )
  const movEntradasTurno = computed(() => Number(resumenTurno.value?.totalMovimientosEntrada) || 0)
  const totalEntradasFinal = computed(() => sumaEntradasDeclaradas.value + movEntradasTurno.value)

  // Cálculos de Salidas
  const sumaSalidasDeclaradas = computed(() =>
    salidasDeclaradas.value.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  )
  const movSalidasTurno = computed(() => Number(resumenTurno.value?.totalMovimientosSalida) || 0)
  const totalSalidasFinal = computed(() => sumaSalidasDeclaradas.value + movSalidasTurno.value)

  // Balance y diferencias
  const utilidadArqueo = computed(() => totalEntradasFinal.value - totalSalidasFinal.value)
  const totalVentasEsperadas = computed(() => Number(resumenTurno.value?.totalVentasGeneral) || 0)
  const diferenciaVentas = computed(() => totalEntradasFinal.value - totalVentasEsperadas.value)

  function agregarEntrada() {
    if (!nuevaEntrada.monto || Number(nuevaEntrada.monto) <= 0) return
    entradasDeclaradas.value.push({
      tipo: nuevaEntrada.tipo,
      monto: Number(nuevaEntrada.monto),
      descripcion: (nuevaEntrada.descripcion || '').trim().slice(0, 40) || 'Ingreso adicional declarado',
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

  async function ejecutarRegistroArqueo() {
    if (!resumenTurno.value) return
    guardandoArqueo.value = true
    errorArqueo.value = null

    try {
      const snapshot = {
        resumenVentas: {
          conteo: resumenTurno.value.conteoVentas,
          efectivo: resumenTurno.value.totalVentasEfectivo,
          qr: resumenTurno.value.totalVentasQr,
          tarjeta: resumenTurno.value.totalVentasTarjeta,
          total: resumenTurno.value.totalVentasGeneral,
        },
        resumenMovimientos: {
          entradas: resumenTurno.value.totalMovimientosEntrada,
          salidas: resumenTurno.value.totalMovimientosSalida,
          cantidad: resumenTurno.value.cantidadMovimientos,
        },
        totalesArqueo: {
          entradasDeclaradas: sumaEntradasDeclaradas.value,
          salidasDeclaradas: sumaSalidasDeclaradas.value,
          totalEntradasFinal: totalEntradasFinal.value,
          totalSalidasFinal: totalSalidasFinal.value,
          utilidad: utilidadArqueo.value,
          diferencia: diferenciaVentas.value,
        },
        topProductos: resumenTurno.value.topProductos || [],
      }

      const res = await cajaService.registrarArqueo({
        sesionId: resumenTurno.value.sesionId,
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
        mensajeExito.value = `Arqueo registrado con éxito (Reporte #REP-${res.reporteId}). Su sesión laboral ha sido sellada.`
        resumenTurno.value = null
        sinTurnoActivo.value = true
        // Cambiar a la pestaña de reportes y recargar
        pestanaActiva.value = 'reportes'
        await cargarReportes()
      } else {
        authStore.logout()
        router.push('/')
      }
    } catch (err: any) {
      errorArqueo.value = err.userMessage || 'Ocurrió un error al registrar el arqueo de caja.'
    } finally {
      guardandoArqueo.value = false
    }
  }

  async function ejecutarOmitirArqueo() {
    omitiendoArqueo.value = true
    try {
      await cajaService.cerrarSesionDirecta()
      modalOmitirVisible.value = false
      authStore.logout()
      router.push('/')
    } catch (err: any) {
      errorArqueo.value = err.userMessage || 'No se pudo cerrar la sesión directa.'
    } finally {
      omitiendoArqueo.value = false
    }
  }

  // ====================================================================
  // PESTAÑA 2: REPORTES HISTÓRICOS Y AUDITORÍA
  // ====================================================================
  const cargandoReportes = ref(false)
  const listaReportes = ref<ReporteListadoDTO[]>([])
  const selectedReporteIds = ref<Set<number>>(new Set())

  const filtrosReportes = reactive<FiltrosReportes>({
    sucursalId: undefined,
    periodo: undefined,
    fechaDesde: '',
    fechaHasta: '',
    usuarioId: undefined,
  })

  function setAtajoFecha(tipo: 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo') {
    const hoy = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const formato = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    if (tipo === 'hoy') {
      const hoyStr = formato(hoy)
      filtrosReportes.fechaDesde = hoyStr
      filtrosReportes.fechaHasta = hoyStr
    } else if (tipo === 'ayer') {
      const ayer = new Date(hoy)
      ayer.setDate(ayer.getDate() - 1)
      const ayerStr = formato(ayer)
      filtrosReportes.fechaDesde = ayerStr
      filtrosReportes.fechaHasta = ayerStr
    } else if (tipo === 'semana') {
      const d = new Date(hoy)
      const diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1 // lunes=0
      d.setDate(d.getDate() - diaSemana)
      filtrosReportes.fechaDesde = formato(d)
      filtrosReportes.fechaHasta = formato(hoy)
    } else if (tipo === 'mes') {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      filtrosReportes.fechaDesde = formato(primerDia)
      filtrosReportes.fechaHasta = formato(hoy)
    } else if (tipo === 'todo') {
      filtrosReportes.fechaDesde = ''
      filtrosReportes.fechaHasta = ''
    }
    aplicarFiltrosReportes()
  }

  async function cargarReportes() {
    cargandoReportes.value = true
    errorGeneral.value = null
    try {
      const params: FiltrosReportes = {}
      if (filtrosReportes.sucursalId) params.sucursalId = Number(filtrosReportes.sucursalId)
      if (filtrosReportes.periodo && filtrosReportes.periodo.trim()) params.periodo = filtrosReportes.periodo.trim()
      if (filtrosReportes.fechaDesde && filtrosReportes.fechaDesde.trim()) params.fechaDesde = filtrosReportes.fechaDesde.trim()
      if (filtrosReportes.fechaHasta && filtrosReportes.fechaHasta.trim()) params.fechaHasta = filtrosReportes.fechaHasta.trim()
      if (filtrosReportes.usuarioId) params.usuarioId = Number(filtrosReportes.usuarioId)

      const data = await cajaService.listarReportes(params)
      listaReportes.value = data || []
      selectedReporteIds.value.clear()
    } catch (err: any) {
      errorGeneral.value = err.userMessage || 'No se pudieron consultar los reportes históricos.'
    } finally {
      cargandoReportes.value = false
    }
  }

  function aplicarFiltrosReportes() {
    cargarReportes()
  }

  function limpiarFiltrosReportes() {
    filtrosReportes.sucursalId = esPropietario.value ? undefined : (authStore.sucursalId || undefined)
    filtrosReportes.periodo = undefined
    filtrosReportes.fechaDesde = ''
    filtrosReportes.fechaHasta = ''
    filtrosReportes.usuarioId = esCajero.value ? (authStore.usuarioId || undefined) : undefined
    cargarReportes()
  }

  // KPIs calculados del listado
  const kpisReportes = computed(() => {
    const total = listaReportes.value.length
    let totalEntradas = 0
    let totalSalidas = 0
    let utilidadTotal = 0

    for (const r of listaReportes.value) {
      totalEntradas += Number(r.montoEntradas) || 0
      totalSalidas += Number(r.montoSalidas) || 0
      utilidadTotal += Number(r.utilidad) || 0
    }

    return {
      totalReportes: total,
      totalEntradas,
      totalSalidas,
      utilidadTotal,
    }
  })

  // Selección múltiple con checkboxes
  const todosSeleccionados = computed(() => {
    return (
      listaReportes.value.length > 0 &&
      listaReportes.value.every((r) => selectedReporteIds.value.has(r.reporteId))
    )
  })

  const algunosSeleccionados = computed(() => {
    return (
      selectedReporteIds.value.size > 0 &&
      !todosSeleccionados.value
    )
  })

  function toggleSeleccionarTodos() {
    if (todosSeleccionados.value) {
      selectedReporteIds.value.clear()
    } else {
      selectedReporteIds.value = new Set(listaReportes.value.map((r) => r.reporteId))
    }
  }

  function toggleSeleccionarFila(id: number) {
    if (selectedReporteIds.value.has(id)) {
      selectedReporteIds.value.delete(id)
    } else {
      selectedReporteIds.value.add(id)
    }
  }

  // ====================================================================
  // MODAL DE DETALLE AUDITADO DE REPORTE
  // ====================================================================
  const modalDetalleVisible = ref(false)
  const cargandoDetalle = ref(false)
  const reporteDetalle = ref<ReporteDetalleDTO | null>(null)
  const pestanaDetalle = ref<'resumen' | 'entradas' | 'salidas' | 'movimientos'>('resumen')

  async function abrirModalDetalle(id: number) {
    modalDetalleVisible.value = true
    cargandoDetalle.value = true
    pestanaDetalle.value = 'resumen'
    reporteDetalle.value = null

    try {
      const data = await cajaService.obtenerDetalleReporte(id)
      reporteDetalle.value = data
    } catch (err: any) {
      errorGeneral.value = err.userMessage || `No se pudo obtener el detalle del reporte #${id}.`
      modalDetalleVisible.value = false
    } finally {
      cargandoDetalle.value = false
    }
  }

  function cerrarModalDetalle() {
    modalDetalleVisible.value = false
    reporteDetalle.value = null
  }

  // ====================================================================
  // EXPORTACIÓN A EXCEL (.XLSX)
  // ====================================================================
  function exportarExcelReportes() {
    const filasAExportar =
      selectedReporteIds.value.size > 0
        ? listaReportes.value.filter((r) => selectedReporteIds.value.has(r.reporteId))
        : listaReportes.value

    if (filasAExportar.length === 0) {
      errorGeneral.value = 'No hay reportes seleccionados o disponibles para exportar.'
      return
    }

    const headers = [
      'N° Reporte',
      'Fecha Creación',
      'Hora Cierre',
      'Sucursal',
      'Responsable / Cajero',
      'Período',
      'Monto Base (Bs.)',
      'Entradas (Bs.)',
      'Salidas (Bs.)',
      'Utilidad / Balance (Bs.)',
    ]

    let sumEntradas = 0
    let sumSalidas = 0
    let sumUtilidad = 0

    const rows = filasAExportar.map((r) => {
      const ent = Number(r.montoEntradas) || 0
      const sal = Number(r.montoSalidas) || 0
      const uti = Number(r.utilidad) || 0
      sumEntradas += ent
      sumSalidas += sal
      sumUtilidad += uti

      return [
        `#REP-${r.reporteId}`,
        formatearFecha(r.fechaCreacion || r.fechaFin),
        formatearHora(r.fechaCreacion || r.fechaFin),
        r.nombreSucursal ? `${r.nombreSucursal} (${r.codigoSucursal})` : (r.codigoSucursal || '-'),
        r.nombreUsuario || '-',
        r.periodo || 'Turno',
        r.montoBase !== null && r.montoBase !== undefined ? Number(r.montoBase) : 0,
        ent,
        sal,
        uti,
      ]
    })

    const totalRow = [
      'TOTAL CONSOLIDADO',
      '',
      '',
      '',
      `${filasAExportar.length} reportes`,
      '',
      '',
      sumEntradas,
      sumSalidas,
      sumUtilidad,
    ]

    const dataMatrix = [
      ['TIENDA WARNES ERP - CONTROL FINANCIERO Y REPORTES DE CAJA'],
      [`Fecha de Emisión: ${new Date().toLocaleString('es-BO')}`],
      [`Filtros: ${describirFiltros()}`],
      [],
      headers,
      ...rows,
      [],
      totalRow,
    ]

    const ws = XLSX.utils.aoa_to_sheet(dataMatrix)
    ws['!cols'] = [
      { wch: 14 },
      { wch: 15 },
      { wch: 12 },
      { wch: 16 },
      { wch: 26 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reportes_Caja')
    const fileName = `Reportes_Caja_Warnes_${fechaParaArchivo()}.xlsx`
    XLSX.writeFile(wb, fileName)
    mensajeExito.value = `Excel generado con éxito (${filasAExportar.length} reportes exportados).`
  }

  // ====================================================================
  // EXPORTACIÓN A PDF (LISTADO GENERAL)
  // ====================================================================
  function exportarPdfReportes() {
    const filasAExportar =
      selectedReporteIds.value.size > 0
        ? listaReportes.value.filter((r) => selectedReporteIds.value.has(r.reporteId))
        : listaReportes.value

    if (filasAExportar.length === 0) {
      errorGeneral.value = 'No hay reportes para exportar a PDF.'
      return
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })

      // Membrete
      doc.setFillColor(15, 23, 42) // Slate 900
      doc.rect(14, 12, 6, 16, 'F')

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('TIENDA WARNES - CONTROL FINANCIERO', 24, 18)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(`Historial Consolidado de Reportes y Cierres de Turno | Generado: ${new Date().toLocaleString('es-BO')}`, 24, 25)

      // Caja de resumen superior
      let sumEntradas = 0
      let sumSalidas = 0
      let sumUtilidad = 0
      for (const r of filasAExportar) {
        sumEntradas += Number(r.montoEntradas) || 0
        sumSalidas += Number(r.montoSalidas) || 0
        sumUtilidad += Number(r.utilidad) || 0
      }

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, 30, 251, 14, 2, 2, 'FD')

      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text(`Total Reportes: ${filasAExportar.length}`, 18, 39)
      doc.text(`Total Entradas: Bs. ${sumEntradas.toFixed(2)}`, 75, 39)
      doc.text(`Total Salidas: Bs. ${sumSalidas.toFixed(2)}`, 140, 39)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(`Balance Neto: Bs. ${sumUtilidad.toFixed(2)}`, 205, 39)

      // Tabla de datos
      const head = [
        ['Reporte', 'Fecha', 'Hora', 'Sucursal', 'Responsable / Cajero', 'Período', 'Entradas (Bs.)', 'Salidas (Bs.)', 'Utilidad (Bs.)'],
      ]

      const body = filasAExportar.map((r) => [
        `#REP-${r.reporteId}`,
        formatearFecha(r.fechaCreacion || r.fechaFin),
        formatearHora(r.fechaCreacion || r.fechaFin),
        r.nombreSucursal ? `${r.nombreSucursal} (${r.codigoSucursal})` : (r.codigoSucursal || '-'),
        r.nombreUsuario || '-',
        r.periodo || 'Turno',
        Number(r.montoEntradas || 0).toFixed(2),
        Number(r.montoSalidas || 0).toFixed(2),
        Number(r.utilidad || 0).toFixed(2),
      ])

      autoTable(doc, {
        head,
        body,
        startY: 48,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          1: { halign: 'center', cellWidth: 22 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 22 },
          4: { halign: 'left' },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'right', cellWidth: 28 },
          7: { halign: 'right', cellWidth: 28 },
          8: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      })

      doc.save(`Reportes_Caja_Warnes_${fechaParaArchivo()}.pdf`)
      mensajeExito.value = `Reporte PDF generado exitosamente (${filasAExportar.length} registros).`
    } catch (err: any) {
      errorGeneral.value = 'Ocurrió un error al generar el archivo PDF.'
    }
  }

  // ====================================================================
  // EXPORTACIÓN A PDF: COMPROBANTE / ACTA INDIVIDUAL DE ARQUEO
  // ====================================================================
  async function descargarComprobantePdf(reporteId: number) {
    try {
      let r = reporteDetalle.value
      if (!r || r.reporteId !== reporteId) {
        r = await cajaService.obtenerDetalleReporte(reporteId)
      }
      if (!r) return

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

      // Cabecera institucional
      doc.setFillColor(15, 23, 42)
      doc.rect(14, 12, 4, 18, 'F')

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('TIENDA WARNES', 22, 18)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text('ACTA DE ARQUEO Y CIERRE DE TURNO', 22, 24)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(`Documento de Control y Auditoría Interna | Emisión: ${new Date().toLocaleString('es-BO')}`, 22, 29)

      // Cuadro de metadata
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, 34, 188, 24, 2, 2, 'FD')

      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text(`N° Reporte: #REP-${r.reporteId}`, 18, 41)
      const branchDisplay = r.nombreSucursal ? `${r.nombreSucursal} (${r.codigoSucursal})` : (r.codigoSucursal || '-')
      doc.text(`Sucursal: ${branchDisplay}`, 18, 48)
      doc.text(`Responsable: ${r.nombreUsuario || '-'}`, 18, 54)

      doc.text(`Período: ${r.periodo || 'Turno'}`, 110, 41)
      doc.text(`Inicio de Turno: ${formatearFechaHora(r.fechaInicio)}`, 110, 48)
      doc.text(`Cierre de Turno: ${formatearFechaHora(r.fechaFin || r.fechaCreacion)}`, 110, 54)

      // Resumen Financiero
      autoTable(doc, {
        head: [['Concepto Financiero', 'Monto Registrado (Bs.)']],
        body: [
          ['Fondo Base Inicial de Caja', r.montoBase ? `Bs. ${Number(r.montoBase).toFixed(2)}` : 'Bs. 0.00'],
          ['Total Ingresos (Entradas Declaradas + Movimientos)', `Bs. ${Number(r.montoEntradas).toFixed(2)}`],
          ['Total Egresos (Salidas Declaradas + Movimientos)', `Bs. ${Number(r.montoSalidas).toFixed(2)}`],
          ['Balance Neto / Utilidad del Cierre', `Bs. ${Number(r.utilidad).toFixed(2)}`],
        ],
        startY: 63,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' },
          1: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      })

      // Detalle de Entradas Declaradas
      const ultY = (doc as any).lastAutoTable.finalY + 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('Partidas de Ingreso y Cobranzas', 14, ultY)

      const entradasRows = (r.entradas || []).map((e: any) => [
        e.descripcion_tipo || 'Entrada',
        e.descripcion || '-',
        Number(e.monto || 0).toFixed(2),
      ])

      autoTable(doc, {
        head: [['Tipo / Canal', 'Descripción de Partida', 'Monto (Bs.)']],
        body: entradasRows.length > 0 ? entradasRows : [['Sin partidas adicionales', '-', '0.00']],
        startY: ultY + 3,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { halign: 'left' },
          2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      })

      // Detalle de Salidas Declaradas
      const ultY2 = (doc as any).lastAutoTable.finalY + 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('Partidas de Egreso y Retiros Declarados', 14, ultY2)

      const salidasRows = (r.salidas || []).map((s: any) => [
        s.descripcion_tipo || 'Salida',
        s.descripcion || '-',
        Number(s.monto || 0).toFixed(2),
      ])

      autoTable(doc, {
        head: [['Tipo / Motivo', 'Descripción de Partida', 'Monto (Bs.)']],
        body: salidasRows.length > 0 ? salidasRows : [['Sin egresos adicionales declarados', '-', '0.00']],
        startY: ultY2 + 3,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { halign: 'left' },
          2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      })

      // Firmas
      const ultY3 = Math.max((doc as any).lastAutoTable.finalY + 25, 230)
      doc.setDrawColor(148, 163, 184)
      doc.line(24, ultY3, 85, ultY3)
      doc.line(125, ultY3, 186, ultY3)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(71, 85, 105)
      doc.text('Firma Cajero Responsable', 32, ultY3 + 5)
      doc.text(r.nombreUsuario || 'Cajero', 32, ultY3 + 9)

      doc.text('Firma Supervisor / Auditor', 133, ultY3 + 5)
      doc.text('Control y Arqueo Conforme', 133, ultY3 + 9)

      doc.save(`Acta_Arqueo_REP-${r.reporteId}.pdf`)
      mensajeExito.value = `Acta de arqueo descargada en PDF (Reporte #REP-${r.reporteId}).`
    } catch (err: any) {
      errorGeneral.value = 'No se pudo generar el comprobante PDF del arqueo.'
    }
  }

  // ====================================================================
  // UTILIDADES DE FORMATEO
  // ====================================================================
  function formatearMonto(val?: number | null): string {
    if (val === null || val === undefined || isNaN(Number(val))) return 'Bs. 0.00'
    return `Bs. ${Number(val).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function formatearFecha(val?: string | null): string {
    if (!val) return '-'
    try {
      const d = new Date(val)
      return d.toLocaleDateString('es-BO', { year: 'numeric', month: '2-digit', day: '2-digit' })
    } catch {
      return String(val)
    }
  }

  function formatearHora(val?: string | null): string {
    if (!val) return '-'
    try {
      const d = new Date(val)
      return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  function formatearFechaHora(val?: string | null): string {
    if (!val) return '-'
    try {
      const d = new Date(val)
      return d.toLocaleString('es-BO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return String(val)
    }
  }

  function formatearDuracion(inicio?: string | null, fin?: string | null): string {
    if (!inicio || !fin) return '-'
    try {
      const d1 = new Date(inicio).getTime()
      const d2 = new Date(fin).getTime()
      const diffMins = Math.max(0, Math.round((d2 - d1) / 60000))
      const horas = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      return `${horas}h ${mins}m`
    } catch {
      return '-'
    }
  }

  function fechaParaArchivo(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
  }

  function describirFiltros(): string {
    const partes: string[] = []
    if (filtrosReportes.fechaDesde) partes.push(`Desde: ${filtrosReportes.fechaDesde}`)
    if (filtrosReportes.fechaHasta) partes.push(`Hasta: ${filtrosReportes.fechaHasta}`)
    if (filtrosReportes.periodo) partes.push(`Período: ${filtrosReportes.periodo}`)
    return partes.length > 0 ? partes.join(' | ') : 'Todos'
  }

  // ====================================================================
  // INICIALIZACIÓN
  // ====================================================================
  onMounted(async () => {
    // 1. Cargar sucursales
    try {
      const sucs = await sucursalService.listar(false)
      listaSucursales.value = sucs || []
    } catch (e) {
      console.warn('No se pudieron cargar sucursales:', e)
    }

    // 2. Cargar usuarios
    try {
      const usrs = await usuarioService.listarUsuarios()
      listaUsuarios.value = usrs || []
    } catch (e) {
      console.warn('No se pudieron cargar usuarios:', e)
    }

    // 3. Configurar sucursal por defecto según rol
    if (!esPropietario.value) {
      filtrosReportes.sucursalId = authStore.sucursalId || undefined
    }
    if (esCajero.value) {
      filtrosReportes.usuarioId = authStore.usuarioId || undefined
    }

    // 4. Cargar datos de la pestaña inicial
    if (pestanaActiva.value === 'arqueo') {
      await cargarResumenTurno()
    } else {
      await cargarReportes()
    }
  })

  // Sincronizar si cambia query de ruta
  watch(
    () => route.query.tab,
    (newTab) => {
      if (newTab === 'reportes' && pestanaActiva.value !== 'reportes') {
        pestanaActiva.value = 'reportes'
        if (listaReportes.value.length === 0) cargarReportes()
      } else if (newTab === 'arqueo' && pestanaActiva.value !== 'arqueo') {
        pestanaActiva.value = 'arqueo'
        if (!resumenTurno.value) cargarResumenTurno()
      }
    }
  )

  return {
    authStore,
    pestanaActiva,
    cambiarPestana,
    listaSucursales,
    listaUsuarios,
    mensajeExito,
    errorGeneral,
    esCajero,
    esSupervisor,
    esPropietario,

    // Pestaña 1: Arqueo
    cargandoArqueo,
    guardandoArqueo,
    omitiendoArqueo,
    errorArqueo,
    resumenTurno,
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
    cargarResumenTurno,
    agregarEntrada,
    eliminarEntrada,
    agregarSalida,
    eliminarSalida,
    abrirConfirmacionArqueo,
    ejecutarRegistroArqueo,
    ejecutarOmitirArqueo,

    // Pestaña 2: Reportes
    cargandoReportes,
    listaReportes,
    selectedReporteIds,
    filtrosReportes,
    setAtajoFecha,
    cargarReportes,
    aplicarFiltrosReportes,
    limpiarFiltrosReportes,
    kpisReportes,
    todosSeleccionados,
    algunosSeleccionados,
    toggleSeleccionarTodos,
    toggleSeleccionarFila,

    // Modal Detalle
    modalDetalleVisible,
    cargandoDetalle,
    reporteDetalle,
    pestanaDetalle,
    abrirModalDetalle,
    cerrarModalDetalle,

    // Exportadores
    exportarExcelReportes,
    exportarPdfReportes,
    descargarComprobantePdf,

    // Utilidades
    formatearMonto,
    formatearFecha,
    formatearHora,
    formatearFechaHora,
    formatearDuracion,
  }
}
