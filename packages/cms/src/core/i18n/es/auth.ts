const auth = {
  auth: {
    email: 'Email',
    password: 'Contraseña',
    newPassword: 'Contraseña nueva',
    confirmPassword: 'Repetí la contraseña',
    fullName: 'Nombre y apellido',
    passwordRules: 'Al menos {min} caracteres, con letras y números.',
    backToLogin: 'Volver a iniciar sesión',
    login: {
      title: 'Iniciar sesión',
      subtitle: 'Entrá con el email y la contraseña de tu usuario.',
      submit: 'Ingresar',
      forgot: 'Olvidé mi contraseña'
    },
    urlErrors: {
      inactivo: 'Tu usuario está desactivado. Contactá a un administrador.',
      sesion: 'Tu sesión se cerró. Volvé a ingresar.',
      'link-invalido': 'El link no es válido. Pedí uno nuevo.',
      'link-vencido': 'El link venció o ya fue usado. Pedí uno nuevo.'
    },
    recovery: {
      title: 'Recuperar contraseña',
      subtitle: 'Ingresá tu email y te enviamos un link para elegir una contraseña nueva.',
      sent: 'Si el email tiene un usuario en el panel, te llega un link en unos minutos. Revisá también el spam.',
      submit: 'Enviar link'
    },
    reset: {
      title: 'Elegí una contraseña nueva',
      subtitle: 'Usá al menos {min} caracteres, con letras y números.',
      submit: 'Guardar contraseña'
    },
    confirm: {
      title: 'Confirmar el link',
      submit: 'Continuar',
      invite: {
        title: 'Tu invitación al panel',
        subtitle: 'Tocá el botón para crear tu usuario. El link se usa recién ahí, así no se gasta si tu correo lo abre antes.'
      },
      recovery: {
        title: 'Cambiar tu contraseña',
        subtitle: 'Tocá el botón para elegir una contraseña nueva. El link se usa recién ahí, así no se gasta si tu correo lo abre antes.'
      }
    },
    invite: {
      title: 'Te damos la bienvenida',
      subtitle: 'Para terminar de crear tu usuario, contanos tu nombre y elegí una contraseña.',
      email: 'Tu usuario',
      submit: 'Crear mi usuario'
    },
    mfa: {
      title: 'Verificación en dos pasos',
      subtitle: 'Abrí la app de autenticación de tu celular e ingresá el código de 6 números.',
      device: 'Celular',
      code: 'Código',
      submit: 'Verificar',
      otherAccount: 'Usar otra cuenta',
      lostDevice: 'No tengo el celular',
      lostDeviceHelp: 'Pedile a un administrador que restablezca tu verificación en dos pasos desde Usuarios: vas a poder entrar solo con la contraseña y volver a activarla con otro celular.',
      rateLimit: 'Demasiados intentos. Esperá unos minutos.',
      wrongCode: 'El código no es correcto o ya venció. Probá con el que muestra ahora la app.'
    }
  }
} as const

export default auth
