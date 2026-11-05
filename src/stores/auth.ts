import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { seguridadService, type LoginRequestDTO } from '@/modules/modulo_seguridad/services/seguridadService'
import { ROLES_USUARIO, MAPA_ROLES } from '@/constants/mapeoEstados'

const STORAGE_KEYS = {
  TOKEN: 'tw_jwt_token',
  USER_ID: 'tw_user_id',
  SUCURSAL_ID: 'tw_sucursal_id',
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
    sucursalId.value = res.sucursalId ?? null
    usuario.value = res.usuario
    nombres.value = res.nombres
    apellidos.value = res.apellidos
    rolId.value = res.rolId
    estado.value = res.estado ?? 1

    // Persistir en localStorage
    localStorage.setItem(STORAGE_KEYS.TOKEN, res.token)
    localStorage.setItem(STORAGE_KEYS.USER_ID, String(res.usuarioId))
    if (res.sucursalId !== undefined && res.sucursalId !== null) {
      localStorage.setItem(STORAGE_KEYS.SUCURSAL_ID, String(res.sucursalId))
    } else {
      localStorage.removeItem(STORAGE_KEYS.SUCURSAL_ID)
    }
    localStorage.setItem(STORAGE_KEYS.USERNAME, res.usuario)
    localStorage.setItem(STORAGE_KEYS.NOMBRES, res.nombres)
    localStorage.setItem(STORAGE_KEYS.APELLIDOS, res.apellidos)
    localStorage.setItem(STORAGE_KEYS.ROL_ID, String(res.rolId))
    if (res.estado !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ESTADO, String(res.estado))
    }

    return res
  }

  function logout() {
    token.value = null
    usuarioId.value = null
    sucursalId.value = null
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
    usuario,
    nombres,
    apellidos,
    rolId,
    estado,
    isAuthenticated,
    isPropietario,
    isSupervisor,
    isCajero,
    nombreCompleto,
    rolNombre,
    login,
    logout,
    solicitarRecuperacion,
  }
})

