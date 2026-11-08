<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Estado de expansión del Sidebar (hover o toggle)
const isHovered = ref(false)
const isPinned = ref(false)
const isExpanded = computed(() => isHovered.value || isPinned.value)

// Módulos abiertos en el acordeón
const openModules = ref<Record<string, boolean>>({
  ventas: false,
  inventario: true,
  caja: false,
  administracion: false,
})

interface SubItem {
  name: string
  to: string
  icon?: string
}

interface NavModule {
  id: string
  title: string
  icon: string
  roles: number[]
  items: SubItem[]
}

const navModules: NavModule[] = [
  {
    id: 'ventas',
    title: 'Ventas',
    icon: 'ventas',
    roles: [1, 2, 3], // Cajero, Supervisor, Propietario
    items: [
      { name: 'Terminal POS', to: '/pos' },
      { name: 'Historial de Ventas', to: '/caja/historial-ventas' },
    ],
  },
  {
    id: 'inventario',
    title: 'Inventario',
    icon: 'inventario',
    roles: [1, 2, 3], // Cajero, Supervisor, Propietario
    items: [
      { name: 'Lotes y Stock Físico', to: '/inventario' },
      { name: 'Distribuidores y Acuerdos', to: '/inventario/proveedores' },
      { name: 'Kardex de Movimientos', to: '/inventario/kardex' },
      { name: 'Sala de Espera (Auditoría)', to: '/auditoria/sala-espera' },
    ],
  },
  {
    id: 'caja',
    title: 'Caja',
    icon: 'caja',
    roles: [1, 2, 3], // Cajero, Supervisor, Propietario
    items: [
      { name: 'Arqueo y Cierre', to: '/caja/arqueo' },
      { name: 'Historial de Caja', to: '/caja/historial-ventas' },
    ],
  },
  {
    id: 'administracion',
    title: 'Administración',
    icon: 'admin',
    roles: [3], // Solo Propietario / Administrador
    items: [
      { name: 'Dashboard Ejecutivo', to: '/dashboard' },
      { name: 'Gestión de Usuarios', to: '/admin/usuarios' },
      { name: 'Configuración del ERP', to: '/admin/configuracion' },
    ],
  },
]

// Filtrado de módulos según el rol del usuario autenticado
const visibleModules = computed(() => {
  const userRol = authStore.rolId || 1
  return navModules.filter((m) => m.roles.includes(userRol))
})

// Abre automáticamente el módulo correspondiente a la ruta actual
watch(
  () => route.path,
  (newPath) => {
    for (const mod of navModules) {
      if (mod.items.some((item) => item.to === newPath || (item.to !== '/' && newPath.startsWith(item.to)))) {
        openModules.value[mod.id] = true
        break
      }
    }
  },
  { immediate: true }
)

function toggleModule(moduleId: string) {
  if (!isExpanded.value) {
    isHovered.value = true
    openModules.value[moduleId] = true
    return
  }
  openModules.value[moduleId] = !openModules.value[moduleId]
}

function handleLogout() {
  authStore.logout()
  router.push('/')
}

function irASeleccionarSucursal() {
  router.push('/seleccionar-sucursal')
}
</script>

<template>
  <aside
    class="sidebar-container"
    :class="{ 'is-expanded': isExpanded }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 1. HEADER / LOGO DE MARCA -->
    <div class="sidebar-header">
      <div class="brand-monogram" title="Almacén Warnes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="monogram-icon">
          <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
        </svg>
      </div>

      <transition name="fade">
        <div v-if="isExpanded" class="brand-text-block">
          <span class="brand-title">Almacén Warnes</span>
          <span class="brand-subtitle">Gestión Empresarial</span>
        </div>
      </transition>
    </div>

    <!-- 2. NAVEGACIÓN PRINCIPAL (LISTA DE MÓDULOS) -->
    <nav class="sidebar-nav">
      <div v-for="mod in visibleModules" :key="mod.id" class="nav-module-group">
        <!-- BOTÓN MÓDULO (CABECERA) -->
        <button
          type="button"
          class="module-btn"
          :class="{
            'is-active': mod.items.some((it) => it.to === route.path),
            'is-open': openModules[mod.id],
          }"
          :title="!isExpanded ? mod.title : undefined"
          @click="toggleModule(mod.id)"
        >
          <!-- ÍCONO SVG SEGÚN MÓDULO -->
          <div class="module-icon-box">
            <!-- Ventas -->
            <svg
              v-if="mod.icon === 'ventas'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="module-svg"
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>

            <!-- Inventario -->
            <svg
              v-else-if="mod.icon === 'inventario'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="module-svg"
            >
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
              <path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
              ></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>

            <!-- Caja -->
            <svg
              v-else-if="mod.icon === 'caja'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="module-svg"
            >
              <rect x="2" y="6" width="20" height="12" rx="2"></rect>
              <circle cx="12" cy="12" r="2"></circle>
              <path d="M6 12h.01M18 12h.01"></path>
            </svg>

            <!-- Administración -->
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="module-svg"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="M9 12l2 2 4-4"></path>
            </svg>
          </div>

          <!-- TÍTULO Y CHEVRON (SOLO EN EXPANDIDO) -->
          <div v-if="isExpanded" class="module-title-wrapper">
            <span class="module-title">{{ mod.title }}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              class="module-chevron"
              :class="{ 'is-rotated': openModules[mod.id] }"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </button>

        <!-- SUBLISTA DE PÁGINAS (ACORDEÓN ANIMADO) -->
        <transition name="submenu">
          <ul v-if="isExpanded && openModules[mod.id]" class="sub-menu-list">
            <li v-for="sub in mod.items" :key="sub.to">
              <RouterLink :to="sub.to" class="sub-menu-link" active-class="is-link-active">
                <span class="sub-bullet"></span>
                <span class="sub-link-text">{{ sub.name }}</span>
              </RouterLink>
            </li>
          </ul>
        </transition>
      </div>
    </nav>

    <!-- 3. FOOTER: PERFIL DEL USUARIO Y LOGOUT -->
    <div class="sidebar-footer">
      <!-- MODO COLAPSADO: AVATAR Y BOTÓN DE LOGOUT CENTRADOS -->
      <div v-if="!isExpanded" class="user-collapsed-layout">
        <div class="user-avatar" :title="authStore.nombreCompleto + ' (' + authStore.usuario + ')'">
          {{ (authStore.usuario || 'U').charAt(0).toUpperCase() }}
        </div>
        <button
          type="button"
          class="btn-collapsed-logout"
          :title="'Cerrar Sesión (' + authStore.usuario + ')'"
          @click="handleLogout"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="logout-svg">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>

      <!-- MODO EXPANDIDO: TARJETA COMPLETA CON CABECERA Y BADGES MULTILÍNEA -->
      <div v-else class="user-expanded-card">
        <!-- Fila Superior: Avatar + Nombre/Usuario + Botón Logout -->
        <div class="user-card-top">
          <div class="user-avatar" :title="authStore.nombreCompleto">
            {{ (authStore.usuario || 'U').charAt(0).toUpperCase() }}
          </div>

          <div class="user-identity">
            <span class="user-fullname" :title="authStore.nombreCompleto">
              {{ authStore.nombreCompleto }}
            </span>
            <span class="user-handle">@{{ authStore.usuario }}</span>
          </div>

          <button
            type="button"
            class="btn-sidebar-logout"
            title="Cerrar Sesión"
            @click="handleLogout"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="logout-svg">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>

        <!-- Fila Inferior: Badges (Rol + Sucursal) con envoltura flexible -->
        <div class="user-card-badges">
          <ConceptoBadge tipo="rol" :valor="authStore.rolId" size="sm" />
          <span v-if="authStore.sucursalId" class="sucursal-pill">
            Suc. #{{ authStore.sucursalId }}
          </span>

          <!-- BOTÓN CAMBIAR SUCURSAL PARA PROPIETARIO -->
          <button
            v-if="authStore.puedeCambiarSucursal"
            type="button"
            class="btn-cambiar-sucursal"
            title="Cambiar de sucursal de trabajo"
            @click="irASeleccionarSucursal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="swap-icon">
              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"></path>
            </svg>
            <span>Cambiar</span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* ====================================================================
   ESTILOS DEL SIDEBAR MODERNO (OBSIDIAN & SLATE ENTERPRISE)
   ==================================================================== */

.sidebar-container {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 72px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s ease;
  overflow: hidden;
  user-select: none;
}

.sidebar-container.is-expanded {
  width: 280px;
  box-shadow: 12px 0 36px rgba(0, 0, 0, 0.4);
}

/* --- HEADER / BRAND --- */
.sidebar-header {
  height: 68px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.brand-monogram {
  width: 44px;
  height: 44px;
  min-width: 44px;
  background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
  transition: transform 0.2s ease;
}

.brand-monogram:hover {
  transform: scale(1.05);
}

.monogram-icon {
  width: 22px;
  height: 22px;
}

.brand-text-block {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  white-space: nowrap;
}

.brand-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 0.68rem;
  font-weight: 500;
  color: #38bdf8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* --- NAVEGACIÓN PRINCIPAL --- */
.sidebar-nav {
  flex: 1 1 0%;
  min-height: 0; /* Evita que el contenedor desborde y empuje el footer fuera de pantalla */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.nav-module-group {
  display: flex;
  flex-direction: column;
}

/* BOTÓN DE MÓDULO */
.module-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 46px;
  padding: 0 12px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.18s ease;
  position: relative;
  text-align: left;
}

.module-btn:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: #f1f5f9;
}

.module-btn.is-active {
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.1);
}

.module-btn.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3.5px;
  border-radius: 0 4px 4px 0;
  background-color: #38bdf8;
}

.module-icon-box {
  width: 26px;
  height: 26px;
  min-width: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-svg {
  width: 21px;
  height: 21px;
  transition: transform 0.2s ease;
}

.module-btn:hover .module-svg {
  transform: scale(1.1);
}

.module-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.module-title {
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.module-chevron {
  width: 16px;
  height: 16px;
  color: #64748b;
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.module-chevron.is-rotated {
  transform: rotate(180deg);
  color: #38bdf8;
}

/* SUBLISTA DE ENLACES */
.sub-menu-list {
  list-style: none;
  margin: 4px 0 8px 18px;
  padding: 4px 0 4px 14px;
  border-left: 1.5px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sub-menu-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 7px;
  text-decoration: none;
  color: #94a3b8;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-bullet {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #475569;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.sub-menu-link:hover {
  color: #f8fafc;
  background-color: rgba(255, 255, 255, 0.05);
}

.sub-menu-link:hover .sub-bullet {
  background-color: #38bdf8;
  transform: scale(1.3);
}

.sub-menu-link.is-link-active {
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.12);
  font-weight: 600;
}

.sub-menu-link.is-link-active .sub-bullet {
  background-color: #38bdf8;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.8);
}

/* --- FOOTER: PERFIL Y LOGOUT --- */
.sidebar-footer {
  padding: 12px 10px 14px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* Colapsado */
.user-collapsed-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.btn-collapsed-logout {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}

.btn-collapsed-logout:hover {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

/* Expandido */
.user-expanded-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.user-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.user-avatar {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.user-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.user-fullname {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #f1f5f9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.25;
}

.user-handle {
  font-size: 0.7rem;
  color: #64748b;
  line-height: 1.1;
  font-weight: 500;
}

.user-card-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 2px;
}

.sucursal-pill {
  font-size: 0.65rem;
  font-weight: 700;
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 2px 7px;
  border-radius: 9999px;
  line-height: 1.2;
  white-space: nowrap;
}

.btn-cambiar-sucursal {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background-color: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.2;
}

.btn-cambiar-sucursal:hover {
  background-color: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  color: #ffffff;
  transform: scale(1.04);
}

.swap-icon {
  width: 11px;
  height: 11px;
}

.btn-sidebar-logout {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
  margin-left: auto;
}

.logout-svg {
  width: 16px;
  height: 16px;
}

.btn-sidebar-logout:hover {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
  transform: scale(1.05);
}

/* --- ANIMACIONES DE TRANSICIÓN --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.submenu-enter-active,
.submenu-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}
.submenu-enter-to,
.submenu-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 200px;
}
</style>

