const inputs = {
  richTextEditor: {
    loading: 'Cargando editor…',
    toolbar: 'Formato de {label}',
    heading: 'H{level}, título nivel {level}',
    bold: 'Negrita',
    italic: 'Itálica',
    underline: 'Subrayado',
    strike: 'Tachado',
    link: 'Link',
    bulletList: 'Lista con viñetas',
    orderedList: 'Lista numerada 1.',
    quote: 'Cita',
    divider: 'Separador',
    insertImage: 'Insertar imagen',
    insertVideo: 'Insertar video',
    undo: 'Deshacer',
    redo: 'Rehacer',
    linkLabel: 'Dirección',
    linkPlaceholder: 'https://… o /contacto',
    linkRequired: 'Ingresá un link',
    linkInvalid: 'Usá un link que empiece con https://, /, mailto: o tel:',
    videoLabel: 'Link de YouTube o Vimeo',
    videoInvalid: 'Pegá un link de YouTube o Vimeo'
  },
  urlDialog: {
    remove: 'Quitar',
    apply: 'Aplicar'
  },
  relationInput: {
    search: 'Buscar en {name}…',
    searchAny: 'Buscar contenidos…',
    empty: 'No hay resultados',
    create: 'Crear "{name}"',
    gone: 'Contenido eliminado',
    goneNotice: 'El contenido elegido ya no existe: no va a aparecer en el sitio.'
  },
  createRelated: {
    titleLabel: 'Nombre',
    required: 'Completá {label}.',
    failed: 'No pudimos crearlo. Revisá tu conexión y volvé a intentar.',
    create: 'Crear',
    help: 'Se crea con este dato y queda elegido. El resto lo podés completar después en {place}.'
  },
  openingHoursInput: {
    open: 'Abierto',
    closed: 'Cerrado',
    from: '{day}, apertura',
    to: '{day}, cierre',
    until: 'a',
    note: 'Aclaración (opcional)',
    notePlaceholder: 'Feriados: cerrado'
  }
} as const

export default inputs
