import type es from '../es/inputs'
import type { CatalogType } from '../types'

const inputs = {
  richTextEditor: {
    loading: 'Loading editor…',
    toolbar: '{label} formatting',
    heading: 'Heading level {level}',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strike: 'Strikethrough',
    link: 'Link',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    quote: 'Quote',
    divider: 'Divider',
    insertImage: 'Insert image',
    insertVideo: 'Insert video',
    undo: 'Undo',
    redo: 'Redo',
    linkLabel: 'Address',
    linkPlaceholder: 'https://… or /contact',
    linkRequired: 'Enter a link',
    linkInvalid: 'Use a link that starts with https://, /, mailto: or tel:',
    videoLabel: 'YouTube or Vimeo link',
    videoInvalid: 'Paste a YouTube or Vimeo link'
  },
  urlDialog: {
    remove: 'Remove',
    apply: 'Apply'
  },
  relationInput: {
    search: 'Search {name}…',
    searchAny: 'Search content…',
    empty: 'No results',
    gone: 'Deleted content',
    goneNotice: 'The chosen content no longer exists: it won\'t appear on the site.'
  },
  createRelated: {
    titleLabel: 'Name',
    required: 'Fill in {label}.',
    failed: 'We couldn\'t create it. Check your connection and try again.',
    create: 'Create',
    help: 'It\'s created with this and selected right away. You can fill in the rest later in {place}.'
  },
  openingHoursInput: {
    open: 'Open',
    closed: 'Closed',
    from: '{day}, opening time',
    to: '{day}, closing time',
    until: 'to',
    note: 'Note (optional)',
    notePlaceholder: 'Holidays: closed'
  }
} satisfies CatalogType<typeof es>

export default inputs
