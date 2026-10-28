import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('shows a wrong current password on its field, and re-checks a field while typing after a failed submit', async () => {
    const changePassword = vi.fn(async () => ({ error: 'errors.account.wrongPassword' as const }))
    renderPanel(<PasswordForm email='ana@acme.test' />, { actions: { changePassword } as never })
    expect(document.querySelector('input[name=username]')?.getAttribute('value')).toBe('ana@acme.test')

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByText('Ingresá tu contraseña actual')).toBeTruthy()
    fireEvent.change(document.getElementById('currentPassword')!, { target: { value: 'vieja-1234' } })
    await waitFor(() => expect(screen.queryByText('Ingresá tu contraseña actual')).toBeNull())

    fireEvent.change(document.getElementById('password')!, { target: { value: 'NuevaClave2026' } })
    fireEvent.change(document.getElementById('confirmPassword')!, { target: { value: 'NuevaClave2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    await waitFor(() => expect(changePassword).toHaveBeenCalled())
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
    expect(document.activeElement?.id).toBe('currentPassword')
  })
})
