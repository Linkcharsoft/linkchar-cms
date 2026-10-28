import type es from '../es/status'
import type { CatalogType } from '../types'

const status = {
  documentStatus: {
    hidden: 'Hidden',
    new: 'Ready to publish',
    incomplete: 'Incomplete',
    published: 'Published',
    changed: 'Unpublished changes',
    unpublishing: 'Removed on publish'
  },
  publishStatus: {
    building: 'Publishing',
    buildingStarted: 'Publishing · just started',
    buildingFor: 'Publishing · {minutes} min ago',
    success: 'Done',
    failed: 'Error',
    unconfirmed: 'Unconfirmed'
  },
  publishStatusHelp: {
    building: 'The site is updating. It usually takes about 5 minutes.',
    success: 'The site already shows these changes.',
    failed: 'The site could not be updated and still shows the previous version. Retry from Publish; if it fails again, contact support.',
    unconfirmed: 'We did not get confirmation that the site was updated. Check the site: if you don\'t see the changes, contact support.'
  },
  roles: {
    editor: 'Editor',
    admin: 'Administrator',
    superadmin: 'Superadmin'
  },
  roleHelp: {
    editor: 'Edits content. Publishes only if you allow it.',
    admin: 'Edits, publishes, sees the activity and manages users.',
    superadmin: 'Everything, including technical settings. Only for the team that maintains the site.'
  },
  userStatus: {
    active: 'Active',
    invited: 'Invitation pending',
    inactive: 'Deactivated'
  }
} satisfies CatalogType<typeof es>

export default status
