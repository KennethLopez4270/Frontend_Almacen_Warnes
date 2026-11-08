import { ref, reactive, computed } from 'vue'
import { sucursalService, type SucursalDTO, type CrearSucursalDTO, type ModificarSucursalDTO } from '../services/sucursalService'

// Tab activo: 'sucursales' | 'general'
export const tabActivo = ref<'sucursales' | 'general'>('sucursales')

// Listado y Filtros
export const sucursales = ref<SucursalDTO[]>([])
export const cargando = ref(false)
export const searchQuery = ref('')
export const mostrarBajas = ref(false)

// Modales
export const modalCrearVisible = ref(false)
export const cargandoCrear = ref(false)
export const formCrear = reactive<CrearSucursalDTO>({
  codigoInterno: '',
  ciudad: '',
  direccion: '',
  telefono: '',
})

export const modalEditarVisible = ref(false)
export const cargandoEditar = ref(false)
export const sucursalAEditar = ref<SucursalDTO | null>(null)
export const formEditar = reactive<ModificarSucursalDTO>({
  codigoInterno: '',
  ciudad: '',
  direccion: '',
  telefono: '',
})

export const modalBajaVisible = ref(false)
export const cargandoBaja = ref(false)
export const sucursalABaja = ref<SucursalDTO | null>(null)

// Notificaciones Toast
export interface ToastInfo {
  id: number
  tipo: 'success' | 'error' | 'info'
  mensaje: string
  titulo?: string
}
export const toasts = ref<ToastInfo[]>([])
let toastSeq = 0

export function agregarToast(tipo: 'success' | 'error' | 'info', mensaje: string, titulo?: string) {
  const id = ++toastSeq
  const tituloFinal =
    titulo || (tipo === 'success' ? 'Operación Exitosa' : tipo === 'error' ? 'Error' : 'Información')
  toasts.value.push({ id, tipo, mensaje, titulo: tituloFinal })
  setTimeout(() => {
    cerrarToast(id)
  }, 4000)
}

export function cerrarToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

// Cómputos y Métricas
export const totalSucursales = computed(() => sucursales.value.length)
export const totalActivas = computed(() => sucursales.value.filter((s) => !s.marcaBaja).length)
export const totalUsuariosAsignados = computed(() =>
  sucursales.value.reduce((acc, s) => acc + (s.cantidadUsuarios || 0), 0)
)

export const sucursalesFiltradas = computed(() => {
  if (!searchQuery.value.trim()) return sucursales.value
  const q = searchQuery.value.toLowerCase().trim()
  return sucursales.value.filter(
    (s) =>
      s.codigoInterno.toLowerCase().includes(q) ||
      s.ciudad.toLowerCase().includes(q) ||
      s.direccion.toLowerCase().includes(q) ||
      (s.telefono && s.telefono.toLowerCase().includes(q))
  )
})

// Acciones API
export async function cargarSucursales() {
  cargando.value = true
  try {
    const data = await sucursalService.listar(mostrarBajas.value, searchQuery.value)
    sucursales.value = data
  } catch (err: any) {
    agregarToast('error', err.userMessage || 'Error al cargar sucursales.')
  } finally {
    cargando.value = false
  }
}

// Abrir Modal Crear
export function abrirModalCrear() {
  formCrear.codigoInterno = ''
  formCrear.ciudad = ''
  formCrear.direccion = ''
  formCrear.telefono = ''
  modalCrearVisible.value = true
}

export async function guardarNuevaSucursal() {
  if (!formCrear.codigoInterno.trim()) {
    agregarToast('error', 'El código interno es obligatorio.')
    return
  }
  if (!formCrear.ciudad.trim()) {
    agregarToast('error', 'La ciudad es obligatoria.')
    return
  }
  if (!formCrear.direccion.trim()) {
    agregarToast('error', 'La dirección es obligatoria.')
    return
  }

  cargandoCrear.value = true
  try {
    const res = await sucursalService.crear({
      codigoInterno: formCrear.codigoInterno.trim().toUpperCase(),
      ciudad: formCrear.ciudad.trim(),
      direccion: formCrear.direccion.trim(),
      telefono: formCrear.telefono?.trim() || undefined,
    })
    agregarToast('success', res.mensaje || 'Sucursal registrada exitosamente.')
    modalCrearVisible.value = false
    await cargarSucursales()
  } catch (err: any) {
    agregarToast('error', err.userMessage || 'No se pudo registrar la sucursal.')
  } finally {
    cargandoCrear.value = false
  }
}

// Abrir Modal Editar
export function abrirModalEditar(suc: SucursalDTO) {
  sucursalAEditar.value = suc
  formEditar.codigoInterno = suc.codigoInterno
  formEditar.ciudad = suc.ciudad
  formEditar.direccion = suc.direccion
  formEditar.telefono = suc.telefono || ''
  modalEditarVisible.value = true
}

export async function guardarModificacion() {
  if (!sucursalAEditar.value) return

  if (!formEditar.codigoInterno?.trim()) {
    agregarToast('error', 'El código interno es obligatorio.')
    return
  }
  if (!formEditar.ciudad?.trim()) {
    agregarToast('error', 'La ciudad es obligatoria.')
    return
  }
  if (!formEditar.direccion?.trim()) {
    agregarToast('error', 'La dirección es obligatoria.')
    return
  }

  cargandoEditar.value = true
  try {
    const res = await sucursalService.modificar(sucursalAEditar.value.sucursalId, {
      codigoInterno: formEditar.codigoInterno.trim().toUpperCase(),
      ciudad: formEditar.ciudad.trim(),
      direccion: formEditar.direccion.trim(),
      telefono: formEditar.telefono?.trim() || undefined,
    })
    agregarToast('success', res.mensaje || 'Sucursal actualizada exitosamente.')
    modalEditarVisible.value = false
    await cargarSucursales()
  } catch (err: any) {
    agregarToast('error', err.userMessage || 'No se pudo actualizar la sucursal.')
  } finally {
    cargandoEditar.value = false
  }
}

// Abrir Modal Baja
export function abrirModalBaja(suc: SucursalDTO) {
  sucursalABaja.value = suc
  modalBajaVisible.value = true
}

export async function confirmarBaja() {
  if (!sucursalABaja.value) return

  cargandoBaja.value = true
  try {
    const res = await sucursalService.eliminar(sucursalABaja.value.sucursalId)
    agregarToast('success', res.mensaje || 'Sucursal dada de baja exitosamente.')
    modalBajaVisible.value = false
    await cargarSucursales()
  } catch (err: any) {
    agregarToast('error', err.userMessage || 'No se pudo procesar la baja de sucursal.')
  } finally {
    cargandoBaja.value = false
  }
}

// Formateador de fecha
export function formatearFecha(fechaStr?: string): string {
  if (!fechaStr) return 'N/D'
  try {
    const d = new Date(fechaStr)
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return fechaStr
  }
}
