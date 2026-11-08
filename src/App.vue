<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from '@/components/common/AppSidebar.vue'

const route = useRoute()
const authStore = useAuthStore()

// Solo mostramos el sidebar si el usuario tiene sesión activa y no está en la vista de login o selector de sucursal
const showSidebar = computed(() => {
  return authStore.isAuthenticated && route.path !== '/' && route.path !== '/seleccionar-sucursal'
})
</script>

<template>
  <div class="app-layout" :class="{ 'has-sidebar': showSidebar }">
    <!-- BARRA LATERAL IZQUIERDA INTELIGENTE -->
    <AppSidebar v-if="showSidebar" />

    <!-- CONTENEDOR PRINCIPAL -->
    <div class="main-wrapper" :class="{ 'with-sidebar-offset': showSidebar }">
      <main class="app-main">
        <RouterView />
      </main>

      <footer v-if="showSidebar" class="app-footer">
        <p>Almacén Warnes &copy; 2026 &bull; Sistema de Gestión Integral ERP</p>
      </footer>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--erp-font-family);
  background-color: var(--erp-bg-page);
  color: var(--erp-text-main);
  min-height: 100vh;
}
</style>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  background-color: #f8fafc;
  width: 100%;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  transition: padding-left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-wrapper.with-sidebar-offset {
  padding-left: 72px; /* Margen para el sidebar colapsado */
}

.app-main {
  flex: 1;
  width: 100%;
  padding: 1.5rem 2rem;
  max-width: 1600px;
  margin: 0 auto;
}

.main-wrapper:not(.with-sidebar-offset) .app-main {
  padding: 0;
  max-width: none;
}

.app-footer {
  border-top: 1px solid #e2e8f0;
  padding: 1rem 1.5rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.8rem;
  background: #ffffff;
  margin-top: auto;
}
</style>
