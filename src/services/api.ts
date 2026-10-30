import axios from 'axios'

/**
 * Cliente HTTP Axios configurado para comunicar el Frontend con el Backend
 * en Spring Boot expuesto en http://localhost:8080/api/inventario
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/inventario',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

/**
 * Interceptor de respuesta para capturar y normalizar errores de la base de datos
 * y excepciones de Spring Boot (ej: RAISE EXCEPTION, 400 Bad Request, 409 Conflict).
 * Extrae el campo exacto 'mensaje' enviado por InventarioExceptionHandler.
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
      cleanMessage = 'No se pudo conectar con el servidor (backend inalcanzable en http://localhost:8080).'
    } else if (error.message) {
      cleanMessage = error.message
    }

    // Adjuntar mensaje limpio en el error para fácil consumo en vistas
    error.userMessage = cleanMessage

    return Promise.reject(error)
  }
)

export default api

