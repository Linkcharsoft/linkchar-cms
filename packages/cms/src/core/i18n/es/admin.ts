const admin = {
  overview: {
    todo: 'Para hacer',
    editPage: 'Editar una página',
    uploadImages: 'Subir imágenes',
    alerts: 'Avisos',
    allGood: 'Todo en orden.',
    view: 'Ver',
    incomplete: '"{title}" no se publica hasta completar: {fields}.',
    reference: 'En "{title}": {warning}',
    publishing: 'Publicación',
    noPending: 'No hay cambios pendientes',
    pending: { one: '{count} cambio pendiente de publicar', other: '{count} cambios pendientes de publicar' },
    latest: 'Última publicación: {date} · {status}',
    neverPublished: 'Todavía no se publicó nada.',
    noContent: 'Sin contenido',
    recent: 'Editado recientemente',
    noRecent: 'Todavía no se editó ningún contenido.',
    recentMeta: '{entry} · {date}'
  },
  account: {
    profile: 'Perfil',
    password: 'Contraseña',
    mfaTitle: 'Verificación en dos pasos',
    name: 'Nombre',
    saveName: 'Guardar nombre',
    nameSaved: 'Nombre guardado',
    changePhoto: 'Cambiar foto',
    uploadPhoto: 'Subir foto',
    removePhoto: 'Quitar',
    choosePhoto: 'Elegir foto de perfil',
    photoSaved: 'Foto actualizada',
    photoRemoved: 'Foto eliminada',
    photoType: 'Elegí una imagen JPG, PNG o WebP.',
    photoUploadFailed: 'No se pudo subir la foto. Intentá de nuevo.',
    currentPassword: 'Contraseña actual',
    newPassword: 'Contraseña nueva',
    confirmNewPassword: 'Repetí la contraseña nueva',
    signOutOthers: 'Cerrar la sesión en los demás dispositivos',
    changePassword: 'Cambiar contraseña',
    passwordChanged: 'Contraseña actualizada',
    othersSignedOut: 'Se cerró la sesión en los demás dispositivos.',
    mfa: {
      on: 'Activada: además de la contraseña, al entrar se pide un código de alguno de estos celulares.',
      off: 'Recomendado. Además de la contraseña, al entrar se pide un código que genera una app en tu celular. Si la cuenta la usan varias personas, cada una agrega su celular.',
      addedOn: 'Agregado el {date}',
      remove: 'Quitar',
      addAnother: 'Agregar otro celular',
      enable: 'Activar con un celular',
      enabled: 'Verificación en dos pasos activada',
      enabledDetail: 'Desde ahora se pide el código de "{name}" al ingresar.',
      removeHeader: 'Quitar celular',
      removeLast: 'Es el único celular: al quitarlo se desactiva la verificación en dos pasos y alcanza con la contraseña para entrar.',
      removeOne: '"{name}" ya no va a poder generar códigos para entrar.',
      removeFailed: 'No pudimos quitar el celular. Intentá de nuevo.',
      removed: 'Se quitó "{name}"',
      addTitle: 'Agregar un celular',
      continue: 'Continuar',
      activate: 'Activar',
      deviceName: 'Nombre del celular',
      deviceNamePlaceholder: 'Por ejemplo "Celular de Ana"',
      nameRequired: 'Poné un nombre para reconocer este celular.',
      nameTaken: 'Ya hay un celular con ese nombre.',
      enrollFailed: 'No pudimos empezar la configuración. Intentá de nuevo.',
      stepInstall: 'Instalá una app de autenticación (Google Authenticator, Microsoft Authenticator o similar).',
      stepScan: 'En la app, agregá una cuenta escaneando este código.',
      stepCode: 'Escribí el código de 6 números que te muestra.',
      qrAlt: 'Código QR para la app de autenticación',
      secret: '¿No podés escanear? Ingresá esta clave a mano:',
      code: 'Código de la app'
    }
  },
  usersScreen: {
    subtitle: 'Quiénes pueden entrar al panel y qué pueden hacer. Para que alguien deje de entrar, desactivalo: su historial se conserva.',
    invite: 'Invitar usuario',
    search: 'Buscar por nombre o email',
    role: 'Rol',
    allRoles: 'Todos los roles',
    noMatches: 'No hay usuarios que coincidan.',
    columns: {
      user: 'Usuario',
      role: 'Rol',
      publishes: 'Publica',
      status: 'Estado',
      mfa: '2 pasos',
      lastSignIn: 'Último ingreso',
      actions: 'Acciones'
    },
    mfaOn: 'Activada',
    noName: 'Sin nombre',
    you: '{name} (vos)',
    actionsFor: 'Acciones para {name}',
    menu: {
      edit: 'Editar rol y permisos',
      resend: 'Reenviar invitación',
      deleteInvite: 'Eliminar invitación',
      reactivate: 'Reactivar',
      deactivate: 'Desactivar',
      resetMfa: 'Restablecer verificación en dos pasos'
    },
    confirm: {
      deleteInviteHeader: 'Eliminar invitación',
      deleteInvite: '{name} ya no va a poder usar el link que recibió.',
      deleteInviteAccept: 'Eliminar',
      deactivateHeader: 'Desactivar usuario',
      deactivate: '{name} deja de poder entrar al panel y se cierran sus sesiones. Su historial se conserva.',
      deactivateAccept: 'Desactivar',
      resetMfaHeader: 'Restablecer verificación',
      resetMfa: 'Se quitan los celulares de {name}: podrá entrar solo con la contraseña y volver a activarla.',
      resetMfaAccept: 'Restablecer'
    },
    done: {
      resent: 'Invitación reenviada a {email}',
      inviteDeleted: 'Invitación eliminada',
      reactivated: '{name} puede volver a entrar',
      deactivated: '{name} quedó desactivado',
      mfaReset: 'Verificación restablecida',
      saved: 'Cambios guardados',
      invited: 'Invitación enviada a {email}'
    },
    dialog: {
      editTitle: 'Editar a {name}',
      name: 'Nombre',
      save: 'Guardar',
      send: 'Enviar invitación',
      canPublish: 'Puede publicar cambios en el sitio',
      inviteHelp: 'Le llega un email con un link para elegir su contraseña. Si el link vence, reenviale la invitación desde sus acciones.'
    }
  },
  activityScreen: {
    subtitle: 'Qué se hizo en el panel y cuándo: ingresos, ediciones, publicaciones, archivos y usuarios. Se guarda 12 meses.',
    actionType: 'Tipo de acción',
    allActions: 'Todas las acciones',
    user: 'Usuario',
    allUsers: 'Todos los usuarios',
    dates: 'Fechas',
    clear: 'Limpiar filtros',
    noMatches: 'No hay actividad que coincida.',
    deletedUser: 'Usuario eliminado',
    columns: {
      date: 'Fecha',
      user: 'Usuario',
      action: 'Acción'
    }
  },
  help: {
    button: 'Ayuda',
    thisScreen: 'Ver la guía de esta pantalla',
    tours: 'Guías',
    openDocument: 'Abrí un elemento para verla',
    reset: 'Volver a mostrar todas las guías',
    resetDone: 'Las guías se van a mostrar de nuevo al entrar a cada pantalla.',
    next: 'Siguiente',
    previous: 'Anterior',
    done: 'Listo',
    progress: '{current} de {total}'
  },
  tours: {
    welcome: {
      title: 'Primer recorrido por el panel',
      intro: {
        title: 'Te damos la bienvenida',
        description: 'Desde este panel editás los textos, las imágenes y el contenido del sitio. Te mostramos lo principal en un minuto.'
      },
      nav: {
        title: 'Todo el contenido, ordenado',
        content: 'En {group}: {items}.',
        site: 'En {group}: {items}, que se ven en todas las páginas.'
      },
      tasks: {
        title: 'Para hacer',
        description: 'Atajos a lo más común: crear contenido nuevo, editar una página o subir imágenes.'
      },
      alerts: {
        title: 'Avisos',
        description: 'Lo que necesita tu atención: una publicación que falló o un cambio que no va a salir como esperás. Cada aviso te lleva a donde se resuelve.'
      },
      pending: {
        title: 'Cambios pendientes',
        description: 'Lo que editás se guarda solo, pero no aparece en el sitio hasta que lo publicás. Acá ves cuántos cambios esperan.'
      },
      pages: {
        title: 'Tus {pages}',
        description: 'El estado de cada página del sitio: publicada, con cambios sin publicar o sin contenido.'
      },
      recent: {
        title: 'Lo último que editaste',
        description: 'Para volver rápido a lo que estabas trabajando.'
      },
      publish: {
        title: 'Publicar',
        description: 'Cuando terminás, publicás todo junto. El sitio se actualiza en unos 5 minutos.'
      },
      viewSite: {
        title: 'Ver el sitio',
        description: 'Abre el sitio publicado en otra pestaña.'
      },
      account: {
        title: 'Tu cuenta',
        description: 'Tocá tu nombre para ir a {account} (foto, contraseña y verificación en dos pasos) o para cerrar sesión.'
      },
      help: {
        title: '¿Dudas?',
        description: 'Desde {help} podés repetir esta guía o ver la de cualquier pantalla.'
      }
    },
    pages: {
      title: 'Las páginas del sitio',
      list: {
        title: 'Una fila por página',
        description: 'Cada página del sitio con su estado y la última edición. Abrila para editar todo su contenido en un solo lugar.'
      },
      uses: {
        title: 'Lo que se edita aparte',
        description: 'Algunas páginas muestran contenido que tiene su propia pantalla, como {example}. El link te lleva directo.'
      }
    },
    pageEditor: {
      title: 'Cómo editar una página',
      outline: {
        title: 'Las secciones de la página',
        description: 'En el mismo orden que en el sitio. Un punto marca lo que falta completar y otro, lo que cambió desde la última publicación. Tocá una para ir directo.'
      },
      form: {
        title: 'Cada sección se abre y se cierra',
        description: 'Abrí la que quieras editar. Algunas se pueden ocultar del sitio, y si cambiaste algo podés volverla a lo publicado sin tocar el resto.'
      },
      autosave: {
        title: 'Se guarda solo',
        description: 'No hay botón de guardar: cada cambio se guarda a los pocos segundos. Si otra persona edita otra sección a la vez, no se pisan; si edita la misma, te avisamos sin perder nada.'
      },
      missing: {
        title: 'Falta completar',
        description: 'Si un campo obligatorio está vacío, la página no se publica hasta completarlo. El índice te muestra en qué sección está.'
      },
      preview: {
        title: 'Vista previa',
        description: 'Muestra la página real con tus cambios antes de publicarlos, y va a la sección que estás editando. Podés verla como celular, tablet o computadora.'
      },
      history: {
        title: 'Historial',
        description: 'Cada publicación queda guardada, y mientras editás se guarda una copia cada 15 minutos: podés volver a una versión anterior de toda la página o de una sola sección.'
      }
    },
    site: {
      title: 'Cómo editar los datos del sitio',
      form: {
        title: 'Lo que se ve en todas las páginas',
        description: 'Estos datos son iguales en todo el sitio: si los cambiás acá, cambian en todas las páginas.'
      },
      autosave: {
        title: 'Se guarda solo',
        description: 'No hay botón de guardar: cada cambio se guarda a los pocos segundos.'
      },
      history: {
        title: 'Historial',
        description: 'Podés volver a una versión anterior o descartar lo que cambiaste desde la última publicación.'
      }
    },
    document: {
      title: 'Cómo editar un elemento',
      visibility: {
        title: 'Mostrar en el sitio',
        description: 'Lo nuevo empieza oculto. Activalo cuando esté listo: se publica con el próximo "Publicar". Si lo apagás, se quita del sitio en la próxima publicación.'
      },
      form: {
        title: 'Contenido',
        description: 'Completá los textos y las imágenes.',
        slug: 'La URL se arma sola a partir del título.',
        seo: 'En "{label}" ves cómo va a aparecer.'
      },
      autosave: {
        title: 'Se guarda solo',
        description: 'No hace falta guardar: cada cambio queda registrado a los pocos segundos.'
      },
      preview: {
        title: 'Vista previa',
        description: 'Mirá cómo queda antes de publicar.'
      },
      history: {
        title: 'Historial',
        description: 'Mientras editás se guarda una copia cada 15 minutos: volvé a una versión anterior si te equivocaste.'
      }
    },
    collection: {
      title: 'Cómo crear y publicar contenido',
      create: {
        title: 'Crear',
        description: 'Crea un borrador. Nadie lo ve hasta que lo marcás para mostrar en el sitio y publicás.'
      },
      list: {
        title: 'La lista',
        description: 'Buscá, filtrá por estado y abrí cualquiera para editarlo. El estado indica si está publicado, con cambios sin publicar u oculto.'
      },
      related: {
        title: 'Contenido relacionado',
        description: 'Algunos campos eligen otro contenido, como "{field}": lo elegís o lo creás desde el mismo campo, y se completa en su propia pantalla ({place}).'
      },
      publish: {
        title: 'Publicar',
        description: 'Cuando esté listo y visible, publicá los cambios para que aparezca en el sitio.'
      }
    },
    media: {
      title: 'Imágenes y archivos',
      upload: {
        title: 'Subir',
        description: 'Arrastrá fotos o PDF. Las imágenes se optimizan solas: no hace falta achicarlas antes.'
      },
      alt: {
        title: 'Texto alternativo',
        description: 'Cada imagen necesita una descripción breve. La leen los lectores de pantalla y Google, por eso es obligatoria.'
      },
      toolbar: {
        title: 'Buscar y ordenar',
        description: 'Filtrá por carpeta o tipo de archivo. Al abrir una imagen podés marcar el punto que siempre tiene que verse cuando se recorta.'
      },
      trash: {
        title: 'Papelera',
        description: 'Lo que borrás va a la papelera y se puede recuperar durante 30 días. Al abrir un archivo ves dónde se usa: mientras esté en uso no se puede borrar.'
      }
    },
    publish: {
      title: 'Cómo publicar los cambios',
      pending: {
        title: 'Qué se va a publicar',
        description: 'La lista de todo lo que cambió desde la última publicación. Si algo está incompleto, te avisamos qué falta.'
      },
      button: {
        title: 'Publicar cambios',
        description: 'Publica todo junto. El sitio tarda unos 5 minutos en actualizarse; el estado se ve arriba, junto a Publicar.'
      },
      history: {
        title: 'Publicaciones anteriores',
        description: 'Quién publicó, cuándo y si terminó bien.'
      },
      after: {
        title: 'Y después, publicar',
        description: 'Los cambios llegan al sitio recién cuando los publicás.'
      }
    },
    account: {
      title: 'Tu cuenta y la seguridad',
      password: {
        title: 'Contraseña',
        description: 'Cambiala cuando quieras. Si sospechás que alguien más la conoce, marcá "{option}".'
      },
      mfa: {
        title: 'Verificación en dos pasos',
        description: 'Recomendada: además de la contraseña, pide un código del celular. Si la cuenta la usan varias personas, cada una agrega su propio celular.'
      }
    }
  }
} as const

export default admin
