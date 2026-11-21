import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  ventaService,
  type ProductoPOS,
  type RegistrarVentaDTO,
  type VentaResponse,
} from '@/modules/ventas/services/ventaService'

export interface ItemCarrito {
  inventarioId: number
  productoId: number
  nombreProducto: string
  codigoInterno?: string | null
  codigoBarras?: string | null
  precioUnitario: number
  cantidad: number
  stockDisponible: number
  enDescuento: boolean
}

export const useVentaStore = defineStore('venta', () => {
  // ====================================================================
  // ESTADO
  // ====================================================================

  // ── Carrito de compra ───────────────────────────────────────────────
  const carrito = ref<ItemCarrito[]>([])

  // ── Métricas de atención (Cronómetro) ────────────────────────────────
  const cronometroSegundos = ref(0)
  const cronometroActivo = ref(false)
  let _cronometroInterval: ReturnType<typeof setInterval> | null = null
  let _scannerCooldownTimer: ReturnType<typeof setTimeout> | null = null

  // ── Escudo anti-escáner (100% frontend, sin backend) ──────────────
  // Bloquea el input 1.5s tras cada lectura de código de barras exitosa.
  const scannerCooldown = ref(false)

  // ── Estado de registro de la venta ──────────────────────────────────
  const registrandoVenta = ref(false)
  const ventaRegistrada = ref<VentaResponse | null>(null)
  const errorVenta = ref<string | null>(null)

  // ====================================================================
  // COMPUTED
  // ====================================================================

  const totalCarrito = computed(() =>
    carrito.value.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0)
  )

  const cantidadItemsCarrito = computed(() =>
    carrito.value.reduce((acc, item) => acc + item.cantidad, 0)
  )

  const carritoVacio = computed(() => carrito.value.length === 0)

  // ====================================================================
  // CARRITO
  // ====================================================================

  /**
   * Agrega un producto al carrito con el precio elegido (normal o descuento).
   * Hard Stop: si stockDisponible === 0 lanza error.
   * Si ya existe en el carrito, incrementa la cantidad (validando contra stock).
   */
  function agregarAlCarrito(producto: ProductoPOS, precioElegido: number, cantidad = 1) {
    if (producto.stockDisponible <= 0) {
      throw new Error(`STOCK_0:${producto.nombreProducto}`)
    }

    const existente = carrito.value.find((i) => i.inventarioId === producto.inventarioId)

    if (existente) {
      const nuevaCantidad = existente.cantidad + cantidad
      if (nuevaCantidad > producto.stockDisponible) {
        throw new Error(`STOCK_INSUFICIENTE:${producto.nombreProducto}:${producto.stockDisponible}`)
      }
      existente.cantidad = nuevaCantidad
    } else {
      if (cantidad > producto.stockDisponible) {
        throw new Error(`STOCK_INSUFICIENTE:${producto.nombreProducto}:${producto.stockDisponible}`)
      }
      carrito.value.push({
        inventarioId: producto.inventarioId,
        productoId: producto.productoId,
        nombreProducto: producto.nombreProducto,
        codigoInterno: producto.codigoInterno,
        codigoBarras: producto.codigoBarras,
        precioUnitario: precioElegido,
        cantidad,
        stockDisponible: producto.stockDisponible,
        enDescuento: producto.enDescuento,
      })
    }

    // Iniciar cronómetro al escanear el primer producto
    if (!cronometroActivo.value) {
      iniciarCronometro()
    }
  }

  function quitarDelCarrito(inventarioId: number) {
    carrito.value = carrito.value.filter((i) => i.inventarioId !== inventarioId)
    if (carrito.value.length === 0) {
      detenerCronometro()
    }
  }

  function cambiarCantidad(inventarioId: number, delta: number) {
    const item = carrito.value.find((i) => i.inventarioId === inventarioId)
    if (!item) return
    const nueva = item.cantidad + delta
    if (nueva <= 0) {
      quitarDelCarrito(inventarioId)
      return
    }
    if (nueva > item.stockDisponible) return
    item.cantidad = nueva
  }

  function limpiarCarrito(limpiarVentaRegistrada: boolean = true) {
    carrito.value = []
    detenerCronometro()
    if (limpiarVentaRegistrada) {
      ventaRegistrada.value = null
      errorVenta.value = null
    }
  }

  // ====================================================================
  // CRONÓMETRO DE ATENCIÓN
  // ====================================================================

  function iniciarCronometro() {
    cronometroSegundos.value = 0
    cronometroActivo.value = true
    _cronometroInterval = setInterval(() => {
      cronometroSegundos.value++
    }, 1000)
  }

  function detenerCronometro() {
    cronometroActivo.value = false
    if (_cronometroInterval) {
      clearInterval(_cronometroInterval)
      _cronometroInterval = null
    }
  }

  // ====================================================================
  // ESCUDO ANTI-ESCÁNER (100% frontend — bloquea 1.5s el listener)
  // ====================================================================

  function activarCooldown(duracionMs = 1500) {
    scannerCooldown.value = true
    if (_scannerCooldownTimer) {
      clearTimeout(_scannerCooldownTimer)
    }
    _scannerCooldownTimer = setTimeout(() => {
      scannerCooldown.value = false
      _scannerCooldownTimer = null
    }, duracionMs)
  }

  // ====================================================================
  // REGISTRO DE VENTA
  // ====================================================================

  /**
   * Registra la venta directamente llamando a la API.
   * Sin cuenta regresiva: la confirmación se hace por decisión explícita del cajero.
   */
  async function registrarVentaDirecta(payload: RegistrarVentaDTO): Promise<VentaResponse> {
    payload.duracionAtencionSegundos = cronometroSegundos.value
    detenerCronometro()

    registrandoVenta.value = true
    errorVenta.value = null

    try {
      const respuesta = await ventaService.registrarVenta(payload)
      ventaRegistrada.value = respuesta
      limpiarCarrito(false) // Mantiene ventaRegistrada para imprimir comprobante
      return respuesta
    } catch (err: any) {
      const msg = err.userMessage || 'Error al registrar la venta. El carrito fue conservado.'
      errorVenta.value = msg
      throw err
    } finally {
      registrandoVenta.value = false
    }
  }

  /**
   * Prepara el entorno para una nueva venta: resetea carrito, estados y cliente.
   */
  function iniciarNuevaVenta() {
    limpiarCarrito(true)
    ventaRegistrada.value = null
    errorVenta.value = null
  }

  // ====================================================================
  // EXPOSE
  // ====================================================================

  return {
    // Estado
    carrito,
    cronometroSegundos,
    cronometroActivo,
    scannerCooldown,
    registrandoVenta,
    ventaRegistrada,
    errorVenta,

    // Computed
    totalCarrito,
    cantidadItemsCarrito,
    carritoVacio,

    // Carrito
    agregarAlCarrito,
    quitarDelCarrito,
    cambiarCantidad,
    limpiarCarrito,

    // Cronómetro
    iniciarCronometro,
    detenerCronometro,

    // Scanner
    activarCooldown,

    // Registro
    registrarVentaDirecta,
    iniciarNuevaVenta,
  }
})
