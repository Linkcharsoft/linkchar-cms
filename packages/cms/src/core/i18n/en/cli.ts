import type es from '../es/cli'
import type { CatalogType } from '../types'

const cli = {
  emails: {
    invite: {
      subject: 'You are invited to the content panel',
      title: 'You are invited to the content panel',
      body: 'To create your user, choose your password from this link:',
      action: 'Create my user',
      ignore: 'If you did not expect this invitation, ignore this email.'
    },
    recovery: {
      subject: 'Choose a new password',
      title: 'Choose a new password',
      body: 'You asked to recover your password for the content panel. Use this link to choose a new one:',
      action: 'Choose a new password',
      ignore: 'If it was not you, ignore this email: your password stays the same.'
    }
  }
} satisfies CatalogType<typeof es>

export default cli
