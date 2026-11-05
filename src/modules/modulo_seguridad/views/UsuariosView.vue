<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  ROLES_USUARIO,
  MAPA_ROLES,
  ESTADOS_USUARIO,
  MAPA_ESTADOS_USUARIO,
  type RolUsuarioId,
} from '@/constants/mapeoEstados'
import {
  seguridadService,
  type UsuarioListadoDTO,
  type UsuarioDTO,
  type UsuarioRegistroDTO,
  type UsuarioModificarDTO,
  type RecuperarContrasenaDTO,
} from '@/modules/modulo_seguridad/services/seguridadService'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// ====================================================================
// 1. ESTADO REACTIVO Y LISTADOS
// ====================================================================

const cargando = ref(false)
const usuarios = ref<UsuarioListadoDTO[]>([])
const usuariosActivosDetalle = ref<UsuarioDTO[]>([])

// Filtros
const searchQuery = ref('')
const selectedRol = ref<number | ''>('')
const selectedSucursal = ref<number | ''>('')
const mostrarBajas = ref(false)

// ====================================================================
// 2. SISTEMA DE TOASTS
// ====================================================================

interface ToastItem {
  id: number
  titulo: string
  mensaje: string
  tipo: 'success' | 'danger' | 'warning' | 'info'
}

const toasts = ref<ToastItem[]>([])
let toastSeq = 0

function agregarToast(
  titulo: string,
  mensaje: string,
  tipo: 'success' | 'danger' | 'warning' | 'info' = 'info'
) {
  const id = ++toastSeq
  toasts.value.push({ id, titulo, mensaje, tipo })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4500)
}

function cerrarToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function extraerError(err: any): string {
  return err.userMessage || err.message || 'Error al procesar la operación'
}

// ====================================================================
// 3. CARGA DE DATOS DESDE SPRING BOOT & POSTGRESQL
// ====================================================================

async function cargarUsuarios() {
  cargando.value = true
  try {
    // 1. Cargar la lista con filtros llamando a fn_usuarios_listar
    const rolParam = selectedRol.value !== '' ? Number(selectedRol.value) : null
    const sucursalParam = selectedSucursal.value !== '' ? Number(selectedSucursal.value) : null
    const busquedaParam = searchQuery.value.trim() !== '' ? searchQuery.value.trim() : undefined

    const [listaTabla, listaActivos] = await Promise.all([
      seguridadService.listarUsuariosTabla(mostrarBajas.value, rolParam, sucursalParam, busquedaParam),
      seguridadService.listarUsuariosActivos().catch(() => [] as UsuarioDTO[]),
    ])

    usuarios.value = listaTabla
    usuariosActivosDetalle.value = listaActivos
  } catch (err: any) {
    agregarToast('Error al cargar usuarios', extraerError(err), 'danger')
  } finally {
    cargando.value = false
  }
}

// Mapa rápido para obtener estado de seguridad de cada usuario
const mapaEstadosPorId = computed(() => {
  const map: Record<number, number> = {}
  usuariosActivosDetalle.value.forEach((u) => {
    map[u.usuarioId] = u.estado ?? 1
  })
  return map
})

function obtenerEstadoUsuario(usuarioId: number): number {
  return mapaEstadosPorId.value[usuarioId] ?? 1
}

// ====================================================================
// 4. METRICAS / KPIS
// ====================================================================

const totalUsuarios = computed(() => usuarios.value.length)
const totalCajeros = computed(() => usuarios.value.filter((u) => u.rolId === ROLES_USUARIO.CAJERO).length)
const totalSupervisores = computed(
  () => usuarios.value.filter((u) => u.rolId === ROLES_USUARIO.SUPERVISOR).length
)
const totalSolicitudesRecuperacion = computed(() => {
  return usuariosActivosDetalle.value.filter(
    (u) => u.estado === ESTADOS_USUARIO.SOLICITA_RECUPERACION
  ).length
})

// ====================================================================
// 5. MODAL: REGISTRAR NUEVO USUARIO
// ====================================================================

const modalCrearVisible = ref(false)
const formCrear = reactive<UsuarioRegistroDTO>({
  usuario: '',
  sucursalId: null,
  nombres: '',
  apellidos: '',
  rolId: ROLES_USUARIO.CAJERO,
  password: '',
  usuarioCreacion: authStore.usuarioId || 1,
})
const cargandoCrear = ref(false)

function abrirModalCrear() {
  if (!authStore.isPropietario && authStore.rolId !== null) {
    agregarToast('Permiso Denegado', 'Solo el Propietario tiene autorización para crear usuarios.', 'warning')
    return
  }
  formCrear.usuario = ''
  formCrear.sucursalId = null
  formCrear.nombres = ''
  formCrear.apellidos = ''
  formCrear.rolId = ROLES_USUARIO.CAJERO
  formCrear.password = ''
  formCrear.usuarioCreacion = authStore.usuarioId || 1
  modalCrearVisible.value = true
}

async function guardarNuevoUsuario() {
  if (!formCrear.usuario.trim() || !formCrear.nombres.trim() || !formCrear.password.trim()) {
    agregarToast('Campos Incompletos', 'Complete los campos obligatorios.', 'warning')
    return
  }

  cargandoCrear.value = true
  try {
    const res = await seguridadService.registrarUsuario({
      usuario: formCrear.usuario.trim(),
      sucursalId: formCrear.sucursalId ? Number(formCrear.sucursalId) : null,
      nombres: formCrear.nombres.trim(),
      apellidos: formCrear.apellidos.trim(),
      rolId: Number(formCrear.rolId),
      password: formCrear.password,
      usuarioCreacion: authStore.usuarioId || 1,
    })

    agregarToast('Usuario Creado', res.mensaje || `Usuario #${res.usuarioId} creado exitosamente.`, 'success')
    modalCrearVisible.value = false
    await cargarUsuarios()
  } catch (err: any) {
    agregarToast('Error al Crear Usuario', extraerError(err), 'danger')
  } finally {
    cargandoCrear.value = false
  }
}

// ====================================================================
// 6. MODAL: MODIFICAR USUARIO
// ====================================================================

const modalModificarVisible = ref(false)
const usuarioAEditar = ref<UsuarioListadoDTO | null>(null)
const formModificar = reactive<UsuarioModificarDTO>({
  sucursalId: null,
  nombres: '',
  apellidos: '',
  rolId: ROLES_USUARIO.CAJERO,
  usuarioModificacion: authStore.usuarioId || 1,
})
const cargandoModificar = ref(false)

function abrirModalModificar(u: UsuarioListadoDTO) {
  if (!authStore.isPropietario && authStore.rolId !== null) {
    agregarToast('Permiso Denegado', 'Solo el Propietario puede modificar cuentas de usuario.', 'warning')
    return
  }
  usuarioAEditar.value = u
  formModificar.sucursalId = u.sucursalId ?? null
  formModificar.nombres = u.nombres
  formModificar.apellidos = u.apellidos
  formModificar.rolId = u.rolId
  formModificar.usuarioModificacion = authStore.usuarioId || 1
  modalModificarVisible.value = true
}

async function guardarModificacion() {
  if (!usuarioAEditar.value) return

  cargandoModificar.value = true
  try {
    const res = await seguridadService.modificarUsuario(usuarioAEditar.value.usuarioId, {
      sucursalId: formModificar.sucursalId ? Number(formModificar.sucursalId) : null,
      nombres: formModificar.nombres.trim(),
      apellidos: formModificar.apellidos.trim(),
      rolId: Number(formModificar.rolId),
      usuarioModificacion: authStore.usuarioId || 1,
    })

    agregarToast('Usuario Modificado', res.mensaje || 'Datos actualizados con éxito.', 'success')
    modalModificarVisible.value = false
    await cargarUsuarios()
  } catch (err: any) {
    agregarToast('Error al Modificar', extraerError(err), 'danger')
  } finally {
    cargandoModificar.value = false
  }
}

// ====================================================================
// 7. MODAL: RESTABLECER CONTRASEÑA (PROPIETARIO)
// ====================================================================

const modalPasswordVisible = ref(false)
const usuarioAPassword = ref<UsuarioListadoDTO | null>(null)
const formPassword = reactive({
  nuevaPassword: '',
  confirmarPassword: '',
})
const cargandoPassword = ref(false)

function abrirModalPassword(u: UsuarioListadoDTO) {
  if (!authStore.isPropietario && authStore.rolId !== null) {
    agregarToast('Acción Restringida', 'Solo el Propietario puede restablecer contraseñas de otros usuarios.', 'warning')
    return
  }
  usuarioAPassword.value = u
  formPassword.nuevaPassword = ''
  formPassword.confirmarPassword = ''
  modalPasswordVisible.value = true
}

async function guardarNuevaPassword() {
  if (!usuarioAPassword.value) return

  if (!formPassword.nuevaPassword.trim()) {
    agregarToast('Campo Requerido', 'Ingrese la nueva contraseña.', 'warning')
    return
  }
  if (formPassword.nuevaPassword !== formPassword.confirmarPassword) {
    agregarToast('No Coinciden', 'Las contraseñas ingresadas no son iguales.', 'warning')
    return
  }

  cargandoPassword.value = true
  try {
    const res = await seguridadService.recuperarContrasena({
      usuario: usuarioAPassword.value.usuario,
      nuevaPassword: formPassword.nuevaPassword,
      usuarioModificacion: authStore.usuarioId || 1,
    })

    agregarToast(
      'Contraseña Restablecida',
      res.mensaje || `Contraseña actualizada para @${usuarioAPassword.value.usuario}. Estado restaurado a Activo.`,
      'success'
    )
    modalPasswordVisible.value = false
    await cargarUsuarios()
  } catch (err: any) {
    agregarToast('Error al Restablecer', extraerError(err), 'danger')
  } finally {
    cargandoPassword.value = false
  }
}

// ====================================================================
// 8. MODAL: DAR DE BAJA LOGICA (ELIMINAR)
// ====================================================================

const modalBajaVisible = ref(false)
const usuarioABaja = ref<UsuarioListadoDTO | null>(null)
const cargandoBaja = ref(false)

function abrirModalBaja(u: UsuarioListadoDTO) {
  if (!authStore.isPropietario && authStore.rolId !== null) {
    agregarToast('Permiso Denegado', 'Solo el Propietario tiene privilegios para dar de baja cuentas.', 'warning')
    return
  }
  usuarioABaja.value = u
  modalBajaVisible.value = true
}

async function confirmarBaja() {
  if (!usuarioABaja.value) return

  cargandoBaja.value = true
  try {
    const res = await seguridadService.darBajaUsuario(
      usuarioABaja.value.usuarioId,
      authStore.usuarioId || 1
    )

    agregarToast('Baja Lógica Exitosa', res.mensaje || `Usuario @${usuarioABaja.value.usuario} dado de baja.`, 'info')
    modalBajaVisible.value = false
    await cargarUsuarios()
  } catch (err: any) {
    agregarToast('Error al Dar de Baja', extraerError(err), 'danger')
  } finally {
    cargandoBaja.value = false
  }
}

// ====================================================================
// 9. FORMATEO DE FECHAS
// ====================================================================

function formatearFecha(fechaStr?: string | null): string {
  if (!fechaStr) return '-'
  try {
    const d = new Date(fechaStr)
    return d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fechaStr
  }
}

onMounted(() => {
  cargarUsuarios()
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

<style scoped>
/* ====================================================================
   ESTILOS MINIMALISTAS Y SOBRIOS - ERP EMPRESARIAL
   Paleta: #0F172A, #1E293B, #F8FAFC, #FFFFFF, #E2E8F0, #CBD5E1
   ==================================================================== */

.user-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  color: #0f172a;
  background-color: #f8fafc;
  min-height: calc(100vh - 80px);
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.text-muted {
  color: #64748b;
}

.text-sm {
  font-size: 0.8rem;
}

/* TOPBAR */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.page-title-box {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.page-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.page-icon svg {
  width: 22px;
  height: 22px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.015em;
  margin: 0;
}

.page-subtitle {
  font-size: 0.85rem;
  color: #475569;
  margin-top: 0.15rem;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* BOTONES */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
  background-color: #0f172a;
  border: 1px solid #0f172a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn-primary:hover:not(:disabled) {
  background-color: #1e293b;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f8fafc;
  border-color: #94a3b8;
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
  background-color: #dc2626;
  border: 1px solid #dc2626;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-danger:hover:not(:disabled) {
  background-color: #b91c1c;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

/* KPI GRID */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.kpi-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
}

.kpi-card-highlight {
  border-color: #fde68a;
  background-color: #fffbeb;
}

.kpi-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.03em;
}

.kpi-value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-value {
  font-size: 1.65rem;
  font-weight: 700;
  color: #0f172a;
}

.kpi-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
}

.kpi-badge.neutral {
  background-color: #f1f5f9;
  color: #475569;
}

.kpi-badge.info {
  background-color: #f0f9ff;
  color: #0369a1;
}

.kpi-badge.success {
  background-color: #f0fdf4;
  color: #166534;
}

.kpi-badge.warning {
  background-color: #fef3c7;
  color: #92400e;
}

.kpi-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* FILTROS */
.filter-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.875rem 1.25rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 280px;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 0.55rem 2rem 0.55rem 2.25rem;
  font-size: 0.85rem;
  color: #0f172a;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  background-color: #ffffff;
  border-color: #0f172a;
}

.search-clear {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1.1rem;
}

.filter-select {
  padding: 0.55rem 0.85rem;
  font-size: 0.85rem;
  color: #0f172a;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.825rem;
  color: #475569;
  font-weight: 500;
  user-select: none;
}

.toggle-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* TABLA */
.table-container {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.85rem;
}

.data-table th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
  vertical-align: middle;
}

.data-table tbody tr:hover {
  background-color: #f8fafc;
}

.data-table tbody tr.row-alert {
  background-color: #fffdf5;
}

.data-table tbody tr.row-alert:hover {
  background-color: #fffbeb;
}

.th-id {
  width: 65px;
}

.th-actions {
  width: 140px;
  text-align: right;
}

.username-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  font-size: 0.825rem;
  color: #0f172a;
}

.sucursal-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.775rem;
  font-weight: 600;
  color: #0369a1;
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.text-xs {
  font-size: 0.75rem;
}

.italic {
  font-style: italic;
}

.user-fullname {
  font-weight: 600;
  color: #0f172a;
}

/* BOTONES DE ACCION EN TABLA */
.td-actions {
  text-align: right;
  white-space: nowrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  color: #475569;
  cursor: pointer;
  margin-left: 0.35rem;
  transition: all 0.15s ease;
}

.action-btn svg {
  width: 15px;
  height: 15px;
}

.action-btn:hover {
  background-color: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.action-btn-warning {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.action-btn-warning:hover {
  background-color: #fde68a;
  color: #78350f;
}

.action-btn-danger:hover {
  background-color: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

/* ESTADOS VACIOS / CARGA */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #cbd5e1;
  margin-bottom: 0.75rem;
}

.empty-state h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
}

.empty-state p {
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.spinner-large {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #0f172a;
  animation: spin 0.8s linear infinite;
  margin-bottom: 0.75rem;
}

/* MODALES */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.modal-card-sm {
  max-width: 440px;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}

.modal-subtitle {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.15rem;
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
}

.btn-close-modal:hover {
  color: #0f172a;
}

.modal-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.flex-1 {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
}

.form-input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  font-size: 0.85rem;
  color: #0f172a;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  transition: all 0.15s ease;
}

.form-input:focus {
  border-color: #0f172a;
}

.form-hint {
  font-size: 0.725rem;
  color: #64748b;
  line-height: 1.3;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.modal-body-confirm {
  padding: 1.5rem;
  font-size: 0.9rem;
  color: #334155;
  line-height: 1.5;
}

.confirm-note {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.confirm-note code {
  background-color: #f1f5f9;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.info-callout {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 0.8rem;
  line-height: 1.4;
}

.info-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

/* TOASTS */
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 380px;
}

.toast-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
  font-size: 0.825rem;
}

.toast-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.toast-title {
  font-weight: 700;
  color: #0f172a;
}

.toast-message {
  color: #475569;
  line-height: 1.35;
}

.toast-close {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.toast-success {
  border-left: 4px solid #16a34a;
}

.toast-danger {
  border-left: 4px solid #dc2626;
}

.toast-warning {
  border-left: 4px solid #d97706;
}

.toast-info {
  border-left: 4px solid #2563eb;
}

/* SPINNER */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

