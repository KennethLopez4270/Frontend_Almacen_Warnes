import axios from 'axios'
import { API_URL, instalarInterceptorSesion } from '@/config/api'

const apiClientes = axios.create({
  baseURL: import.meta.env.VITE_API_URL || API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

instalarInterceptorSesion(apiClientes)

// Interceptor JWT
apiClientes.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de errores amigables
apiClientes.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error al procesar los datos del cliente.'
    if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'object') {
        cleanMessage = data.mensaje || data.error || data.message || cleanMessage
      } else if (typeof data === 'string' && data.trim()) {
        cleanMessage = data
      }
    } else if (error.request) {
      cleanMessage = 'No se pudo conectar con el servidor (backend inalcanzable).'
    } else if (error.message) {
      cleanMessage = error.message
    }
    ;(error as any).userMessage = cleanMessage
    return Promise.reject(error)
  }
)

export interface Cliente {
  clienteId: number
  nit: string
  nombres: string | null
  apellidos: string | null
  nombreRazonSocial: string | null
  telefono: string | null
  marcaBaja: boolean
  fechaCreacion?: string
  fechaModificacion?: string
  totalCompras?: number
  montoTotalComprado?: number
}

export interface ClienteInput {
  clienteId?: number | null
  nit: string
  nombres?: string
  apellidos?: string
  nombreRazonSocial?: string
  telefono?: string
}

export const clienteService = {
  /**
   * Listado de clientes con filtros de búsqueda y estado.
   * Invoca sp_clientes_listar.
   */
  async listar(busqueda?: string, estado: string = 'ACTIVOS'): Promise<Cliente[]> {
    const params: Record<string, string> = { estado }
    if (busqueda && busqueda.trim()) {
      params.busqueda = busqueda.trim()
    }
    const { data } = await apiClientes.get<Cliente[]>('/clientes', { params })
    return data
  },

  /**
   * Obtener un cliente específico por ID.
   */
  async obtenerPorId(id: number): Promise<Cliente> {
    const { data } = await apiClientes.get<Cliente>(`/clientes/${id}`)
    return data
  },

  /**
   * Buscar cliente activo por NIT/CI exacto.
   */
  async buscarPorNit(nit: string): Promise<Cliente | null> {
    const { data } = await apiClientes.get<Cliente | null>('/clientes/buscar', {
      params: { nit: nit.trim() },
    })
    return data
  },

  /**
   * Registrar o reactivar cliente (sp_clientes_insertar).
   */
  async crear(dto: ClienteInput, usuarioCreacion: number = 1): Promise<Cliente> {
    const { data } = await apiClientes.post<Cliente>('/clientes', dto, {
      params: { usuarioCreacion },
    })
    return data
  },

  /**
   * Actualizar datos de un cliente existente (sp_clientes_modificar).
   */
  async actualizar(id: number, dto: ClienteInput, usuarioModificacion: number = 1): Promise<Cliente> {
    const { data } = await apiClientes.put<Cliente>(`/clientes/${id}`, dto, {
      params: { usuarioModificacion },
    })
    return data
  },

  /**
   * Dar de baja lógica a un cliente (sp_clientes_eliminar).
   */
  async eliminar(id: number, usuarioModificacion: number = 1): Promise<void> {
    await apiClientes.delete(`/clientes/${id}`, {
      params: { usuarioModificacion },
    })
  },
}
