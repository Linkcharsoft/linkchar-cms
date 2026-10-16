import { describe, expect, it } from 'vitest'
import {
  validateAcceptInvite,
  validateChangePassword,
  validateInviteUser,
  validateLogin,
  validateMfaCode,
  validateProfile,
  validateUserAccess
} from '../forms'
import { createTranslator } from '../i18n/translator'
import { resolveText } from '../text'
import type { FormErrorsType } from '../forms'

const ctx = { locale: 'es', defaultLocale: 'es', translator: createTranslator({ locale: 'es' }) }

const messages = <T>(errors: FormErrorsType<T> | null) =>
  Object.fromEntries(Object.entries(errors ?? {}).map(([key, ref]) => [key, resolveText(ref as Parameters<typeof resolveText>[0], ctx)]))

describe('form validators', () => {
  it('cleans what they accept', () => {
    expect(validateLogin({ email: ' ana@estudio.com ', password: 'x' })).toEqual({ value: { email: 'ana@estudio.com', password: 'x' }, errors: null })
    expect(validateInviteUser({ email: 'Ana@Estudio.com', name: ' Ana ', role: 'editor', canPublish: true }).value)
      .toEqual({ email: 'ana@estudio.com', name: 'Ana', role: 'editor', canPublish: true })
  })

  it('reports catalog messages per field', () => {
    expect(messages(validateLogin({ email: 'ana', password: '' }).errors)).toEqual({ email: 'Ingresá un email válido', password: 'Ingresá tu contraseña' })
    expect(messages(validateProfile({ name: 'x'.repeat(81) }).errors)).toEqual({ name: 'Usá hasta 80 caracteres' })
    expect(messages(validateMfaCode({ factorId: '', code: '12a' }).errors)).toEqual({ factorId: 'Elegí un celular', code: 'El código tiene 6 números' })
  })

  it('asks for the password policy Supabase enforces', () => {
    const check = (password: string) => messages(validateAcceptInvite({ name: 'Ana', password, confirmPassword: password }).errors).password
    expect(check('corta1')).toBe('Usá al menos 10 caracteres')
    expect(check('1234567890')).toBe('Incluí al menos una letra')
    expect(check('sololetras')).toBe('Incluí al menos un número')
    expect(check('letras12345')).toBeUndefined()
  })

  it('needs both passwords to match', () => {
    const result = validateChangePassword({ currentPassword: 'vieja', password: 'nueva12345', confirmPassword: 'otra12345', signOutOthers: false })
    expect(messages(result.errors)).toEqual({ confirmPassword: 'Las contraseñas no coinciden' })
  })

  it('accepts only known roles and real flags', () => {
    expect(messages(validateUserAccess({ role: 'owner', canPublish: 'yes' }).errors)).toEqual({ role: 'Elegí un rol', canPublish: 'Revisá los datos ingresados.' })
    expect(validateUserAccess(null).value).toBeNull()
  })
})
