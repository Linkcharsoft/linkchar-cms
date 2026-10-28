import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../../__tests__/render'
import PublishPanel from '../PublishPanel'
import type { PendingChangeType, PublishRecordType } from '../../../../server/publish'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
// The confirmation dialog lives in the panel providers; here accepting is immediate.
vi.mock('../../../primitives/ConfirmAction/ConfirmAction', () => ({ useConfirm: () => ({ accept }: { accept: () => void }) => accept() }))

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
  pendingRefs: [],
  fixedUsers: [],
  urlConflicts: [],
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

  it('holds the publish button while the previous build runs', () => {
    const building = { ...record, buildStatus: 'building' as const, requestedAt: new Date(Date.now() - 3 * 60_000).toISOString(), errorCode: null, errorDetail: null }
    renderPanel(<PublishPanel changes={[change({})]} history={[building]} canPublish />)
    expect(screen.getByRole('button', { name: /Publicar cambios/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('hace 3 minutos')
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

  it('publishes only the ticked changes and shows what leaving one out means', async () => {
    const publishChanges = vi.fn(async () => ({ ok: true as const, published: 1, removed: 0, buildStatus: 'building' as const }))
    renderPanel(<PublishPanel
      changes={[
        change({ id: 'a', title: 'Casa', pendingRefs: [{ id: 'c', name: '"Reseñas" (categoría)' }] }),
        change({ id: 'c', title: 'Reseñas', entryLabel: 'Categorías' }),
        change({ id: 'b', title: 'Rota', status: 'changed', problems: ['Título'], missing: [missingTitle] })
      ]}
      history={[]}
      canPublish
    />, { actions: { publishChanges } as never })

    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Publicar cambios \(2\)/ })).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Incluir "Reseñas" en esta publicación'))
    expect(screen.getByRole('button', { name: /Publicar cambios \(1\)/ })).toBeTruthy()
    expect(screen.getByText('"Reseñas" (categoría) no está marcado para publicar: no va a aparecer en el sitio.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Publicar cambios \(1\)/ }))
    await waitFor(() => expect(publishChanges).toHaveBeenCalledWith({ publish: [{ id: 'a', revision: 1 }], remove: [] }))
  })

  it('keeps a change whose URL is live on another document out, and points at both after a failed publish', async () => {
    const stuck = { locale: 'es', path: '/blog/casa', takenBy: { id: 'live', name: 'Casa vieja' }, freed: false }
    const publishChanges = vi.fn(async () => ({ ok: false as const, error: 'errors.publish.slugTaken' as const, conflicts: [{ id: 'b', takenBy: 'c' }] }))
    renderPanel(<PublishPanel
      changes={[change({ id: 'a', title: 'Casa', urlConflicts: [stuck] }), change({ id: 'b', title: 'Loft' }), change({ id: 'c', title: 'Loft viejo', status: 'changed' })]}
      history={[]}
      canPublish
    />, { actions: { publishChanges } as never })
    expect(screen.getByText('La URL /blog/casa la usa "Casa vieja" en el sitio. Cambiá la URL de uno de los dos.')).toBeTruthy()
    expect(screen.queryByLabelText('Incluir "Casa" en esta publicación')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Publicar cambios \(2\)/ }))
    await waitFor(() => expect(publishChanges).toHaveBeenCalled())
    await waitFor(() => expect(document.querySelectorAll('.PublishPanel__Item--Conflict')).toHaveLength(2))
  })

  it('needs at least one ticked change', () => {
    renderPanel(<PublishPanel changes={[change({ id: 'a', title: 'Casa' })]} history={[]} canPublish />)
    fireEvent.click(screen.getByLabelText('Incluir "Casa" en esta publicación'))
    expect(screen.getByRole('button', { name: /Publicar cambios/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Marcá al menos un cambio para publicar.')).toBeTruthy()
  })

  it('offers no retry without permission, and marks a retry in the history', () => {
    renderPanel(<PublishPanel changes={[]} history={[{ ...record, id: 2, retryOf: 1 }]} canPublish={false} />)
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
    expect(screen.getByText('Reintento')).toBeTruthy()
  })

  it('offers the retry for an unconfirmed build but not when no target is configured', () => {
    const unconfirmed = { ...record, buildStatus: 'building' as const, requestedAt: new Date(Date.now() - 45 * 60_000).toISOString(), errorCode: null, errorDetail: null }
    renderPanel(<PublishPanel changes={[]} history={[unconfirmed]} canPublish activityHref='/dashboard/actividad?accion=publishing' />)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
    expect(screen.getByText('Sin confirmar')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver todas en Actividad' }).getAttribute('href')).toBe('/dashboard/actividad?accion=publishing')
    cleanup()

    renderPanel(<PublishPanel changes={[]} history={[{ ...record, errorCode: 'target_missing' }]} canPublish />)
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
    cleanup()

    const building = { ...unconfirmed, requestedAt: new Date(Date.now() - 7 * 60_000).toISOString() }
    renderPanel(<PublishPanel changes={[]} history={[building]} canPublish />)
    expect(screen.getByText('Publicando · hace 7 min')).toBeTruthy()
  })
})
