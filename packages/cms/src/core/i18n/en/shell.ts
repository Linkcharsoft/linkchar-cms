import type es from '../es/shell'
import type { CatalogType } from '../types'

const shell = {
  nav: {
    overview: 'Overview',
    pages: 'Pages',
    media: 'Media',
    users: 'Users',
    activity: 'Activity',
    trash: 'Trash',
    groups: {
      content: 'Content',
      site: 'Site',
      admin: 'Administration'
    }
  },
  shell: {
    brandTag: 'Panel',
    tagline: 'Content panel',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    sections: 'Panel sections',
    viewSite: 'View site',
    viewSiteNewTab: 'View site (opens in a new tab)',
    account: 'My account',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    someone: 'User',
    publish: 'Publish',
    pendingChanges: { one: '{count} pending change', other: '{count} pending changes' },
    incompleteChanges: { one: '{count} incomplete change: it stays out until it is filled in', other: '{count} incomplete changes: they stay out until they are filled in' },
    loading: 'Loading…'
  }
} satisfies CatalogType<typeof es>

export default shell
