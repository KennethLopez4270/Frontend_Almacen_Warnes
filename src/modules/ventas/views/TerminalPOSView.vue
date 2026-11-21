<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ventaStore,
  authStore,
  posWsConectado,
  posWsReconectando,
  iniciarWebSocketPOS,
  detenerWebSocketPOS,
  nitBusqueda,
  cargandoCliente,
  clienteEncontrado,
  mostrarCamposCliente,
  formCliente,
  buscarClientePorNit,
  limpiarCliente,
  inputBusquedaRef,
  criterioBusqueda,
  resultadosBusqueda,
  cargandoBusqueda,
  errorBusqueda,
  enfocarInputBusqueda,
  manejarInputBusqueda,
  limpiarBusqueda,
  manejarKeydownBusqueda,
  seleccionarProducto,
  modalDescuentoVisible,
  loteOfertaSeleccion,
  loteNormalSeleccion,
  elegirLoteOferta,
  elegirLoteNormal,
  cerrarModalDescuento,
  metodoSeleccionado,
  montoRecibido,
  mixtoEfectivo,
  mixtoQr,
  mixtoTarjeta,
  confirmadoQR,
  confirmadoTarjeta,
  cambio,
  sumaMixto,
  mixtoValido,
  setMontoRecibido,
  modalConfirmarVisible,
  abrirModalConfirmar,
  cerrarModalConfirmar,
  ejecutarRegistroVenta,
  nuevaVenta,
  imprimirRecibo,
  toasts,
  cerrarToast,
  formatearPrecio,
  formatearCronometro,
} from './TerminalPOSView'

onMounted(() => {
  enfocarInputBusqueda()
  iniciarWebSocketPOS()
})

onUnmounted(() => {
  detenerWebSocketPOS()
})

const METODOS = [
  { id: 1, label: 'Efectivo', key: 'efectivo' },
  { id: 2, label: 'QR',       key: 'qr' },
  { id: 3, label: 'Tarjeta',  key: 'tarjeta' },
  { id: 4, label: 'Mixto',    key: 'mixto' },
]
</script>

<template>
  <div class="user-wrapper">

    <!-- TOASTS GLOBALES -->
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

    <!-- ═══════════════════════════════════════════════════════════════
         TOPBAR ESTANDARIZADA - MÓDULO CAJA
    ═══════════════════════════════════════════════════════════════ -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Caja</h1>
            <p class="page-subtitle">
              {{ authStore.sucursalNombre || 'Sucursal' }} &bull; {{ authStore.nombreCompleto }}
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Indicador de conexión en tiempo real (WebSocket) -->
        <div
          class="pos-ws-badge"
          :class="posWsConectado ? 'pos-ws--online' : (posWsReconectando ? 'pos-ws--reconnecting' : 'pos-ws--offline')"
          :title="posWsConectado ? 'Conectado al servidor en tiempo real (Stock sincronizado)' : (posWsReconectando ? 'Reconectando con el servidor...' : 'Desconectado')"
        >
          <span class="ws-pulse-dot"></span>
          <span class="ws-badge-text">{{ posWsConectado ? 'En Línea' : (posWsReconectando ? 'Reconectando' : 'Desconectado') }}</span>
        </div>

        <!-- Cronómetro de atención -->
        <div class="pos-cronometro" :class="{ 'pos-cronometro--activo': ventaStore.cronometroActivo }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cronometro-svg">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span class="cronometro-time">{{ formatearCronometro(ventaStore.cronometroSegundos) }}</span>
        </div>

        <RouterLink to="/caja/historial-ventas" class="btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Historial de Ventas
        </RouterLink>
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════════════
         GRID PRINCIPAL: PANEL LATERAL (IZQ) + CARRITO PROTAGONISTA (DER)
    ═══════════════════════════════════════════════════════════════ -->
    <div class="pos-grid">

      <!-- ── COLUMNA IZQUIERDA: CLIENTE + BÚSQUEDA ── -->
      <aside class="pos-sidebar-col">

        <!-- 1. DATOS DEL CLIENTE / NIT (REUBICADO ARRIBA) -->
        <div class="pos-card cliente-card">
          <div class="pos-card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="header-icon-svg">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <h3 class="pos-card-title">Cliente / Facturación</h3>
          </div>

          <div class="cliente-body">
            <div class="cliente-search-row">
              <input
                v-model="nitBusqueda"
                class="form-control"
                placeholder="NIT o C.I. (Opcional)..."
                @keydown.enter.prevent="buscarClientePorNit"
              />
              <button
                type="button"
                class="btn-secondary"
                :disabled="cargandoCliente || !nitBusqueda.trim()"
                @click="buscarClientePorNit"
              >
                {{ cargandoCliente ? '...' : 'Buscar' }}
              </button>
              <button
                v-if="nitBusqueda || clienteEncontrado || formCliente.nit"
                type="button"
                class="btn-text-clear"
                title="Quitar cliente"
                @click="limpiarCliente"
              >
                &times;
              </button>
            </div>

            <!-- Cliente ya encontrado en BD -->
            <div v-if="clienteEncontrado" class="cliente-encontrado-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="check-icon-svg">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <div class="cliente-pill-info">
                <strong>{{ clienteEncontrado.nombreRazonSocial || `${clienteEncontrado.nombres} ${clienteEncontrado.apellidos}` }}</strong>
                <span class="cell-sub">NIT: {{ clienteEncontrado.nit }}</span>
              </div>
            </div>

            <!-- Formulario complementario si es NIT nuevo -->
            <div v-else-if="mostrarCamposCliente" class="cliente-extra-fields">
              <div class="form-group mb-1">
                <label class="form-label">Razón Social</label>
                <input
                  v-model="formCliente.nombreRazonSocial"
                  class="form-control form-control-sm"
                  placeholder="Empresa o Razón Social"
                />
              </div>
              <div class="form-row-2">
                <div class="form-group mb-1">
                  <label class="form-label">Nombres</label>
                  <input
                    v-model="formCliente.nombres"
                    class="form-control form-control-sm"
                    placeholder="Nombres"
                  />
                </div>
                <div class="form-group mb-1">
                  <label class="form-label">Apellidos</label>
                  <input
                    v-model="formCliente.apellidos"
                    class="form-control form-control-sm"
                    placeholder="Apellidos"
                  />
                </div>
              </div>
            </div>

            <div v-else class="cliente-hint">
              <span>Venta predeterminada a Cliente General (sin NIT).</span>
            </div>
          </div>
        </div>

        <!-- 2. BÚSQUEDA Y ESCANEO DE PRODUCTOS -->
        <div class="pos-card busqueda-card">
          <div class="pos-card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="header-icon-svg">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <h3 class="pos-card-title">Búsqueda y Escáner</h3>
          </div>

          <!-- Input con búsqueda automática al escribir (>= 3 caracteres) o pistola escáner con Enter -->
          <div class="busqueda-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-search-svg">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref="inputBusquedaRef"
              v-model="criterioBusqueda"
              class="form-control form-control-lg busqueda-input-field"
              placeholder="Escanear código o escribir producto..."
              @input="manejarInputBusqueda"
              @keydown="manejarKeydownBusqueda"
            />
            <div v-if="cargandoBusqueda" class="input-spinner-sm"></div>
            <button
              v-else-if="criterioBusqueda"
              type="button"
              class="input-clear-btn"
              title="Borrar búsqueda"
              @click="limpiarBusqueda"
            >
              &times;
            </button>
          </div>

          <!-- Error búsqueda -->
          <div v-if="errorBusqueda" class="alert alert-danger mt-2">{{ errorBusqueda }}</div>

          <!-- Resultados de búsqueda manual -->
          <div v-if="resultadosBusqueda.length > 0" class="resultados-scroll">
            <div
              v-for="prod in resultadosBusqueda"
              :key="prod.inventarioId"
              class="producto-item-card"
              :class="{ 'producto-item-card--sin-stock': prod.stockDisponible <= 0 }"
            >
              <div class="producto-item-info">
                <div class="producto-item-nombre">{{ prod.nombreProducto }}</div>
                <div class="producto-item-sub">
                  <span v-if="prod.codigoInterno">Cód: {{ prod.codigoInterno }}</span>
                  <span v-if="prod.codigoBarras"> &bull; Barra: {{ prod.codigoBarras }}</span>
                </div>
                <div class="producto-item-precios">
                  <span class="precio-actual">{{ formatearPrecio(prod.precioVenta) }}</span>
                  <span v-if="prod.enDescuento && prod.precioDescuento" class="oferta-pill">
                    Oferta: {{ formatearPrecio(prod.precioDescuento) }}
                  </span>
                </div>
              </div>
              <div class="producto-item-actions">
                <span
                  class="stock-pill"
                  :class="prod.stockDisponible > 0 ? 'stock-ok' : 'stock-zero'"
                >
                  {{ prod.stockDisponible > 0 ? `Stock: ${prod.stockDisponible}` : 'Stock 0' }}
                </span>
                <button
                  class="btn-primary btn-sm"
                  :disabled="prod.stockDisponible <= 0"
                  @click="seleccionarProducto(prod)"
                >
                  + Agregar
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="!cargandoBusqueda && criterioBusqueda" class="empty-busqueda">
            <p>Sin resultados para "{{ criterioBusqueda }}"</p>
          </div>
          <div v-else-if="!cargandoBusqueda" class="empty-busqueda">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-barcode-svg">
              <line x1="3" y1="5" x2="3" y2="19"></line>
              <line x1="7" y1="5" x2="7" y2="19"></line>
              <line x1="10" y1="5" x2="10" y2="19"></line>
              <line x1="15" y1="5" x2="15" y2="19"></line>
              <line x1="19" y1="5" x2="19" y2="19"></line>
              <line x1="21" y1="5" x2="21" y2="19"></line>
            </svg>
            <p>Pasa el código de barras por el lector para agregarlo de inmediato.</p>
          </div>
        </div>

      </aside>

      <!-- ── COLUMNA DERECHA: CARRITO PROTAGONISTA Y COBRO EN PANTALLA ── -->
      <main class="pos-main-col">

        <!-- CARD PRINCIPAL: CARRITO DE COMPRA -->
        <div class="pos-card carrito-principal-card">
          <div class="pos-card-header">
            <div class="carrito-header-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="header-icon-svg">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <h2 class="pos-card-title">Detalle de la Venta</h2>
              <span class="items-badge">{{ ventaStore.cantidadItemsCarrito }} artículos</span>
            </div>

            <button
              v-if="!ventaStore.carritoVacio"
              type="button"
              class="btn-text-danger"
              @click="ventaStore.limpiarCarrito()"
            >
              Vaciar carrito
            </button>
          </div>

          <!-- TABLA DE ARTÍCULOS EN EL CARRITO -->
          <div v-if="!ventaStore.carritoVacio" class="carrito-table-wrapper">
            <table class="erp-table table-spacious">
              <thead>
                <tr>
                  <th>Producto / Ítem</th>
                  <th style="width: 140px; text-align: center;">Cantidad</th>
                  <th style="width: 110px; text-align: right;">P. Unitario</th>
                  <th style="width: 120px; text-align: right;">Subtotal</th>
                  <th style="width: 50px; text-align: center;"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in ventaStore.carrito"
                  :key="item.inventarioId"
                  :class="{ 'tr-stock-cero': item.stockDisponible <= 0 }"
                >
                  <td>
                    <div class="item-main-name">{{ item.nombreProducto }}</div>
                    <div class="item-meta-row">
                      <span v-if="item.codigoInterno" class="cell-sub">Cód: {{ item.codigoInterno }}</span>
                      <span v-if="item.enDescuento" class="oferta-tag">Precio Oferta</span>
                      <span v-if="item.stockDisponible <= 0" class="alerta-sin-stock-tag">Agotado en otra venta</span>
                      <span v-else class="cell-sub stock-disp-badge">Stock: {{ item.stockDisponible }}</span>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <div class="qty-control-box">
                      <button type="button" class="btn-qty" @click="ventaStore.cambiarCantidad(item.inventarioId, -1)">−</button>
                      <span class="qty-display">{{ item.cantidad }}</span>
                      <button
                        type="button"
                        class="btn-qty"
                        :disabled="item.cantidad >= item.stockDisponible || item.stockDisponible <= 0"
                        @click="ventaStore.cambiarCantidad(item.inventarioId, 1)"
                      >+</button>
                    </div>
                  </td>
                  <td style="text-align: right;" class="cell-price-unit">{{ formatearPrecio(item.precioUnitario) }}</td>
                  <td style="text-align: right;" class="cell-price-subtotal">{{ formatearPrecio(item.precioUnitario * item.cantidad) }}</td>
                  <td style="text-align: center;">
                    <button
                      type="button"
                      class="btn-remove-row"
                      title="Eliminar producto"
                      @click="ventaStore.quitarDelCarrito(item.inventarioId)"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ESTADO VACÍO CUANDO NO HAY PRODUCTOS -->
          <div v-else class="carrito-empty-container">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" class="empty-cart-large-svg">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h3>El carrito está vacío</h3>
            <p>Escanea un código de barras o busca productos a la izquierda para iniciar el cobro.</p>
          </div>

          <!-- ═══════════════════════════════════════════════════════════
               SECCIÓN DE COBRO INTEGRADA DIRECTAMENTE EN PANTALLA PRINCIPAL
          ═══════════════════════════════════════════════════════════════ -->
          <div class="cobro-inline-section">

            <!-- FILA SUPERIOR: TOTAL A PAGAR Y MÉTODOS -->
            <div class="cobro-top-bar">
              <div class="total-big-box">
                <span class="total-big-label">Total a Pagar</span>
                <span class="total-big-val">{{ formatearPrecio(ventaStore.totalCarrito) }}</span>
              </div>

              <!-- SELECTOR DE MÉTODO DE PAGO -->
              <div class="metodos-bar">
                <button
                  v-for="m in METODOS"
                  :key="m.id"
                  type="button"
                  class="metodo-chip"
                  :class="{ 'metodo-chip-active': metodoSeleccionado === m.id }"
                  @click="metodoSeleccionado = m.id as 1|2|3|4"
                >
                  <svg v-if="m.key === 'efectivo'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chip-svg">
                    <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                    <circle cx="12" cy="12" r="2"></circle>
                    <path d="M6 12h.01M18 12h.01"></path>
                  </svg>
                  <svg v-else-if="m.key === 'qr'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chip-svg">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <svg v-else-if="m.key === 'tarjeta'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chip-svg">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chip-svg">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                  <span>{{ m.label }}</span>
                </button>
              </div>
            </div>

            <!-- DETALLES DE PAGO SEGÚN MÉTODO SELECCIONADO (EN PANTALLA PRINCIPAL) -->
            <div class="cobro-detalles-box">

              <!-- EFECTIVO: MONTO RECIBIDO Y CAMBIO VISIBLE DEBAJO DEL TOTAL -->
              <div v-if="metodoSeleccionado === 1" class="efectivo-details-grid">
                <div class="efectivo-inputs-col">
                  <label class="form-label font-bold">Monto recibido del cliente (Bs.)</label>
                  <div class="monto-recibido-row">
                    <input
                      v-model.number="montoRecibido"
                      type="number"
                      class="form-control form-control-lg monto-input"
                      placeholder="0.00"
                      min="0"
                      step="0.10"
                    />
                    <div class="preset-buttons">
                      <button
                        type="button"
                        class="btn-preset"
                        @click="setMontoRecibido(ventaStore.totalCarrito)"
                      >
                        Exacto
                      </button>
                      <button
                        v-for="billete in [10, 20, 50, 100, 200]"
                        :key="billete"
                        type="button"
                        class="btn-preset"
                        @click="setMontoRecibido(billete)"
                      >
                        {{ billete }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- CAMBIO A DEVOLVER PROMINENTE -->
                <div class="cambio-display-card" :class="{ 'cambio-display-card--active': montoRecibido && montoRecibido >= ventaStore.totalCarrito }">
                  <span class="cambio-title">Cambio a Devolver</span>
                  <strong class="cambio-monto">{{ formatearPrecio(cambio) }}</strong>
                  <span v-if="montoRecibido && montoRecibido < ventaStore.totalCarrito" class="cambio-faltante">
                    Faltan {{ formatearPrecio(ventaStore.totalCarrito - (montoRecibido || 0)) }}
                  </span>
                </div>
              </div>

              <!-- QR: NOTIFICACIÓN Y CONFIRMACIÓN -->
              <div v-else-if="metodoSeleccionado === 2" class="digital-confirm-row">
                <div class="digital-text-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="digital-mini-svg">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Muestra el código QR estático o dinámico al cliente y espera la notificación bancaria.</span>
                </div>
                <label class="checkbox-confirm-label">
                  <input type="checkbox" v-model="confirmadoQR" class="checkbox-input" />
                  <span>Confirmo recepción del pago por QR</span>
                </label>
              </div>

              <!-- TARJETA: DATÁFONO -->
              <div v-else-if="metodoSeleccionado === 3" class="digital-confirm-row">
                <div class="digital-text-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="digital-mini-svg">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <span>Pasa la tarjeta por el datáfono físico y verifica la emisión del comprobante bancario.</span>
                </div>
                <label class="checkbox-confirm-label">
                  <input type="checkbox" v-model="confirmadoTarjeta" class="checkbox-input" />
                  <span>Confirmo transacción aprobada en el datáfono</span>
                </label>
              </div>

              <!-- MIXTO: DISTRIBUCIÓN DE IMPORTES -->
              <div v-else-if="metodoSeleccionado === 4" class="mixto-details-box">
                <div class="mixto-inputs-grid">
                  <div class="form-group mb-0">
                    <label class="form-label">Efectivo (Bs.)</label>
                    <input v-model.number="mixtoEfectivo" type="number" class="form-control" placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label">QR (Bs.)</label>
                    <input v-model.number="mixtoQr" type="number" class="form-control" placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label">Tarjeta (Bs.)</label>
                    <input v-model.number="mixtoTarjeta" type="number" class="form-control" placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>
                <div class="mixto-balance-bar" :class="mixtoValido ? 'balance-ok' : 'balance-error'">
                  <span>Suma: {{ formatearPrecio(sumaMixto) }}</span>
                  <span>Total requerido: {{ formatearPrecio(ventaStore.totalCarrito) }}</span>
                </div>
              </div>

            </div>

            <!-- BOTONES DE ACCIÓN PRINCIPALES -->
            <div class="cobro-actions-bar">
              <button
                type="button"
                class="btn-primary btn-confirmar-venta"
                :disabled="ventaStore.carritoVacio || ventaStore.carrito.some(i => i.stockDisponible <= 0 || i.cantidad > i.stockDisponible)"
                @click="abrirModalConfirmar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-action-icon">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Confirmar Venta
              </button>
            </div>

          </div>

        </div>

      </main>

    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         MODAL: SELECCIÓN DE LOTE / PRECIO (CUANDO HAY MÚLTIPLES LOTES)
    ═══════════════════════════════════════════════════════════════ -->
    <div v-if="modalDescuentoVisible" class="modal-backdrop" @click.self="cerrarModalDescuento">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <div class="modal-title-with-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="title-svg primary">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <h3 class="modal-title">Selección de Lote</h3>
          </div>
          <button type="button" class="btn-close-modal" @click="cerrarModalDescuento">×</button>
        </div>
        <div class="modal-form" v-if="loteOfertaSeleccion && loteNormalSeleccion">
          <p>
            El producto <strong>{{ loteOfertaSeleccion.nombreProducto }}</strong> cuenta con dos lotes disponibles en inventario (uno normal y otro con descuento).
          </p>
          <p class="cell-sub">Selecciona cuál lote es el que se está entregando al cliente:</p>

          <div class="precio-opciones-grid">
            <button type="button" class="btn-primary precio-btn" @click="elegirLoteOferta">
              <span class="precio-btn-title">Lote con Descuento</span>
              <span class="precio-btn-val">{{ formatearPrecio(loteOfertaSeleccion.precioDescuento!) }}</span>
              <span class="precio-btn-stock">Stock disponible: {{ loteOfertaSeleccion.stockDisponible }} unids.</span>
            </button>
            <button type="button" class="btn-secondary precio-btn" @click="elegirLoteNormal">
              <span class="precio-btn-title">Lote Normal</span>
              <span class="precio-btn-val">{{ formatearPrecio(loteNormalSeleccion.precioVenta) }}</span>
              <span class="precio-btn-stock">Stock disponible: {{ loteNormalSeleccion.stockDisponible }} unids.</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         MODAL: CONFIRMACIÓN DE VENTA (SIN CONTADOR DE 5 SEGUNDOS)
    ═══════════════════════════════════════════════════════════════ -->
    <div v-if="modalConfirmarVisible" class="modal-backdrop" @click.self="nuevaVenta()">
      <div class="modal-card modal-card-confirm">

        <!-- 1. ESTADO: ENVIANDO A BASE DE DATOS -->
        <div v-if="ventaStore.registrandoVenta" class="modal-form text-center py-4">
          <div class="spinner-large"></div>
          <h3 class="font-bold mt-3">Confirmando Venta...</h3>
          <p class="cell-sub">Registrando transacción y deduciendo inventario en base de datos.</p>
        </div>

        <!-- 2. ESTADO: VENTA COMPLETADA EXITOSAMENTE (CON CHECK Y BOTÓN DE IMPRIMIR) -->
        <template v-else-if="ventaStore.ventaRegistrada">
          <div class="modal-header">
            <div class="modal-title-with-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="title-svg success">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <h3 class="modal-title">Venta Registrada</h3>
            </div>
            <button type="button" class="btn-close-modal" @click="nuevaVenta()" title="Cerrar y nueva venta">×</button>
          </div>

          <div class="modal-form text-center py-3">
            <div class="success-badge-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="success-check-svg">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h2 class="success-title">¡Venta Registrada con Éxito!</h2>
            <p class="cell-sub">Ticket #{{ ventaStore.ventaRegistrada.ventaId }} emitido correctamente.</p>

            <div class="resumen-exito-card">
              <div class="resumen-line">
                <span>Total Cobrado:</span>
                <strong class="text-primary font-bold">{{ formatearPrecio(ventaStore.ventaRegistrada.precioTotal) }}</strong>
              </div>
              <div v-if="(ventaStore.ventaRegistrada.cambio ?? 0) > 0" class="resumen-line text-success">
                <span>Cambio entregado:</span>
                <strong>{{ formatearPrecio(ventaStore.ventaRegistrada.cambio || 0) }}</strong>
              </div>
              <div class="resumen-line">
                <span>Cajero:</span>
                <span>{{ authStore.nombreCompleto }}</span>
              </div>
            </div>

            <div class="acciones-exito-row">
              <button
                type="button"
                class="btn-primary btn-lg"
                @click="imprimirRecibo()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Imprimir Factura / Recibo
              </button>
              <button
                type="button"
                class="btn-secondary btn-lg"
                @click="nuevaVenta()"
              >
                + Nueva Venta
              </button>
            </div>
          </div>
        </template>

        <!-- 3. ESTADO: ERROR EN EL REGISTRO -->
        <div v-else-if="ventaStore.errorVenta" class="modal-form text-center py-3">
          <div class="error-badge-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="error-svg">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 class="font-bold text-danger mt-2">Error al Registrar Venta</h3>
          <p class="cell-sub mt-1">{{ ventaStore.errorVenta }}</p>
          <div class="mt-4">
            <button type="button" class="btn-secondary" @click="cerrarModalConfirmar">
              Cerrar y Revisar Carrito
            </button>
          </div>
        </div>

        <!-- 4. ESTADO: PREGUNTAR CONFIRMACIÓN (RESUMEN CLARO) -->
        <template v-else>
          <div class="modal-header">
            <div class="modal-title-with-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="title-svg primary">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <h3 class="modal-title">Confirmar Venta</h3>
            </div>
            <button type="button" class="btn-close-modal" @click="cerrarModalConfirmar">×</button>
          </div>

          <div class="modal-form">
            <p class="mb-3">Verifica los datos antes de registrar la transacción en el sistema:</p>

            <div class="confirm-summary-card">
              <div class="summary-line highlight-line">
                <span>Total a Cobrar:</span>
                <strong class="total-summary-val">{{ formatearPrecio(ventaStore.totalCarrito) }}</strong>
              </div>
              <div class="summary-line">
                <span>Método de Pago:</span>
                <strong>{{ METODOS.find(m => m.id === metodoSeleccionado)?.label }}</strong>
              </div>
              <div v-if="metodoSeleccionado === 1" class="summary-line">
                <span>Monto Recibido:</span>
                <span>{{ formatearPrecio(montoRecibido || 0) }}</span>
              </div>
              <div v-if="metodoSeleccionado === 1" class="summary-line text-success">
                <span>Cambio a Devolver:</span>
                <strong class="font-bold">{{ formatearPrecio(cambio) }}</strong>
              </div>
              <div class="summary-line">
                <span>Cliente:</span>
                <span>{{ formCliente.nombreRazonSocial || (formCliente.nombres ? `${formCliente.nombres} ${formCliente.apellidos}` : 'Cliente General') }}</span>
              </div>
              <div v-if="formCliente.nit" class="summary-line">
                <span>NIT / C.I.:</span>
                <span>{{ formCliente.nit }}</span>
              </div>
              <div class="summary-line">
                <span>Total Artículos:</span>
                <span>{{ ventaStore.cantidadItemsCarrito }} unidades</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="cerrarModalConfirmar">
              Rechazar / Volver
            </button>
            <button type="button" class="btn-primary" @click="ejecutarRegistroVenta">
              Confirmar y Registrar Venta
            </button>
          </div>
        </template>

      </div>
    </div>

  </div>
</template>

<style scoped src="./TerminalPOSView.css"></style>
