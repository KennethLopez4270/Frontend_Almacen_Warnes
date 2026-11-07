import { ref, computed, reactive, onMounted } from 'vue'
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
} from '../services/seguridadService'
import { useAuthStore } from '@/stores/auth'

export const authStore = useAuthStore()

// ====================================================================
// 1. ESTADO REACTIVO Y LISTADOS
// ====================================================================

export const cargando = ref(false)
export const usuarios = ref<UsuarioListadoDTO[]>([])
export const usuariosActivosDetalle = ref<UsuarioDTO[]>([])

// Filtros
export const searchQuery = ref('')
export const selectedRol = ref<number | ''>('')
export const selectedSucursal = ref<number | ''>('')
export const mostrarBajas = ref(false)

// ====================================================================
// 2. SISTEMA DE TOASTS
// ====================================================================

export interface ToastItem {
  id: number
  titulo: string
  mensaje: string
  tipo: 'success' | 'danger' | 'warning' | 'info'
}

export const toasts = ref<ToastItem[]>([])
export let toastSeq = 0

export function agregarToast(
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

export function cerrarToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function extraerError(err: any): string {
  return err.userMessage || err.message || 'Error al procesar la operación'
}

// ====================================================================
// 3. CARGA DE DATOS DESDE SPRING BOOT & POSTGRESQL
// ====================================================================

export async function cargarUsuarios() {
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
export const mapaEstadosPorId = computed(() => {
  const map: Record<number, number> = {}
  usuariosActivosDetalle.value.forEach((u) => {
    map[u.usuarioId] = u.estado ?? 1
  })
  return map
})

export function obtenerEstadoUsuario(usuarioId: number): number {
  return mapaEstadosPorId.value[usuarioId] ?? 1
}

// ====================================================================
// 4. METRICAS / KPIS
// ====================================================================

export const totalUsuarios = computed(() => usuarios.value.length)
export const totalCajeros = computed(() => usuarios.value.filter((u) => u.rolId === ROLES_USUARIO.CAJERO).length)
export const totalSupervisores = computed(
  () => usuarios.value.filter((u) => u.rolId === ROLES_USUARIO.SUPERVISOR).length
)
export const totalSolicitudesRecuperacion = computed(() => {
  return usuariosActivosDetalle.value.filter(
    (u) => u.estado === ESTADOS_USUARIO.SOLICITA_RECUPERACION
  ).length
})

// ====================================================================
// 5. MODAL: REGISTRAR NUEVO USUARIO
// ====================================================================

export const modalCrearVisible = ref(false)
export const formCrear = reactive<UsuarioRegistroDTO>({
  usuario: '',
  sucursalId: null,
  nombres: '',
  apellidos: '',
  rolId: ROLES_USUARIO.CAJERO,
  password: '',
  usuarioCreacion: authStore.usuarioId || 1,
})
export const cargandoCrear = ref(false)

export function abrirModalCrear() {
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

export async function guardarNuevoUsuario() {
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

export const modalModificarVisible = ref(false)
export const usuarioAEditar = ref<UsuarioListadoDTO | null>(null)
export const formModificar = reactive<UsuarioModificarDTO>({
  sucursalId: null,
  nombres: '',
  apellidos: '',
  rolId: ROLES_USUARIO.CAJERO,
  usuarioModificacion: authStore.usuarioId || 1,
})
export const cargandoModificar = ref(false)

export function abrirModalModificar(u: UsuarioListadoDTO) {
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

export async function guardarModificacion() {
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

export const modalPasswordVisible = ref(false)
export const usuarioAPassword = ref<UsuarioListadoDTO | null>(null)
export const formPassword = reactive({
  nuevaPassword: '',
  confirmarPassword: '',
})
export const cargandoPassword = ref(false)

export function abrirModalPassword(u: UsuarioListadoDTO) {
  if (!authStore.isPropietario && authStore.rolId !== null) {
    agregarToast('Acción Restringida', 'Solo el Propietario puede restablecer contraseñas de otros usuarios.', 'warning')
    return
  }
  usuarioAPassword.value = u
  formPassword.nuevaPassword = ''
  formPassword.confirmarPassword = ''
  modalPasswordVisible.value = true
}

export async function guardarNuevaPassword() {
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

export const modalBajaVisible = ref(false)
export const usuarioABaja = ref<UsuarioListadoDTO | null>(null)
export const cargandoBaja = ref(false)

export function abrirModalBaja(u: UsuarioListadoDTO) {
  if (!authStore.isPropietario && authStore.rolId !== null) {
    agregarToast('Permiso Denegado', 'Solo el Propietario tiene privilegios para dar de baja cuentas.', 'warning')
    return
  }
  usuarioABaja.value = u
  modalBajaVisible.value = true
}

export async function confirmarBaja() {
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

export function formatearFecha(fechaStr?: string | null): string {
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

export async function inicializarUsuarios() {
  await cargarUsuarios()
}
export { ROLES_USUARIO, MAPA_ROLES, ESTADOS_USUARIO, MAPA_ESTADOS_USUARIO }
