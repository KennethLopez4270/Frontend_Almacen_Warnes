<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace({ path: '/inventario', query: { tab: 'kardex' } })
})
</script>

<template>
  <div class="view-container">
    <div class="view-card">
      <span class="badge">Auditoría de Stock</span>
      <h1>Redirigiendo a Historial de Movimientos (Kardex)...</h1>
      <p>Cargando módulo integral de inventario y trazabilidad de movimientos de stock.</p>
    </div>
  </div>
</template>

<style scoped src="./KardexView.css"></style>
