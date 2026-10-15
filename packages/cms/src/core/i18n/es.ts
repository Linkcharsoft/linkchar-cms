// A namespace never has a key named `other`: an object with `other` is a plural message.
const es = {
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
    altMissing: 'Falta el texto alternativo en {language}'
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
    untitled: '{name} sin título'
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

export default es
