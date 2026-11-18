<script setup lang="ts">
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import { useNotificacionesView } from './NotificacionesView'

const {
  authStore,
  notificacionesStore,
  listaSucursales,
  searchQuery,
  filtroSeccion,
  filtroTipoNotificacion,
  filtroEstadoLectura,
  filtroSeveridad,
  filtroSucursal,
  resolviendoId,
  marcandoTodas,
  idProcesandoLectura,
  kpiTotal,
  kpiNoLeidas,
  kpiCriticasAltas,
  kpiLeidas,
  notificacionesFiltradas,
  recargar,
  marcarLeida,
  marcarTodasLeidas,
  navegarAlerta,
  resolverDashboard,
  formatearFecha,
  formatearTiempoRelativo,
  limpiarFiltros,
  normalizarDireccion,
  obtenerSeccionNotificacion,
} = useNotificacionesView()
</script>

<template>
  <div class="notificaciones-view-container">
    <!-- 1. CABECERA -->
    <header class="view-header">
      <div class="view-title-group">
        <h1>Centro de Notificaciones y Alertas</h1>
        <p class="view-subtitle">
          Supervisión operativa, control de inventario, auditoría de sala de espera y seguridad en tiempo real.
        </p>
      </div>
      <div class="view-header-actions">
        <button
          type="button"
          class="btn-secondary"
          :disabled="notificacionesStore.cargando"
          @click="recargar"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="btn-icon-sm"
            :class="{ 'is-spinning': notificacionesStore.cargando }"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Actualizar</span>
        </button>

        <button
          v-if="kpiNoLeidas > 0"
          type="button"
          class="btn-primary-action"
          :disabled="marcandoTodas"
          @click="marcarTodasLeidas"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-sm">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{{ marcandoTodas ? 'Procesando...' : 'Marcar todas como leídas' }}</span>
        </button>
      </div>
    </header>

    <!-- 2. RESUMEN KPI -->
    <section class="kpi-grid">
      <!-- Total Alertas -->
      <div class="kpi-card kpi-total">
        <div class="kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-icon">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Total Alertas</span>
          <span class="kpi-value">{{ kpiTotal }}</span>
        </div>
      </div>

      <!-- Alertas Sin Leer -->
      <div class="kpi-card kpi-unread" :class="{ 'has-unread': kpiNoLeidas > 0 }">
        <div class="kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Sin Leer</span>
          <span class="kpi-value">{{ kpiNoLeidas }}</span>
        </div>
      </div>

      <!-- Criticas y Altas -->
      <div class="kpi-card kpi-critical">
        <div class="kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-icon">
            <polygon points="12 2 2 22 22 22"></polygon>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Críticas y Altas</span>
          <span class="kpi-value">{{ kpiCriticasAltas }}</span>
        </div>
      </div>

      <!-- Atendidas / Leidas -->
      <div class="kpi-card kpi-resolved">
        <div class="kpi-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="kpi-icon">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Atendidas / Leídas</span>
          <span class="kpi-value">{{ kpiLeidas }}</span>
        </div>
      </div>
    </section>

    <!-- 3. BARRA DE FILTROS AVANZADA -->
    <section class="filters-card">
      <div class="filters-primary-row">
        <!-- Buscador de texto -->
        <div class="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Buscar por título, contenido, sucursal o destino..."
          />
        </div>
      </div>

      <div class="filters-secondary-row">
        <!-- Filtro Seccion Funcional -->
        <div class="filter-group">
          <label class="filter-label">Sección</label>
          <select v-model="filtroSeccion" class="filter-select">
            <option value="TODAS">Todas las secciones</option>
            <option value="stock">Inventario (Stock)</option>
            <option value="espera">Sala de Espera</option>
            <option value="dashboard">Dashboard</option>
            <option value="seguridad">Seguridad / Usuarios</option>
          </select>
        </div>

        <!-- Filtro Tipo de Notificacion (Grupo 10) -->
        <div class="filter-group">
          <label class="filter-label">Tipo Específico</label>
          <select v-model="filtroTipoNotificacion" class="filter-select">
            <option value="">Todos los tipos</option>
            <option :value="1">1 - Stock Agotado</option>
            <option :value="2">2 - Stock Bajo</option>
            <option :value="3">3 - Ingreso Pendiente (Sala Espera)</option>
            <option :value="4">4 - Mercadería Observada (Sala Espera)</option>
            <option :value="5">5 - Solicitud Acceso Dashboard</option>
            <option :value="6">6 - Dashboard Autorizado</option>
            <option :value="7">7 - Recuperación Contraseña</option>
            <option :value="8">8 - Usuario Bloqueado</option>
          </select>
        </div>

        <!-- Filtro Estado Lectura -->
        <div class="filter-group">
          <label class="filter-label">Estado</label>
          <select v-model="filtroEstadoLectura" class="filter-select">
            <option value="TODAS">Todas (Leídas y No Leídas)</option>
            <option value="NO_LEIDAS">Solo No Leídas</option>
            <option value="LEIDAS">Solo Leídas</option>
          </select>
        </div>

        <!-- Filtro Severidad -->
        <div class="filter-group">
          <label class="filter-label">Severidad</label>
          <select v-model="filtroSeveridad" class="filter-select">
            <option value="TODAS">Todas las severidades</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="ADVERTENCIA">Advertencia</option>
            <option value="INFORMATIVA">Informativa</option>
          </select>
        </div>

        <!-- Filtro Sucursal (Para Propietario) -->
        <div v-if="authStore.isPropietario && listaSucursales.length > 0" class="filter-group">
          <label class="filter-label">Sucursal</label>
          <select v-model="filtroSucursal" class="filter-select">
            <option value="TODAS">Todas las sucursales</option>
            <option value="GLOBAL">Alertas Globales</option>
            <option
              v-for="suc in listaSucursales"
              :key="suc.sucursalId"
              :value="suc.codigoInterno"
            >
              {{ suc.codigoInterno }} - {{ suc.ciudad }}
            </option>
          </select>
        </div>

        <button type="button" class="btn-clean-filters" @click="limpiarFiltros">
          Limpiar Filtros
        </button>
      </div>
    </section>

    <!-- 4. LISTADO DETALLADO DE ALERTAS -->
    <section class="alerts-list-card">
      <div class="list-header-bar">
        <span>Historial de Alertas Registradas</span>
        <span class="list-count-badge">
          Mostrando {{ notificacionesFiltradas.length }} de {{ kpiTotal }}
        </span>
      </div>

      <!-- Estado vacío -->
      <div v-if="notificacionesFiltradas.length === 0" class="empty-alerts-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="empty-svg">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 14 14"></polyline>
        </svg>
        <h3 class="empty-headline">No se encontraron notificaciones</h3>
        <p class="empty-subtext">
          No hay alertas que coincidan con los criterios de búsqueda y filtros seleccionados.
        </p>
      </div>

      <!-- Contenedor de Alertas -->
      <div v-else class="alerts-container">
        <article
          v-for="item in notificacionesFiltradas"
          :key="item.idNotificacion"
          class="alert-item-card"
          :class="[
            `border-${item.severidad.toLowerCase()}`,
            { 'is-unread': !item.leido, 'is-read': item.leido },
          ]"
        >
          <!-- Fila Superior: Badges y Tiempo -->
          <div class="alert-top-row">
            <span v-if="!item.leido" class="unread-pill">Sin Leer</span>
            <span class="branch-badge">{{ item.codigoSucursal || 'GLOBAL' }}</span>
            <span class="section-pill">
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
              class="severity-pill"
              :class="`pill-${item.severidad.toLowerCase()}`"
            >
              {{ item.severidad }}
            </span>

            <div class="alert-time">
              <span class="time-relative">{{ formatearTiempoRelativo(item.fechaEvento) }}</span>
              <span class="time-absolute">({{ formatearFecha(item.fechaEvento) }})</span>
            </div>
          </div>

          <!-- Cuerpo: Título, Mensaje y Metadatos -->
          <div class="alert-body">
            <h4 class="alert-title">{{ item.titulo }}</h4>
            <p class="alert-message">{{ item.mensaje }}</p>

            <div class="alert-meta-row">
              <span class="destination-route-badge" title="Ruta interna de atención">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="route-icon">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span>{{ normalizarDireccion(item.direccion || item.rutaAccion, item.tipoNotificacion) }}</span>
              </span>

              <span v-if="item.leido && item.fechaLeido" class="read-timestamp">
                Leída el {{ formatearFecha(item.fechaLeido) }}
              </span>
            </div>
          </div>

          <!-- Acciones de la Tarjeta -->
          <div class="alert-actions-row">
            <!-- Marcar como leída sin navegar -->
            <button
              v-if="!item.leido"
              type="button"
              class="btn-card-read"
              :disabled="idProcesandoLectura === item.idNotificacion"
              @click="marcarLeida(item.idNotificacion)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon-sm">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{{ idProcesandoLectura === item.idNotificacion ? 'Marcando...' : 'Marcar Leída' }}</span>
            </button>

            <!-- Acciones in-situ para Tipo 5: Solicitud de Dashboard (Propietario) -->
            <div
              v-if="(item.tipoNotificacion === 5 || item.tipoAlerta === 'ACCESO_DASHBOARD') && authStore.isPropietario"
              class="dashboard-inline-actions"
            >
              <button
                type="button"
                class="btn-dash-approve"
                :disabled="resolviendoId === item.referenciaId"
                @click="resolverDashboard(item.referenciaId, true)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon-sm">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Autorizar Acceso</span>
              </button>
              <button
                type="button"
                class="btn-dash-reject"
                :disabled="resolviendoId === item.referenciaId"
                @click="resolverDashboard(item.referenciaId, false)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon-sm">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Rechazar</span>
              </button>
            </div>

            <!-- Botón principal de navegación directa -->
            <button
              type="button"
              class="btn-card-action"
              @click="navegarAlerta(item)"
            >
              <span>Ir al Módulo</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-arrow">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped src="./NotificacionesView.css"></style>
