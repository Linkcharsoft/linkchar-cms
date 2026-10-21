import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import PasswordForm from '../PasswordForm/PasswordForm'

afterEach(cleanup)

describe('PasswordForm', () => {
  it('states the password rules under the new password, and nowhere else', () => {
    renderPanel(<PasswordForm />)
    expect(screen.getByText('Al menos 10 caracteres, con letras y números.').id).toBe('password-help')
    expect(document.getElementById('password')?.getAttribute('aria-describedby')).toBe('password-help')
    expect(document.getElementById('currentPassword')?.getAttribute('aria-describedby')).toBeNull()
    expect(document.getElementById('confirmPassword')?.getAttribute('aria-describedby')).toBeNull()
  })
})
