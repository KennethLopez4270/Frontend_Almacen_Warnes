import axios from 'axios'

// ====================================================================
// CLIENTE AXIOS DEDICADO A CONCEPTOS PARAMÉTRICOS
// ====================================================================

const apiConceptos = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

// Interceptor para inyectar token JWT si existe en localStorage
apiConceptos.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta para normalizar errores
apiConceptos.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error al procesar los conceptos paramétricos.'

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

export interface ConceptoItemDTO {
  conceptoId: number
  grupoId: number
  codigo: number
  descripcion: string
}

export interface CrearConceptoDTO {
  grupoId: number
  descripcion: string
  usuarioCreacion?: number
}

export interface ModificarConceptoDTO {
  descripcion: string
  usuarioModificacion?: number
}

// ====================================================================
// SERVICIO DE CONCEPTOS (INVOCACIÓN A ENDPOINTS /api/conceptos)
// ====================================================================

export const conceptoService = {
  /**
   * Consulta conceptos activos de un grupo usando fn_conceptos_listar_por_grupo
   */
  async listarPorGrupo(grupoId: number): Promise<ConceptoItemDTO[]> {
    const { data } = await apiConceptos.get<ConceptoItemDTO[]>(`/conceptos/grupo/${grupoId}`)
    return data
  },

  /**
   * Registra un nuevo concepto invocando sp_conceptos_insertar con RBAC
   */
  async crearConcepto(payload: CrearConceptoDTO): Promise<{ mensaje: string; conceptoId: number }> {
    const { data } = await apiConceptos.post<{ mensaje: string; conceptoId: number }>('/conceptos', payload)
    return data
  },

  /**
   * Modifica un concepto invocando sp_conceptos_modificar
   */
  async modificarConcepto(id: number, payload: ModificarConceptoDTO): Promise<{ mensaje: string }> {
    const { data } = await apiConceptos.put<{ mensaje: string }>(`/conceptos/${id}`, payload)
    return data
  },

  /**
   * Da de baja lógica a un concepto invocando sp_conceptos_eliminar
   */
  async eliminarConcepto(id: number): Promise<{ mensaje: string }> {
    const { data } = await apiConceptos.delete<{ mensaje: string }>(`/conceptos/${id}`)
    return data
  },
}

