<script setup lang="ts">
import { computed } from 'vue'
import {
  getBadgeRol,
  getBadgeCategoria,
  getBadgeEstadoProducto,
  getBadgeEstadoPendiente,
  getBadgeEstadoVenta,
  getBadgeMetodoVenta,
  getBadgeTipoMovimiento,
  getBadgeTipoMovimientoInventario,
  getBadgeEstadoUsuario,
  type ConceptoItem
} from '@/constants/mapeoEstados'
import { useConceptosStore } from '@/stores/conceptos'

const props = defineProps<{
  tipo:
    | 'rol'
    | 'categoria'
    | 'estado_producto'
    | 'estado_pendiente'
    | 'sala_espera'
    | 'estado_venta'
    | 'metodo_venta'
    | 'tipo_movimiento'
    | 'tipo_movimiento_inventario'
    | 'estado_usuario'
  valor: number | null | undefined
  label?: string
  size?: 'sm' | 'md' | 'lg'
}>()

let conceptosStore: ReturnType<typeof useConceptosStore> | null = null
try {
  conceptosStore = useConceptosStore()
} catch {
  // Fallback si se usa fuera de Pinia
}

const resolvedLabel = computed<string | undefined>(() => {
  if (props.label) return props.label
  if (!props.valor || !conceptosStore) return undefined

  switch (props.tipo) {
    case 'rol':
      return conceptosStore.getDescripcion(1, props.valor) || undefined
    case 'categoria':
      return conceptosStore.getDescripcion(2, props.valor) || undefined
    case 'metodo_venta':
      return conceptosStore.getDescripcion(4, props.valor) || undefined
    case 'tipo_movimiento':
      return conceptosStore.getDescripcion(6, props.valor) || undefined
    case 'tipo_movimiento_inventario':
      return conceptosStore.getDescripcion(9, props.valor) || undefined
    default:
      return undefined
  }
})

const info = computed<ConceptoItem>(() => {
  const lbl = resolvedLabel.value

  switch (props.tipo) {
    case 'rol':
      return getBadgeRol(props.valor, lbl)
    case 'categoria':
      return getBadgeCategoria(props.valor, lbl)
    case 'estado_producto':
      return getBadgeEstadoProducto(props.valor, lbl)
    case 'estado_pendiente':
    case 'sala_espera':
      return getBadgeEstadoPendiente(props.valor, lbl)
    case 'estado_venta':
      return getBadgeEstadoVenta(props.valor, lbl)
    case 'metodo_venta':
      return getBadgeMetodoVenta(props.valor, lbl)
    case 'tipo_movimiento':
      return getBadgeTipoMovimiento(props.valor, lbl)
    case 'tipo_movimiento_inventario':
      return getBadgeTipoMovimientoInventario(props.valor, lbl)
    case 'estado_usuario':
      return getBadgeEstadoUsuario(props.valor, lbl)
    default:
      return {
        id: 0,
        codigo: 0,
        label: lbl || 'No definido',
        bg: '#F1F5F9',
        text: '#64748B',
        border: '#CBD5E1'
      }
  }
})
</script>

<template>
  <span
    class="concepto-badge"
    :class="props.size || 'sm'"
    :style="{
      backgroundColor: info.bg,
      color: info.text,
      borderColor: info.border
    }"
  >
    <span class="concepto-dot" :style="{ backgroundColor: info.text }"></span>
    <span class="concepto-label">{{ info.label }}</span>
  </span>
</template>

<style scoped>
.concepto-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  border-radius: 9999px;
  border: 1px solid transparent;
  line-height: 1.2;
  white-space: nowrap;
  max-width: 100%;
}
.concepto-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.concepto-badge.sm {
  font-size: 0.72rem;
  padding: 0.22rem 0.55rem;
}
.concepto-badge.md {
  font-size: 0.8rem;
  padding: 0.3rem 0.75rem;
}
.concepto-badge.lg {
  font-size: 0.9rem;
  padding: 0.4rem 0.9rem;
}
.concepto-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
</style>

