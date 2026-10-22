const cli = {
  emails: {
    invite: {
      subject: 'Te invitaron al panel de contenido',
      title: 'Te invitaron al panel de contenido',
      body: 'Para crear tu usuario, elegí tu contraseña desde este link:',
      action: 'Crear mi usuario',
      ignore: 'Si no esperabas esta invitación, ignorá este email.'
    },
    recovery: {
      subject: 'Elegí una contraseña nueva',
      title: 'Elegí una contraseña nueva',
      body: 'Pediste recuperar la contraseña del panel de contenido. Entrá desde este link para elegir una nueva:',
      action: 'Elegir una contraseña nueva',
      ignore: 'Si no fuiste vos, ignorá este email: tu contraseña no cambia.'
    }
  },
  starter: {
    settings: 'Datos del sitio',
    siteName: 'Nombre del sitio',
    tagline: 'Descripción corta',
    shareImage: 'Imagen al compartir',
    home: 'Inicio',
    hero: 'Portada',
    title: 'Título',
    intro: 'Introducción',
    folder: 'Sitio',
    notFound: 'No encontramos esta página'
  }
} as const

export default cli
