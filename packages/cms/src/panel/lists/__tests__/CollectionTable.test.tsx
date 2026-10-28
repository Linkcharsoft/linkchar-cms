import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import CollectionTable from '../CollectionTable/CollectionTable'
import type { ActionResultType } from '../../../server/collections'
import type { CollectionItemType } from '../../../server/documents'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push }),
  usePathname: () => '/dashboard/colecciones/team',
  useSearchParams: () => new URLSearchParams()
}))

afterEach(() => {
  cleanup()
  push.mockClear()
})

const item = (n: number, title: string): CollectionItemType => ({
  id: `t${n}`, entryId: 'team', href: `/dashboard/colecciones/team/t${n}`, title, slug: null, status: 'published', visible: true, sortOrder: n, updatedAt: '2026-10-01T12:00:00Z'
})

const items = [item(1, 'Ana'), item(2, 'Bruno'), item(3, 'Carla')]

const table = (overrides: Partial<Parameters<typeof CollectionTable>[0]> = {}, reorderCollection = vi.fn(async (): Promise<ActionResultType> => ({ ok: true }))) => {
  renderPanel(
    <CollectionTable entryId='team' singularLabel='Integrante' orderable items={items} total={3} page={1} pageSize={100} sort='manual' search='' status={null} {...overrides} />,
    { actions: { reorderCollection } as never }
  )
  return reorderCollection
}

const titles = () => screen.getAllByRole('link', { name: /Ana|Bruno|Carla/ }).map(link => link.textContent)

describe('CollectionTable', () => {
  it('moves an item with the keyboard buttons and saves the whole page order', async () => {
    const reorderCollection = table()
    expect(screen.getByRole('button', { name: 'Subir Ana' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Ana' }))
    expect(titles()).toEqual(['Bruno', 'Ana', 'Carla'])
    await waitFor(() => expect(reorderCollection).toHaveBeenCalledWith('team', ['t2', 't1', 't3'], 0))
  })

  it('goes back to the previous order when the server refuses', async () => {
    table({}, vi.fn(async (): Promise<ActionResultType> => ({ ok: false, error: 'errors.documents.updateFailed' })))
    fireEvent.click(screen.getByRole('button', { name: 'Subir Carla' }))
    expect(titles()).toEqual(['Ana', 'Carla', 'Bruno'])
    await waitFor(() => expect(titles()).toEqual(['Ana', 'Bruno', 'Carla']))
  })

  it('explains why there is no handle while the list is filtered, and offers the way back', () => {
    table({ search: 'an' })
    expect(screen.queryByRole('button', { name: 'Bajar Ana' })).toBeNull()
    expect(screen.getByText(/Para reordenar, quitá la búsqueda/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver en orden manual' }))
    expect(push).toHaveBeenCalledWith('/dashboard/colecciones/team')
  })

  it('says the order only covers this page when there are more', () => {
    table({ total: 250 })
    expect(screen.getByText('Se reordena dentro de esta página; las demás conservan su orden.')).toBeTruthy()
  })
})
