<script setup lang="ts">
import { onMounted } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  authStore,
  cargando,
  usuarios,
  usuariosActivosDetalle,
  searchQuery,
  selectedRol,
  selectedSucursal,
  mostrarBajas,
  toasts,
  toastSeq,
  agregarToast,
  cerrarToast,
  extraerError,
  cargarUsuarios,
  mapaEstadosPorId,
  obtenerEstadoUsuario,
  totalUsuarios,
  totalCajeros,
  totalSupervisores,
  totalSolicitudesRecuperacion,
  modalCrearVisible,
  formCrear,
  cargandoCrear,
  abrirModalCrear,
  guardarNuevoUsuario,
  modalModificarVisible,
  usuarioAEditar,
  formModificar,
  cargandoModificar,
  abrirModalModificar,
  guardarModificacion,
  modalPasswordVisible,
  usuarioAPassword,
  formPassword,
  cargandoPassword,
  abrirModalPassword,
  guardarNuevaPassword,
  modalBajaVisible,
  usuarioABaja,
  cargandoBaja,
  abrirModalBaja,
  confirmarBaja,
  formatearFecha,
  inicializarUsuarios,
  ROLES_USUARIO,
  MAPA_ROLES,
  ESTADOS_USUARIO,
  MAPA_ESTADOS_USUARIO,
} from './UsuariosView'

onMounted(async () => {
  await inicializarUsuarios()
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
        :class="`toast-${t.tipo}`"
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Gestión de Usuarios</h1>
            <p class="page-subtitle">
              Administración centralizada de cuentas, roles y políticas de seguridad (PostgreSQL + Spring Boot)
            </p>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <button
          type="button"
          class="btn-secondary"
          :disabled="cargando"
          @click="cargarUsuarios"
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
          <span>Nuevo Usuario</span>
        </button>
      </div>
    </header>

    <!-- KPI CARDS -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Total Usuarios</span>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ totalUsuarios }}</span>
          <span class="kpi-badge neutral">Registrados</span>
        </div>
        <span class="kpi-desc">Cuentas creadas en el sistema</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">Cajeros Activos</span>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ totalCajeros }}</span>
          <span class="kpi-badge info">Punto de Venta</span>
        </div>
        <span class="kpi-desc">Personal asignado a cajas</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">Supervisores</span>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ totalSupervisores }}</span>
          <span class="kpi-badge success">Auditoría</span>
        </div>
        <span class="kpi-desc">Supervisión e inventario</span>
      </div>

      <div class="kpi-card" :class="{ 'kpi-card-highlight': totalSolicitudesRecuperacion > 0 }">
        <span class="kpi-label">Solicitan Recuperación</span>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ totalSolicitudesRecuperacion }}</span>
          <span v-if="totalSolicitudesRecuperacion > 0" class="kpi-badge warning">Requiere Atención</span>
          <span v-else class="kpi-badge neutral">Sin Solicitudes</span>
        </div>
        <span class="kpi-desc">Empleados esperando nueva clave</span>
      </div>
    </section>

    <!-- BARRA DE FILTROS Y BUSQUEDA -->
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
            placeholder="Buscar por usuario, nombres o apellidos..."
            @keyup.enter="cargarUsuarios"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="search-clear"
            @click="searchQuery = ''; cargarUsuarios()"
          >
            ×
          </button>
        </div>

        <div class="select-wrapper">
          <select v-model="selectedRol" class="filter-select" @change="cargarUsuarios">
            <option value="">Todos los Roles</option>
            <option :value="ROLES_USUARIO.CAJERO">Cajero</option>
            <option :value="ROLES_USUARIO.SUPERVISOR">Supervisor</option>
            <option :value="ROLES_USUARIO.PROPIETARIO">Propietario</option>
          </select>
        </div>

        <div class="select-wrapper">
          <select v-model="selectedSucursal" class="filter-select" @change="cargarUsuarios">
            <option value="">Todas las Sucursales</option>
            <option :value="1">Sucursal 1 (Warnes)</option>
            <option :value="2">Sucursal 2</option>
            <option :value="3">Sucursal 3</option>
          </select>
        </div>
      </div>

      <div class="filter-right">
        <label class="toggle-label">
          <input
            v-model="mostrarBajas"
            type="checkbox"
            class="toggle-checkbox"
            @change="cargarUsuarios"
          />
          <span class="toggle-text">Mostrar dados de baja</span>
        </label>
      </div>
    </section>

    <!-- TABLA DE USUARIOS (fn_usuarios_listar) -->
    <section class="table-container">
      <div v-if="cargando" class="loading-state">
        <div class="spinner-large"></div>
        <p>Consultando base de datos PostgreSQL...</p>
      </div>

      <div v-else-if="usuarios.length === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
        </svg>
        <h3>No se encontraron usuarios</h3>
        <p>No hay registros coincidentes con los filtros seleccionados.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th class="th-id">ID</th>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Rol Asignado</th>
              <th>Sucursal</th>
              <th>Estado de Cuenta</th>
              <th>Fecha de Creación</th>
              <th class="th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in usuarios"
              :key="u.usuarioId"
              :class="{
                'row-alert': obtenerEstadoUsuario(u.usuarioId) === ESTADOS_USUARIO.SOLICITA_RECUPERACION
              }"
            >
              <td class="font-mono text-muted">#{{ u.usuarioId }}</td>
              <td>
                <div class="user-cell">
                  <span class="username-pill">@{{ u.usuario }}</span>
                </div>
              </td>
              <td>
                <span class="user-fullname">{{ u.nombres }} {{ u.apellidos }}</span>
              </td>
              <td>
                <ConceptoBadge tipo="rol" :valor="u.rolId" size="sm" />
              </td>
              <td>
                <span v-if="u.sucursalId" class="sucursal-badge">
                  Sucursal #{{ u.sucursalId }}
                </span>
                <span v-else class="text-muted text-xs italic">
                  Central / Global
                </span>
              </td>
              <td>
                <ConceptoBadge
                  tipo="estado_usuario"
                  :valor="obtenerEstadoUsuario(u.usuarioId)"
                  size="sm"
                />
              </td>
              <td class="text-muted text-sm">
                {{ formatearFecha(u.fechaCreacion) }}
              </td>
              <td class="td-actions">
                <!-- Botón: Editar Datos -->
                <button
                  type="button"
                  class="action-btn"
                  title="Modificar datos"
                  @click="abrirModalModificar(u)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>

                <!-- Botón: Restablecer Contraseña (Propietario) -->
                <button
                  type="button"
                  class="action-btn"
                  :class="{
                    'action-btn-warning':
                      obtenerEstadoUsuario(u.usuarioId) === ESTADOS_USUARIO.SOLICITA_RECUPERACION
                  }"
                  title="Restablecer contraseña (Propietario)"
                  @click="abrirModalPassword(u)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </button>

                <!-- Botón: Baja Lógica -->
                <button
                  type="button"
                  class="action-btn action-btn-danger"
                  title="Dar de baja lógica"
                  @click="abrirModalBaja(u)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

    <!-- ====================================================================
         MODALES
         ==================================================================== -->

    <!-- 1. MODAL REGISTRAR USUARIO -->
    <div v-if="modalCrearVisible" class="modal-overlay" @click.self="modalCrearVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Registrar Nuevo Usuario</h2>
            <p class="modal-subtitle">Se insertará en PostgreSQL invocando sp_usuarios_insertar</p>
          </div>
          <button type="button" class="btn-close-modal" @click="modalCrearVisible = false">×</button>
        </div>

        <form @submit.prevent="guardarNuevoUsuario" class="modal-form">
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Nombre de Usuario *</label>
              <input
                v-model="formCrear.usuario"
                type="text"
                class="form-input"
                placeholder="Ej: cajero2, supervisor1"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Rol del Sistema *</label>
              <select v-model="formCrear.rolId" class="form-input" required>
                <option :value="ROLES_USUARIO.CAJERO">1 - Cajero</option>
                <option :value="ROLES_USUARIO.SUPERVISOR">2 - Supervisor</option>
                <option :value="ROLES_USUARIO.PROPIETARIO">3 - Propietario</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Sucursal Asignada</label>
              <input
                v-model.number="formCrear.sucursalId"
                type="number"
                min="1"
                class="form-input"
                placeholder="Ej: 1"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Nombres *</label>
              <input
                v-model="formCrear.nombres"
                type="text"
                class="form-input"
                placeholder="Ej: Carlos Alberto"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Apellidos *</label>
              <input
                v-model="formCrear.apellidos"
                type="text"
                class="form-input"
                placeholder="Ej: Rojas Fernandez"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña Inicial *</label>
            <input
              v-model="formCrear.password"
              type="password"
              class="form-input"
              placeholder="Mínimo 6 caracteres"
              required
            />
            <span class="form-hint">Spring Boot la hasheará con BCrypt antes de almacenarla en la BD.</span>
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
            <button
              type="submit"
              class="btn-primary"
              :disabled="cargandoCrear"
            >
              <span v-if="cargandoCrear" class="spinner"></span>
              <span v-else>Guardar Usuario</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. MODAL MODIFICAR USUARIO -->
    <div v-if="modalModificarVisible" class="modal-overlay" @click.self="modalModificarVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Modificar Usuario: @{{ usuarioAEditar?.usuario }}</h2>
            <p class="modal-subtitle">Invocará el procedimiento sp_usuarios_modificar</p>
          </div>
          <button type="button" class="btn-close-modal" @click="modalModificarVisible = false">×</button>
        </div>

        <form @submit.prevent="guardarModificacion" class="modal-form">
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Nombres</label>
              <input v-model="formModificar.nombres" type="text" class="form-input" required />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Apellidos</label>
              <input v-model="formModificar.apellidos" type="text" class="form-input" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Rol Asignado</label>
              <select v-model="formModificar.rolId" class="form-input" required>
                <option :value="ROLES_USUARIO.CAJERO">1 - Cajero</option>
                <option :value="ROLES_USUARIO.SUPERVISOR">2 - Supervisor</option>
                <option :value="ROLES_USUARIO.PROPIETARIO">3 - Propietario</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Sucursal Asignada</label>
              <input
                v-model.number="formModificar.sucursalId"
                type="number"
                min="1"
                class="form-input"
                placeholder="ID Sucursal (vacío para central)"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn-secondary"
              @click="modalModificarVisible = false"
              :disabled="cargandoModificar"
            >
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="cargandoModificar">
              <span v-if="cargandoModificar" class="spinner"></span>
              <span v-else>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. MODAL RESTABLECER CONTRASEÑA -->
    <div v-if="modalPasswordVisible" class="modal-overlay" @click.self="modalPasswordVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Restablecer Contraseña</h2>
            <p class="modal-subtitle">
              Usuario: <strong>@{{ usuarioAPassword?.usuario }}</strong>
            </p>
          </div>
          <button type="button" class="btn-close-modal" @click="modalPasswordVisible = false">×</button>
        </div>

        <form @submit.prevent="guardarNuevaPassword" class="modal-form">
          <div class="info-callout">
            <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <div>
              <strong>Políticas de Seguridad:</strong> Como Propietario, al asignar una nueva contraseña a este usuario, su estado de seguridad se restablecerá automáticamente a <strong>Activo (1)</strong>.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Nueva Contraseña *</label>
            <input
              v-model="formPassword.nuevaPassword"
              type="password"
              class="form-input"
              placeholder="Ingrese la nueva clave"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Confirmar Contraseña *</label>
            <input
              v-model="formPassword.confirmarPassword"
              type="password"
              class="form-input"
              placeholder="Repita la nueva clave"
              required
            />
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn-secondary"
              @click="modalPasswordVisible = false"
              :disabled="cargandoPassword"
            >
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="cargandoPassword">
              <span v-if="cargandoPassword" class="spinner"></span>
              <span v-else>Aplicar Nueva Contraseña</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 4. MODAL DAR DE BAJA -->
    <div v-if="modalBajaVisible" class="modal-overlay" @click.self="modalBajaVisible = false">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <h2 class="modal-title">Confirmar Baja Lógica</h2>
          <button type="button" class="btn-close-modal" @click="modalBajaVisible = false">×</button>
        </div>

        <div class="modal-body-confirm">
          <p>
            ¿Está seguro de dar de baja al usuario
            <strong>@{{ usuarioABaja?.usuario }}</strong>?
          </p>
          <p class="confirm-note">
            El usuario no será eliminado físicamente de la base de datos (se marcará
            <code>marca_baja = true</code> invocando <code>sp_usuarios_eliminar</code>) para proteger la trazabilidad de ventas pasadas.
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

<style scoped src="./UsuariosView.css"></style>
