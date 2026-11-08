<script setup lang="ts">
import { onMounted } from 'vue'
import {
  tabActivo,
  sucursales,
  cargando,
  searchQuery,
  mostrarBajas,
  modalCrearVisible,
  cargandoCrear,
  formCrear,
  modalEditarVisible,
  cargandoEditar,
  sucursalAEditar,
  formEditar,
  modalBajaVisible,
  cargandoBaja,
  sucursalABaja,
  toasts,
  cerrarToast,
  totalSucursales,
  totalActivas,
  totalUsuariosAsignados,
  sucursalesFiltradas,
  cargarSucursales,
  abrirModalCrear,
  guardarNuevaSucursal,
  abrirModalEditar,
  guardarModificacion,
  abrirModalBaja,
  confirmarBaja,
  formatearFecha,
} from './ConfiguracionView'

onMounted(async () => {
  await cargarSucursales()
})
</script>

<template>
  <div class="user-wrapper">
    <!-- TOASTS FLOTANTES -->
    <div class="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="`toast-${t.tipo === 'error' ? 'danger' : t.tipo}`"
      >
        <div class="toast-content">
          <span class="toast-title">{{ t.titulo }}</span>
          <span class="toast-message">{{ t.mensaje }}</span>
        </div>
        <button type="button" class="toast-close" @click="cerrarToast(t.id)">×</button>
      </div>
    </div>

    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l8-4v18"></path>
              <path d="M19 21V11l-6-4"></path>
              <path d="M9 9h1"></path>
              <path d="M9 13h1"></path>
              <path d="M9 17h1"></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Configuración del Sistema</h1>
            <p class="page-subtitle">
              Administración de sucursales físicas, parámetros operativos y ajustes globales
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <button
          type="button"
          class="btn-secondary"
          :disabled="cargando"
          @click="cargarSucursales"
          title="Recargar datos"
        >
          <svg class="btn-icon" :class="{ 'spin-icon': cargando }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Actualizar</span>
        </button>

        <button
          v-if="tabActivo === 'sucursales'"
          type="button"
          class="btn-primary"
          @click="abrirModalCrear"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Nueva Sucursal</span>
        </button>
      </div>
    </header>

    <!-- PESTAÑAS / TABS -->
    <div class="tabs-container">
      <button
        type="button"
        class="tab-btn"
        :class="{ 'is-active': tabActivo === 'sucursales' }"
        @click="tabActivo = 'sucursales'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
          <path d="M3 21h18"></path>
          <path d="M5 21V7l8-4v18"></path>
          <path d="M19 21V11l-6-4"></path>
          <path d="M9 9h1"></path>
          <path d="M9 13h1"></path>
          <path d="M9 17h1"></path>
        </svg>
        <span>Gestión de Sucursales</span>
        <span class="tab-counter">{{ totalSucursales }}</span>
      </button>

      <button
        type="button"
        class="tab-btn"
        :class="{ 'is-active': tabActivo === 'general' }"
        @click="tabActivo = 'general'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span>Ajustes Generales</span>
      </button>
    </div>

    <!-- CONTENIDO TAB 1: SUCURSALES -->
    <div v-if="tabActivo === 'sucursales'">
      <!-- TARJETAS DE MÉTRICAS / KPIS -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Total Sucursales</span>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ totalSucursales }}</span>
            <span class="kpi-badge neutral">Registradas</span>
          </div>
          <span class="kpi-desc">Puntos de venta físicos y almacenes</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Sucursales Activas</span>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ totalActivas }}</span>
            <span class="kpi-badge success">Operativas</span>
          </div>
          <span class="kpi-desc">Habilitadas para transacciones comerciales</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Usuarios Vinculados</span>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ totalUsuariosAsignados }}</span>
            <span class="kpi-badge info">Asignados</span>
          </div>
          <span class="kpi-desc">Personal en sucursales físicas</span>
        </div>
      </section>

      <!-- BARRA DE FILTROS Y BÚSQUEDA -->
      <section class="filter-card">
        <div class="filter-left">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Buscar por código, ciudad o dirección..."
              @keyup.enter="cargarSucursales"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear"
              @click="searchQuery = ''; cargarSucursales()"
            >
              ×
            </button>
          </div>
        </div>

        <div class="filter-right">
          <label class="toggle-label">
            <input
              v-model="mostrarBajas"
              type="checkbox"
              class="toggle-checkbox"
              @change="cargarSucursales"
            />
            <span class="toggle-text">Mostrar dadas de baja</span>
          </label>
        </div>
      </section>

      <!-- TABLA DE SUCURSALES -->
      <section class="table-container">
        <div v-if="cargando" class="loading-state">
          <div class="spinner-large"></div>
          <p>Cargando información de sucursales...</p>
        </div>

        <div v-else-if="sucursalesFiltradas.length === 0" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 21h18"></path>
            <path d="M5 21V7l8-4v18"></path>
            <path d="M19 21V11l-6-4"></path>
            <path d="M9 9h1"></path>
            <path d="M9 13h1"></path>
            <path d="M9 17h1"></path>
          </svg>
          <h3>No se encontraron sucursales</h3>
          <p>No hay registros coincidentes con los filtros seleccionados.</p>
        </div>

        <div v-else class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th class="th-id">ID</th>
                <th>Código</th>
                <th>Ciudad / Nombre</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th>Usuarios</th>
                <th>Fecha Registro</th>
                <th>Estado</th>
                <th class="th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="suc in sucursalesFiltradas" :key="suc.sucursalId" :class="{ 'row-baja': suc.marcaBaja }">
                <td class="cell-id">#{{ suc.sucursalId }}</td>
                <td>
                  <span class="code-badge">{{ suc.codigoInterno }}</span>
                </td>
                <td class="cell-bold">{{ suc.ciudad }}</td>
                <td class="cell-muted">{{ suc.direccion }}</td>
                <td>{{ suc.telefono || 'Sin teléfono' }}</td>
                <td>
                  <span class="users-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    {{ suc.cantidadUsuarios }}
                  </span>
                </td>
                <td class="cell-date">{{ formatearFecha(suc.fechaCreacion) }}</td>
                <td>
                  <span v-if="suc.marcaBaja" class="status-badge baja">Baja Lógica</span>
                  <span v-else class="status-badge activa">Activa</span>
                </td>
                <td class="td-actions">
                  <button
                    type="button"
                    class="action-btn"
                    title="Modificar sucursal"
                    @click="abrirModalEditar(suc)"
                  >
                    <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>

                  <button
                    v-if="!suc.marcaBaja"
                    type="button"
                    class="action-btn action-btn-danger"
                    title="Dar de baja lógica"
                    @click="abrirModalBaja(suc)"
                  >
                    <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- CONTENIDO TAB 2: AJUSTES GENERALES (PLACEHOLDER) -->
    <div v-else-if="tabActivo === 'general'">
      <div class="general-card">
        <div class="general-header">
          <h2>Parámetros Globales de la Empresa</h2>
          <p>Esta sección contendrá la configuración de datos fiscales, impresoras térmicas de tickets y facturación electrónica.</p>
        </div>

        <div class="placeholder-grid">
          <div class="placeholder-box">
            <h4>Datos de Facturación</h4>
            <p>Razón Social, NIT / C.I., Régimen Tributario y Dosificación.</p>
            <span class="tag-upcoming">Próximamente</span>
          </div>

          <div class="placeholder-box">
            <h4>Impresoras & Terminales POS</h4>
            <p>Configuración de tamaño de papel (58mm / 80mm) y corte automático.</p>
            <span class="tag-upcoming">Próximamente</span>
          </div>

          <div class="placeholder-box">
            <h4>Políticas de Descuentos & Ventas</h4>
            <p>Topes de descuento por cajero y recargos por tarjeta de crédito.</p>
            <span class="tag-upcoming">Próximamente</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ====================================================================
         MODALES
         ==================================================================== -->

    <!-- 1. MODAL REGISTRAR SUCURSAL -->
    <div v-if="modalCrearVisible" class="modal-overlay" @click.self="modalCrearVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Registrar Nueva Sucursal</h2>
            <p class="modal-subtitle">Complete los datos para dar de alta una nueva sucursal</p>
          </div>
          <button type="button" class="btn-close-modal" @click="modalCrearVisible = false">×</button>
        </div>

        <form @submit.prevent="guardarNuevaSucursal" class="modal-form">
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Código Interno *</label>
              <input
                v-model="formCrear.codigoInterno"
                type="text"
                class="form-input"
                placeholder="Ej: SUC-002"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Ciudad / Nombre *</label>
              <input
                v-model="formCrear.ciudad"
                type="text"
                class="form-input"
                placeholder="Ej: Montero, Santa Cruz"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Dirección Física *</label>
            <input
              v-model="formCrear.direccion"
              type="text"
              class="form-input"
              placeholder="Ej: Calle Bolívar #450, Zona Comercial"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Teléfono de Contacto</label>
            <input
              v-model="formCrear.telefono"
              type="text"
              class="form-input"
              placeholder="Ej: 39224455"
            />
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn-secondary"
              @click="modalCrearVisible = false"
              :disabled="cargandoCrear"
            >
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="cargandoCrear">
              <span v-if="cargandoCrear" class="spinner"></span>
              <span v-else>Guardar Sucursal</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. MODAL MODIFICAR SUCURSAL -->
    <div v-if="modalEditarVisible" class="modal-overlay" @click.self="modalEditarVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Modificar Sucursal: {{ sucursalAEditar?.ciudad }}</h2>
            <p class="modal-subtitle">Actualice la información física o de contacto de la sucursal</p>
          </div>
          <button type="button" class="btn-close-modal" @click="modalEditarVisible = false">×</button>
        </div>

        <form @submit.prevent="guardarModificacion" class="modal-form">
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Código Interno *</label>
              <input
                v-model="formEditar.codigoInterno"
                type="text"
                class="form-input"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Ciudad / Nombre *</label>
              <input
                v-model="formEditar.ciudad"
                type="text"
                class="form-input"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Dirección Física *</label>
            <input
              v-model="formEditar.direccion"
              type="text"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Teléfono de Contacto</label>
            <input
              v-model="formEditar.telefono"
              type="text"
              class="form-input"
            />
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn-secondary"
              @click="modalEditarVisible = false"
              :disabled="cargandoEditar"
            >
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="cargandoEditar">
              <span v-if="cargandoEditar" class="spinner"></span>
              <span v-else>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. MODAL CONFIRMAR BAJA LÓGICA -->
    <div v-if="modalBajaVisible" class="modal-overlay" @click.self="modalBajaVisible = false">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <h2 class="modal-title">Confirmar Baja Lógica</h2>
          <button type="button" class="btn-close-modal" @click="modalBajaVisible = false">×</button>
        </div>

        <div class="modal-body-confirm">
          <p>
            ¿Está seguro de dar de baja la sucursal
            <strong>{{ sucursalABaja?.ciudad }} ({{ sucursalABaja?.codigoInterno }})</strong>?
          </p>
          <p class="confirm-note">
            La sucursal pasará a estar inactiva. Los registros históricos y transacciones se conservarán para fines de auditoría.
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-secondary"
            @click="modalBajaVisible = false"
            :disabled="cargandoBaja"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-danger"
            :disabled="cargandoBaja"
            @click="confirmarBaja"
          >
            <span v-if="cargandoBaja" class="spinner"></span>
            <span v-else>Sí, Dar de Baja</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./ConfiguracionView.css"></style>
