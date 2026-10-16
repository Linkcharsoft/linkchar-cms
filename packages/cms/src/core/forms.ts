import { isRole } from './roles'
import { msg } from './text'
import type { RoleType } from './roles'
import type { MessageRefType } from './text'

// Mirrors supabase/config.toml: minimum_password_length = 10, password_requirements = "letters_digits".
export const PASSWORD_MIN_LENGTH = 10
export const NAME_MAX_LENGTH = 80

export type FormErrorsType<T> = Partial<Record<keyof T, MessageRefType>>

// Server actions are public endpoints, so they run the same checks the form ran in the browser.
export type FormResultType<T> = { value: T, errors: null } | { value: null, errors: FormErrorsType<T> }

type DataRecord = Record<string, unknown>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const asRecord = (values: unknown): DataRecord => (typeof values === 'object' && values !== null ? values as DataRecord : {})

const str = (value: unknown) => (typeof value === 'string' ? value : '')

type CheckType = (value: unknown, values: DataRecord) => MessageRefType | null

const form = <T>(checks: { [K in keyof T]: CheckType }, read: (values: DataRecord) => T) => (input: unknown): FormResultType<T> => {
  const values = asRecord(input)
  const errors: FormErrorsType<T> = {}
  for (const key of Object.keys(checks) as (keyof T)[]) {
    const problem = checks[key](values[key as string], values)
    if (problem) errors[key] = problem
  }
  return Object.keys(errors).length > 0 ? { value: null, errors } : { value: read(values), errors: null }
}

const email: CheckType = value => {
  const text = str(value).trim()
  if (!text) return msg('forms.emailRequired')
  return EMAIL.test(text) ? null : msg('forms.emailInvalid')
}

const requiredText = (key: 'forms.passwordRequired' | 'forms.currentPasswordRequired'): CheckType => value => (str(value) ? null : msg(key))

const newPassword: CheckType = value => {
  const text = str(value)
  if (!text) return msg('forms.newPasswordRequired')
  if (text.length < PASSWORD_MIN_LENGTH) return msg('forms.passwordLength', { min: PASSWORD_MIN_LENGTH })
  if (!/[a-zA-Z]/.test(text)) return msg('forms.passwordLetter')
  if (!/\d/.test(text)) return msg('forms.passwordDigit')
  return null
}

const confirmPassword: CheckType = (value, values) => {
  if (!str(value)) return msg('forms.confirmRequired')
  return value === values.password ? null : msg('forms.confirmMismatch')
}

const name: CheckType = value => {
  const text = str(value).trim()
  if (!text) return msg('forms.nameRequired')
  return text.length > NAME_MAX_LENGTH ? msg('forms.nameLength', { max: NAME_MAX_LENGTH }) : null
}

const role: CheckType = value => (isRole(value) ? null : msg('forms.roleRequired'))

const flag: CheckType = value => (typeof value === 'boolean' ? null : msg('errors.invalidData'))

export interface LoginFormType { email: string, password: string }
export const validateLogin = form<LoginFormType>(
  { email, password: requiredText('forms.passwordRequired') },
  values => ({ email: str(values.email).trim(), password: str(values.password) })
)

export interface PasswordRecoveryFormType { email: string }
export const validatePasswordRecovery = form<PasswordRecoveryFormType>({ email }, values => ({ email: str(values.email).trim() }))

export interface PasswordResetFormType { password: string, confirmPassword: string }
export const validatePasswordReset = form<PasswordResetFormType>(
  { password: newPassword, confirmPassword },
  values => ({ password: str(values.password), confirmPassword: str(values.confirmPassword) })
)

export interface AcceptInviteFormType { name: string, password: string, confirmPassword: string }
export const validateAcceptInvite = form<AcceptInviteFormType>(
  { name, password: newPassword, confirmPassword },
  values => ({ name: str(values.name).trim(), password: str(values.password), confirmPassword: str(values.confirmPassword) })
)

export interface ProfileFormType { name: string }
export const validateProfile = form<ProfileFormType>({ name }, values => ({ name: str(values.name).trim() }))

export interface ChangePasswordFormType { currentPassword: string, password: string, confirmPassword: string, signOutOthers: boolean }
export const validateChangePassword = form<ChangePasswordFormType>(
  { currentPassword: requiredText('forms.currentPasswordRequired'), password: newPassword, confirmPassword, signOutOthers: flag },
  values => ({
    currentPassword: str(values.currentPassword),
    password: str(values.password),
    confirmPassword: str(values.confirmPassword),
    signOutOthers: values.signOutOthers === true
  })
)

export interface MfaCodeFormType { factorId: string, code: string }
export const validateMfaCode = form<MfaCodeFormType>(
  {
    factorId: value => (str(value) ? null : msg('forms.deviceRequired')),
    code: value => {
      const text = str(value).trim()
      if (!text) return msg('forms.codeRequired')
      return /^\d{6}$/.test(text) ? null : msg('forms.codeFormat')
    }
  },
  values => ({ factorId: str(values.factorId), code: str(values.code).trim() })
)

export interface UserAccessFormType { role: RoleType, canPublish: boolean }
export const validateUserAccess = form<UserAccessFormType>(
  { role, canPublish: flag },
  values => ({ role: values.role as RoleType, canPublish: values.canPublish === true })
)

export interface InviteUserFormType extends UserAccessFormType { email: string, name: string }
export const validateInviteUser = form<InviteUserFormType>(
  { email, name, role, canPublish: flag },
  values => ({ email: str(values.email).trim().toLowerCase(), name: str(values.name).trim(), role: values.role as RoleType, canPublish: values.canPublish === true })
)
