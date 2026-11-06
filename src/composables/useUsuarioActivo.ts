import { ref, computed } from 'vue'
import { usuarioService, type UsuarioDTO } from '@/services/usuarioService'

// Estado reactivo compartido a nivel de módulo (Singleton)
const listaUsuarios = ref<UsuarioDTO[]>([])
const usuarioActivoId = ref<number>(1) // Kenneth Gabriel Lopez Castillo (Propietario en BD)
const cargandoUsuarios = ref<boolean>(false)
const errorUsuarios = ref<string | null>(null)

export function useUsuarioActivo() {
  const cargarUsuarios = async () => {
    try {
      cargandoUsuarios.value = true
      errorUsuarios.value = null
      const data = await usuarioService.listarUsuarios()
      listaUsuarios.value = data
      // Si el usuarioActivoId no está en la lista obtenida, seleccionamos el primer usuario disponible
      if (data.length > 0 && !data.some(u => (u.usuarioId || u.usuario_id) === usuarioActivoId.value)) {
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

  // rolActivo numérico: 1: Cajero, 2: Supervisor, 3: Propietario (extraído directamente del rol_id de la BD)
  const rolActivo = computed<number>(() => {
    if (usuarioActivo.value) {
      return usuarioActivo.value.rolId ?? usuarioActivo.value.rol_id ?? 1
    }
    // Si aún no ha cargado la lista, por defecto 1 es Propietario en la BD
    return usuarioActivoId.value === 1 ? 3 : 1
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
