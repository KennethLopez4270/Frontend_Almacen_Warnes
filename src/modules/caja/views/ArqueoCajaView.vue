<script setup lang="ts">
import { useArqueoCaja } from './ArqueoCajaView'

const {
  authStore,
  esCajero,
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
  totalEntradasFinal,
  totalSalidasFinal,
  utilidadArqueo,
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
} = useArqueoCaja()
</script>

<template>
  <div class="user-wrapper">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <h1 class="page-title">Arqueo y Cierre de Turno</h1>
            <p class="page-subtitle">
              Verificación física de valores, balance de ingresos/egresos y cierre de jornada
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <div class="arq-branch-badge" title="Sucursal de trabajo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
          </svg>
          <span>{{ authStore.sucursalNombre || 'Sucursal Central' }}</span>
        </div>

        <div class="arq-branch-badge" title="Usuario activo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>{{ authStore.nombreCompleto || 'Usuario' }}</span>
        </div>
      </div>
    </header>

    <!-- SPINNER CARGANDO -->
    <div v-if="cargando" class="loading-state">
      <div class="spinner-large"></div>
      <p class="text-muted text-sm">Cargando actividad y estado del turno...</p>
    </div>

    <!-- ERROR -->
    <div v-else-if="error" class="alert alert-danger">
      <span>{{ error }}</span>
    </div>

    <!-- CASO: SIN TURNO ACTIVO -->
    <div v-else-if="sinTurnoActivo || !resumen" class="arq-shift-banner" style="flex-direction: column; align-items: flex-start;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div class="arq-shift-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--erp-text-main); margin: 0;">
            No tiene un turno de caja activo abierto
          </h3>
          <p v-if="esCajero" class="text-muted text-sm" style="margin: 0.25rem 0 0 0;">
            Actualmente no tiene una sesión laboral abierta en la sucursal. Ingrese a la Terminal POS para registrar ventas.
          </p>
          <p v-else class="text-muted text-sm" style="margin: 0.25rem 0 0 0;">
            Su usuario ({{ authStore.rolNombre || 'Administrador' }}) no tiene un turno de caja con ventas pendientes de arqueo. Puede consultar los reportes generados en el Libro Mayor o auditar sesiones.
          </p>
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem;">
        <router-link to="/caja/libro-mayor" class="btn-primary" style="text-decoration: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          </svg>
          <span>Ir a Libro Mayor y Reportes</span>
        </router-link>

        <router-link v-if="!esCajero" to="/admin/sesiones" class="btn-secondary" style="text-decoration: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span>Auditar Sesiones Activas</span>
        </router-link>

        <router-link v-if="esCajero" to="/pos" class="btn-secondary" style="text-decoration: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span>Ir a Terminal de Ventas (POS)</span>
        </router-link>

        <button type="button" class="btn-secondary" @click="cargarResumenTurno">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>Reintentar</span>
        </button>
      </div>
    </div>

    <!-- CASO: TURNO ACTIVO DISPONIBLE PARA ARQUEO -->
    <div v-else>
      <!-- BANNER DE TURNO ACTIVO -->
      <div class="arq-shift-banner">
        <div class="arq-shift-info">
          <div class="arq-shift-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--erp-text-main); margin: 0;">
              Turno Laboral Iniciado: {{ formatearFechaHora(resumen.horaInicioTurno) }}
            </h3>
            <p class="text-muted text-sm" style="margin: 0.2rem 0 0 0;">
              Consolida todas las transacciones registradas desde la apertura hasta el momento del corte
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <span class="kpi-badge" :class="resumen.requiereArqueo ? 'warning' : 'neutral'">
            {{ resumen.requiereArqueo ? 'Actividad Registrada' : 'Sin Ventas Registradas' }}
          </span>

          <button
            type="button"
            class="btn-secondary"
            :disabled="guardando || omitiendo"
            @click="modalOmitirVisible = true"
          >
            <span>Omitir Arqueo</span>
          </button>

          <button
            type="button"
            class="btn-primary"
            :disabled="guardando || omitiendo"
            @click="abrirConfirmacionArqueo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{{ guardando ? 'Procesando...' : 'Confirmar Arqueo y Cierre' }}</span>
          </button>
        </div>
      </div>

      <!-- KPIS DE VENTAS DEL TURNO -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-box blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Ventas Totales Sistema</span>
            <span class="kpi-value font-mono">{{ formatearMonto(resumen.totalVentasGeneral) }}</span>
            <span class="kpi-desc">{{ resumen.conteoVentas }} ventas registradas</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Ventas en Efectivo</span>
            <span class="kpi-value font-mono">{{ formatearMonto(resumen.totalVentasEfectivo) }}</span>
            <span class="kpi-desc">Fondo en gaveta de caja</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Ventas por QR / Digital</span>
            <span class="kpi-value font-mono">{{ formatearMonto(resumen.totalVentasQr) }}</span>
            <span class="kpi-desc">Comprobantes QR</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Ventas con Tarjeta (POS)</span>
            <span class="kpi-value font-mono">{{ formatearMonto(resumen.totalVentasTarjeta) }}</span>
            <span class="kpi-desc">Comprobantes de voucher</span>
          </div>
        </div>
      </section>

      <!-- FRENTE A FRENTE: INGRESOS Y EGRESOS -->
      <div class="arq-frente-a-frente">
        <!-- PANEL IZQUIERDO: INGRESOS -->
        <div class="arq-col-panel">
          <div class="arq-panel-header">
            <h4 class="arq-panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; color: var(--erp-success);">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              <span>Ingresos (Entradas de Caja)</span>
            </h4>
            <span class="status-badge activa font-mono">
              Total: {{ formatearMonto(totalEntradasFinal) }}
            </span>
          </div>

          <div class="arq-panel-body">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th style="width: 120px; text-align: right;">Monto</th>
                    <th style="width: 44px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, idx) in entradasDeclaradas" :key="'ent-' + idx">
                    <td>
                      <div class="font-semibold">{{ p.descripcion }}</div>
                      <div v-if="p.esSistema" class="text-xs text-muted">
                        Recuperado automáticamente (no editable)
                      </div>
                      <div v-else class="text-xs text-muted">
                        Entrada adicional declarada
                      </div>
                    </td>
                    <td style="text-align: right;">
                      <!-- Filas del sistema son solo lectura -->
                      <span v-if="p.esSistema" class="font-mono font-semibold" style="color: var(--erp-text-main);">
                        {{ formatearMonto(p.monto) }}
                      </span>
                      <!-- Entradas adicionales declaradas sí se pueden editar -->
                      <input
                        v-else
                        v-model.number="p.monto"
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-control arq-input-compact font-mono text-right"
                      />
                    </td>
                    <td style="text-align: center;">
                      <button
                        v-if="!p.esSistema"
                        type="button"
                        class="action-btn action-btn-danger"
                        title="Eliminar"
                        @click="eliminarEntrada(idx)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                      <span v-else title="Monto fijo de sistema" class="text-muted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                    </td>
                  </tr>

                  <!-- Movimientos extra-venta de entrada -->
                  <tr v-for="m in movimientosEntradaList" :key="'mov-ent-' + m.movimiento_id" style="background-color: var(--erp-bg-hover);">
                    <td>
                      <div class="font-semibold">{{ m.detalle || 'Ingreso de caja' }}</div>
                      <div class="text-xs" style="color: var(--erp-success);">Movimiento de caja del turno</div>
                    </td>
                    <td class="text-right font-mono font-semibold" style="color: var(--erp-success);">
                      {{ formatearMonto(m.monto) }}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Agregar entrada extra -->
            <div class="arq-add-row-form">
              <select v-model="nuevaEntrada.tipo" class="form-select arq-input-compact">
                <option v-for="m in METODOS_CONCEPTO" :key="m.id" :value="m.id">{{ m.label }}</option>
              </select>
              <input
                v-model="nuevaEntrada.descripcion"
                type="text"
                placeholder="Descripción ingreso..."
                class="form-control arq-input-compact"
              />
              <input
                v-model.number="nuevaEntrada.monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                class="form-control arq-input-compact"
              />
              <button type="button" class="action-btn" title="Agregar ingreso" @click="agregarEntrada">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- PANEL DERECHO: EGRESOS -->
        <div class="arq-col-panel">
          <div class="arq-panel-header">
            <h4 class="arq-panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; color: var(--erp-danger);">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              <span>Egresos (Salidas de Caja)</span>
            </h4>
            <span class="status-badge baja font-mono">
              Total: {{ formatearMonto(totalSalidasFinal) }}
            </span>
          </div>

          <div class="arq-panel-body">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th style="width: 120px; text-align: right;">Monto</th>
                    <th style="width: 44px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="salidasDeclaradas.length === 0 && movimientosSalidaList.length === 0">
                    <td colspan="3" class="text-center text-muted" style="padding: 1.5rem 0;">
                      Sin salidas registradas en este turno
                    </td>
                  </tr>

                  <tr v-for="(p, idx) in salidasDeclaradas" :key="'sal-' + idx">
                    <td>
                      <div class="font-semibold">{{ p.descripcion }}</div>
                      <div class="text-xs text-muted">Salida adicional declarada</div>
                    </td>
                    <td style="text-align: right;">
                      <input
                        v-model.number="p.monto"
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-control arq-input-compact font-mono text-right"
                      />
                    </td>
                    <td style="text-align: center;">
                      <button
                        type="button"
                        class="action-btn action-btn-danger"
                        title="Eliminar"
                        @click="eliminarSalida(idx)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>

                  <!-- Movimientos extra-venta de salida -->
                  <tr v-for="m in movimientosSalidaList" :key="'mov-sal-' + m.movimiento_id" style="background-color: var(--erp-bg-hover);">
                    <td>
                      <div class="font-semibold">{{ m.detalle || 'Egreso de caja' }}</div>
                      <div class="text-xs" style="color: var(--erp-danger);">Movimiento de caja del turno</div>
                    </td>
                    <td class="text-right font-mono font-semibold" style="color: var(--erp-danger);">
                      {{ formatearMonto(m.monto) }}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Agregar salida extra -->
            <div class="arq-add-row-form">
              <select v-model="nuevaSalida.tipo" class="form-select arq-input-compact">
                <option v-for="m in METODOS_CONCEPTO" :key="m.id" :value="m.id">{{ m.label }}</option>
              </select>
              <input
                v-model="nuevaSalida.descripcion"
                type="text"
                placeholder="Descripción egreso..."
                class="form-control arq-input-compact"
              />
              <input
                v-model.number="nuevaSalida.monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                class="form-control arq-input-compact"
              />
              <button type="button" class="action-btn" title="Agregar egreso" @click="agregarSalida">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- BALANCE FINAL Y DIFERENCIA DEL ARQUEO -->
      <div class="arq-balance-summary-card">
        <div class="arq-balance-grid">
          <div>
            <span class="kpi-label">Total Entradas</span>
            <div class="font-mono" style="font-size: 1.2rem; font-weight: 700; color: var(--erp-success); margin-top: 0.25rem;">
              {{ formatearMonto(totalEntradasFinal) }}
            </div>
          </div>

          <div>
            <span class="kpi-label">Total Salidas</span>
            <div class="font-mono" style="font-size: 1.2rem; font-weight: 700; color: var(--erp-danger); margin-top: 0.25rem;">
              {{ formatearMonto(totalSalidasFinal) }}
            </div>
          </div>

          <div>
            <span class="kpi-label">Utilidad / Saldo Neto</span>
            <div class="font-mono" style="font-size: 1.3rem; font-weight: 700; color: var(--erp-text-main); margin-top: 0.25rem;">
              {{ formatearMonto(utilidadArqueo) }}
            </div>
          </div>

          <div>
            <span class="kpi-label">Diferencia de Arqueo</span>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
              <span
                class="kpi-badge font-mono"
                :class="diferenciaVentas === 0 ? 'success' : diferenciaVentas > 0 ? 'warning' : 'danger'"
                style="font-size: 0.9rem; padding: 0.25rem 0.65rem;"
              >
                {{ diferenciaVentas > 0 ? '+' : '' }}{{ formatearMonto(diferenciaVentas) }}
              </span>
              <span class="text-xs text-muted">
                {{ diferenciaVentas === 0 ? 'Cuadrado' : diferenciaVentas > 0 ? 'Sobrante / Extra' : 'Faltante' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- TOP PRODUCTOS VENDIDOS EN EL TURNO -->
      <div v-if="resumen.topProductos && Array.isArray(resumen.topProductos) && resumen.topProductos.length > 0" class="table-container" style="margin-bottom: 1.5rem;">
        <div class="arq-table-header">
          <div>
            <h4 class="arq-table-title">Top Productos Vendidos en este Turno</h4>
            <p class="arq-table-subtitle">Artículos con mayor rotación en la jornada</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th style="width: 110px; text-align: center;">Cantidad</th>
                <th style="width: 150px; text-align: right;">Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(tp, idx) in resumen.topProductos" :key="'tp-' + idx">
                <td class="font-semibold">{{ tp.producto }}</td>
                <td class="text-center font-mono">{{ tp.cantidad }}</td>
                <td class="text-right font-mono font-semibold">
                  {{ formatearMonto(tp.subtotal) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL 1: CONFIRMAR ARQUEO Y CIERRE DE TURNO -->
    <div v-if="modalConfirmarVisible" class="modal-backdrop" @click.self="modalConfirmarVisible = false">
      <div class="modal-card modal-card-sm" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">Confirmar Cierre y Arqueo de Turno</h3>
          <button type="button" class="btn-close-modal" @click="modalConfirmarVisible = false">&times;</button>
        </div>

        <div class="modal-body">
          <p class="text-sm text-muted" style="margin-top: 0;">
            Se generará un reporte de corte atómico en la base de datos y se sellarán todos los movimientos de caja registrados durante esta sesión laboral.
          </p>

          <div class="arq-callout-box" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.825rem; margin-bottom: 0.35rem;">
              <span class="text-muted">Total Entradas:</span>
              <strong class="font-mono" style="color: var(--erp-success);">{{ formatearMonto(totalEntradasFinal) }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.825rem; margin-bottom: 0.35rem;">
              <span class="text-muted">Total Salidas:</span>
              <strong class="font-mono" style="color: var(--erp-danger);">{{ formatearMonto(totalSalidasFinal) }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; border-top: 1px solid var(--erp-border-row); padding-top: 0.45rem;">
              <span>Balance Neto / Utilidad:</span>
              <span class="font-mono">{{ formatearMonto(utilidadArqueo) }}</span>
            </div>
          </div>

          <div v-if="!esCajero" style="margin-top: 0.75rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.825rem; color: var(--erp-text-secondary); cursor: pointer;">
              <input v-model="permanecerEnSistema" type="checkbox" />
              <span>Permanecer en el sistema e ir al Libro Mayor (no cerrar sesión general)</span>
            </label>
          </div>
          <div v-else class="alert alert-warning" style="margin-bottom: 0;">
            Al confirmar el arqueo como cajero, se cerrará automáticamente su sesión y volverá a la pantalla de inicio.
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-secondary"
            :disabled="guardando"
            @click="modalConfirmarVisible = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="guardando"
            @click="confirmarArqueoYCerrar"
          >
            <span>{{ guardando ? 'Registrando...' : 'Confirmar y Guardar' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: OMITIR ARQUEO Y SALIR -->
    <div v-if="modalOmitirVisible" class="modal-backdrop" @click.self="modalOmitirVisible = false">
      <div class="modal-card modal-card-sm" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">¿Omitir Arqueo y Salir?</h3>
          <button type="button" class="btn-close-modal" @click="modalOmitirVisible = false">&times;</button>
        </div>

        <div class="modal-body">
          <p class="text-sm text-muted" style="margin-top: 0;">
            Si omite el arqueo formal, su turno laboral se marcará como cerrado pero <strong>no se creará un reporte de corte auditado ni se consolidarán las partidas declaradas</strong>.
          </p>
          <div class="alert alert-danger" style="margin-bottom: 0;">
            Se cerrará su sesión de trabajo inmediatamente.
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-secondary"
            :disabled="omitiendo"
            @click="modalOmitirVisible = false"
          >
            Volver
          </button>
          <button
            type="button"
            class="btn-danger"
            :disabled="omitiendo"
            @click="ejecutarOmitirArqueo"
          >
            <span>{{ omitiendo ? 'Cerrando...' : 'Sí, Omitir y Salir' }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped src="./ArqueoCajaView.css"></style>
