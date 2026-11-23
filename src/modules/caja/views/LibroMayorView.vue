<script setup lang="ts">
import './LibroMayorView.css'
import { useLibroMayor } from './LibroMayorView'

const props = defineProps<{
  tabInicial?: 'arqueo' | 'reportes'
}>()

const {
  authStore,
  pestanaActiva,
  cambiarPestana,
  listaSucursales,
  listaUsuarios,
  mensajeExito,
  errorGeneral,
  esCajero,
  esSupervisor,
  esPropietario,

  // Pestaña 1: Arqueo
  cargandoArqueo,
  guardandoArqueo,
  omitiendoArqueo,
  errorArqueo,
  resumenTurno,
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
  sumaEntradasDeclaradas,
  movEntradasTurno,
  totalEntradasFinal,
  sumaSalidasDeclaradas,
  movSalidasTurno,
  totalSalidasFinal,
  utilidadArqueo,
  totalVentasEsperadas,
  diferenciaVentas,
  cargarResumenTurno,
  agregarEntrada,
  eliminarEntrada,
  agregarSalida,
  eliminarSalida,
  abrirConfirmacionArqueo,
  ejecutarRegistroArqueo,
  ejecutarOmitirArqueo,

  // Pestaña 2: Reportes
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

  // Modal Detalle
  modalDetalleVisible,
  cargandoDetalle,
  reporteDetalle,
  pestanaDetalle,
  abrirModalDetalle,
  cerrarModalDetalle,

  // Exportadores
  exportarExcelReportes,
  exportarPdfReportes,
  descargarComprobantePdf,

  // Utilidades
  formatearMonto,
  formatearFecha,
  formatearHora,
  formatearFechaHora,
  formatearDuracion,
} = useLibroMayor(props.tabInicial)
</script>

<template>
  <div class="lm-wrapper">
    <!-- TOPBAR SUPERIOR -->
    <header class="lm-topbar">
      <div class="lm-topbar-left">
        <div class="lm-page-icon">
          <!-- SVG: Libro Mayor / Control Financiero Sobrio -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
          </svg>
        </div>
        <div>
          <h1 class="lm-page-title">Libro Mayor y Control de Caja</h1>
          <p class="lm-page-subtitle">
            Cierres de turno, balance de arqueos y reportes financieros consolidados
          </p>
        </div>
      </div>

      <div class="lm-topbar-right">
        <!-- Badge de Sucursal -->
        <div class="lm-branch-badge" title="Sucursal de trabajo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
            <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
          </svg>
          <span>{{ authStore.sucursalNombre || 'Sucursal Central' }}</span>
        </div>

        <div class="lm-branch-badge" title="Usuario activo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>{{ authStore.nombreCompleto || 'Usuario' }}</span>
        </div>
      </div>
    </header>

    <!-- MENSAJES DE ESTADO -->
    <div v-if="mensajeExito" class="lm-alert-success">
      <span>{{ mensajeExito }}</span>
      <button type="button" class="lm-btn-icon-sm" @click="mensajeExito = null">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div v-if="errorGeneral" class="lm-alert-danger">
      <span>{{ errorGeneral }}</span>
      <button type="button" class="lm-btn-icon-sm" @click="errorGeneral = null">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- PESTAÑAS PRINCIPALES DEL MÓDULO -->
    <nav class="lm-tabs-nav">
      <button
        type="button"
        class="lm-tab-btn"
        :class="{ active: pestanaActiva === 'arqueo' }"
        @click="cambiarPestana('arqueo')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        <span>Arqueo y Cierre de Turno</span>
        <span v-if="resumenTurno?.requiereArqueo" class="lm-tab-pill" style="background-color: #fef3c7; color: #92400e;">
          Turno Abierto
        </span>
      </button>

      <button
        type="button"
        class="lm-tab-btn"
        :class="{ active: pestanaActiva === 'reportes' }"
        @click="cambiarPestana('reportes')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>Histórico de Reportes y Auditoría</span>
        <span v-if="listaReportes.length > 0" class="lm-tab-pill">
          {{ listaReportes.length }}
        </span>
      </button>
    </nav>

    <!-- ================================================================ -->
    <!-- CONTENIDO PESTAÑA 1: ARQUEO DE CAJA                             -->
    <!-- ================================================================ -->
    <section v-if="pestanaActiva === 'arqueo'">
      <!-- SPINNER -->
      <div v-if="cargandoArqueo" style="padding: 4rem 1rem; text-align: center;">
        <div style="width: 32px; height: 32px; margin: 0 auto 1rem; border: 3px solid #e2e8f0; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p style="font-size: 0.85rem; color: #64748b;">Cargando actividad y estado del turno...</p>
      </div>

      <!-- ERROR DE ARQUEO -->
      <div v-else-if="errorArqueo" class="lm-alert-danger">
        <span>{{ errorArqueo }}</span>
      </div>

      <!-- CASO: SIN TURNO ACTIVO (INFORMACIÓN Y ADAPTACIÓN POR ROL) -->
      <div v-else-if="sinTurnoActivo || !resumenTurno" class="lm-shift-banner" style="display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; padding: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div class="lm-shift-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h3 style="font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0;">
              No tiene un turno de caja activo abierto
            </h3>
            <p v-if="esCajero" style="font-size: 0.825rem; color: #64748b; margin: 0.25rem 0 0 0;">
              Actualmente no tiene una sesión laboral abierta en la sucursal. Inicie sesión en la Terminal POS para registrar ventas y operar.
            </p>
            <p v-else style="font-size: 0.825rem; color: #64748b; margin: 0.25rem 0 0 0;">
              Su usuario ({{ authStore.rolNombre || 'Administrador' }}) no tiene un turno de caja con ventas pendientes de arqueo. Puede auditar sesiones abiertas de cajeros o consultar el historial de reportes.
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem;">
          <button type="button" class="lm-btn-dark" @click="cambiarPestana('reportes')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            </svg>
            <span>Ver Histórico de Reportes</span>
          </button>

          <router-link v-if="!esCajero" to="/admin/sesiones" class="lm-btn-secondary" style="text-decoration: none;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Auditar Sesiones Activas</span>
          </router-link>

          <router-link v-if="esCajero" to="/pos" class="lm-btn-secondary" style="text-decoration: none;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Ir a Terminal de Ventas (POS)</span>
          </router-link>

          <button type="button" class="lm-btn-secondary" @click="cargarResumenTurno">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
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
        <div class="lm-shift-banner">
          <div class="lm-shift-info">
            <div class="lm-shift-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0;">
                Turno Laboral Iniciado: {{ formatearFechaHora(resumenTurno.horaInicioTurno) }}
              </h3>
              <p style="font-size: 0.8rem; color: #64748b; margin: 0.2rem 0 0 0;">
                Consolida todas las transacciones registradas desde la apertura hasta el momento del corte
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="lm-badge" :class="resumenTurno.requiereArqueo ? 'lm-badge-amber' : 'lm-badge-slate'">
              {{ resumenTurno.requiereArqueo ? 'Actividad Registrada' : 'Sin Ventas Registradas' }}
            </span>

            <button
              type="button"
              class="lm-btn-secondary"
              :disabled="guardandoArqueo || omitiendoArqueo"
              @click="modalOmitirVisible = true"
            >
              <span>Omitir Arqueo</span>
            </button>

            <button
              type="button"
              class="lm-btn-dark"
              :disabled="guardandoArqueo || omitiendoArqueo"
              @click="abrirConfirmacionArqueo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ guardandoArqueo ? 'Procesando...' : 'Confirmar Arqueo y Cierre' }}</span>
            </button>
          </div>
        </div>

        <!-- KPIS DE VENTAS DEL TURNO -->
        <section class="lm-kpi-grid">
          <div class="lm-kpi-card">
            <div class="lm-kpi-info">
              <span class="lm-kpi-label">Ventas Totales Sistema</span>
              <span class="lm-kpi-value font-mono">{{ formatearMonto(resumenTurno.totalVentasGeneral) }}</span>
              <span class="lm-kpi-sub">{{ resumenTurno.conteoVentas }} ventas registradas</span>
            </div>
            <div class="lm-kpi-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
          </div>

          <div class="lm-kpi-card">
            <div class="lm-kpi-info">
              <span class="lm-kpi-label">Ventas en Efectivo</span>
              <span class="lm-kpi-value font-mono">{{ formatearMonto(resumenTurno.totalVentasEfectivo) }}</span>
              <span class="lm-kpi-sub">Fondo en gaveta de caja</span>
            </div>
            <div class="lm-kpi-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
          </div>

          <div class="lm-kpi-card">
            <div class="lm-kpi-info">
              <span class="lm-kpi-label">Ventas por QR / Digital</span>
              <span class="lm-kpi-value font-mono">{{ formatearMonto(resumenTurno.totalVentasQr) }}</span>
              <span class="lm-kpi-sub">Comprobantes QR</span>
            </div>
            <div class="lm-kpi-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
          </div>

          <div class="lm-kpi-card">
            <div class="lm-kpi-info">
              <span class="lm-kpi-label">Ventas con Tarjeta (POS)</span>
              <span class="lm-kpi-value font-mono">{{ formatearMonto(resumenTurno.totalVentasTarjeta) }}</span>
              <span class="lm-kpi-sub">Comprobantes de voucher</span>
            </div>
            <div class="lm-kpi-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
          </div>
        </section>

        <!-- FRENTE A FRENTE: INGRESOS Y EGRESOS DECLARADOS -->
        <div class="lm-frente-a-frente">
          <!-- PANEL IZQUIERDO: INGRESOS -->
          <div class="lm-col-panel">
            <div class="lm-panel-header">
              <h4 class="lm-panel-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; color: #16a34a;">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
                <span>Ingresos (Entradas de Caja)</span>
              </h4>
              <span class="lm-panel-total-badge lm-badge-emerald font-mono">
                Total: {{ formatearMonto(totalEntradasFinal) }}
              </span>
            </div>

            <div class="lm-panel-body">
              <table class="lm-data-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th style="width: 100px; text-align: right;">Declarado</th>
                    <th style="width: 36px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, idx) in entradasDeclaradas" :key="'ent-' + idx">
                    <td>
                      <span style="font-weight: 600; color: #1e293b;">{{ p.descripcion }}</span>
                      <div v-if="p.esSistema" style="font-size: 0.725rem; color: #64748b;">
                        Registrado en sistema: {{ formatearMonto(p.montoSistema) }}
                      </div>
                    </td>
                    <td style="text-align: right;">
                      <input
                        v-model.number="p.monto"
                        type="number"
                        step="0.01"
                        min="0"
                        class="lm-filter-input"
                        style="width: 100px; text-align: right; font-family: monospace;"
                      />
                    </td>
                    <td style="text-align: center;">
                      <button
                        v-if="!p.esSistema"
                        type="button"
                        class="lm-btn-icon-sm"
                        title="Eliminar"
                        @click="eliminarEntrada(idx)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #ef4444;">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>

                  <!-- Movimientos extra-venta de entrada -->
                  <tr v-for="m in movimientosEntradaList" :key="'mov-ent-' + m.movimiento_id" style="background-color: #f8fafc;">
                    <td>
                      <span style="font-size: 0.8rem; color: #334155;">{{ m.detalle || 'Ingreso de caja' }}</span>
                      <div style="font-size: 0.725rem; color: #16a34a;">Movimiento extra-venta</div>
                    </td>
                    <td style="text-align: right; font-family: monospace; font-weight: 600;">
                      {{ formatearMonto(m.monto) }}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <!-- Agregar entrada extra -->
              <div class="lm-add-row-form">
                <select v-model="nuevaEntrada.tipo" class="lm-filter-select">
                  <option v-for="m in METODOS_CONCEPTO" :key="m.id" :value="m.id">{{ m.label }}</option>
                </select>
                <input
                  v-model="nuevaEntrada.descripcion"
                  type="text"
                  placeholder="Descripción ingreso..."
                  class="lm-filter-input"
                />
                <input
                  v-model.number="nuevaEntrada.monto"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="lm-filter-input"
                />
                <button type="button" class="lm-btn-icon-sm" title="Agregar" @click="agregarEntrada">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- PANEL DERECHO: EGRESOS -->
          <div class="lm-col-panel">
            <div class="lm-panel-header">
              <h4 class="lm-panel-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; color: #dc2626;">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                <span>Egresos (Salidas de Caja)</span>
              </h4>
              <span class="lm-panel-total-badge lm-badge-red font-mono">
                Total: {{ formatearMonto(totalSalidasFinal) }}
              </span>
            </div>

            <div class="lm-panel-body">
              <table class="lm-data-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th style="width: 100px; text-align: right;">Declarado</th>
                    <th style="width: 36px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="salidasDeclaradas.length === 0 && movimientosSalidaList.length === 0">
                    <td colspan="3" style="text-align: center; color: #94a3b8; padding: 1.5rem 0;">
                      Sin salidas registradas en este turno
                    </td>
                  </tr>

                  <tr v-for="(p, idx) in salidasDeclaradas" :key="'sal-' + idx">
                    <td>
                      <span style="font-weight: 600; color: #1e293b;">{{ p.descripcion }}</span>
                    </td>
                    <td style="text-align: right;">
                      <input
                        v-model.number="p.monto"
                        type="number"
                        step="0.01"
                        min="0"
                        class="lm-filter-input"
                        style="width: 100px; text-align: right; font-family: monospace;"
                      />
                    </td>
                    <td style="text-align: center;">
                      <button
                        type="button"
                        class="lm-btn-icon-sm"
                        title="Eliminar"
                        @click="eliminarSalida(idx)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #ef4444;">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>

                  <!-- Movimientos extra-venta de salida -->
                  <tr v-for="m in movimientosSalidaList" :key="'mov-sal-' + m.movimiento_id" style="background-color: #f8fafc;">
                    <td>
                      <span style="font-size: 0.8rem; color: #334155;">{{ m.detalle || 'Egreso de caja' }}</span>
                      <div style="font-size: 0.725rem; color: #dc2626;">Movimiento extra-venta</div>
                    </td>
                    <td style="text-align: right; font-family: monospace; font-weight: 600;">
                      {{ formatearMonto(m.monto) }}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <!-- Agregar salida extra -->
              <div class="lm-add-row-form">
                <select v-model="nuevaSalida.tipo" class="lm-filter-select">
                  <option v-for="m in METODOS_CONCEPTO" :key="m.id" :value="m.id">{{ m.label }}</option>
                </select>
                <input
                  v-model="nuevaSalida.descripcion"
                  type="text"
                  placeholder="Descripción egreso..."
                  class="lm-filter-input"
                />
                <input
                  v-model.number="nuevaSalida.monto"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="lm-filter-input"
                />
                <button type="button" class="lm-btn-icon-sm" title="Agregar" @click="agregarSalida">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- BALANCE FINAL Y DIFERENCIA DEL ARQUEO -->
        <div class="lm-balance-summary-card">
          <div class="lm-balance-grid">
            <div>
              <span class="lm-kpi-label">Total Entradas</span>
              <div style="font-size: 1.15rem; font-weight: 700; color: #16a34a; font-family: monospace;">
                {{ formatearMonto(totalEntradasFinal) }}
              </div>
            </div>

            <div>
              <span class="lm-kpi-label">Total Salidas</span>
              <div style="font-size: 1.15rem; font-weight: 700; color: #dc2626; font-family: monospace;">
                {{ formatearMonto(totalSalidasFinal) }}
              </div>
            </div>

            <div>
              <span class="lm-kpi-label">Utilidad / Saldo Neto</span>
              <div style="font-size: 1.25rem; font-weight: 700; color: #0f172a; font-family: monospace;">
                {{ formatearMonto(utilidadArqueo) }}
              </div>
            </div>

            <div>
              <span class="lm-kpi-label">Diferencia de Arqueo</span>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
                <span
                  class="lm-badge font-mono"
                  :class="diferenciaVentas === 0 ? 'lm-badge-emerald' : diferenciaVentas > 0 ? 'lm-badge-amber' : 'lm-badge-red'"
                  style="font-size: 0.9rem;"
                >
                  {{ diferenciaVentas > 0 ? '+' : '' }}{{ formatearMonto(diferenciaVentas) }}
                </span>
                <span style="font-size: 0.75rem; color: #64748b;">
                  {{ diferenciaVentas === 0 ? 'Cuadrado' : diferenciaVentas > 0 ? 'Sobrante' : 'Faltante' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- TOP PRODUCTOS VENDIDOS EN EL TURNO -->
        <div v-if="resumenTurno.topProductos && resumenTurno.topProductos.length > 0" class="lm-table-card mb-4" style="margin-bottom: 1.5rem;">
          <div class="lm-table-header">
            <h4 class="lm-table-title">Top Productos Vendidos en este Turno</h4>
            <span style="font-size: 0.775rem; color: #64748b;">Artículos con mayor rotación en la jornada</span>
          </div>
          <table class="lm-data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th style="width: 100px; text-align: center;">Cantidad</th>
                <th style="width: 140px; text-align: right;">Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(tp, idx) in resumenTurno.topProductos" :key="'tp-' + idx">
                <td style="font-weight: 500;">{{ tp.producto }}</td>
                <td style="text-align: center; font-family: monospace;">{{ tp.cantidad }}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 600;">
                  {{ formatearMonto(tp.subtotal) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ================================================================ -->
    <!-- CONTENIDO PESTAÑA 2: REPORTES HISTÓRICOS Y AUDITORÍA           -->
    <!-- ================================================================ -->
    <section v-else-if="pestanaActiva === 'reportes'">
      <!-- TARJETAS SUPERIORES DE KPIS CONSOLIDADOS -->
      <section class="lm-kpi-grid">
        <div class="lm-kpi-card">
          <div class="lm-kpi-info">
            <span class="lm-kpi-label">Reportes Encontrados</span>
            <span class="lm-kpi-value font-mono">{{ kpisReportes.totalReportes }}</span>
            <span class="lm-kpi-sub">Cierres y arqueos auditados</span>
          </div>
          <div class="lm-kpi-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
        </div>

        <div class="lm-kpi-card">
          <div class="lm-kpi-info">
            <span class="lm-kpi-label">Total Entradas Acumuladas</span>
            <span class="lm-kpi-value font-mono" style="color: #16a34a;">
              {{ formatearMonto(kpisReportes.totalEntradas) }}
            </span>
            <span class="lm-kpi-sub">Ingresos netos por cobranza</span>
          </div>
          <div class="lm-kpi-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: #16a34a;">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
        </div>

        <div class="lm-kpi-card">
          <div class="lm-kpi-info">
            <span class="lm-kpi-label">Total Salidas Acumuladas</span>
            <span class="lm-kpi-value font-mono" style="color: #dc2626;">
              {{ formatearMonto(kpisReportes.totalSalidas) }}
            </span>
            <span class="lm-kpi-sub">Egresos y retiros de caja</span>
          </div>
          <div class="lm-kpi-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: #dc2626;">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
        </div>

        <div class="lm-kpi-card">
          <div class="lm-kpi-info">
            <span class="lm-kpi-label">Utilidad Neta Consolidada</span>
            <span class="lm-kpi-value font-mono" style="color: #0f172a;">
              {{ formatearMonto(kpisReportes.utilidadTotal) }}
            </span>
            <span class="lm-kpi-sub">Balance neto del período</span>
          </div>
          <div class="lm-kpi-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>
      </section>

      <!-- BARRA DE FILTROS SUPERIOR -->
      <div class="lm-filter-card">
        <div class="lm-filter-grid">
          <!-- Fecha Desde -->
          <div class="lm-filter-group">
            <label class="lm-filter-label">Fecha Desde:</label>
            <input
              v-model="filtrosReportes.fechaDesde"
              type="date"
              class="lm-filter-input"
            />
          </div>

          <!-- Fecha Hasta -->
          <div class="lm-filter-group">
            <label class="lm-filter-label">Fecha Hasta:</label>
            <input
              v-model="filtrosReportes.fechaHasta"
              type="date"
              class="lm-filter-input"
            />
          </div>

          <!-- Usuario / Cajero -->
          <div class="lm-filter-group">
            <label class="lm-filter-label">Usuario / Cajero:</label>
            <select
              v-model="filtrosReportes.usuarioId"
              class="lm-filter-select"
              :disabled="esCajero"
            >
              <option :value="undefined">Todos los cajeros</option>
              <option v-for="u in listaUsuarios" :key="u.usuarioId || u.usuario_id" :value="u.usuarioId || u.usuario_id">
                {{ u.nombreCompleto || u.nombres + ' ' + u.apellidos }} ({{ u.usuario }})
              </option>
            </select>
          </div>

          <!-- Sucursal -->
          <div class="lm-filter-group">
            <label class="lm-filter-label">Sucursal:</label>
            <select
              v-model="filtrosReportes.sucursalId"
              class="lm-filter-select"
              :disabled="!esPropietario"
            >
              <option :value="undefined">Todas las sucursales</option>
              <option v-for="s in listaSucursales" :key="s.sucursalId" :value="s.sucursalId">
                {{ s.codigoInterno }} - {{ s.ciudad }}
              </option>
            </select>
          </div>

          <!-- Período -->
          <div class="lm-filter-group">
            <label class="lm-filter-label">Período:</label>
            <select v-model="filtrosReportes.periodo" class="lm-filter-select">
              <option :value="undefined">Todos los períodos</option>
              <option value="Turno">Turno</option>
              <option value="Diario">Diario</option>
              <option value="Semanal">Semanal</option>
              <option value="Mensual">Mensual</option>
            </select>
          </div>

          <!-- Botones de Acción -->
          <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
            <button
              type="button"
              class="lm-btn-dark"
              style="height: 38px;"
              :disabled="cargandoReportes"
              @click="aplicarFiltrosReportes"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Filtrar</span>
            </button>

            <button
              type="button"
              class="lm-btn-secondary"
              style="height: 38px;"
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
      <div class="lm-table-card">
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
              class="lm-btn-secondary"
              :disabled="listaReportes.length === 0"
              @click="exportarExcelReportes"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #16a34a;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              class="lm-btn-secondary"
              :disabled="listaReportes.length === 0"
              @click="exportarPdfReportes"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #dc2626;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>

        <div class="lm-table-responsive">
          <table class="lm-data-table">
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
                <th style="width: 100px;">N° Reporte</th>
                <th style="width: 140px;">Fecha y Cierre</th>
                <th style="width: 110px;">Sucursal</th>
                <th>Responsable / Cajero</th>
                <th style="width: 90px; text-align: center;">Período</th>
                <th style="width: 120px; text-align: right;">Entradas (Bs.)</th>
                <th style="width: 120px; text-align: right;">Salidas (Bs.)</th>
                <th style="width: 130px; text-align: right;">Utilidad / Balance</th>
                <th style="width: 100px; text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <!-- SPINNER O LISTADO VACÍO -->
              <tr v-if="cargandoReportes">
                <td colspan="10" style="text-align: center; padding: 3rem 0; color: #64748b;">
                  <div style="width: 24px; height: 24px; margin: 0 auto 0.5rem; border: 2px solid #e2e8f0; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                  Cargando reportes consolidados...
                </td>
              </tr>

              <tr v-else-if="listaReportes.length === 0">
                <td colspan="10" style="text-align: center; padding: 3rem 0; color: #94a3b8;">
                  No se encontraron reportes de caja para los filtros seleccionados.
                </td>
              </tr>

              <!-- FILAS DE REPORTES -->
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
                <td style="font-weight: 700; font-family: monospace; color: #0f172a;">
                  #REP-{{ r.reporteId }}
                </td>
                <td>
                  <div style="font-weight: 500;">{{ formatearFecha(r.fechaCreacion || r.fechaFin) }}</div>
                  <div style="font-size: 0.725rem; color: #64748b;">{{ formatearHora(r.fechaCreacion || r.fechaFin) }}</div>
                </td>
                <td>
                  <span class="lm-badge lm-badge-slate" :title="r.codigoSucursal || ''">
                    {{ r.nombreSucursal ? `${r.nombreSucursal} (${r.codigoSucursal})` : (r.codigoSucursal || '-') }}
                  </span>
                </td>
                <td>
                  <span style="font-weight: 600; color: #1e293b;">{{ r.nombreUsuario || '-' }}</span>
                </td>
                <td style="text-align: center;">
                  <span class="lm-badge lm-badge-slate">
                    {{ r.periodo || 'Turno' }}
                  </span>
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: 600; color: #16a34a;">
                  {{ formatearMonto(r.montoEntradas) }}
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: 600; color: #dc2626;">
                  {{ formatearMonto(r.montoSalidas) }}
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">
                  {{ formatearMonto(r.utilidad) }}
                </td>
                <td style="text-align: center;">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
                    <button
                      type="button"
                      class="lm-btn-icon-sm"
                      title="Ver Detalle Auditado"
                      @click="abrirModalDetalle(r.reporteId)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      class="lm-btn-icon-sm"
                      title="Descargar Acta en PDF"
                      @click="descargarComprobantePdf(r.reporteId)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #dc2626;">
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
    </section>

    <!-- ================================================================ -->
    <!-- MODAL 1: CONFIRMAR ARQUEO Y CIERRE DE TURNO                      -->
    <!-- ================================================================ -->
    <div v-if="modalConfirmarVisible" class="lm-modal-backdrop">
      <div class="lm-modal-card" style="max-width: 520px;">
        <div class="lm-modal-header">
          <h3 class="lm-modal-title">Confirmar Cierre y Arqueo de Turno</h3>
          <button type="button" class="lm-btn-icon-sm" @click="modalConfirmarVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="lm-modal-body">
          <p style="font-size: 0.85rem; color: #475569; margin-top: 0;">
            Se generará un reporte de corte atómico en la base de datos y se sellarán todos los movimientos de caja registrados durante esta sesión laboral.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.825rem; margin-bottom: 0.35rem;">
              <span style="color: #64748b;">Total Entradas Declaradas:</span>
              <strong style="color: #16a34a; font-family: monospace;">{{ formatearMonto(totalEntradasFinal) }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.825rem; margin-bottom: 0.35rem;">
              <span style="color: #64748b;">Total Salidas Declaradas:</span>
              <strong style="color: #dc2626; font-family: monospace;">{{ formatearMonto(totalSalidasFinal) }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 0.35rem;">
              <span>Balance Neto / Utilidad:</span>
              <span style="font-family: monospace;">{{ formatearMonto(utilidadArqueo) }}</span>
            </div>
          </div>

          <!-- Opción para Supervisor/Admin: permanecer en sistema -->
          <div v-if="!esCajero" style="margin-top: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.825rem; color: #334155; cursor: pointer;">
              <input v-model="permanecerEnSistema" type="checkbox" />
              <span>Permanecer en el sistema y revisar reporte en Pestaña 2 (no cerrar sesión general)</span>
            </label>
          </div>
          <div v-else style="font-size: 0.775rem; color: #b45309; background-color: #fffbeb; border: 1px solid #fde68a; padding: 0.5rem; border-radius: 4px;">
            Al confirmar el arqueo como cajero, se cerrará automáticamente su sesión y volverá a la pantalla de inicio.
          </div>
        </div>

        <div class="lm-modal-footer">
          <button
            type="button"
            class="lm-btn-secondary"
            :disabled="guardandoArqueo"
            @click="modalConfirmarVisible = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="lm-btn-dark"
            :disabled="guardandoArqueo"
            @click="ejecutarRegistroArqueo"
          >
            <span>{{ guardandoArqueo ? 'Registrando...' : 'Confirmar y Guardar' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- MODAL 2: OMITIR ARQUEO Y SALIR                                   -->
    <!-- ================================================================ -->
    <div v-if="modalOmitirVisible" class="lm-modal-backdrop">
      <div class="lm-modal-card" style="max-width: 480px;">
        <div class="lm-modal-header">
          <h3 class="lm-modal-title">¿Omitir Arqueo y Salir?</h3>
          <button type="button" class="lm-btn-icon-sm" @click="modalOmitirVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="lm-modal-body">
          <p style="font-size: 0.85rem; color: #475569; margin-top: 0;">
            Si omite el arqueo formal, su turno laboral se marcará como cerrado pero <strong>no se creará un reporte de corte auditado ni se consolidarán las partidas declaradas</strong>.
          </p>
          <p style="font-size: 0.8rem; color: #991b1b; background-color: #fef2f2; border: 1px solid #fecaca; padding: 0.65rem; border-radius: 4px;">
            Se cerrará su sesión de trabajo inmediatamente.
          </p>
        </div>

        <div class="lm-modal-footer">
          <button
            type="button"
            class="lm-btn-secondary"
            :disabled="omitiendoArqueo"
            @click="modalOmitirVisible = false"
          >
            Volver
          </button>
          <button
            type="button"
            class="lm-btn-dark"
            style="background-color: #dc2626; border-color: #dc2626;"
            :disabled="omitiendoArqueo"
            @click="ejecutarOmitirArqueo"
          >
            <span>{{ omitiendoArqueo ? 'Cerrando...' : 'Sí, Omitir y Salir' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- MODAL 3: DETALLE AUDITADO DEL REPORTE                            -->
    <!-- ================================================================ -->
    <div v-if="modalDetalleVisible" class="lm-modal-backdrop">
      <div class="lm-modal-card">
        <div class="lm-modal-header">
          <div>
            <h3 class="lm-modal-title">
              Detalle Auditado - Reporte #REP-{{ reporteDetalle?.reporteId || '...' }}
            </h3>
            <p style="font-size: 0.775rem; color: #64748b; margin: 0.15rem 0 0 0;">
              Sucursal: {{ reporteDetalle?.nombreSucursal ? `${reporteDetalle.nombreSucursal} (${reporteDetalle.codigoSucursal})` : (reporteDetalle?.codigoSucursal || '-') }} &bull; Cajero: {{ reporteDetalle?.nombreUsuario }}
            </p>
          </div>
          <button type="button" class="lm-btn-icon-sm" @click="cerrarModalDetalle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="lm-modal-body">
          <div v-if="cargandoDetalle" style="padding: 3rem 0; text-align: center; color: #64748b;">
            <div style="width: 24px; height: 24px; margin: 0 auto 0.5rem; border: 2px solid #e2e8f0; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            Cargando desglose completo del reporte...
          </div>

          <div v-else-if="reporteDetalle">
            <!-- BANNER DE HORARIOS -->
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Inicio:</span>
                <span style="font-size: 0.825rem; font-weight: 500; margin-left: 0.35rem;">{{ formatearFechaHora(reporteDetalle.fechaInicio) }}</span>
              </div>
              <div>
                <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Cierre:</span>
                <span style="font-size: 0.825rem; font-weight: 500; margin-left: 0.35rem;">{{ formatearFechaHora(reporteDetalle.fechaFin || reporteDetalle.fechaCreacion) }}</span>
              </div>
              <div>
                <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Duración:</span>
                <span class="lm-badge lm-badge-slate font-mono" style="margin-left: 0.35rem;">
                  {{ formatearDuracion(reporteDetalle.fechaInicio, reporteDetalle.fechaFin || reporteDetalle.fechaCreacion) }}
                </span>
              </div>
            </div>

            <!-- CUADRO DE RESUMEN MONETARIO -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem;">
                <span style="font-size: 0.725rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Entradas</span>
                <div style="font-size: 1.15rem; font-weight: 700; color: #16a34a; font-family: monospace; margin-top: 0.2rem;">
                  {{ formatearMonto(reporteDetalle.montoEntradas) }}
                </div>
              </div>

              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem;">
                <span style="font-size: 0.725rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Salidas</span>
                <div style="font-size: 1.15rem; font-weight: 700; color: #dc2626; font-family: monospace; margin-top: 0.2rem;">
                  {{ formatearMonto(reporteDetalle.montoSalidas) }}
                </div>
              </div>

              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem;">
                <span style="font-size: 0.725rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Balance / Utilidad</span>
                <div style="font-size: 1.15rem; font-weight: 700; color: #0f172a; font-family: monospace; margin-top: 0.2rem;">
                  {{ formatearMonto(reporteDetalle.utilidad) }}
                </div>
              </div>
            </div>

            <!-- SUB-PESTAÑAS DEL DETALLE -->
            <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1rem;">
              <button
                type="button"
                style="padding: 0.45rem 0.85rem; border: none; background: transparent; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent;"
                :style="pestanaDetalle === 'resumen' ? 'border-bottom-color: #0f172a; color: #0f172a;' : 'color: #64748b;'"
                @click="pestanaDetalle = 'resumen'"
              >
                Snapshot del Turno
              </button>
              <button
                type="button"
                style="padding: 0.45rem 0.85rem; border: none; background: transparent; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent;"
                :style="pestanaDetalle === 'entradas' ? 'border-bottom-color: #0f172a; color: #0f172a;' : 'color: #64748b;'"
                @click="pestanaDetalle = 'entradas'"
              >
                Entradas ({{ reporteDetalle.entradas?.length || 0 }})
              </button>
              <button
                type="button"
                style="padding: 0.45rem 0.85rem; border: none; background: transparent; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent;"
                :style="pestanaDetalle === 'salidas' ? 'border-bottom-color: #0f172a; color: #0f172a;' : 'color: #64748b;'"
                @click="pestanaDetalle = 'salidas'"
              >
                Salidas ({{ reporteDetalle.salidas?.length || 0 }})
              </button>
              <button
                type="button"
                style="padding: 0.45rem 0.85rem; border: none; background: transparent; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent;"
                :style="pestanaDetalle === 'movimientos' ? 'border-bottom-color: #0f172a; color: #0f172a;' : 'color: #64748b;'"
                @click="pestanaDetalle = 'movimientos'"
              >
                Movimientos Sellados ({{ reporteDetalle.movimientos?.length || 0 }})
              </button>
            </div>

            <!-- CONTENIDO DE SUB-PESTAÑAS -->
            <!-- 1. SNAPSHOT -->
            <div v-if="pestanaDetalle === 'resumen'">
              <!-- Desglose de Ventas del Turno -->
              <div v-if="reporteDetalle.datosSnapshot?.resumenVentas" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">
                    Ventas Congeladas en el Corte
                  </span>
                  <span style="font-size: 0.75rem; color: #64748b;">
                    {{ reporteDetalle.datosSnapshot.resumenVentas.conteo || 0 }} transacciones registradas
                  </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; font-size: 0.825rem;">
                  <div>
                    <span style="color: #64748b;">Efectivo:</span>
                    <strong style="display: block; font-family: monospace;">{{ formatearMonto(reporteDetalle.datosSnapshot.resumenVentas.efectivo) }}</strong>
                  </div>
                  <div>
                    <span style="color: #64748b;">QR Digital:</span>
                    <strong style="display: block; font-family: monospace;">{{ formatearMonto(reporteDetalle.datosSnapshot.resumenVentas.qr) }}</strong>
                  </div>
                  <div>
                    <span style="color: #64748b;">Tarjeta POS:</span>
                    <strong style="display: block; font-family: monospace;">{{ formatearMonto(reporteDetalle.datosSnapshot.resumenVentas.tarjeta) }}</strong>
                  </div>
                  <div>
                    <span style="color: #64748b;">Total Ventas:</span>
                    <strong style="display: block; font-family: monospace; color: #0f172a;">{{ formatearMonto(reporteDetalle.datosSnapshot.resumenVentas.total) }}</strong>
                  </div>
                </div>
              </div>

              <!-- Balance del Arqueo y Diferencia de Caja -->
              <div v-if="reporteDetalle.datosSnapshot?.totalesArqueo" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">
                    Auditoría de Cierre y Balance Físico
                  </span>
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span style="font-size: 0.75rem; color: #64748b;">Diferencia de Caja:</span>
                    <span
                      class="lm-badge font-mono"
                      :class="Number(reporteDetalle.datosSnapshot.totalesArqueo.diferencia || 0) === 0 ? 'lm-badge-emerald' : Number(reporteDetalle.datosSnapshot.totalesArqueo.diferencia) > 0 ? 'lm-badge-amber' : 'lm-badge-red'"
                    >
                      {{ Number(reporteDetalle.datosSnapshot.totalesArqueo.diferencia || 0) > 0 ? '+' : '' }}{{ formatearMonto(reporteDetalle.datosSnapshot.totalesArqueo.diferencia) }}
                    </span>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; font-size: 0.8rem; background-color: #f8fafc; padding: 0.65rem; border-radius: 4px;">
                  <div>
                    <span style="color: #64748b;">Entradas Declaradas:</span>
                    <strong style="display: block; font-family: monospace; color: #16a34a;">{{ formatearMonto(reporteDetalle.datosSnapshot.totalesArqueo.entradasDeclaradas) }}</strong>
                  </div>
                  <div>
                    <span style="color: #64748b;">Salidas Declaradas:</span>
                    <strong style="display: block; font-family: monospace; color: #dc2626;">{{ formatearMonto(reporteDetalle.datosSnapshot.totalesArqueo.salidasDeclaradas) }}</strong>
                  </div>
                  <div>
                    <span style="color: #64748b;">Movimientos Sellados:</span>
                    <strong style="display: block; font-family: monospace;">{{ reporteDetalle.movimientos?.length || 0 }} registros</strong>
                  </div>
                  <div>
                    <span style="color: #64748b;">Utilidad Turno:</span>
                    <strong style="display: block; font-family: monospace; color: #0f172a;">{{ formatearMonto(reporteDetalle.datosSnapshot.totalesArqueo.utilidad) }}</strong>
                  </div>
                </div>
              </div>

              <!-- Top productos -->
              <div v-if="reporteDetalle.datosSnapshot?.topProductos?.length > 0">
                <span style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">Top Productos Vendidos en el Turno</span>
                <table class="lm-data-table" style="margin-top: 0.5rem;">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style="width: 80px; text-align: center;">Cantidad</th>
                      <th style="width: 120px; text-align: right;">Total Recaudado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(p, idx) in reporteDetalle.datosSnapshot.topProductos" :key="'sp-' + idx">
                      <td>{{ p.producto || p.nombre_producto }}</td>
                      <td style="text-align: center; font-family: monospace;">{{ p.cantidad || p.cantidad_total }}</td>
                      <td style="text-align: right; font-family: monospace; font-weight: 600;">
                        {{ formatearMonto(p.subtotal || p.monto_total) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Fallback si no tiene snapshot estructurado -->
              <div v-else-if="!reporteDetalle.datosSnapshot?.resumenVentas && !reporteDetalle.datosSnapshot?.totalesArqueo" style="padding: 2rem; text-align: center; color: #64748b;">
                <p style="margin: 0; font-size: 0.85rem;">
                  Este reporte periódico consolidado ({{ reporteDetalle.periodo }}) fue generado sin un corte de arqueo físico individual.
                  Consulte las pestañas de <strong>Entradas</strong>, <strong>Salidas</strong> y <strong>Movimientos Sellados</strong> para ver el detalle de partidas.
                </p>
              </div>
            </div>

            <!-- 2. ENTRADAS -->
            <div v-else-if="pestanaDetalle === 'entradas'">
              <table class="lm-data-table">
                <thead>
                  <tr>
                    <th>Canal / Tipo</th>
                    <th>Descripción</th>
                    <th style="width: 120px; text-align: right;">Monto (Bs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!reporteDetalle.entradas || reporteDetalle.entradas.length === 0">
                    <td colspan="3" style="text-align: center; color: #94a3b8; padding: 1.5rem 0;">
                      Sin partidas de entrada registradas
                    </td>
                  </tr>
                  <tr v-for="e in reporteDetalle.entradas" :key="'de-' + e.entrada_id">
                    <td><span class="lm-badge lm-badge-slate">{{ e.descripcion_tipo }}</span></td>
                    <td>{{ e.descripcion || '-' }}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 600; color: #16a34a;">
                      {{ formatearMonto(e.monto) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 3. SALIDAS -->
            <div v-else-if="pestanaDetalle === 'salidas'">
              <table class="lm-data-table">
                <thead>
                  <tr>
                    <th>Motivo / Tipo</th>
                    <th>Descripción</th>
                    <th style="width: 120px; text-align: right;">Monto (Bs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!reporteDetalle.salidas || reporteDetalle.salidas.length === 0">
                    <td colspan="3" style="text-align: center; color: #94a3b8; padding: 1.5rem 0;">
                      Sin partidas de egreso registradas
                    </td>
                  </tr>
                  <tr v-for="s in reporteDetalle.salidas" :key="'ds-' + s.salida_id">
                    <td><span class="lm-badge lm-badge-slate">{{ s.descripcion_tipo }}</span></td>
                    <td>{{ s.descripcion || '-' }}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 600; color: #dc2626;">
                      {{ formatearMonto(s.monto) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 4. MOVIMIENTOS SELLADOS -->
            <div v-else-if="pestanaDetalle === 'movimientos'">
              <table class="lm-data-table">
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
                    <td colspan="4" style="text-align: center; color: #94a3b8; padding: 1.5rem 0;">
                      Sin movimientos extra-venta asociados a este corte
                    </td>
                  </tr>
                  <tr v-for="m in reporteDetalle.movimientos" :key="'dm-' + m.movimiento_id">
                    <td>
                      <span
                        class="lm-badge"
                        :class="m.tipo_movimiento === 1 ? 'lm-badge-emerald' : 'lm-badge-red'"
                      >
                        {{ m.descripcion_tipo }}
                      </span>
                    </td>
                    <td>{{ m.descripcion_metodo }}</td>
                    <td>{{ m.detalle || '-' }}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 600;">
                      {{ formatearMonto(m.monto) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="lm-modal-footer">
          <button
            v-if="reporteDetalle"
            type="button"
            class="lm-btn-secondary"
            @click="descargarComprobantePdf(reporteDetalle.reporteId)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #dc2626;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Descargar Acta en PDF</span>
          </button>

          <button type="button" class="lm-btn-dark" @click="cerrarModalDetalle">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
