import axios from 'axios'

// ====================================================================
// CLIENTE AXIOS DEDICADO AL MODULO DE SEGURIDAD (SPRING BOOT)
// ====================================================================

const apiSeguridad = axios.create({
  baseURL: import.meta.env.VITE_API_SEGURIDAD_URL || 'http://localhost:8080/api/seguridad',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

// Interceptor para inyectar token JWT si existe en localStorage
apiSeguridad.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta para normalizar errores
apiSeguridad.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error inesperado en el módulo de seguridad.'

    if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'object') {
        cleanMessage = data.mensaje || data.error || data.message || cleanMessage
      } else if (typeof data === 'string' && data.trim()) {
        cleanMessage = data
      }
    } else if (error.request) {
      cleanMessage = 'No se pudo conectar con el servidor (backend inalcanzable en http://localhost:8080).'
    } else if (error.message) {
      cleanMessage = error.message
    }

    ;(error as any).userMessage = cleanMessage
    return Promise.reject(error)
  }
)

// ====================================================================
// INTERFACES TIPADAS (MAPEO EXACTO A DTOS DE SPRING BOOT)
// ====================================================================

export interface LoginRequestDTO {
  usuario: string
  password: string
}

export interface LoginResponseDTO {
  token: string
  usuarioId: number
  sucursalId?: number | null
  usuario: string
  nombres: string
  apellidos: string
  rolId: number
  estado?: number
  mensaje: string
}

export interface SolicitarRecuperacionDTO {
  usuario: string
}

export interface RecuperarContrasenaDTO {
  usuario: string
  nuevaPassword: string
  usuarioModificacion: number
}

export interface CambiarContrasenaDTO {
  usuarioId: number
  passwordActual: string
  nuevaPassword: string
}

export interface UsuarioListadoDTO {
  usuarioId: number
  sucursalId?: number | null
  usuario: string
  nombres: string
  apellidos: string
  rolId: number
  descripcionRol: string
  fechaCreacion: string
  estado?: number
}

export interface UsuarioDTO {
  usuarioId: number
  sucursalId?: number | null
  usuario: string
  nombres: string
  apellidos: string
  rolId: number
  estado?: number
  marcaBaja: boolean
  fechaCreacion: string
  usuarioCreacion: number
  fechaModificacion?: string
  usuarioModificacion?: number
}

export interface UsuarioRegistroDTO {
  usuario: string
  sucursalId?: number | null
  nombres: string
  apellidos: string
  rolId: number
  password: string
  usuarioCreacion: number
}

export interface UsuarioModificarDTO {
  sucursalId?: number | null
  nombres: string
  apellidos: string
  rolId: number
  usuarioModificacion: number
}

// ====================================================================
// SERVICIO DE SEGURIDAD Y USUARIOS
// ====================================================================

export const seguridadService = {
  // --- AUTH / LOGIN ---
  async login(credenciales: LoginRequestDTO): Promise<LoginResponseDTO> {
    const response = await apiSeguridad.post<LoginResponseDTO>('/auth/login', credenciales)
    return response.data
  },

  async solicitarRecuperacion(usuario: string): Promise<{ mensaje: string }> {
    const response = await apiSeguridad.post<{ mensaje: string }>('/auth/solicitar-recuperacion', {
      usuario,
    })
    return response.data
  },

  async recuperarContrasena(datos: RecuperarContrasenaDTO): Promise<{ mensaje: string }> {
    const response = await apiSeguridad.post<{ mensaje: string }>('/auth/recuperar-contrasena', datos)
    return response.data
  },

  async cambiarContrasena(datos: CambiarContrasenaDTO): Promise<{ mensaje: string }> {
    const response = await apiSeguridad.post<{ mensaje: string }>('/auth/cambiar-contrasena', datos)
    return response.data
  },

  // --- CRUD USUARIOS ---
  async listarUsuariosTabla(
    mostrarBajas = false,
    rolId?: number | null,
    sucursalId?: number | null,
    textoBusqueda?: string
  ): Promise<UsuarioListadoDTO[]> {
    const params: Record<string, any> = {
      mostrarBajas,
    }
    if (rolId !== null && rolId !== undefined && rolId !== 0) {
      params.rolId = rolId
    }
    if (sucursalId !== null && sucursalId !== undefined && sucursalId !== 0) {
      params.sucursalId = sucursalId
    }
    if (textoBusqueda && textoBusqueda.trim() !== '') {
      params.textoBusqueda = textoBusqueda.trim()
    }

    const response = await apiSeguridad.get<UsuarioListadoDTO[]>('/usuarios/listar-tabla', { params })
    return response.data
  },

  async listarUsuariosActivos(): Promise<UsuarioDTO[]> {
    const response = await apiSeguridad.get<UsuarioDTO[]>('/usuarios')
    return response.data
  },

  async obtenerUsuarioPorId(id: number): Promise<UsuarioDTO> {
    const response = await apiSeguridad.get<UsuarioDTO>(`/usuarios/${id}`)
    return response.data
  },

  async registrarUsuario(
    datos: UsuarioRegistroDTO
  ): Promise<{ mensaje: string; usuarioId: number }> {
    const response = await apiSeguridad.post<{ mensaje: string; usuarioId: number }>(
      '/usuarios',
      datos
    )
    return response.data
  },

  async modificarUsuario(
    id: number,
    datos: UsuarioModificarDTO
  ): Promise<{ mensaje: string }> {
    const response = await apiSeguridad.put<{ mensaje: string }>(`/usuarios/${id}`, datos)
    return response.data
  },

  async darBajaUsuario(
    id: number,
    usuarioModificacion: number
  ): Promise<{ mensaje: string }> {
    const response = await apiSeguridad.delete<{ mensaje: string }>(`/usuarios/${id}`, {
      params: { usuarioModificacion },
    })
    return response.data
  },
}

export default seguridadService

