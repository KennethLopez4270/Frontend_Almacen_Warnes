<script setup lang="ts">
</script>

<template>
  <div class="view-container">
    <div class="view-card">
      <span class="badge">Acceso</span>
      <h1>Inicio de Sesión</h1>
      <p>Vista de autenticación para el sistema Tienda Warnes.</p>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}
.view-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  max-width: 480px;
  width: 100%;
}
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  background-color: #eff6ff;
  border-radius: 9999px;
  margin-bottom: 1rem;
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
