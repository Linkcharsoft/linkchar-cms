const core = {
  common: {
    yes: 'Sí',
    no: 'No',
    empty: '—',
    changed: 'Cambió'
  },
  validation: {
    required: 'Este campo es obligatorio',
    invalid: 'Valor inválido',
    maxLength: 'Usá hasta {max} caracteres',
    pattern: 'Formato inválido',
    email: 'Ingresá un email válido',
    url: 'Ingresá una URL que empiece con https://',
    phone: 'Ingresá un teléfono válido',
    slug: 'Usá minúsculas, números y guiones',
    video: 'Pegá un link de YouTube o Vimeo',
    richText: 'Contenido inválido',
    number: 'Ingresá un número',
    min: 'El mínimo es {min}',
    max: 'El máximo es {max}',
    date: 'Fecha inválida',
    option: 'Elegí una opción válida',
    maxOptions: 'Elegí hasta {max}',
    minOptions: 'Elegí al menos {min}',
    linkType: 'Tipo de link inválido',
    linkInternal: 'Los links internos empiezan con /',
    linkExternal: 'Ingresá una URL que empiece con https://',
    linkEmail: 'Ingresá un email válido',
    linkTel: 'Ingresá un teléfono válido',
    linkAnchor: 'Las anclas empiezan con #',
    variant: 'Variante inválida',
    time: 'Usá el formato HH:MM',
    timeOrder: 'El cierre tiene que ser posterior a la apertura',
    file: 'Archivo inválido',
    maxImages: 'Podés elegir hasta {max} imágenes',
    minImages: 'Elegí al menos {min} imágenes',
    reference: 'Referencia inválida',
    maxItems: 'Podés cargar hasta {max}',
    minItems: 'Cargá al menos {min}',
    blockType: 'Tipo de bloque desconocido',
    maxBlocks: 'Podés cargar hasta {max} bloques',
    minBlocks: { one: 'Cargá al menos {count} bloque', other: 'Cargá al menos {count} bloques' },
    translationMissing: 'Falta en {language}',
    altMissing: 'Falta el texto alternativo en {language}',
    slugTaken: 'Ya hay otro contenido con esta URL'
  },
  errors: {
    invalidData: 'Revisá los datos ingresados.',
    forbidden: 'No tenés permiso para hacer esto.',
    unknownEntry: 'Contenido desconocido.',
    documents: {
      saveFailed: 'No pudimos guardar. Revisá tu conexión.',
      gone: 'El contenido ya no existe. Recargá la página.',
      busy: 'Hay muchos cambios a la vez. Esperá unos segundos y volvé a intentar.',
      createFailed: 'No pudimos crear el contenido. Intentá de nuevo.',
      updateFailed: 'No pudimos guardar el cambio. Intentá de nuevo.'
    },
    versions: {
      gone: 'Esa versión ya no existe.',
      notPublished: 'Este contenido todavía no se publicó.',
      slugTaken: 'Otro contenido ya usa la URL de esa versión. Cambiala primero.',
      failed: 'No pudimos restaurar. Intentá de nuevo.'
    },
    trash: {
      slugTaken: 'Otro contenido ya usa su URL. Cambiá esa primero.',
      restoreFailed: 'No se pudo restaurar.',
      notTrashed: 'No está en la papelera.',
      stillPublished: 'Sigue publicado: publicá los cambios para quitarlo del sitio y después eliminalo.',
      purgeFailed: 'No se pudo eliminar.'
    },
    publish: {
      stale: 'Hubo cambios mientras revisabas. Actualizá la lista y volvé a publicar.',
      nothing: 'No hay cambios para publicar.',
      forbidden: 'No tenés permiso para publicar. Pedíselo a un administrador.',
      slugTaken: 'Dos contenidos quedarían con la misma URL. Cambiá una de las dos y volvé a publicar.',
      invalidSlug: 'Una de las URLs nuevas no es válida. Revisala y volvé a publicar.',
      failed: 'No pudimos publicar. Intentá de nuevo.'
    },
    build: {
      target_missing: 'Falta configurar cómo se actualiza el sitio.',
      hook_refused: 'El servicio que actualiza el sitio rechazó el pedido.',
      hook_unreachable: 'No pudimos iniciar la actualización del sitio.',
      build_failed: 'Falló la actualización del sitio.'
    },
    media: {
      altRequired: 'El texto alternativo es obligatorio para las imágenes.',
      invalidFolder: 'Carpeta inválida.',
      invalidType: 'Tipo de archivo no permitido.',
      tooLarge: 'El archivo supera los {max} MB.',
      invalidDimensions: 'Dimensiones inválidas.',
      invalidPreview: 'Vista previa inválida.',
      invalidFocalPoint: 'Punto focal inválido.',
      registerFailed: 'No se pudo guardar el archivo en la librería.',
      gone: 'El archivo ya no existe.',
      updateFailed: 'No se pudieron guardar los cambios.'
    },
    users: {
      forbidden: 'No tenés permiso para gestionar a este usuario.',
      emailTaken: 'Ya existe un usuario con ese email.',
      emailRateLimit: 'Se alcanzó el límite de emails por hora. Probá de nuevo más tarde.',
      inviteFailed: 'No pudimos enviar la invitación. Intentá de nuevo.',
      saveFailed: 'No pudimos guardar los cambios.',
      alreadySignedIn: 'Este usuario ya ingresó: puede usar "Olvidé mi contraseña".',
      deleteSignedIn: 'Este usuario ya ingresó: desactivalo en lugar de borrarlo.',
      deleteInviteFailed: 'No pudimos eliminar la invitación.',
      mfaResetFailed: 'No pudimos restablecer la verificación en dos pasos.'
    },
    account: {
      nameFailed: 'No pudimos guardar tu nombre. Intentá de nuevo.',
      invalidPhoto: 'La foto no es válida.',
      photoFailed: 'No pudimos guardar la foto. Intentá de nuevo.',
      wrongPassword: 'La contraseña actual no es correcta.',
      weakPassword: 'La contraseña es muy débil: usá al menos 10 caracteres con letras y números.',
      samePassword: 'La nueva contraseña tiene que ser distinta de la anterior.',
      passwordFailed: 'No pudimos guardar la contraseña. Intentá de nuevo.',
      toursFailed: 'No pudimos reiniciar las guías.'
    },
    auth: {
      rateLimit: 'Demasiados intentos. Esperá unos minutos.',
      inactive: 'Tu usuario está desactivado. Contactá a un administrador.',
      wrongCredentials: 'Email o contraseña incorrectos.',
      linkRequired: 'Este paso solo funciona desde el link que te llegó por email. Pedí uno nuevo.',
      nameFailed: 'Guardamos tu contraseña, pero no tu nombre. Podés cambiarlo después.'
    }
  },
  forms: {
    emailRequired: 'Ingresá el email',
    emailInvalid: 'Ingresá un email válido',
    passwordRequired: 'Ingresá tu contraseña',
    currentPasswordRequired: 'Ingresá tu contraseña actual',
    newPasswordRequired: 'Ingresá una contraseña',
    passwordLength: 'Usá al menos {min} caracteres',
    passwordLetter: 'Incluí al menos una letra',
    passwordDigit: 'Incluí al menos un número',
    confirmRequired: 'Repetí la contraseña',
    confirmMismatch: 'Las contraseñas no coinciden',
    nameRequired: 'Ingresá el nombre',
    nameLength: 'Usá hasta {max} caracteres',
    roleRequired: 'Elegí un rol',
    codeRequired: 'Ingresá el código',
    codeFormat: 'El código tiene 6 números',
    deviceRequired: 'Elegí un celular'
  },
  diff: {
    otherFile: 'Otro archivo',
    images: { one: '{count} imagen', other: '{count} imágenes' },
    deleted: 'Contenido eliminado',
    openingHours: 'Horarios'
  },
  relations: {
    trashedTag: 'En la papelera',
    trashed: 'está en la papelera',
    hiddenTag: 'Oculto',
    hidden: 'está oculto',
    unpublishingTag: 'Se quita al publicar',
    unpublishing: 'se quita del sitio al publicar',
    newTag: 'Sin publicar',
    new: 'todavía no está publicado: sale con la próxima publicación',
    missing: '{name} {reason}: no va a aparecer en el sitio.',
    notice: '{name} {reason}.',
    deleted: 'Un contenido elegido ya no existe: no va a aparecer en el sitio.',
    incomplete: '{name} no se publica hasta completar sus campos: no va a aparecer en el sitio.'
  },
  collection: {
    new: 'Nuevo {name}',
    untitled: '{name} sin título',
    copy: '{title} (copia)',
    copySlug: 'copia'
  },
  section: {
    hide: 'Ocultar esta sección'
  },
  seo: {
    label: 'Cómo aparece en Google y al compartir',
    help: 'Cómo se ve esta página en Google y al compartir el link.',
    title: 'Título para Google',
    titleHelp: 'Ideal hasta 60 caracteres.',
    titleHelpFallback: 'Ideal hasta 60 caracteres. Si lo dejás vacío, se usa el título.',
    description: 'Descripción para Google',
    descriptionHelpFallback: 'Si la dejás vacía, se usa el resumen.',
    image: 'Imagen al compartir',
    imageHelp: 'Se ve al compartir el link en WhatsApp o redes. Ideal 1200 × 630 px.'
  }
} as const

export default core
