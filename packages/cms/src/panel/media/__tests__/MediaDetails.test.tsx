import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import MediaDetails from '../MediaDetails/MediaDetails'
import type { MediaItemType } from '../../../core/media'
import type { MediaUsageType } from '../../../server/media'

const item: MediaItemType = {
  id: '00000000-0000-4000-8000-000000000001', path: '1.pdf', url: 'http://127.0.0.1:54421/1.pdf', filename: 'ficha.pdf', folder: 'sitio',
  alt: { es: 'Ficha' }, caption: {}, mime: 'application/pdf', size: 10, width: null, height: null, focalX: null, focalY: null, blurDataUrl: null,
  duration: null, posterId: null, posterUrl: null,
  createdAt: '2026-10-01T12:00:00Z', deletedAt: null
}

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => { resolve = res })
  return { promise, resolve }
}

afterEach(cleanup)

const trashButton = () => screen.getByRole('button', { name: 'Papelera' }) as HTMLButtonElement

describe('MediaDetails', () => {
  it('says when it could not find out where the file is used, and lets the server decide about the trash', async () => {
    const getMediaUsage = vi.fn<() => Promise<MediaUsageType[]>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    renderPanel(<MediaDetails item={item} canPurge onChanged={vi.fn()} onRemoved={vi.fn()} onHide={vi.fn()} />, { actions: { getMediaUsage } as never })
    expect(await screen.findByText('No pudimos ver dónde se usa.')).toBeTruthy()
    expect(trashButton().disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No se usa en ningún contenido.')).toBeTruthy()
  })

  it('locks the trash button while the move is in flight', async () => {
    const move = deferred<{ ok: true }>()
    const onRemoved = vi.fn()
    renderPanel(
      <MediaDetails item={item} canPurge={false} onChanged={vi.fn()} onRemoved={onRemoved} onHide={vi.fn()} />,
      { actions: { getMediaUsage: async () => [], trashMedia: () => move.promise } as never }
    )
    await waitFor(() => expect(trashButton().disabled).toBe(false))
    fireEvent.click(trashButton())
    expect(trashButton().disabled).toBe(true)
    await act(async () => move.resolve({ ok: true }))
    expect(onRemoved).toHaveBeenCalledWith(item.id)
  })
})
