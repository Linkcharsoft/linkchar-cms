import type es from '../es/ui'
import type { CatalogType } from '../types'

const ui = {
  ui: {
    cancel: 'Cancel',
    close: 'Close',
    search: 'Search…',
    clearSearch: 'Clear the search',
    loading: 'Loading…',
    retry: 'Retry',
    never: 'Never'
  }
} satisfies CatalogType<typeof es>

export default ui
