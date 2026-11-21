<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { sucursalService, type SucursalDTO } from '@/modules/configuracion/services/sucursalService'

const router = useRouter()
const authStore = useAuthStore()

const cargando = ref(true)
const errorMensaje = ref('')
const sucursales = ref<SucursalDTO[]>([])

onMounted(async () => {
  // Si no está autenticado, volver a login
  if (!authStore.isAuthenticated) {
    router.replace('/')
    return
  }

  // Si tiene sucursal fija asignada (Cajero o Supervisor), no necesita esta pantalla
  if (!authStore.isPropietario && !authStore.sinSucursalAsignada && authStore.sucursalId) {
    router.replace(authStore.isCajero ? '/pos' : '/dashboard')
    return
  }

  // Si no tiene sucursal asignada (NULL), se queda a ver la alerta de advertencia
  if (authStore.sinSucursalAsignada) {
    cargando.value = false
    return
  }

  // Si es propietario, cargamos las sucursales activas
  await cargarSucursales()
})

async function cargarSucursales() {
  cargando.value = true
  errorMensaje.value = ''
  try {
    const data = await sucursalService.listar(false)
    sucursales.value = data

    // Si solo hay una sucursal registrada, la auto-seleccionamos directamente
    if (data.length === 1 && data[0]) {
      const unica = data[0]
      seleccionarSucursal(unica.sucursalId, unica.ciudad)
      return
    }
  } catch (err: any) {
    errorMensaje.value = err.userMessage || 'No se pudieron cargar las sucursales registradas.'
  } finally {
    cargando.value = false
  }
}

function seleccionarSucursal(id: number, nombre?: string) {
  authStore.setSucursalActiva(id, nombre)
  router.push('/dashboard')
}

function irAAdministracion() {
  router.push('/dashboard')
}

function irAConfiguracion() {
  router.push('/admin/configuracion')
}

function handleLogout() {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="sucursal-page">
    <div class="sucursal-wrapper">
      <!-- HEADER CON MARCA -->
      <div class="brand-header">
        <div class="brand-badge">
          <svg
            class="brand-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span class="brand-title">Almacén Warnes</span>
        </div>
        <p class="brand-subtitle">Gestión Multi-Sucursal ERP</p>
      </div>

      <!-- CASO 1: USUARIO SIN SUCURSAL ASIGNADA (NULL) -->
      <div v-if="authStore.sinSucursalAsignada" class="sucursal-card text-center">
        <div class="icon-warning-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-warning">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>

        <h1 class="card-title">Sin Sucursal Asignada</h1>
        <p class="card-desc">
          Hola <strong>{{ authStore.nombreCompleto }}</strong>, tu cuenta de usuario no tiene una sucursal vinculada actualmente.
        </p>
        <div class="warning-callout">
          <p>
            Para poder operar en las terminales de venta, inventario o cajas del sistema, solicita a un administrador o propietario que te asigne a una sucursal física.
          </p>
        </div>

        <button type="button" class="btn-primary-logout" @click="handleLogout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Cerrar Sesión
        </button>
      </div>

      <!-- CASO 2: PROPIETARIO SELECCIONANDO SUCURSAL -->
      <div v-else class="sucursal-card">
        <div class="card-header text-center">
          <h1 class="card-title">Seleccionar Sucursal de Trabajo</h1>
          <p class="card-desc">
            Como <strong>Propietario</strong> tienes acceso multi-sucursal. Elige la sucursal sobre la cual deseas operar en esta sesión:
          </p>
        </div>

        <!-- Alerta de Error -->
        <div v-if="errorMensaje" class="alert alert-danger">
          <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ errorMensaje }}</span>
        </div>

        <!-- Estado de Carga -->
        <div v-if="cargando" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando sucursales disponibles...</p>
        </div>

        <!-- Lista de Sucursales Disponibles -->
        <div v-else-if="sucursales.length > 0" class="branches-grid">
          <div
            v-for="suc in sucursales"
            :key="suc.sucursalId"
            class="branch-item-card"
            :class="{ 'is-current': authStore.sucursalId === suc.sucursalId }"
            @click="seleccionarSucursal(suc.sucursalId, suc.ciudad)"
          >
            <div class="branch-top-bar">
              <span class="branch-code-badge">{{ suc.codigoInterno }}</span>
              <span class="branch-users-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tag-icon">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                {{ suc.cantidadUsuarios }} usuarios
              </span>
            </div>

            <div class="branch-main-info">
              <div class="branch-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="store-svg">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="branch-name-box">
                <h3 class="branch-city">{{ suc.ciudad }}</h3>
                <p class="branch-address">{{ suc.direccion }}</p>
                <p v-if="suc.telefono" class="branch-phone">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="phone-svg">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  {{ suc.telefono }}
                </p>
              </div>
            </div>

            <button type="button" class="btn-select-branch">
              <span>{{ authStore.sucursalId === suc.sucursalId ? 'Sucursal Activa' : 'Operar en esta Sucursal' }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="arrow-svg">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <!-- Sin Sucursales Registradas -->
        <div v-else class="empty-branches-box text-center">
          <p class="empty-title">No hay sucursales registradas en el sistema</p>
          <p class="empty-desc">Para comenzar a operar, debes dar de alta tu primera sucursal en el panel de Configuración.</p>
          <button type="button" class="btn-create-first" @click="irAConfiguracion">
            Ir a Gestión de Sucursales
          </button>
        </div>

        <!-- Barra inferior con opciones complementarias -->
        <div class="card-footer-actions">
          <button
            v-if="authStore.isPropietario"
            type="button"
            class="btn-link-action"
            @click="irAAdministracion"
          >
            Continuar solo en Administración &rarr;
          </button>

          <button type="button" class="btn-link-logout" @click="handleLogout">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./SeleccionarSucursalView.css"></style>

