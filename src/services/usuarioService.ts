import axios from 'axios'

const apiUsuarios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

export interface UsuarioDTO {
  usuarioId: number
  usuario_id?: number
  sucursalId?: number | null
  sucursal_id?: number | null
  usuario: string
  nombres: string
  apellidos: string
  rolId: number
  rol_id?: number
  rolNombre: string
  rol_nombre?: string
  nombreCompleto: string
  nombre_completo?: string
  marcaBaja: boolean
  marca_baja?: boolean
}

export const usuarioService = {
  async listarUsuarios(): Promise<UsuarioDTO[]> {
    try {
      const response = await apiUsuarios.get<UsuarioDTO[]>('/seguridad/usuarios')
      return response.data
    } catch {
      const response = await apiUsuarios.get<UsuarioDTO[]>('/usuarios')
      return response.data
    }
  },

  async obtenerUsuarioPorId(id: number): Promise<UsuarioDTO> {
    try {
      const response = await apiUsuarios.get<UsuarioDTO>(`/seguridad/usuarios/${id}`)
      return response.data
    } catch {
      const response = await apiUsuarios.get<UsuarioDTO>(`/usuarios/${id}`)
      return response.data
    }
  },
}

export default usuarioService

