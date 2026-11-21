import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { ref } from 'vue'

export interface ItemStockActualizado {
  inventarioId: number
  productoId: number
  nuevoStock: number
}

export interface EventoStockWebSocket {
  tipoEvento: 'VENTA_REGISTRADA' | 'VENTA_ANULADA'
  sucursalId: number
  ventaId: number
  items: ItemStockActualizado[]
}

export type CallbackActualizacionStock = (evento: EventoStockWebSocket) => void

class PosWebSocketService {
  private client: Client | null = null
  private subscription: StompSubscription | null = null
  private sucursalIdActual: number | null = null
  private onStockUpdateCallback: CallbackActualizacionStock | null = null

  public conectado = ref(false)
  public reconectando = ref(false)
  public errorConexion = ref<string | null>(null)

  /**
   * Conecta al broker STOMP vía WebSocket y se suscribe a /topic/sucursal/{sucursalId}/stock
   */
  public conectar(sucursalId: number, onUpdate: CallbackActualizacionStock) {
    if (this.client && this.sucursalIdActual === sucursalId && this.conectado.value) {
      this.onStockUpdateCallback = onUpdate
      return
    }

    this.desconectar()

    this.sucursalIdActual = sucursalId
    this.onStockUpdateCallback = onUpdate

    // Determinar la URL del WebSocket a partir de VITE_API_URL o fallback local
    const rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080/api'
    let wsUrl = rawApiUrl.replace(/\/api\/?$/, '/ws').replace(/^http/, 'ws')
    if (!wsUrl.includes('/ws')) {
      wsUrl = 'ws://localhost:8080/ws'
    }

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.conectado.value = true
        this.reconectando.value = false
        this.errorConexion.value = null
        console.log(`[POS-WebSocket] Conectado a ${wsUrl}. Suscribiendo a /topic/sucursal/${sucursalId}/stock`)

        this.subscription = this.client!.subscribe(
          `/topic/sucursal/${sucursalId}/stock`,
          (message: IMessage) => {
            try {
              const evento: EventoStockWebSocket = JSON.parse(message.body)
              console.log('[POS-WebSocket] Evento de stock recibido:', evento)
              if (this.onStockUpdateCallback) {
                this.onStockUpdateCallback(evento)
              }
            } catch (err) {
              console.error('[POS-WebSocket] Error parseando mensaje de stock:', err)
            }
          }
        )
      },
      onDisconnect: () => {
        this.conectado.value = false
        this.subscription = null
      },
      onStompError: (frame) => {
        this.conectado.value = false
        this.errorConexion.value = frame.headers['message'] || 'Error STOMP'
        console.error('[POS-WebSocket] Error STOMP:', frame.headers['message'], frame.body)
      },
      onWebSocketClose: () => {
        this.conectado.value = false
        this.reconectando.value = true
      },
    })

    this.client.activate()
  }

  /**
   * Cierra limpiamente la suscripción y desconecta el cliente
   */
  public desconectar() {
    if (this.subscription) {
      try {
        this.subscription.unsubscribe()
      } catch {
        // Ignorar
      }
      this.subscription = null
    }

    if (this.client) {
      try {
        this.client.deactivate()
      } catch {
        // Ignorar
      }
      this.client = null
    }

    this.conectado.value = false
    this.reconectando.value = false
    this.sucursalIdActual = null
    this.onStockUpdateCallback = null
  }
}

export const posWebSocketService = new PosWebSocketService()
