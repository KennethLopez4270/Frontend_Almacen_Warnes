<script setup lang="ts">
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import { useMovimientosCaja } from './MovimientosCajaView'

const {
  authStore,
  cargando,
  guardando,
  consolidando,
  error,
  mensajeExito,
  movimientos,
  movimientosPendientes,
  movimientosPorConsolidar,
  selectedMovimientoIds,
  todosSeleccionados,
  sucursales,
  filtroTipo,
  filtroEstado,
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
  toggleSeleccionarTodos,
  toggleSeleccionarFila,
  consolidarUno,
  consolidarSeleccionados,
  consolidarPendientesDirectos,
  abrirModalCrear,
  guardarNuevoMovimiento,
  abrirModalEditar,
  guardarEdicion,
  abrirModalEliminar,
  confirmarEliminacion,
  formatearFecha,
  formatearMonto,
} = useMovimientosCaja()
</script>

<template>
  <div class="user-wrapper">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Movimientos de Caja</h1>
            <p class="page-subtitle">
              Registro y control de entradas y salidas de efectivo y pagos
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right" style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
        <button
          v-if="!authStore.isCajero && selectedMovimientoIds.length > 0"
          type="button"
          class="btn-secondary"
          :disabled="consolidando"
          @click="consolidarSeleccionados"
        >
          {{ consolidando ? 'Consolidando...' : `Consolidar Seleccionados (${selectedMovimientoIds.length})` }}
        </button>
        <button
          v-else-if="!authStore.isCajero && movimientosPorConsolidar.length > 0"
          type="button"
          class="btn-secondary"
          :disabled="consolidando"
          @click="consolidarPendientesDirectos"
        >
          {{ consolidando ? 'Consolidando...' : `Consolidar Pendientes (${movimientosPorConsolidar.length})` }}
        </button>
        <button type="button" class="btn-primary" @click="abrirModalCrear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo Movimiento
        </button>
      </div>
    </header>

    <!-- MENSAJES DE ALERTA -->
    <div v-if="mensajeExito" class="alert alert-success mb-2">
      <span>{{ mensajeExito }}</span>
    </div>
    <div v-if="error" class="alert alert-danger mb-2">
      <span>{{ error }}</span>
    </div>

    <!-- BARRA DE FILTROS GLOBALES -->
    <div class="filter-card">
      <div class="filter-left" style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
        <!-- Selector de Sucursal si es Propietario -->
        <div v-if="authStore.isPropietario" class="form-group mb-0" style="min-width: 180px;">
          <select v-model="filtroSucursal" class="filter-select" @change="cargarMovimientos">
            <option value="">Todas las sucursales</option>
            <option v-for="s in sucursales" :key="s.sucursalId" :value="s.sucursalId">
              {{ s.codigoInterno }} ({{ s.ciudad }})
            </option>
          </select>
        </div>

        <!-- Filtro Tipo -->
        <div class="form-group mb-0" style="min-width: 150px;">
          <select v-model="filtroTipo" class="filter-select" @change="cargarMovimientos">
            <option value="">Todos los tipos</option>
            <option :value="1">Entrada (+)</option>
            <option :value="2">Salida (-)</option>
          </select>
        </div>

        <!-- Filtro Fecha Desde -->
        <div class="form-group mb-0">
          <input
            v-model="filtroFechaDesde"
            type="date"
            class="filter-select"
            title="Fecha Desde"
            @change="cargarMovimientos"
          />
        </div>

        <!-- Filtro Fecha Hasta -->
        <div class="form-group mb-0">
          <input
            v-model="filtroFechaHasta"
            type="date"
            class="filter-select"
            title="Fecha Hasta"
            @change="cargarMovimientos"
          />
        </div>

        <!-- Filtro de Estado -->
        <div class="form-group mb-0" style="min-width: 195px;">
          <select v-model="filtroEstado" class="filter-select" @change="cargarMovimientos">
            <option value="">Todos los estados</option>
            <option value="PENDIENTES">Pendientes / Por consolidar</option>
            <option value="CONSOLIDADOS">Consolidados</option>
          </select>
        </div>
      </div>

      <div class="filter-right" style="display: flex; gap: 0.5rem; align-items: center;">
        <button type="button" class="btn-secondary" @click="limpiarFiltros">
          Limpiar
        </button>
        <button type="button" class="btn-primary" @click="cargarMovimientos">
          Buscar
        </button>
      </div>
    </div>

    <!-- TABLA DE MOVIMIENTOS -->
    <div class="table-container">
      <div v-if="cargando" class="empty-state" style="padding: 3rem 1rem;">
        <div class="spinner-small" style="width: 32px; height: 32px; margin: 0 auto 0.75rem; border: 3px solid #e2e8f0; border-top-color: var(--erp-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p class="cell-sub">Cargando movimientos de caja...</p>
      </div>

      <div v-else-if="movimientos.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
        </svg>
        <h3>No se encontraron movimientos</h3>
        <p class="cell-sub">No hay registros de entradas ni salidas con los filtros aplicados.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th v-if="!authStore.isCajero" style="width: 38px; text-align: center;">
                <input
                  type="checkbox"
                  :checked="todosSeleccionados"
                  :disabled="movimientosPendientes.length === 0"
                  title="Seleccionar todos los movimientos pendientes"
                  @change="toggleSeleccionarTodos"
                />
              </th>
              <th style="width: 75px;">ID</th>
              <th style="width: 165px;">Fecha y Hora</th>
              <th style="width: 120px;">Tipo</th>
              <th style="width: 120px;">Método</th>
              <th>Detalle / Descripción</th>
              <th style="width: 130px; text-align: right;">Monto</th>
              <th style="width: 160px;">Registrado Por</th>
              <th style="width: 155px; text-align: center;">Estado</th>
              <th style="width: 120px; text-align: center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in movimientos" :key="m.movimientoId">
              <td v-if="!authStore.isCajero" style="text-align: center;">
                <input
                  v-if="!m.sellado"
                  type="checkbox"
                  :checked="selectedMovimientoIds.includes(m.movimientoId)"
                  title="Seleccionar para consolidar"
                  @change="toggleSeleccionarFila(m.movimientoId)"
                />
              </td>
              <td class="cell-id font-mono">#{{ m.movimientoId }}</td>
              <td class="cell-sub">{{ formatearFecha(m.fechaCreacion) }}</td>
              <td>
                <span class="status-badge" :class="m.tipoMovimiento === 1 ? 'activa' : 'baja'">
                  {{ m.tipoMovimiento === 1 ? 'Entrada' : 'Salida' }}
                </span>
              </td>
              <td>
                <span class="kpi-badge neutral">{{ m.descripcionMetodo || 'Efectivo' }}</span>
              </td>
              <td>
                <div class="cell-bold">{{ m.detalle || '-' }}</div>
              </td>
              <td style="text-align: right; font-weight: 700; font-family: var(--erp-font-mono);" :class="m.tipoMovimiento === 1 ? 'text-success' : 'text-danger'">
                {{ m.tipoMovimiento === 1 ? '+' : '-' }}{{ formatearMonto(m.monto) }}
              </td>
              <td class="cell-sub">{{ m.nombreUsuario }}</td>
              <td style="text-align: center;">
                <span
                  v-if="m.sellado"
                  class="kpi-badge info"
                  :title="`Consolidado en Reporte #${m.reporteId} de Libro Mayor`"
                >
                  Consolidado (R-{{ m.reporteId }})
                </span>
                <span
                  v-else-if="m.requiereConsolidacion"
                  class="kpi-badge warning"
                  :title="m.rolUsuario === 1 ? 'El turno del cajero cerró sin arqueo — requiere consolidación en Libro Mayor' : 'Movimiento administrativo — pendiente de consolidar en Libro Mayor'"
                >
                  {{ m.rolUsuario === 1 ? 'Sin Arqueo' : 'Por Consolidar' }}
                </span>
                <span
                  v-else
                  class="kpi-badge neutral"
                  title="Pendiente en turno activo del cajero — se consolidará en su arqueo"
                >
                  En Turno
                </span>
              </td>
              <td style="text-align: center;">
                <div v-if="!m.sellado" class="td-actions" style="justify-content: center;">
                  <button
                    v-if="!authStore.isCajero"
                    type="button"
                    class="action-btn"
                    title="Consolidar en Libro Mayor"
                    :disabled="consolidando"
                    @click="consolidarUno(m)"
                  >
                    <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button type="button" class="action-btn" title="Modificar movimiento" @click="abrirModalEditar(m)">
                    <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button type="button" class="action-btn action-btn-danger" title="Dar de baja movimiento" @click="abrirModalEliminar(m)">
                    <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                <span v-else class="cell-sub" title="Consolidado en Libro Mayor">&mdash;</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL CREAR MOVIMIENTO -->
    <div v-if="modalCrearVisible" class="modal-backdrop" @click.self="modalCrearVisible = false">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <h3 class="modal-title">Registrar Movimiento de Caja</h3>
          <button type="button" class="btn-close-modal" @click="modalCrearVisible = false">&times;</button>
        </div>
        <form @submit.prevent="guardarNuevoMovimiento" class="modal-form">
          <div class="modal-body">
            <!-- Selector de sucursal sólo si es Propietario -->
            <div v-if="authStore.isPropietario" class="form-group mb-2">
              <label class="form-label">Sucursal Destino <span class="required">*</span></label>
              <select v-model.number="formCrear.sucursalId" class="form-select" required>
                <option :value="null" disabled>Seleccione la sucursal</option>
                <option v-for="s in sucursales" :key="s.sucursalId" :value="s.sucursalId">
                  {{ s.codigoInterno }} — {{ s.ciudad }} ({{ s.direccion }})
                </option>
              </select>
            </div>

            <div class="form-row mb-2">
              <div class="form-group mb-0">
                <label class="form-label">Tipo de Movimiento</label>
                <select v-model.number="formCrear.tipoMovimiento" class="form-select" required>
                  <option :value="1">Entrada (Ingreso)</option>
                  <option :value="2">Salida (Gasto o retiro)</option>
                </select>
              </div>

              <div class="form-group mb-0">
                <label class="form-label">Método / Canal</label>
                <select v-model.number="formCrear.metodoMovimiento" class="form-select" required>
                  <option v-for="m in METODOS_CONCEPTO" :key="m.id" :value="m.id">{{ m.label }}</option>
                </select>
              </div>
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Monto (Bs.) <span class="required">*</span></label>
              <input v-model.number="formCrear.monto" type="number" step="0.01" min="0.01" class="form-control" placeholder="0.00" required />
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Detalle o Motivo <span class="required">*</span></label>
              <input v-model="formCrear.detalle" maxlength="40" class="form-control" placeholder="Ej: Pago de flete a distribuidor" required />
              <span class="cell-sub" style="font-size: 0.75rem; color: var(--erp-text-muted); margin-top: 0.2rem;">{{ (formCrear.detalle || '').length }}/40 caracteres</span>
            </div>

            <div v-if="!authStore.isCajero" class="form-group mb-0" style="margin-top: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: var(--erp-font-xs); font-weight: 600; color: var(--erp-text-primary);">
                <input v-model="formCrear.consolidarDirecto" type="checkbox" />
                <span>Consolidar directamente en Libro Mayor</span>
              </label>
              <span class="cell-sub" style="display: block; font-size: 0.72rem; color: var(--erp-text-muted); margin-top: 0.2rem;">
                Como no realiza arqueo de turno, active esta opción para registrarlo ya consolidado.
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="modalCrearVisible = false">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Guardar Movimiento' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL EDITAR MOVIMIENTO -->
    <div v-if="modalEditarVisible" class="modal-backdrop" @click.self="modalEditarVisible = false">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <h3 class="modal-title">Editar Movimiento #{{ movimientoSeleccionado?.movimientoId }}</h3>
          <button type="button" class="btn-close-modal" @click="modalEditarVisible = false">&times;</button>
        </div>
        <form @submit.prevent="guardarEdicion" class="modal-form">
          <div class="modal-body">
            <div class="form-row mb-2">
              <div class="form-group mb-0">
                <label class="form-label">Tipo de Movimiento</label>
                <select v-model.number="formEditar.tipoMovimiento" class="form-select" required>
                  <option :value="1">Entrada (Ingreso)</option>
                  <option :value="2">Salida (Egreso)</option>
                </select>
              </div>

              <div class="form-group mb-0">
                <label class="form-label">Método / Canal</label>
                <select v-model.number="formEditar.metodoMovimiento" class="form-select" required>
                  <option v-for="m in METODOS_CONCEPTO" :key="m.id" :value="m.id">{{ m.label }}</option>
                </select>
              </div>
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Monto (Bs.)</label>
              <input v-model.number="formEditar.monto" type="number" step="0.01" min="0.01" class="form-control" required />
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Detalle o Motivo</label>
              <input v-model="formEditar.detalle" maxlength="40" class="form-control" required />
              <span class="cell-sub" style="font-size: 0.75rem; color: var(--erp-text-muted); margin-top: 0.2rem;">{{ (formEditar.detalle || '').length }}/40 caracteres</span>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="modalEditarVisible = false">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Actualizar Movimiento' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL CONFIRMAR ELIMINACIÓN -->
    <div v-if="modalEliminarVisible" class="modal-backdrop" @click.self="modalEliminarVisible = false">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <h3 class="modal-title text-danger">Eliminar Movimiento</h3>
          <button type="button" class="btn-close-modal" @click="modalEliminarVisible = false">&times;</button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro de que desea eliminar lógicamente este movimiento de caja?</p>
          <div style="background: var(--erp-bg-subtle, #f8fafc); border: 1px solid var(--erp-border-light); border-radius: var(--erp-radius-lg); padding: 0.85rem; margin: 0.75rem 0;">
            <div class="cell-bold">#{{ movimientoSeleccionado?.movimientoId }} &bull; {{ movimientoSeleccionado?.detalle }}</div>
            <span class="cell-sub font-mono">Monto: {{ formatearMonto(movimientoSeleccionado?.monto) }}</span>
          </div>
          <p class="cell-sub">Esta acción solo puede realizarse antes de que el movimiento sea consolidado en Libro Mayor.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="modalEliminarVisible = false">Cancelar</button>
          <button type="button" class="btn-danger" :disabled="guardando" @click="confirmarEliminacion">
            {{ guardando ? 'Eliminando...' : 'Sí, Eliminar' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
