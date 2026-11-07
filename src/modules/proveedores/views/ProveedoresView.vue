<script setup lang="ts">
import { onMounted } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  usuarioActivoId,
  rolActivo,
  sucursalActivaId,
  cargarUsuarios,
  cargando,
  kpis,
  listaProveedores,
  filtroBusqueda,
  filtroProducto,
  filtroEstado,
  listaSucursales,
  sucursalSeleccionadaId,
  sucursalActivaNombre,
  puedeGestionarProveedores,
  toasts,
  toastSeq,
  agregarToast,
  removerToast,
  extraerError,
  cargarKpis,
  cargarProveedores,
  cambiarSucursal,
  aplicarFiltros,
  limpiarFiltros,
  modalAbmVisible,
  modoEdicion,
  guardando,
  proveedorIdEdicion,
  formProveedor,
  abrirModalCrear,
  abrirModalEditar,
  cerrarModalAbm,
  guardarProveedor,
  modalBajaVisible,
  proveedorParaBaja,
  eliminando,
  confirmarBaja,
  cerrarModalBaja,
  ejecutarBaja,
  modalReactivarVisible,
  proveedorParaReactivar,
  reactivando,
  abrirModalReactivar,
  cerrarModalReactivar,
  ejecutarReactivacion,
  modalFichaVisible,
  proveedorSeleccionado,
  pestanaActivaFicha,
  cargandoDetalles,
  catalogoProductos,
  historialLotes,
  filtroLotesEstado,
  abrirFichaLogistica,
  recargarDetallesFicha,
  cambiarFiltroLotes,
  formatMontoBs,
  formatFecha,
  getBadgeCaducidad,
  inicializarProveedores,
} from './ProveedoresView'

onMounted(async () => {
  await inicializarProveedores()
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

      <div class="prov-topbar-right" style="display: flex; align-items: center; gap: 0.75rem;">
        <!-- CONTROL MULTI-SUCURSAL (RBAC) -->
        <div v-if="rolActivo === 3" class="prov-branch-selector-card">
          <span class="prov-branch-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-xs" style="width: 14px; height: 14px;">
              <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
            </svg>
            Sucursal:
          </span>
          <select
            v-model="sucursalSeleccionadaId"
            class="prov-branch-select"
            @change="cambiarSucursal"
          >
            <option :value="null">Todas las sucursales</option>
            <option v-for="s in listaSucursales" :key="s.sucursalId || s.sucursal_id" :value="s.sucursalId || s.sucursal_id">
              {{ s.codigoInterno || s.codigo_interno || s.codigo }} - {{ s.ciudad || s.nombre }}
            </option>
          </select>
        </div>
        <div v-else class="prov-branch-badge-card" title="Sucursal fijada según perfil de usuario">
          <span class="prov-branch-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-xs" style="width: 14px; height: 14px;">
              <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
            </svg>
            Sucursal:
          </span>
          <span class="prov-branch-fixed-badge">
            {{ sucursalActivaNombre }}
          </span>
        </div>

        <button v-if="puedeGestionarProveedores" type="button" class="prov-btn-primary" @click="abrirModalCrear">
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
    </section>

    <!-- BARRA DE BÚSQUEDA DUAL Y FILTROS -->
    <div class="prov-toolbar-card">
      <div class="prov-filters-grid">
        <!-- Buscador 1: Empresa / Contacto / Anotaciones -->
        <div class="prov-search-group">
          <label class="prov-filter-label">Buscar por Empresa, Contacto o Anotaciones:</label>
          <div class="prov-input-with-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-input">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="filtroBusqueda"
              type="text"
              class="prov-input"
              placeholder="Ej: PIL Andina, Roberto Gómez, entregas..."
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

        <!-- Selector de Estado: Activos / Dados de Baja / Todos -->
        <div class="prov-search-group prov-group-status">
          <label class="prov-filter-label">Estado de Registro:</label>
          <select v-model="filtroEstado" class="prov-select" @change="aplicarFiltros">
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Dados de Baja</option>
            <option value="TODOS">Todos</option>
          </select>
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
            v-if="filtroBusqueda || filtroProducto || filtroEstado !== 'ACTIVOS'"
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
              <th>Anotaciones</th>
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

            <tr v-for="prov in listaProveedores" :key="prov.proveedorId" :class="{ 'prov-row-baja': prov.marcaBaja }">
              <!-- Empresa -->
              <td>
                <div class="prov-name-cell">
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <strong>{{ prov.nombreEmpresa }}</strong>
                    <span class="prov-branch-tag" :title="`Distribuidor asignado a ${prov.ciudadSucursal || 'Sucursal'}`">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;">
                        <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
                      </svg>
                      {{ prov.codigoSucursal || `SUC-00${prov.sucursalId}` }} ({{ prov.ciudadSucursal || 'Central' }})
                    </span>
                  </div>
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
                  Dado de Baja
                </span>
              </td>

              <!-- Acciones -->
              <td class="text-right">
                <div class="prov-actions-cell">
                  <!-- Si el distribuidor está dado de baja (marcaBaja === true): ÚNICO botón de Restaurar (Supervisor / Propietario) -->
                  <template v-if="prov.marcaBaja">
                    <button
                      v-if="puedeGestionarProveedores"
                      type="button"
                      class="prov-btn-action restore"
                      title="Reactivar / Restaurar distribuidor"
                      @click="abrirModalReactivar(prov)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  </template>

                  <!-- Si está activo (marcaBaja === false): botones normales -->
                  <template v-else>
                    <!-- Botón: Ficha Logística / Auditoría (Visible para todos los roles) -->
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

                    <!-- Botón: Editar (Supervisor y Propietario) -->
                    <button
                      v-if="puedeGestionarProveedores"
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

                    <!-- Botón: Dar de Baja (Supervisor y Propietario) -->
                    <button
                      v-if="puedeGestionarProveedores"
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
                  </template>
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
          <!-- Selector de Sucursal (Propietario) o Badge Fijo (Supervisor) -->
          <div v-if="rolActivo === 3" class="prov-form-group">
            <div class="prov-label-row">
              <label class="prov-form-label">Sucursal Asignada <span class="required">*</span></label>
            </div>
            <select v-model="formProveedor.sucursalId" class="prov-select" required>
              <option v-for="s in listaSucursales" :key="s.sucursalId || (s as any).sucursal_id" :value="s.sucursalId || (s as any).sucursal_id">
                {{ s.codigoInterno || (s as any).codigo_interno }} - {{ s.ciudad || (s as any).nombre }}
              </option>
            </select>
            <span class="prov-text-muted-xs">
              El distribuidor quedará registrado con logística y lotes independientes en esta sucursal.
            </span>
          </div>
          <div v-else class="prov-form-group">
            <label class="prov-form-label">Sucursal Asignada:</label>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
              <span class="prov-branch-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;">
                  <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
                </svg>
                {{ sucursalActivaNombre }}
              </span>
            </div>
          </div>

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

          <!-- Campo 4: Anotaciones del Proveedor (VARCHAR 200 en BD) -->
          <div class="prov-form-group">
            <div class="prov-label-row">
              <label class="prov-form-label">Anotaciones del Proveedor</label>
              <span class="prov-char-counter">{{ formProveedor.anotaciones.length }}/200</span>
            </div>
            <textarea
              v-model="formProveedor.anotaciones"
              rows="3"
              maxlength="200"
              class="prov-textarea"
              placeholder="Ej: Entregas martes y viernes 08:00 AM. Crédito a 15 días. Descuento por volumen..."
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

    <!-- MODAL DE CONFIRMACIÓN DE REACTIVACIÓN -->
    <div v-if="modalReactivarVisible" class="prov-modal-backdrop" @click.self="cerrarModalReactivar">
      <div class="prov-modal-container sm">
        <div class="prov-modal-header">
          <div class="prov-modal-title-box success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-md">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <div>
              <h2 class="prov-modal-title">Reactivar Distribuidor</h2>
              <p class="prov-modal-subtitle">Se revertirá la baja lógica (marca_baja = false)</p>
            </div>
          </div>
          <button type="button" class="prov-modal-close" @click="cerrarModalReactivar" :disabled="reactivando">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="prov-modal-body">
          <p class="prov-confirm-text">
            ¿Está seguro que desea reactivar al distribuidor
            <strong>"{{ proveedorParaReactivar?.nombreEmpresa }}"</strong>?
          </p>
          <div class="prov-alert-box-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon-sm">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>
              El distribuidor volverá a estar habilitado para la recepción de nuevos lotes, vinculación de productos
              y acuerdos comerciales vigentes.
            </span>
          </div>

          <div class="prov-modal-footer">
            <button type="button" class="prov-btn-secondary" @click="cerrarModalReactivar" :disabled="reactivando">
              Cancelar
            </button>
            <button type="button" class="prov-btn-primary" style="background-color: #059669;" :disabled="reactivando" @click="ejecutarReactivacion">
              <span v-if="reactivando" class="prov-spinner-sm"></span>
              <span>Confirmar Reactivación</span>
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
              <span class="prov-contract-label">Anotaciones del Proveedor:</span>
              <p class="prov-contract-desc">{{ proveedorSeleccionado?.anotaciones || 'Sin anotaciones registradas.' }}</p>
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

<style scoped src="./ProveedoresView.css"></style>
