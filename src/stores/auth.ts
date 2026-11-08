import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { seguridadService, type LoginRequestDTO } from '@/modules/seguridad/services/seguridadService'
import { ROLES_USUARIO, MAPA_ROLES } from '@/constants/mapeoEstados'

const STORAGE_KEYS = {
  TOKEN: 'tw_jwt_token',
  USER_ID: 'tw_user_id',
  SUCURSAL_ID: 'tw_sucursal_id',
  SUCURSAL_ORIGINAL: 'tw_sucursal_original',
  SUCURSAL_NOMBRE: 'tw_sucursal_nombre',
  USERNAME: 'tw_username',
  NOMBRES: 'tw_nombres',
  APELLIDOS: 'tw_apellidos',
  ROL_ID: 'tw_rol_id',
  ESTADO: 'tw_estado',
}

export const useAuthStore = defineStore('auth', () => {
  // State inicial recuperado de localStorage
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEYS.TOKEN))
  const usuarioId = ref<number | null>(
    localStorage.getItem(STORAGE_KEYS.USER_ID)
      ? Number(localStorage.getItem(STORAGE_KEYS.USER_ID))
      : null
  )
  const sucursalId = ref<number | null>(
    localStorage.getItem(STORAGE_KEYS.SUCURSAL_ID)
      ? Number(localStorage.getItem(STORAGE_KEYS.SUCURSAL_ID))
      : null
  )
  const sucursalOriginal = ref<number | null>(
    localStorage.getItem(STORAGE_KEYS.SUCURSAL_ORIGINAL) !== null
      ? Number(localStorage.getItem(STORAGE_KEYS.SUCURSAL_ORIGINAL))
      : null
  )
  const sucursalNombre = ref<string | null>(localStorage.getItem(STORAGE_KEYS.SUCURSAL_NOMBRE))
  const usuario = ref<string | null>(localStorage.getItem(STORAGE_KEYS.USERNAME))
  const nombres = ref<string | null>(localStorage.getItem(STORAGE_KEYS.NOMBRES))
  const apellidos = ref<string | null>(localStorage.getItem(STORAGE_KEYS.APELLIDOS))
  const rolId = ref<number | null>(
    localStorage.getItem(STORAGE_KEYS.ROL_ID)
      ? Number(localStorage.getItem(STORAGE_KEYS.ROL_ID))
      : null
  )
  const estado = ref<number | null>(
    localStorage.getItem(STORAGE_KEYS.ESTADO)
      ? Number(localStorage.getItem(STORAGE_KEYS.ESTADO))
      : null
  )

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!usuarioId.value)
  const isPropietario = computed(() => rolId.value === ROLES_USUARIO.PROPIETARIO)
  const isSupervisor = computed(() => rolId.value === ROLES_USUARIO.SUPERVISOR)
  const isCajero = computed(() => rolId.value === ROLES_USUARIO.CAJERO)

  // Si el usuario en la BD tiene sucursal_id = NULL
  const sinSucursalAsignada = computed(() => {
    return isAuthenticated.value && sucursalOriginal.value === null
  })

  // Si es propietario y aún no ha seleccionado una sucursal activa (> 0)
  const necesitaElegirSucursal = computed(() => {
    return isAuthenticated.value && isPropietario.value && (!sucursalId.value || sucursalId.value === 0)
  })

  // Si el usuario tiene permisos para cambiar de sucursal en cualquier momento
  const puedeCambiarSucursal = computed(() => {
    return isAuthenticated.value && isPropietario.value
  })

  const nombreCompleto = computed(() => {
    if (!nombres.value && !apellidos.value) return usuario.value || 'Usuario'
    return `${nombres.value || ''} ${apellidos.value || ''}`.trim()
  })

  const rolNombre = computed(() => {
    if (!rolId.value) return 'Sin Rol'
    return MAPA_ROLES[rolId.value]?.label || `Rol #${rolId.value}`
  })

  // Actions
  async function login(credenciales: LoginRequestDTO) {
    const res = await seguridadService.login(credenciales)

    token.value = res.token
    usuarioId.value = res.usuarioId
    usuario.value = res.usuario
    nombres.value = res.nombres
    apellidos.value = res.apellidos
    rolId.value = res.rolId
    estado.value = res.estado ?? 1

    // Manejo de sucursales según rol y valor devuelto
    if (res.sucursalId === undefined || res.sucursalId === null) {
      sucursalOriginal.value = null
      sucursalId.value = null
      sucursalNombre.value = null
      localStorage.removeItem(STORAGE_KEYS.SUCURSAL_ORIGINAL)
      localStorage.removeItem(STORAGE_KEYS.SUCURSAL_ID)
      localStorage.removeItem(STORAGE_KEYS.SUCURSAL_NOMBRE)
    } else if (res.sucursalId === 0) {
      // Propietario: inicia en 0 hasta que seleccione una sucursal
      sucursalOriginal.value = 0
      sucursalId.value = 0
      sucursalNombre.value = null
      localStorage.setItem(STORAGE_KEYS.SUCURSAL_ORIGINAL, '0')
      localStorage.setItem(STORAGE_KEYS.SUCURSAL_ID, '0')
      localStorage.removeItem(STORAGE_KEYS.SUCURSAL_NOMBRE)
    } else {
      // Cajero o Supervisor con sucursal fija asignada
      sucursalOriginal.value = res.sucursalId
      sucursalId.value = res.sucursalId
      localStorage.setItem(STORAGE_KEYS.SUCURSAL_ORIGINAL, String(res.sucursalId))
      localStorage.setItem(STORAGE_KEYS.SUCURSAL_ID, String(res.sucursalId))
    }

    // Persistir resto de datos en localStorage
    localStorage.setItem(STORAGE_KEYS.TOKEN, res.token)
    localStorage.setItem(STORAGE_KEYS.USER_ID, String(res.usuarioId))
    localStorage.setItem(STORAGE_KEYS.USERNAME, res.usuario)
    localStorage.setItem(STORAGE_KEYS.NOMBRES, res.nombres)
    localStorage.setItem(STORAGE_KEYS.APELLIDOS, res.apellidos)
    localStorage.setItem(STORAGE_KEYS.ROL_ID, String(res.rolId))
    if (res.estado !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ESTADO, String(res.estado))
    }

    return res
  }

  function setSucursalActiva(id: number, nombre?: string) {
    sucursalId.value = id
    localStorage.setItem(STORAGE_KEYS.SUCURSAL_ID, String(id))
    if (nombre) {
      sucursalNombre.value = nombre
      localStorage.setItem(STORAGE_KEYS.SUCURSAL_NOMBRE, nombre)
    }
  }

  function logout() {
    token.value = null
    usuarioId.value = null
    sucursalId.value = null
    sucursalOriginal.value = null
    sucursalNombre.value = null
    usuario.value = null
    nombres.value = null
    apellidos.value = null
    rolId.value = null
    estado.value = null

    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k))
  }

  async function solicitarRecuperacion(nombreUsuario: string) {
    return await seguridadService.solicitarRecuperacion(nombreUsuario)
  }

  return {
    token,
    usuarioId,
    sucursalId,
    sucursalOriginal,
    sucursalNombre,
    usuario,
    nombres,
    apellidos,
    rolId,
    estado,
    isAuthenticated,
    isPropietario,
    isSupervisor,
    isCajero,
    sinSucursalAsignada,
    necesitaElegirSucursal,
    puedeCambiarSucursal,
    nombreCompleto,
    rolNombre,
    login,
    setSucursalActiva,
    logout,
    solicitarRecuperacion,
  }
})
