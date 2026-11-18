import axios from 'axios'
import { API_URL, URL_BASE } from '@/config/api'

export { API_URL, URL_BASE }

/**
 * Cliente HTTP Axios configurado para comunicar el Frontend con el Backend
 * en Spring Boot bajo la URL centralizada /api/inventario
 */
const api = axios.create({
  baseURL: `${API_URL}/inventario`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

// Inyectar token JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tw_jwt_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Interceptor de respuesta para capturar y normalizar errores de la base de datos
 * y excepciones de Spring Boot (ej: RAISE EXCEPTION, 400 Bad Request, 409 Conflict).
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let cleanMessage = 'Ocurrió un error inesperado al procesar la solicitud.'

    if (error.response?.data) {
      const data = error.response.data
      if (typeof data === 'object') {
        cleanMessage = data.mensaje || data.message || cleanMessage
      } else if (typeof data === 'string' && data.trim()) {
        cleanMessage = data
      }
    } else if (error.request) {
      cleanMessage = `No se pudo conectar con el servidor (backend inalcanzable en ${URL_BASE}).`
    } else if (error.message) {
      cleanMessage = error.message
    }

    // Adjuntar mensaje limpio en el error para fácil consumo en vistas
    error.userMessage = cleanMessage

    return Promise.reject(error)
  }
)

export default api
