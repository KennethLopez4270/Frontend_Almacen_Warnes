<script setup lang="ts">
import { useArqueoCaja } from './ArqueoCajaView'

const {
  authStore,
  cargando,
  guardando,
  omitiendo,
  error,
  resumen,
  modalOmitirVisible,
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
  confirmarArqueoYCerrar,
  ejecutarOmitirArqueo,
  formatearFecha,
  formatearMonto,
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
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Arqueo y Cierre de Turno</h1>
            <p class="page-subtitle">
              {{ authStore.sucursalNombre || 'Sucursal' }} &bull; Cajero: {{ authStore.nombreCompleto }}
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <button
          type="button"
          class="btn-secondary"
          :disabled="cargando || guardando"
          @click="modalOmitirVisible = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Omitir Arqueo y Salir
        </button>

        <button
          type="button"
          class="btn-primary"
          :disabled="cargando || guardando"
          @click="confirmarArqueoYCerrar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ guardando ? 'Registrando...' : 'Confirmar Arqueo y Cerrar Sesión' }}
        </button>
      </div>
    </header>

    <!-- SPINNER CARGANDO -->
    <div v-if="cargando" class="empty-state" style="padding: 4rem 1rem;">
      <div class="spinner-small" style="width: 36px; height: 36px; margin: 0 auto 1rem; border: 3px solid #e2e8f0; border-top-color: var(--erp-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p class="cell-sub">Cargando actividad y movimientos del turno...</p>
    </div>

    <!-- ERROR -->
    <div v-else-if="error" class="alert alert-danger mb-3">
      <span>{{ error }}</span>
    </div>

    <!-- CONTENIDO PRINCIPAL -->
    <div v-else-if="resumen" class="arqueo-container">

      <!-- BANNER DE JORNADA LABORAL -->
      <div class="banner-jornada-card">
        <div class="banner-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="banner-svg">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="banner-content">
          <h3 class="banner-title">Turno Laboral en Auditoría</h3>
          <p class="banner-text">
            Usted inició sesión el <strong>{{ formatearFecha(resumen.horaInicioTurno) }}</strong>.
            Este arqueo consolida todas sus ventas y movimientos registrados desde esa hora hasta el momento del cierre.
          </p>
        </div>
        <div>
          <span class="status-badge" :class="resumen.requiereArqueo ? 'activa' : 'neutral'">
            {{ resumen.requiereArqueo ? 'Actividad Registrada' : 'Sin Ventas ni Movimientos' }}
          </span>
        </div>
      </div>

      <!-- KPIS DEL TURNO -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Ventas Totales (Sistema)</span>
          <div class="kpi-value-row">
            <span class="kpi-value text-primary">{{ formatearMonto(resumen.totalVentasGeneral) }}</span>
          </div>
          <span class="cell-sub">{{ resumen.conteoVentas }} transacciones registradas</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Ventas en Efectivo</span>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ formatearMonto(resumen.totalVentasEfectivo) }}</span>
          </div>
          <span class="cell-sub">Cobro directo en caja</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Ventas QR / Digital</span>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ formatearMonto(resumen.totalVentasQr) }}</span>
          </div>
          <span class="cell-sub">Comprobantes QR</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Ventas con Tarjeta</span>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ formatearMonto(resumen.totalVentasTarjeta) }}</span>
          </div>
          <span class="cell-sub">POS Datáfono</span>
        </div>
      </section>

      <!-- SECCIÓN FRENTE A FRENTE: INGRESOS (IZQUIERDA) Y EGRESOS (DERECHA) -->
      <div class="arqueo-frente-a-frente">

        <!-- COLUMNA IZQUIERDA: INGRESOS (ENTRADAS DE CAJA) -->
        <div class="arqueo-col-panel panel-ingresos">
          <div class="panel-header">
            <div>
              <h3 class="panel-title text-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="panel-header-icon">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
                Ingresos (Entradas de Caja)
              </h3>
              <p class="panel-subtitle">Ventas de sistema, movimientos de ingreso y efectivo contado</p>
            </div>
            <div class="panel-badge-total bg-success-light">
              <span class="cell-sub">Total Entradas:</span>
              <strong class="text-success font-mono">{{ formatearMonto(totalEntradasFinal) }}</strong>
            </div>
          </div>

          <!-- TABLA DE INGRESOS -->
          <div class="table-container mb-3">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Concepto / Canal</th>
                    <th style="width: 105px;">Origen</th>
                    <th style="width: 125px; text-align: right;">Sistema</th>
                    <th style="width: 135px; text-align: right;">Declarado</th>
                    <th style="width: 50px; text-align: center;"></th>
                  </tr>
                </thead>
                <tbody>
                  <!-- 1. FILAS FIJAS DE VENTAS DEL SISTEMA (NO ELIMINABLES) -->
                  <tr v-for="(p, idx) in entradasDeclaradas" :key="'ent-' + idx" :class="{ 'row-sistema': p.esSistema }">
                    <td>
                      <div class="cell-bold">{{ p.descripcion }}</div>
                      <span v-if="p.esSistema" class="cell-sub">Venta registrada en el turno</span>
                    </td>
                    <td>
                      <span v-if="p.esSistema" class="kpi-badge info" title="Fila calculada automáticamente por el sistema">Sistema</span>
                      <span v-else class="kpi-badge neutral">Declarado</span>
                    </td>
                    <td style="text-align: right; font-family: var(--erp-font-mono);">
                      <span v-if="p.esSistema" class="text-muted">{{ formatearMonto(p.montoSistema) }}</span>
                      <span v-else class="text-muted">&mdash;</span>
                    </td>
                    <td style="text-align: right;">
                      <div class="input-monto-wrapper">
                        <span class="currency-prefix">Bs.</span>
                        <input
                          v-model.number="p.monto"
                          type="number"
                          step="0.01"
                          min="0"
                          class="form-control form-control-sm text-right font-mono input-monto-declarado"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td style="text-align: center;">
                      <button
                        v-if="!p.esSistema"
                        type="button"
                        class="action-btn action-btn-danger"
                        title="Quitar entrada adicional"
                        @click="eliminarEntrada(idx)"
                      >
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                      <span v-else class="cell-sub" title="Fila obligatoria del sistema (no eliminable)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #94a3b8;">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </span>
                    </td>
                  </tr>

                  <!-- 2. MOVIMIENTOS DE ENTRADA REGISTRADOS EN EL TURNO (SELLADOS) -->
                  <tr v-for="m in movimientosEntradaList" :key="'mov-ent-' + m.movimiento_id" class="row-movimiento">
                    <td>
                      <div class="cell-bold">{{ m.detalle || 'Ingreso de Turno' }}</div>
                      <span class="cell-sub">{{ m.descripcion_metodo }} &bull; #{{ m.movimiento_id }}</span>
                    </td>
                    <td>
                      <span class="kpi-badge success" title="Movimiento de caja registrado en el turno">Mov. Turno</span>
                    </td>
                    <td style="text-align: right; font-family: var(--erp-font-mono); font-weight: 700;" class="text-success">
                      +{{ formatearMonto(m.monto) }}
                    </td>
                    <td style="text-align: right; font-family: var(--erp-font-mono); font-weight: 700;" class="text-success">
                      +{{ formatearMonto(m.monto) }}
                    </td>
                    <td style="text-align: center;">
                      <span class="cell-sub" title="Se sella automáticamente con este reporte">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #10b981;">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- FORMULARIO: AÑADIR ENTRADA ADICIONAL -->
          <div class="form-agregar-caja">
            <span class="agregar-title">+ Añadir Entrada Adicional a Caja</span>
            <div class="form-agregar-grid">
              <div class="form-group mb-0">
                <select v-model.number="nuevaEntrada.tipo" class="filter-select">
                  <option v-for="m in METODOS_CONCEPTO" :key="m.id" :value="m.id">{{ m.label }}</option>
                </select>
              </div>
              <div class="form-group mb-0">
                <input
                  v-model="nuevaEntrada.descripcion"
                  maxlength="40"
                  class="form-control"
                  placeholder="Detalle (ej: Fondo cambio)"
                />
              </div>
              <div class="form-group mb-0 input-btn-group">
                <input
                  v-model.number="nuevaEntrada.monto"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-control"
                  placeholder="0.00"
                />
                <button type="button" class="btn-secondary" @click="agregarEntrada">
                  Agregar
                </button>
              </div>
            </div>
          </div>

          <!-- SUB-RESUMEN INFERIOR IZQUIERDO -->
          <div class="subresumen-pie">
            <span>Declarado en Caja: <strong>{{ formatearMonto(sumaEntradasDeclaradas) }}</strong></span>
            <span>+ Movimientos Turno: <strong class="text-success">{{ formatearMonto(movEntradasTurno) }}</strong></span>
          </div>
        </div>

        <!-- COLUMNA DERECHA: EGRESOS (SALIDAS DE CAJA) -->
        <div class="arqueo-col-panel panel-egresos">
          <div class="panel-header">
            <div>
              <h3 class="panel-title text-danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="panel-header-icon">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
                Egresos (Salidas de Caja)
              </h3>
              <p class="panel-subtitle">Gastos, retiros y pagos registrados en el turno y salidas declaradas</p>
            </div>
            <div class="panel-badge-total bg-danger-light">
              <span class="cell-sub">Total Salidas:</span>
              <strong class="text-danger font-mono">{{ formatearMonto(totalSalidasFinal) }}</strong>
            </div>
          </div>

          <!-- TABLA DE EGRESOS -->
          <div class="table-container mb-3">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Concepto / Motivo</th>
                    <th style="width: 105px;">Origen</th>
                    <th style="width: 120px;">Método</th>
                    <th style="width: 135px; text-align: right;">Monto</th>
                    <th style="width: 50px; text-align: center;"></th>
                  </tr>
                </thead>
                <tbody>
                  <!-- 1. MOVIMIENTOS DE SALIDA DEL TURNO (SELLADOS) -->
                  <tr v-for="m in movimientosSalidaList" :key="'mov-sal-' + m.movimiento_id" class="row-movimiento">
                    <td>
                      <div class="cell-bold">{{ m.detalle || 'Salida de Turno' }}</div>
                      <span class="cell-sub">Movimiento #{{ m.movimiento_id }}</span>
                    </td>
                    <td>
                      <span class="kpi-badge warning" title="Movimiento de salida registrado en el turno">Mov. Turno</span>
                    </td>
                    <td>
                      <span class="kpi-badge neutral">{{ m.descripcion_metodo }}</span>
                    </td>
                    <td style="text-align: right; font-family: var(--erp-font-mono); font-weight: 700;" class="text-danger">
                      -{{ formatearMonto(m.monto) }}
                    </td>
                    <td style="text-align: center;">
                      <span class="cell-sub" title="Se sella automáticamente con este reporte">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #ef4444;">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                    </td>
                  </tr>

                  <!-- 2. SALIDAS DECLARADAS ADICIONALES -->
                  <tr v-for="(s, idx) in salidasDeclaradas" :key="'sal-' + idx">
                    <td>
                      <div class="cell-bold">{{ s.descripcion }}</div>
                      <span class="cell-sub">Declarado en cierre</span>
                    </td>
                    <td>
                      <span class="kpi-badge neutral">Declarado</span>
                    </td>
                    <td>
                      <span class="kpi-badge neutral">{{ METODOS_CONCEPTO.find(m => m.id === s.tipo)?.label || 'Efectivo' }}</span>
                    </td>
                    <td style="text-align: right; font-family: var(--erp-font-mono); font-weight: 700;" class="text-danger">
                      -{{ formatearMonto(s.monto) }}
                    </td>
                    <td style="text-align: center;">
                      <button
                        type="button"
                        class="action-btn action-btn-danger"
                        title="Quitar salida adicional"
                        @click="eliminarSalida(idx)"
                      >
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>

                  <!-- ESTADO VACÍO SI NO HAY SALIDAS -->
                  <tr v-if="movimientosSalidaList.length === 0 && salidasDeclaradas.length === 0">
                    <td colspan="5" class="cell-sub text-center" style="padding: 2rem;">
                      No se registraron salidas ni gastos durante este turno.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- FORMULARIO: AÑADIR EGRESO ADICIONAL -->
          <div class="form-agregar-caja">
            <span class="agregar-title">+ Añadir Salida / Gasto Adicional</span>
            <div class="form-agregar-grid">
              <div class="form-group mb-0">
                <select v-model.number="nuevaSalida.tipo" class="filter-select">
                  <option v-for="m in METODOS_CONCEPTO" :key="m.id" :value="m.id">{{ m.label }}</option>
                </select>
              </div>
              <div class="form-group mb-0">
                <input
                  v-model="nuevaSalida.descripcion"
                  maxlength="40"
                  class="form-control"
                  placeholder="Detalle (ej: Pago flete)"
                />
              </div>
              <div class="form-group mb-0 input-btn-group">
                <input
                  v-model.number="nuevaSalida.monto"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-control"
                  placeholder="0.00"
                />
                <button type="button" class="btn-secondary" @click="agregarSalida">
                  Agregar
                </button>
              </div>
            </div>
          </div>

          <!-- SUB-RESUMEN INFERIOR DERECHO -->
          <div class="subresumen-pie">
            <span>Declaradas en Cierre: <strong>{{ formatearMonto(sumaSalidasDeclaradas) }}</strong></span>
            <span>+ Movimientos Turno: <strong class="text-danger">{{ formatearMonto(movSalidasTurno) }}</strong></span>
          </div>
        </div>

      </div>

      <!-- BALANCE Y CUADRE DE CAJA GENERAL -->
      <div class="balance-card">
        <div class="balance-item">
          <span class="kpi-label">Total Ingresos</span>
          <strong class="balance-value text-success font-mono">{{ formatearMonto(totalEntradasFinal) }}</strong>
          <span class="cell-sub">Ventas + Entradas</span>
        </div>

        <div class="balance-op">−</div>

        <div class="balance-item">
          <span class="kpi-label">Total Egresos</span>
          <strong class="balance-value text-danger font-mono">{{ formatearMonto(totalSalidasFinal) }}</strong>
          <span class="cell-sub">Gastos y Salidas</span>
        </div>

        <div class="balance-op">=</div>

        <div class="balance-item">
          <span class="kpi-label">Saldo Neto en Caja</span>
          <strong class="balance-value font-mono" :class="utilidadArqueo >= 0 ? 'text-primary' : 'text-danger'">
            {{ formatearMonto(utilidadArqueo) }}
          </strong>
          <span class="cell-sub">Efectivo + Medios</span>
        </div>

        <div class="balance-sep"></div>

        <div class="balance-item balance-comparativa">
          <span class="kpi-label">Cuadre vs Ventas Esperadas</span>
          <div class="cuadre-status-box">
            <span v-if="diferenciaVentas === 0" class="status-badge activa">
              Caja Cuadrada (0.00)
            </span>
            <span v-else-if="diferenciaVentas > 0" class="status-badge activa">
              Sobrante: +{{ formatearMonto(diferenciaVentas) }}
            </span>
            <span v-else class="status-badge baja">
              Faltante: {{ formatearMonto(diferenciaVentas) }}
            </span>
          </div>
          <span class="cell-sub">Ventas del sistema: {{ formatearMonto(totalVentasEsperadas) }}</span>
        </div>
      </div>

      <!-- TOP PRODUCTOS VENDIDOS EN EL TURNO -->
      <div class="top-prod-card">
        <div class="top-prod-header">
          <div>
            <h3 class="top-prod-title">Top Productos Vendidos en el Turno</h3>
            <p class="panel-subtitle">Artículos con mayor volumen comercializado en esta sesión</p>
          </div>
        </div>

        <div v-if="!resumen.topProductos || !Array.isArray(resumen.topProductos) || resumen.topProductos.length === 0" class="empty-state" style="padding: 1.5rem 0.5rem;">
          <p class="cell-sub text-center">No se registraron productos vendidos en este turno.</p>
        </div>

        <div v-else class="top-prod-grid">
          <div v-for="(p, idx) in resumen.topProductos" :key="idx" class="top-prod-item">
            <span class="top-prod-badge">#{{ idx + 1 }}</span>
            <div class="top-prod-details">
              <strong class="top-prod-name" :title="p.producto">{{ p.producto }}</strong>
              <span class="cell-sub">{{ p.cantidad }} {{ p.cantidad === 1 ? 'unidad vendida' : 'unidades vendidas' }}</span>
            </div>
            <strong class="top-prod-total font-mono">{{ formatearMonto(p.subtotal) }}</strong>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL CONFIRMACIÓN PARA OMITIR ARQUEO -->
    <div v-if="modalOmitirVisible" class="modal-backdrop" @click.self="modalOmitirVisible = false">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <h3 class="modal-title text-danger">¿Omitir Arqueo de Caja?</h3>
          <button type="button" class="btn-close-modal" @click="modalOmitirVisible = false">&times;</button>
        </div>
        <div class="modal-body">
          <p>
            Usted tuvo actividad registrada (ventas o movimientos) durante esta jornada laboral.
          </p>
          <div class="alert alert-danger my-2">
            <strong>Atención:</strong> Si omite el arqueo, no se generará el reporte financiero de este turno y en la Auditoría de Sesiones quedará registrado que cerró su jornada con ventas sin realizar su arqueo de caja.
          </div>
          <p class="cell-sub">¿Desea cerrar sesión directamente sin generar reporte?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="modalOmitirVisible = false">Volver al Arqueo</button>
          <button type="button" class="btn-danger" :disabled="omitiendo" @click="ejecutarOmitirArqueo">
            {{ omitiendo ? 'Cerrando...' : 'Confirmar Omitir y Salir' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.arqueo-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Banner de Jornada */
.banner-jornada-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.15rem 1.5rem;
  background-color: var(--erp-bg-card);
  border: 1px solid var(--erp-border-light);
  border-radius: var(--erp-radius-xl);
  box-shadow: var(--erp-shadow-sm);
}

.banner-icon-box {
  width: 44px;
  height: 44px;
  border-radius: var(--erp-radius-lg);
  background-color: var(--erp-primary-light);
  color: var(--erp-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.banner-svg {
  width: 22px;
  height: 22px;
}

.banner-content {
  flex: 1;
}

.banner-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--erp-text-main);
  margin: 0 0 0.2rem 0;
}

.banner-text {
  font-size: var(--erp-font-xs);
  color: var(--erp-text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* Grid Frente a Frente (Ingresos vs Egresos) */
.arqueo-frente-a-frente {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 1024px) {
  .arqueo-frente-a-frente {
    grid-template-columns: 1fr;
  }
}

.arqueo-col-panel {
  background-color: var(--erp-bg-card);
  border: 1px solid var(--erp-border-light);
  border-radius: var(--erp-radius-xl);
  padding: 1.25rem;
  box-shadow: var(--erp-shadow-sm);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--erp-border-light);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.2rem 0;
}

.panel-header-icon {
  width: 18px;
  height: 18px;
}

.panel-subtitle {
  font-size: var(--erp-font-xs);
  color: var(--erp-text-secondary);
  margin: 0;
}

.panel-badge-total {
  padding: 0.4rem 0.75rem;
  border-radius: var(--erp-radius-md);
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.bg-success-light {
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.bg-danger-light {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
}

/* Estilos de tabla en Arqueo */
.row-sistema {
  background-color: #f8fafc;
}

.row-movimiento {
  background-color: #fafaf9;
}

.input-monto-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.currency-prefix {
  font-size: var(--erp-font-xs);
  color: var(--erp-text-secondary);
  font-weight: 600;
}

.input-monto-declarado {
  max-width: 110px;
  font-weight: 700;
  padding: 0.35rem 0.55rem;
}

/* Formulario agregar fila */
.form-agregar-caja {
  background-color: var(--erp-bg-subtle, #f8fafc);
  border: 1px solid var(--erp-border-light);
  border-radius: var(--erp-radius-lg);
  padding: 0.85rem;
  margin-top: auto;
}

.agregar-title {
  display: block;
  font-size: var(--erp-font-xs);
  font-weight: 700;
  color: var(--erp-text-secondary);
  margin-bottom: 0.5rem;
}

.form-agregar-grid {
  display: grid;
  grid-template-columns: 120px 1fr 180px;
  gap: 0.5rem;
  align-items: center;
}

.input-btn-group {
  display: flex;
  gap: 0.35rem;
}

.subresumen-pie {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.25rem 0;
  margin-top: 0.65rem;
  border-top: 1px solid var(--erp-border-light);
  font-size: var(--erp-font-xs);
  color: var(--erp-text-secondary);
}

/* Balance Card (Barra de Cuadre) */
.balance-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--erp-bg-card);
  border: 1px solid var(--erp-border-light);
  border-radius: var(--erp-radius-xl);
  padding: 1.25rem 2rem;
  box-shadow: var(--erp-shadow-sm);
  flex-wrap: wrap;
  gap: 1.25rem;
}

.balance-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.balance-value {
  font-size: 1.35rem;
}

.balance-op {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--erp-text-muted);
}

.balance-sep {
  width: 1px;
  height: 48px;
  background-color: var(--erp-border-light);
}

.balance-comparativa {
  align-items: flex-end;
}

.cuadre-status-box {
  margin: 0.15rem 0;
}

/* Top Productos */
.top-prod-card {
  background-color: var(--erp-bg-card);
  border: 1px solid var(--erp-border-light);
  border-radius: var(--erp-radius-xl);
  padding: 1.25rem;
  box-shadow: var(--erp-shadow-sm);
}

.top-prod-header {
  margin-bottom: 1rem;
}

.top-prod-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--erp-text-main);
  margin: 0 0 0.2rem 0;
}

.top-prod-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
}

.top-prod-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--erp-radius-lg);
  border: 1px solid var(--erp-border-light);
  background-color: var(--erp-bg-subtle, #f8fafc);
}

.top-prod-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: var(--erp-radius-md);
  background-color: var(--erp-primary-light);
  color: var(--erp-primary);
  font-weight: 800;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.top-prod-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.top-prod-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--erp-font-sm);
  color: var(--erp-text-main);
}

.top-prod-total {
  flex-shrink: 0;
  color: var(--erp-text-main);
  font-size: var(--erp-font-sm);
}
</style>
