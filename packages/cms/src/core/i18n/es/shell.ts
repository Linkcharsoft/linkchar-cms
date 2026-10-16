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
    brandTag: 'Panel',
    tagline: 'Panel de contenido',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    sections: 'Secciones del panel',
    viewSite: 'Ver sitio',
    viewSiteNewTab: 'Ver sitio (se abre en otra pestaña)',
    account: 'Mi cuenta',
    accountOf: 'Cuenta de {name}',
    signOut: 'Cerrar sesión',
    signingOut: 'Cerrando sesión…',
    someone: 'Usuario',
    publish: 'Publicar',
    pendingChanges: { one: '{count} cambio pendiente', other: '{count} cambios pendientes' },
    loading: 'Cargando…'
  }
} as const

export default shell
