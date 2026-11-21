import { ref, computed, onMounted } from 'vue'
import { clienteService, type Cliente, type ClienteInput } from '../services/clienteService'
import { useUsuarioActivo } from '@/composables/useUsuarioActivo'

export interface ToastItem {
  id: number
  titulo: string
  mensaje: string
  tipo: 'success' | 'danger' | 'warning' | 'info'
}

export function useClientesView() {
  const { usuarioActivoId, rolActivo } = useUsuarioActivo()

  // ====================================================================
  // ESTADO REACTIVO
  // ====================================================================
  const cargando = ref(false)
  const guardando = ref(false)
  const eliminando = ref(false)

  const listaClientes = ref<Cliente[]>([])
  const filtroBusqueda = ref('')
  const filtroEstado = ref<'ACTIVOS' | 'BAJAS' | 'TODOS'>('ACTIVOS')

  // Modal ABM
  const modalAbmVisible = ref(false)
  const modoEdicion = ref(false)
  const clienteIdEdicion = ref<number | null>(null)
  const formCliente = ref<ClienteInput>({
    nit: '',
    nombres: '',
    apellidos: '',
    nombreRazonSocial: '',
    telefono: '',
  })

  // Modal Confirmación Baja
  const modalBajaVisible = ref(false)
  const clienteParaBaja = ref<Cliente | null>(null)

  // Toasts
  const toasts = ref<ToastItem[]>([])
  let toastSeq = 0

  function agregarToast(titulo: string, mensaje: string, tipo: 'success' | 'danger' | 'warning' | 'info' = 'info') {
    const id = ++toastSeq
    toasts.value.push({ id, titulo, mensaje, tipo })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 4500)
  }

  function removerToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  // ====================================================================
  // COMPUTED / KPIs
  // ====================================================================
  const totalClientesActivos = computed(() => {
    return listaClientes.value.filter((c) => !c.marcaBaja).length
  })

  const totalClientesConCompras = computed(() => {
    return listaClientes.value.filter((c) => (c.totalCompras || 0) > 0).length
  })

  const totalClientesRecurrentes = computed(() => {
    return listaClientes.value.filter((c) => !c.marcaBaja && (c.totalCompras || 0) >= 10).length
  })

  // ====================================================================
  // OPERACIONES
  // ====================================================================
  let timerBusqueda: any = null
  function onBusquedaInput() {
    clearTimeout(timerBusqueda)
    timerBusqueda = setTimeout(() => {
      cargarClientes()
    }, 350)
  }

  async function cargarClientes() {
    try {
      cargando.value = true
      listaClientes.value = await clienteService.listar(
        filtroBusqueda.value,
        filtroEstado.value
      )
    } catch (err: any) {
      const msg = err.userMessage || 'No se pudo obtener el listado de clientes.'
      agregarToast('Error al cargar clientes', msg, 'danger')
    } finally {
      cargando.value = false
    }
  }

  function abrirModalCrear() {
    modoEdicion.value = false
    clienteIdEdicion.value = null
    formCliente.value = {
      nit: '',
      nombres: '',
      apellidos: '',
      nombreRazonSocial: '',
      telefono: '',
    }
    modalAbmVisible.value = true
  }

  function abrirModalEditar(cliente: Cliente) {
    modoEdicion.value = true
    clienteIdEdicion.value = cliente.clienteId
    formCliente.value = {
      clienteId: cliente.clienteId,
      nit: cliente.nit,
      nombres: cliente.nombres || '',
      apellidos: cliente.apellidos || '',
      nombreRazonSocial: cliente.nombreRazonSocial || '',
      telefono: cliente.telefono || '',
    }
    modalAbmVisible.value = true
  }

  function cerrarModalAbm() {
    modalAbmVisible.value = false
    modoEdicion.value = false
    clienteIdEdicion.value = null
  }

  async function guardarCliente() {
    if (!formCliente.value.nit || !formCliente.value.nit.trim()) {
      agregarToast('Dato requerido', 'El NIT o CI del cliente es obligatorio.', 'warning')
      return
    }

    try {
      guardando.value = true
      const usuarioId = usuarioActivoId.value || 1

      if (modoEdicion.value && clienteIdEdicion.value) {
        await clienteService.actualizar(clienteIdEdicion.value, formCliente.value, usuarioId)
        agregarToast('Cliente actualizado', 'Los datos del cliente se modificaron correctamente.', 'success')
      } else {
        await clienteService.crear(formCliente.value, usuarioId)
        agregarToast('Cliente registrado', 'El cliente fue registrado exitosamente.', 'success')
      }

      cerrarModalAbm()
      await cargarClientes()
    } catch (err: any) {
      const msg = err.userMessage || 'Error al guardar los datos del cliente.'
      agregarToast('No se pudo guardar', msg, 'danger')
    } finally {
      guardando.value = false
    }
  }

  function confirmarBaja(cliente: Cliente) {
    clienteParaBaja.value = cliente
    modalBajaVisible.value = true
  }

  function cerrarModalBaja() {
    modalBajaVisible.value = false
    clienteParaBaja.value = null
  }

  async function ejecutarBaja() {
    if (!clienteParaBaja.value) return
    try {
      eliminando.value = true
      const usuarioId = usuarioActivoId.value || 1
      await clienteService.eliminar(clienteParaBaja.value.clienteId, usuarioId)
      agregarToast('Cliente dado de baja', `El cliente #${clienteParaBaja.value.clienteId} ha sido dado de baja lógica.`, 'success')
      cerrarModalBaja()
      await cargarClientes()
    } catch (err: any) {
      const msg = err.userMessage || 'No se pudo dar de baja al cliente.'
      agregarToast('Error de baja', msg, 'danger')
    } finally {
      eliminando.value = false
    }
  }

  function formatMonto(val?: number): string {
    const num = Number(val) || 0
    return num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function formatFecha(fecha?: string): string {
    if (!fecha) return '-'
    const d = new Date(fecha)
    return isNaN(d.getTime()) ? fecha : d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  onMounted(() => {
    cargarClientes()
  })

  return {
    usuarioActivoId,
    rolActivo,
    cargando,
    guardando,
    eliminando,
    listaClientes,
    filtroBusqueda,
    filtroEstado,
    modalAbmVisible,
    modoEdicion,
    clienteIdEdicion,
    formCliente,
    modalBajaVisible,
    clienteParaBaja,
    toasts,
    totalClientesActivos,
    totalClientesConCompras,
    totalClientesRecurrentes,
    agregarToast,
    removerToast,
    onBusquedaInput,
    cargarClientes,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModalAbm,
    guardarCliente,
    confirmarBaja,
    cerrarModalBaja,
    ejecutarBaja,
    formatMonto,
    formatFecha,
  }
}
