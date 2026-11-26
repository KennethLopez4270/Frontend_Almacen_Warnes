<script setup lang="ts">
import { onMounted } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  cargando,
  usuarios,
  usuariosFiltrados,
  listaSucursales,
  obtenerEtiquetaSucursal,
  searchQuery,
  selectedRol,
  selectedSucursal,
  selectedEstado,
  mostrarBajas,
  toasts,
  cerrarToast,
  cargarUsuarios,
  obtenerEstadoUsuario,
  esUsuarioActual,
  totalUsuarios,
  totalCajeros,
  totalSupervisores,
  totalSolicitudesRecuperacion,
  modalCrearVisible,
  formCrear,
  cargandoCrear,
  onRolChangeCrear,
  abrirModalCrear,
  guardarNuevoUsuario,
  modalModificarVisible,
  usuarioAEditar,
  formModificar,
  cargandoModificar,
  onRolChangeModificar,
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
  modalEstadoVisible,
  usuarioAEstado,
  nuevoEstadoObjetivo,
  cargandoEstado,
  abrirModalEstado,
  confirmarCambioEstado,
  formatearFecha,
  inicializarUsuarios,
  ROLES_USUARIO,
  ESTADOS_USUARIO,
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
              Administración centralizada de cuentas, roles y políticas de seguridad corporativas
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
            <option :value="0">Todas (Global / Propietario)</option>
            <option v-for="suc in listaSucursales" :key="suc.sucursalId" :value="suc.sucursalId">
              {{ suc.codigoInterno }} - {{ suc.ciudad }}
            </option>
          </select>
        </div>

        <div class="select-wrapper">
          <select v-model="selectedEstado" class="filter-select">
            <option value="">Todos los Estados</option>
            <option :value="ESTADOS_USUARIO.ACTIVO">Activo</option>
            <option :value="ESTADOS_USUARIO.SOLICITA_RECUPERACION">Solicita Recuperación</option>
            <option :value="ESTADOS_USUARIO.BLOQUEADO">Bloqueado</option>
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

    <!-- TABLA DE USUARIOS -->
    <section class="table-container">
      <div v-if="cargando" class="loading-state">
        <div class="spinner-large"></div>
        <p>Cargando lista de usuarios...</p>
      </div>

      <div v-else-if="usuariosFiltrados.length === 0" class="empty-state">
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
              v-for="u in usuariosFiltrados"
              :key="u.usuarioId"
              :class="{
                'row-alert': obtenerEstadoUsuario(u.usuarioId) === ESTADOS_USUARIO.SOLICITA_RECUPERACION
              }"
            >
              <td class="font-mono text-muted">#{{ u.usuarioId }}</td>
              <td>
                <div class="user-cell">
                  <span class="username-pill">@{{ u.usuario }}</span>
                  <span v-if="esUsuarioActual(u.usuarioId)" class="kpi-badge info" style="margin-left: 0.35rem; font-size: 0.68rem;">
                    Tú
                  </span>
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
                  {{ obtenerEtiquetaSucursal(u.sucursalId) }}
                </span>
                <span v-else-if="u.sucursalId === 0" class="sucursal-badge" style="background-color: #f0fdf4; color: #16a34a; border-color: #bbf7d0;">
                  Todas (Global)
                </span>
                <span v-else class="text-muted text-xs italic">
                  Sin Asignar
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
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                  </svg>
                </button>

                <!-- Botón: Desbloquear cuenta (si está bloqueada) -->
                <button
                  v-if="obtenerEstadoUsuario(u.usuarioId) === ESTADOS_USUARIO.BLOQUEADO"
                  type="button"
                  class="action-btn action-btn-success"
                  title="Desbloquear cuenta de usuario"
                  @click="abrirModalEstado(u, ESTADOS_USUARIO.ACTIVO)"
                >
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                  </svg>
                </button>

                <!-- Botón: Bloquear cuenta (deshabilitado para el usuario en sesión) -->
                <button
                  v-else
                  type="button"
                  class="action-btn action-btn-warning"
                  :disabled="esUsuarioActual(u.usuarioId)"
                  :title="esUsuarioActual(u.usuarioId) ? 'No puede bloquear su propia cuenta en sesión' : 'Bloquear cuenta de usuario'"
                  @click="abrirModalEstado(u, ESTADOS_USUARIO.BLOQUEADO)"
                >
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                  </svg>
                </button>

                <!-- Botón: Baja Lógica (deshabilitado para el usuario en sesión) -->
                <button
                  type="button"
                  class="action-btn action-btn-danger"
                  :disabled="esUsuarioActual(u.usuarioId)"
                  :title="esUsuarioActual(u.usuarioId) ? 'No puede dar de baja su propia cuenta en sesión' : 'Dar de baja lógica'"
                  @click="abrirModalBaja(u)"
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

    <!-- ====================================================================
         MODALES
         ==================================================================== -->

    <!-- 1. MODAL REGISTRAR USUARIO -->
    <div v-if="modalCrearVisible" class="modal-overlay" @click.self="modalCrearVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Registrar Nuevo Usuario</h2>
            <p class="modal-subtitle">Complete los datos para dar de alta una nueva cuenta de usuario</p>
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
              <select v-model="formCrear.rolId" class="form-select" required @change="onRolChangeCrear">
                <option :value="ROLES_USUARIO.CAJERO">1 - Cajero</option>
                <option :value="ROLES_USUARIO.SUPERVISOR">2 - Supervisor</option>
                <option :value="ROLES_USUARIO.PROPIETARIO">3 - Propietario</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Sucursal Asignada</label>
              <select v-model="formCrear.sucursalId" class="form-select">
                <option :value="null">Sin Asignar</option>
                <option v-if="formCrear.rolId === ROLES_USUARIO.PROPIETARIO" :value="0">Todas las Sucursales (Propietario)</option>
                <option v-for="suc in listaSucursales" :key="suc.sucursalId" :value="suc.sucursalId">
                  {{ suc.codigoInterno }} ({{ suc.ciudad }})
                </option>
              </select>
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
            <span class="form-hint">Ingrese una contraseña segura de al menos 6 caracteres</span>
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
            <p class="modal-subtitle">Actualice los datos o el rol del usuario seleccionado</p>
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
              <select v-model="formModificar.rolId" class="form-select" required @change="onRolChangeModificar">
                <option :value="ROLES_USUARIO.CAJERO">1 - Cajero</option>
                <option :value="ROLES_USUARIO.SUPERVISOR">2 - Supervisor</option>
                <option :value="ROLES_USUARIO.PROPIETARIO">3 - Propietario</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Sucursal Asignada</label>
              <select v-model="formModificar.sucursalId" class="form-select">
                <option :value="null">Sin Asignar</option>
                <option v-if="formModificar.rolId === ROLES_USUARIO.PROPIETARIO" :value="0">Todas las Sucursales (Propietario)</option>
                <option v-for="suc in listaSucursales" :key="suc.sucursalId" :value="suc.sucursalId">
                  {{ suc.codigoInterno }} ({{ suc.ciudad }})
                </option>
              </select>
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
            El usuario ya no podrá iniciar sesión en el sistema. Los registros históricos y transacciones se conservarán para fines de auditoría.
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

    <!-- 5. MODAL BLOQUEAR / DESBLOQUEAR USUARIO -->
    <div v-if="modalEstadoVisible" class="modal-overlay" @click.self="modalEstadoVisible = false">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <h2 class="modal-title">
            {{ nuevoEstadoObjetivo === ESTADOS_USUARIO.BLOQUEADO ? 'Bloquear Cuenta de Usuario' : 'Desbloquear Cuenta de Usuario' }}
          </h2>
          <button type="button" class="btn-close-modal" @click="modalEstadoVisible = false">×</button>
        </div>

        <div class="modal-body-confirm">
          <p v-if="nuevoEstadoObjetivo === ESTADOS_USUARIO.BLOQUEADO">
            ¿Está seguro de bloquear el acceso al usuario
            <strong>@{{ usuarioAEstado?.usuario }}</strong> ({{ usuarioAEstado?.nombres }} {{ usuarioAEstado?.apellidos }})?
          </p>
          <p v-else>
            ¿Desea desbloquear y reactivar el acceso para el usuario
            <strong>@{{ usuarioAEstado?.usuario }}</strong>?
          </p>
          <p class="confirm-note">
            <template v-if="nuevoEstadoObjetivo === ESTADOS_USUARIO.BLOQUEADO">
              El usuario no podrá iniciar sesión y se cerrará su turno activo si tiene uno abierto.
            </template>
            <template v-else>
              La cuenta volverá al estado Activo y el usuario podrá volver a ingresar al sistema con sus credenciales.
            </template>
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-secondary"
            @click="modalEstadoVisible = false"
            :disabled="cargandoEstado"
          >
            Cancelar
          </button>
          <button
            type="button"
            :class="nuevoEstadoObjetivo === ESTADOS_USUARIO.BLOQUEADO ? 'btn-danger' : 'btn-primary'"
            :disabled="cargandoEstado"
            @click="confirmarCambioEstado"
          >
            <span v-if="cargandoEstado" class="spinner"></span>
            <span v-else>{{ nuevoEstadoObjetivo === ESTADOS_USUARIO.BLOQUEADO ? 'Sí, Bloquear Cuenta' : 'Sí, Desbloquear' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./UsuariosView.css"></style>
