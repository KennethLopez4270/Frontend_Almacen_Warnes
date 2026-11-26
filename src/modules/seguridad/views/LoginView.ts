import { ref, reactive } from 'vue'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { seguridadService } from '@/modules/seguridad/services/seguridadService'
import { notificacionesService } from '@/services/notificacionesService'

export { router }
export const authStore = useAuthStore()

// Modos de vista: 'login' | 'recuperacion' | 'setup'
export const modoVista = ref<'login' | 'recuperacion' | 'setup'>('login')
export const cargandoEstadoInicial = ref(false)
export const requiereConfiguracionInicial = ref(false)
export const cuentaBloqueada = ref(false)

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

// Formulario de Configuración Inicial (Primer Propietario)
export const formSetup = reactive({
  usuario: '',
  nombres: '',
  apellidos: '',
  password: '',
  confirmarPassword: '',
  claveSecreta: '',
})
export const cargandoSetup = ref(false)
export const mostrarPasswordSetup = ref(false)

// Alertas y Notificaciones
export const mensajeError = ref('')
export const mensajeExito = ref('')

export function limpiarMensajes() {
  mensajeError.value = ''
  mensajeExito.value = ''
  cuentaBloqueada.value = false
}

export function obtenerRutaDestino(): string {
  if (authStore.sinSucursalAsignada || authStore.necesitaElegirSucursal) {
    return '/seleccionar-sucursal'
  }
  return authStore.isCajero ? '/pos' : '/dashboard'
}

export async function redirigirSegunRol() {
  const destino = obtenerRutaDestino()
  try {
    const failure = await router.replace(destino)
    if (failure && router.currentRoute.value.path === '/') {
      window.location.replace(destino)
    }
  } catch {
    window.location.replace(destino)
  }
}

export function verificarMensajeBloqueoEnUrl() {
  let msgBloqueo: string | null = null
  try {
    msgBloqueo = sessionStorage.getItem('tw_bloqueo_msg')
    if (msgBloqueo) {
      sessionStorage.removeItem('tw_bloqueo_msg')
    }
  } catch {}

  const tieneQueryBloqueado = window.location.search.includes('bloqueado=1')
  if (msgBloqueo || tieneQueryBloqueado) {
    cuentaBloqueada.value = true
    mensajeError.value =
      msgBloqueo ||
      'Tu sesión fue cerrada porque la cuenta fue bloqueada o deshabilitada. Contacta con un propietario o administrador.'
    if (tieneQueryBloqueado) {
      window.history.replaceState({}, document.title, '/')
    }
  }
}

export async function verificarEstadoInicial() {
  cargandoEstadoInicial.value = true
  try {
    const res = await seguridadService.obtenerEstadoInicial()
    requiereConfiguracionInicial.value = Boolean(res.requiereConfiguracionInicial)
    if (requiereConfiguracionInicial.value) {
      modoVista.value = 'setup'
    }
  } catch {
    // Si falla la consulta de estado inicial, mantener vista login normal
  } finally {
    cargandoEstadoInicial.value = false
  }
}

export async function handleRegistrarPrimerAdmin() {
  limpiarMensajes()

  if (
    !formSetup.usuario.trim() ||
    !formSetup.nombres.trim() ||
    !formSetup.apellidos.trim() ||
    !formSetup.password.trim() ||
    !formSetup.claveSecreta.trim()
  ) {
    mensajeError.value = 'Complete todos los campos obligatorios, incluida la clave secreta de instalación.'
    return
  }

  if (formSetup.password.length < 6) {
    mensajeError.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  if (formSetup.password !== formSetup.confirmarPassword) {
    mensajeError.value = 'Las contraseñas ingresadas no coinciden.'
    return
  }

  cargandoSetup.value = true
  try {
    const res = await seguridadService.registrarPrimerAdmin({
      usuario: formSetup.usuario.trim(),
      nombres: formSetup.nombres.trim(),
      apellidos: formSetup.apellidos.trim(),
      password: formSetup.password,
      claveSecreta: formSetup.claveSecreta.trim(),
    })

    const usuarioCreado = formSetup.usuario.trim()
    formSetup.usuario = ''
    formSetup.nombres = ''
    formSetup.apellidos = ''
    formSetup.password = ''
    formSetup.confirmarPassword = ''
    formSetup.claveSecreta = ''

    requiereConfiguracionInicial.value = false
    modoVista.value = 'login'
    formLogin.usuario = usuarioCreado
    mensajeExito.value = res.mensaje || 'Propietario configurado exitosamente. Ya puede iniciar sesión.'
  } catch (err: any) {
    mensajeError.value = err.userMessage || 'No se pudo configurar la cuenta de propietario.'
  } finally {
    cargandoSetup.value = false
  }
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

    // Redirigir de forma inmediata y segura (evita quedar trabado en "Sesión activa detectada...")
    await redirigirSegunRol()

    // Respaldo de seguridad por si la vista permaneciera montada tras una navegación cancelada
    setTimeout(() => {
      if (authStore.isAuthenticated && window.location.pathname === '/') {
        window.location.replace(obtenerRutaDestino())
      }
    }, 1200)
  } catch (err: any) {
    cuentaBloqueada.value = err.httpStatus === 423 || err.errorCode === 'CUENTA_BLOQUEADA'
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

    try {
      await notificacionesService.crearNotificacion({
        rolDestino: 3,
        tipoNotificacion: 7,
        tituloAlerta: 'Solicitud de Recuperación de Contraseña',
        mensajeAlerta: `El usuario @${formRecuperar.usuario.trim()} ha solicitado el restablecimiento de su contraseña.`,
        direccion: '/admin/usuarios',
      })
    } catch (_) {}
  } catch (err: any) {
    cuentaBloqueada.value = err.httpStatus === 423 || err.errorCode === 'CUENTA_BLOQUEADA'
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
