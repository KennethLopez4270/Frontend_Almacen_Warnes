<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NotificacionesBell from '@/components/common/NotificacionesBell.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Mapa de títulos limpios para la barra superior
const titulosRutas: Record<string, { modulo: string; titulo: string }> = {
  '/pos': { modulo: 'Ventas', titulo: 'Terminal Punto de Venta (POS)' },
  '/inventario': { modulo: 'Inventario', titulo: 'Gestión de Inventario' },
  '/inventario/proveedores': { modulo: 'Inventario', titulo: 'Distribuidores y Acuerdos' },
  '/inventario/kardex': { modulo: 'Inventario', titulo: 'Historial de Movimientos' },
  '/auditoria/sala-espera': { modulo: 'Inventario', titulo: 'Sala de Espera y Auditoría' },
  '/caja/arqueo': { modulo: 'Caja', titulo: 'Arqueo y Cierre de Caja' },
  '/caja/historial-ventas': { modulo: 'Caja', titulo: 'Historial de Transacciones' },
  '/dashboard': { modulo: 'Administración', titulo: 'Dashboard Ejecutivo y Métricas' },
  '/admin/usuarios': { modulo: 'Administración', titulo: 'Gestión Integral de Usuarios' },
  '/admin/configuracion': { modulo: 'Administración', titulo: 'Configuración Paramétrica del ERP' },
  '/notificaciones': { modulo: 'Notificaciones', titulo: 'Centro de Alertas y Notificaciones' },
}

const infoRutaActual = computed(() => {
  return titulosRutas[route.path] || { modulo: 'Sistema', titulo: 'Almacén Warnes' }
})

function irASeleccionarSucursal() {
  router.push('/seleccionar-sucursal')
}
</script>

<template>
  <header class="app-global-header">
    <div class="header-left">
      <div class="header-breadcrumb">
        <span class="bc-module">{{ infoRutaActual.modulo }}</span>
        <span class="bc-sep">/</span>
        <span class="bc-title">{{ infoRutaActual.titulo }}</span>
      </div>
    </div>

    <div class="header-right">
      <!-- BADGE / SELECTOR DE SUCURSAL ACTIVA -->
      <div v-if="authStore.puedeCambiarSucursal" class="branch-pill-box">
        <button
          type="button"
          class="branch-selector-btn"
          title="Haga clic para cambiar de sucursal de trabajo"
          @click="irASeleccionarSucursal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="branch-icon">
            <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
          </svg>
          <span class="branch-name">
            {{ authStore.sucursalNombre || (authStore.sucursalId ? `Sucursal #${authStore.sucursalId}` : 'Todas las sucursales') }}
          </span>
          <span class="branch-change-hint">Cambiar</span>
        </button>
      </div>
      <div v-else-if="authStore.sucursalId" class="branch-pill-fixed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="branch-icon">
          <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M13 11h2M9 15h2M13 15h2" />
        </svg>
        <span class="branch-name">{{ authStore.sucursalNombre || `Sucursal #${authStore.sucursalId}` }}</span>
      </div>

      <!-- CAMPANA DE NOTIFICACIONES EN TIEMPO REAL -->
      <NotificacionesBell />

      <!-- PERFIL RESUMIDO DEL OPERADOR -->
      <div class="user-pill">
        <div class="user-avatar-sm">
          {{ (authStore.usuario || 'U').charAt(0).toUpperCase() }}
        </div>
        <div class="user-meta">
          <span class="user-name">{{ authStore.nombreCompleto }}</span>
          <span class="user-role">{{ authStore.rolNombre }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-global-header {
  height: 64px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  color: #ffffff;
  position: sticky;
  top: 0;
  z-index: 900;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
}

.bc-module {
  color: #94a3b8;
  font-weight: 500;
}

.bc-sep {
  color: #475569;
}

.bc-title {
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* SUCURSAL PILL */
.branch-selector-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.branch-selector-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: #38bdf8;
  color: #38bdf8;
}

.branch-change-hint {
  font-size: 0.7rem;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.branch-pill-fixed {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.78rem;
  font-weight: 600;
}

.branch-icon {
  width: 15px;
  height: 15px;
  color: #38bdf8;
}

/* USER PILL */
.user-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.user-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: #ffffff;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: #f1f5f9;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.68rem;
  color: #94a3b8;
}
</style>
