<script setup lang="ts">
import { useSesionesAuditoria } from './SesionesAuditoriaView'

const {
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
} = useSesionesAuditoria()
</script>

<template>
  <div class="user-wrapper">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Auditoría de Sesiones y Turnos</h1>
            <p class="page-subtitle">
              Supervisión de jornadas laborales, control de inactividad y alertas de cierre sin arqueo
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
          <select v-model="filtroSucursal" class="filter-select" @change="cargarSesiones">
            <option value="">Todas las sucursales</option>
            <option v-for="s in sucursales" :key="s.sucursalId" :value="s.sucursalId">
              {{ s.codigoInterno }} ({{ s.ciudad }})
            </option>
          </select>
        </div>

        <!-- Filtro Estado de Sesión -->
        <div class="form-group mb-0" style="min-width: 170px;">
          <select v-model="filtroSoloActivas" class="filter-select" @change="cargarSesiones">
            <option value="">Todas las sesiones</option>
            <option value="true">Turnos en Curso (Activas)</option>
            <option value="false">Turnos Cerrados</option>
          </select>
        </div>

        <!-- Filtro Fecha Desde -->
        <div class="form-group mb-0">
          <input
            v-model="filtroFechaDesde"
            type="date"
            class="filter-select"
            title="Fecha Desde"
            @change="cargarSesiones"
          />
        </div>

        <!-- Filtro Fecha Hasta -->
        <div class="form-group mb-0">
          <input
            v-model="filtroFechaHasta"
            type="date"
            class="filter-select"
            title="Fecha Hasta"
            @change="cargarSesiones"
          />
        </div>

        <!-- Búsqueda rápida por usuario -->
        <div class="search-box" style="max-width: 260px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="filtroTexto"
            type="text"
            class="search-input"
            placeholder="Buscar por usuario..."
            @keydown.enter="cargarSesiones"
          />
        </div>
      </div>

      <div class="filter-right" style="display: flex; gap: 0.5rem; align-items: center;">
        <button type="button" class="btn-secondary" @click="limpiarFiltros">
          Limpiar
        </button>
        <button type="button" class="btn-primary" @click="cargarSesiones">
          Buscar
        </button>
      </div>
    </div>

    <!-- TABLA DE SESIONES -->
    <div class="table-container">
      <div v-if="cargando" class="empty-state" style="padding: 3rem 1rem;">
        <div class="spinner-small" style="width: 32px; height: 32px; margin: 0 auto 0.75rem; border: 3px solid #e2e8f0; border-top-color: var(--erp-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p class="cell-sub">Cargando auditoría de sesiones...</p>
      </div>

      <div v-else-if="sesiones.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <h3>No se encontraron sesiones registradas</h3>
        <p class="cell-sub">No hay jornadas laborales que coincidan con los filtros de búsqueda.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 75px;">ID</th>
              <th>Usuario</th>
              <th style="width: 120px;">Rol</th>
              <th style="width: 110px;">Sucursal</th>
              <th style="width: 165px;">Apertura</th>
              <th style="width: 165px;">Cierre</th>
              <th style="width: 110px;">Duración</th>
              <th style="width: 220px;">Estado de Arqueo</th>
              <th style="width: 130px; text-align: center;">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in sesiones"
              :key="s.sesionId"
              :class="{ 'row-alert': s.alertaSinArqueo }"
            >
              <td class="cell-id font-mono">#{{ s.sesionId }}</td>
              <td>
                <div class="cell-bold">{{ s.nombreCompleto || s.usuario }}</div>
                <span class="cell-sub font-mono">@{{ s.usuario }}</span>
              </td>
              <td>
                <span class="kpi-badge info">{{ s.descripcionRol || 'Usuario' }}</span>
              </td>
              <td>
                <span class="sucursal-badge">{{ s.codigoSucursal || '-' }}</span>
              </td>
              <td class="cell-sub">{{ formatearFecha(s.horaSesionAbierta) }}</td>
              <td>
                <span v-if="s.estaActiva" class="status-badge activa">
                  Turno en Curso
                </span>
                <span v-else class="cell-sub">
                  {{ formatearFecha(s.horaSesionCerrada) }}
                </span>
              </td>
              <td class="cell-sub font-mono">{{ formatearDuracion(s.duracionSesion) }}</td>
              <td>
                <!-- Alerta destacada en rojo si cerró con ventas sin arqueo -->
                <span v-if="s.alertaSinArqueo" class="status-badge baja">
                  Alerta: Cerrada sin arqueo (con actividad)
                </span>
                <span v-else-if="s.reporteId" class="status-badge activa">
                  Cerrada con arqueo (R-{{ s.reporteId }})
                </span>
                <span v-else-if="s.estaActiva" class="kpi-badge neutral">
                  Turno en curso
                </span>
                <span v-else class="kpi-badge neutral">
                  Cerrada sin actividad
                </span>
              </td>
              <td style="text-align: center;">
                <button
                  v-if="s.reporteId"
                  type="button"
                  class="btn-secondary btn-sm"
                  title="Ver Reporte de Arqueo generado"
                  @click="verReporte(s.reporteId)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Ver Arqueo
                </button>
                <span v-else class="cell-sub">&mdash;</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DETALLE DE REPORTE VINCULADO -->
    <div v-if="modalReporteVisible" class="modal-backdrop" @click.self="modalReporteVisible = false">
      <div class="modal-card modal-card-lg" style="max-width: 820px;">
        <div class="modal-header">
          <h3 class="modal-title">
            Detalle de Arqueo &bull; Reporte #{{ reporteDetalle?.reporteId }}
          </h3>
          <button type="button" class="btn-close-modal" @click="modalReporteVisible = false">&times;</button>
        </div>

        <div class="modal-body">
          <div v-if="cargandoDetalle" class="empty-state" style="padding: 2rem 1rem;">
            <div class="spinner-small" style="width: 28px; height: 28px; margin: 0 auto 0.5rem; border: 3px solid #e2e8f0; border-top-color: var(--erp-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p class="cell-sub">Cargando reporte de arqueo...</p>
          </div>

          <div v-else-if="reporteDetalle" style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Resumen superior -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; background: var(--erp-bg-subtle, #f8fafc); border: 1px solid var(--erp-border-light); border-radius: var(--erp-radius-lg); padding: 0.85rem 1rem;">
              <div>
                <span class="cell-sub">Cajero / Usuario:</span>
                <div class="cell-bold">{{ reporteDetalle.nombreUsuario }}</div>
              </div>
              <div>
                <span class="cell-sub">Sucursal:</span>
                <div class="cell-bold">{{ reporteDetalle.codigoSucursal }}</div>
              </div>
              <div>
                <span class="cell-sub">Total Entradas:</span>
                <strong class="text-success font-mono">{{ formatearMonto(reporteDetalle.montoEntradas) }}</strong>
              </div>
              <div>
                <span class="cell-sub">Total Salidas:</span>
                <strong class="text-danger font-mono">{{ formatearMonto(reporteDetalle.montoSalidas) }}</strong>
              </div>
              <div>
                <span class="cell-sub">Utilidad / Saldo:</span>
                <strong class="text-primary font-mono">{{ formatearMonto(reporteDetalle.utilidad) }}</strong>
              </div>
            </div>

            <!-- Tablas de partidas -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--erp-text-secondary); margin-bottom: 0.45rem;">Entradas Registradas</h4>
                <div class="table-container">
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th style="text-align: right;">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!reporteDetalle.entradas || !Array.isArray(reporteDetalle.entradas) || reporteDetalle.entradas.length === 0">
                          <td colspan="2" class="cell-sub text-center">Sin entradas</td>
                        </tr>
                        <tr v-for="(e, i) in reporteDetalle.entradas" :key="i">
                          <td>
                            <div class="cell-bold">{{ e.descripcion }}</div>
                            <span class="cell-sub">{{ e.descripcion_tipo }}</span>
                          </td>
                          <td style="text-align: right; font-weight: 700; font-family: var(--erp-font-mono);" class="text-success">
                            +{{ formatearMonto(e.monto) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--erp-text-secondary); margin-bottom: 0.45rem;">Salidas Registradas</h4>
                <div class="table-container">
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th style="text-align: right;">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!reporteDetalle.salidas || !Array.isArray(reporteDetalle.salidas) || reporteDetalle.salidas.length === 0">
                          <td colspan="2" class="cell-sub text-center">Sin salidas</td>
                        </tr>
                        <tr v-for="(s, i) in reporteDetalle.salidas" :key="i">
                          <td>
                            <div class="cell-bold">{{ s.descripcion }}</div>
                            <span class="cell-sub">{{ s.descripcion_tipo }}</span>
                          </td>
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
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="modalReporteVisible = false">Cerrar</button>
        </div>
      </div>
    </div>

  </div>
</template>
