import type es from '../es/site'
import type { CatalogType } from '../types'

const site = {
  site: {
    draftExit: 'Previewing drafts · Exit'
  }
} satisfies CatalogType<typeof es>

export default site
