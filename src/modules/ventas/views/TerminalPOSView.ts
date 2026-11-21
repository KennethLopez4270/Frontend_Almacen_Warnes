import { ref, reactive, computed } from 'vue'
import {
  ventaService,
  type ProductoPOS,
  type ClienteDTO,
  type RegistrarVentaDTO,
} from '../services/ventaService'
import {
  posWebSocketService,
  type EventoStockWebSocket,
} from '../services/posWebSocketService'
import { useVentaStore } from '@/stores/ventaStore'
import { useAuthStore } from '@/stores/auth'

// ====================================================================
// STORES
// ====================================================================

export const ventaStore = useVentaStore()
export const authStore = useAuthStore()

// ====================================================================
// GESTIÓN DE CLIENTES / FACTURACIÓN (UBICADO ARRIBA DEL BUSCADOR)
// ====================================================================

export const nitBusqueda = ref('')
export const cargandoCliente = ref(false)
export const clienteEncontrado = ref<ClienteDTO | null>(null)
export const mostrarCamposCliente = ref(false)

export const formCliente = reactive<ClienteDTO>({
  clienteId: null,
  nit: '',
  nombres: '',
  apellidos: '',
  nombreRazonSocial: '',
  telefono: '',
})

export async function buscarClientePorNit() {
  const nitLimpio = nitBusqueda.value.trim()
  if (!nitLimpio) {
    limpiarCliente()
    return
  }

  cargandoCliente.value = true
  try {
    const cli = await ventaService.buscarCliente(nitLimpio)
    if (cli) {
      clienteEncontrado.value = cli
      formCliente.clienteId = cli.clienteId
      formCliente.nit = cli.nit
      formCliente.nombres = cli.nombres
      formCliente.apellidos = cli.apellidos
      formCliente.nombreRazonSocial = cli.nombreRazonSocial
      formCliente.telefono = cli.telefono
      mostrarCamposCliente.value = false
      agregarToast('success', `Cliente encontrado: ${cli.nombreRazonSocial || `${cli.nombres} ${cli.apellidos}`}`)
    } else {
      // Cliente nuevo: habilitar formulario para registrar
      clienteEncontrado.value = null
      formCliente.clienteId = null
      formCliente.nit = nitLimpio
      formCliente.nombres = ''
      formCliente.apellidos = ''
      formCliente.nombreRazonSocial = ''
      formCliente.telefono = ''
      mostrarCamposCliente.value = true
      agregarToast('info', 'NIT no registrado. Completa los datos si requiere factura.', 'Nuevo Cliente')
    }
  } catch {
    agregarToast('error', 'Error al buscar cliente en el servidor.')
  } finally {
    cargandoCliente.value = false
  }
}

export function limpiarCliente() {
  nitBusqueda.value = ''
  clienteEncontrado.value = null
  mostrarCamposCliente.value = false
  formCliente.clienteId = null
  formCliente.nit = ''
  formCliente.nombres = ''
  formCliente.apellidos = ''
  formCliente.nombreRazonSocial = ''
  formCliente.telefono = ''
}

// ====================================================================
// BÚSQUEDA Y ESCANEO DE PRODUCTOS
// ====================================================================

export const inputBusquedaRef = ref<HTMLInputElement | null>(null)
export const criterioBusqueda = ref('')
export const resultadosBusqueda = ref<ProductoPOS[]>([])
export const cargandoBusqueda = ref(false)
export const errorBusqueda = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function enfocarInputBusqueda() {
  setTimeout(() => {
    inputBusquedaRef.value?.focus()
  }, 100)
}

/**
 * Búsqueda automática en vivo mientras el usuario escribe.
 * Se dispara al introducir al menos 3 caracteres y en cada cambio sucesivo.
 * NO auto-agrega al carrito ni activa el escudo anti-escáner.
 */
export function manejarInputBusqueda() {
  const criterio = criterioBusqueda.value.trim()

  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  // Si tiene menos de 3 caracteres, limpiar resultados
  if (criterio.length < 3) {
    resultadosBusqueda.value = []
    errorBusqueda.value = null
    cargandoBusqueda.value = false
    return
  }

  // Debounce de 250ms para no saturar la red mientras se escribe rápidamente
  debounceTimer = setTimeout(() => {
    ejecutarBusquedaEnVivo(criterio)
  }, 250)
}

async function ejecutarBusquedaEnVivo(criterio: string) {
  const sucursalId = authStore.sucursalId
  if (!sucursalId) return

  cargandoBusqueda.value = true
  errorBusqueda.value = null

  try {
    const lista = await ventaService.buscarProducto(sucursalId, criterio)
    // Solo actualizar si el criterio escrito sigue coincidiendo con la búsqueda
    if (criterioBusqueda.value.trim() === criterio) {
      resultadosBusqueda.value = lista
    }
  } catch (err: any) {
    errorBusqueda.value = err.userMessage || 'Error al buscar productos.'
    resultadosBusqueda.value = []
  } finally {
    cargandoBusqueda.value = false
  }
}

export function limpiarBusqueda() {
  criterioBusqueda.value = ''
  resultadosBusqueda.value = []
  errorBusqueda.value = null
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  enfocarInputBusqueda()
}

/**
 * Manejador del evento Enter del input:
 * - Si es escáner o coincidencia exacta de código de barras/código interno:
 *   Auto-agrega directamente al carrito (+1) y activa el escudo anti-escáner para esa lectura.
 * - Si es búsqueda manual por nombre (ej. "leche", "aceite"):
 *   NO auto-agrega el primer producto; muestra o actualiza la lista de resultados para que el cajero elija.
 */
export async function manejarKeydownBusqueda(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()

    const criterio = criterioBusqueda.value.trim()
    if (!criterio) return

    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // Si el escudo anti-escáner está activo por una lectura previa, ignorar ráfagas dobles
    if (ventaStore.scannerCooldown) return

    const sucursalId = authStore.sucursalId
    if (!sucursalId) {
      errorBusqueda.value = 'No hay sucursal activa. Por favor inicia sesión de nuevo.'
      return
    }

    cargandoBusqueda.value = true
    errorBusqueda.value = null

    try {
      const lista = await ventaService.buscarProducto(sucursalId, criterio)
      resultadosBusqueda.value = lista

      if (lista.length === 0) {
        errorBusqueda.value = `Sin resultados para "${criterio}".`
        agregarToast('info', `No se encontró ningún producto con: "${criterio}".`, 'Sin coincidencias')
        return
      }

      // Verificar si hay coincidencias exactas de código de barras o código interno
      const exactMatches = lista.filter(
        (p) =>
          (p.codigoBarras && p.codigoBarras.trim() === criterio) ||
          (p.codigoInterno && p.codigoInterno.trim().toUpperCase() === criterio.toUpperCase())
      )

      if (exactMatches.length > 0) {
        // ── CASO A: ES UN ESCANEO DE CÓDIGO DE BARRAS / INTERNO EXACTO ──
        const matchesConStock = exactMatches.filter((p) => p.stockDisponible > 0)

        if (matchesConStock.length === 0) {
          const primerMatch = exactMatches[0]
          agregarToast('error', `"${primerMatch?.nombreProducto || 'El producto'}" no tiene stock disponible. Venta bloqueada.`, 'Stock 0')
          return
        }

        // Detectar si para este código de barras existen dos lotes con stock: uno con descuento y uno normal
        const loteOferta = matchesConStock.find((p) => p.enDescuento && p.precioDescuento != null)
        const loteNormal = matchesConStock.find((p) => !p.enDescuento)

        if (loteOferta && loteNormal) {
          // Hay dos lotes (uno normal y otro con descuento) para el mismo código de barras:
          // Abrir modal para que el cajero indique cuál lote es el que se está vendiendo
          loteOfertaSeleccion.value = loteOferta
          loteNormalSeleccion.value = loteNormal
          modalDescuentoVisible.value = true
          return
        }

        // Si solo hay un lote con stock (o todos tienen la misma condición), agregar directamente:
        const seleccionado = matchesConStock[0]
        if (!seleccionado) return

        const precio = (seleccionado.enDescuento && seleccionado.precioDescuento != null)
          ? seleccionado.precioDescuento
          : seleccionado.precioVenta

        _agregarProductoAlCarrito(seleccionado, precio)
        criterioBusqueda.value = ''
        resultadosBusqueda.value = []
        ventaStore.activarCooldown(1200) // Activar escudo anti-escáner solo tras escaneo exitoso
        enfocarInputBusqueda()
      } else {
        // ── CASO B: ES BÚSQUEDA MANUAL POR TEXTO (ej. "arroz", "aceite") ──
        // NO auto-agregar nada. La lista ya muestra las opciones para que el cajero elija con un clic.
        // NO activar escudo anti-escáner.
      }
    } catch (err: any) {
      errorBusqueda.value = err.userMessage || 'Error al buscar producto.'
      resultadosBusqueda.value = []
    } finally {
      cargandoBusqueda.value = false
    }
  }
}

// ====================================================================
// AGREGAR AL CARRITO Y GESTIÓN DE LOTES
// ====================================================================

export const loteOfertaSeleccion = ref<ProductoPOS | null>(null)
export const loteNormalSeleccion = ref<ProductoPOS | null>(null)
export const modalDescuentoVisible = ref(false)

// Retrocompatibilidad
export const productoConDescuento = computed(() => loteOfertaSeleccion.value)

export function elegirLoteOferta() {
  if (!loteOfertaSeleccion.value || loteOfertaSeleccion.value.precioDescuento == null) return
  _agregarProductoAlCarrito(loteOfertaSeleccion.value, loteOfertaSeleccion.value.precioDescuento)
  cerrarModalDescuento()
  ventaStore.activarCooldown(1200)
}

export function elegirLoteNormal() {
  if (!loteNormalSeleccion.value) return
  _agregarProductoAlCarrito(loteNormalSeleccion.value, loteNormalSeleccion.value.precioVenta)
  cerrarModalDescuento()
  ventaStore.activarCooldown(1200)
}

export function cerrarModalDescuento() {
  modalDescuentoVisible.value = false
  loteOfertaSeleccion.value = null
  loteNormalSeleccion.value = null
  criterioBusqueda.value = ''
  resultadosBusqueda.value = []
  enfocarInputBusqueda()
}

// Aliases
export const elegirPrecioNormal = elegirLoteNormal
export const elegirPrecioDescuento = elegirLoteOferta

export function seleccionarProducto(producto: ProductoPOS) {
  if (producto.stockDisponible <= 0) {
    agregarToast('error', `"${producto.nombreProducto}" no tiene stock disponible.`, 'Stock 0')
    return
  }

  // Al hacer clic manual en una tarjeta de la lista de resultados, el cajero
  // ya ha seleccionado explícitamente ese lote específico (sea normal o con oferta).
  const precio = (producto.enDescuento && producto.precioDescuento != null)
    ? producto.precioDescuento
    : producto.precioVenta

  _agregarProductoAlCarrito(producto, precio)
}

function _agregarProductoAlCarrito(producto: ProductoPOS, precio: number) {
  try {
    ventaStore.agregarAlCarrito(producto, precio)
    criterioBusqueda.value = ''
    resultadosBusqueda.value = []
    agregarToast('success', `"${producto.nombreProducto}" agregado al carrito.`)
    enfocarInputBusqueda()
  } catch (err: any) {
    const msg = String(err.message || '')
    if (msg.startsWith('STOCK_0:')) {
      agregarToast('error', `"${producto.nombreProducto}" no tiene stock disponible.`, 'Stock 0')
    } else if (msg.startsWith('STOCK_INSUFICIENTE:')) {
      const parts = msg.split(':')
      agregarToast('error', `Stock máximo disponible: ${parts[2]} unidades.`, 'Stock insuficiente')
    } else {
      agregarToast('error', 'Error al agregar al carrito.')
    }
  }
}

// ====================================================================
// SECCIÓN DE COBRO EN PANTALLA PRINCIPAL
// ====================================================================

// Método de pago: 1=Efectivo, 2=QR, 3=Tarjeta, 4=Mixto
export const metodoSeleccionado = ref<1 | 2 | 3 | 4>(1)

// Datos del pago en pantalla principal
export const montoRecibido = ref<number | null>(null)
export const mixtoEfectivo = ref(0)
export const mixtoQr = ref(0)
export const mixtoTarjeta = ref(0)
export const confirmadoQR = ref(false)
export const confirmadoTarjeta = ref(false)

export const cambio = computed(() => {
  if (metodoSeleccionado.value === 1 && montoRecibido.value !== null) {
    const c = montoRecibido.value - ventaStore.totalCarrito
    return c > 0 ? c : 0
  }
  return 0
})

export const sumaMixto = computed(() => mixtoEfectivo.value + mixtoQr.value + mixtoTarjeta.value)

export const mixtoValido = computed(() =>
  Math.abs(sumaMixto.value - ventaStore.totalCarrito) < 0.01
)

export function setMontoRecibido(monto: number) {
  montoRecibido.value = monto
}

// ====================================================================
// WEBSOCKET STOMP (ACTUALIZACIONES DE STOCK EN TIEMPO REAL)
// ====================================================================

export const posWsConectado = posWebSocketService.conectado
export const posWsReconectando = posWebSocketService.reconectando

export function iniciarWebSocketPOS() {
  const sucursalId = authStore.sucursalId
  if (!sucursalId) return
  posWebSocketService.conectar(sucursalId, procesarEventoStockWebSocket)
}

export function detenerWebSocketPOS() {
  posWebSocketService.desconectar()
}

/**
 * Procesa las actualizaciones de stock transmitidas vía STOMP desde el backend
 * al confirmarse o anularse ventas en la misma sucursal.
 */
export function procesarEventoStockWebSocket(evento: EventoStockWebSocket) {
  if (!evento || !evento.items || evento.items.length === 0) return

  for (const item of evento.items) {
    // 1. Actualizar catálogo en memoria si está en resultados de búsqueda
    const itemBusqueda = resultadosBusqueda.value.find((p) => p.inventarioId === item.inventarioId)
    if (itemBusqueda) {
      itemBusqueda.stockDisponible = item.nuevoStock
    }

    // 2. Actualizar artículos que ya estén en el carrito de este cajero
    const itemCarrito = ventaStore.carrito.find((c) => c.inventarioId === item.inventarioId)
    if (itemCarrito) {
      const stockAnterior = itemCarrito.stockDisponible
      itemCarrito.stockDisponible = item.nuevoStock

      if (item.nuevoStock <= 0) {
        // Hard Stop: El producto se agotó por otra venta simultánea
        agregarToast(
          'error',
          `"${itemCarrito.nombreProducto}" se agotó en otra caja simultánea (Stock: 0).`,
          'Stock Agotado'
        )
      } else if (itemCarrito.cantidad > item.nuevoStock) {
        // Reducción reactiva: Ajustar cantidad al stock remanente
        const cantidadOriginal = itemCarrito.cantidad
        itemCarrito.cantidad = item.nuevoStock
        agregarToast(
          'info',
          `"${itemCarrito.nombreProducto}": Stock reducido en otra venta. Cantidad ajustada de ${cantidadOriginal} a ${item.nuevoStock}.`,
          'Stock Actualizado'
        )
      } else if (item.nuevoStock > stockAnterior && evento.tipoEvento === 'VENTA_ANULADA') {
        agregarToast(
          'info',
          `"${itemCarrito.nombreProducto}": Stock repuesto (+${item.nuevoStock - stockAnterior} un.) por anulación de venta.`,
          'Stock Repuesto'
        )
      }
    }
  }
}

// ====================================================================
// MODAL DE CONFIRMACIÓN DE VENTA (SIN CONTADOR DE 5 SEGUNDOS)
// ====================================================================

export const modalConfirmarVisible = ref(false)

export function abrirModalConfirmar() {
  if (ventaStore.carritoVacio) {
    agregarToast('info', 'El carrito está vacío. Agrega productos antes de cobrar.')
    return
  }

  // Hard Stop en tiempo real: verificar que ningún producto en el carrito esté en stock 0
  const itemAgotado = ventaStore.carrito.find((i) => i.stockDisponible <= 0)
  if (itemAgotado) {
    agregarToast(
      'error',
      `No se puede confirmar la venta: "${itemAgotado.nombreProducto}" ya no tiene stock (agotado en otra caja). Quítalo del carrito.`,
      'Stock 0'
    )
    return
  }

  // Verificar que la cantidad en el carrito no sobrepase el stock disponible actual
  const itemExcedido = ventaStore.carrito.find((i) => i.cantidad > i.stockDisponible)
  if (itemExcedido) {
    agregarToast(
      'error',
      `No se puede confirmar la venta: "${itemExcedido.nombreProducto}" supera el stock disponible (${itemExcedido.cantidad} > ${itemExcedido.stockDisponible}).`,
      'Stock Excedido'
    )
    return
  }

  const total = ventaStore.totalCarrito

  // Validaciones según el método de pago elegido
  if (metodoSeleccionado.value === 1) {
    if (!montoRecibido.value || montoRecibido.value < total) {
      agregarToast('error', 'El monto recibido en efectivo debe ser mayor o igual al total a pagar.', 'Monto insuficiente')
      return
    }
  } else if (metodoSeleccionado.value === 2 && !confirmadoQR.value) {
    agregarToast('error', 'Debes confirmar que el pago por QR fue recibido.', 'Confirmación pendiente')
    return
  } else if (metodoSeleccionado.value === 3 && !confirmadoTarjeta.value) {
    agregarToast('error', 'Debes confirmar que el pago con tarjeta fue aprobado.', 'Confirmación pendiente')
    return
  } else if (metodoSeleccionado.value === 4 && !mixtoValido.value) {
    agregarToast(
      'error',
      `La suma de pagos mixtos (${sumaMixto.value.toFixed(2)}) debe coincidir con el total (${total.toFixed(2)}).`,
      'Cuadre de cobro'
    )
    return
  }

  modalConfirmarVisible.value = true
}

export function cerrarModalConfirmar() {
  modalConfirmarVisible.value = false
  enfocarInputBusqueda()
}

/**
 * Ejecuta el registro definitivo de la venta en el backend.
 */
export async function ejecutarRegistroVenta() {
  const total = ventaStore.totalCarrito
  const sucursalId = authStore.sucursalId
  const usuarioId = authStore.usuarioId

  if (!sucursalId || !usuarioId) {
    agregarToast('error', 'Sesión no válida. Por favor inicia sesión de nuevo.')
    return
  }

  // Si se ingresó un NIT pero no existe clienteId, registrarlo
  let clienteId: number | null = formCliente.clienteId
  if (formCliente.nit && !clienteId) {
    try {
      const cli = await ventaService.crearCliente({ ...formCliente }, usuarioId)
      clienteId = cli.clienteId
      formCliente.clienteId = cli.clienteId
    } catch {
      agregarToast('info', 'El cliente no pudo guardarse en la agenda, pero la venta continuará.')
    }
  }

  const payload: RegistrarVentaDTO = {
    sucursalId,
    usuarioId,
    clienteId,
    metodoVenta: metodoSeleccionado.value,
    precioTotal: total,
    cobroEfectivo:
      metodoSeleccionado.value === 1
        ? total
        : metodoSeleccionado.value === 4
          ? mixtoEfectivo.value
          : 0,
    cobroQr:
      metodoSeleccionado.value === 2
        ? total
        : metodoSeleccionado.value === 4
          ? mixtoQr.value
          : 0,
    cobroTarjeta:
      metodoSeleccionado.value === 3
        ? total
        : metodoSeleccionado.value === 4
          ? mixtoTarjeta.value
          : 0,
    montoRecibido: metodoSeleccionado.value === 1 ? (montoRecibido.value ?? total) : null,
    cambio: metodoSeleccionado.value === 1 ? cambio.value : null,
    detalles: ventaStore.carrito.map((item) => ({
      inventarioId: item.inventarioId,
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
    })),
    duracionAtencionSegundos: null,
  }

  try {
    const ventaRes = await ventaStore.registrarVentaDirecta(payload)
    agregarToast('success', `Venta #${ventaRes.ventaId} registrada con éxito.`)
  } catch (err: any) {
    agregarToast('error', err.userMessage || 'No se pudo completar la venta.', 'Error de registro')
  }
}

/**
 * Prepara el POS para una nueva venta limpia tras culminar la anterior.
 */
export function nuevaVenta() {
  modalConfirmarVisible.value = false
  try {
    ventaStore.iniciarNuevaVenta()
  } catch (err) {
    console.error('Error al resetear ventaStore:', err)
  }
  try {
    limpiarCliente()
  } catch (err) {
    console.error('Error al limpiar cliente:', err)
  }
  montoRecibido.value = null
  mixtoEfectivo.value = 0
  mixtoQr.value = 0
  mixtoTarjeta.value = 0
  confirmadoQR.value = false
  confirmadoTarjeta.value = false
  enfocarInputBusqueda()
}

// ====================================================================
// IMPRESIÓN DEL RECIBO TÉRMICO (AISLADO EN IFRAME)
// ====================================================================

/**
 * Imprime el recibo térmico utilizando un iframe aislado para no imprimir
 * la interfaz de la aplicación ni los modales en pantalla.
 */
export function imprimirRecibo(reciboHtml?: string) {
  const html = reciboHtml || ventaStore.ventaRegistrada?.reciboHtml
  if (!html) {
    agregarToast('error', 'No hay recibo disponible para imprimir.', 'Error')
    return
  }

  let iframe = document.getElementById('iframe-impresion-recibo') as HTMLIFrameElement
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = 'iframe-impresion-recibo'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
  }

  const doc = iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(html)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }, 250)
}

// ====================================================================
// TOASTS DE NOTIFICACIÓN
// ====================================================================

export interface ToastInfo {
  id: number
  tipo: 'success' | 'error' | 'info'
  mensaje: string
  titulo?: string
}

export const toasts = ref<ToastInfo[]>([])
let _toastSeq = 0

export function agregarToast(tipo: 'success' | 'error' | 'info', mensaje: string, titulo?: string) {
  const id = ++_toastSeq
  const tituloFinal =
    titulo || (tipo === 'success' ? 'Éxito' : tipo === 'error' ? 'Error' : 'Información')
  toasts.value.push({ id, tipo, mensaje, titulo: tituloFinal })
  setTimeout(() => cerrarToast(id), 4000)
}

export function cerrarToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

// ====================================================================
// FORMATEO
// ====================================================================

export function formatearPrecio(valor: number): string {
  return `Bs. ${valor.toFixed(2)}`
}

export function formatearCronometro(segundos: number): string {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0')
  const s = (segundos % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
