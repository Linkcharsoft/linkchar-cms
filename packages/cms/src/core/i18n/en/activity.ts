import type es from '../es/activity'
import type { CatalogType } from '../types'

const activity = {
  activity: {
    groups: {
      content: 'Content',
      publishing: 'Publishing',
      media: 'Media',
      users: 'Users',
      account: 'Account and access'
    },
    actions: {
      document: {
        create: 'Created',
        duplicate: 'Duplicated',
        trash: 'Moved to the trash',
        untrash: 'Recovered from the trash',
        purge: 'Deleted permanently',
        restore: 'Restored a previous version of',
        discard: 'Discarded the changes of',
        show: 'Marked to show on the site',
        hide: 'Marked to hide from the site'
      },
      site: {
        publish: 'Published changes to the site',
        retry: 'Retried the site update'
      },
      media: {
        upload: 'Uploaded a file',
        trash: 'Moved a file to the trash',
        purge: 'Deleted a file permanently'
      },
      user: {
        invite: 'Invited',
        invite_resend: 'Resent the invitation to',
        invite_delete: 'Deleted the invitation of',
        update: 'Changed the role or permissions of',
        deactivate: 'Deactivated',
        reactivate: 'Reactivated',
        mfa_reset: 'Reset the two-step verification of'
      },
      auth: {
        login: 'Signed in to the panel',
        password_change: 'Changed their password',
        mfa_enroll: 'Added a phone for two-step verification',
        mfa_unenroll: 'Removed a phone from two-step verification'
      },
      profile: {
        update: 'Updated their profile'
      }
    },
    detail: {
      published: { one: '{count} published', other: '{count} published' },
      removed: { one: '{count} unpublished', other: '{count} unpublished' },
      redirects: { one: '{count} redirect', other: '{count} redirects' },
      withMfa: 'With two-step verification',
      name: 'Name: {name}',
      photoChanged: 'Changed their photo',
      photoRemoved: 'Removed their photo'
    },
    deleted: '(deleted)'
  }
} satisfies CatalogType<typeof es>

export default activity
