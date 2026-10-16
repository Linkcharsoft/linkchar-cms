import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../../__tests__/render'
import PublishPanel from '../PublishPanel'
import type { PendingChangeType, PublishRecordType } from '../../../../server/publish'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

const change = (overrides: Partial<PendingChangeType>): PendingChangeType => ({
  id: 'a',
  entryLabel: 'Posts',
  title: 'Hola',
  href: '/dashboard/colecciones/posts/a',
  action: 'publish',
  status: 'new',
  revision: 1,
  updatedAt: '2026-10-01T12:00:00Z',
  updatedBy: null,
  problems: [],
  redirectPrefix: null,
  urlChange: null,
  sections: [],
  warnings: [],
  ...overrides
})

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
  items: [{ id: 'a', title: null, action: 'publish' }]
}

afterEach(cleanup)

describe('PublishPanel', () => {
  it('counts only complete changes and leaves incomplete ones out', () => {
    renderPanel(<PublishPanel
      changes={[change({ id: 'a' }), change({ id: 'b', status: 'changed', problems: ['Título'] })]}
      history={[]}
      canPublish
    />)
    expect(screen.getByText('1 cambio listo para publicar · 1 incompleto.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Publicar cambios \(1\)/ })).toBeTruthy()
    expect(screen.getByText('No se publica hasta completar: Título.')).toBeTruthy()
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
})
