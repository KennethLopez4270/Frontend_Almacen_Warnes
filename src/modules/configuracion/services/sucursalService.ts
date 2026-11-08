import axios from 'axios'

// ====================================================================
// CLIENTE AXIOS DEDICADO A SUCURSALES FÍSICAS
// ====================================================================

const apiSucursales = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

// Interceptor para inyectar token JWT
apiSucursales.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta para normalizar mensajes de error
apiSucursales.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error al procesar la operación de sucursal.'

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
// INTERFACES TIPADAS (MAPEO A DTOS DE SPRING BOOT)
// ====================================================================

export interface SucursalDTO {
  sucursalId: number
  codigoInterno: string
  ciudad: string
  direccion: string
  telefono?: string
  fechaCreacion?: string
  cantidadUsuarios: number
  marcaBaja?: boolean
}

export interface CrearSucursalDTO {
  codigoInterno: string
  ciudad: string
  direccion: string
  telefono?: string
}

export interface ModificarSucursalDTO {
  codigoInterno?: string
  ciudad?: string
  direccion?: string
  telefono?: string
}

// ====================================================================
// SERVICIO DE SUCURSALES (ENDPOINTS /api/sucursales)
// ====================================================================

export const sucursalService = {
  /**
   * Consulta el listado de sucursales ejecutando fn_sucursales_listar
   */
  async listar(mostrarBajas: boolean = false, textoBusqueda?: string): Promise<SucursalDTO[]> {
    const params: Record<string, any> = { mostrarBajas }
    if (textoBusqueda && textoBusqueda.trim()) {
      params.textoBusqueda = textoBusqueda.trim()
    }
    const { data } = await apiSucursales.get<SucursalDTO[]>('/sucursales/listar-tabla', { params })
    return data
  },

  /**
   * Registra una nueva sucursal (exclusivo para Propietario)
   */
  async crear(payload: CrearSucursalDTO): Promise<{ mensaje: string; sucursalId: number }> {
    const { data } = await apiSucursales.post<{ mensaje: string; sucursalId: number }>('/sucursales', payload)
    return data
  },

  /**
   * Modifica los datos de una sucursal existente
   */
  async modificar(id: number, payload: ModificarSucursalDTO): Promise<{ mensaje: string; sucursalId: number }> {
    const { data } = await apiSucursales.put<{ mensaje: string; sucursalId: number }>(`/sucursales/${id}`, payload)
    return data
  },

  /**
   * Da de baja lógica a una sucursal
   */
  async eliminar(id: number): Promise<{ mensaje: string; sucursalId: number }> {
    const { data } = await apiSucursales.delete<{ mensaje: string; sucursalId: number }>(`/sucursales/${id}`)
    return data
  },
}

