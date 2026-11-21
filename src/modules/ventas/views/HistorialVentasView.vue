<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  authStore,
  cargando,
  ventasFiltradas,
  fechaFiltro,
  metodoFiltro,
  estadoFiltro,
  searchQuery,
  totalVentas,
  totalRecaudado,
  totalFinalizadas,
  totalAnuladas,
  cargarHistorial,
  limpiarFiltros,
  modalDetalleVisible,
  ventaSeleccionada,
  abrirModalDetalle,
  cerrarModalDetalle,
  reimprimirRecibo,
  modalAnularVisible,
  ventaAAnular,
  cargandoAnular,
  abrirModalAnular,
  cerrarModalAnular,
  confirmarAnulacion,
  toasts,
  cerrarToast,
  formatearMoneda,
  formatearFechaHora,
} from './HistorialVentasView'

onMounted(async () => {
  await cargarHistorial()
})
</script>

<template>
  <!-- Contenedor oculto para impresión de recibo térmico -->
  <div id="recibo-termico-historial" style="display:none"></div>

  <div class="user-wrapper">
    <!-- TOASTS DE NOTIFICACIÓN GLOBALES -->
    <div class="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="`toast-${t.tipo}`"
      >
        <div class="toast-content">
          <span class="toast-title">{{ t.titulo }}</span>
          <span class="toast-message">{{ t.mensaje }}</span>
        </div>
        <button type="button" class="toast-close" @click="cerrarToast(t.id)">×</button>
      </div>
    </div>

    <!-- TOPBAR / ENCABEZADO -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Historial de Ventas</h1>
            <p class="page-subtitle">
              Registro cronológico de tickets, auditoría de transacciones y reversión de stock
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <RouterLink to="/pos" class="btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          Ir a Caja
        </RouterLink>

        <button
          type="button"
          class="btn-primary"
          :disabled="cargando"
          @click="cargarHistorial"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" :class="{ 'spin-icon': cargando }">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          {{ cargando ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>
    </header>

    <!-- KPIS RESUMEN -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Ventas Registradas</span>
          <span class="kpi-value">{{ totalVentas }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Recaudación Neta</span>
          <span class="kpi-value">{{ formatearMoneda(totalRecaudado) }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Ventas Finalizadas</span>
          <span class="kpi-value">{{ totalFinalizadas }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box rose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-svg">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Ventas Anuladas</span>
          <span class="kpi-value">{{ totalAnuladas }}</span>
        </div>
      </div>
    </section>

    <!-- BARRA DE FILTROS -->
    <div class="filter-card">
      <div class="filter-left">
        <!-- Búsqueda rápida -->
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Buscar por # venta o cajero..."
          />
        </div>

        <!-- Filtro fecha -->
        <div class="form-group" style="margin-bottom: 0;">
          <input
            v-model="fechaFiltro"
            type="date"
            class="filter-select"
            @change="cargarHistorial"
          />
        </div>

        <!-- Filtro Método de Pago -->
        <div class="form-group" style="margin-bottom: 0;">
          <select v-model="metodoFiltro" class="filter-select">
            <option :value="null">Todos los métodos</option>
            <option :value="1">Efectivo</option>
            <option :value="2">QR</option>
            <option :value="3">Tarjeta</option>
            <option :value="4">Mixto</option>
          </select>
        </div>

        <!-- Filtro Estado -->
        <div class="form-group" style="margin-bottom: 0;">
          <select v-model="estadoFiltro" class="filter-select">
            <option :value="null">Todos los estados</option>
            <option :value="2">Finalizada</option>
            <option :value="3">Anulada</option>
            <option :value="1">Pendiente</option>
          </select>
        </div>

        <!-- Limpiar -->
        <button
          type="button"
          class="btn-secondary"
          title="Restablecer filtros"
          @click="limpiarFiltros"
        >
          Limpiar
        </button>
      </div>
    </div>

    <!-- TABLA DE VENTAS -->
    <div class="table-container">
      <div v-if="cargando" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando historial de transacciones...</p>
      </div>

      <div v-else-if="ventasFiltradas.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <h3>No se encontraron ventas</h3>
        <p>No hay transacciones registradas para la fecha o criterios seleccionados.</p>
      </div>

      <table v-else class="erp-table data-table">
        <thead>
          <tr>
            <th style="width: 80px;"># Ticket</th>
            <th>Fecha / Hora</th>
            <th>Cajero</th>
            <th>Método de Pago</th>
            <th>Detalle Pago</th>
            <th style="text-align: right;">Total</th>
            <th style="text-align: center;">Estado</th>
            <th style="width: 120px; text-align: center;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="v in ventasFiltradas"
            :key="v.ventaId"
            :class="{ 'row-anulada': v.estado === 3 }"
          >
            <!-- # Venta -->
            <td class="cell-id font-mono">#{{ v.ventaId }}</td>

            <!-- Fecha / Hora -->
            <td>
              <div class="cell-bold">{{ formatearFechaHora(v.fechaCreacion) }}</div>
            </td>

            <!-- Cajero -->
            <td>
              <div class="cell-bold">{{ v.cajeroNombre || 'Cajero' }}</div>
            </td>

            <!-- Método de Venta -->
            <td>
              <ConceptoBadge tipo="metodo_venta" :valor="v.metodoVenta" />
            </td>

            <!-- Detalle Pago -->
            <td class="cell-muted">
              <span v-if="v.metodoVenta === 1">Ef: {{ formatearMoneda(v.cobroEfectivo) }}</span>
              <span v-else-if="v.metodoVenta === 2">QR: {{ formatearMoneda(v.cobroQr) }}</span>
              <span v-else-if="v.metodoVenta === 3">Tarj: {{ formatearMoneda(v.cobroTarjeta) }}</span>
              <span v-else-if="v.metodoVenta === 4">
                Ef: {{ formatearMoneda(v.cobroEfectivo) }} &bull; QR: {{ formatearMoneda(v.cobroQr) }} &bull; T: {{ formatearMoneda(v.cobroTarjeta) }}
              </span>
            </td>

            <!-- Total -->
            <td class="cell-price" style="text-align: right;">
              <span :class="{ 'text-strikethrough': v.estado === 3 }">
                {{ formatearMoneda(v.precioTotal) }}
              </span>
            </td>

            <!-- Estado -->
            <td style="text-align: center;">
              <ConceptoBadge tipo="estado_venta" :valor="v.estado" />
            </td>

            <!-- Acciones -->
            <td class="td-actions" style="text-align: center;">
              <!-- Ver detalle / ticket -->
              <button
                type="button"
                class="action-btn"
                title="Ver detalle del ticket y recibo"
                @click="abrirModalDetalle(v)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>

              <!-- Anular (solo visible si tiene rol de Propietario o Supervisor y no está anulada) -->
              <button
                v-if="(authStore.isPropietario || authStore.isSupervisor) && v.estado !== 3"
                type="button"
                class="action-btn action-btn-danger"
                title="Anular venta y revertir stock"
                @click="abrirModalAnular(v)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         MODAL DETALLE DE VENTA Y REIMPRESIÓN (Usa modals.css)
    ═══════════════════════════════════════════════════════════════ -->
    <div v-if="modalDetalleVisible && ventaSeleccionada" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Detalle de Venta #{{ ventaSeleccionada.ventaId }}</h3>
            <p class="modal-subtitle">
              {{ formatearFechaHora(ventaSeleccionada.fechaCreacion) }} &bull; {{ ventaSeleccionada.cajeroNombre }}
            </p>
          </div>
          <button type="button" class="btn-close-modal" @click="cerrarModalDetalle">×</button>
        </div>

        <div class="modal-form">
          <div class="ticket-status-row">
            <div>
              <span class="cell-muted">Estado:</span>
              <ConceptoBadge tipo="estado_venta" :valor="ventaSeleccionada.estado" class="ml-2" />
            </div>
            <div>
              <span class="cell-muted">Método:</span>
              <ConceptoBadge tipo="metodo_venta" :valor="ventaSeleccionada.metodoVenta" class="ml-2" />
            </div>
          </div>

          <!-- Tabla de productos del detalle -->
          <div class="ticket-detalles-box">
            <h4 class="section-title">Productos Adquiridos</h4>
            <table class="erp-table table-compact">
              <thead>
                <tr>
                  <th>Ítem / Inventario</th>
                  <th style="text-align: center;">Cant.</th>
                  <th style="text-align: right;">P. Unit</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in ventaSeleccionada.detalles" :key="d.inventarioId">
                  <td>
                    <strong>Producto #{{ d.productoId }}</strong>
                    <div class="cell-muted">Lote Inv #{{ d.inventarioId }}</div>
                  </td>
                  <td style="text-align: center;">{{ d.cantidad }}</td>
                  <td style="text-align: right;">{{ formatearMoneda(d.precioUnitario) }}</td>
                  <td style="text-align: right;" class="font-bold">
                    {{ formatearMoneda(Number(d.precioUnitario) * Number(d.cantidad)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Resumen de montos -->
          <div class="ticket-totales-card">
            <div class="total-line">
              <span>Total de la Venta:</span>
              <strong class="total-accent">{{ formatearMoneda(ventaSeleccionada.precioTotal) }}</strong>
            </div>
            <div v-if="(ventaSeleccionada.cobroEfectivo ?? 0) > 0" class="subtotal-line">
              <span>Efectivo cobrado:</span>
              <span>{{ formatearMoneda(ventaSeleccionada.cobroEfectivo) }}</span>
            </div>
            <div v-if="(ventaSeleccionada.montoRecibido ?? 0) > 0" class="subtotal-line">
              <span>Monto recibido:</span>
              <span>{{ formatearMoneda(ventaSeleccionada.montoRecibido) }}</span>
            </div>
            <div v-if="(ventaSeleccionada.cambio ?? 0) > 0" class="subtotal-line text-success">
              <span>Cambio entregado:</span>
              <span>{{ formatearMoneda(ventaSeleccionada.cambio) }}</span>
            </div>
            <div v-if="(ventaSeleccionada.cobroQr ?? 0) > 0" class="subtotal-line">
              <span>Pago QR:</span>
              <span>{{ formatearMoneda(ventaSeleccionada.cobroQr) }}</span>
            </div>
            <div v-if="(ventaSeleccionada.cobroTarjeta ?? 0) > 0" class="subtotal-line">
              <span>Pago Tarjeta:</span>
              <span>{{ formatearMoneda(ventaSeleccionada.cobroTarjeta) }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="cerrarModalDetalle">
            Cerrar
          </button>
          <button
            type="button"
            class="btn-primary"
            @click="reimprimirRecibo()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Reimprimir Recibo Térmico
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         MODAL DE ANULACIÓN DE VENTA (Usa modals.css)
    ═══════════════════════════════════════════════════════════════ -->
    <div v-if="modalAnularVisible && ventaAAnular" class="modal-backdrop" @click.self="cerrarModalAnular">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <div class="modal-title-with-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="title-svg danger">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <div>
              <h3 class="modal-title">Anular Venta #{{ ventaAAnular.ventaId }}</h3>
              <p class="modal-subtitle">Esta acción revertirá automáticamente el stock</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal" @click="cerrarModalAnular">×</button>
        </div>

        <div class="modal-form">
          <div class="alert alert-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div class="alert-text">
              <strong>¿Confirmas la anulación de esta venta?</strong>
              <p>Al anular la venta, los productos vendidos se reincorporarán automáticamente al stock disponible del inventario.</p>
            </div>
          </div>

          <div class="anulacion-resumen">
            <div class="anulacion-line">
              <span class="anulacion-label">Total de la Venta:</span>
              <strong class="anulacion-value text-danger font-bold">{{ formatearMoneda(ventaAAnular.precioTotal) }}</strong>
            </div>
            <div class="anulacion-line">
              <span class="anulacion-label">Cajero responsable:</span>
              <span class="anulacion-value">{{ ventaAAnular.cajeroNombre }}</span>
            </div>
            <div class="anulacion-line">
              <span class="anulacion-label">Fecha y hora:</span>
              <span class="anulacion-value">{{ formatearFechaHora(ventaAAnular.fechaCreacion) }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-secondary"
            :disabled="cargandoAnular"
            @click="cerrarModalAnular"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-danger"
            :disabled="cargandoAnular"
            @click="confirmarAnulacion"
          >
            <span v-if="cargandoAnular" class="spinner"></span>
            <span v-else>Confirmar Anulación</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped src="./HistorialVentasView.css"></style>
