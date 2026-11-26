import { ref, reactive, computed, onMounted } from 'vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import {
  cajaService,
  type ReporteListadoDTO,
  type ReporteDetalleDTO,
  type FiltrosReportes,
} from '../services/cajaService'
import { sucursalService, type SucursalDTO } from '@/modules/configuracion/services/sucursalService'
import { usuarioService, type UsuarioDTO } from '@/services/usuarioService'

export function useLibroMayor() {
  const authStore = useAuthStore()

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
  // REPORTES HISTÓRICOS Y AUDITORÍA
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
      const diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1
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
  // MODAL GENERAR REPORTE DE PERÍODO (CORTE CONSOLIDADO)
  // ====================================================================
  const modalGenerarVisible = ref(false)
  const generandoReporte = ref(false)
  const errorGenerar = ref<string | null>(null)

  const formGenerar = reactive<{
    sucursalId?: number
    periodo: 'Diario' | 'Semanal' | 'Mensual' | 'Personalizado'
    fechaInicio: string
    fechaFin: string
  }>({
    sucursalId: undefined,
    periodo: 'Diario',
    fechaInicio: '',
    fechaFin: '',
  })

  function formatearLocalIso(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  function seleccionarTipoPeriodo(tipo: 'Diario' | 'Semanal' | 'Mensual' | 'Personalizado') {
    formGenerar.periodo = tipo
    const hoy = new Date()

    if (tipo === 'Diario') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)
      formGenerar.fechaInicio = formatearLocalIso(inicio)
      formGenerar.fechaFin = formatearLocalIso(fin)
    } else if (tipo === 'Semanal') {
      const dayOfWeek = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1 // Lunes = 0
      const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dayOfWeek, 0, 0, 0)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)
      formGenerar.fechaInicio = formatearLocalIso(lunes)
      formGenerar.fechaFin = formatearLocalIso(fin)
    } else if (tipo === 'Mensual') {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)
      formGenerar.fechaInicio = formatearLocalIso(primerDia)
      formGenerar.fechaFin = formatearLocalIso(fin)
    } else if (tipo === 'Personalizado') {
      if (!formGenerar.fechaInicio || !formGenerar.fechaFin) {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0)
        const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)
        formGenerar.fechaInicio = formatearLocalIso(inicio)
        formGenerar.fechaFin = formatearLocalIso(fin)
      }
    }
  }

  function abrirModalGenerar() {
    formGenerar.sucursalId = esPropietario.value
      ? (authStore.sucursalId || (listaSucursales.value[0]?.sucursalId ?? 1))
      : (authStore.sucursalId || 1)
    seleccionarTipoPeriodo('Diario')
    errorGenerar.value = null
    modalGenerarVisible.value = true
  }

  function cerrarModalGenerar() {
    modalGenerarVisible.value = false
    generandoReporte.value = false
    errorGenerar.value = null
  }

  async function confirmarGenerarReporte() {
    if (!formGenerar.sucursalId) {
      errorGenerar.value = 'Debe seleccionar una sucursal para generar el reporte.'
      return
    }
    if (!formGenerar.fechaInicio || !formGenerar.fechaFin) {
      errorGenerar.value = 'Debe especificar el rango completo de fechas y horas.'
      return
    }
    if (new Date(formGenerar.fechaInicio) > new Date(formGenerar.fechaFin)) {
      errorGenerar.value = 'La fecha y hora de inicio no puede ser posterior a la fecha de fin.'
      return
    }

    generandoReporte.value = true
    errorGenerar.value = null

    try {
      const res = await cajaService.generarReportePeriodo({
        sucursalId: Number(formGenerar.sucursalId),
        periodo: formGenerar.periodo,
        fechaInicio: formGenerar.fechaInicio,
        fechaFin: formGenerar.fechaFin,
      })

      modalGenerarVisible.value = false
      mensajeExito.value = res.mensaje || `Reporte de período #${res.reporteId} generado exitosamente.`
      setTimeout(() => {
        mensajeExito.value = null
      }, 5000)

      await cargarReportes()

      if (res.reporteId) {
        await abrirModalDetalle(res.reporteId)
      }
    } catch (err: any) {
      errorGenerar.value = err.userMessage || 'Error al generar el reporte de período.'
    } finally {
      generandoReporte.value = false
    }
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

      doc.setFillColor(15, 23, 42)
      doc.rect(14, 12, 6, 16, 'F')

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('TIENDA WARNES - CONTROL FINANCIERO', 24, 18)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(`Historial Consolidado de Reportes y Cierres de Turno | Generado: ${new Date().toLocaleString('es-BO')}`, 24, 25)

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
    } catch {
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
    } catch {
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
    try {
      const sucs = await sucursalService.listar(false)
      listaSucursales.value = sucs || []
    } catch (e) {
      console.warn('No se pudieron cargar sucursales:', e)
    }

    try {
      const usrs = await usuarioService.listarUsuarios()
      listaUsuarios.value = usrs || []
    } catch (e) {
      console.warn('No se pudieron cargar usuarios:', e)
    }

    if (!esPropietario.value) {
      filtrosReportes.sucursalId = authStore.sucursalId || undefined
    }
    if (esCajero.value) {
      filtrosReportes.usuarioId = authStore.usuarioId || undefined
    }

    await cargarReportes()
  })

  return {
    authStore,
    listaSucursales,
    listaUsuarios,
    mensajeExito,
    errorGeneral,
    esCajero,
    esSupervisor,
    esPropietario,

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

    modalDetalleVisible,
    cargandoDetalle,
    reporteDetalle,
    pestanaDetalle,
    abrirModalDetalle,
    cerrarModalDetalle,

    modalGenerarVisible,
    generandoReporte,
    errorGenerar,
    formGenerar,
    seleccionarTipoPeriodo,
    abrirModalGenerar,
    cerrarModalGenerar,
    confirmarGenerarReporte,

    exportarExcelReportes,
    exportarPdfReportes,
    descargarComprobantePdf,

    formatearMonto,
    formatearFecha,
    formatearHora,
    formatearFechaHora,
    formatearDuracion,
  }
}
