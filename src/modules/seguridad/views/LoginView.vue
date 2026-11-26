<script setup lang="ts">
import { onMounted } from 'vue'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'
import {
  router,
  authStore,
  modoVista,
  cargandoEstadoInicial,
  cuentaBloqueada,
  formLogin,
  mostrarPassword,
  cargando,
  formRecuperar,
  cargandoRecuperar,
  recuperacionExitosa,
  mensajeRecuperacion,
  formSetup,
  cargandoSetup,
  mostrarPasswordSetup,
  mensajeError,
  mensajeExito,
  verificarEstadoInicial,
  verificarMensajeBloqueoEnUrl,
  redirigirSegunRol,
  handleLogin,
  handleSolicitarRecuperacion,
  handleRegistrarPrimerAdmin,
  cambiarAModoRecuperar,
  volverALogin,
  cerrarSesionActiva,
} from './LoginView'

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await redirigirSegunRol()
    return
  }
  verificarMensajeBloqueoEnUrl()
  await verificarEstadoInicial()
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
          <div class="spinner-small" style="margin: 0 auto 1rem; border: 3px solid #e2e8f0; border-top-color: var(--erp-primary); width: 28px; height: 28px; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Sesión activa detectada. Ingresando al sistema...</p>
          <button type="button" class="btn-secondary mt-4" @click="redirigirSegunRol">
            Continuar al sistema
          </button>
        </div>

        <!-- 1.5 VERIFICANDO CONFIGURACION INICIAL -->
        <div v-else-if="cargandoEstadoInicial" class="authenticated-box" style="padding: 2.5rem 1.5rem; text-align: center;">
          <div class="spinner-small" style="margin: 0 auto 1rem; border: 3px solid #e2e8f0; border-top-color: var(--erp-primary); width: 28px; height: 28px; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Verificando configuración del sistema...</p>
        </div>

        <!-- 2. MODO SETUP INICIAL: PRIMER PROPIETARIO -->
        <div v-else-if="modoVista === 'setup'">
          <div class="card-header">
            <h1 class="card-title">Configuración Inicial</h1>
            <p class="card-desc">
              No existe ningún propietario registrado. Cree la cuenta principal del sistema ingresando la clave secreta de instalación.
            </p>
          </div>

          <div v-if="mensajeError" class="alert alert-danger">
            <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ mensajeError }}</span>
          </div>

          <form @submit.prevent="handleRegistrarPrimerAdmin" class="form-layout">
            <div class="form-group">
              <label for="setup-secret" class="form-label">Clave Secreta de Instalación *</label>
              <div class="input-icon-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                </svg>
                <input
                  id="setup-secret"
                  v-model="formSetup.claveSecreta"
                  type="password"
                  class="form-input"
                  placeholder="Ingrese la clave de instalación"
                  :disabled="cargandoSetup"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="setup-username" class="form-label">Usuario Propietario *</label>
              <div class="input-icon-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  id="setup-username"
                  v-model="formSetup.usuario"
                  type="text"
                  class="form-input"
                  placeholder="Ej: admin, propietario"
                  :disabled="cargandoSetup"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="setup-nombres" class="form-label">Nombres *</label>
              <input
                id="setup-nombres"
                v-model="formSetup.nombres"
                type="text"
                class="form-input"
                placeholder="Nombres del propietario"
                :disabled="cargandoSetup"
                required
              />
            </div>

            <div class="form-group">
              <label for="setup-apellidos" class="form-label">Apellidos *</label>
              <input
                id="setup-apellidos"
                v-model="formSetup.apellidos"
                type="text"
                class="form-input"
                placeholder="Apellidos del propietario"
                :disabled="cargandoSetup"
                required
              />
            </div>

            <div class="form-group">
              <label for="setup-password" class="form-label">Contraseña *</label>
              <div class="input-icon-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  id="setup-password"
                  v-model="formSetup.password"
                  :type="mostrarPasswordSetup ? 'text' : 'password'"
                  class="form-input"
                  placeholder="Mínimo 6 caracteres"
                  :disabled="cargandoSetup"
                  required
                />
                <button
                  type="button"
                  class="btn-toggle-password"
                  @click="mostrarPasswordSetup = !mostrarPasswordSetup"
                  tabindex="-1"
                >
                  <svg v-if="!mostrarPasswordSetup" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

            <div class="form-group">
              <label for="setup-password-confirm" class="form-label">Confirmar Contraseña *</label>
              <input
                id="setup-password-confirm"
                v-model="formSetup.confirmarPassword"
                :type="mostrarPasswordSetup ? 'text' : 'password'"
                class="form-input"
                placeholder="Repita la contraseña"
                :disabled="cargandoSetup"
                required
              />
            </div>

            <button type="submit" class="btn-submit" :disabled="cargandoSetup">
              <span v-if="cargandoSetup" class="spinner"></span>
              <span v-else>Crear Cuenta de Propietario</span>
            </button>
          </form>
        </div>

        <!-- 3. MODO LOGIN -->
        <div v-else-if="modoVista === 'login'">
          <div class="card-header">
            <h1 class="card-title">Iniciar Sesión</h1>
            <p class="card-desc">Ingrese sus credenciales corporativas para acceder.</p>
          </div>

          <!-- Alert específico: Cuenta Bloqueada -->
          <div v-if="mensajeError && cuentaBloqueada" class="alert alert-danger" style="align-items: flex-start;">
            <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 0.1rem;">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <div>
              <strong style="display: block; margin-bottom: 0.15rem;">Acceso Bloqueado</strong>
              <span>{{ mensajeError }}</span>
            </div>
          </div>

          <!-- Alert de Error General -->
          <div v-else-if="mensajeError" class="alert alert-danger">
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
