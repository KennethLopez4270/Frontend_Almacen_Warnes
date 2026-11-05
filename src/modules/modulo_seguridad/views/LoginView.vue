<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ConceptoBadge from '@/components/common/ConceptoBadge.vue'

const router = useRouter()
const authStore = useAuthStore()

// Modos de vista: 'login' | 'recuperacion'
const modoVista = ref<'login' | 'recuperacion'>('login')

// Formulario de Login
const formLogin = reactive({
  usuario: '',
  password: '',
})
const mostrarPassword = ref(false)
const cargando = ref(false)

// Formulario de Recuperación
const formRecuperar = reactive({
  usuario: '',
})
const cargandoRecuperar = ref(false)
const recuperacionExitosa = ref(false)
const mensajeRecuperacion = ref('')

// Alertas y Notificaciones
const mensajeError = ref('')
const mensajeExito = ref('')

function limpiarMensajes() {
  mensajeError.value = ''
  mensajeExito.value = ''
}

async function handleLogin() {
  limpiarMensajes()

  if (!formLogin.usuario.trim() || !formLogin.password.trim()) {
    mensajeError.value = 'Por favor ingrese usuario y contraseña.'
    return
  }

  cargando.value = true
  try {
    const res = await authStore.login({
      usuario: formLogin.usuario.trim(),
      password: formLogin.password,
    })

    mensajeExito.value = res.mensaje || 'Inicio de sesión exitoso.'

    // Redirigir según rol o a dashboard después de un breve delay visual
    setTimeout(() => {
      if (authStore.isCajero) {
        router.push('/pos')
      } else {
        router.push('/dashboard')
      }
    }, 600)
  } catch (err: any) {
    mensajeError.value =
      err.userMessage || 'Credenciales inválidas o servidor inalcanzable.'
  } finally {
    cargando.value = false
  }
}

async function handleSolicitarRecuperacion() {
  limpiarMensajes()

  if (!formRecuperar.usuario.trim()) {
    mensajeError.value = 'Por favor ingrese su nombre de usuario.'
    return
  }

  cargandoRecuperar.value = true
  try {
    const res = await authStore.solicitarRecuperacion(formRecuperar.usuario.trim())
    recuperacionExitosa.value = true
    mensajeRecuperacion.value =
      res.mensaje ||
      'Solicitud enviada exitosamente. El propietario revisará su caso para asignarle una nueva contraseña.'
  } catch (err: any) {
    mensajeError.value =
      err.userMessage || 'No se pudo enviar la solicitud de recuperación.'
  } finally {
    cargandoRecuperar.value = false
  }
}

function cambiarAModoRecuperar() {
  limpiarMensajes()
  recuperacionExitosa.value = false
  formRecuperar.usuario = formLogin.usuario
  modoVista.value = 'recuperacion'
}

function volverALogin() {
  limpiarMensajes()
  recuperacionExitosa.value = false
  modoVista.value = 'login'
}

function cerrarSesionActiva() {
  authStore.logout()
  limpiarMensajes()
}
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
        <!-- 1. CASO USUARIO YA AUTENTICADO -->
        <div v-if="authStore.isAuthenticated" class="authenticated-box">
          <div class="auth-user-badge">
            <span class="status-indicator"></span>
            Sesión Activa
          </div>
          <h2 class="auth-user-name">{{ authStore.nombreCompleto }}</h2>
          <p class="auth-username">@{{ authStore.usuario }}</p>

          <div class="auth-role-tag">
            <ConceptoBadge tipo="rol" :valor="authStore.rolId" size="md" />
          </div>

          <div class="auth-actions">
            <button
              type="button"
              class="btn-primary"
              @click="router.push(authStore.isCajero ? '/pos' : '/dashboard')"
            >
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Ir al Sistema
            </button>
            <button
              type="button"
              class="btn-secondary"
              @click="cerrarSesionActiva"
            >
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Cerrar Sesión
            </button>
          </div>
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
        <span>PostgreSQL + Spring Boot + Vue 3</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ====================================================================
   ESTILOS MINIMALISTAS Y SOBRIOS - ERP EMPRESARIAL
   Paleta: #0F172A, #1E293B, #F8FAFC, #FFFFFF, #E2E8F0, #CBD5E1
   ==================================================================== */

.login-page {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background-color: #f8fafc;
}

.login-wrapper {
  max-width: 440px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* BRAND HEADER */
.brand-header {
  text-align: center;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
}

.brand-icon {
  width: 16px;
  height: 16px;
  color: #0f172a;
}

.brand-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.brand-subtitle {
  font-size: 0.825rem;
  color: #64748b;
  margin-top: 0.5rem;
}

/* CARD PRINCIPAL */
.login-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 2.25rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03);
}

.card-header {
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.015em;
}

.card-desc {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.25rem;
  line-height: 1.4;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.w-full {
  width: 100%;
}

/* ALERTAS */
.alert {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.825rem;
  margin-bottom: 1.25rem;
  line-height: 1.35;
}

.alert-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.alert-danger {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.alert-success {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

/* FORMULARIO */
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #334155;
}

.form-hint {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.3;
}

.link-muted {
  background: none;
  border: none;
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease;
}

.link-muted:hover {
  color: #0f172a;
  text-decoration: underline;
}

.input-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.85rem;
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem 0.65rem 2.5rem;
  font-size: 0.875rem;
  color: #0f172a;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  transition: all 0.15s ease;
}

.form-input:focus {
  border-color: #0f172a;
  box-shadow: 0 0 0 1px #0f172a;
}

.form-input:disabled {
  background-color: #f1f5f9;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-toggle-password {
  position: absolute;
  right: 0.85rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn-toggle-password svg {
  width: 18px;
  height: 18px;
}

.btn-toggle-password:hover {
  color: #475569;
}

/* BOTONES */
.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  background-color: #0f172a;
  border: 1px solid #0f172a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn-submit:hover:not(:disabled) {
  background-color: #1e293b;
  border-color: #1e293b;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
  background-color: #0f172a;
  border: 1px solid #0f172a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background-color: #1e293b;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background-color: #f8fafc;
  border-color: #94a3b8;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  margin-bottom: 0.5rem;
}

.btn-back svg {
  width: 14px;
  height: 14px;
}

.btn-back:hover {
  color: #0f172a;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* CAJA DE ÉXITO DE SOLICITUD */
.success-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.success-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.success-icon-badge svg {
  width: 22px;
  height: 22px;
}

.success-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.success-text {
  font-size: 0.825rem;
  color: #475569;
  line-height: 1.45;
  margin-top: 0.35rem;
}

.success-badge-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.75rem;
  color: #64748b;
}

/* SESION ACTIVA */
.authenticated-box {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.auth-user-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #16a34a;
}

.auth-user-name {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.auth-username {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.15rem;
}

.auth-role-tag {
  margin-top: 0.75rem;
  margin-bottom: 1.5rem;
}

.auth-actions {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
}

/* SPINNER */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* FOOTER */
.login-footer {
  text-align: center;
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.dot-separator {
  color: #cbd5e1;
}
</style>

