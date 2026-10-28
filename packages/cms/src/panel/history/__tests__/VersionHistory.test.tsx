import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import VersionHistory from '../VersionHistory/VersionHistory'
import type { VersionItemType } from '../../../server/versions'

const versions: VersionItemType[] = [
  { id: 'v3', reason: 'checkpoint', createdAt: '2026-10-20T15:00:00Z', createdBy: 'Ana' },
  { id: 'v2', reason: 'publish', createdAt: '2026-10-20T12:30:00Z', createdBy: 'Ana' },
  { id: 'v1', reason: 'conflict', createdAt: '2026-09-30T18:00:00Z', createdBy: null }
]

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-10-20T18:00:00Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

type ListVersionsType = (entryId: string, documentId: string, before?: string) => Promise<{ items: VersionItemType[], more: boolean }>

const open = async (getVersionDiff = vi.fn(async () => []), listVersions: ListVersionsType = async () => ({ items: versions, more: false })) => {
  renderPanel(
    <VersionHistory entryId='posts' documentId='d1' canDiscard={false} replace={async () => true} flush={async () => undefined} />,
    { actions: { listVersions, getVersionDiff } as never }
  )
  fireEvent.click(screen.getByRole('button', { name: 'Historial' }))
  await screen.findByText('Hoy')
  return getVersionDiff
}

describe('VersionHistory', () => {
  it('groups the versions by day in the site time zone, newest day first', async () => {
    await open()
    expect(screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)).toEqual(['Hoy', '30 de septiembre de 2026'])
    expect(screen.getAllByText(/Guardado automático|Versión publicada|Versión no guardada por un conflicto/)).toHaveLength(3)
    expect(screen.getByText('12:00 · Ana')).toBeTruthy()
    expect(screen.getByText('15:00')).toBeTruthy()
  })

  it('loads older versions on demand, from the last date shown', async () => {
    const older: VersionItemType = { id: 'v0', reason: 'checkpoint', createdAt: '2026-09-01T10:00:00Z', createdBy: null }
    const listVersions = vi.fn<ListVersionsType>(async (_entry, _id, before) => (before ? { items: [older], more: false } : { items: versions, more: true }))
    await open(undefined, listVersions)
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
    await screen.findByText('1 de septiembre de 2026')
    expect(listVersions).toHaveBeenLastCalledWith('posts', 'd1', '2026-09-30T18:00:00Z')
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull()
  })

  it('says when the history could not be loaded and retries', async () => {
    const listVersions = vi.fn<() => Promise<{ items: VersionItemType[], more: boolean }>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ items: versions, more: false })
    renderPanel(
      <VersionHistory entryId='posts' documentId='d1' canDiscard={false} replace={async () => true} flush={async () => undefined} />,
      { actions: { listVersions } as never }
    )
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }))
    await screen.findByText('No pudimos cargar el historial.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByText('Hoy')
  })

  it('compares a version with the draft on demand', async () => {
    const getVersionDiff = await open()
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver cambios' })[1])
    expect(await screen.findByText('Es igual al borrador actual.')).toBeTruthy()
    expect(getVersionDiff).toHaveBeenCalledWith('posts', 'd1', 'v2')
  })
})
