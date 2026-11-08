<script setup lang="ts">
import { onMounted } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  router,
  authStore,
  modoVista,
  formLogin,
  mostrarPassword,
  cargando,
  formRecuperar,
  cargandoRecuperar,
  recuperacionExitosa,
  mensajeRecuperacion,
  mensajeError,
  mensajeExito,
  handleLogin,
  handleSolicitarRecuperacion,
  cambiarAModoRecuperar,
  volverALogin,
  cerrarSesionActiva,
} from './LoginView'

onMounted(() => {
  if (authStore.isAuthenticated) {
    if (authStore.sinSucursalAsignada || authStore.necesitaElegirSucursal) {
      router.replace('/seleccionar-sucursal')
    } else {
      router.replace(authStore.isCajero ? '/pos' : '/dashboard')
    }
  }
})
</script>

<template>
  <div class="login-page">
    <div class="login-wrapper">
      <!-- HEADER CON LOGO DE MARCA -->
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
        <p class="brand-subtitle">Módulo de Seguridad y Autenticación ERP</p>
      </div>

      <!-- CARD PRINCIPAL -->
      <div class="login-card">
        <!-- 1. CASO USUARIO YA AUTENTICADO: Redirigiendo automáticamente -->
        <div v-if="authStore.isAuthenticated" class="authenticated-box" style="padding: 2.5rem 1.5rem; text-align: center;">
          <div class="spinner-small" style="margin: 0 auto 1rem; border: 3px solid #e2e8f0; border-top-color: #2563eb; width: 28px; height: 28px; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Sesión activa detectada. Ingresando al sistema...</p>
        </div>

        <!-- 2. MODO LOGIN -->
        <div v-else-if="modoVista === 'login'">
          <div class="card-header">
            <h1 class="card-title">Iniciar Sesión</h1>
            <p class="card-desc">Ingrese sus credenciales corporativas para acceder.</p>
          </div>

          <!-- Alert de Error -->
          <div v-if="mensajeError" class="alert alert-danger">
            <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ mensajeError }}</span>
          </div>

          <!-- Alert de Éxito -->
          <div v-if="mensajeExito" class="alert alert-success">
            <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{{ mensajeExito }}</span>
          </div>

          <form @submit.prevent="handleLogin" class="form-layout">
            <div class="form-group">
              <label for="username" class="form-label">Nombre de Usuario</label>
              <div class="input-icon-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  id="username"
                  v-model="formLogin.usuario"
                  type="text"
                  class="form-input"
                  placeholder="Ej: admin, cajero1"
                  autocomplete="username"
                  :disabled="cargando"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <div class="label-row">
                <label for="password" class="form-label">Contraseña</label>
                <button
                  type="button"
                  class="link-muted"
                  @click="cambiarAModoRecuperar"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div class="input-icon-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  id="password"
                  v-model="formLogin.password"
                  :type="mostrarPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  :disabled="cargando"
                  required
                />
                <button
                  type="button"
                  class="btn-toggle-password"
                  @click="mostrarPassword = !mostrarPassword"
                  tabindex="-1"
                >
                  <svg v-if="!mostrarPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" class="btn-submit" :disabled="cargando">
              <span v-if="cargando" class="spinner"></span>
              <span v-else>Acceder al Sistema</span>
            </button>
          </form>
        </div>

        <!-- 3. MODO SOLICITAR RECUPERACION -->
        <div v-else>
          <div class="card-header">
            <button type="button" class="btn-back" @click="volverALogin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Volver al Login
            </button>
            <h1 class="card-title mt-2">Recuperar Contraseña</h1>
            <p class="card-desc">
              Por políticas de seguridad del ERP, los empleados solicitan al
              <strong>Propietario</strong> el restablecimiento de su acceso.
            </p>
          </div>

          <!-- Alert de Error -->
          <div v-if="mensajeError" class="alert alert-danger">
            <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ mensajeError }}</span>
          </div>

          <!-- Alert de Éxito de Solicitud -->
          <div v-if="recuperacionExitosa" class="success-box">
            <div class="success-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 class="success-title">Solicitud Registrada</h3>
            <p class="success-text">{{ mensajeRecuperacion }}</p>
            <div class="success-badge-note">
              <span>Estado en BD:</span>
              <ConceptoBadge tipo="estado_usuario" :valor="2" size="sm" />
            </div>
            <button type="button" class="btn-secondary w-full mt-4" @click="volverALogin">
              Entendido, volver al inicio
            </button>
          </div>

          <form v-else @submit.prevent="handleSolicitarRecuperacion" class="form-layout">
            <div class="form-group">
              <label for="recovery-username" class="form-label">Su Nombre de Usuario</label>
              <div class="input-icon-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  id="recovery-username"
                  v-model="formRecuperar.usuario"
                  type="text"
                  class="form-input"
                  placeholder="Ej: cajero1, supervisor"
                  :disabled="cargandoRecuperar"
                  required
                />
              </div>
              <span class="form-hint">
                Se enviará una solicitud al panel del propietario para que pueda asignarle una nueva clave.
              </span>
            </div>

            <button type="submit" class="btn-submit" :disabled="cargandoRecuperar">
              <span v-if="cargandoRecuperar" class="spinner"></span>
              <span v-else>Enviar Solicitud al Propietario</span>
            </button>
          </form>
        </div>
      </div>

      <!-- FOOTER DISCRETO -->
      <div class="login-footer">
        <span>Tienda Warnes &copy; 2026</span>
        <span class="dot-separator">•</span>
        <span>Sistema de Gestión Integral ERP</span>
      </div>
    </div>
  </div>
</template>

<style scoped src="./LoginView.css"></style>
