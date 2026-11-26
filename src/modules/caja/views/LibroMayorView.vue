<script setup lang="ts">
import { useLibroMayor } from './LibroMayorView'

const {
  authStore,
  listaSucursales,
  listaUsuarios,
  mensajeExito,
  errorGeneral,
  esCajero,
  esPropietario,

  cargandoReportes,
  listaReportes,
  selectedReporteIds,
  filtrosReportes,
  setAtajoFecha,
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
} = useLibroMayor()
</script>

<template>
  <div class="user-wrapper">
    <!-- TOPBAR SUPERIOR -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="16" y2="10" />
            </svg>
          </div>
          <div>
            <h1 class="page-title">Libro Mayor y Reportes de Caja</h1>
            <p class="page-subtitle">
              Historial consolidado de cierres de turno, reportes financieros y actas auditadas
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <div class="lm-branch-badge" title="Sucursal de trabajo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
          </svg>
          <span>{{ authStore.sucursalNombre || 'Sucursal Central' }}</span>
        </div>

        <button
          type="button"
          class="btn-primary"
          title="Generar reporte financiero consolidado de auditoría por período"
          @click="abrirModalGenerar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Generar Reporte</span>
        </button>

        <router-link to="/caja/arqueo" class="btn-secondary" style="text-decoration: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Ir a Arqueo de Turno</span>
        </router-link>
      </div>
    </header>

    <!-- MENSAJES DE ESTADO -->
    <div v-if="mensajeExito" class="alert alert-success" style="justify-content: space-between;">
      <span>{{ mensajeExito }}</span>
      <button type="button" class="action-btn" @click="mensajeExito = null">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div v-if="errorGeneral" class="alert alert-danger" style="justify-content: space-between;">
      <span>{{ errorGeneral }}</span>
      <button type="button" class="action-btn" @click="errorGeneral = null">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- TARJETAS SUPERIORES DE KPIS CONSOLIDADOS -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Reportes Encontrados</span>
          <span class="kpi-value font-mono">{{ kpisReportes.totalReportes }}</span>
          <span class="kpi-desc">Cierres y arqueos auditados</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Total Entradas Acumuladas</span>
          <span class="kpi-value font-mono" style="color: var(--erp-success);">
            {{ formatearMonto(kpisReportes.totalEntradas) }}
          </span>
          <span class="kpi-desc">Ingresos netos por cobranza</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box rose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Total Salidas Acumuladas</span>
          <span class="kpi-value font-mono" style="color: var(--erp-danger);">
            {{ formatearMonto(kpisReportes.totalSalidas) }}
          </span>
          <span class="kpi-desc">Egresos y retiros de caja</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Utilidad Neta Consolidada</span>
          <span class="kpi-value font-mono">
            {{ formatearMonto(kpisReportes.utilidadTotal) }}
          </span>
          <span class="kpi-desc">Balance neto del período</span>
        </div>
      </div>
    </section>

    <!-- BARRA DE FILTROS SUPERIOR -->
    <div class="lm-filter-box">
      <div class="lm-filter-grid">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Fecha Desde:</label>
          <input
            v-model="filtrosReportes.fechaDesde"
            type="date"
            class="form-control lm-input-compact"
          />
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Fecha Hasta:</label>
          <input
            v-model="filtrosReportes.fechaHasta"
            type="date"
            class="form-control lm-input-compact"
          />
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Usuario / Cajero:</label>
          <select
            v-model="filtrosReportes.usuarioId"
            class="form-select lm-input-compact"
            :disabled="esCajero"
          >
            <option :value="undefined">Todos los cajeros</option>
            <option v-for="u in listaUsuarios" :key="u.usuarioId || u.usuario_id" :value="u.usuarioId || u.usuario_id">
              {{ u.nombreCompleto || u.nombres + ' ' + u.apellidos }} ({{ u.usuario }})
            </option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Sucursal:</label>
          <select
            v-model="filtrosReportes.sucursalId"
            class="form-select lm-input-compact"
            :disabled="!esPropietario"
          >
            <option :value="undefined">Todas las sucursales</option>
            <option v-for="s in listaSucursales" :key="s.sucursalId" :value="s.sucursalId">
              {{ s.codigoInterno }} - {{ s.ciudad }}
            </option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Período:</label>
          <select v-model="filtrosReportes.periodo" class="form-select lm-input-compact">
            <option :value="undefined">Todos los períodos</option>
            <option value="Turno">Turno</option>
            <option value="Diario">Diario</option>
            <option value="Semanal">Semanal</option>
            <option value="Mensual">Mensual</option>
          </select>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
          <button
            type="button"
            class="btn-primary"
            :disabled="cargandoReportes"
            @click="aplicarFiltrosReportes"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Filtrar</span>
          </button>

          <button
            type="button"
            class="btn-secondary"
            :disabled="cargandoReportes"
            @click="limpiarFiltrosReportes"
          >
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      <!-- ATAJOS RÁPIDOS DE FECHA -->
      <div class="lm-shortcuts-row">
        <span class="lm-shortcuts-label">Atajos rápidos:</span>
        <button type="button" class="lm-shortcut-btn" @click="setAtajoFecha('hoy')">Hoy</button>
        <button type="button" class="lm-shortcut-btn" @click="setAtajoFecha('ayer')">Ayer</button>
        <button type="button" class="lm-shortcut-btn" @click="setAtajoFecha('semana')">Esta Semana</button>
        <button type="button" class="lm-shortcut-btn" @click="setAtajoFecha('mes')">Este Mes</button>
        <button type="button" class="lm-shortcut-btn" @click="setAtajoFecha('todo')">Ver Todo</button>
      </div>
    </div>

    <!-- TABLA DE REPORTES CONSOLIDADOS -->
    <div class="table-container">
      <div class="lm-table-header">
        <div>
          <h3 class="lm-table-title">Historial de Reportes y Cierres</h3>
          <p class="lm-table-subtitle">
            Mostrando {{ listaReportes.length }} reporte(s)
            <span v-if="selectedReporteIds.size > 0"> &bull; {{ selectedReporteIds.size }} seleccionado(s)</span>
          </p>
        </div>

        <div class="lm-table-actions">
          <button
            type="button"
            class="btn-secondary"
            :disabled="listaReportes.length === 0"
            @click="exportarExcelReportes"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" style="color: var(--erp-success);">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="16" y2="17" />
            </svg>
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            class="btn-secondary"
            :disabled="listaReportes.length === 0"
            @click="exportarPdfReportes"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" style="color: var(--erp-danger);">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">
                <input
                  type="checkbox"
                  :checked="todosSeleccionados"
                  :indeterminate="algunosSeleccionados"
                  @change="toggleSeleccionarTodos"
                />
              </th>
              <th style="width: 105px;">N° Reporte</th>
              <th style="width: 145px;">Fecha y Cierre</th>
              <th style="width: 130px;">Sucursal</th>
              <th>Responsable / Cajero</th>
              <th style="width: 95px; text-align: center;">Período</th>
              <th style="width: 125px; text-align: right;">Entradas (Bs.)</th>
              <th style="width: 125px; text-align: right;">Salidas (Bs.)</th>
              <th style="width: 135px; text-align: right;">Utilidad / Balance</th>
              <th style="width: 100px; text-align: center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargandoReportes">
              <td colspan="10" class="loading-state">
                <div class="spinner-large"></div>
                <span>Cargando reportes consolidados...</span>
              </td>
            </tr>

            <tr v-else-if="listaReportes.length === 0">
              <td colspan="10" class="empty-state">
                No se encontraron reportes de caja para los filtros seleccionados.
              </td>
            </tr>

            <tr
              v-for="r in listaReportes"
              :key="'rep-' + r.reporteId"
              :class="{ 'row-selected': selectedReporteIds.has(r.reporteId) }"
            >
              <td style="text-align: center;">
                <input
                  type="checkbox"
                  :checked="selectedReporteIds.has(r.reporteId)"
                  @change="toggleSeleccionarFila(r.reporteId)"
                />
              </td>
              <td class="font-mono font-semibold" style="color: var(--erp-text-main);">
                #REP-{{ r.reporteId }}
              </td>
              <td>
                <div class="font-semibold">{{ formatearFecha(r.fechaCreacion || r.fechaFin) }}</div>
                <div class="text-xs text-muted">{{ formatearHora(r.fechaCreacion || r.fechaFin) }}</div>
              </td>
              <td>
                <span class="sucursal-badge" :title="r.codigoSucursal || ''">
                  {{ r.nombreSucursal ? `${r.nombreSucursal} (${r.codigoSucursal})` : (r.codigoSucursal || '-') }}
                </span>
              </td>
              <td class="font-semibold">
                {{ r.nombreUsuario || '-' }}
              </td>
              <td style="text-align: center;">
                <span class="kpi-badge neutral">
                  {{ r.periodo || 'Turno' }}
                </span>
              </td>
              <td class="text-right font-mono font-semibold" style="color: var(--erp-success);">
                {{ formatearMonto(r.montoEntradas) }}
              </td>
              <td class="text-right font-mono font-semibold" style="color: var(--erp-danger);">
                {{ formatearMonto(r.montoSalidas) }}
              </td>
              <td class="text-right font-mono font-semibold" style="color: var(--erp-text-main);">
                {{ formatearMonto(r.utilidad) }}
              </td>
              <td style="text-align: center;">
                <div class="td-actions" style="justify-content: center;">
                  <button
                    type="button"
                    class="action-btn"
                    title="Ver Detalle Auditado"
                    @click="abrirModalDetalle(r.reporteId)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="action-btn action-btn-danger"
                    title="Descargar Acta en PDF"
                    @click="descargarComprobantePdf(r.reporteId)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DETALLE AUDITADO DEL REPORTE -->
    <div v-if="modalDetalleVisible" class="modal-backdrop" @click.self="cerrarModalDetalle">
      <div class="modal-card" style="max-width: 820px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">
              Detalle Auditado - Reporte #REP-{{ reporteDetalle?.reporteId || '...' }}
            </h3>
            <p class="modal-subtitle">
              Sucursal: {{ reporteDetalle?.nombreSucursal ? `${reporteDetalle.nombreSucursal} (${reporteDetalle.codigoSucursal})` : (reporteDetalle?.codigoSucursal || '-') }} &bull; Cajero: {{ reporteDetalle?.nombreUsuario }}
            </p>
          </div>
          <button type="button" class="btn-close-modal" @click="cerrarModalDetalle">&times;</button>
        </div>

        <div class="modal-body">
          <div v-if="cargandoDetalle" class="loading-state">
            <div class="spinner-large"></div>
            <span class="text-muted text-sm">Cargando desglose completo del reporte...</span>
          </div>

          <div v-else-if="reporteDetalle">
            <!-- BANNER DE HORARIOS -->
            <div class="lm-callout-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span class="kpi-label">Inicio:</span>
                <span class="text-sm font-semibold" style="margin-left: 0.35rem;">{{ formatearFechaHora(reporteDetalle.fechaInicio) }}</span>
              </div>
              <div>
                <span class="kpi-label">Cierre:</span>
                <span class="text-sm font-semibold" style="margin-left: 0.35rem;">{{ formatearFechaHora(reporteDetalle.fechaFin || reporteDetalle.fechaCreacion) }}</span>
              </div>
              <div>
                <span class="kpi-label">Duración:</span>
                <span class="kpi-badge neutral font-mono" style="margin-left: 0.35rem;">
                  {{ formatearDuracion(reporteDetalle.fechaInicio, reporteDetalle.fechaFin || reporteDetalle.fechaCreacion) }}
                </span>
              </div>
            </div>

            <!-- CUADRO DE RESUMEN MONETARIO -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
              <div class="lm-callout-box" style="background-color: var(--erp-bg-card);">
                <span class="kpi-label">Total Entradas</span>
                <div class="font-mono" style="font-size: 1.15rem; font-weight: 700; color: var(--erp-success); margin-top: 0.2rem;">
                  {{ formatearMonto(reporteDetalle.montoEntradas) }}
                </div>
              </div>

              <div class="lm-callout-box" style="background-color: var(--erp-bg-card);">
                <span class="kpi-label">Total Salidas</span>
                <div class="font-mono" style="font-size: 1.15rem; font-weight: 700; color: var(--erp-danger); margin-top: 0.2rem;">
                  {{ formatearMonto(reporteDetalle.montoSalidas) }}
                </div>
              </div>

              <div class="lm-callout-box" style="background-color: var(--erp-bg-card);">
                <span class="kpi-label">Balance / Utilidad</span>
                <div class="font-mono" style="font-size: 1.15rem; font-weight: 700; color: var(--erp-text-main); margin-top: 0.2rem;">
                  {{ formatearMonto(reporteDetalle.utilidad) }}
                </div>
              </div>
            </div>

            <!-- SUB-PESTAÑAS DEL DETALLE -->
            <div class="lm-subtabs-nav">
              <button
                type="button"
                class="lm-subtab-btn"
                :class="{ active: pestanaDetalle === 'resumen' }"
                @click="pestanaDetalle = 'resumen'"
              >
                Snapshot del Turno
              </button>
              <button
                type="button"
                class="lm-subtab-btn"
                :class="{ active: pestanaDetalle === 'entradas' }"
                @click="pestanaDetalle = 'entradas'"
              >
                Entradas ({{ reporteDetalle.entradas?.length || 0 }})
              </button>
              <button
                type="button"
                class="lm-subtab-btn"
                :class="{ active: pestanaDetalle === 'salidas' }"
                @click="pestanaDetalle = 'salidas'"
              >
                Salidas ({{ reporteDetalle.salidas?.length || 0 }})
              </button>
              <button
                type="button"
                class="lm-subtab-btn"
                :class="{ active: pestanaDetalle === 'movimientos' }"
                @click="pestanaDetalle = 'movimientos'"
              >
                Movimientos Sellados ({{ reporteDetalle.movimientos?.length || 0 }})
              </button>
            </div>

            <!-- 1. SNAPSHOT -->
            <div v-if="pestanaDetalle === 'resumen'">
              <div v-if="reporteDetalle.datosSnapshot?.resumenVentas" class="lm-callout-box" style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span class="kpi-label">Ventas Congeladas en el Corte</span>
                  <span class="text-xs text-muted">
                    {{ reporteDetalle.datosSnapshot.resumenVentas.conteo || 0 }} transacciones registradas
                  </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; font-size: 0.825rem;">
                  <div>
                    <span class="text-muted">Efectivo:</span>
                    <strong class="font-mono" style="display: block;">{{ formatearMonto(reporteDetalle.datosSnapshot.resumenVentas.efectivo) }}</strong>
                  </div>
                  <div>
                    <span class="text-muted">QR Digital:</span>
                    <strong class="font-mono" style="display: block;">{{ formatearMonto(reporteDetalle.datosSnapshot.resumenVentas.qr) }}</strong>
                  </div>
                  <div>
                    <span class="text-muted">Tarjeta POS:</span>
                    <strong class="font-mono" style="display: block;">{{ formatearMonto(reporteDetalle.datosSnapshot.resumenVentas.tarjeta) }}</strong>
                  </div>
                  <div>
                    <span class="text-muted">Total Ventas:</span>
                    <strong class="font-mono" style="display: block; color: var(--erp-text-main);">{{ formatearMonto(reporteDetalle.datosSnapshot.resumenVentas.total) }}</strong>
                  </div>
                </div>
              </div>

              <div v-if="reporteDetalle.datosSnapshot?.totalesArqueo" class="lm-callout-box" style="background-color: var(--erp-bg-card); margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span class="kpi-label">Auditoría de Cierre y Balance Físico</span>
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span class="text-xs text-muted">Diferencia de Caja:</span>
                    <span
                      class="kpi-badge font-mono"
                      :class="Number(reporteDetalle.datosSnapshot.totalesArqueo.diferencia || 0) === 0 ? 'success' : Number(reporteDetalle.datosSnapshot.totalesArqueo.diferencia) > 0 ? 'warning' : 'danger'"
                    >
                      {{ Number(reporteDetalle.datosSnapshot.totalesArqueo.diferencia || 0) > 0 ? '+' : '' }}{{ formatearMonto(reporteDetalle.datosSnapshot.totalesArqueo.diferencia) }}
                    </span>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; font-size: 0.8rem; background-color: var(--erp-bg-hover); padding: 0.65rem; border-radius: var(--erp-radius-sm);">
                  <div>
                    <span class="text-muted">Entradas Declaradas:</span>
                    <strong class="font-mono" style="display: block; color: var(--erp-success);">{{ formatearMonto(reporteDetalle.datosSnapshot.totalesArqueo.entradasDeclaradas) }}</strong>
                  </div>
                  <div>
                    <span class="text-muted">Salidas Declaradas:</span>
                    <strong class="font-mono" style="display: block; color: var(--erp-danger);">{{ formatearMonto(reporteDetalle.datosSnapshot.totalesArqueo.salidasDeclaradas) }}</strong>
                  </div>
                  <div>
                    <span class="text-muted">Movimientos Sellados:</span>
                    <strong class="font-mono" style="display: block;">{{ reporteDetalle.movimientos?.length || 0 }} registros</strong>
                  </div>
                  <div>
                    <span class="text-muted">Utilidad Turno:</span>
                    <strong class="font-mono" style="display: block; color: var(--erp-text-main);">{{ formatearMonto(reporteDetalle.datosSnapshot.totalesArqueo.utilidad) }}</strong>
                  </div>
                </div>
              </div>

              <div v-if="reporteDetalle.datosSnapshot?.topProductos?.length > 0" class="table-container">
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th style="width: 90px; text-align: center;">Cantidad</th>
                        <th style="width: 130px; text-align: right;">Total Recaudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(p, idx) in reporteDetalle.datosSnapshot.topProductos" :key="'sp-' + idx">
                        <td>{{ p.producto || p.nombre_producto }}</td>
                        <td class="text-center font-mono">{{ p.cantidad || p.cantidad_total }}</td>
                        <td class="text-right font-mono font-semibold">
                          {{ formatearMonto(p.subtotal || p.monto_total) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div v-else-if="!reporteDetalle.datosSnapshot?.resumenVentas && !reporteDetalle.datosSnapshot?.totalesArqueo" style="padding: 2rem; text-align: center;">
                <p class="text-muted text-sm" style="margin: 0;">
                  Este reporte periódico consolidado ({{ reporteDetalle.periodo }}) fue generado sin un corte de arqueo físico individual.
                  Consulte las pestañas de <strong>Entradas</strong>, <strong>Salidas</strong> y <strong>Movimientos Sellados</strong> para ver el detalle de partidas.
                </p>
              </div>
            </div>

            <!-- 2. ENTRADAS -->
            <div v-else-if="pestanaDetalle === 'entradas'" class="table-container">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Canal / Tipo</th>
                      <th>Descripción</th>
                      <th style="width: 120px; text-align: right;">Monto (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!reporteDetalle.entradas || reporteDetalle.entradas.length === 0">
                      <td colspan="3" class="text-center text-muted" style="padding: 1.5rem 0;">
                        Sin partidas de entrada registradas
                      </td>
                    </tr>
                    <tr v-for="e in reporteDetalle.entradas" :key="'de-' + e.entrada_id">
                      <td><span class="kpi-badge neutral">{{ e.descripcion_tipo }}</span></td>
                      <td>{{ e.descripcion || '-' }}</td>
                      <td class="text-right font-mono font-semibold" style="color: var(--erp-success);">
                        {{ formatearMonto(e.monto) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 3. SALIDAS -->
            <div v-else-if="pestanaDetalle === 'salidas'" class="table-container">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Motivo / Tipo</th>
                      <th>Descripción</th>
                      <th style="width: 120px; text-align: right;">Monto (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!reporteDetalle.salidas || reporteDetalle.salidas.length === 0">
                      <td colspan="3" class="text-center text-muted" style="padding: 1.5rem 0;">
                        Sin partidas de egreso registradas
                      </td>
                    </tr>
                    <tr v-for="s in reporteDetalle.salidas" :key="'ds-' + s.salida_id">
                      <td><span class="kpi-badge neutral">{{ s.descripcion_tipo }}</span></td>
                      <td>{{ s.descripcion || '-' }}</td>
                      <td class="text-right font-mono font-semibold" style="color: var(--erp-danger);">
                        {{ formatearMonto(s.monto) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 4. MOVIMIENTOS SELLADOS -->
            <div v-else-if="pestanaDetalle === 'movimientos'" class="table-container">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Método</th>
                      <th>Detalle</th>
                      <th style="width: 120px; text-align: right;">Monto (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!reporteDetalle.movimientos || reporteDetalle.movimientos.length === 0">
                      <td colspan="4" class="text-center text-muted" style="padding: 1.5rem 0;">
                        Sin movimientos extra-venta asociados a este corte
                      </td>
                    </tr>
                    <tr v-for="m in reporteDetalle.movimientos" :key="'dm-' + m.movimiento_id">
                      <td>
                        <span
                          class="status-badge"
                          :class="m.tipo_movimiento === 1 ? 'activa' : 'baja'"
                        >
                          {{ m.descripcion_tipo }}
                        </span>
                      </td>
                      <td>{{ m.descripcion_metodo }}</td>
                      <td>{{ m.detalle || '-' }}</td>
                      <td class="text-right font-mono font-semibold">
                        {{ formatearMonto(m.monto) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="reporteDetalle"
            type="button"
            class="btn-secondary"
            @click="descargarComprobantePdf(reporteDetalle.reporteId)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" style="color: var(--erp-danger);">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Descargar Acta en PDF</span>
          </button>

          <button type="button" class="btn-primary" @click="cerrarModalDetalle">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL GENERAR REPORTE DE PERÍODO -->
    <div v-if="modalGenerarVisible" class="modal-backdrop" @click.self="cerrarModalGenerar">
      <div class="modal-card" style="max-width: 580px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Generar Reporte de Período</h3>
            <p class="modal-subtitle">
              Consolidación financiera y auditoría contable por rango de fechas
            </p>
          </div>
          <button type="button" class="btn-close-modal" @click="cerrarModalGenerar">&times;</button>
        </div>

        <div class="modal-body">
          <div v-if="errorGenerar" class="alert alert-danger" style="margin-bottom: 0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ errorGenerar }}</span>
          </div>

          <!-- SUCURSAL -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">
              Sucursal <span class="required">*</span>
            </label>
            <select
              v-if="esPropietario"
              v-model="formGenerar.sucursalId"
              class="form-select"
              required
            >
              <option
                v-for="s in listaSucursales"
                :key="'gen-suc-' + s.sucursalId"
                :value="s.sucursalId"
              >
                {{ s.ciudad }} ({{ s.codigoInterno }})
              </option>
            </select>
            <input
              v-else
              type="text"
              class="form-control"
              :value="`${authStore.sucursalNombre || 'Sucursal Asignada'} (Suc. #${authStore.sucursalId || 1})`"
              disabled
              style="background-color: var(--erp-bg-muted); color: var(--erp-text-main);"
            />
          </div>

          <!-- TIPO DE PERÍODO -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Tipo de Período</label>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 0.2rem;">
              <button
                type="button"
                class="lm-shortcut-btn"
                :class="{ active: formGenerar.periodo === 'Diario' }"
                style="text-align: center; justify-content: center; padding: 0.45rem 0.5rem;"
                @click="seleccionarTipoPeriodo('Diario')"
              >
                Diario
              </button>
              <button
                type="button"
                class="lm-shortcut-btn"
                :class="{ active: formGenerar.periodo === 'Semanal' }"
                style="text-align: center; justify-content: center; padding: 0.45rem 0.5rem;"
                @click="seleccionarTipoPeriodo('Semanal')"
              >
                Semanal
              </button>
              <button
                type="button"
                class="lm-shortcut-btn"
                :class="{ active: formGenerar.periodo === 'Mensual' }"
                style="text-align: center; justify-content: center; padding: 0.45rem 0.5rem;"
                @click="seleccionarTipoPeriodo('Mensual')"
              >
                Mensual
              </button>
              <button
                type="button"
                class="lm-shortcut-btn"
                :class="{ active: formGenerar.periodo === 'Personalizado' }"
                style="text-align: center; justify-content: center; padding: 0.45rem 0.5rem;"
                @click="seleccionarTipoPeriodo('Personalizado')"
              >
                Personalizado
              </button>
            </div>
          </div>

          <!-- RANGO DE FECHAS Y HORAS -->
          <div class="form-row">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">
                Fecha y Hora Inicio <span class="required">*</span>
              </label>
              <input
                type="datetime-local"
                step="1"
                v-model="formGenerar.fechaInicio"
                class="form-control"
                :disabled="formGenerar.periodo !== 'Personalizado'"
                required
              />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">
                Fecha y Hora Fin <span class="required">*</span>
              </label>
              <input
                type="datetime-local"
                step="1"
                v-model="formGenerar.fechaFin"
                class="form-control"
                :disabled="formGenerar.periodo !== 'Personalizado'"
                required
              />
            </div>
          </div>

          <!-- CALLOUT INFORMATIVO -->
          <div class="info-callout" style="margin-bottom: 0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="info-icon">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span style="font-size: var(--erp-font-xs); line-height: 1.45;">
              Se consolidarán todas las ventas y movimientos registrados en la sucursal dentro del intervalo elegido sin afectar las sesiones abiertas ni modificar arqueos individuales.
            </span>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" :disabled="generandoReporte" @click="cerrarModalGenerar">
            Cancelar
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="generandoReporte"
            @click="confirmarGenerarReporte"
          >
            <div v-if="generandoReporte" class="spinner-small" style="margin-right: 0.4rem;"></div>
            <span>{{ generandoReporte ? 'Generando...' : 'Generar y Auditar' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./LibroMayorView.css"></style>
