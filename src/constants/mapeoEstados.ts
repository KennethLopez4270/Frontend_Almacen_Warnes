/**
 * ====================================================================
 * MAPEO DE CONCEPTOS PARAMETRICOS (POSTGRESQL -> FRONTEND)
 * ====================================================================
 * Este archivo centraliza la correspondencia entre los códigos numéricos
 * almacenados en la base de datos PostgreSQL (tabla 'conceptos') y sus
 * representaciones visuales (etiquetas, colores y estilos de badges)
 * para toda la aplicación Vue 3.
 */

export interface ConceptoItem {
  id: number
  codigo: number
  label: string
  bg: string
  text: string
  border: string
  icon?: string
}

// ====================================================================
// 1. ROLES DE USUARIO (`rol_id` en usuarios / conceptos grupo 1)
// ====================================================================

export const ROLES_USUARIO = {
  CAJERO: 1,
  SUPERVISOR: 2,
  PROPIETARIO: 3,
} as const

export type RolUsuarioId = (typeof ROLES_USUARIO)[keyof typeof ROLES_USUARIO]

export const MAPA_ROLES: Record<number, ConceptoItem> = {
  [ROLES_USUARIO.CAJERO]: {
    id: 1,
    codigo: 1,
    label: 'Cajero',
    bg: '#F1F5F9',
    text: '#334155',
    border: '#CBD5E1',
    icon: 'user'
  },
  [ROLES_USUARIO.SUPERVISOR]: {
    id: 2,
    codigo: 2,
    label: 'Supervisor',
    bg: '#EEF2FF',
    text: '#3730A3',
    border: '#C7D2FE',
    icon: 'shield-check'
  },
  [ROLES_USUARIO.PROPIETARIO]: {
    id: 3,
    codigo: 3,
    label: 'Propietario / Administrador',
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FDE68A',
    icon: 'crown'
  }
}

// ====================================================================
// 2. CATEGORIAS DE PRODUCTO (`categoria_id` en productos / conceptos grupo 2)
// ====================================================================

export const CATEGORIAS_PRODUCTO = {
  ALIMENTOS: 1,
  BEBIDAS: 2,
  JUGUETES: 3,
} as const

export const MAPA_CATEGORIAS: Record<number, ConceptoItem> = {
  [CATEGORIAS_PRODUCTO.ALIMENTOS]: {
    id: 6,
    codigo: 1,
    label: 'Alimentos',
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0'
  },
  [CATEGORIAS_PRODUCTO.BEBIDAS]: {
    id: 7,
    codigo: 2,
    label: 'Bebidas',
    bg: '#EFF6FF',
    text: '#1E40AF',
    border: '#BFDBFE'
  },
  [CATEGORIAS_PRODUCTO.JUGUETES]: {
    id: 8,
    codigo: 3,
    label: 'Juguetes',
    bg: '#FAF5FF',
    text: '#6B21A8',
    border: '#E9D5FF'
  }
}

// ====================================================================
// 3. ESTADOS DEL CATALOGO DE PRODUCTOS (`estado` en productos / conceptos grupo 3)
// ====================================================================

export const ESTADOS_PRODUCTO = {
  ACTIVO: 1,
  DESCONTINUADO: 2,
  SUSPENDIDO: 3,
} as const

export const MAPA_ESTADOS_PRODUCTO: Record<number, ConceptoItem> = {
  [ESTADOS_PRODUCTO.ACTIVO]: {
    id: 1,
    codigo: 1,
    label: 'Activo',
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0'
  },
  [ESTADOS_PRODUCTO.DESCONTINUADO]: {
    id: 2,
    codigo: 2,
    label: 'Descontinuado',
    bg: '#F8FAFC',
    text: '#475569',
    border: '#CBD5E1'
  },
  [ESTADOS_PRODUCTO.SUSPENDIDO]: {
    id: 3,
    codigo: 3,
    label: 'Suspendido',
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A'
  }
}

// ====================================================================
// 4. METODOS DE PAGO / VENTA (`metodo_venta` en ventas y movimientos / conceptos grupo 4)
// ====================================================================

export const METODOS_VENTA = {
  EFECTIVO: 1,
  QR: 2,
  QR_SIMPLE: 2, // alias compatibilidad
  TARJETA: 3,
  MIXTO: 4,
} as const

export const MAPA_METODOS_VENTA: Record<number, ConceptoItem> = {
  [METODOS_VENTA.EFECTIVO]: {
    id: 14,
    codigo: 1,
    label: 'Efectivo',
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0'
  },
  [METODOS_VENTA.QR]: {
    id: 15,
    codigo: 2,
    label: 'QR',
    bg: '#FAF5FF',
    text: '#6B21A8',
    border: '#E9D5FF'
  },
  [METODOS_VENTA.TARJETA]: {
    id: 16,
    codigo: 3,
    label: 'Tarjeta',
    bg: '#EFF6FF',
    text: '#1E40AF',
    border: '#BFDBFE'
  },
  [METODOS_VENTA.MIXTO]: {
    id: 17,
    codigo: 4,
    label: 'Mixto',
    bg: '#FFF7ED',
    text: '#9A3412',
    border: '#FED7AA'
  }
}

// ====================================================================
// 5. ESTADO DE LAS VENTAS (`estado` en ventas / conceptos grupo 5)
// ====================================================================

export const ESTADOS_VENTA = {
  PENDIENTE: 1,
  FINALIZADA: 2,
  COMPLETADA: 2, // alias compatibilidad
  ANULADA: 3,
} as const

export const MAPA_ESTADOS_VENTA: Record<number, ConceptoItem> = {
  [ESTADOS_VENTA.PENDIENTE]: {
    id: 19,
    codigo: 1,
    label: 'Pendiente',
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A'
  },
  [ESTADOS_VENTA.FINALIZADA]: {
    id: 20,
    codigo: 2,
    label: 'Finalizada',
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0'
  },
  [ESTADOS_VENTA.ANULADA]: {
    id: 21,
    codigo: 3,
    label: 'Anulada',
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA'
  }
}

// ====================================================================
// 6. TIPOS DE MOVIMIENTO (`tipo_movimiento` en movimientos / conceptos grupo 6)
// ====================================================================

export const TIPOS_MOVIMIENTO = {
  ENTRADA: 1,
  SALIDA: 2,
  INGRESO_VENTA: 1, // alias compatibilidad
  GASTO_OPERATIVO: 2, // alias compatibilidad
} as const

export const TIPOS_MOVIMIENTO_CAJA = TIPOS_MOVIMIENTO

export const MAPA_TIPOS_MOVIMIENTO: Record<number, ConceptoItem> = {
  [TIPOS_MOVIMIENTO.ENTRADA]: {
    id: 23,
    codigo: 1,
    label: 'Entrada',
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0'
  },
  [TIPOS_MOVIMIENTO.SALIDA]: {
    id: 24,
    codigo: 2,
    label: 'Salida',
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA'
  }
}

// ====================================================================
// 7. ESTADOS DE LA SALA DE ESPERA (`estado` en inventario_pendientes / conceptos grupo 7)
// ====================================================================

export const ESTADOS_SALA_ESPERA = {
  PENDIENTE: 1,
  APROBADO: 2,
  RECHAZADO: 3,
  OBSERVADO: 4,
} as const

export const MAPA_ESTADOS_SALA_ESPERA: Record<number, ConceptoItem> = {
  [ESTADOS_SALA_ESPERA.PENDIENTE]: {
    id: 26,
    codigo: 1,
    label: 'Pendiente de Revisión',
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A'
  },
  [ESTADOS_SALA_ESPERA.APROBADO]: {
    id: 27,
    codigo: 2,
    label: 'Aprobado',
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0'
  },
  [ESTADOS_SALA_ESPERA.RECHAZADO]: {
    id: 28,
    codigo: 3,
    label: 'Rechazado',
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA'
  },
  [ESTADOS_SALA_ESPERA.OBSERVADO]: {
    id: 29,
    codigo: 4,
    label: 'Observado por Supervisor',
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FED7AA'
  }
}

// ====================================================================
// 7. FUNCIONES HELPER PARA CONSUMO RAPIDO EN COMPONENTES
// ====================================================================

const ITEM_DESCONOCIDO: ConceptoItem = {
  id: 0,
  codigo: 0,
  label: 'No Especificado',
  bg: '#F1F5F9',
  text: '#64748B',
  border: '#CBD5E1'
}

export function getBadgeRol(rolId: number | null | undefined): ConceptoItem {
  if (!rolId) return ITEM_DESCONOCIDO
  return MAPA_ROLES[rolId] || { ...ITEM_DESCONOCIDO, label: `Rol #${rolId}` }
}

export function getBadgeCategoria(categoriaId: number | null | undefined): ConceptoItem {
  if (!categoriaId) return ITEM_DESCONOCIDO
  return MAPA_CATEGORIAS[categoriaId] || { ...ITEM_DESCONOCIDO, label: `Categoría #${categoriaId}` }
}

export function getBadgeEstadoProducto(estadoId: number | null | undefined): ConceptoItem {
  if (!estadoId) return ITEM_DESCONOCIDO
  return MAPA_ESTADOS_PRODUCTO[estadoId] || { ...ITEM_DESCONOCIDO, label: `Estado #${estadoId}` }
}

export function getBadgeEstadoPendiente(estadoId: number | null | undefined): ConceptoItem {
  if (!estadoId) return ITEM_DESCONOCIDO
  return MAPA_ESTADOS_SALA_ESPERA[estadoId] || { ...ITEM_DESCONOCIDO, label: `Estado #${estadoId}` }
}

export function getBadgeEstadoVenta(estadoId: number | null | undefined): ConceptoItem {
  if (!estadoId) return ITEM_DESCONOCIDO
  return MAPA_ESTADOS_VENTA[estadoId] || { ...ITEM_DESCONOCIDO, label: `Venta #${estadoId}` }
}

export function getBadgeMetodoVenta(metodoId: number | null | undefined): ConceptoItem {
  if (!metodoId) return ITEM_DESCONOCIDO
  return MAPA_METODOS_VENTA[metodoId] || { ...ITEM_DESCONOCIDO, label: `Método #${metodoId}` }
}

export function getBadgeTipoMovimiento(tipoId: number | null | undefined): ConceptoItem {
  if (!tipoId) return ITEM_DESCONOCIDO
  return MAPA_TIPOS_MOVIMIENTO[tipoId] || { ...ITEM_DESCONOCIDO, label: `Movimiento #${tipoId}` }
}

