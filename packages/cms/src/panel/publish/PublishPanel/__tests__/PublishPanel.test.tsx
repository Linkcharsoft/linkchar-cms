import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../../__tests__/render'
import PublishPanel from '../PublishPanel'
import type { PendingChangeType, PublishRecordType } from '../../../../server/publish'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

const change = (overrides: Partial<PendingChangeType>): PendingChangeType => ({
  id: 'a',
  entryId: 'posts',
  entryLabel: 'Posts',
  title: 'Hola',
  href: '/dashboard/colecciones/posts/a',
  action: 'publish',
  status: 'new',
  revision: 1,
  updatedAt: '2026-10-01T12:00:00Z',
  updatedBy: null,
  missing: [],
  problems: [],
  urls: {},
  urlChanges: [],
  sections: [],
  warnings: [],
  ...overrides
})

const missingTitle = { path: 'title.es', locale: 'es', kind: 'field' as const, label: 'Título', href: '/dashboard/colecciones/posts/b#title' }

const record: PublishRecordType = {
  id: 1,
  requestedAt: '2026-10-01T12:00:00Z',
  requestedBy: 'Ana',
  published: 2,
  removed: 0,
  buildStatus: 'failed',
  finishedAt: '2026-10-01T12:05:00Z',
  errorCode: 'hook_refused',
  errorDetail: 'HTTP 403',
  retryOf: null,
  items: [{ id: 'a', title: null, action: 'publish' }]
}

afterEach(cleanup)

describe('PublishPanel', () => {
  it('counts only complete changes and leaves incomplete ones out', () => {
    renderPanel(<PublishPanel
      changes={[change({ id: 'a' }), change({ id: 'b', status: 'changed', problems: ['Título'], missing: [missingTitle] })]}
      history={[]}
      canPublish
    />)
    expect(screen.getByText('1 cambio listo para publicar · 1 incompleto.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Publicar cambios \(1\)/ })).toBeTruthy()
    expect(screen.getByText((_, element) => element?.textContent === 'No se publica hasta completar: Título.' && element.tagName === 'SPAN')).toBeTruthy()
  })

  it('links each missing field to the editor in its language, once per label', () => {
    const english = { path: 'title.en', locale: 'en', kind: 'field' as const, label: 'Título (Inglés)', href: '/dashboard/colecciones/posts/b?locale=en#title' }
    renderPanel(<PublishPanel
      changes={[change({ id: 'b', problems: ['Título', 'Título (Inglés)'], missing: [missingTitle, english, { ...english, path: 'title.en.0' }] })]}
      history={[]}
      canPublish
    />)
    expect(screen.getByRole('link', { name: 'Título (Inglés)' }).getAttribute('href')).toBe('/dashboard/colecciones/posts/b?locale=en#title')
    expect(screen.getAllByRole('link', { name: /^Título/ })).toHaveLength(2)
  })

  it('disables publishing without permission', () => {
    renderPanel(<PublishPanel changes={[change({})]} history={[]} canPublish={false} />)
    expect(screen.getByRole('button', { name: /Publicar cambios/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/puede editar pero no publicar/)).toBeTruthy()
  })

  it('shows build errors by code with their detail', () => {
    renderPanel(<PublishPanel changes={[]} history={[record]} canPublish />)
    expect(screen.getByText('Todo lo que está en el panel ya está en el sitio.')).toBeTruthy()
    expect(screen.getByText('Motivo: El servicio que actualiza el sitio rechazó el pedido.')).toBeTruthy()
    expect(screen.getByText('Detalle técnico: HTTP 403')).toBeTruthy()
    expect(screen.getByText('Contenido eliminado')).toBeTruthy()
  })

  it('retries the latest failed publish', async () => {
    const retryPublish = vi.fn(async () => ({ ok: true as const, published: 0, removed: 0, buildStatus: 'building' as const }))
    const older = { ...record, id: 0, requestedAt: '2026-09-30T12:00:00Z' }
    renderPanel(<PublishPanel changes={[]} history={[record, older]} canPublish />, { actions: { retryPublish } as never })

    const buttons = screen.getAllByRole('button', { name: 'Reintentar' })
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    await waitFor(() => expect(retryPublish).toHaveBeenCalledWith(1))
  })

  it('offers no retry without permission, and marks a retry in the history', () => {
    renderPanel(<PublishPanel changes={[]} history={[{ ...record, id: 2, retryOf: 1 }]} canPublish={false} />)
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
    expect(screen.getByText('Reintento')).toBeTruthy()
  })
})
