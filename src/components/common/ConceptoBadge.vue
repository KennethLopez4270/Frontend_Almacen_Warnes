<script setup lang="ts">
import { computed } from 'vue'
import {
  getBadgeRol,
  getBadgeEstadoProducto,
  getBadgeEstadoPendiente,
  getBadgeEstadoVenta,
  getBadgeMetodoVenta,
  getBadgeTipoMovimiento,
  type ConceptoItem
} from '@/constants/mapeoEstados'

const props = defineProps<{
  tipo: 'rol' | 'estado_producto' | 'estado_pendiente' | 'sala_espera' | 'estado_venta' | 'metodo_venta' | 'tipo_movimiento'
  valor: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
}>()

const info = computed<ConceptoItem>(() => {
  switch (props.tipo) {
    case 'rol':
      return getBadgeRol(props.valor)
    case 'estado_producto':
      return getBadgeEstadoProducto(props.valor)
    case 'estado_pendiente':
    case 'sala_espera':
      return getBadgeEstadoPendiente(props.valor)
    case 'estado_venta':
      return getBadgeEstadoVenta(props.valor)
    case 'metodo_venta':
      return getBadgeMetodoVenta(props.valor)
    case 'tipo_movimiento':
      return getBadgeTipoMovimiento(props.valor)
    default:
      return {
        id: 0,
        codigo: 0,
        label: 'No definido',
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

