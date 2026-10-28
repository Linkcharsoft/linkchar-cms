const shell = {
  nav: {
    overview: 'Resumen',
    pages: 'Páginas',
    media: 'Medios',
    users: 'Usuarios',
    activity: 'Actividad',
    trash: 'Papelera',
    groups: {
      content: 'Contenido',
      site: 'Sitio',
      admin: 'Administración'
    }
  },
  shell: {
    brandTag: 'CMS',
    skipToContent: 'Saltar al contenido',
    tagline: 'Panel de contenido',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    sections: 'Secciones del panel',
    viewSite: 'Ver sitio',
    viewSiteNewTab: 'Ver sitio (se abre en otra pestaña)',
    account: 'Mi cuenta',
    signOut: 'Cerrar sesión',
    signingOut: 'Cerrando sesión…',
    someone: 'Usuario',
    publish: 'Publicar',
    pendingChanges: { one: '{count} cambio pendiente', other: '{count} cambios pendientes' },
    incompleteChanges: { one: '{count} cambio incompleto: no sale hasta completarlo', other: '{count} cambios incompletos: no salen hasta completarlos' },
    loading: 'Cargando…',
    notFound: {
      title: 'No encontramos esta pantalla',
      description: 'El link puede estar mal escrito o el contenido ya no existe.',
      home: 'Ir al resumen'
    },
    error: {
      title: 'Algo salió mal',
      description: 'No pudimos mostrar esta pantalla. Probá de nuevo; si sigue pasando, avisá a soporte.',
      reference: 'Referencia: {digest}',
      retry: 'Probar de nuevo',
      home: 'Ir al resumen'
    }
  }
} as const

export default shell
