<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificacionesStore } from '@/stores/notificaciones'

const authStore = useAuthStore()
const notificacionesStore = useNotificacionesStore()

const cargandoEstado = ref(false)
const enviandoSolicitud = ref(false)
const mensajeFeedback = ref<string | null>(null)

const esSupervisor = computed(() => authStore.isSupervisor)
const esPropietario = computed(() => authStore.isPropietario)

const permisoDashboard = computed(() => notificacionesStore.dashboardPermiso)
const estadoActual = computed(() => {
  if (esPropietario.value) return 'APROBADO'
  return permisoDashboard.value?.estado || 'NINGUNO'
})

const tieneAcceso = computed(() => {
  if (esPropietario.value) return true
  return estadoActual.value === 'APROBADO'
})

onMounted(async () => {
  if (esSupervisor.value) {
    cargandoEstado.value = true
    try {
      await notificacionesStore.consultarEstadoDashboard()
    } finally {
      cargandoEstado.value = false
    }
  }
})

async function solicitarAcceso() {
  enviandoSolicitud.value = true
  mensajeFeedback.value = null
  try {
    const res = await notificacionesStore.solicitarAccesoDashboard()
    mensajeFeedback.value = res.mensaje
  } catch (err: any) {
    mensajeFeedback.value = err.userMessage || 'Error al enviar la solicitud al Propietario.'
  } finally {
    enviandoSolicitud.value = false
  }
}

async function verificarEstado() {
  cargandoEstado.value = true
  mensajeFeedback.value = null
  try {
    const res = await notificacionesStore.consultarEstadoDashboard()
    mensajeFeedback.value = res.mensaje
  } catch (err: any) {
    mensajeFeedback.value = err.userMessage || 'Error al consultar estado de autorización.'
  } finally {
    cargandoEstado.value = false
  }
}
</script>

<template>
  <div class="dashboard-page">
    <!-- CASO 1: SUPERVISOR SIN ACCESO APROBADO (CONTROL DE AUTORIZACIÓN) -->
    <div v-if="!tieneAcceso" class="access-restricted-wrapper">
      <div class="access-card">
        <div class="access-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lock-svg">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <span class="access-badge">Control de Acceso Gerencial</span>
        <h2 class="access-title">Visualización de Dashboard Restringida</h2>
        <p class="access-description">
          El Dashboard Ejecutivo contiene métricas comerciales y financieras consolidadas.
          Para habilitar su acceso temporal a tu perfil de <strong>Supervisor</strong>, es necesaria
          la autorización directa del Propietario.
        </p>

        <!-- MENSAJE DE FEEDBACK -->
        <div v-if="mensajeFeedback" class="feedback-banner">
          {{ mensajeFeedback }}
        </div>

        <!-- ESTADO: PENDIENTE -->
        <div v-if="estadoActual === 'PENDIENTE'" class="status-box status-pending">
          <div class="status-indicator-pending"></div>
          <div class="status-info">
            <h4 class="status-title">Solicitud Enviada — Esperando Autorización</h4>
            <p class="status-msg">
              Tu solicitud fue recibida y se encuentra activa en el Centro de Notificaciones del Propietario.
              Puedes consultar si ya fue aprobada haciendo clic en el botón siguiente.
            </p>
          </div>
          <button
            type="button"
            class="btn-dashboard-action btn-check-status"
            :disabled="cargandoEstado"
            @click="verificarEstado"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="btn-icon"
              :class="{ 'is-spinning': cargandoEstado }"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>{{ cargandoEstado ? 'Verificando...' : 'Verificar Estado Ahora' }}</span>
          </button>
        </div>

        <!-- ESTADO: RECHAZADO O NINGUNO -->
        <div v-else class="status-box status-idle">
          <div class="status-info">
            <h4 class="status-title">
              {{ estadoActual === 'RECHAZADO' ? 'Solicitud Previa No Aprobada' : 'Permiso No Solicitado' }}
            </h4>
            <p class="status-msg">
              {{
                estadoActual === 'RECHAZADO'
                  ? 'El Propietario revocó o rechazó la solicitud previa. Puedes volver a enviar una nueva solicitud de acceso.'
                  : 'Pulsa el botón inferior para solicitar permiso temporal de visualización al Propietario.'
              }}
            </p>
          </div>
          <button
            type="button"
            class="btn-dashboard-action btn-request-access"
            :disabled="enviandoSolicitud"
            @click="solicitarAcceso"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
            <span>{{ enviandoSolicitud ? 'Enviando Solicitud...' : 'Solicitar Autorización al Propietario' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- CASO 2: ACCESO CONCEDIDO (PROPIETARIO O SUPERVISOR APROBADO) -->
    <div v-else class="dashboard-content">
      <div class="dashboard-banner-approved" v-if="esSupervisor">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="banner-icon">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>Acceso al Dashboard autorizado formalmente por el Propietario.</span>
      </div>

      <!-- CABECERA PRINCIPAL -->
      <div class="view-card">
        <div class="card-header-row">
          <div>
            <span class="badge">Métricas y Rendimiento</span>
            <h1 class="page-title">Dashboard Ejecutivo</h1>
            <p class="page-subtitle">Indicadores consolidados de inventario, operaciones y rotación física.</p>
          </div>
        </div>

        <!-- TARJETAS RESUMEN DE INDICADORES -->
        <div class="kpi-grid">
          <div class="kpi-card kpi-blue">
            <span class="kpi-label">Gestión de Stock Activo</span>
            <span class="kpi-value">En línea</span>
            <span class="kpi-sub">Sincronizado con PostgreSQL</span>
          </div>
          <div class="kpi-card kpi-green">
            <span class="kpi-label">Auditoría Sala de Espera</span>
            <span class="kpi-value">Verificada</span>
            <span class="kpi-sub">Filtro por Rol activo</span>
          </div>
          <div class="kpi-card kpi-amber">
            <span class="kpi-label">Alertas Internas</span>
            <span class="kpi-value">{{ notificacionesStore.totalGeneral }} activas</span>
            <span class="kpi-sub">{{ notificacionesStore.totalCriticas }} críticas</span>
          </div>
          <div class="kpi-card kpi-purple">
            <span class="kpi-label">Control de Acceso</span>
            <span class="kpi-value">{{ esPropietario ? 'Propietario' : 'Supervisor' }}</span>
            <span class="kpi-sub">Sesión verificada</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  width: 100%;
}

/* ACCESO RESTRINGIDO */
.access-restricted-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem 1rem;
}

.access-card {
  max-width: 640px;
  width: 100%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
  text-align: center;
}

.access-icon-box {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.25rem;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.lock-svg {
  width: 32px;
  height: 32px;
}

.access-badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #b91c1c;
  background: #fef2f2;
  border-radius: 9999px;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.access-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.75rem;
}

.access-description {
  font-size: 0.92rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.feedback-banner {
  padding: 0.75rem 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  margin-bottom: 1.25rem;
}

/* CAJAS DE ESTADO */
.status-box {
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.status-pending {
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.status-idle {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.status-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.status-msg {
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.5;
}

.btn-dashboard-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.btn-request-access {
  background: #0f172a;
  color: #ffffff;
}

.btn-request-access:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-1px);
}

.btn-check-status {
  background: #d97706;
  color: #ffffff;
}

.btn-check-status:hover:not(:disabled) {
  background: #b45309;
}

.is-spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

/* BANNER SUPERVISOR APROBADO */
.dashboard-banner-approved {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.75rem 1.25rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  border-radius: 10px;
  margin-bottom: 1.25rem;
  font-size: 0.88rem;
  font-weight: 600;
}

.banner-icon {
  width: 20px;
  height: 20px;
  color: #10b981;
}

/* VISTA COMPLETA */
.view-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  background-color: #eff6ff;
  border-radius: 9999px;
  margin-bottom: 0.75rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: #64748b;
  font-size: 0.95rem;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 2rem;
}

.kpi-card {
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
}

.kpi-blue {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.kpi-green {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.kpi-amber {
  background: #fffbeb;
  border-color: #fde68a;
}

.kpi-purple {
  background: #faf5ff;
  border-color: #e9d5ff;
}

.kpi-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.kpi-sub {
  font-size: 0.75rem;
  color: #64748b;
}
</style>
