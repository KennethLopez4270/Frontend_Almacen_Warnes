<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { cajaService } from '@/modules/caja/services/cajaService'
import NotificacionesBell from '@/components/common/NotificacionesBell.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Mapa de títulos limpios para la barra superior
const titulosRutas: Record<string, { modulo: string; titulo: string }> = {
  '/pos': { modulo: 'Ventas', titulo: 'Terminal Punto de Venta (POS)' },
  '/caja/historial-ventas': { modulo: 'Ventas', titulo: 'Historial de Transacciones' },
  '/ventas/clientes': { modulo: 'Ventas', titulo: 'Gestión de Clientes' },
  '/inventario': { modulo: 'Inventario', titulo: 'Lotes y Stock Físico' },
  '/inventario/proveedores': { modulo: 'Inventario', titulo: 'Distribuidores y Acuerdos' },
  '/inventario/kardex': { modulo: 'Inventario', titulo: 'Historial de Movimientos' },
  '/caja/arqueo': { modulo: 'Control de Caja', titulo: 'Arqueo y Cierre de Turno' },
  '/caja/movimientos': { modulo: 'Control de Caja', titulo: 'Movimientos de Caja' },
  '/caja/libro-mayor': { modulo: 'Control de Caja', titulo: 'Libro Mayor y Reportes' },
  '/dashboard': { modulo: 'Administración', titulo: 'Dashboard Ejecutivo y Métricas' },
  '/admin/usuarios': { modulo: 'Administración', titulo: 'Gestión Integral de Usuarios' },
  '/admin/sesiones': { modulo: 'Administración', titulo: 'Auditoría de Sesiones' },
  '/admin/configuracion': { modulo: 'Administración', titulo: 'Configuración Paramétrica del ERP' },
  '/notificaciones': { modulo: 'Notificaciones', titulo: 'Centro de Alertas y Notificaciones' },
}

const infoRutaActual = computed(() => {
  return titulosRutas[route.path] || { modulo: 'Sistema', titulo: 'Almacén Warnes' }
})

function irASeleccionarSucursal() {
  router.push('/seleccionar-sucursal')
}

const procesandoLogout = ref(false)

async function handleLogout() {
  if (procesandoLogout.value) return
  procesandoLogout.value = true

  try {
    if (authStore.isCajero) {
      try {
        const resumen = await cajaService.obtenerResumenTurno()
        if (resumen && resumen.requiereArqueo) {
          procesandoLogout.value = false
          router.push('/caja/arqueo')
          return
        }
      } catch (err) {
        console.warn('No se pudo consultar resumen de turno:', err)
      }
    }

    try {
      await cajaService.cerrarSesionDirecta()
    } catch (err) {
      console.warn('Aviso al cerrar sesión directa:', err)
    }

    authStore.logout()
    router.push('/')
  } finally {
    procesandoLogout.value = false
  }
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

      <!-- PERFIL UNIFICADO DEL OPERADOR + CERRAR SESIÓN -->
      <div class="user-pill">
        <div class="user-avatar-sm" :title="`${authStore.nombreCompleto} (@${authStore.usuario})`">
          {{ (authStore.usuario || 'U').charAt(0).toUpperCase() }}
        </div>
        <div class="user-meta">
          <span class="user-name" :title="authStore.nombreCompleto">{{ authStore.nombreCompleto }}</span>
          <span class="user-subline" :title="`@${authStore.usuario} • ${authStore.rolNombre}`">
            <span class="user-handle">@{{ authStore.usuario }}</span>
            <span class="user-dot">&bull;</span>
            <span class="user-role">{{ authStore.rolNombre }}</span>
          </span>
        </div>

        <button
          type="button"
          class="btn-header-logout"
          :disabled="procesandoLogout"
          title="Cerrar Sesión"
          @click="handleLogout"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="logout-icon">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span class="logout-label">{{ procesandoLogout ? 'Saliendo...' : 'Salir' }}</span>
        </button>
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
  gap: 14px;
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

/* USER PILL + LOGOUT */
.user-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 12px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.user-avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.88rem;
  color: #ffffff;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.user-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.2;
  max-width: 190px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-subline {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  line-height: 1.2;
  color: #94a3b8;
  max-width: 210px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-handle {
  font-family: var(--erp-font-mono, monospace);
  color: #cbd5e1;
}

.user-dot {
  color: #475569;
}

.user-role {
  color: #94a3b8;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-header-logout {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  padding: 6px 11px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.28);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-header-logout:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

.btn-header-logout:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logout-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .user-meta {
    display: none;
  }
  .logout-label {
    display: none;
  }
}
</style>
