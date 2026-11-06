<script setup lang="ts">
import { onMounted, watch } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import CustomSelect from '@/components/common/CustomSelect.vue'
import {
  listaUsuarios, usuarioActivoId, usuarioActivo, rolActivo, cargarUsuarios, resolverNombreUsuario,
  CATEGORIAS, ESTADOS_PENDIENTE, ESTADOS_PRODUCTO, ESTADOS_SALA_ESPERA, MAPA_ESTADOS_PRODUCTO, MAPA_ESTADOS_SALA_ESPERA, MAPA_ROLES, ROLES, ROLES_USUARIO, STORAGE_KEY_AUDITORIA, abrirEdicionDesdeDetalles, abrirModalCrearCategoria, abrirModalCrearProveedor, abrirModalDescontar, abrirModalDescuento, abrirModalDetalles, abrirModalEditarPendiente, abrirModalGestionCategorias, abrirModalObservar, abrirModalRecepcion, abrirModalRechazo, abrirVisorCamara, activeTab, agregarToast, alternarEstadoCategoria, aplicarCostoSugerido, aprobarIngreso, autogenerarCodigoInterno, barcodeInputRef, cambiarEstadoProducto, cancelarEdicionCategoria, cargando, cargandoGestionCategorias, catalogoBackend, categoriaEnEdicion, cerrarModalCrearCategoria, cerrarModalCrearProveedor, cerrarModalDescontar, cerrarModalGestionCategorias, confirmarObservacion, confirmarRechazo, conteoEspera, costoSugeridoMatematico, darBajaItemInventario, diasUmbralVencimiento, diasUmbralVencimientoPreset, ejecutarDescuentoUnidades, enviandoObservacion, extraerMensajeError, filasStock, filterEnOferta, filterEstadoPendiente, filterProximosVencer, formDescontar, formDescuento, formEditarPendiente, formProveedorRapido, formRecepcion, formatMontoBs, formatearFechaCorta, formatearFechaHora, getBadgeEstadoPendiente, getBadgeEstadoProducto, getBadgeRol, getBadgeUsuario, getDateOffset, getDiasParaVencer, guardandoCategoria, guardandoDescuentoUnidades, guardandoEdicionCategoria, guardandoProveedorRapido, guardandoRectificacion, guardarDescuento, guardarEdicionCategoria, guardarHistorialAuditoria, guardarNuevaCategoria, guardarProveedorRapido, guardarRecepcion, guardarRectificacionPendiente, guardarYaprobarPendiente, handleBarcodeEnter, onCodigoBarrasInput, iniciarEdicionCategoria, inventarioPendientes, itemDescontarActivo, itemDescuentoActivo, kpisBackend, listaCategorias, listaTodasCategorias, lotesStock, modalCamaraVisible, modalCategoriaVisible, modalDescontarVisible, modalDescuentoVisible, modalDetallesVisible, modalEditarPendienteVisible, modalGestionCategoriasVisible, modalObservarVisible, modalProveedorRapidoVisible, modalRecepcionVisible, modalRechazoVisible, motivoObservacion, motivoRechazo, nombreNuevaCategoria, normalizarPendiente, obtenerHistorialAuditoria, onEditarCalculoPrecioLote, onNombreProductoInput, onPresetVencimientoChange, pendienteAObservar, pendienteARechazar, pendienteEnDetalle, pendienteEnEdicion, pendientesFiltrados, productos, productosCatalogo, proveedores, puedeCrearCategoria, puedeCrearProveedor, puedeVerMargen, recargarCategoriasActivas, recargarGestionCategorias, recargarTodo, inicializarInventario, opcionesCategorias, opcionesProveedores, opcionesProductosCatalogo,
  modoProductoNuevoRecepcion, productoSeleccionadoRecepcionId, onSeleccionarProductoCatalogoRecepcion, alternarModoProductoRecepcion,
  modoProductoNuevoEdicion, productoSeleccionadoEdicionId, onSeleccionarProductoCatalogoEdicion, redirigirAProveedores, removerToast, resetFiltros, resolverInfoUsuario, router, searchQuery, selectedCategoria, selectedEstadoProducto, selectedProveedor, showNotificationsDrawer, simularEscaneo, toastCounter, toasts, totalAlertasVencimiento, totalEnSalaEspera, totalProductosCatalogo, totalStockActivo,
  selectedEstadoRegistro, onEstadoRegistroChange, reactivarItemInventario, darBajaProductoCatalogo, reactivarProductoCatalogo,
  modalConfirmacion, cerrarModalConfirmacion, ejecutarAccionConfirmacion
} from './InventarioView'

onMounted(async () => {
  await inicializarInventario()
})

watch(usuarioActivoId, async (nuevoId, anteriorId) => {
  if (nuevoId && nuevoId !== anteriorId) {
    await recargarTodo()
  }
})
</script>

<template>
  <div class="inv-wrapper">
    <!-- BARRA SUPERIOR: CONTROL Y SIMULADOR DE SESION -->
    <header class="inv-topbar">
      <div class="inv-topbar-left">
        <div class="inv-page-title-box">
          <div class="inv-page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h1 class="inv-page-title">Gestión de Inventario y Recepción por Lotes</h1>
            <p class="inv-page-subtitle">Control de stock real, trazabilidad de vencimientos y auditoría en Sala de Espera</p>
          </div>
        </div>
      </div>

      <div class="inv-topbar-right">
        <!-- SELECTOR DE USUARIO ACTIVO (100% DINÁMICO DE POSTGRESQL) -->
        <div class="inv-role-selector-card">
          <span class="inv-role-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Usuario Activo:
          </span>
          <select v-model="usuarioActivoId" class="inv-role-select">
            <option v-for="u in listaUsuarios" :key="u.usuarioId || u.usuario_id" :value="u.usuarioId || u.usuario_id">
              {{ u.usuarioId || u.usuario_id }}: {{ u.nombreCompleto || u.nombre_completo || u.nombres }} ({{ u.rolNombre || u.rol_nombre }})
            </option>
          </select>
          <span
            class="inv-role-pill-badge"
            :style="{
              backgroundColor: getBadgeRol(rolActivo).bg,
              color: getBadgeRol(rolActivo).text,
              borderColor: getBadgeRol(rolActivo).border
            }"
          >
            {{ getBadgeRol(rolActivo).label }}
          </span>
        </div>

        <!-- CAMPANA DE NOTIFICACIONES INTERNAS -->
        <button
          type="button"
          class="inv-btn-icon-topbar"
          :class="{ 'has-unread': totalEnSalaEspera > 0 || totalAlertasVencimiento > 0 }"
          @click="showNotificationsDrawer = !showNotificationsDrawer"
          title="Notificaciones internas y alertas"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span v-if="totalEnSalaEspera + totalAlertasVencimiento > 0" class="inv-badge-counter">
            {{ totalEnSalaEspera + totalAlertasVencimiento }}
          </span>
        </button>

        <!-- BOTON GESTIONAR CATEGORÍAS (SUPERVISOR / PROPIETARIO) -->
        <button
          v-if="puedeCrearCategoria"
          type="button"
          class="inv-btn-secondary"
          @click="abrirModalGestionCategorias"
          title="Administrar categorías maestras (Tabla conceptos - Grupo 2)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <path d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>Gestionar Categorías</span>
        </button>

        <!-- BOTON PRIMARIO: REGISTRAR INGRESO -->
        <button type="button" class="inv-btn-primary" @click="abrirModalRecepcion">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Registrar Ingreso de Mercadería</span>
        </button>
      </div>
    </header>

    <!-- DRAWER FLOTANTE DE NOTIFICACIONES -->
    <div v-if="showNotificationsDrawer" class="inv-notif-dropdown">
      <div class="inv-notif-header">
        <span class="inv-notif-title">Alertas y Notificaciones Internas</span>
        <button type="button" class="inv-btn-close-sm" @click="showNotificationsDrawer = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="inv-notif-body">
        <div v-if="totalEnSalaEspera > 0" class="inv-notif-item alert-espera" @click="activeTab = 'espera'; showNotificationsDrawer = false">
          <div class="inv-notif-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="inv-notif-item-text">
            <strong>{{ totalEnSalaEspera }} lotes pendientes en Sala de Espera</strong>
            <p>Requieren validación o aprobación del Supervisor/Propietario.</p>
          </div>
        </div>

        <div v-if="totalAlertasVencimiento > 0" class="inv-notif-item alert-vencimiento" @click="activeTab = 'stock'; filterProximosVencer = true; showNotificationsDrawer = false">
          <div class="inv-notif-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div class="inv-notif-item-text">
            <strong>{{ totalAlertasVencimiento }} lotes próximos a vencer (≤ {{ diasUmbralVencimiento }} días)</strong>
            <p>Considere activar precios de oferta para acelerar su salida.</p>
          </div>
        </div>

        <div v-if="totalEnSalaEspera === 0 && totalAlertasVencimiento === 0" class="inv-notif-empty">
          <p>No hay alertas críticas en este momento. Todos los lotes están regulares.</p>
        </div>
      </div>
    </div>

    <!-- TARJETAS SUPERIORES DE METRICAS (KPIS) -->
    <section class="inv-kpi-grid">
      <div class="inv-kpi-card">
        <div class="inv-kpi-info">
          <span class="inv-kpi-label">Productos en Catálogo</span>
          <span class="inv-kpi-value font-mono">{{ totalProductosCatalogo }}</span>
          <span class="inv-kpi-sub">Definiciones maestras activas</span>
        </div>
        <div class="inv-kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>
      </div>

      <div class="inv-kpi-card">
        <div class="inv-kpi-info">
          <span class="inv-kpi-label">Unidades en Stock Activo</span>
          <span class="inv-kpi-value font-mono">{{ totalStockActivo }}</span>
          <span class="inv-kpi-sub">Excluye lotes en espera o rechazados</span>
        </div>
        <div class="inv-kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
      </div>

      <div class="inv-kpi-card" :class="{ 'inv-kpi-highlight-amber': totalEnSalaEspera > 0 }">
        <div class="inv-kpi-info">
          <span class="inv-kpi-label">En Sala de Espera</span>
          <span class="inv-kpi-value font-mono">{{ totalEnSalaEspera }}</span>
          <span class="inv-kpi-sub">Cola de auditoría (Pendiente = 1)</span>
        </div>
        <div class="inv-kpi-icon-box amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      <div class="inv-kpi-card" :class="{ 'inv-kpi-highlight-rose': totalAlertasVencimiento > 0 }">
        <div class="inv-kpi-info">
          <span class="inv-kpi-label">Alertas de Vencimiento (≤ {{ diasUmbralVencimiento }} días)</span>
          <span class="inv-kpi-value font-mono">{{ totalAlertasVencimiento }}</span>
          <span class="inv-kpi-sub">Umbral configurable (default 14 días)</span>
        </div>
        <div class="inv-kpi-icon-box rose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      </div>
    </section>

    <!-- NAVEGACION POR PESTAÑAS (3 TABS OPERATIVOS) -->
    <nav class="inv-tabs-bar">
      <button
        type="button"
        class="inv-tab-btn"
        :class="{ active: activeTab === 'stock' }"
        @click="activeTab = 'stock'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span>Inventario</span>
        <span class="inv-tab-counter font-mono">{{ filasStock.length }}</span>
      </button>

      <button
        type="button"
        class="inv-tab-btn"
        :class="{ active: activeTab === 'espera' }"
        @click="activeTab = 'espera'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Sala de espera</span>
        <span v-if="totalEnSalaEspera > 0" class="inv-tab-counter-alert font-mono">{{ totalEnSalaEspera }}</span>
        <span v-else class="inv-tab-counter font-mono">0</span>
      </button>

      <button
        type="button"
        class="inv-tab-btn"
        :class="{ active: activeTab === 'catalogo' }"
        @click="activeTab = 'catalogo'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>Catálogo de productos</span>
        <span class="inv-tab-counter font-mono">{{ productosCatalogo.length }}</span>
      </button>
    </nav>

    <!-- BARRA DE FILTROS Y BUSQUEDA GENERAL -->
    <div class="inv-filter-panel">
      <div class="inv-search-input-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm search-icon">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por Nombre, Código Interno o Código de Barras (soporta pistola lectora)..."
          class="inv-search-input"
        />
        <button v-if="searchQuery" type="button" class="inv-search-clear" @click="searchQuery = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="inv-filter-controls">
        <!-- Filtro Categoria -->
        <select v-model="selectedCategoria" class="inv-filter-select">
          <option value="">Todas las Categorías</option>
          <option v-for="cat in listaCategorias" :key="cat.codigo" :value="cat.codigo">
            {{ cat.nombreCategoria || cat.descripcion || cat.nombre_categoria }}
          </option>
        </select>

        <!-- Filtro Proveedor (solo en stock) -->
        <select v-if="activeTab === 'stock'" v-model="selectedProveedor" class="inv-filter-select">
          <option value="">Todos los Proveedores</option>
          <option v-for="prov in proveedores" :key="prov.proveedor_id" :value="prov.proveedor_id">
            {{ prov.nombre_empresa }}
          </option>
        </select>

        <!-- Filtro Estado Producto (en stock o catálogo) -->
        <select v-if="activeTab !== 'espera'" v-model="selectedEstadoProducto" class="inv-filter-select">
          <option value="">Todos los Estados</option>
          <option :value="1">Activo</option>
          <option :value="2">Descontinuado</option>
          <option :value="3">Suspendido</option>
        </select>

        <!-- Filtro Estado de Registro (Soft Delete) -->
        <select
          v-if="activeTab !== 'espera'"
          v-model="selectedEstadoRegistro"
          class="inv-filter-select"
          @change="onEstadoRegistroChange"
          title="Filtrar por estado del registro (Activos / Dados de Baja / Todos)"
        >
          <option value="ACTIVOS">Solo Activos</option>
          <option value="INACTIVOS">Dados de Baja</option>
          <option value="TODOS">Todos</option>
        </select>

        <!-- Filtro Estado Pendiente (Pills de Auditoría) -->
        <div v-if="activeTab === 'espera'" class="inv-filter-status-pills">
          <button
            type="button"
            class="inv-status-pill"
            :class="{ active: filterEstadoPendiente === '' }"
            @click="filterEstadoPendiente = ''"
          >
            Todos ({{ conteoEspera.todos }})
          </button>
          <button
            type="button"
            class="inv-status-pill pill-amber"
            :class="{ active: filterEstadoPendiente === 1 }"
            @click="filterEstadoPendiente = 1"
          >
            Pendientes ({{ conteoEspera.pendientes }})
          </button>
          <button
            type="button"
            class="inv-status-pill pill-orange"
            :class="{ active: filterEstadoPendiente === 4 }"
            @click="filterEstadoPendiente = 4"
          >
            Observados ({{ conteoEspera.observados }})
          </button>
          <button
            type="button"
            class="inv-status-pill pill-green"
            :class="{ active: filterEstadoPendiente === 2 }"
            @click="filterEstadoPendiente = 2"
          >
            Aprobados ({{ conteoEspera.aprobados }})
          </button>
          <button
            type="button"
            class="inv-status-pill pill-rose"
            :class="{ active: filterEstadoPendiente === 3 }"
            @click="filterEstadoPendiente = 3"
          >
            Rechazados ({{ conteoEspera.rechazados }})
          </button>
        </div>

        <!-- Selector Configurable de Umbral de Vencimiento -->
        <div v-if="activeTab === 'stock'" class="inv-filter-venc-group">
          <label class="inv-filter-venc-label" title="Definir ventana de días para considerar un lote próximo a vencer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Alerta Vence en:</span>
          </label>
          <select
            v-model="diasUmbralVencimientoPreset"
            class="inv-filter-select font-mono"
            @change="onPresetVencimientoChange"
          >
            <option :value="7">≤ 7 días (1 semana)</option>
            <option :value="14">≤ 14 días (2 semanas - Default)</option>
            <option :value="30">≤ 30 días (1 mes)</option>
            <option :value="60">≤ 60 días (2 meses)</option>
            <option :value="90">≤ 90 días (3 meses)</option>
            <option value="custom">Personalizado...</option>
          </select>

          <!-- Input numérico si se elige Personalizado -->
          <div v-if="diasUmbralVencimientoPreset === 'custom'" class="inv-custom-days-wrapper">
            <input
              v-model.number="diasUmbralVencimiento"
              type="number"
              min="1"
              max="730"
              class="inv-input-custom-days font-mono"
              placeholder="Días"
            />
            <span class="inv-days-suffix">días</span>
          </div>
        </div>

        <!-- Toggle Rapido Proximos a Vencer (Tab Stock) -->
        <button
          v-if="activeTab === 'stock'"
          type="button"
          class="inv-filter-toggle-btn"
          :class="{ active: filterProximosVencer }"
          @click="filterProximosVencer = !filterProximosVencer"
          :title="`Filtrar lotes con caducidad menor o igual a ${diasUmbralVencimiento} días`"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span>Solo Próximos a Vencer (≤ {{ diasUmbralVencimiento }} días)</span>
        </button>

        <!-- Toggle Rapido En Oferta (Tab Stock) -->
        <button
          v-if="activeTab === 'stock'"
          type="button"
          class="inv-filter-toggle-btn"
          :class="{ active: filterEnOferta }"
          @click="filterEnOferta = !filterEnOferta"
          title="Filtrar unicamente productos que estan en oferta o descuento"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <span>Solo en Oferta</span>
        </button>

        <!-- Boton Reset Filtros -->
        <button
          v-if="searchQuery || selectedCategoria !== '' || selectedProveedor !== '' || selectedEstadoProducto !== '' || filterProximosVencer || filterEnOferta || selectedEstadoRegistro !== 'ACTIVOS'"
          type="button"
          class="inv-btn-reset-filters"
          @click="resetFiltros"
        >
          Limpiar Filtros
        </button>
      </div>
    </div>

    <!-- CONTENEDOR PRINCIPAL DE CONTENIDO SEGUN TAB -->

    <!-- ============================================================= -->
    <!-- TAB 1: STOCK POR LOTES (INVENTARIO) -->
    <!-- ============================================================= -->
    <main v-if="activeTab === 'stock'" class="inv-tab-content">
      <div class="inv-table-card">
        <div class="inv-table-responsive">
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width: 140px">Cód. Interno / Barras</th>
                <th>Producto y Categoría</th>
                <th>Detalle Lote / Proveedor</th>
                <th style="width: 170px">Fecha Vencimiento</th>
                <th class="text-right" style="width: 130px">Costo Unit. / Total</th>
                <th class="text-right" style="width: 150px">Precio Venta / Oferta</th>
                <th class="text-center" style="width: 110px">Stock Disp.</th>
                <th class="text-center" style="width: 110px">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filasStock.length === 0">
                <td colspan="8" class="inv-table-empty">
                  No se encontraron registros de inventario con los filtros aplicados.
                </td>
              </tr>
              <tr v-for="fila in filasStock" :key="fila.inventario_id" :class="{ 'row-warning-venc': fila.dias_vencimiento !== null && fila.dias_vencimiento <= diasUmbralVencimiento, 'row-baja': fila.marca_baja }">
                <!-- Codigos -->
                <td>
                  <div class="inv-col-code">
                    <span class="inv-badge-code font-mono">{{ fila.codigo_interno }}</span>
                    <span class="inv-sub-code font-mono">{{ fila.codigo_barras }}</span>
                  </div>
                </td>

                <!-- Producto -->
                <td>
                  <div class="inv-col-prod">
                    <span class="inv-prod-title">
                      {{ fila.nombre_producto }}
                      <span v-if="fila.marca_baja" class="inv-badge-baja">Dado de Baja</span>
                    </span>
                    <div class="inv-prod-meta">
                      <span class="inv-tag-muted">{{ fila.categoria_nombre }}</span>
                      <span
                        class="inv-badge-status"
                        :style="{
                          backgroundColor: ESTADOS_PRODUCTO[fila.estado_producto]?.bg,
                          color: ESTADOS_PRODUCTO[fila.estado_producto]?.text,
                          borderColor: ESTADOS_PRODUCTO[fila.estado_producto]?.border
                        }"
                      >
                        {{ ESTADOS_PRODUCTO[fila.estado_producto]?.label }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Lote y Proveedor -->
                <td>
                  <div class="inv-col-lot">
                    <span class="inv-lot-id font-mono">#{{ fila.lote_id }} - {{ fila.descripcion_lote }}</span>
                    <span class="inv-lot-prov">{{ fila.nombre_proveedor }}</span>
                  </div>
                </td>

                <!-- Fecha de Vencimiento y Regla Configurable de Caducidad -->
                <td>
                  <div class="inv-col-venc">
                    <template v-if="fila.fecha_vencimiento">
                      <span class="inv-venc-date font-mono">{{ fila.fecha_vencimiento }}</span>

                      <!-- Indicador Dinamico de Caducidad -->
                      <div v-if="fila.dias_vencimiento !== null" class="inv-venc-alert-box">
                        <span v-if="fila.dias_vencimiento < 0" class="inv-badge-venc-danger">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                          Vencido hace {{ Math.abs(fila.dias_vencimiento) }} días
                        </span>

                        <span v-else-if="fila.dias_vencimiento === 0" class="inv-badge-venc-danger">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          Vence hoy
                        </span>

                        <span v-else-if="fila.dias_vencimiento <= diasUmbralVencimiento" class="inv-badge-venc-warn">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                          Vence en {{ fila.dias_vencimiento }} días
                        </span>

                        <span v-else class="inv-venc-ok">
                          Faltan {{ fila.dias_vencimiento }} días
                        </span>
                      </div>
                    </template>
                    <template v-else>
                      <span class="inv-venc-no-per">No perecedero</span>
                    </template>
                  </div>
                </td>

                <!-- Costos -->
                <td class="text-right">
                  <div class="inv-col-cost font-mono">
                    <span class="inv-cost-unit">{{ formatMontoBs(fila.costo_unitario) }} u.</span>
                    <span class="inv-cost-total">Lote: {{ formatMontoBs(fila.precio_lote) }}</span>
                  </div>
                </td>

                <!-- Precios de Venta y Oferta -->
                <td class="text-right">
                  <div class="inv-col-price font-mono">
                    <template v-if="fila.en_descuento && fila.precio_descuento">
                      <span class="inv-price-strike">{{ formatMontoBs(fila.precio_venta_producto) }}</span>
                      <span class="inv-price-discount">{{ formatMontoBs(fila.precio_descuento) }}</span>
                      <span class="inv-badge-offer">EN OFERTA</span>
                    </template>
                    <template v-else>
                      <span class="inv-price-regular">{{ formatMontoBs(fila.precio_venta_producto) }}</span>
                    </template>
                  </div>
                </td>

                <!-- Stock Disponible -->
                <td class="text-center">
                  <span
                    class="inv-stock-badge font-mono"
                    :class="{ 'stock-zero': fila.stock <= 0, 'stock-low': fila.stock > 0 && fila.stock <= 10 }"
                  >
                    {{ fila.stock }} u.
                  </span>
                </td>

                <!-- Acciones -->
                <td class="text-center">
                  <div class="inv-actions-box">
                    <!-- Si el lote está dado de baja (marca_baja === true): ÚNICO botón de Restaurar -->
                    <template v-if="fila.marca_baja">
                      <button
                        type="button"
                        class="inv-btn-action inv-btn-restore"
                        @click="reactivarItemInventario(fila.inventario_id, fila.lote_id, fila.nombre_producto)"
                        :title="rolActivo === ROLES.CAJERO ? 'Solo Supervisor/Propietario' : 'Reactivar / Restaurar Lote'"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                      </button>
                    </template>

                    <!-- Si el lote está activo (marca_baja === false): botones normales -->
                    <template v-else>
                      <!-- Boton Descontar Unidades / Merma (1 solo) -->
                      <button
                        type="button"
                        class="inv-btn-action inv-btn-deduct"
                        @click="abrirModalDescontar(fila)"
                        :disabled="fila.stock <= 0"
                        title="Descontar Unidades / Registrar Merma de Stock"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </button>

                      <!-- Boton Oferta / Descuento -->
                      <button
                        type="button"
                        class="inv-btn-action"
                        :class="{ 'active-offer': fila.en_descuento }"
                        @click="abrirModalDescuento(fila)"
                        :title="rolActivo === ROLES.CAJERO ? 'Solo Supervisor/Propietario' : 'Fijar precio de oferta / liquidación'"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                      </button>

                      <!-- Boton Baja Logica (Lote Completo) -->
                      <button
                        type="button"
                        class="inv-btn-action danger"
                        @click="darBajaItemInventario(fila.inventario_id, fila.lote_id, fila.nombre_producto)"
                        :title="rolActivo === ROLES.CAJERO ? 'Solo Supervisor/Propietario' : 'Dar de baja lógica al lote completo'"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ============================================================= -->
    <!-- TAB 2: SALA DE ESPERA (INVENTARIO PENDIENTES) -->
    <!-- ============================================================= -->
    <main v-if="activeTab === 'espera'" class="inv-tab-content">
      <div class="inv-banner-audit">
        <div class="inv-banner-audit-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-md">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div class="inv-banner-audit-text">
          <h3>Bandeja de Auditoría y Validación de Mercadería</h3>
          <p>
            Los registros ingresados por cajeros permanecen aislados en esta cola (estado_auditoria = 'EN_ESPERA').
            <strong>No se sumarán a las unidades en stock activo</strong> hasta que un Supervisor o Propietario verifique costos, caducidad y apruebe el ingreso.
          </p>
        </div>
      </div>

      <div class="inv-table-card">
        <div class="inv-table-responsive">
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width: 140px">ID / Registro</th>
                <th>Producto y Código</th>
                <th>Lote Propuesto y Vencimiento</th>
                <th class="text-right" style="width: 120px">Ingreso / Costo</th>
                <th class="text-right" style="width: 100px">Precio Venta</th>
                <th class="text-center" style="width: 160px; min-width: 150px">Estado Auditoría</th>
                <th class="text-center" style="width: 280px; min-width: 270px">Acciones de Supervisor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pendientesFiltrados.length === 0">
                <td colspan="7" class="inv-table-empty">
                  No hay registros pendientes de revisión en la Sala de Espera.
                </td>
              </tr>
              <tr v-for="item in pendientesFiltrados" :key="item.inventario_pendiente_id">
                <!-- ID y Registro (Cajero con Nombre Completo) -->
                <td>
                  <div class="inv-col-pend-id">
                    <span class="inv-badge-id font-mono">#PEND-{{ item.inventario_pendiente_id }}</span>
                    <div class="inv-col-user-box">
                      <span class="inv-user-name">{{ item.nombre_usuario_creacion || resolverNombreUsuario(item.usuario_creacion) }}</span>
                      <div class="inv-user-subrow">
                        <span
                          class="inv-role-badge-tag"
                          :style="{
                            backgroundColor: getBadgeUsuario(item.usuario_creacion).bg,
                            color: getBadgeUsuario(item.usuario_creacion).text,
                            borderColor: getBadgeUsuario(item.usuario_creacion).border
                          }"
                        >
                          <span class="inv-role-dot" :style="{ backgroundColor: getBadgeUsuario(item.usuario_creacion).text }"></span>
                          {{ getBadgeUsuario(item.usuario_creacion).label }}
                        </span>
                        <span class="inv-pend-date font-mono">{{ formatearFechaCorta(item.fecha_creacion) }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Producto y Catalogacion -->
                <td>
                  <div class="inv-col-prod">
                    <div class="inv-pend-prod-header">
                      <span class="inv-prod-title">{{ item.nombre_producto }}</span>
                      <span v-if="item.producto_id === null" class="inv-badge-new-prod">
                        Producto Nuevo
                      </span>
                      <span v-else class="inv-badge-exist-prod">
                        Reabastecimiento
                      </span>
                    </div>
                    <div class="inv-prod-meta font-mono">
                      <span>Cód: {{ item.codigo_interno }}</span>
                      <span v-if="item.codigo_barras">Barras: {{ item.codigo_barras }}</span>
                    </div>
                    <!-- NOTA DE OBSERVACION DEL SUPERVISOR CUANDO ESTADO = 4 -->
                    <div v-if="item.estado === 4 && (item.observacion_revision || item.observacionRevision)" class="inv-observed-note">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs flex-shrink-0" style="width: 14px; height: 14px; margin-top: 1px;">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span><strong>Obs. Supervisor:</strong> {{ item.observacion_revision || item.observacionRevision }}</span>
                    </div>
                  </div>
                </td>

                <!-- Lote propuesto -->
                <td>
                  <div class="inv-col-lot">
                    <span class="inv-lot-id">{{ item.descripcion_lote }}</span>
                    <span v-if="item.fecha_vencimiento" class="inv-lot-venc font-mono">
                      Vence: {{ item.fecha_vencimiento }}
                    </span>
                    <span v-else class="inv-venc-no-per">No perecedero</span>
                  </div>
                </td>

                <!-- Cantidades y Costos -->
                <td class="text-right">
                  <div class="inv-col-cost font-mono">
                    <span class="inv-stock-qty">{{ item.stock_ingresado }} unidades</span>
                    <span class="inv-cost-unit">Unit: {{ formatMontoBs(item.precio_compra) }}</span>
                    <span class="inv-cost-total">Total: {{ formatMontoBs(item.precio_lote) }}</span>
                  </div>
                </td>

                <!-- Precio Venta -->
                <td class="text-right">
                  <span class="inv-price-regular font-mono">{{ formatMontoBs(item.precio_venta) }}</span>
                </td>

                <!-- Estado Auditoría (Aprobado / Rechazado / Observado / Pendiente) -->
                <td class="text-center">
                  <div class="inv-status-audit-wrapper">
                    <span v-if="item.estado === 2" class="inv-badge-audit approved">
                      <span class="inv-badge-dot"></span>
                      <span>Aprobado</span>
                    </span>
                    <span v-else-if="item.estado === 3" class="inv-badge-audit rejected">
                      <span class="inv-badge-dot"></span>
                      <span>Rechazado</span>
                    </span>
                    <span v-else-if="item.estado === 4" class="inv-badge-audit observed">
                      <span class="inv-badge-dot"></span>
                      <span>Observado</span>
                    </span>
                    <span v-else class="inv-badge-audit pending">
                      <span class="inv-badge-dot"></span>
                      <span>Pendiente</span>
                    </span>

                    <span v-if="item.usuario_revision" class="inv-audit-sub">
                      por {{ item.nombre_usuario_revision || resolverNombreUsuario(item.usuario_revision) }}
                    </span>
                    <span v-else class="inv-audit-sub muted">
                      Por revisar
                    </span>
                  </div>
                </td>

                <!-- Acciones de Supervisor / Cajero (Detalles, Editar, Aprobar, Observar, Rechazar) -->
                <td class="text-center">
                  <!-- CASO 1: PENDIENTE (ESTADO = 1) -->
                  <div v-if="item.estado === 1" class="inv-audit-actions">
                    <!-- Botón de Detalles (Espacioso, no aplastado) -->
                    <button
                      type="button"
                      class="inv-btn-detail-sm"
                      @click="abrirModalDetalles(item)"
                      title="Ver trazabilidad completa, observaciones y personal"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Detalles</span>
                    </button>

                    <template v-if="rolActivo === ROLES.SUPERVISOR || rolActivo === ROLES.PROPIETARIO">
                      <!-- Editar / Rectificar -->
                      <button
                        type="button"
                        class="inv-btn-edit-sm"
                        @click="abrirModalEditarPendiente(item)"
                        title="Rectificar datos antes de aprobar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Editar</span>
                      </button>

                      <!-- Aprobar -->
                      <button
                        type="button"
                        class="inv-btn-approve-sm"
                        @click="aprobarIngreso(item)"
                        title="Aprobar e ingresar stock a Inventario Activo"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Aprobar</span>
                      </button>

                      <!-- Mandar a Corregir -->
                      <button
                        type="button"
                        class="inv-btn-observe-sm"
                        @click="abrirModalObservar(item)"
                        title="Mandar a corregir al cajero con observación"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>

                      <!-- Rechazar -->
                      <button
                        type="button"
                        class="inv-btn-reject-sm"
                        @click="abrirModalRechazo(item)"
                        title="Rechazar ingreso y registrar motivo"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </template>
                    <template v-else>
                      <span class="inv-wait-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        En espera
                      </span>
                    </template>
                  </div>

                  <!-- CASO 2: OBSERVADO / PARA CORRECCION (ESTADO = 4) -->
                  <div v-else-if="item.estado === 4" class="inv-audit-actions">
                    <!-- Botón de Detalles -->
                    <button
                      type="button"
                      class="inv-btn-detail-sm"
                      @click="abrirModalDetalles(item)"
                      title="Ver trazabilidad completa, observaciones y personal"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Detalles</span>
                    </button>

                    <!-- Si es CAJERO: botón "Subsanar / Corregir" -->
                    <template v-if="rolActivo === ROLES.CAJERO">
                      <button
                        type="button"
                        class="inv-btn-correct-sm"
                        @click="abrirModalEditarPendiente(item)"
                        title="Subsanar datos observados y reenviar a auditoría"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Subsanar / Corregir</span>
                      </button>
                    </template>

                    <!-- Si es SUPERVISOR/PROPIETARIO sobre ítem observado -->
                    <template v-else>
                      <button
                        type="button"
                        class="inv-btn-edit-sm"
                        @click="abrirModalEditarPendiente(item)"
                        title="Editar datos"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        class="inv-btn-reject-sm"
                        @click="abrirModalRechazo(item)"
                        title="Rechazar ingreso y registrar motivo"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </template>
                  </div>

                  <!-- CASO 2: PROCESADO (APROBADO O RECHAZADO) -->
                  <div v-else class="inv-actions-center">
                    <!-- Botón Detalles solo y perfectamente centrado -->
                    <button
                      type="button"
                      class="inv-btn-detail-sm"
                      @click="abrirModalDetalles(item)"
                      title="Ver auditoría completa, observaciones y dictamen"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Detalles</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ============================================================= -->
    <!-- TAB 3: CATALOGO MAESTRO (PRODUCTOS) -->
    <!-- ============================================================= -->
    <main v-if="activeTab === 'catalogo'" class="inv-tab-content">
      <div class="inv-table-card">
        <div class="inv-table-responsive">
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width: 140px">Cód. Interno / Barras</th>
                <th>Nombre del Producto</th>
                <th>Categoría</th>
                <th class="text-right" style="width: 130px">Costo Ref. (Compra)</th>
                <th class="text-right" style="width: 130px">Precio Venta (Góndola)</th>
                <th class="text-center" style="width: 130px">Stock Total Activo</th>
                <th class="text-center" style="width: 160px">Estado Comercial</th>
                <th class="text-center" style="width: 100px">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="productosCatalogo.length === 0">
                <td colspan="8" class="inv-table-empty">
                  No se encontraron productos en el catálogo maestro.
                </td>
              </tr>
              <tr v-for="prod in productosCatalogo" :key="prod.producto_id" :class="{ 'row-baja': prod.marca_baja }">
                <td>
                  <div class="inv-col-code">
                    <span class="inv-badge-code font-mono">{{ prod.codigo_interno }}</span>
                    <span class="inv-sub-code font-mono">{{ prod.codigo_barras }}</span>
                  </div>
                </td>

                <td>
                  <span class="inv-prod-title">
                    {{ prod.nombre_producto }}
                    <span v-if="prod.marca_baja" class="inv-badge-baja">Dado de Baja</span>
                  </span>
                </td>

                <td>
                  <span class="inv-tag-muted">{{ prod.categoria_nombre }}</span>
                </td>

                <td class="text-right font-mono">
                  <span class="inv-cost-unit">{{ formatMontoBs(prod.precio_compra) }}</span>
                </td>

                <td class="text-right font-mono">
                  <span class="inv-price-regular">{{ formatMontoBs(prod.precio_venta) }}</span>
                </td>

                <td class="text-center font-mono">
                  <span class="inv-stock-badge" :class="{ 'stock-zero': prod.stock_total <= 0 }">
                    {{ prod.stock_total }} u.
                  </span>
                </td>

                <td class="text-center">
                  <select
                    :value="prod.estado"
                    class="inv-status-select"
                    :disabled="rolActivo === ROLES.CAJERO || prod.marca_baja"
                    @change="cambiarEstadoProducto(prod.producto_id, Number(($event.target as HTMLSelectElement).value))"
                    :title="rolActivo === ROLES.CAJERO ? 'Permiso exclusivo de Supervisor' : 'Modificar estado comercial'"
                  >
                    <option :value="1">1: Activo</option>
                    <option :value="2">2: Descontinuado</option>
                    <option :value="3">3: Suspendido</option>
                  </select>
                </td>

                <td class="text-center">
                  <div class="inv-actions-box">
                    <!-- Si está dado de baja (marca_baja === true): ÚNICO botón de Restaurar -->
                    <template v-if="prod.marca_baja">
                      <button
                        type="button"
                        class="inv-btn-action inv-btn-restore"
                        @click="reactivarProductoCatalogo(prod.producto_id, prod.nombre_producto)"
                        :title="rolActivo === ROLES.CAJERO ? 'Solo Supervisor/Propietario' : 'Reactivar / Restaurar Producto'"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                      </button>
                    </template>

                    <!-- Si está activo (marca_baja === false): botón Dar de Baja -->
                    <template v-else>
                      <button
                        type="button"
                        class="inv-btn-action danger"
                        @click="darBajaProductoCatalogo(prod.producto_id, prod.nombre_producto)"
                        :title="rolActivo === ROLES.CAJERO ? 'Solo Supervisor/Propietario' : 'Dar de baja lógica al producto'"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ============================================================= -->
    <!-- MODAL 1: RECEPCION DE MERCADERIA (ABM CON GENERADOR LEC001) -->
    <!-- ============================================================= -->
    <div v-if="modalRecepcionVisible" class="inv-modal-overlay">
      <div class="inv-modal-container">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Registrar Ingreso de Mercadería y Lote</h2>
            <p class="inv-modal-subtitle">Recepción física, lectura de código de barras y liquidación de costos</p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalRecepcionVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="guardarRecepcion" class="inv-modal-body">
          <!-- SECCION 1: IDENTIFICACION DEL PRODUCTO -->
          <div class="inv-form-section">
            <span class="inv-section-title">Paso 1: Identificación del Producto (Catálogo)</span>

            <!-- Codigo de Barras + Lector + Camara -->
            <div class="inv-field-group">
              <label class="inv-label">
                Código de Barras
                <span class="inv-label-hint">Presione Enter o escanee con pistola física</span>
              </label>
              <div class="inv-barcode-input-row">
                <div class="inv-barcode-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs barcode-icon">
                    <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
                  </svg>
                  <input
                    ref="barcodeInputRef"
                    v-model="formRecepcion.codigo_barras"
                    type="text"
                    placeholder="Ej. 7771234560012"
                    class="inv-input font-mono barcode-input"
                    @input="onCodigoBarrasInput"
                    @keydown.enter.prevent="handleBarcodeEnter"
                    @blur="handleBarcodeEnter"
                  />
                </div>
                <button
                  type="button"
                  class="inv-btn-camera"
                  @click="abrirVisorCamara"
                  title="Abrir simulador de cámara móvil"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Escanear con Cámara Móvil</span>
                </button>
              </div>
            </div>

            <!-- Nombre de Producto y Codigo Interno Autogenerado -->
            <div class="inv-grid-2">
              <div class="inv-field-group">
                <div class="inv-label-between">
                  <label class="inv-label">Nombre del Producto *</label>
                  <button
                    type="button"
                    class="inv-mode-toggle-btn"
                    @click="alternarModoProductoRecepcion(!modoProductoNuevoRecepcion)"
                  >
                    <span v-if="!modoProductoNuevoRecepcion">+ Escribir Producto Nuevo</span>
                    <span v-else>Seleccionar del Catálogo</span>
                  </button>
                </div>

                <!-- Selector de productos existentes de la base de datos para no duplicar nombres -->
                <CustomSelect
                  v-if="!modoProductoNuevoRecepcion"
                  v-model="productoSeleccionadoRecepcionId"
                  :options="opcionesProductosCatalogo"
                  placeholder="Buscar y seleccionar producto de la base de datos..."
                  :show-action="true"
                  action-label="+ ¿No está en la lista? Escribir producto nuevo"
                  @action="alternarModoProductoRecepcion(true)"
                  @update:model-value="onSeleccionarProductoCatalogoRecepcion"
                />

                <!-- Input manual si se registra un producto nuevo -->
                <input
                  v-else
                  v-model="formRecepcion.nombre_producto"
                  type="text"
                  placeholder="Ej. Leche Pil Entera 1L"
                  class="inv-input"
                  required
                  @input="onNombreProductoInput"
                />
              </div>

              <div class="inv-field-group">
                <label class="inv-label">
                  Código Interno
                  <span class="inv-badge-auto">Autogenerado</span>
                </label>
                <div class="inv-readonly-input-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    v-model="formRecepcion.codigo_interno"
                    type="text"
                    readonly
                    class="inv-input font-mono readonly-input"
                    placeholder="Ej. LEC001"
                  />
                </div>
              </div>
            </div>

            <!-- Categoria y Proveedor -->
            <div class="inv-grid-2">
              <div class="inv-field-group">
                <label class="inv-label">Categoría de Producto *</label>
                <div class="inv-input-action-row">
                  <CustomSelect
                    v-model="formRecepcion.categoria_id"
                    :options="opcionesCategorias"
                    placeholder="Seleccione categoría..."
                    icon-type="categoria"
                    :show-action="puedeCrearCategoria"
                    action-label="+ Registrar nueva categoría"
                    @action="abrirModalCrearCategoria"
                  />
                  <button
                    v-if="puedeCrearCategoria"
                    type="button"
                    class="inv-btn-addon"
                    @click="abrirModalCrearCategoria"
                    title="Registrar nueva categoría (Solo Supervisor / Propietario)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="inv-field-group">
                <label class="inv-label">Proveedor</label>
                <div class="inv-input-action-row">
                  <CustomSelect
                    v-model="formRecepcion.proveedor_id"
                    :options="opcionesProveedores"
                    placeholder="Seleccione distribuidor..."
                    icon-type="proveedor"
                    :show-action="puedeCrearProveedor"
                    action-label="+ Registrar nuevo distribuidor"
                    @action="abrirModalCrearProveedor"
                  />
                  <button
                    v-if="puedeCrearProveedor"
                    type="button"
                    class="inv-btn-addon"
                    @click="abrirModalCrearProveedor"
                    title="Registrar nuevo distribuidor (Solo Supervisor / Propietario)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCION 2: DATOS DEL LOTE Y COSTOS -->
          <div class="inv-form-section">
            <span class="inv-section-title">Paso 2: Datos de Partida del Lote y Liquidación de Costos</span>

            <div class="inv-field-group">
              <label class="inv-label">Descripción del Lote</label>
              <input
                v-model="formRecepcion.descripcion_lote"
                type="text"
                placeholder="Ej. Lote Leche Pil Oct-2026"
                class="inv-input"
              />
            </div>

            <div class="inv-grid-3">
              <!-- Stock Ingresado -->
              <div class="inv-field-group">
                <label class="inv-label">
                  Unidades Físicas (Cantidad) *
                  <span class="inv-label-sub">Incluye unidades regalo/bonificación</span>
                </label>
                <input
                  v-model.number="formRecepcion.stock_ingresado"
                  type="number"
                  min="1"
                  step="1"
                  class="inv-input font-mono"
                  required
                />
              </div>

              <!-- Precio Total del Lote -->
              <div class="inv-field-group">
                <label class="inv-label">Monto Total Lote (Bs) *</label>
                <input
                  v-model.number="formRecepcion.precio_lote"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="inv-input font-mono"
                  required
                />
              </div>

              <!-- Costo Unitario Manual con Sugerencia -->
              <div class="inv-field-group">
                <label class="inv-label">
                  Costo Unitario (Bs) *
                  <span class="inv-label-sub">Ingreso manual</span>
                </label>
                <input
                  v-model.number="formRecepcion.precio_compra"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="inv-input font-mono"
                  required
                />
                <div v-if="costoSugeridoMatematico > 0" class="inv-cost-sug-row">
                  <span>Sugerido (Total / Cant): Bs {{ costoSugeridoMatematico.toFixed(2) }}</span>
                  <button type="button" class="inv-btn-link-action" @click="aplicarCostoSugerido">
                    Usar sugerido
                  </button>
                </div>
              </div>
            </div>

            <div class="inv-grid-2">
              <!-- Precio de Venta Oficial -->
              <div class="inv-field-group">
                <label class="inv-label">Precio de Venta Oficial (Bs) *</label>
                <input
                  v-model.number="formRecepcion.precio_venta"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="inv-input font-mono"
                  required
                />
              </div>

              <!-- Perecedero y Fecha de Vencimiento -->
              <div class="inv-field-group">
                <div class="inv-checkbox-row">
                  <input
                    id="chkPerecedero"
                    v-model="formRecepcion.es_perecedero"
                    type="checkbox"
                    class="inv-checkbox"
                  />
                  <label for="chkPerecedero" class="inv-label-chk">¿Es producto perecedero con vencimiento?</label>
                </div>
                <input
                  v-if="formRecepcion.es_perecedero"
                  v-model="formRecepcion.fecha_vencimiento"
                  type="date"
                  class="inv-input font-mono"
                  required
                />
                <span v-else class="inv-text-muted-sm">Se registrará fecha_vencimiento = NULL</span>
              </div>
            </div>

            <!-- Checkbox supervisor de ingreso directo -->
            <div
              v-if="rolActivo === ROLES.SUPERVISOR || rolActivo === ROLES.PROPIETARIO"
              class="inv-direct-approval-box"
            >
              <input
                id="chkDirecto"
                v-model="formRecepcion.ingresar_directo_aprobado"
                type="checkbox"
                class="inv-checkbox"
              />
              <label for="chkDirecto" class="inv-direct-label">
                <strong>Ingresar directamente a Stock Activo</strong> (Omitir Sala de Espera para este lote con privilegios de Supervisor)
              </label>
            </div>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalRecepcionVisible = false">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ (rolActivo !== ROLES.CAJERO && formRecepcion.ingresar_directo_aprobado) ? 'Guardar y Aprobar a Stock' : 'Enviar a Sala de Espera' }}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 2: VISOR SIMULADO DE CAMARA MOVIL (ANDROID) -->
    <!-- ============================================================= -->
    <div v-if="modalCamaraVisible" class="inv-modal-overlay">
      <div class="inv-camera-modal-container">
        <header class="inv-camera-header">
          <div class="inv-camera-title-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Visor de Escáner de Código de Barras Móvil</span>
          </div>
          <button type="button" class="inv-btn-close-camera" @click="modalCamaraVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="inv-camera-viewport">
          <!-- Guias de esquinas de visor -->
          <div class="inv-viewfinder-frame">
            <div class="inv-viewfinder-laser"></div>
            <div class="inv-viewfinder-corners"></div>
          </div>
          <p class="inv-camera-prompt">Apunte la cámara al código de barras o use los botones de prueba:</p>
        </div>

        <div class="inv-camera-sim-controls">
          <button
            type="button"
            class="inv-btn-sim-code"
            @click="simularEscaneo('7771234560012')"
          >
            <span>Simular lectura existente: Leche Pil</span>
            <span class="font-mono">7771234560012</span>
          </button>

          <button
            type="button"
            class="inv-btn-sim-code"
            @click="simularEscaneo('7779988776655')"
          >
            <span>Simular lectura nuevo producto</span>
            <span class="font-mono">7779988776655</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 3: ASIGNAR PRECIO DE OFERTA / DESCUENTO -->
    <!-- ============================================================= -->
    <div v-if="modalDescuentoVisible" class="inv-modal-overlay">
      <div class="inv-modal-container small">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Gestión de Oferta por Vencimiento</h2>
            <p class="inv-modal-subtitle">{{ itemDescuentoActivo?.nombre_producto }} (Lote #{{ itemDescuentoActivo?.lote_id }})</p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalDescuentoVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="guardarDescuento" class="inv-modal-body">
          <div class="inv-offer-preview-box">
            <div class="inv-offer-detail-row">
              <span class="text-secondary">Precio Oficial Actual:</span>
              <span class="font-mono">{{ formatMontoBs(itemDescuentoActivo?.precio_venta_producto) }}</span>
            </div>
            <div class="inv-offer-detail-row">
              <span class="text-secondary">Días para Vencer:</span>
              <span class="font-mono">{{ itemDescuentoActivo?.dias_vencimiento ?? 'N/A' }} días</span>
            </div>
          </div>

          <div class="inv-checkbox-row">
            <input
              id="chkActivarOferta"
              v-model="formDescuento.activar"
              type="checkbox"
              class="inv-checkbox"
            />
            <label for="chkActivarOferta" class="inv-label-chk">
              Activar precio especial de liquidación (en_descuento = true)
            </label>
          </div>

          <div v-if="formDescuento.activar" class="inv-field-group">
            <label class="inv-label">Precio Rebajado de Oferta (Bs) *</label>
            <input
              v-model.number="formDescuento.precio_descuento"
              type="number"
              min="0.10"
              step="0.10"
              class="inv-input font-mono"
              required
            />
            <span class="inv-text-muted-sm">
              Este precio sustituirá al precio de venta oficial en el POS para este lote específico.
            </span>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalDescuentoVisible = false">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-primary">
              Guardar Política
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <div v-if="modalRechazoVisible" class="inv-modal-overlay">
      <div class="inv-modal-container small">
        <header class="inv-modal-header danger">
          <div class="inv-modal-header-icon danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Rechazar Ingreso de Lote</h2>
            <p class="inv-modal-subtitle">Registro #{{ pendienteARechazar?.inventario_pendiente_id }} - {{ pendienteARechazar?.nombre_producto }}</p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalRechazoVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="confirmarRechazo" class="inv-modal-body">
          <div class="inv-field-group">
            <label class="inv-label">Motivo u Observación de Rechazo *</label>
            <textarea
              v-model="motivoRechazo"
              rows="3"
              class="inv-input"
              placeholder="Ej. Mercadería dañada en empaque, costo no coincide con orden de compra..."
              required
            ></textarea>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalRechazoVisible = false">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-danger">
              Confirmar Rechazo
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 4B: MANDAR A CORREGIR LOTE EN SALA DE ESPERA -->
    <!-- ============================================================= -->
    <div v-if="modalObservarVisible" class="inv-modal-overlay">
      <div class="inv-modal-container small">
        <header class="inv-modal-header warning">
          <div class="inv-modal-header-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Mandar a Corregir al Cajero</h2>
            <p class="inv-modal-subtitle">Registro #{{ pendienteAObservar?.inventario_pendiente_id }} - {{ pendienteAObservar?.nombre_producto }}</p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalObservarVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="confirmarObservacion" class="inv-modal-body">
          <div class="inv-field-group">
            <label class="inv-label">Instrucción u Observación para el Cajero *</label>
            <textarea
              v-model="motivoObservacion"
              rows="3"
              class="inv-input"
              placeholder="Ej. El precio de compra no coincide con la factura adjunta, verificar costo unitario y fecha de vencimiento..."
              required
            ></textarea>
            <span class="inv-text-muted-sm">
              El registro cambiará a estado "Observado" (4) y se notificará al cajero para que subsane los datos.
            </span>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalObservarVisible = false">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-warning" :disabled="enviandoObservacion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{{ enviandoObservacion ? 'Enviando...' : 'Mandar a Corregir' }}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 5: EDITAR Y RECTIFICAR PENDIENTE (SUPERVISOR / CAJERO) -->
    <!-- ============================================================= -->
    <div v-if="modalEditarPendienteVisible" class="inv-modal-overlay" @click.self="modalEditarPendienteVisible = false">
      <div class="inv-modal-container inv-modal-edit-container">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon inv-icon-edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">{{ rolActivo === ROLES.CAJERO ? 'Subsanar Registro de Recepción' : 'Rectificar Datos de Recepción' }}</h2>
            <p class="inv-modal-subtitle">
              {{ rolActivo === ROLES.CAJERO ? 'Corrige las observaciones del Supervisor y reenvía a revisión' : `Registro #PEND-${pendienteEnEdicion?.inventario_pendiente_id} • Corrección de costos, cantidades o código` }}
            </p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalEditarPendienteVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="guardarYaprobarPendiente" class="inv-modal-body">
          <!-- NOTA DE OBSERVACION DEL SUPERVISOR SI EL LOTE ESTA OBSERVADO -->
          <div
            v-if="pendienteEnEdicion?.observacion_revision || pendienteEnEdicion?.observacionRevision"
            class="inv-alert-box-warning"
          >
            <div class="inv-alert-box-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <strong>Instrucción de Corrección del Supervisor:</strong>
              <p class="inv-alert-box-text">
                {{ pendienteEnEdicion.observacion_revision || pendienteEnEdicion.observacionRevision }}
              </p>
            </div>
          </div>

          <div class="inv-grid-2">
            <div class="inv-field-group">
              <div class="inv-label-between">
                <label class="inv-label">Nombre del Producto</label>
                <button
                  type="button"
                  class="inv-mode-toggle-btn"
                  @click="modoProductoNuevoEdicion = !modoProductoNuevoEdicion"
                >
                  <span v-if="!modoProductoNuevoEdicion">✍️ Escribir manual</span>
                  <span v-else>📋 Escoger de BD</span>
                </button>
              </div>

              <!-- Selector de productos existentes de la base de datos -->
              <CustomSelect
                v-if="!modoProductoNuevoEdicion"
                v-model="productoSeleccionadoEdicionId"
                :options="opcionesProductosCatalogo"
                placeholder="Seleccionar producto existente..."
                :show-action="true"
                action-label="✍️ Escribir nombre manual..."
                @action="modoProductoNuevoEdicion = true"
                @update:model-value="onSeleccionarProductoCatalogoEdicion"
              />

              <input
                v-else
                v-model="formEditarPendiente.nombre_producto"
                type="text"
                class="inv-input"
                placeholder="Nombre del producto..."
                required
              />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Código de Barras (opcional / escáner)</label>
              <input v-model="formEditarPendiente.codigo_barras" type="text" class="inv-input font-mono" placeholder="Ej: 7771234560012" />
            </div>
          </div>

          <div class="inv-grid-2">
            <div class="inv-field-group">
              <label class="inv-label">Categoría</label>
              <div class="inv-input-action-row">
                <CustomSelect
                  v-model="formEditarPendiente.categoria_id"
                  :options="opcionesCategorias"
                  placeholder="Seleccione categoría..."
                  icon-type="categoria"
                  :show-action="puedeCrearCategoria"
                  action-label="+ Registrar nueva categoría"
                  @action="abrirModalCrearCategoria"
                />
                <button
                  v-if="puedeCrearCategoria"
                  type="button"
                  class="inv-btn-addon"
                  @click="abrirModalCrearCategoria"
                  title="Registrar nueva categoría (Solo Supervisor / Propietario)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Proveedor</label>
              <div class="inv-input-action-row">
                <CustomSelect
                  v-model="formEditarPendiente.proveedor_id"
                  :options="opcionesProveedores"
                  placeholder="Seleccione distribuidor..."
                  icon-type="proveedor"
                  :show-action="puedeCrearProveedor"
                  action-label="+ Registrar nuevo distribuidor"
                  @action="abrirModalCrearProveedor"
                />
                <button
                  v-if="puedeCrearProveedor"
                  type="button"
                  class="inv-btn-addon"
                  @click="abrirModalCrearProveedor"
                  title="Registrar nuevo distribuidor (Solo Supervisor / Propietario)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="inv-grid-3">
            <div class="inv-field-group">
              <label class="inv-label">Cantidad Recibida</label>
              <input
                v-model.number="formEditarPendiente.stock_ingresado"
                type="number"
                min="1"
                class="inv-input font-mono"
                required
                @input="onEditarCalculoPrecioLote"
              />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Costo Unitario (Bs)</label>
              <input
                v-model.number="formEditarPendiente.precio_compra"
                type="number"
                step="0.01"
                min="0"
                class="inv-input font-mono"
                required
                @input="onEditarCalculoPrecioLote"
              />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Precio Venta (Bs)</label>
              <input
                v-model.number="formEditarPendiente.precio_venta"
                type="number"
                step="0.01"
                min="0.01"
                class="inv-input font-mono"
                required
              />
            </div>
          </div>

          <div class="inv-grid-2">
            <div class="inv-field-group">
              <label class="inv-label">Costo Total del Lote (Bs)</label>
              <input
                v-model.number="formEditarPendiente.precio_lote"
                type="number"
                step="0.01"
                class="inv-input font-mono bg-slate-50"
                required
              />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Fecha de Vencimiento (opcional)</label>
              <input v-model="formEditarPendiente.fecha_vencimiento" type="date" class="inv-input font-mono" />
            </div>
          </div>

          <div class="inv-field-group">
            <label class="inv-label">{{ rolActivo === ROLES.CAJERO ? 'Nota de Subsanación para el Supervisor (opcional)' : 'Motivo o Nota de Rectificación (opcional)' }}</label>
            <input
              v-model="formEditarPendiente.observacion_rectificacion"
              type="text"
              class="inv-input"
              :placeholder="rolActivo === ROLES.CAJERO ? 'Ej: Corregido costo según factura adjunta #4521' : 'Ej: Se corrigió precio de venta y fecha de caducidad según empaque físico'"
            />
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="modalEditarPendienteVisible = false">
              Cancelar
            </button>

            <!-- Opcion 1: Guardar rectificación / Subsanar (disponible para Supervisor y Cajero) -->
            <button
              type="button"
              class="inv-btn-rectify"
              :disabled="guardandoRectificacion"
              @click="guardarRectificacionPendiente"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{{ guardandoRectificacion ? 'Guardando...' : (rolActivo === ROLES.CAJERO ? 'Subsanar y Re-enviar' : 'Guardar Rectificación') }}</span>
            </button>

            <!-- Opcion 2: Guardar y Aprobar directamente (solo Supervisor/Propietario) -->
            <button
              v-if="rolActivo === ROLES.SUPERVISOR || rolActivo === ROLES.PROPIETARIO"
              type="submit"
              class="inv-btn-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Guardar y Aprobar Lote</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 6: DETALLES, AUDITORIA Y TRAZABILIDAD (SALA DE ESPERA) -->
    <!-- ============================================================= -->
    <div v-if="modalDetallesVisible && pendienteEnDetalle" class="inv-modal-overlay" @click.self="modalDetallesVisible = false">
      <div class="inv-modal-container inv-modal-details-container">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon inv-icon-details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Detalles de Auditoría y Trazabilidad</h2>
            <p class="inv-modal-subtitle">
              Registro #PEND-{{ pendienteEnDetalle.inventario_pendiente_id }} &bull; {{ pendienteEnDetalle.nombre_producto }}
            </p>
          </div>
          <button type="button" class="inv-btn-close" @click="modalDetallesVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="inv-modal-body inv-details-body">
          <!-- BANNER DE ESTADO -->
          <div class="inv-detail-status-banner">
            <div class="inv-detail-status-left">
              <span class="inv-detail-status-caption">Estado actual de la mercadería:</span>
              <ConceptoBadge tipo="sala_espera" :valor="pendienteEnDetalle.estado" size="lg" />
            </div>
            <div class="inv-detail-status-right">
              <span class="inv-detail-chip">
                {{ pendienteEnDetalle.producto_id ? 'Reabastecimiento de Catálogo' : 'Nuevo Producto para Catálogo' }}
              </span>
            </div>
          </div>

          <!-- LINEA DE TIEMPO / TRAZABILIDAD DE PERSONAL -->
          <div class="inv-detail-section">
            <h3 class="inv-detail-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Personal Involucrado y Trazabilidad</span>
            </h3>

            <div class="inv-timeline">
              <!-- PASO 1: REGISTRO (CAJERO) -->
              <div class="inv-timeline-item">
                <div class="inv-timeline-marker reg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div class="inv-timeline-content">
                  <div class="inv-timeline-header">
                    <span class="inv-timeline-action">Registrado en Recepción por</span>
                    <span class="inv-timeline-time font-mono">{{ formatearFechaHora(pendienteEnDetalle.fecha_creacion) }}</span>
                  </div>
                  <div class="inv-timeline-person">
                    <strong>{{ pendienteEnDetalle.nombre_usuario_creacion || resolverNombreUsuario(pendienteEnDetalle.usuario_creacion) }}</strong>
                    <span class="inv-timeline-role-tag cajero">{{ resolverInfoUsuario(pendienteEnDetalle.usuario_creacion).rolNombre }}</span>
                  </div>
                  <p class="inv-timeline-desc">
                    Recepción física en sucursal e ingreso a la cola de Sala de Espera para validación de costos.
                  </p>
                </div>
              </div>

              <!-- PASO 2: AUDITORIA / RESOLUCION (SUPERVISOR) -->
              <div class="inv-timeline-item">
                <div
                  class="inv-timeline-marker"
                  :class="{
                    approved: pendienteEnDetalle.estado === 2,
                    rejected: pendienteEnDetalle.estado === 3,
                    observed: pendienteEnDetalle.estado === 4,
                    wait: pendienteEnDetalle.estado === 1
                  }"
                >
                  <svg v-if="pendienteEnDetalle.estado === 2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <svg v-else-if="pendienteEnDetalle.estado === 3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <svg v-else-if="pendienteEnDetalle.estado === 4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inv-icon-xs">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div class="inv-timeline-content">
                  <div class="inv-timeline-header">
                    <span class="inv-timeline-action">
                      {{ pendienteEnDetalle.estado === 2 ? 'Aprobado y Asentado por' : (pendienteEnDetalle.estado === 3 ? 'Rechazado y Anulado por' : (pendienteEnDetalle.estado === 4 ? 'Devuelto para Corrección por' : 'Auditoría Pendiente')) }}
                    </span>
                    <span v-if="pendienteEnDetalle.fecha_revision" class="inv-timeline-time font-mono">
                      {{ formatearFechaHora(pendienteEnDetalle.fecha_revision) }}
                    </span>
                  </div>
                  <div v-if="pendienteEnDetalle.estado !== 1" class="inv-timeline-person">
                    <strong>{{ pendienteEnDetalle.nombre_usuario_revision || resolverNombreUsuario(pendienteEnDetalle.usuario_revision) }}</strong>
                    <span class="inv-timeline-role-tag supervisor">{{ resolverInfoUsuario(pendienteEnDetalle.usuario_revision).rolNombre }}</span>
                  </div>
                  <p v-if="pendienteEnDetalle.estado === 2" class="inv-timeline-desc text-emerald-700">
                    Lote validado e ingresado a las existencias vendibles de stock activo.
                  </p>
                  <p v-else-if="pendienteEnDetalle.estado === 3" class="inv-timeline-desc text-rose-700">
                    Registro rechazado. La mercadería no ingresó a inventario y fue devuelta al proveedor o descartada.
                  </p>
                  <p v-else-if="pendienteEnDetalle.estado === 4" class="inv-timeline-desc text-orange-700">
                    Registro observado. El supervisor devolvió el ingreso al cajero para que subsane datos de costos o catálogo.
                  </p>
                  <p v-else class="inv-timeline-desc text-amber-700">
                    Esperando verificación de cantidad física, costo de factura y caducidad por el Supervisor de turno.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- OBSERVACIONES Y MOTIVO -->
          <div class="inv-detail-section">
            <h3 class="inv-detail-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Observaciones y Justificación</span>
            </h3>
            <div
              class="inv-detail-obs-card"
              :class="{
                'obs-approved': pendienteEnDetalle.estado === 2,
                'obs-rejected': pendienteEnDetalle.estado === 3,
                'obs-observed': pendienteEnDetalle.estado === 4,
                'obs-pending': pendienteEnDetalle.estado === 1
              }"
            >
              <div class="inv-obs-header">
                <strong>
                  {{ pendienteEnDetalle.estado === 3 ? 'Motivo del Rechazo:' : (pendienteEnDetalle.estado === 2 ? 'Nota de Auditoría:' : (pendienteEnDetalle.estado === 4 ? 'Instrucción de Corrección:' : 'Observaciones de Ingreso:')) }}
                </strong>
              </div>
              <p class="inv-obs-text">
                {{ pendienteEnDetalle.observacion_revision || (pendienteEnDetalle.estado === 2 ? 'Aprobado sin observaciones adicionales. La mercadería cumple satisfactoriamente con los estándares de calidad y control de precios.' : (pendienteEnDetalle.estado === 3 ? 'Rechazado por el supervisor.' : (pendienteEnDetalle.estado === 4 ? 'Devuelto para corrección por el supervisor.' : 'Sin observaciones registradas durante la recepción.'))) }}
              </p>
            </div>
          </div>

          <!-- FICHA TECNICA Y ECONOMICA -->
          <div class="inv-detail-section">
            <h3 class="inv-detail-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span>Ficha Técnica y Valores Económicos</span>
            </h3>

            <div class="inv-detail-grid">
              <!-- TARJETA 1: DATOS CATALOGO -->
              <div class="inv-detail-card">
                <span class="inv-detail-card-label">Identificación</span>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Cód. Interno:</span>
                  <span class="font-mono font-bold">{{ pendienteEnDetalle.codigo_interno }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Cód. Barras:</span>
                  <span class="font-mono">{{ pendienteEnDetalle.codigo_barras || 'Sin código' }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Categoría:</span>
                  <span>{{ CATEGORIAS[pendienteEnDetalle.categoria_id] ?? 'General' }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Proveedor:</span>
                  <span>{{ proveedores.find(pr => pr.proveedor_id === pendienteEnDetalle?.proveedor_id)?.nombre_empresa ?? 'Sin Proveedor' }}</span>
                </div>
              </div>

              <!-- TARJETA 2: COSTOS Y PRECIOS -->
              <div class="inv-detail-card">
                <span class="inv-detail-card-label">Precios y Existencia</span>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Cantidad Ingresada:</span>
                  <span class="font-bold text-slate-800">{{ pendienteEnDetalle.stock_ingresado }} unidades</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Costo Unitario:</span>
                  <span class="font-mono font-bold">{{ formatMontoBs(pendienteEnDetalle.precio_compra) }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Costo Total Lote:</span>
                  <span class="font-mono font-bold text-slate-900">{{ formatMontoBs(pendienteEnDetalle.precio_lote) }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Precio de Venta:</span>
                  <span class="font-mono font-bold text-emerald-700">{{ formatMontoBs(pendienteEnDetalle.precio_venta) }}</span>
                </div>
              </div>

              <!-- TARJETA 3: CADUCIDAD -->
              <div class="inv-detail-card">
                <span class="inv-detail-card-label">Lote y Caducidad</span>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Descripción Lote:</span>
                  <span>{{ pendienteEnDetalle.descripcion_lote || 'Lote General' }}</span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Fecha Vencimiento:</span>
                  <span class="font-mono font-bold">{{ pendienteEnDetalle.fecha_vencimiento || 'No perecedero' }}</span>
                </div>
                <div v-if="pendienteEnDetalle.fecha_vencimiento" class="inv-detail-card-row">
                  <span class="text-muted">Días para Vencer:</span>
                  <span
                    class="inv-venc-tag"
                    :class="{
                      'venc-ok': (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 99) > 14,
                      'venc-warn': (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 99) <= 14 && (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 99) >= 0,
                      'venc-danger': (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 99) < 0
                    }"
                  >
                    {{ (getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento) ?? 0) < 0 ? 'Vencido' : `${getDiasParaVencer(pendienteEnDetalle.fecha_vencimiento)} días` }}
                  </span>
                </div>
              </div>

              <!-- TARJETA 4: RENTABILIDAD (Solo Supervisor o Propietario) -->
              <div v-if="puedeVerMargen" class="inv-detail-card">
                <span class="inv-detail-card-label">Análisis de Margen</span>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Margen Unitario:</span>
                  <span class="font-mono font-bold text-emerald-600">
                    {{ formatMontoBs(pendienteEnDetalle.precio_venta - pendienteEnDetalle.precio_compra) }}
                  </span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">% Rentabilidad:</span>
                  <span class="font-mono font-bold text-emerald-700">
                    {{ pendienteEnDetalle.precio_compra > 0 ? (((pendienteEnDetalle.precio_venta - pendienteEnDetalle.precio_compra) / pendienteEnDetalle.precio_compra) * 100).toFixed(1) + '%' : '100%' }}
                  </span>
                </div>
                <div class="inv-detail-card-row">
                  <span class="text-muted">Utilidad Estimada Lote:</span>
                  <span class="font-mono font-bold text-emerald-800">
                    {{ formatMontoBs((pendienteEnDetalle.precio_venta - pendienteEnDetalle.precio_compra) * pendienteEnDetalle.stock_ingresado) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="inv-modal-footer">
          <!-- SI ES OBSERVADO Y EL ROL ES CAJERO: ACCION PARA SUBSANAR -->
          <template v-if="pendienteEnDetalle.estado === 4 && rolActivo === ROLES.CAJERO">
            <button
              type="button"
              class="inv-btn-correct-sm"
              @click="modalDetallesVisible = false; abrirModalEditarPendiente(pendienteEnDetalle)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Subsanar / Corregir Observaciones</span>
            </button>
          </template>

          <!-- SI ES PENDIENTE Y EL ROL TIENE PERMISO: ACCIONES RAPIDAS -->
          <template v-if="pendienteEnDetalle.estado === 1 && (rolActivo === ROLES.SUPERVISOR || rolActivo === ROLES.PROPIETARIO)">
            <button
              type="button"
              class="inv-btn-rectify"
              @click="abrirEdicionDesdeDetalles"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Editar / Rectificar</span>
            </button>

            <button
              type="button"
              class="inv-btn-warning"
              @click="modalDetallesVisible = false; abrirModalObservar(pendienteEnDetalle)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Mandar a Corregir</span>
            </button>

            <button
              type="button"
              class="inv-btn-danger"
              @click="modalDetallesVisible = false; abrirModalRechazo(pendienteEnDetalle)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Rechazar</span>
            </button>

            <button
              type="button"
              class="inv-btn-primary"
              @click="modalDetallesVisible = false; aprobarIngreso(pendienteEnDetalle)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Aprobar Ingreso</span>
            </button>
          </template>
        </footer>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 6: AGREGAR NUEVA CATEGORÍA (TABLA CONCEPTOS - GRUPO 2)   -->
    <!-- ============================================================= -->
    <div v-if="modalCategoriaVisible" class="inv-modal-overlay" @click.self="cerrarModalCrearCategoria">
      <div class="inv-modal-container small">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Nueva Categoría de Producto</h2>
            <p class="inv-modal-subtitle">Se guardará en la tabla conceptos (Grupo 2) con código secuencial libre</p>
          </div>
          <button type="button" class="inv-btn-close" @click="cerrarModalCrearCategoria">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="guardarNuevaCategoria" class="inv-modal-body">
          <div class="inv-field-group">
            <label class="inv-label">Nombre de la Categoría *</label>
            <input
              v-model="nombreNuevaCategoria"
              type="text"
              class="inv-input"
              placeholder="Ej. Limpieza, Abarrotes, Ferretería, Higiene..."
              maxlength="80"
              required
              autofocus
            />
            <span class="inv-label-hint">Máximo 80 caracteres. La base de datos calculará el siguiente código disponible.</span>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="cerrarModalCrearCategoria" :disabled="guardandoCategoria">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-primary" :disabled="guardandoCategoria">
              <svg v-if="guardandoCategoria" class="inv-spinner inv-icon-xs" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              </svg>
              <span>{{ guardandoCategoria ? 'Guardando...' : 'Crear Categoría' }}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 7: REGISTRO RÁPIDO DE DISTRIBUIDOR (RBAC SUPERVISOR/PROPIETARIO) -->
    <!-- ============================================================= -->
    <div v-if="modalProveedorRapidoVisible" class="inv-modal-overlay" @click.self="cerrarModalCrearProveedor">
      <div class="inv-modal-container">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Registrar Nuevo Distribuidor</h2>
            <p class="inv-modal-subtitle">Se guardará en la tabla proveedores mediante la función PostgreSQL spProveedorRegistrar</p>
          </div>
          <button type="button" class="inv-btn-close" @click="cerrarModalCrearProveedor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="guardarProveedorRapido" class="inv-modal-body">
          <div class="inv-field-group">
            <label class="inv-label">Razón Social / Nombre Comercial *</label>
            <input
              v-model="formProveedorRapido.nombreEmpresa"
              type="text"
              class="inv-input"
              placeholder="Ej. Distribuidora Arcor Bolivia S.R.L."
              maxlength="50"
              required
            />
          </div>

          <div class="inv-grid-2">
            <div class="inv-field-group">
              <label class="inv-label">Contacto Logístico / Preventista *</label>
              <input
                v-model="formProveedorRapido.nombreContacto"
                type="text"
                class="inv-input"
                placeholder="Ej. Juan Carlos Ramos"
                maxlength="50"
                required
              />
            </div>

            <div class="inv-field-group">
              <label class="inv-label">Teléfono / Celular *</label>
              <input
                v-model="formProveedorRapido.numeroContacto"
                type="text"
                class="inv-input"
                placeholder="Ej. 70123456"
                maxlength="15"
                required
              />
            </div>
          </div>

          <div class="inv-field-group">
            <label class="inv-label">Acuerdos Contractuales / Anotaciones</label>
            <textarea
              v-model="formProveedorRapido.anotaciones"
              class="inv-input inv-textarea"
              placeholder="Ej. Entregas martes y viernes. Crédito a 15 días..."
              maxlength="200"
              rows="2"
            ></textarea>
          </div>

          <div class="inv-quick-action-link-box">
            <button type="button" class="inv-link-subtle" @click="redirigirAProveedores">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Ir a la administración y catálogo completo de Distribuidores (/proveedores)</span>
            </button>
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="cerrarModalCrearProveedor" :disabled="guardandoProveedorRapido">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-primary" :disabled="guardandoProveedorRapido">
              <svg v-if="guardandoProveedorRapido" class="inv-spinner inv-icon-xs" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              </svg>
              <span>{{ guardandoProveedorRapido ? 'Registrando...' : 'Registrar y Seleccionar' }}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 8: GESTIÓN ADMINISTRATIVA DE CATEGORÍAS (GRUPO 2 BD)    -->
    <!-- ============================================================= -->
    <div v-if="modalGestionCategoriasVisible" class="inv-modal-overlay" @click.self="cerrarModalGestionCategorias">
      <div class="inv-modal-container" style="max-width: 680px;">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Gestión de Categorías Maestras</h2>
            <p class="inv-modal-subtitle">Administración de categorías del catálogo en tabla conceptos (Grupo 2)</p>
          </div>
          <button type="button" class="inv-btn-close" @click="cerrarModalGestionCategorias">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="inv-modal-body">
          <!-- Formulario rápido de creación dentro del modal -->
          <div class="inv-field-group" style="margin-bottom: 1.25rem;">
            <label class="inv-label">Nueva Categoría</label>
            <div class="inv-input-action-row">
              <input
                v-model="nombreNuevaCategoria"
                type="text"
                class="inv-input"
                placeholder="Nombre de la nueva categoría (Ej. Cuidado Personal, Golosinas...)"
                @keyup.enter="guardarNuevaCategoria"
              />
              <button
                type="button"
                class="inv-btn-primary"
                @click="guardarNuevaCategoria"
                :disabled="guardandoCategoria"
              >
                <span>Agregar</span>
              </button>
            </div>
          </div>

          <!-- Tabla de categorías -->
          <div class="inv-field-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <label class="inv-label" style="margin: 0;">Categorías Registradas en Base de Datos</label>
              <span class="inv-text-muted-xs font-mono">{{ listaTodasCategorias.length }} categorías en BD</span>
            </div>

            <div class="inv-table-responsive" style="max-height: 320px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
              <table class="inv-table" style="font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th style="width: 60px;">Cód.</th>
                    <th>Nombre de Categoría</th>
                    <th class="text-center" style="width: 110px;">Estado</th>
                    <th class="text-right" style="width: 120px;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="cargandoGestionCategorias">
                    <td colspan="4" class="text-center" style="padding: 1.5rem; color: #64748b;">
                      Cargando categorías...
                    </td>
                  </tr>
                  <tr v-else-if="listaTodasCategorias.length === 0">
                    <td colspan="4" class="text-center" style="padding: 1.5rem; color: #64748b;">
                      No hay categorías registradas en la tabla conceptos (Grupo 2).
                    </td>
                  </tr>
                  <tr v-for="cat in listaTodasCategorias" :key="cat.codigo">
                    <!-- Código -->
                    <td class="font-mono text-center">#{{ cat.codigo }}</td>

                    <!-- Nombre (Modo lectura o edición) -->
                    <td>
                      <template v-if="categoriaEnEdicion && categoriaEnEdicion.codigo === cat.codigo">
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                          <input
                            v-model="categoriaEnEdicion.nombre"
                            type="text"
                            class="inv-input"
                            style="padding: 0.25rem 0.5rem; font-size: 0.85rem;"
                            @keyup.enter="guardarEdicionCategoria"
                            @keyup.escape="cancelarEdicionCategoria"
                            autofocus
                          />
                          <button
                            type="button"
                            class="inv-btn-primary"
                            style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
                            @click="guardarEdicionCategoria"
                            :disabled="guardandoEdicionCategoria"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            class="inv-btn-secondary"
                            style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
                            @click="cancelarEdicionCategoria"
                          >
                            X
                          </button>
                        </div>
                      </template>
                      <template v-else>
                        <span :style="{ textDecoration: (cat.marcaBaja ?? cat.marca_baja) ? 'line-through' : 'none', color: (cat.marcaBaja ?? cat.marca_baja) ? '#94a3b8' : '#0f172a', fontWeight: '500' }">
                          {{ cat.nombreCategoria || cat.descripcion || cat.nombre_categoria }}
                        </span>
                      </template>
                    </td>

                    <!-- Estado -->
                    <td class="text-center">
                      <span v-if="!(cat.marcaBaja ?? cat.marca_baja)" class="inv-badge-status approved">
                        Activa
                      </span>
                      <span v-else class="inv-badge-status rejected">
                        Baja Lógica
                      </span>
                    </td>

                    <!-- Acciones -->
                    <td class="text-right">
                      <div style="display: flex; justify-content: flex-end; gap: 0.35rem;">
                        <!-- Editar nombre -->
                        <button
                          type="button"
                          class="inv-btn-action"
                          title="Editar nombre"
                          @click="iniciarEdicionCategoria(cat)"
                          :disabled="cat.marcaBaja ?? cat.marca_baja"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>

                        <!-- Alternar baja lógica / reactivar -->
                        <button
                          type="button"
                          class="inv-btn-action"
                          :class="{ danger: !(cat.marcaBaja ?? cat.marca_baja) }"
                          :title="(cat.marcaBaja ?? cat.marca_baja) ? 'Reactivar categoría' : 'Dar de baja lógica'"
                          @click="alternarEstadoCategoria(cat)"
                        >
                          <svg v-if="!(cat.marcaBaja ?? cat.marca_baja)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs" style="color: #16a34a;">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer class="inv-modal-footer">
          <button type="button" class="inv-btn-secondary" @click="cerrarModalGestionCategorias">
            Cerrar
          </button>
        </footer>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL 9: DESCONTAR UNIDADES / MERMA (INDIVIDUAL DE STOCK)      -->
    <!-- ============================================================= -->
    <div v-if="modalDescontarVisible && itemDescontarActivo" class="inv-modal-overlay" @click.self="cerrarModalDescontar">
      <div class="inv-modal-container small">
        <header class="inv-modal-header">
          <div class="inv-modal-header-icon" style="background-color: #fef2f2; color: #dc2626; border-color: #fecaca;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">Descontar Unidades / Merma</h2>
            <p class="inv-modal-subtitle">Ajuste de inventario físico sin dar de baja el producto del catálogo</p>
          </div>
          <button type="button" class="inv-btn-close" @click="cerrarModalDescontar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="ejecutarDescuentoUnidades" class="inv-modal-body">
          <!-- Ficha de resumen del lote -->
          <div class="inv-summary-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <strong style="color: #0f172a; font-size: 0.95rem;">{{ itemDescontarActivo.nombre_producto }}</strong>
                <div class="font-mono text-muted-xs" style="margin-top: 0.2rem; color: #64748b; font-size: 0.775rem;">
                  Lote #{{ itemDescontarActivo.lote_id }} • Cód: {{ itemDescontarActivo.codigo_interno }} • Barras: {{ itemDescontarActivo.codigo_barras }}
                </div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Stock Actual:</span>
                <div class="font-mono" style="font-size: 1.15rem; font-weight: 700; color: #0284c7;">
                  {{ itemDescontarActivo.stock }} u.
                </div>
              </div>
            </div>
          </div>

          <!-- Input cantidad -->
          <div class="inv-field-group">
            <label class="inv-label">Cantidad de Unidades a Retirar *</label>
            <input
              v-model.number="formDescontar.cantidad"
              type="number"
              class="inv-input font-mono"
              min="1"
              :max="itemDescontarActivo.stock"
              required
              autofocus
            />
            <span class="inv-label-hint">
              Disponible en este lote: {{ itemDescontarActivo.stock }} u. Stock restante quedará en: 
              <strong class="font-mono">{{ Math.max(0, itemDescontarActivo.stock - (formDescontar.cantidad || 0)) }} u.</strong>
            </span>
          </div>

          <!-- Motivo de la merma / descuento -->
          <div class="inv-field-group">
            <label class="inv-label">Motivo del Ajuste *</label>
            <select v-model="formDescontar.motivo" class="inv-input" required>
              <option value="Merma / Rotura">Merma / Rotura o Daño Físico</option>
              <option value="Vencimiento / Caducidad">Vencimiento / Caducidad del Producto</option>
              <option value="Pérdida / Faltante">Pérdida / Faltante en Conteo</option>
              <option value="Consumo Interno">Consumo Interno / Muestra</option>
              <option value="Otro">Otro (Especificar)</option>
            </select>
          </div>

          <div v-if="formDescontar.motivo === 'Otro'" class="inv-field-group">
            <label class="inv-label">Especificar Motivo</label>
            <input
              v-model="formDescontar.otroMotivo"
              type="text"
              class="inv-input"
              placeholder="Detalle de la razón del descuento..."
              maxlength="100"
            />
          </div>

          <footer class="inv-modal-footer">
            <button type="button" class="inv-btn-secondary" @click="cerrarModalDescontar" :disabled="guardandoDescuentoUnidades">
              Cancelar
            </button>
            <button type="submit" class="inv-btn-primary" style="background-color: #dc2626;" :disabled="guardandoDescuentoUnidades">
              <svg v-if="guardandoDescuentoUnidades" class="inv-spinner inv-icon-xs" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              </svg>
              <span>{{ guardandoDescuentoUnidades ? 'Procesando...' : 'Confirmar Descuento de Stock' }}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL DE CONFIRMACIÓN (REACTIVACIÓN Y BAJA LÓGICA)            -->
    <!-- ============================================================= -->
    <div v-if="modalConfirmacion.visible" class="inv-modal-overlay" @click.self="cerrarModalConfirmacion">
      <div class="inv-modal-container small">
        <header class="inv-modal-header" :class="modalConfirmacion.tipo">
          <div class="inv-modal-header-icon" :class="modalConfirmacion.tipo">
            <svg v-if="modalConfirmacion.tipo === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <svg v-else-if="modalConfirmacion.tipo === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h2 class="inv-modal-title">{{ modalConfirmacion.titulo }}</h2>
            <p class="inv-modal-subtitle">{{ modalConfirmacion.subtitulo }}</p>
          </div>
          <button type="button" class="inv-btn-close" @click="cerrarModalConfirmacion" :disabled="modalConfirmacion.procesando">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="inv-modal-body">
          <div class="inv-confirm-box">
            <p class="inv-confirm-message">
              {{ modalConfirmacion.mensaje }}
            </p>

            <div v-if="modalConfirmacion.alerta" class="inv-confirm-alert" :class="modalConfirmacion.tipo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs" style="flex-shrink: 0; margin-top: 2px;">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ modalConfirmacion.alerta }}</span>
            </div>

            <footer class="inv-modal-footer">
              <button
                type="button"
                class="inv-btn-secondary"
                @click="cerrarModalConfirmacion"
                :disabled="modalConfirmacion.procesando"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="inv-btn-primary"
                :class="modalConfirmacion.tipo"
                @click="ejecutarAccionConfirmacion"
                :disabled="modalConfirmacion.procesando"
              >
                <svg v-if="modalConfirmacion.procesando" class="inv-spinner inv-icon-xs" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                </svg>
                <span>{{ modalConfirmacion.procesando ? 'Procesando...' : modalConfirmacion.textoBoton }}</span>
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>

    <!-- TOAST NOTIFICATIONS CONTAINER -->
    <div class="inv-toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="inv-toast"
        :class="`toast-${toast.tipo}`"
      >
        <div class="inv-toast-icon">
          <svg v-if="toast.tipo === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg v-else-if="toast.tipo === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <svg v-else-if="toast.tipo === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-sm">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div class="inv-toast-content">
          <strong class="inv-toast-title">{{ toast.titulo }}</strong>
          <p class="inv-toast-msg">{{ toast.mensaje }}</p>
        </div>
        <button type="button" class="inv-toast-close" @click="removerToast(toast.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inv-icon-xs">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped src="./InventarioView.css"></style>
