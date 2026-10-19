const editor = {
  editor: {
    preview: 'Vista previa',
    previewNeedsUrl: 'Completá la URL para ver la vista previa',
    reviewAndPublish: 'Revisar y publicar',
    missing: 'Para publicar falta completar:',
    missingMore: ' y {count} más',
    resolveFirst: 'Primero resolvé los cambios sin guardar',
    someoneSaved: 'Otra persona guardó cambios',
    reloadAndRetry: 'Recargá la página y volvé a intentar.',
    couldNotFinish: 'No se pudo completar',
    language: 'Idioma',
    languageHelp: 'Los textos se cargan por idioma; imágenes, links y opciones son iguales en todos.',
    discardSection: {
      header: 'Volver a lo publicado: {label}',
      message: '{label} vuelve a ser igual a lo publicado. El resto de la página no cambia y lo que hay ahora queda guardado en el historial.',
      accept: 'Descartar cambios',
      done: '{label}: cambios descartados'
    },
    autosave: {
      idle: 'Sin cambios',
      pending: 'Cambios sin guardar',
      saving: 'Guardando…',
      saved: 'Guardado',
      savedAt: 'Guardado a las {time}',
      partial: 'Guardado, salvo la URL: ya la usa otro contenido',
      invalid: 'Hay campos para corregir',
      conflict: 'Otra persona guardó cambios',
      error: 'Error al guardar, reintentando al editar'
    },
    conflict: {
      header: 'Otra persona guardó cambios',
      loadCurrent: 'Cargar la versión actual',
      text: 'Mientras editabas, alguien más guardó cambios{parts}{time}. Para no pisar su trabajo, tus últimos cambios no se aplicaron.',
      parts: ' en {parts}',
      time: ' ({time})',
      kept: 'Tu versión quedó guardada en el historial del contenido, así que no se pierde nada.'
    },
    document: {
      thisContent: 'Este contenido',
      visibilityFailed: 'No se pudo cambiar la visibilidad',
      willShow: 'Se va a mostrar en el sitio',
      willHide: 'Se va a ocultar del sitio',
      nextPublish: 'El cambio se aplica en la próxima publicación.',
      trashHeader: 'Mandar a la papelera',
      trashMessage: '{name} se va a la papelera. Podés restaurarlo desde ahí durante 30 días. Si está publicado, se quita del sitio en la próxima publicación.',
      trashFailed: 'No se pudo mandar a la papelera',
      trashed: 'Enviado a la papelera',
      duplicate: 'Duplicar',
      duplicateNamed: 'Duplicar {name}',
      trash: 'Papelera',
      trashNamed: 'Mandar {name} a la papelera',
      showOnSite: 'Mostrar en el sitio'
    },
    page: {
      backToPublished: 'Volver a lo publicado',
      outline: 'Secciones de la página',
      outlineTitle: 'En esta página',
      goTo: 'Ir a una sección',
      goToLabel: 'Ir a una sección de la página',
      missing: 'Falta completar',
      changed: 'Con cambios',
      changedUnpublished: 'Con cambios sin publicar',
      hidden: 'Oculta',
      hiddenOnSite: 'Oculta en el sitio',
      marksMissing: 'falta completar',
      marksChanged: 'con cambios',
      marksHidden: 'oculta',
      hiddenNotice: 'Esta sección no se muestra en el sitio. Activá "Mostrar en el sitio" para volver a mostrarla.',
      usesBefore: 'También muestra contenido de ',
      usesAfter: ', que se edita aparte.',
      and: ' y '
    },
    previewPane: {
      size: 'Tamaño de pantalla',
      open: 'Abrir en otra pestaña',
      frame: 'Vista previa del sitio con los cambios sin publicar',
      devices: { desktop: 'Escritorio', tablet: 'Tablet', mobile: 'Celular' }
    },
    seoPreview: {
      group: 'Vista previa en Google',
      label: 'Así se vería en Google',
      titleMissing: 'Falta el título',
      descriptionMissing: 'Google va a elegir un texto de la página.',
      fallback: 'Lo que dejes vacío se completa con el contenido de la página.'
    },
    history: {
      open: 'Historial',
      now: 'Ahora',
      version: 'Versión',
      reasons: {
        publish: 'Versión publicada',
        restore: 'Borrador antes de restaurar',
        discard: 'Borrador antes de descartar cambios',
        conflict: 'Versión no guardada por un conflicto',
        checkpoint: 'Guardado automático'
      },
      thePage: 'La página',
      theDraft: 'El borrador',
      restorePageHeader: 'Restaurar toda la página',
      restoreHeader: 'Restaurar versión',
      restoreMessage: '{scope} vuelve a la versión del {date}. Lo que hay ahora queda guardado en el historial.',
      restore: 'Restaurar',
      restoreAll: 'Restaurar todo',
      restored: 'Versión restaurada en el borrador',
      restoreSectionHeader: 'Restaurar {label}',
      restoreSectionMessage: '{label} vuelve a la versión del {date}. El resto de la página no cambia y lo que hay ahora queda guardado en el historial.',
      restoreSection: 'Restaurar sección',
      sectionRestored: '{label}: versión restaurada en el borrador',
      discardHeader: 'Descartar cambios',
      discardMessage: '{scope} vuelve a ser igual a lo publicado. Lo que hay ahora queda guardado en el historial.',
      discard: 'Descartar cambios',
      discarded: 'Cambios descartados',
      unpublished: 'Hay cambios sin publicar.',
      empty: 'Todavía no hay versiones.',
      emptyHelp: 'Se guarda una al publicar y otra cada 15 minutos mientras editás.',
      showChanges: 'Ver cambios',
      same: 'Es igual al borrador actual.'
    }
  },
  fields: {
    chooseOne: 'Elegí una opción',
    chooseMany: 'Elegí una o más opciones',
    regenerateSlug: 'Generar de nuevo',
    issues: { one: '{count} campo por revisar', other: '{count} campos por revisar' },
    placeholders: {
      url: 'https://',
      video: 'https://www.youtube.com/watch?v=…',
      phone: '+54 9 351 …'
    },
    button: {
      text: 'Texto del botón',
      style: 'Estilo',
      target: 'Destino'
    },
    link: {
      kinds: {
        internal: 'Página del sitio',
        external: 'Sitio externo',
        email: 'Email',
        tel: 'Teléfono',
        anchor: 'Sección de esta página'
      },
      placeholders: {
        internal: '/contacto',
        external: 'https://',
        email: 'hola@tusitio.com',
        tel: '+54 9 351 …',
        anchor: '#contacto'
      },
      typeOf: 'Tipo de link de {label}',
      targetOf: 'Destino de {label}',
      newTab: 'Abrir en una pestaña nueva'
    },
    list: {
      add: 'Agregar',
      count: '{count} de {max}',
      item: '{label} {number}',
      removeHeader: 'Borrar elemento',
      removeMessage: '¿Borrar "{title}"?',
      remove: 'Borrar'
    },
    blocks: {
      add: 'Agregar bloque',
      removeHeader: 'Borrar bloque',
      removeMessage: '¿Borrar el bloque "{title}"?',
      empty: 'Sin contenido todavía',
      fallback: 'Bloque'
    },
    sortable: {
      move: 'Mover {title}',
      duplicate: 'Duplicar {title}',
      remove: 'Borrar {title}',
      dragStart: 'Moviendo {label}, posición {position} de {total}.',
      dragOver: '{label} pasa a la posición {position}.',
      dragEnd: '{label} quedó en la posición {position}.',
      dragCancel: 'Se canceló el movimiento de {label}.',
      instructions: 'Para mover, presioná espacio o enter. Usá las flechas para cambiar la posición y espacio o enter para soltar. Escape cancela.'
    }
  }
} as const

export default editor
