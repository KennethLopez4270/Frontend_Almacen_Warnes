import { ref, computed } from 'vue'
import { usuarioService, type UsuarioDTO } from '@/services/usuarioService'
import { useAuthStore } from '@/stores/auth'

// Estado reactivo compartido a nivel de módulo (Singleton)
const listaUsuarios = ref<UsuarioDTO[]>([])
const usuarioActivoId = ref<number>(
  Number(localStorage.getItem('tw_user_id')) || 1
)
const cargandoUsuarios = ref<boolean>(false)
const errorUsuarios = ref<string | null>(null)

export function useUsuarioActivo() {
  let authStore: ReturnType<typeof useAuthStore> | null = null
  try {
    authStore = useAuthStore()
    if (authStore.usuarioId && usuarioActivoId.value !== authStore.usuarioId) {
      usuarioActivoId.value = authStore.usuarioId
    }
  } catch {
    // Si se invoca fuera del contexto de Pinia, fallback a localStorage
  }

  const cargarUsuarios = async () => {
    try {
      cargandoUsuarios.value = true
      errorUsuarios.value = null
      const data = await usuarioService.listarUsuarios()
      listaUsuarios.value = data
      
      // Sincronizar usuario activo si viene de authStore o localStorage
      const authUserId = authStore?.usuarioId || Number(localStorage.getItem('tw_user_id'))
      if (authUserId && data.some(u => (u.usuarioId || u.usuario_id) === authUserId)) {
        usuarioActivoId.value = authUserId
      } else if (data.length > 0 && !data.some(u => (u.usuarioId || u.usuario_id) === usuarioActivoId.value)) {
        const primero = data[0]
        if (primero) {
          usuarioActivoId.value = primero.usuarioId || primero.usuario_id || 1
        }
      }
    } catch (err: any) {
      console.error('Error al cargar la lista de usuarios desde la base de datos:', err)
      errorUsuarios.value = err.message || 'Error al conectar con el servicio de usuarios'
    } finally {
      cargandoUsuarios.value = false
    }
  }

  const usuarioActivo = computed<UsuarioDTO | undefined>(() => {
    return listaUsuarios.value.find(u => (u.usuarioId || u.usuario_id) === usuarioActivoId.value)
  })

  // rolActivo numérico: 1: Cajero, 2: Supervisor, 3: Propietario (extraído de authStore o BD)
  const rolActivo = computed<number>(() => {
    if (authStore?.rolId) {
      return authStore.rolId
    }
    const storedRol = Number(localStorage.getItem('tw_rol_id'))
    if (storedRol) {
      return storedRol
    }
    if (usuarioActivo.value) {
      return usuarioActivo.value.rolId ?? usuarioActivo.value.rol_id ?? 1
    }
    return usuarioActivoId.value === 1 ? 3 : 1
  })

  const sucursalActivaId = computed<number | null>(() => {
    if (authStore?.sucursalId !== undefined && authStore?.sucursalId !== null) {
      return authStore.sucursalId
    }
    const storedSuc = localStorage.getItem('tw_sucursal_id')
    if (storedSuc) {
      return Number(storedSuc)
    }
    if (usuarioActivo.value) {
      return usuarioActivo.value.sucursalId ?? usuarioActivo.value.sucursal_id ?? null
    }
    return null
  })

  const esPropietario = computed<boolean>(() => rolActivo.value === 3)
  const esSupervisor = computed<boolean>(() => rolActivo.value === 2)
  const esCajero = computed<boolean>(() => rolActivo.value === 1)
  const esSupervisorOPropietario = computed<boolean>(() => rolActivo.value === 2 || rolActivo.value === 3)

  /**
   * Resuelve el nombre real completo y rol de un usuario a partir de su ID usando los datos de PostgreSQL.
   */
  const resolverNombreUsuario = (id: number | null | undefined): string => {
    if (!id) return 'Sistema'
    const encontrado = listaUsuarios.value.find(u => (u.usuarioId || u.usuario_id) === id)
    if (encontrado) {
      const nombre = encontrado.nombreCompleto || encontrado.nombre_completo || `${encontrado.nombres} ${encontrado.apellidos}`
      const rol = encontrado.rolNombre || encontrado.rol_nombre || 'Personal'
      return `${nombre.trim()} (${rol})`
    }
    return `Usuario #${id}`
  }

  return {
    listaUsuarios,
    usuarioActivoId,
    usuarioActivo,
    rolActivo,
    sucursalActivaId,
    cargandoUsuarios,
    errorUsuarios,
    esPropietario,
    esSupervisor,
    esCajero,
    esSupervisorOPropietario,
    cargarUsuarios,
    resolverNombreUsuario,
  }
}
