import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { conceptoService, type ConceptoItemDTO } from '@/modules/conceptos/services/conceptoService'

export const useConceptosStore = defineStore('conceptos', () => {
  // Caché en memoria indexada por grupoId (evita llamadas repetitivas al backend)
  const cacheGrupos = ref<Record<number, ConceptoItemDTO[]>>({})
  const cargando = ref<boolean>(false)
  const error = ref<string | null>(null)

  /**
   * Carga los conceptos de un grupo desde la base de datos (PostgreSQL).
   * Si ya están en caché y no se fuerza la recarga, los devuelve de inmediato.
   */
  async function cargarGrupo(grupoId: number, forzarRecarga = false): Promise<ConceptoItemDTO[]> {
    if (!forzarRecarga && cacheGrupos.value[grupoId] && cacheGrupos.value[grupoId].length > 0) {
      return cacheGrupos.value[grupoId]
    }

    try {
      cargando.value = true
      error.value = null
      const data = await conceptoService.listarPorGrupo(grupoId)
      cacheGrupos.value[grupoId] = data
      return data
    } catch (err: any) {
      const msg = err.userMessage || `Error al cargar conceptos del grupo ${grupoId}`
      error.value = msg
      console.error(`[useConceptosStore] ${msg}:`, err)
      return cacheGrupos.value[grupoId] || []
    } finally {
      cargando.value = false
    }
  }

  /**
   * Pre-carga los grupos principales más utilizados (Roles=1, Categorías=2, Métodos de Pago=4, Movimientos Caja=6, Movimientos Inventario=9)
   */
  async function precargarGruposPrincipales(): Promise<void> {
    await Promise.allSettled([
      cargarGrupo(1), // Roles de Usuario
      cargarGrupo(2), // Categorías de Productos
      cargarGrupo(4), // Métodos de Pago
      cargarGrupo(6), // Tipos de Movimientos (Caja)
      cargarGrupo(9), // Tipos de Movimientos (Inventario / Kardex)
    ])
  }

  /**
   * Registra un nuevo concepto (por ejemplo, una nueva categoría creada por un cajero o supervisor)
   * y refresca automáticamente la caché local.
   */
  async function agregarConcepto(grupoId: number, descripcion: string): Promise<number> {
    const res = await conceptoService.crearConcepto({ grupoId, descripcion })
    await cargarGrupo(grupoId, true)
    return res.conceptoId
  }

  /**
   * Modifica la descripción de un concepto y actualiza la caché.
   */
  async function modificarConcepto(conceptoId: number, grupoId: number, descripcion: string): Promise<void> {
    await conceptoService.modificarConcepto(conceptoId, { descripcion })
    await cargarGrupo(grupoId, true)
  }

  /**
   * Elimina lógicamente un concepto y actualiza la caché.
   */
  async function eliminarConcepto(conceptoId: number, grupoId: number): Promise<void> {
    await conceptoService.eliminarConcepto(conceptoId)
    await cargarGrupo(grupoId, true)
  }

  /**
   * Obtiene la descripción real desde la base de datos para un grupo y código específicos.
   */
  function getDescripcion(grupoId: number, codigo: number): string | null {
    const lista = cacheGrupos.value[grupoId]
    if (!lista) return null
    const encontrado = lista.find((c) => c.codigo === codigo)
    return encontrado ? encontrado.descripcion : null
  }

  // Getters auxiliares directos para vistas
  const categorias = computed(() => cacheGrupos.value[2] || [])
  const roles = computed(() => cacheGrupos.value[1] || [])
  const metodosPago = computed(() => cacheGrupos.value[4] || [])

  return {
    cacheGrupos,
    cargando,
    error,
    categorias,
    roles,
    metodosPago,
    cargarGrupo,
    precargarGruposPrincipales,
    agregarConcepto,
    modificarConcepto,
    eliminarConcepto,
    getDescripcion,
  }
})

