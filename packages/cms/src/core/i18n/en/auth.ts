import type es from '../es/auth'
import type { CatalogType } from '../types'

const auth = {
  auth: {
    email: 'Email',
    password: 'Password',
    newPassword: 'New password',
    confirmPassword: 'Repeat the password',
    fullName: 'Full name',
    passwordRules: 'At least {min} characters, with letters and numbers.',
    backToLogin: 'Back to sign in',
    login: {
      title: 'Sign in',
      subtitle: 'Use the email and password of your user.',
      submit: 'Sign in',
      forgot: 'I forgot my password'
    },
    urlErrors: {
      inactivo: 'Your user is deactivated. Contact an administrator.',
      sesion: 'Your session ended. Sign in again.',
      'link-invalido': 'The link is not valid. Ask for a new one.',
      'link-vencido': 'The link expired or was already used. Ask for a new one.'
    },
    recovery: {
      title: 'Recover your password',
      subtitle: 'Enter your email and we will send you a link to choose a new password.',
      sent: 'If the email has a user in the panel, a link arrives in a few minutes. Check the spam folder too.',
      submit: 'Send link'
    },
    reset: {
      title: 'Choose a new password',
      subtitle: 'Use at least {min} characters, with letters and numbers.',
      submit: 'Save password'
    },
    confirm: {
      title: 'Confirm the link',
      submit: 'Continue',
      invite: {
        title: 'Your invitation to the panel',
        subtitle: 'Press the button to create your user. The link is used only then, so it is not spent if your mail opens it first.'
      },
      recovery: {
        title: 'Change your password',
        subtitle: 'Press the button to choose a new password. The link is used only then, so it is not spent if your mail opens it first.'
      }
    },
    invite: {
      title: 'Welcome',
      subtitle: 'To finish creating your user, tell us your name and choose a password.',
      email: 'Your user',
      submit: 'Create my user'
    },
    mfa: {
      title: 'Two-step verification',
      subtitle: 'Open the authenticator app on your phone and enter the 6-digit code.',
      device: 'Phone',
      code: 'Code',
      submit: 'Verify',
      otherAccount: 'Use another account',
      lostDevice: 'I do not have the phone',
      lostDeviceHelp: 'Ask an administrator to reset your two-step verification from Users: you will be able to sign in with the password alone and set it up again with another phone.',
      rateLimit: 'Too many attempts. Wait a few minutes.',
      wrongCode: 'The code is wrong or expired. Try the one the app shows now.'
    }
  }
} satisfies CatalogType<typeof es>

export default auth
