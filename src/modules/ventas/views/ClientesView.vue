<script setup lang="ts">
import { useClientesView } from './ClientesView'

const {
  cargando,
  guardando,
  eliminando,
  listaClientes,
  filtroBusqueda,
  filtroEstado,
  modalAbmVisible,
  modoEdicion,
  clienteIdEdicion,
  formCliente,
  modalBajaVisible,
  clienteParaBaja,
  toasts,
  totalClientesActivos,
  totalClientesConCompras,
  totalClientesRecurrentes,
  removerToast,
  onBusquedaInput,
  cargarClientes,
  abrirModalCrear,
  abrirModalEditar,
  cerrarModalAbm,
  guardarCliente,
  confirmarBaja,
  cerrarModalBaja,
  ejecutarBaja,
  formatMonto,
} = useClientesView()
</script>

<template>
  <div class="user-wrapper">
    <!-- ================================================================= -->
    <!-- TOASTS FLOTANTES DEL SISTEMA                                      -->
    <!-- ================================================================= -->
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
        <button type="button" class="toast-close" @click="removerToast(t.id)">×</button>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- 1. TOPBAR DE NAVEGACIÓN Y ACCIONES                                -->
    <!-- ================================================================= -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title-box">
          <div class="page-icon">
            <!-- Icono SVG Clientes -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Gestión de Clientes</h1>
            <p class="page-subtitle">
              Directorio de clientes para emisión de facturas y notas de venta
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <button
          type="button"
          class="btn-secondary"
          :disabled="cargando"
          @click="cargarClientes"
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
          type="button"
          class="btn-primary"
          @click="abrirModalCrear"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Nuevo Cliente</span>
        </button>
      </div>
    </header>

    <!-- ================================================================= -->
    <!-- 2. TARJETAS DE INDICADORES (KPIS)                                 -->
    <!-- ================================================================= -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Clientes Activos</span>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ totalClientesActivos }}</span>
          <span class="kpi-badge success">Habilitados</span>
        </div>
        <span class="kpi-desc">Disponibles para facturación en caja</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">Con Compras Registradas</span>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ totalClientesConCompras }}</span>
          <span class="kpi-badge info">Historial Activo</span>
        </div>
        <span class="kpi-desc">Clientes con ventas asociadas</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">Clientes Recurrentes</span>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ totalClientesRecurrentes }}</span>
          <span class="kpi-badge warning">Frecuentes</span>
        </div>
        <span class="kpi-desc">Clientes con 10 o más compras realizadas</span>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- 3. BARRA DE HERRAMIENTAS Y BÚSQUEDA                               -->
    <!-- ================================================================= -->
    <section class="filter-card">
      <div class="filter-left">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="filtroBusqueda"
            type="text"
            class="search-input"
            placeholder="Buscar por NIT, CI, nombres o razón social..."
            @input="onBusquedaInput"
          />
          <button
            v-if="filtroBusqueda"
            type="button"
            class="search-clear"
            @click="filtroBusqueda = ''; cargarClientes()"
          >
            ×
          </button>
        </div>

        <div class="select-wrapper">
          <select v-model="filtroEstado" class="filter-select" @change="cargarClientes">
            <option value="ACTIVOS">Solo Activos</option>
            <option value="BAJAS">Solo Bajas Lógicas</option>
            <option value="TODOS">Todos los Registros</option>
          </select>
        </div>
      </div>

      <div class="filter-right">
        <span class="prov-table-count">
          {{ listaClientes.length }} {{ listaClientes.length === 1 ? 'cliente' : 'clientes' }}
        </span>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- 4. TABLA PRINCIPAL DE CLIENTES                                    -->
    <!-- ================================================================= -->
    <section class="table-container">
      <div v-if="cargando" class="loading-state">
        <div class="spinner-large"></div>
        <p>Cargando directorio de clientes desde la base de datos...</p>
      </div>

      <div v-else-if="listaClientes.length === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
        </svg>
        <h3>No se encontraron clientes</h3>
        <p>No hay registros coincidentes con los filtros seleccionados.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 140px;">NIT / CI</th>
              <th>Cliente / Razón Social</th>
              <th style="width: 130px;">Teléfono</th>
              <th style="width: 110px; text-align: center;">Compras</th>
              <th style="width: 150px; text-align: right;">Total Comprado</th>
              <th style="width: 110px; text-align: center;">Estado</th>
              <th class="th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cliente in listaClientes"
              :key="cliente.clienteId"
              :class="{ 'row-baja': cliente.marcaBaja }"
            >
              <!-- NIT -->
              <td>
                <span class="client-nit-badge">{{ cliente.nit }}</span>
              </td>

              <!-- Nombres / Razón Social -->
              <td>
                <div class="client-name-cell">
                  <span class="user-fullname">
                    {{ cliente.nombreRazonSocial || 'Sin Razón Social' }}
                  </span>
                  <span v-if="cliente.nombres || cliente.apellidos" class="client-person-name">
                    {{ [cliente.nombres, cliente.apellidos].filter(Boolean).join(' ') }}
                  </span>
                </div>
              </td>

              <!-- Teléfono -->
              <td>
                <span class="text-muted text-sm">{{ cliente.telefono || '-' }}</span>
              </td>

              <!-- Total Compras -->
              <td style="text-align: center;">
                <span class="prov-badge-metric blue">
                  {{ cliente.totalCompras || 0 }}
                </span>
              </td>

              <!-- Monto Acumulado -->
              <td style="text-align: right; font-weight: 600;">
                Bs. {{ formatMonto(cliente.montoTotalComprado) }}
              </td>

              <!-- Estado -->
              <td style="text-align: center;">
                <span v-if="!cliente.marcaBaja" class="prov-badge-active">
                  <span class="prov-dot-active"></span>
                  Activo
                </span>
                <span v-else class="prov-badge-inactive">
                  Baja
                </span>
              </td>

              <!-- Acciones (mismo estilo e icono que Usuarios e Historial) -->
              <td class="td-actions">
                <!-- Botón: Editar Datos -->
                <button
                  type="button"
                  class="action-btn"
                  title="Modificar datos del cliente"
                  @click="abrirModalEditar(cliente)"
                >
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>

                <!-- Botón: Baja Lógica -->
                <button
                  v-if="!cliente.marcaBaja"
                  type="button"
                  class="action-btn action-btn-danger"
                  title="Dar de baja lógica"
                  @click="confirmarBaja(cliente)"
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

    <!-- ================================================================= -->
    <!-- 5. MODAL FORMULARIO ABM (CREAR / EDITAR)                          -->
    <!-- ================================================================= -->
    <div v-if="modalAbmVisible" class="modal-overlay" @click.self="cerrarModalAbm">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">
              {{ modoEdicion ? `Modificar Cliente #${clienteIdEdicion}` : 'Registrar Nuevo Cliente' }}
            </h2>
            <p class="modal-subtitle">
              {{ modoEdicion ? 'Actualice la información tributaria y de contacto' : 'Complete los datos para asociar el cliente a notas de venta y facturas' }}
            </p>
          </div>
          <button type="button" class="btn-close-modal" @click="cerrarModalAbm">×</button>
        </div>

        <form @submit.prevent="guardarCliente" class="modal-form">
          <div class="form-group">
            <label class="form-label">NIT / Carnet de Identidad (CI) <span class="required">*</span></label>
            <input
              v-model="formCliente.nit"
              type="text"
              class="form-input"
              placeholder="Ej: 1028374021 o 6891234 SC"
              required
              maxlength="20"
            />
            <span class="form-hint">Dato fiscal clave para la búsqueda automática en caja</span>
          </div>

          <div class="form-group">
            <label class="form-label">Razón Social</label>
            <input
              v-model="formCliente.nombreRazonSocial"
              type="text"
              class="form-input"
              placeholder="Ej: Comercial Santa Cruz S.R.L. o Nombre comercial"
              maxlength="150"
            />
            <span class="form-hint">Nombre que se imprimirá en el encabezado de facturación</span>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Nombres</label>
              <input
                v-model="formCliente.nombres"
                type="text"
                class="form-input"
                placeholder="Ej: Juan Carlos"
                maxlength="100"
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Apellidos</label>
              <input
                v-model="formCliente.apellidos"
                type="text"
                class="form-input"
                placeholder="Ej: Pérez Rodríguez"
                maxlength="100"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Teléfono / Celular de Contacto</label>
            <input
              v-model="formCliente.telefono"
              type="text"
              class="form-input"
              placeholder="Ej: 71234567"
              maxlength="20"
            />
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn-secondary"
              :disabled="guardando"
              @click="cerrarModalAbm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="guardando"
            >
              <span v-if="guardando">Guardando datos...</span>
              <span v-else>{{ modoEdicion ? 'Actualizar Cliente' : 'Guardar Cliente' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- 6. MODAL CONFIRMACIÓN DE BAJA LÓGICA                              -->
    <!-- ================================================================= -->
    <div v-if="modalBajaVisible && clienteParaBaja" class="modal-overlay" @click.self="cerrarModalBaja">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Confirmar Baja de Cliente</h2>
            <p class="modal-subtitle">Operación de baja lógica en el sistema</p>
          </div>
          <button type="button" class="btn-close-modal" @click="cerrarModalBaja">×</button>
        </div>

        <div class="modal-body-confirm">
          <p>
            ¿Está seguro de que desea dar de baja al cliente
            <strong>{{ clienteParaBaja.nombreRazonSocial || clienteParaBaja.nit }}</strong>?
          </p>
          <p class="confirm-note">
            El cliente será marcado como inactivo (marca_baja = true) y no figurará en la búsqueda de la terminal de venta POS. Sus ventas históricas se mantendrán intactas en la base de datos.
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-secondary"
            :disabled="eliminando"
            @click="cerrarModalBaja"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-danger"
            :disabled="eliminando"
            @click="ejecutarBaja"
          >
            <span v-if="eliminando">Dando de baja...</span>
            <span v-else>Sí, Dar de Baja</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./ClientesView.css"></style>
