<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificacionesStore } from '@/stores/notificaciones'
import type { VerificacionStockVentaDTO } from '@/services/notificacionesService'
import { inventarioService } from '@/modules/inventario/services/inventarioService'

const authStore = useAuthStore()
const notificacionesStore = useNotificacionesStore()

// Sucursal actual
const sucursalId = computed(() => authStore.sucursalId || 1)

// Estado del formulario de venta rápida
const productoSeleccionadoId = ref<number>(1)
const cantidadVenta = ref<number>(1)
const verificando = ref<boolean>(false)
const procesandoVenta = ref<boolean>(false)

// Lista de productos para la caja
interface ItemProducto {
  id: number
  codigo: string
  nombre: string
  precio: number
}

const catalogoCaja = ref<ItemProducto[]>([
  { id: 1, codigo: 'LAC-001', nombre: 'Leche Pil Natural 1L', precio: 6.5 },
  { id: 2, codigo: 'LAC-002', nombre: 'Yogurt Frutilla 1L Pil', precio: 12.0 },
  { id: 3, codigo: 'BEB-001', nombre: 'Coca Cola 2L Retornable', precio: 10.0 },
  { id: 4, codigo: 'BEB-002', nombre: 'Agua Vital Sin Gas 2L', precio: 6.0 },
  { id: 5, codigo: 'BEB-003', nombre: 'Cerveza Paceña 710ml', precio: 15.0 },
  { id: 6, codigo: 'BEB-004', nombre: 'Malta Maltin Clasica 330ml', precio: 4.5 },
  { id: 7, codigo: 'ABA-001', nombre: 'Arroz Grano de Oro 1kg', precio: 8.5 },
  { id: 8, codigo: 'ABA-002', nombre: 'Aceite Fino 900ml', precio: 11.5 },
])

// Cargar catálogo real si está disponible
onMounted(async () => {
  try {
    const prods = await inventarioService.listarCatalogo('ACTIVOS')
    if (prods && prods.length > 0) {
      catalogoCaja.value = prods.map((p) => ({
        id: p.producto_id || (p as any).productoId || 1,
        codigo: p.codigo_interno || (p as any).codigoInterno || 'PROD',
        nombre: p.nombre_producto || (p as any).nombreProducto || 'Producto',
        precio: p.precio_venta || (p as any).precioVenta || 10.0,
      }))
    }
  } catch (_) {
    // Si no responde, mantener el catálogo predeterminado
  }
})

// Resultado de la verificación en tiempo real (PostgreSQL fn_notificaciones_verificar_stock_venta)
const resultadoVerificacion = ref<VerificacionStockVentaDTO | null>(null)
const mensajeVentaExitosa = ref<string | null>(null)

const productoActivo = computed<ItemProducto>(() => {
  const item = catalogoCaja.value.find((p) => p.id === Number(productoSeleccionadoId.value))
  return item || catalogoCaja.value[0] || { id: 1, codigo: 'PROD', nombre: 'Producto', precio: 10.0 }
})

const totalCalculado = computed(() => {
  return (productoActivo.value.precio * (cantidadVenta.value || 0)).toFixed(2)
})

// Verificación automática o manual
async function verificarDisponibilidad() {
  if (!cantidadVenta.value || cantidadVenta.value <= 0) return

  verificando.value = true
  mensajeVentaExitosa.value = null
  try {
    const res = await notificacionesStore.verificarStockVenta(
      sucursalId.value,
      productoSeleccionadoId.value,
      cantidadVenta.value
    )
    resultadoVerificacion.value = res
  } catch (err: any) {
    resultadoVerificacion.value = {
      puedeVender: false,
      stockActual: 0,
      stockRestante: 0,
      nivelAlerta: 'ERROR',
      mensajeAlerta: err.userMessage || 'No se pudo verificar el stock con la base de datos.',
    }
  } finally {
    verificando.value = false
  }
}

// Ejecución de la venta con validación estricta
async function procesarCobro() {
  await verificarDisponibilidad()

  if (!resultadoVerificacion.value?.puedeVender) {
    return // Bloqueo estricto por falta de stock
  }

  procesandoVenta.value = true
  try {
    // Simular cierre de ticket y actualización de inventario
    mensajeVentaExitosa.value = `¡Venta procesada con éxito! Ticket #VTA-${Date.now().toString().slice(-6)} emitido por Bs ${totalCalculado.value}.`

    // Si la venta dejó stock crítico o en 0, notificar inmediatamente
    if (
      resultadoVerificacion.value.nivelAlerta === 'AGOTADO_POST_VENTA' ||
      resultadoVerificacion.value.nivelAlerta === 'STOCK_BAJO_POST_VENTA'
    ) {
      notificacionesStore.mostrarAlertaEmergente({
        id: `STOCK_ALERT_${Date.now()}`,
        titulo: 'Alerta de Inventario en Tiempo Real',
        mensaje: resultadoVerificacion.value.mensajeAlerta,
        severidad: resultadoVerificacion.value.nivelAlerta === 'AGOTADO_POST_VENTA' ? 'CRITICA' : 'ADVERTENCIA',
        tipoAlerta: resultadoVerificacion.value.nivelAlerta === 'AGOTADO_POST_VENTA' ? 'STOCK_AGOTADO' : 'STOCK_BAJO',
        fecha: new Date(),
      })
    }

    // Refrescar inmediatamente el contador de notificaciones del ERP
    await notificacionesStore.cargarNotificaciones(true)
    resultadoVerificacion.value = null
  } finally {
    procesandoVenta.value = false
  }
}
</script>

<template>
  <div class="pos-container">
    <div class="pos-grid">
      <!-- PANEL IZQUIERDO: SELECCIÓN DE PRODUCTOS Y CANTIDAD -->
      <div class="pos-card pos-main-panel">
        <div class="pos-header">
          <span class="badge">Terminal de Ventas POS</span>
          <h1 class="pos-title">Facturación y Cobro en Caja</h1>
          <p class="pos-subtitle">
            Validación de stock físico en tiempo real con el servidor central de Almacén Warnes.
          </p>
        </div>

        <!-- FORMULARIO DE COBRO RÁPIDO -->
        <div class="pos-form">
          <div class="form-group">
            <label class="form-label">Producto a Registrar</label>
            <select
              v-model="productoSeleccionadoId"
              class="form-select"
              @change="verificarDisponibilidad"
            >
              <option
                v-for="p in catalogoCaja"
                :key="p.id"
                :value="p.id"
              >
                {{ p.codigo }} - {{ p.nombre }} (Bs {{ p.precio.toFixed(2) }})
              </option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group col-qty">
              <label class="form-label">Cantidad a Vender</label>
              <input
                v-model.number="cantidadVenta"
                type="number"
                min="1"
                class="form-input"
                @input="verificarDisponibilidad"
              />
            </div>

            <div class="form-group col-price">
              <label class="form-label">Precio Unitario</label>
              <div class="price-display">Bs {{ productoActivo.precio.toFixed(2) }}</div>
            </div>

            <div class="form-group col-total">
              <label class="form-label">Subtotal a Cobrar</label>
              <div class="total-display">Bs {{ totalCalculado }}</div>
            </div>
          </div>

          <div class="pos-actions">
            <button
              type="button"
              class="btn-secondary"
              :disabled="verificando"
              @click="verificarDisponibilidad"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>{{ verificando ? 'Verificando...' : 'Verificar Stock en Estantería' }}</span>
            </button>

            <button
              type="button"
              class="btn-primary"
              :disabled="verificando || procesandoVenta || (resultadoVerificacion !== null && !resultadoVerificacion.puedeVender)"
              @click="procesarCobro"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              <span>{{ procesandoVenta ? 'Procesando...' : 'Cobrar e Imprimir Ticket' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- PANEL DERECHO: MONITOR DE DISPONIBILIDAD Y RESULTADO EN VIVO -->
      <div class="pos-card pos-feedback-panel">
        <h3 class="panel-section-title">Disponibilidad en Sucursal</h3>

        <!-- CASO: SIN CONSULTA TODAVÍA -->
        <div v-if="!resultadoVerificacion && !mensajeVentaExitosa" class="feedback-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="feedback-empty-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
          </svg>
          <p class="fb-title">Listo para consultar</p>
          <p class="fb-desc">Modifica la cantidad o pulsa 'Verificar Stock' para validar las existencias físicas.</p>
        </div>

        <!-- CASO: VENTA COMPLETADA EXITOSA -->
        <div v-if="mensajeVentaExitosa" class="feedback-box box-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="status-svg success-color">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <div>
            <h4 class="box-title">Operación Confirmada</h4>
            <p class="box-msg">{{ mensajeVentaExitosa }}</p>
          </div>
        </div>

        <!-- CASO 1: BLOQUEO POR STOCK INSUFICIENTE (CRITERIO 1) -->
        <div
          v-if="resultadoVerificacion && !resultadoVerificacion.puedeVender"
          class="feedback-box box-error"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="status-svg error-color">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <h4 class="box-title">Venta Bloqueada: Stock Insuficiente</h4>
            <p class="box-msg">{{ resultadoVerificacion.mensajeAlerta }}</p>
            <div class="stock-stats">
              <span class="stat-pill pill-gray">Disponibles: {{ resultadoVerificacion.stockActual }} u.</span>
              <span class="stat-pill pill-red">Faltante: {{ Math.abs(resultadoVerificacion.stockRestante) }} u.</span>
            </div>
          </div>
        </div>

        <!-- CASO 2: PROCEDE PERO AGOTA EL PRODUCTO -->
        <div
          v-else-if="resultadoVerificacion && resultadoVerificacion.nivelAlerta === 'AGOTADO_POST_VENTA'"
          class="feedback-box box-warning"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="status-svg warning-color">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div>
            <h4 class="box-title">Atención: Agotamiento Inminente</h4>
            <p class="box-msg">{{ resultadoVerificacion.mensajeAlerta }}</p>
            <div class="stock-stats">
              <span class="stat-pill pill-yellow">Stock resultante: 0 unidades</span>
            </div>
          </div>
        </div>

        <!-- CASO 3: PROCEDE PERO DEJA STOCK BAJO (<= 10) -->
        <div
          v-else-if="resultadoVerificacion && resultadoVerificacion.nivelAlerta === 'STOCK_BAJO_POST_VENTA'"
          class="feedback-box box-warning"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="status-svg warning-color">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div>
            <h4 class="box-title">Advertencia: Stock Bajo Post-Venta</h4>
            <p class="box-msg">{{ resultadoVerificacion.mensajeAlerta }}</p>
            <div class="stock-stats">
              <span class="stat-pill pill-yellow">Stock resultante: {{ resultadoVerificacion.stockRestante }} u.</span>
            </div>
          </div>
        </div>

        <!-- CASO 4: PROCEDE CON STOCK PLENO -->
        <div
          v-else-if="resultadoVerificacion && resultadoVerificacion.puedeVender"
          class="feedback-box box-success"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="status-svg success-color">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <div>
            <h4 class="box-title">Disponibilidad Óptima</h4>
            <p class="box-msg">{{ resultadoVerificacion.mensajeAlerta }}</p>
            <div class="stock-stats">
              <span class="stat-pill pill-green">Stock restante: {{ resultadoVerificacion.stockRestante }} u.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pos-container {
  width: 100%;
}

.pos-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
}

@media (max-width: 1024px) {
  .pos-grid {
    grid-template-columns: 1fr;
  }
}

.pos-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #10b981;
  background-color: #ecfdf5;
  border-radius: 9999px;
  margin-bottom: 0.75rem;
}

.pos-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.pos-subtitle {
  color: #64748b;
  font-size: 0.92rem;
  margin-bottom: 1.75rem;
}

.pos-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
}

.form-select,
.form-input {
  height: 44px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0 12px;
  font-size: 0.95rem;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
}

.form-select:focus,
.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.form-row {
  display: grid;
  grid-template-columns: 140px 1fr 1fr;
  gap: 16px;
}

.price-display,
.total-display {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.total-display {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.pos-actions {
  display: flex;
  gap: 12px;
  margin-top: 1rem;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.btn-primary {
  background: #10b981;
  color: #ffffff;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-secondary {
  background: #0f172a;
  color: #ffffff;
}

.btn-secondary:hover:not(:disabled) {
  background: #1e293b;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* PANEL DE DISPONIBILIDAD */
.panel-section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.feedback-empty {
  padding: 3rem 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.feedback-empty-icon {
  width: 44px;
  height: 44px;
  color: #cbd5e1;
  margin-bottom: 0.75rem;
}

.fb-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 4px;
}

.fb-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.4;
}

/* CAJAS DE ALERTA */
.feedback-box {
  padding: 1.25rem;
  border-radius: 12px;
  display: flex;
  gap: 12px;
  margin-bottom: 1rem;
}

.box-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.box-warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}

.box-success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.status-svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-color {
  color: #ef4444;
}

.warning-color {
  color: #f59e0b;
}

.success-color {
  color: #10b981;
}

.box-title {
  font-size: 0.95rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.box-msg {
  font-size: 0.82rem;
  line-height: 1.45;
  margin-bottom: 8px;
}

.stock-stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stat-pill {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
}

.pill-gray {
  background: #e2e8f0;
  color: #334155;
}

.pill-red {
  background: #dc2626;
  color: #ffffff;
}

.pill-yellow {
  background: #f59e0b;
  color: #ffffff;
}

.pill-green {
  background: #16a34a;
  color: #ffffff;
}
</style>
