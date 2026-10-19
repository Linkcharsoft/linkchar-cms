const status = {
  documentStatus: {
    hidden: 'Borrador',
    new: 'Listo para publicar',
    published: 'Publicado',
    changed: 'Cambios sin publicar',
    unpublishing: 'Se quita al publicar'
  },
  publishStatus: {
    building: 'Publicando · ~5 min',
    buildingStarted: 'Publicando · recién empezó',
    buildingFor: 'Publicando · hace {minutes} min',
    success: 'Listo',
    failed: 'Error',
    unconfirmed: 'Sin confirmar'
  },
  publishStatusHelp: {
    building: 'El sitio se está actualizando. Suele tardar unos 5 minutos.',
    success: 'El sitio ya muestra estos cambios.',
    failed: 'No se pudo actualizar el sitio, que sigue mostrando la versión anterior. Reintentá desde Publicar; si vuelve a fallar, avisá a soporte.',
    unconfirmed: 'No recibimos la confirmación de que el sitio se actualizó. Revisá el sitio: si no ves los cambios, avisá a soporte.'
  },
  roles: {
    editor: 'Editor',
    admin: 'Administrador',
    superadmin: 'Superadmin'
  },
  roleHelp: {
    editor: 'Edita contenido. Publica solo si se lo permitís.',
    admin: 'Edita, publica, ve la actividad y gestiona usuarios.',
    superadmin: 'Todo, incluidos los ajustes técnicos. Solo para el equipo que mantiene el sitio.'
  },
  userStatus: {
    active: 'Activo',
    invited: 'Invitación pendiente',
    inactive: 'Desactivado'
  }
} as const

export default status
