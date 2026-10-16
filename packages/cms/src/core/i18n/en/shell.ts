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
    accountOf: 'Account of {name}',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    someone: 'User',
    publish: 'Publish',
    pendingChanges: { one: '{count} pending change', other: '{count} pending changes' },
    loading: 'Loading…'
  }
} satisfies CatalogType<typeof es>

export default shell
