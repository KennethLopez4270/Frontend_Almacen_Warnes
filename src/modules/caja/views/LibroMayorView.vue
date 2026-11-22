<script setup lang="ts">
import { useLibroMayor } from './LibroMayorView'

const {
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
} = useLibroMayor()
</script>

<template>
  <div class="user-wrapper">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="18" rx="2"></rect>
              <line x1="2" y1="9" x2="22" y2="9"></line>
              <line x1="2" y1="15" x2="22" y2="15"></line>
              <line x1="8" y1="3" x2="8" y2="21"></line>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Libro Mayor y Reportes de Caja</h1>
            <p class="page-subtitle">
              Historial consolidado de arqueos de caja, balances de turnos y auditoría de partidas
            </p>
          </div>
        </div>
      </div>
    </header>

    <!-- ERROR -->
    <div v-if="error" class="alert alert-danger mb-2">
      <span>{{ error }}</span>
    </div>

    <!-- BARRA DE FILTROS GLOBALES -->
    <div class="filter-card">
      <div class="filter-left" style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
        <!-- Selector de Sucursal si es Propietario -->
        <div v-if="authStore.isPropietario" class="form-group mb-0" style="min-width: 180px;">
          <select v-model="filtroSucursal" class="filter-select" @change="cargarReportes">
            <option value="">Todas las sucursales</option>
            <option v-for="s in sucursales" :key="s.sucursalId" :value="s.sucursalId">
              {{ s.codigoInterno }} ({{ s.ciudad }})
            </option>
          </select>
        </div>

        <!-- Filtro Período -->
        <div class="form-group mb-0" style="min-width: 150px;">
          <select v-model="filtroPeriodo" class="filter-select" @change="cargarReportes">
            <option value="">Todos los períodos</option>
            <option value="Turno">Turno</option>
            <option value="Diario">Diario</option>
            <option value="Semanal">Semanal</option>
            <option value="Mensual">Mensual</option>
          </select>
        </div>

        <!-- Filtro Fecha Desde -->
        <div class="form-group mb-0">
          <input
            v-model="filtroFechaDesde"
            type="date"
            class="filter-select"
            title="Fecha Desde"
            @change="cargarReportes"
          />
        </div>

        <!-- Filtro Fecha Hasta -->
        <div class="form-group mb-0">
          <input
            v-model="filtroFechaHasta"
            type="date"
            class="filter-select"
            title="Fecha Hasta"
            @change="cargarReportes"
          />
        </div>
      </div>

      <div class="filter-right" style="display: flex; gap: 0.5rem; align-items: center;">
        <button type="button" class="btn-secondary" @click="limpiarFiltros">
          Limpiar
        </button>
        <button type="button" class="btn-primary" @click="cargarReportes">
          Buscar
        </button>
      </div>
    </div>

    <!-- TABLA DE REPORTES -->
    <div class="table-container">
      <div v-if="cargando" class="empty-state" style="padding: 3rem 1rem;">
        <div class="spinner-small" style="width: 32px; height: 32px; margin: 0 auto 0.75rem; border: 3px solid #e2e8f0; border-top-color: var(--erp-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p class="cell-sub">Cargando reportes del Libro Mayor...</p>
      </div>

      <div v-else-if="reportes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
          <rect x="2" y="3" width="20" height="18" rx="2"></rect>
          <line x1="2" y1="9" x2="22" y2="9"></line>
        </svg>
        <h3>No se encontraron reportes</h3>
        <p class="cell-sub">No hay arqueos ni balances registrados para los criterios seleccionados.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 80px;">Reporte</th>
              <th style="width: 165px;">Inicio de Turno</th>
              <th style="width: 165px;">Cierre de Arqueo</th>
              <th style="width: 110px;">Sucursal</th>
              <th>Cajero / Usuario</th>
              <th style="width: 110px;">Período</th>
              <th style="width: 130px; text-align: right;">Entradas</th>
              <th style="width: 130px; text-align: right;">Salidas</th>
              <th style="width: 135px; text-align: right;">Utilidad / Saldo</th>
              <th style="width: 130px; text-align: center;">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reportes" :key="r.reporteId">
              <td class="cell-id font-mono">#{{ r.reporteId }}</td>
              <td class="cell-sub">{{ formatearFecha(r.fechaInicio) }}</td>
              <td class="cell-sub">{{ formatearFecha(r.fechaFin) }}</td>
              <td>
                <span class="sucursal-badge">{{ r.codigoSucursal }}</span>
              </td>
              <td>
                <div class="cell-bold">{{ r.nombreUsuario }}</div>
              </td>
              <td>
                <span class="kpi-badge neutral">{{ r.periodo }}</span>
              </td>
              <td style="text-align: right; font-weight: 700; font-family: var(--erp-font-mono);" class="text-success">
                +{{ formatearMonto(r.montoEntradas) }}
              </td>
              <td style="text-align: right; font-weight: 700; font-family: var(--erp-font-mono);" class="text-danger">
                -{{ formatearMonto(r.montoSalidas) }}
              </td>
              <td style="text-align: right; font-weight: 700; font-family: var(--erp-font-mono);" :class="r.utilidad >= 0 ? 'text-primary' : 'text-danger'">
                {{ formatearMonto(r.utilidad) }}
              </td>
              <td style="text-align: center;">
                <button
                  type="button"
                  class="btn-secondary btn-sm"
                  title="Ver detalle de partidas y movimientos"
                  @click="verDetalle(r.reporteId)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Ver Detalle
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DETALLE DE REPORTE Y AUDITORÍA COMPLETA -->
    <div v-if="modalDetalleVisible" class="modal-backdrop" @click.self="modalDetalleVisible = false">
      <div class="modal-card modal-card-lg" style="max-width: 900px;">
        <div class="modal-header">
          <h3 class="modal-title">
            Auditoría de Arqueo &bull; Reporte #{{ reporteDetalle?.reporteId }}
          </h3>
          <button type="button" class="btn-close-modal" @click="modalDetalleVisible = false">&times;</button>
        </div>

        <div class="modal-body">
          <div v-if="cargandoDetalle" class="empty-state" style="padding: 2.5rem 1rem;">
            <div class="spinner-small" style="width: 32px; height: 32px; margin: 0 auto 0.75rem; border: 3px solid #e2e8f0; border-top-color: var(--erp-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p class="cell-sub">Cargando desglose completo y movimientos sellados...</p>
          </div>

          <div v-else-if="reporteDetalle" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <!-- Encabezado con datos del turno y balance -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; background: var(--erp-bg-subtle, #f8fafc); border: 1px solid var(--erp-border-light); border-radius: var(--erp-radius-lg); padding: 1rem 1.25rem;">
              <div>
                <span class="cell-sub">Cajero / Responsable:</span>
                <div class="cell-bold">{{ reporteDetalle.nombreUsuario }}</div>
                <span class="cell-sub">Sucursal: {{ reporteDetalle.codigoSucursal }}</span>
              </div>
              <div>
                <span class="cell-sub">Ventana de Auditoría:</span>
                <div class="cell-bold">{{ formatearFecha(reporteDetalle.fechaInicio) }}</div>
                <span class="cell-sub">hasta {{ formatearFecha(reporteDetalle.fechaFin) }}</span>
              </div>
              <div>
                <span class="cell-sub">Total Entradas:</span>
                <div class="font-mono text-success" style="font-size: 1.15rem; font-weight: 700;">
                  +{{ formatearMonto(reporteDetalle.montoEntradas) }}
                </div>
              </div>
              <div>
                <span class="cell-sub">Total Salidas:</span>
                <div class="font-mono text-danger" style="font-size: 1.15rem; font-weight: 700;">
                  -{{ formatearMonto(reporteDetalle.montoSalidas) }}
                </div>
              </div>
              <div>
                <span class="cell-sub">Saldo Neto Final:</span>
                <div class="font-mono text-primary" style="font-size: 1.15rem; font-weight: 700;">
                  {{ formatearMonto(reporteDetalle.utilidad) }}
                </div>
              </div>
            </div>

            <!-- FRENTE A FRENTE: TABLAS DE ENTRADAS Y SALIDAS -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
              <!-- ENTRADAS -->
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--erp-success);">
                  Partidas de Entrada (Ingresos)
                </h4>
                <div class="table-container">
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Canal / Método</th>
                          <th>Descripción</th>
                          <th style="text-align: right;">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!reporteDetalle.entradas || !Array.isArray(reporteDetalle.entradas) || reporteDetalle.entradas.length === 0">
                          <td colspan="3" class="cell-sub text-center">Sin entradas registradas.</td>
                        </tr>
                        <tr v-for="(e, i) in reporteDetalle.entradas" :key="i">
                          <td><span class="kpi-badge info">{{ e.descripcion_tipo }}</span></td>
                          <td><div class="cell-bold">{{ e.descripcion }}</div></td>
                          <td style="text-align: right; font-weight: 700; font-family: var(--erp-font-mono);" class="text-success">
                            +{{ formatearMonto(e.monto) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- SALIDAS -->
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--erp-danger);">
                  Partidas de Salida (Egresos)
                </h4>
                <div class="table-container">
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Canal / Método</th>
                          <th>Descripción</th>
                          <th style="text-align: right;">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!reporteDetalle.salidas || !Array.isArray(reporteDetalle.salidas) || reporteDetalle.salidas.length === 0">
                          <td colspan="3" class="cell-sub text-center">Sin salidas registradas.</td>
                        </tr>
                        <tr v-for="(s, i) in reporteDetalle.salidas" :key="i">
                          <td><span class="kpi-badge neutral">{{ s.descripcion_tipo }}</span></td>
                          <td><div class="cell-bold">{{ s.descripcion }}</div></td>
                          <td style="text-align: right; font-weight: 700; font-family: var(--erp-font-mono);" class="text-danger">
                            -{{ formatearMonto(s.monto) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- MOVIMIENTOS SELLADOS DEL TURNO -->
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--erp-text-main);">
                Movimientos de Caja Sellados en este Arqueo
              </h4>
              <div class="table-container">
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th style="width: 70px;">ID</th>
                        <th style="width: 110px;">Tipo</th>
                        <th style="width: 120px;">Canal</th>
                        <th>Detalle</th>
                        <th style="width: 130px; text-align: right;">Monto</th>
                        <th style="width: 160px;">Fecha Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!reporteDetalle.movimientos || !Array.isArray(reporteDetalle.movimientos) || reporteDetalle.movimientos.length === 0">
                        <td colspan="6" class="cell-sub text-center" style="padding: 1.5rem;">No hubo movimientos individuales en esta ventana de tiempo.</td>
                      </tr>
                      <tr v-for="m in reporteDetalle.movimientos" :key="m.movimiento_id">
                        <td class="cell-id font-mono">#{{ m.movimiento_id }}</td>
                        <td>
                          <span class="status-badge" :class="m.tipo_movimiento === 1 ? 'activa' : 'baja'">
                            {{ m.descripcion_tipo }}
                          </span>
                        </td>
                        <td><span class="kpi-badge neutral">{{ m.descripcion_metodo }}</span></td>
                        <td><div class="cell-bold">{{ m.detalle || '-' }}</div></td>
                        <td style="text-align: right; font-weight: 700; font-family: var(--erp-font-mono);" :class="m.tipo_movimiento === 1 ? 'text-success' : 'text-danger'">
                          {{ m.tipo_movimiento === 1 ? '+' : '-' }}{{ formatearMonto(m.monto) }}
                        </td>
                        <td class="cell-sub">{{ formatearFecha(m.fecha_creacion) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="modalDetalleVisible = false">Cerrar Detalle</button>
        </div>
      </div>
    </div>

  </div>
</template>
