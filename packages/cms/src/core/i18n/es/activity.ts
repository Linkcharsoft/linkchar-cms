const activity = {
  activity: {
    groups: {
      content: 'Contenido',
      publishing: 'Publicación',
      media: 'Medios',
      users: 'Usuarios',
      account: 'Cuenta y accesos'
    },
    actions: {
      document: {
        create: 'Creó',
        duplicate: 'Duplicó',
        trash: 'Mandó a la papelera',
        untrash: 'Recuperó de la papelera',
        purge: 'Eliminó definitivamente',
        restore: 'Restauró una versión anterior de',
        discard: 'Descartó los cambios de',
        show: 'Marcó para mostrar en el sitio',
        hide: 'Marcó para ocultar del sitio'
      },
      site: {
        publish: 'Publicó cambios en el sitio',
        retry: 'Reintentó la actualización del sitio'
      },
      media: {
        upload: 'Subió un archivo',
        trash: 'Mandó un archivo a la papelera',
        purge: 'Eliminó un archivo definitivamente'
      },
      user: {
        invite: 'Invitó a',
        invite_resend: 'Reenvió la invitación a',
        invite_delete: 'Eliminó la invitación de',
        update: 'Cambió el rol o los permisos de',
        deactivate: 'Desactivó a',
        reactivate: 'Reactivó a',
        mfa_reset: 'Restableció la verificación en dos pasos de'
      },
      auth: {
        login: 'Ingresó al panel',
        password_change: 'Cambió su contraseña',
        mfa_enroll: 'Agregó un celular para la verificación en dos pasos',
        mfa_unenroll: 'Quitó un celular de la verificación en dos pasos'
      },
      profile: {
        update: 'Actualizó su perfil'
      }
    },
    detail: {
      published: { one: '{count} publicado', other: '{count} publicados' },
      removed: { one: '{count} despublicado', other: '{count} despublicados' },
      redirects: { one: '{count} redirección', other: '{count} redirecciones' },
      withMfa: 'Con verificación en dos pasos',
      name: 'Nombre: {name}',
      photoChanged: 'Cambió su foto',
      photoRemoved: 'Quitó su foto'
    },
    deleted: '(eliminado)'
  }
} as const

export default activity
