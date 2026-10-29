import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import ConfirmLinkPage from '../ConfirmLinkPage/ConfirmLinkPage'
import type { CmsActionsType } from '../../client/context'

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const renderPage = (confirmLink: CmsActionsType['confirmLink']) =>
  renderPanel(<ConfirmLinkPage tokenHash='abc' type='invite' target='/dashboard/invitacion' />, { actions: { confirmLink } as unknown as CmsActionsType })

describe('ConfirmLinkPage', () => {
  afterEach(cleanup)

  it('spends the token only when the person presses the button', async () => {
    const confirmLink = vi.fn(async () => ({ redirectTo: '/dashboard/invitacion' }))
    renderPage(confirmLink)
    expect(screen.getByRole('heading', { name: 'Tu invitación al panel' })).toBeTruthy()
    expect(confirmLink).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard/invitacion'))
    expect(confirmLink).toHaveBeenCalledWith({ tokenHash: 'abc', type: 'invite' })
  })

  it('shows why a link no longer works and keeps the way back to sign in', async () => {
    renderPage(vi.fn(async () => ({ error: 'auth.urlErrors.link-vencido' as const })))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('El link venció o ya fue usado. Pedí uno nuevo.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' }).getAttribute('href')).toBe('/dashboard/login')
  })
})
