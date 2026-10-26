<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="header-content">
        <div class="brand">
          <div class="brand-logo">TW</div>
          <div>
            <span class="brand-title">Tienda Warnes</span>
            <span class="brand-subtitle">Web Management System</span>
          </div>
        </div>

        <nav class="nav-links">
          <div class="nav-group">
            <span class="group-label">Acceso</span>
            <RouterLink to="/" class="nav-item">Login</RouterLink>
          </div>

          <div class="nav-group">
            <span class="group-label">Ventas</span>
            <RouterLink to="/pos" class="nav-item">Terminal POS</RouterLink>
            <RouterLink to="/auditoria/sala-espera" class="nav-item">Sala de Espera</RouterLink>
          </div>

          <div class="nav-group">
            <span class="group-label">Inventario</span>
            <RouterLink to="/inventario" class="nav-item">Inventario</RouterLink>
            <RouterLink to="/inventario/proveedores" class="nav-item">Proveedores</RouterLink>
            <RouterLink to="/inventario/kardex" class="nav-item">Kardex</RouterLink>
          </div>

          <div class="nav-group">
            <span class="group-label">Caja</span>
            <RouterLink to="/caja/arqueo" class="nav-item">Arqueo</RouterLink>
            <RouterLink to="/caja/historial-ventas" class="nav-item">Historial Ventas</RouterLink>
          </div>

          <div class="nav-group">
            <span class="group-label">Administración</span>
            <RouterLink to="/dashboard" class="nav-item">Dashboard</RouterLink>
            <RouterLink to="/admin/usuarios" class="nav-item">Usuarios</RouterLink>
            <RouterLink to="/admin/configuracion" class="nav-item">Configuración</RouterLink>
          </div>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <p>Tienda Warnes &copy; 2026 - Vue 3 + Vite + Vue Router</p>
    </footer>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    sans-serif;
  background-color: #f8fafc;
  color: #0f172a;
  min-height: 100vh;
}
</style>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  font-weight: 800;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
}

.brand-title {
  display: block;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.brand-subtitle {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
}

.group-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-right: 0.25rem;
}

.nav-item {
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 500;
  color: #475569;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.nav-item:hover {
  color: #1e293b;
  background-color: rgba(255, 255, 255, 0.7);
}

.nav-item.router-link-active {
  background-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.app-main {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.app-footer {
  border-top: 1px solid #e2e8f0;
  padding: 1.5rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
  background: #ffffff;
}
</style>
