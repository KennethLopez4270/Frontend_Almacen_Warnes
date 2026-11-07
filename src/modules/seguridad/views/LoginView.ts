import { ref, reactive } from 'vue'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

export { router }
export const authStore = useAuthStore()

// Modos de vista: 'login' | 'recuperacion'
export const modoVista = ref<'login' | 'recuperacion'>('login')

// Formulario de Login
export const formLogin = reactive({
  usuario: '',
  password: '',
})
export const mostrarPassword = ref(false)
export const cargando = ref(false)

// Formulario de Recuperación
export const formRecuperar = reactive({
  usuario: '',
})
export const cargandoRecuperar = ref(false)
export const recuperacionExitosa = ref(false)
export const mensajeRecuperacion = ref('')

// Alertas y Notificaciones
export const mensajeError = ref('')
export const mensajeExito = ref('')

export function limpiarMensajes() {
  mensajeError.value = ''
  mensajeExito.value = ''
}

export async function handleLogin() {
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

export async function handleSolicitarRecuperacion() {
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

export function cambiarAModoRecuperar() {
  limpiarMensajes()
  recuperacionExitosa.value = false
  formRecuperar.usuario = formLogin.usuario
  modoVista.value = 'recuperacion'
}

export function volverALogin() {
  limpiarMensajes()
  recuperacionExitosa.value = false
  modoVista.value = 'login'
}

export function cerrarSesionActiva() {
  authStore.logout()
  limpiarMensajes()
}
