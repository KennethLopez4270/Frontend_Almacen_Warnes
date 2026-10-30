<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  proveedorService,
  type ProveedorKpi,
  type ProveedorListado,
  type ProveedorCatalogoProducto,
  type ProveedorHistorialLote,
  type CrearProveedorRequest,
  type ActualizarProveedorRequest,
} from '@/services/proveedorService'

// ====================================================================
// 1. ESTADO REACTIVO PRINCIPAL
// ====================================================================

const cargando = ref(false)
const kpis = ref<ProveedorKpi>({
  totalProveedoresActivos: 0,
  proveedoresAlertasVencimiento: 0,
  totalProductosAbastecidos: 0,
  totalLotesActivos: 0,
  valorTotalInventario: 0,
})

const listaProveedores = ref<ProveedorListado[]>([])
const filtroBusqueda = ref('')
const filtroProducto = ref('')

// ====================================================================
// 2. GESTIÓN DE NOTIFICACIONES TOAST
// ====================================================================

interface ToastItem {
  id: number
  titulo: string
  mensaje: string
  tipo: 'success' | 'danger' | 'warning' | 'info'
}

const toasts = ref<ToastItem[]>([])
let toastSeq = 0

function agregarToast(titulo: string, mensaje: string, tipo: 'success' | 'danger' | 'warning' | 'info' = 'info') {
  const id = ++toastSeq
  toasts.value.push({ id, titulo, mensaje, tipo })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4500)
}

function removerToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function extraerError(err: any): string {
  if (err?.userMessage) return err.userMessage
  if (err?.response?.data?.mensaje) return err.response.data.mensaje
  if (err?.response?.data?.message) return err.response.data.message
  if (typeof err?.response?.data === 'string' && err.response.data.trim()) return err.response.data
  return err?.message || 'Error al comunicarse con el servidor'
}

// ====================================================================
// 3. CARGA DE DATOS DESDE EL BACKEND
// ====================================================================

async function cargarKpis() {
  try {
    kpis.value = await proveedorService.obtenerKpis()
  } catch (err: any) {
    console.error('Error cargando KPIs:', err)
  }
}

async function cargarProveedores() {
  cargando.value = true
  try {
    listaProveedores.value = await proveedorService.listarProveedores(
      filtroBusqueda.value,
      filtroProducto.value
    )
  } catch (err: any) {
    agregarToast('Error al cargar proveedores', extraerError(err), 'danger')
  } finally {
    cargando.value = false
  }
}

async function aplicarFiltros() {
  await cargarProveedores()
}

function limpiarFiltros() {
  filtroBusqueda.value = ''
  filtroProducto.value = ''
  cargarProveedores()
}

// ====================================================================
// 4. MODAL ABM (CREAR / EDITAR)
// ====================================================================

const modalAbmVisible = ref(false)
const modoEdicion = ref(false)
const guardando = ref(false)
const proveedorIdEdicion = ref<number | null>(null)

const formProveedor = ref({
  nombreEmpresa: '',
  nombreContacto: '',
  numeroContacto: '',
  anotaciones: '',
})

function abrirModalCrear() {
  modoEdicion.value = false
  proveedorIdEdicion.value = null
  formProveedor.value = {
    nombreEmpresa: '',
    nombreContacto: '',
    numeroContacto: '',
    anotaciones: '',
  }
  modalAbmVisible.value = true
}

function abrirModalEditar(p: ProveedorListado) {
  modoEdicion.value = true
  proveedorIdEdicion.value = p.proveedorId
  formProveedor.value = {
    nombreEmpresa: p.nombreEmpresa,
    nombreContacto: p.nombreContacto,
    numeroContacto: p.numeroContacto,
    anotaciones: p.anotaciones || '',
  }
  modalAbmVisible.value = true
}

function cerrarModalAbm() {
  modalAbmVisible.value = false
  guardando.value = false
}

async function guardarProveedor() {
  if (!formProveedor.value.nombreEmpresa.trim()) {
    agregarToast('Validación', 'El nombre de la empresa es obligatorio.', 'warning')
    return
  }
  if (!formProveedor.value.nombreContacto.trim()) {
    agregarToast('Validación', 'El nombre del contacto logístico es obligatorio.', 'warning')
    return
  }
  if (!formProveedor.value.numeroContacto.trim()) {
    agregarToast('Validación', 'El número de contacto es obligatorio.', 'warning')
    return
  }

  guardando.value = true
  try {
    if (modoEdicion.value && proveedorIdEdicion.value) {
      const payload: ActualizarProveedorRequest = {
        nombreEmpresa: formProveedor.value.nombreEmpresa.trim(),
        nombreContacto: formProveedor.value.nombreContacto.trim(),
        numeroContacto: formProveedor.value.numeroContacto.trim(),
        anotaciones: formProveedor.value.anotaciones.trim(),
      }
      const res = await proveedorService.actualizarProveedor(proveedorIdEdicion.value, payload)
      agregarToast('Éxito', res.mensaje || 'Distribuidor actualizado correctamente.', 'success')
    } else {
      const payload: CrearProveedorRequest = {
        nombreEmpresa: formProveedor.value.nombreEmpresa.trim(),
        nombreContacto: formProveedor.value.nombreContacto.trim(),
        numeroContacto: formProveedor.value.numeroContacto.trim(),
        anotaciones: formProveedor.value.anotaciones.trim(),
      }
      const res = await proveedorService.registrarProveedor(payload)
      agregarToast('Éxito', res.mensaje || 'Distribuidor registrado correctamente.', 'success')
    }

    cerrarModalAbm()
    await Promise.all([cargarKpis(), cargarProveedores()])
  } catch (err: any) {
    agregarToast('Error al procesar solicitud', extraerError(err), 'danger')
  } finally {
    guardando.value = false
  }
}

// ====================================================================
// 5. MODAL DE CONFIRMACIÓN DE BAJA LÓGICA
// ====================================================================

const modalBajaVisible = ref(false)
const proveedorParaBaja = ref<ProveedorListado | null>(null)
const eliminando = ref(false)

function confirmarBaja(p: ProveedorListado) {
  proveedorParaBaja.value = p
  modalBajaVisible.value = true
}

function cerrarModalBaja() {
  modalBajaVisible.value = false
  proveedorParaBaja.value = null
  eliminando.value = false
}

async function ejecutarBaja() {
  if (!proveedorParaBaja.value) return
  eliminando.value = true
  try {
    const res = await proveedorService.eliminarProveedor(proveedorParaBaja.value.proveedorId)
    agregarToast('Baja Exitosa', res.mensaje || 'Distribuidor dado de baja en el sistema.', 'success')
    cerrarModalBaja()
    await Promise.all([cargarKpis(), cargarProveedores()])
  } catch (err: any) {
    agregarToast('Error al dar de baja', extraerError(err), 'danger')
  } finally {
    eliminando.value = false
  }
}

// ====================================================================
// 6. MODAL / AUDITORÍA: FICHA LOGÍSTICA DEL PROVEEDOR
// ====================================================================

const modalFichaVisible = ref(false)
const proveedorSeleccionado = ref<ProveedorListado | null>(null)
const pestanaActivaFicha = ref<'catalogo' | 'lotes'>('catalogo')
const cargandoDetalles = ref(false)

const catalogoProductos = ref<ProveedorCatalogoProducto[]>([])
const historialLotes = ref<ProveedorHistorialLote[]>([])
const filtroLotesEstado = ref<string>('todos')

async function abrirFichaLogistica(p: ProveedorListado) {
  proveedorSeleccionado.value = p
  pestanaActivaFicha.value = 'catalogo'
  filtroLotesEstado.value = 'todos'
  modalFichaVisible.value = true
  await recargarDetallesFicha()
}

async function recargarDetallesFicha() {
  if (!proveedorSeleccionado.value) return
  cargandoDetalles.value = true
  try {
    const provId = proveedorSeleccionado.value.proveedorId
    const [prods, lots] = await Promise.all([
      proveedorService.listarCatalogoProductos(provId),
      proveedorService.listarHistorialLotes(provId, filtroLotesEstado.value),
    ])
    catalogoProductos.value = prods
    historialLotes.value = lots
  } catch (err: any) {
    agregarToast('Error al cargar ficha logística', extraerError(err), 'danger')
  } finally {
    cargandoDetalles.value = false
  }
}

async function cambiarFiltroLotes(nuevoFiltro: string) {
  filtroLotesEstado.value = nuevoFiltro
  if (!proveedorSeleccionado.value) return
  try {
    historialLotes.value = await proveedorService.listarHistorialLotes(
      proveedorSeleccionado.value.proveedorId,
      nuevoFiltro
    )
  } catch (err: any) {
    agregarToast('Error al filtrar lotes', extraerError(err), 'danger')
  }
}

function formatMontoBs(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || isNaN(monto)) return 'Bs 0.00'
  return `Bs ${Number(monto).toFixed(2)}`
}

function formatFecha(fechaStr: string | null | undefined): string {
  if (!fechaStr) return 'N/A'
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return fechaStr
  }
}

function getBadgeCaducidad(estado: string, dias: number | null) {
  switch (estado) {
    case 'VENCIDO':
      return {
        bg: '#FEE2E2',
        text: '#991B1B',
        border: '#F87171',
        label: dias !== null ? `Vencido hace ${Math.abs(dias)}d` : 'Vencido',
      }
    case 'CRITICO':
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FBBF24',
        label: dias !== null ? `Crítico: ${dias}d restantes` : 'Crítico',
      }
    case 'PROXIMO':
      return {
        bg: '#FEF9C3',
        text: '#854D0E',
        border: '#FACC15',
        label: dias !== null ? `Vence en ${dias}d` : 'Próximo',
      }
    case 'VIGENTE':
      return {
        bg: '#ECFDF5',
        text: '#065F46',
        border: '#34D399',
        label: dias !== null ? `Vigente (${dias}d)` : 'Vigente',
      }
    case 'NO_PERECEDERO':
    default:
      return {
        bg: '#F1F5F9',
        text: '#475569',
        border: '#CBD5E1',
        label: 'No perecedero',
      }
  }
}

onMounted(async () => {
  await Promise.all([cargarKpis(), cargarProveedores()])
})
</script>

<template>
  <div class="prov-wrapper">
    <!-- ENCABEZADO SUPERIOR -->
    <header class="prov-topbar">
      <div class="prov-topbar-left">
        <div class="prov-page-icon">
          <!-- SVG: Camión / Logística -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        <div>
          <h1 class="prov-page-title">Gestión de Distribuidores y Contactos Logísticos</h1>
          <p class="prov-page-subtitle">
            Administración de acuerdos contractuales, catálogo de abastecimiento y verificación de lotes
          </p>
        </div>
      </div>

      <div class="prov-topbar-right">
        <button type="button" class="prov-btn-primary" @click="abrirModalCrear">
          <!-- SVG: Plus / Nuevo -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nuevo Distribuidor</span>
        </button>
      </div>
    </header>

    <!-- TARJETAS SUPERIORES KPI -->
    <section class="prov-kpi-grid">
      <!-- Card 1: Distribuidores Activos -->
      <div class="prov-kpi-card">
        <div class="prov-kpi-info">
          <span class="prov-kpi-label">Distribuidores Activos</span>
          <span class="prov-kpi-value font-mono">{{ kpis.totalProveedoresActivos }}</span>
          <span class="prov-kpi-sub">Empresas comerciales vigentes</span>
        </div>
        <div class="prov-kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-md">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
      </div>

      <!-- Card 2: Productos Distintos Suministrados -->
      <div class="prov-kpi-card">
        <div class="prov-kpi-info">
          <span class="prov-kpi-label">Productos Vinculados</span>
          <span class="prov-kpi-value font-mono">{{ kpis.totalProductosAbastecidos }}</span>
          <span class="prov-kpi-sub">Ítems de catálogo abastecidos</span>
        </div>
        <div class="prov-kpi-icon-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-md">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>
      </div>

      <!-- Card 3: Lotes Activos de Proveedores -->
      <div class="prov-kpi-card">
        <div class="prov-kpi-info">
          <span class="prov-kpi-label">Lotes Activos en Almacén</span>
          <span class="prov-kpi-value font-mono">{{ kpis.totalLotesActivos }}</span>
          <span class="prov-kpi-sub">Valoración: {{ formatMontoBs(kpis.valorTotalInventario) }}</span>
        </div>
        <div class="prov-kpi-icon-box emerald">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-md">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
      </div>

      <!-- Card 4: Alertas de Vencimiento Próximo -->
      <div class="prov-kpi-card" :class="{ 'prov-kpi-highlight-amber': kpis.proveedoresAlertasVencimiento > 0 }">
        <div class="prov-kpi-info">
          <span class="prov-kpi-label">Proveedores con Alerta (≤ 7 días)</span>
          <span class="prov-kpi-value font-mono">{{ kpis.proveedoresAlertasVencimiento }}</span>
          <span class="prov-kpi-sub">Lotes en riesgo inminente de caducidad</span>
        </div>
        <div class="prov-kpi-icon-box amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-md">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      </div>
    </section>

    <!-- BARRA DE BÚSQUEDA DUAL Y FILTROS -->
    <div class="prov-toolbar-card">
      <div class="prov-filters-grid">
        <!-- Buscador 1: Empresa / Contacto / Contrato -->
        <div class="prov-search-group">
          <label class="prov-filter-label">Buscar por Empresa, Contacto o Contrato:</label>
          <div class="prov-input-with-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-input">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="filtroBusqueda"
              type="text"
              class="prov-input"
              placeholder="Ej: PIL Andina, Roberto Gómez, CONTR-2026..."
              @keyup.enter="aplicarFiltros"
            />
          </div>
        </div>

        <!-- Buscador 2: Filtro cruzado por Producto suministrado -->
        <div class="prov-search-group">
          <label class="prov-filter-label">Buscar por Producto Suministrado:</label>
          <div class="prov-input-with-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-input">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <input
              v-model="filtroProducto"
              type="text"
              class="prov-input"
              placeholder="Ej: Leche Entera, LEC001, Coca-Cola..."
              @keyup.enter="aplicarFiltros"
            />
          </div>
        </div>

        <!-- Botones de Acción de Filtro -->
        <div class="prov-filter-actions">
          <button type="button" class="prov-btn-primary" @click="aplicarFiltros">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-xs">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Filtrar</span>
          </button>
          <button
            v-if="filtroBusqueda || filtroProducto"
            type="button"
            class="prov-btn-secondary"
            @click="limpiarFiltros"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>

    <!-- TABLA PRINCIPAL DE DISTRIBUIDORES -->
    <div class="prov-table-card">
      <div class="prov-table-header-info">
        <span class="prov-table-title">Directorio de Distribuidores Registrados</span>
        <span class="prov-table-count font-mono">{{ listaProveedores.length }} distribuidores</span>
      </div>

      <div class="prov-table-responsive">
        <table class="prov-table">
          <thead>
            <tr>
              <th>Empresa / Distribuidor</th>
              <th>Contacto Logístico</th>
              <th>Contrato Vigente / Términos</th>
              <th class="text-center">Productos</th>
              <th class="text-center">Lotes / Stock</th>
              <th class="text-center">Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando">
              <td colspan="7" class="prov-table-empty">
                <div class="prov-loading-inline">
                  <span class="prov-spinner"></span>
                  <span>Cargando datos de distribuidores...</span>
                </div>
              </td>
            </tr>

            <tr v-else-if="listaProveedores.length === 0">
              <td colspan="7" class="prov-table-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="prov-empty-icon">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p>No se encontraron distribuidores con los criterios de búsqueda especificados.</p>
              </td>
            </tr>

            <tr v-for="prov in listaProveedores" :key="prov.proveedorId">
              <!-- Empresa -->
              <td>
                <div class="prov-name-cell">
                  <strong>{{ prov.nombreEmpresa }}</strong>
                  <span class="prov-text-muted-xs font-mono">ID: #{{ prov.proveedorId }} • Reg: {{ formatFecha(prov.fechaCreacion) }}</span>
                </div>
              </td>

              <!-- Contacto -->
              <td>
                <div class="prov-contact-cell">
                  <span class="prov-contact-name">{{ prov.nombreContacto }}</span>
                  <span class="prov-contact-phone font-mono">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-nano">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {{ prov.numeroContacto }}
                  </span>
                </div>
              </td>

              <!-- Contrato / Anotaciones -->
              <td>
                <div class="prov-contract-cell" :title="prov.anotaciones">
                  <span class="prov-contract-text">{{ prov.anotaciones || 'Sin anotaciones' }}</span>
                </div>
              </td>

              <!-- Productos Abastecidos -->
              <td class="text-center font-mono">
                <span class="prov-badge-metric blue">
                  {{ prov.totalProductos }} prod.
                </span>
              </td>

              <!-- Lotes y Stock -->
              <td class="text-center font-mono">
                <div class="prov-lots-cell">
                  <span>{{ prov.totalLotes }} lotes ({{ prov.stockTotalAcumulado }} u.)</span>
                  <span v-if="prov.lotesEnRiesgo > 0" class="prov-pill-risk">
                    {{ prov.lotesEnRiesgo }} por vencer
                  </span>
                </div>
              </td>

              <!-- Estado -->
              <td class="text-center">
                <span v-if="!prov.marcaBaja" class="prov-badge-active">
                  <span class="prov-dot-active"></span>
                  Activo
                </span>
                <span v-else class="prov-badge-inactive">
                  Inactivo
                </span>
              </td>

              <!-- Acciones -->
              <td class="text-right">
                <div class="prov-actions-cell">
                  <!-- Botón: Ficha Logística / Auditoría -->
                  <button
                    type="button"
                    class="prov-btn-action view"
                    title="Auditar Ficha Logística y Lotes"
                    @click="abrirFichaLogistica(prov)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>

                  <!-- Botón: Editar -->
                  <button
                    type="button"
                    class="prov-btn-action edit"
                    title="Editar datos del distribuidor"
                    @click="abrirModalEditar(prov)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>

                  <!-- Botón: Dar de Baja -->
                  <button
                    type="button"
                    class="prov-btn-action delete"
                    title="Dar de baja distribuidor"
                    @click="confirmarBaja(prov)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL ABM: REGISTRAR / EDITAR DISTRIBUIDOR -->
    <div v-if="modalAbmVisible" class="prov-modal-backdrop" @click.self="cerrarModalAbm">
      <div class="prov-modal-container">
        <div class="prov-modal-header">
          <div class="prov-modal-title-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-md">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <div>
              <h2 class="prov-modal-title">{{ modoEdicion ? 'Editar Distribuidor' : 'Registrar Nuevo Distribuidor' }}</h2>
              <p class="prov-modal-subtitle">Estructura adaptada al esquema original de la base de datos</p>
            </div>
          </div>
          <button type="button" class="prov-modal-close" @click="cerrarModalAbm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form class="prov-modal-body" @submit.prevent="guardarProveedor">
          <!-- Campo 1: Nombre de Empresa -->
          <div class="prov-form-group">
            <div class="prov-label-row">
              <label class="prov-form-label">Razón Social / Nombre de la Empresa <span class="required">*</span></label>
              <span class="prov-char-counter">{{ formProveedor.nombreEmpresa.length }}/50</span>
            </div>
            <input
              v-model="formProveedor.nombreEmpresa"
              type="text"
              maxlength="50"
              class="prov-input"
              placeholder="Ej: PIL Andina S.A., EMBOL S.A., Industrias Venado..."
              required
            />
          </div>

          <!-- Fila de 2 columnas: Contacto y Teléfono -->
          <div class="prov-form-grid-2">
            <!-- Campo 2: Contacto Logístico -->
            <div class="prov-form-group">
              <div class="prov-label-row">
                <label class="prov-form-label">Contacto Logístico / Preventista <span class="required">*</span></label>
                <span class="prov-char-counter">{{ formProveedor.nombreContacto.length }}/50</span>
              </div>
              <input
                v-model="formProveedor.nombreContacto"
                type="text"
                maxlength="50"
                class="prov-input"
                placeholder="Ej: Roberto Gómez, Lic. Lucia Vargas..."
                required
              />
            </div>

            <!-- Campo 3: Teléfono de Contacto -->
            <div class="prov-form-group">
              <div class="prov-label-row">
                <label class="prov-form-label">Número de Contacto <span class="required">*</span></label>
                <span class="prov-char-counter">{{ formProveedor.numeroContacto.length }}/15</span>
              </div>
              <input
                v-model="formProveedor.numeroContacto"
                type="text"
                maxlength="15"
                class="prov-input"
                placeholder="Ej: 70112233, 72001122..."
                required
              />
            </div>
          </div>

          <!-- Campo 4: Contrato Vigente / Términos de Entrega -->
          <div class="prov-form-group">
            <div class="prov-label-row">
              <label class="prov-form-label">Contrato Vigente / Acuerdos Logísticos</label>
              <span class="prov-char-counter">{{ formProveedor.anotaciones.length }}/200</span>
            </div>
            <textarea
              v-model="formProveedor.anotaciones"
              rows="3"
              maxlength="200"
              class="prov-textarea"
              placeholder="Ej: Contrato CONTR-PIL-2026: Entregas martes y viernes 08:00 AM. Crédito quincenal."
            ></textarea>
            <span class="prov-text-muted-xs">
              Mapeado a la columna física <code>proveedores.anotaciones (VARCHAR 200)</code>.
            </span>
          </div>

          <div class="prov-modal-footer">
            <button type="button" class="prov-btn-secondary" @click="cerrarModalAbm">
              Cancelar
            </button>
            <button type="submit" class="prov-btn-primary" :disabled="guardando">
              <span v-if="guardando" class="prov-spinner-sm"></span>
              <span>{{ modoEdicion ? 'Actualizar Distribuidor' : 'Registrar Distribuidor' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN DE BAJA -->
    <div v-if="modalBajaVisible" class="prov-modal-backdrop" @click.self="cerrarModalBaja">
      <div class="prov-modal-container sm">
        <div class="prov-modal-header">
          <div class="prov-modal-title-box danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-md">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <h2 class="prov-modal-title">Confirmar Baja de Distribuidor</h2>
              <p class="prov-modal-subtitle">Se aplicará baja lógica (marca_baja = true)</p>
            </div>
          </div>
          <button type="button" class="prov-modal-close" @click="cerrarModalBaja">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="prov-modal-body">
          <p class="prov-confirm-text">
            ¿Está seguro que desea dar de baja al distribuidor
            <strong>"{{ proveedorParaBaja?.nombreEmpresa }}"</strong>?
          </p>
          <div class="prov-alert-box-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              El distribuidor ya no aparecerá en el catálogo para nuevos ingresos, pero sus lotes históricos
              e inventario activo se conservarán intactos para trazabilidad contable.
            </span>
          </div>

          <div class="prov-modal-footer">
            <button type="button" class="prov-btn-secondary" @click="cerrarModalBaja">
              Cancelar
            </button>
            <button type="button" class="prov-btn-danger" :disabled="eliminando" @click="ejecutarBaja">
              <span v-if="eliminando" class="prov-spinner-sm"></span>
              <span>Confirmar Baja Lógica</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- DRAWER / MODAL DE AUDITORÍA: FICHA LOGÍSTICA COMPLETA -->
    <div v-if="modalFichaVisible" class="prov-modal-backdrop" @click.self="modalFichaVisible = false">
      <div class="prov-modal-container xl">
        <!-- Cabecera de la Ficha -->
        <div class="prov-modal-header">
          <div class="prov-modal-title-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-md">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <div>
              <h2 class="prov-modal-title">Ficha Logística: {{ proveedorSeleccionado?.nombreEmpresa }}</h2>
              <p class="prov-modal-subtitle">
                Contacto: {{ proveedorSeleccionado?.nombreContacto }} (Tel: {{ proveedorSeleccionado?.numeroContacto }})
              </p>
            </div>
          </div>
          <button type="button" class="prov-modal-close" @click="modalFichaVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="prov-modal-body">
          <!-- Tarjeta de Contrato Vigente del Distribuidor -->
          <div class="prov-contract-banner">
            <div class="prov-contract-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <span class="prov-contract-label">Acuerdos y Condiciones Contractuales Vigentes:</span>
              <p class="prov-contract-desc">{{ proveedorSeleccionado?.anotaciones || 'Sin anotaciones contractuales registradas.' }}</p>
            </div>
          </div>

          <!-- Selector de Pestañas de la Ficha -->
          <nav class="prov-tabs-nav">
            <button
              type="button"
              class="prov-tab-btn"
              :class="{ active: pestanaActivaFicha === 'catalogo' }"
              @click="pestanaActivaFicha = 'catalogo'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-xs">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>1. Catálogo de Productos Abastecidos</span>
              <span class="prov-tab-pill font-mono">{{ catalogoProductos.length }}</span>
            </button>

            <button
              type="button"
              class="prov-tab-btn"
              :class="{ active: pestanaActivaFicha === 'lotes' }"
              @click="pestanaActivaFicha = 'lotes'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-xs">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <span>2. Verificación de Lotes y Caducidad</span>
              <span class="prov-tab-pill font-mono">{{ historialLotes.length }}</span>
            </button>
          </nav>

          <!-- PESTAÑA 1: CATÁLOGO DE PRODUCTOS -->
          <div v-if="pestanaActivaFicha === 'catalogo'" class="prov-tab-content">
            <div class="prov-table-responsive max-h-500">
              <table class="prov-table">
                <thead>
                  <tr>
                    <th>Cód. Interno / Barras</th>
                    <th>Nombre de Producto</th>
                    <th>Categoría</th>
                    <th class="text-right">Costo Compra</th>
                    <th class="text-right">Precio Venta</th>
                    <th class="text-center">Stock Actual</th>
                    <th class="text-center">Lotes Recibidos</th>
                    <th class="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="cargandoDetalles">
                    <td colspan="8" class="prov-table-empty">
                      <div class="prov-loading-inline">
                        <span class="prov-spinner"></span>
                        <span>Cargando catálogo del distribuidor...</span>
                      </div>
                    </td>
                  </tr>

                  <tr v-else-if="catalogoProductos.length === 0">
                    <td colspan="8" class="prov-table-empty">
                      <p>Este distribuidor aún no tiene productos vinculados en el catálogo de inventario.</p>
                    </td>
                  </tr>

                  <tr v-for="prod in catalogoProductos" :key="prod.productoId">
                    <td class="font-mono">
                      <div class="prov-name-cell">
                        <strong>{{ prod.codigoInterno }}</strong>
                        <span class="prov-text-muted-xs">{{ prod.codigoBarras || 'S/B' }}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{{ prod.nombreProducto }}</strong>
                    </td>
                    <td>
                      <span class="prov-badge-cat">{{ prod.categoriaNombre }}</span>
                    </td>
                    <td class="text-right font-mono">{{ formatMontoBs(prod.precioCompra) }}</td>
                    <td class="text-right font-mono font-semibold">{{ formatMontoBs(prod.precioVenta) }}</td>
                    <td class="text-center font-mono">
                      <span class="prov-stock-pill">{{ prod.stockActual }} u.</span>
                    </td>
                    <td class="text-center font-mono">{{ prod.totalLotesRecibidos }}</td>
                    <td class="text-center">
                      <ConceptoBadge tipo="estado_producto" :valor="prod.estadoProducto" size="sm" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- PESTAÑA 2: VERIFICACIÓN DE LOTES Y CADUCIDAD -->
          <div v-if="pestanaActivaFicha === 'lotes'" class="prov-tab-content">
            <!-- Barra de Filtros Interna de Caducidad -->
            <div class="prov-lots-filter-bar">
              <span class="prov-filter-label">Filtrar lotes entregados:</span>
              <div class="prov-pills-group">
                <button
                  type="button"
                  class="prov-subfilter-btn"
                  :class="{ active: filtroLotesEstado === 'todos' }"
                  @click="cambiarFiltroLotes('todos')"
                >
                  Todos los Lotes
                </button>
                <button
                  type="button"
                  class="prov-subfilter-btn"
                  :class="{ active: filtroLotesEstado === 'activos' }"
                  @click="cambiarFiltroLotes('activos')"
                >
                  Stock Activo (> 0)
                </button>
                <button
                  type="button"
                  class="prov-subfilter-btn amber"
                  :class="{ active: filtroLotesEstado === 'proximos_vencer' }"
                  @click="cambiarFiltroLotes('proximos_vencer')"
                >
                  Próximos a Vencer (≤ 14d)
                </button>
                <button
                  type="button"
                  class="prov-subfilter-btn rose"
                  :class="{ active: filtroLotesEstado === 'vencidos' }"
                  @click="cambiarFiltroLotes('vencidos')"
                >
                  Vencidos
                </button>
              </div>
            </div>

            <div class="prov-table-responsive max-h-500">
              <table class="prov-table">
                <thead>
                  <tr>
                    <th>Lote ID / Descripción</th>
                    <th>Producto</th>
                    <th class="text-center">Stock / Recibido</th>
                    <th class="text-right">Costo Unit.</th>
                    <th class="text-right">Precio Lote</th>
                    <th>Fecha Caducidad</th>
                    <th class="text-center">Estado Caducidad</th>
                    <th>Fecha Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="cargandoDetalles">
                    <td colspan="8" class="prov-table-empty">
                      <div class="prov-loading-inline">
                        <span class="prov-spinner"></span>
                        <span>Cargando lotes del distribuidor...</span>
                      </div>
                    </td>
                  </tr>

                  <tr v-else-if="historialLotes.length === 0">
                    <td colspan="8" class="prov-table-empty">
                      <p>No se encontraron lotes registrados para este distribuidor con el filtro seleccionado.</p>
                    </td>
                  </tr>

                  <tr v-for="lote in historialLotes" :key="lote.loteId">
                    <td>
                      <div class="prov-name-cell">
                        <span class="font-mono font-semibold">Lote #{{ lote.loteId }}</span>
                        <span class="prov-text-muted-xs">{{ lote.descripcion }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="prov-name-cell">
                        <strong>{{ lote.nombreProducto }}</strong>
                        <span class="prov-text-muted-xs font-mono">{{ lote.codigoInterno }}</span>
                      </div>
                    </td>
                    <td class="text-center font-mono">
                      <strong>{{ lote.stockActual }}</strong> / {{ lote.cantidadInicial }} u.
                    </td>
                    <td class="text-right font-mono">{{ formatMontoBs(lote.costoUnitario) }}</td>
                    <td class="text-right font-mono font-semibold">{{ formatMontoBs(lote.precioLote) }}</td>
                    <td class="font-mono">
                      {{ formatFecha(lote.fechaVencimiento) }}
                    </td>
                    <td class="text-center">
                      <span
                        class="prov-caducidad-badge font-mono"
                        :style="{
                          backgroundColor: getBadgeCaducidad(lote.estadoCaducidad, lote.diasParaVencer).bg,
                          color: getBadgeCaducidad(lote.estadoCaducidad, lote.diasParaVencer).text,
                          borderColor: getBadgeCaducidad(lote.estadoCaducidad, lote.diasParaVencer).border,
                        }"
                      >
                        {{ getBadgeCaducidad(lote.estadoCaducidad, lote.diasParaVencer).label }}
                      </span>
                    </td>
                    <td class="font-mono prov-text-muted-xs">
                      {{ formatFecha(lote.fechaIngreso) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="prov-modal-footer">
          <button type="button" class="prov-btn-secondary" @click="modalFichaVisible = false">
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>

    <!-- CONTENEDOR TOAST FLOTANTE -->
    <div class="prov-toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="prov-toast"
        :class="toast.tipo"
      >
        <div class="prov-toast-icon">
          <!-- Icono SVG por tipo -->
          <svg v-if="toast.tipo === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg v-else-if="toast.tipo === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div class="prov-toast-content">
          <strong>{{ toast.titulo }}</strong>
          <p>{{ toast.mensaje }}</p>
        </div>
        <button type="button" class="prov-toast-close" @click="removerToast(toast.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ====================================================================
   ESTILOS CORPORATIVOS UNIFICADOS (LUCIDE SVG + SIN EMOJIS)
   ==================================================================== */

.prov-wrapper {
  padding: 1.5rem;
  background-color: #f8fafc;
  min-height: 100vh;
  font-family: inherit;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ENCABEZADO SUPERIOR */
.prov-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  padding: 1.25rem 1.75rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.prov-topbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.prov-page-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.prov-page-icon svg {
  width: 24px;
  height: 24px;
}

.prov-page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.prov-page-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0.15rem 0 0 0;
}

/* BOTONES */
.prov-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.prov-btn-primary:hover:not(:disabled) {
  background-color: #0369a1;
}

.prov-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.prov-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background-color: #ffffff;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.prov-btn-secondary:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.prov-btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #dc2626;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.prov-btn-danger:hover:not(:disabled) {
  background-color: #b91c1c;
}

.prov-btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* KPIS GRID */
.prov-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}

.prov-kpi-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.15rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.prov-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07);
}

.prov-kpi-card.prov-kpi-highlight-amber {
  border-color: #f59e0b;
  background-color: #fffbeb;
}

.prov-kpi-info {
  display: flex;
  flex-direction: column;
}

.prov-kpi-label {
  font-size: 0.775rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.prov-kpi-value {
  font-size: 1.65rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  margin: 0.25rem 0;
}

.prov-kpi-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

.prov-kpi-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: #f0fdf4;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.prov-kpi-icon-box.blue {
  background-color: #f0f9ff;
  color: #0284c7;
}

.prov-kpi-icon-box.emerald {
  background-color: #ecfdf5;
  color: #059669;
}

.prov-kpi-icon-box.amber {
  background-color: #fef3c7;
  color: #d97706;
}

/* TOOLBAR & FILTROS */
.prov-toolbar-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.15rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.prov-filters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1rem;
  align-items: flex-end;
}

.prov-search-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.prov-filter-label {
  font-size: 0.785rem;
  font-weight: 600;
  color: #475569;
}

.prov-input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.prov-icon-input {
  position: absolute;
  left: 0.75rem;
  width: 16px;
  height: 16px;
  color: #94a3b8;
  pointer-events: none;
}

.prov-input {
  width: 100%;
  padding: 0.55rem 0.75rem 0.55rem 2.25rem;
  font-size: 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease;
  background-color: #f8fafc;
}

.prov-input:focus {
  border-color: #0284c7;
  background-color: #ffffff;
}

.prov-textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  font-family: inherit;
  resize: vertical;
  background-color: #f8fafc;
}

.prov-textarea:focus {
  border-color: #0284c7;
  background-color: #ffffff;
}

.prov-filter-actions {
  display: flex;
  gap: 0.5rem;
}

/* TABLA DE PROVEEDORES */
.prov-table-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.prov-table-header-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.prov-table-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.prov-table-count {
  font-size: 0.8rem;
  color: #64748b;
  background-color: #f1f5f9;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
}

.prov-table-responsive {
  width: 100%;
  overflow-x: auto;
}

.prov-table-responsive.max-h-500 {
  max-height: 450px;
  overflow-y: auto;
}

.prov-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.85rem;
}

.prov-table th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.prov-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.prov-table tr:hover td {
  background-color: #f8fafc;
}

.prov-name-cell {
  display: flex;
  flex-direction: column;
}

.prov-contact-cell {
  display: flex;
  flex-direction: column;
}

.prov-contact-name {
  font-weight: 600;
  color: #1e293b;
}

.prov-contact-phone {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.775rem;
  color: #64748b;
}

.prov-contract-cell {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prov-contract-text {
  font-size: 0.8rem;
  color: #475569;
}

.prov-badge-metric {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.prov-badge-metric.blue {
  background-color: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.prov-lots-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.prov-pill-risk {
  font-size: 0.7rem;
  background-color: #fef3c7;
  color: #92400e;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}

.prov-badge-active {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background-color: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.prov-dot-active {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
}

.prov-badge-inactive {
  background-color: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
}

.prov-actions-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.prov-btn-action {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.prov-btn-action.view:hover {
  background-color: #f0f9ff;
  color: #0284c7;
  border-color: #bae6fd;
}

.prov-btn-action.edit:hover {
  background-color: #fefce8;
  color: #ca8a04;
  border-color: #fef08a;
}

.prov-btn-action.delete:hover {
  background-color: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.prov-table-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;
}

.prov-empty-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 0.75rem auto;
  color: #cbd5e1;
}

/* MODALES */
.prov-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.prov-modal-container {
  background-color: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.prov-modal-container.sm {
  max-width: 440px;
}

.prov-modal-container.xl {
  max-width: 900px;
}

.prov-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.prov-modal-title-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #0284c7;
}

.prov-modal-title-box.danger {
  color: #dc2626;
}

.prov-modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.prov-modal-subtitle {
  font-size: 0.775rem;
  color: #64748b;
  margin: 0.15rem 0 0 0;
}

.prov-modal-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: color 0.15s ease;
}

.prov-modal-close:hover {
  color: #0f172a;
}

.prov-modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.prov-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.prov-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.prov-form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.prov-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prov-form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
}

.prov-form-label .required {
  color: #dc2626;
}

.prov-char-counter {
  font-size: 0.7rem;
  color: #94a3b8;
  font-family: monospace;
}

/* BANNER DE CONTRATO EN FICHA */
.prov-contract-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 0.85rem 1rem;
}

.prov-contract-banner-icon {
  color: #16a34a;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.prov-contract-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #166534;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.prov-contract-desc {
  font-size: 0.85rem;
  color: #1e293b;
  margin: 0.2rem 0 0 0;
  line-height: 1.4;
}

/* PESTAÑAS DENTRO DE FICHA */
.prov-tabs-nav {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: -2px;
}

.prov-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.1rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s ease;
}

.prov-tab-btn.active {
  color: #0284c7;
  border-bottom-color: #0284c7;
}

.prov-tab-pill {
  font-size: 0.725rem;
  background-color: #f1f5f9;
  color: #475569;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.prov-tab-btn.active .prov-tab-pill {
  background-color: #e0f2fe;
  color: #0369a1;
}

/* FILTROS INTERNOS DE LOTES */
.prov-lots-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.prov-pills-group {
  display: flex;
  gap: 0.4rem;
}

.prov-subfilter-btn {
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #475569;
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.prov-subfilter-btn:hover {
  background-color: #f8fafc;
}

.prov-subfilter-btn.active {
  background-color: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.prov-subfilter-btn.amber.active {
  background-color: #d97706;
  border-color: #d97706;
  color: #ffffff;
}

.prov-subfilter-btn.rose.active {
  background-color: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

.prov-badge-cat {
  font-size: 0.75rem;
  background-color: #f1f5f9;
  color: #334155;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.prov-stock-pill {
  font-size: 0.775rem;
  background-color: #f0fdf4;
  color: #166534;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-weight: 600;
}

.prov-caducidad-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.725rem;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
}

.prov-alert-box-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 0.85rem;
  border-radius: 8px;
  font-size: 0.8rem;
  line-height: 1.4;
}

.prov-confirm-text {
  font-size: 0.95rem;
  color: #1e293b;
  margin: 0;
  line-height: 1.5;
}

/* TOASTS */
.prov-toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  z-index: 2000;
  pointer-events: none;
}

.prov-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 300px;
  max-width: 420px;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #cbd5e1;
  animation: slideIn 0.2s ease-out;
}

.prov-toast.success {
  border-left-color: #10b981;
}

.prov-toast.success .prov-toast-icon {
  color: #10b981;
}

.prov-toast.danger {
  border-left-color: #ef4444;
}

.prov-toast.danger .prov-toast-icon {
  color: #ef4444;
}

.prov-toast.warning {
  border-left-color: #f59e0b;
}

.prov-toast.warning .prov-toast-icon {
  color: #f59e0b;
}

.prov-toast-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.prov-toast-icon svg {
  width: 100%;
  height: 100%;
}

.prov-toast-content {
  flex: 1;
}

.prov-toast-content strong {
  display: block;
  font-size: 0.85rem;
  color: #0f172a;
}

.prov-toast-content p {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0.2rem 0 0 0;
  line-height: 1.3;
}

.prov-toast-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.15rem;
}

.prov-toast-close svg {
  width: 16px;
  height: 16px;
}

/* UTILIDADES TIPOGRÁFICAS E ÍCONOS */
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.font-semibold {
  font-weight: 600;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.prov-text-muted-xs {
  font-size: 0.725rem;
  color: #64748b;
}

.prov-icon-nano {
  width: 12px;
  height: 12px;
}

.prov-icon-xs {
  width: 14px;
  height: 14px;
}

.prov-icon-sm {
  width: 16px;
  height: 16px;
}

.prov-icon-md {
  width: 20px;
  height: 20px;
}

.prov-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e1;
  border-top-color: #0284c7;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

.prov-spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

.prov-loading-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.85rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* RESPONSIVE */
@media (max-width: 860px) {
  .prov-filters-grid {
    grid-template-columns: 1fr;
  }
  .prov-form-grid-2 {
    grid-template-columns: 1fr;
  }
  .prov-topbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .prov-topbar-right {
    width: 100%;
  }
  .prov-topbar-right .prov-btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
