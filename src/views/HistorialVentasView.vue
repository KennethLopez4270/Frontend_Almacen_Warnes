<script setup lang="ts">
</script>

<template>
  <div class="view-container">
    <div class="view-card">
      <span class="badge">Ventas</span>
      <h1>Historial de Ventas</h1>
      <p>Consulta de tickets, facturas y registros de transacciones realizadas.</p>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  padding: 1.5rem;
}
.view-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #06b6d4;
  background-color: #ecfeff;
  border-radius: 9999px;
  margin-bottom: 0.75rem;
}
h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}
p {
  color: #64748b;
  font-size: 0.95rem;
}
</style>
