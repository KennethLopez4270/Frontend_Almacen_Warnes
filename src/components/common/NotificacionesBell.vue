<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificacionesStore } from '@/stores/notificaciones'
import { useAuthStore } from '@/stores/auth'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import type { NotificacionItemDTO } from '@/services/notificacionesService'
import { normalizarDireccion, obtenerSeccionNotificacion } from '@/config/api'

const router = useRouter()
const notificacionesStore = useNotificacionesStore()
const authStore = useAuthStore()

// Control del menú desplegable
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// Filtro activo en el panel
type FiltroChip = 'TODAS' | 'NO_LEIDAS' | 'STOCK' | 'ESPERA' | 'SEGURIDAD'
const filtroActivo = ref<FiltroChip>('TODAS')

// Procesando resolución de dashboard en curso
const resolviendoId = ref<number | null>(null)
const marcandoTodas = ref(false)

// Cerrar dropdown al hacer clic fuera
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (authStore.isAuthenticated) {
    notificacionesStore.iniciarPolling(20000)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  notificacionesStore.detenerPolling()
})

// Refrescar si cambia la sucursal activa o usuario
watch(
  () => [authStore.sucursalId, authStore.usuarioId],
  () => {
    if (authStore.isAuthenticated) {
      notificacionesStore.cargarNotificaciones(true)
    }
  }
)

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    notificacionesStore.cargarNotificaciones(true)
  }
}

const listaNotificaciones = computed(() => notificacionesStore.notificaciones || [])

const conteoTotal = computed(() => {
  return typeof notificacionesStore.totalGeneral === 'number'
    ? notificacionesStore.totalGeneral
    : listaNotificaciones.value.length
})

const conteoNoLeidas = computed(() => {
  return typeof notificacionesStore.totalNoLeidas === 'number'
    ? notificacionesStore.totalNoLeidas
    : listaNotificaciones.value.filter((n) => !n.leido).length
})

const conteoStock = computed(() => notificacionesStore.notificacionesStock?.length ?? 0)
const conteoEspera = computed(() => notificacionesStore.notificacionesEspera?.length ?? 0)
const conteoSeguridad = computed(() => notificacionesStore.notificacionesSeguridad?.length ?? 0)

// Lista filtrada según el chip seleccionado
const notificacionesFiltradas = computed(() => {
  const lista = listaNotificaciones.value
  switch (filtroActivo.value) {
    case 'NO_LEIDAS':
      return lista.filter((n) => !n.leido)
    case 'STOCK':
      return notificacionesStore.notificacionesStock || []
    case 'ESPERA':
      return notificacionesStore.notificacionesEspera || []
    case 'SEGURIDAD':
      return notificacionesStore.notificacionesSeguridad || []
    default:
      return lista
  }
})

// Formateador de tiempo relativo
function formatearTiempoRelativo(fechaStr: string | null): string {
  if (!fechaStr) return 'Reciente'
  const ahora = new Date()
  const fecha = new Date(fechaStr)
  const diffMs = ahora.getTime() - fecha.getTime()
  const diffSeg = Math.floor(diffMs / 1000)

  if (diffSeg < 60) return 'Hace unos segundos'
  const diffMin = Math.floor(diffSeg / 60)
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `Hace ${diffHoras} h`
  const diffDias = Math.floor(diffHoras / 24)
  return `Hace ${diffDias} d`
}

// Resolucion de Dashboard (Propietario)
async function resolverDashboard(supervisorId: number | null, autorizar: boolean) {
  if (!supervisorId) return
  resolviendoId.value = supervisorId
  try {
    await notificacionesStore.resolverDashboard(supervisorId, autorizar)
  } finally {
    resolviendoId.value = null
  }
}

// Marcar todas como leídas
async function marcarTodasComoLeidas() {
  marcandoTodas.value = true
  try {
    await notificacionesStore.marcarTodasLeidas()
  } finally {
    marcandoTodas.value = false
  }
}

// Navegación rápida y marcado de lectura
async function ejecutarAccionAlerta(item: NotificacionItemDTO) {
  isOpen.value = false

  // Marcar como leída si aún estaba pendiente
  if (!item.leido) {
    await notificacionesStore.marcarLeido(item.idNotificacion)
  }

  const rutaDestino = normalizarDireccion(item.direccion || item.rutaAccion, item.tipoNotificacion)
  router.push(rutaDestino)
}

function irAlCentroNotificaciones() {
  isOpen.value = false
  router.push('/notificaciones')
}

async function alHacerClicTarjeta(item: NotificacionItemDTO) {
  if (!item.leido) {
    await notificacionesStore.marcarLeido(item.idNotificacion)
  }
}
</script>

<template>
  <div ref="dropdownRef" class="notif-bell-container">
    <!-- BOTON DE CAMPANA PRINCIPAL -->
    <button
      type="button"
      class="notif-bell-btn"
      :class="{
        'is-active': isOpen,
        'has-critical': notificacionesStore.tieneCriticasNoLeidas,
      }"
      title="Centro de Notificaciones y Alertas Internas"
      @click="toggleDropdown"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="bell-icon"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>

      <!-- BADGE DINAMICO CON CONTADOR DE NO LEIDAS -->
      <span
        v-if="conteoNoLeidas > 0"
        class="notif-badge"
        :class="{
          'badge-critical': notificacionesStore.tieneCriticasNoLeidas,
          'badge-warning': !notificacionesStore.tieneCriticasNoLeidas && notificacionesStore.tieneAltas,
          'badge-info': !notificacionesStore.tieneCriticasNoLeidas && !notificacionesStore.tieneAltas,
        }"
      >
        {{ conteoNoLeidas > 99 ? '99+' : conteoNoLeidas }}
      </span>
    </button>

    <!-- PANEL DESPLEGABLE (DROPDOWN) -->
    <transition name="dropdown-anim">
      <div v-if="isOpen" class="notif-dropdown-panel">
        <!-- CABECERA DEL PANEL -->
        <div class="panel-header">
          <div class="header-title-box">
            <span class="panel-title">Notificaciones y Alertas</span>
            <span class="panel-counter">{{ conteoNoLeidas }} sin leer</span>
          </div>
          <div class="header-actions">
            <button
              v-if="conteoNoLeidas > 0"
              type="button"
              class="btn-mark-all"
              title="Marcar todas como leídas"
              :disabled="marcandoTodas"
              @click="marcarTodasComoLeidas"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon-xs">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Marcar todas</span>
            </button>
            <button
              type="button"
              class="btn-refresh"
              title="Actualizar ahora"
              :disabled="notificacionesStore.cargando"
              @click="notificacionesStore.cargarNotificaciones(false)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="refresh-icon"
                :class="{ 'is-spinning': notificacionesStore.cargando }"
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- CHIPS DE FILTRO RAPIDO -->
        <div class="panel-filter-chips">
          <button
            type="button"
            class="filter-chip"
            :class="{ active: filtroActivo === 'TODAS' }"
            @click="filtroActivo = 'TODAS'"
          >
            Todas ({{ conteoTotal }})
          </button>
          <button
            type="button"
            class="filter-chip chip-unread"
            :class="{ active: filtroActivo === 'NO_LEIDAS' }"
            @click="filtroActivo = 'NO_LEIDAS'"
          >
            No leídas ({{ conteoNoLeidas }})
          </button>
          <button
            type="button"
            class="filter-chip"
            :class="{ active: filtroActivo === 'STOCK' }"
            @click="filtroActivo = 'STOCK'"
          >
            Stock ({{ conteoStock }})
          </button>
          <button
            type="button"
            class="filter-chip"
            :class="{ active: filtroActivo === 'ESPERA' }"
            @click="filtroActivo = 'ESPERA'"
          >
            Sala de Espera ({{ conteoEspera }})
          </button>
          <button
            type="button"
            class="filter-chip"
            :class="{ active: filtroActivo === 'SEGURIDAD' }"
            @click="filtroActivo = 'SEGURIDAD'"
          >
            Accesos ({{ conteoSeguridad }})
          </button>
        </div>

        <!-- LISTA DE ALERTAS CON SCROLL -->
        <div class="panel-body">
          <div v-if="notificacionesFiltradas.length === 0" class="empty-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              class="empty-icon"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 14 14"></polyline>
            </svg>
            <p class="empty-title">Sin alertas en esta sección</p>
            <p class="empty-desc">Todos los indicadores se encuentran en niveles normales.</p>
          </div>

          <div
            v-for="item in notificacionesFiltradas"
            :key="item.idNotificacion"
            class="notif-card"
            :class="[
              `severidad-${item.severidad.toLowerCase()}`,
              { 'card-unread': !item.leido, 'card-read': item.leido }
            ]"
            @click="alHacerClicTarjeta(item)"
          >
            <!-- CABECERA DE LA TARJETA -->
            <div class="card-top-row">
              <span v-if="!item.leido" class="unread-dot" title="No leída"></span>
              <span class="card-branch-badge">{{ item.codigoSucursal || 'GLOBAL' }}</span>
              <span class="card-section-tag">
                {{ obtenerSeccionNotificacion(item.tipoNotificacion, item.tipoAlerta).label }}
              </span>
              <ConceptoBadge
                v-if="item.tipoNotificacion"
                tipo="tipo_notificacion"
                :valor="item.tipoNotificacion"
                size="sm"
              />
              <span
                v-else
                class="card-severity-tag"
                :class="`tag-${item.severidad.toLowerCase()}`"
              >
                {{ item.severidad }}
              </span>
              <span class="card-time">{{ formatearTiempoRelativo(item.fechaEvento) }}</span>
            </div>

            <!-- CONTENIDO PRINCIPAL -->
            <div class="card-content">
              <h4 class="card-title">{{ item.titulo }}</h4>
              <p class="card-msg">{{ item.mensaje }}</p>
              <div class="card-route-row">
                <span class="card-route-pill">
                  {{ normalizarDireccion(item.direccion || item.rutaAccion, item.tipoNotificacion) }}
                </span>
                <span v-if="item.leido && item.fechaLeido" class="read-receipt-hint">
                  Leída: {{ formatearTiempoRelativo(item.fechaLeido) }}
                </span>
              </div>
            </div>

            <!-- ACCIONES DIRECTAS SEGUN TIPO NOTIFICACION (GRUPO 10) -->
            <div class="card-actions">
              <!-- Boton rápido para marcar como leída sin navegar -->
              <button
                v-if="!item.leido"
                type="button"
                class="btn-quick-read"
                title="Marcar leída sin navegar"
                @click.stop="notificacionesStore.marcarLeido(item.idNotificacion)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="act-icon">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Leída</span>
              </button>

              <!-- Tipo 5: Solicitud de Acceso a Dashboard (Propietario) -->
              <template v-if="item.tipoNotificacion === 5 || item.tipoAlerta === 'ACCESO_DASHBOARD'">
                <div class="dashboard-req-actions">
                  <button
                    type="button"
                    class="btn-act btn-approve"
                    :disabled="resolviendoId === item.referenciaId"
                    @click.stop="resolverDashboard(item.referenciaId, true)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="act-icon">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Autorizar</span>
                  </button>
                  <button
                    type="button"
                    class="btn-act btn-reject"
                    :disabled="resolviendoId === item.referenciaId"
                    @click.stop="resolverDashboard(item.referenciaId, false)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="act-icon">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>Rechazar</span>
                  </button>
                </div>
              </template>

              <!-- Tipos 3 y 4: Sala de Espera -->
              <template
                v-else-if="item.tipoNotificacion === 3 || item.tipoNotificacion === 4 || item.tipoAlerta === 'SALA_ESPERA' || item.tipoAlerta === 'SALA_ESPERA_OBSERVADO'"
              >
                <button
                  type="button"
                  class="btn-act btn-action-primary"
                  @click.stop="ejecutarAccionAlerta(item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="act-icon">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span>Ir a Sala de Espera</span>
                </button>
              </template>

              <!-- Tipos 7 y 8: Recuperación de Contraseña / Usuario Bloqueado -->
              <template
                v-else-if="item.tipoNotificacion === 7 || item.tipoNotificacion === 8 || item.tipoAlerta === 'RECUPERACION_PASSWORD' || item.tipoAlerta === 'USUARIO_BLOQUEADO'"
              >
                <button
                  type="button"
                  class="btn-act btn-action-security"
                  @click.stop="ejecutarAccionAlerta(item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="act-icon">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span>Atender Usuario</span>
                </button>
              </template>

              <!-- Tipos 1 y 2: Stock Agotado / Stock Bajo -->
              <template
                v-else-if="item.tipoNotificacion === 1 || item.tipoNotificacion === 2 || item.tipoAlerta === 'STOCK_AGOTADO' || item.tipoAlerta === 'STOCK_BAJO'"
              >
                <button
                  type="button"
                  class="btn-act btn-action-stock"
                  @click.stop="ejecutarAccionAlerta(item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="act-icon">
                    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  </svg>
                  <span>Revisar Stock</span>
                </button>
              </template>

              <!-- Tipo 6: Dashboard Autorizado -->
              <template v-else-if="item.tipoNotificacion === 6 || item.tipoAlerta === 'ACCESO_DASHBOARD_APROBADO'">
                <button
                  type="button"
                  class="btn-act btn-approve"
                  @click.stop="ejecutarAccionAlerta(item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="act-icon">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Abrir Dashboard</span>
                </button>
              </template>

              <!-- Boton generico de accion -->
              <template v-else>
                <button
                  type="button"
                  class="btn-act btn-action-primary"
                  @click.stop="ejecutarAccionAlerta(item)"
                >
                  <span>Ir al Módulo</span>
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- PIE FIJO CON ACCESO AL CENTRO DE NOTIFICACIONES -->
        <div class="panel-footer">
          <button
            type="button"
            class="btn-footer-view-all"
            @click="irAlCentroNotificaciones"
          >
            <span>Ver todas en el Centro de Notificaciones</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="footer-arrow-icon">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </transition>

    <!-- BANNER TOAST EMERGENTE FLOTANTE PARA ALERTAS CRITICAS / ALTAS EN TIEMPO REAL -->
    <transition name="toast-anim">
      <div
        v-if="notificacionesStore.alertaEmergente"
        class="toast-alert-floating"
        :class="`toast-${notificacionesStore.alertaEmergente.severidad.toLowerCase()}`"
      >
        <div class="toast-indicator"></div>
        <div class="toast-content">
          <div class="toast-header-row">
            <span class="toast-badge">{{ notificacionesStore.alertaEmergente.severidad }}</span>
            <span class="toast-title">{{ notificacionesStore.alertaEmergente.titulo }}</span>
          </div>
          <p class="toast-msg">{{ notificacionesStore.alertaEmergente.mensaje }}</p>
        </div>
        <button
          type="button"
          class="btn-toast-close"
          title="Cerrar aviso"
          @click="notificacionesStore.cerrarAlertaEmergente()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="toast-close-icon">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.notif-bell-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* BOTON DE CAMPANA */
.notif-bell-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.notif-bell-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.notif-bell-btn.is-active {
  background: #2563eb;
  color: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 0 16px rgba(37, 99, 235, 0.4);
}

.bell-icon {
  width: 20px;
  height: 20px;
}

/* BADGE DINAMICO */
.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 2px solid #0f172a;
}

.badge-critical {
  background: #dc2626;
  animation: pulse-critical 1.6s infinite cubic-bezier(0.4, 0, 0.6, 1);
}

.badge-warning {
  background: #f97316;
}

.badge-info {
  background: #0284c7;
}

@keyframes pulse-critical {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 0 0 6px rgba(220, 38, 38, 0);
  }
}

/* PANEL DESPLEGABLE */
.notif-dropdown-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 480px;
  max-width: 92vw;
  max-height: 82vh;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.22), 0 0 1px rgba(15, 23, 42, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 2000;
  overflow: hidden;
  color: #1e293b;
}

/* CABECERA */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.header-title-box {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.panel-counter {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 9999px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-mark-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-mark-all:hover:not(:disabled) {
  background: #dbeafe;
  color: #1d4ed8;
}

.action-icon-xs {
  width: 12px;
  height: 12px;
}

.btn-refresh {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-refresh:hover {
  color: #0284c7;
  background: #e0f2fe;
}

.refresh-icon {
  width: 16px;
  height: 16px;
}

.is-spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

/* CHIPS DE FILTRO (ENVOLVENTE SIN SCROLLBAR HORIZONTAL) */
.panel-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0.55rem 1rem;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
}

.filter-chip {
  padding: 4px 9px;
  font-size: 0.71rem;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.filter-chip:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.filter-chip.active {
  background: #0f172a;
  color: #ffffff;
}

.filter-chip.chip-unread {
  color: #0284c7;
  background: #f0f9ff;
  border-color: #bae6fd;
}

.filter-chip.chip-unread.active {
  background: #0284c7;
  color: #ffffff;
}

/* CUERPO DEL PANEL */
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 480px;
}

.panel-body::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

/* TARJETAS DE ALERTA */
.notif-card {
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  position: relative;
}

.notif-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.08);
}

.notif-card.card-unread {
  background: #ffffff;
  border-color: #bfdbfe;
}

.notif-card.card-read {
  opacity: 0.85;
  background: #f8fafc;
}

.notif-card.severidad-critica {
  border-left: 4px solid #ef4444;
}

.notif-card.severidad-alta {
  border-left: 4px solid #f97316;
}

.notif-card.severidad-advertencia {
  border-left: 4px solid #eab308;
}

.notif-card.severidad-informativa {
  border-left: 4px solid #3b82f6;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
  flex-shrink: 0;
}

.card-top-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.72rem;
}

.card-branch-badge {
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}

.card-section-tag {
  font-size: 0.68rem;
  font-weight: 600;
  color: #4338ca;
  background: #e0e7ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.card-severity-tag {
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.68rem;
  text-transform: uppercase;
}

.tag-critica {
  color: #b91c1c;
  background: #fee2e2;
}

.tag-alta {
  color: #c2410c;
  background: #ffedd5;
}

.tag-advertencia {
  color: #a16207;
  background: #fef9c3;
}

.tag-informativa {
  color: #1d4ed8;
  background: #dbeafe;
}

.card-time {
  margin-left: auto;
  color: #94a3b8;
  font-size: 0.7rem;
}

.card-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
}

.card-msg {
  font-size: 0.8rem;
  color: #475569;
  line-height: 1.4;
}

.card-route-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.card-route-pill {
  font-family: monospace;
  font-size: 0.7rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.read-receipt-hint {
  font-size: 0.7rem;
  color: #94a3b8;
}

/* BOTONES DE ACCION */
.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.btn-quick-read {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 0.74rem;
  font-weight: 600;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-quick-read:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.btn-act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.act-icon {
  width: 14px;
  height: 14px;
}

.dashboard-req-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.btn-approve {
  background: #10b981;
  color: #ffffff;
}

.btn-approve:hover:not(:disabled) {
  background: #059669;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-reject {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}

.btn-reject:hover:not(:disabled) {
  background: #ef4444;
  color: #ffffff;
}

.btn-action-primary {
  background: #2563eb;
  color: #ffffff;
}

.btn-action-primary:hover {
  background: #1d4ed8;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.btn-action-security {
  background: #0f172a;
  color: #ffffff;
}

.btn-action-security:hover {
  background: #1e293b;
}

.btn-action-stock {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.btn-action-stock:hover {
  background: #e2e8f0;
}

/* PIE FIJO DEL PANEL */
.panel-footer {
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.btn-footer-view-all {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-footer-view-all:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.footer-arrow-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.15s ease;
}

.btn-footer-view-all:hover .footer-arrow-icon {
  transform: translateX(3px);
}

/* ESTADO VACIO */
.empty-state {
  padding: 2.5rem 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  width: 40px;
  height: 40px;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.empty-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.25rem;
}

.empty-desc {
  font-size: 0.78rem;
  color: #94a3b8;
}

/* ANIMACIONES */
.dropdown-anim-enter-active,
.dropdown-anim-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-anim-enter-from,
.dropdown-anim-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

/* TOAST FLOTANTE */
.toast-alert-floating {
  position: fixed;
  top: 24px;
  right: 24px;
  width: 400px;
  max-width: calc(100vw - 48px);
  background: #0f172a;
  color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-start;
  overflow: hidden;
  z-index: 99999;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.toast-indicator {
  width: 6px;
  align-self: stretch;
  background: #3b82f6;
  flex-shrink: 0;
}

.toast-critica .toast-indicator {
  background: #ef4444;
}

.toast-alta .toast-indicator {
  background: #f97316;
}

.toast-content {
  flex: 1;
  padding: 0.9rem 1rem;
}

.toast-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.toast-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  text-transform: uppercase;
}

.toast-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #ffffff;
}

.toast-msg {
  font-size: 0.78rem;
  color: #cbd5e1;
  line-height: 1.4;
}

.btn-toast-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.btn-toast-close:hover {
  color: #ffffff;
}

.toast-close-icon {
  width: 16px;
  height: 16px;
}

.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-anim-enter-from,
.toast-anim-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
