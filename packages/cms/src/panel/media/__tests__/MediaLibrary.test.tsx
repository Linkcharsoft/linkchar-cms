import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import MediaLibrary from '../MediaLibrary/MediaLibrary'
import type { MediaItemType } from '../../../core/media'

vi.mock('../MediaUploader/MediaUploader', () => ({
  default: ({ onUploaded }: { onUploaded: (items: MediaItemType[], remaining: number) => void }) => (
    <button type='button' onClick={() => onUploaded([media(9)], 1)}>finish upload</button>
  )
}))

const media = (n: number): MediaItemType => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, path: `${n}.webp`, url: `http://127.0.0.1:54421/${n}.webp`, filename: `foto-${n}.webp`, folder: 'sitio',
  alt: { es: `Foto ${n}` }, caption: {}, mime: 'image/webp', size: 10, width: 800, height: 600, focalX: null, focalY: null, blurDataUrl: null,
  createdAt: '2026-10-01T12:00:00Z', deletedAt: null
})

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

type ResultType = { items: MediaItemType[], total: number, page: number }

const observers: { callback: IntersectionObserverCallback, element: Element | null }[] = []

class FakeObserver {
  element: Element | null = null
  constructor (readonly callback: IntersectionObserverCallback) {
    observers.push(this)
  }

  observe (element: Element) {
    this.element = element
  }

  disconnect () {}
}

beforeEach(() => {
  observers.length = 0
  vi.stubGlobal('IntersectionObserver', FakeObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Toggling the trash changes the query, which starts a new search.
const toggleTrash = () => fireEvent.click(screen.getByRole('button', { name: /Papelera|Volver a la librer/ }))

describe('MediaLibrary', () => {
  it('shows a skeleton while the picker loads for the first time', async () => {
    const first = deferred<ResultType>()
    const { container } = renderPanel(<MediaLibrary mode='pick' accept='image' />, { actions: { searchMedia: () => first.promise } as never })
    expect(container.querySelector('.MediaLibrary__Skeleton')).toBeTruthy()
    expect(screen.queryByText('No hay archivos que coincidan.')).toBeNull()
    await act(async () => first.resolve({ items: [], total: 0, page: 1 }))
    expect(container.querySelector('.MediaLibrary__Skeleton')).toBeNull()
    expect(screen.getByText('No hay archivos que coincidan.')).toBeTruthy()
  })

  it('announces how many files matched, outside the grid', async () => {
    renderPanel(<MediaLibrary mode='manage' initialItems={[media(1), media(2)]} initialTotal={2} />)
    const live = document.querySelector('[aria-live=polite]')!
    expect(live.textContent).toBe('2 archivos')
    expect(live.querySelector('.MediaGrid')).toBeNull()
  })

  it('lets go of the loader when the search fails and offers a retry', async () => {
    const searchMedia = vi.fn<() => Promise<ResultType>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [media(1)], total: 1, page: 1 })
    renderPanel(<MediaLibrary mode='manage' initialItems={[]} initialTotal={0} />, { actions: { searchMedia } as never })
    toggleTrash()
    expect(await screen.findByText('No pudimos cargar los archivos.')).toBeTruthy()
    expect(document.querySelector('[aria-busy=true]')).toBeNull()
    expect(screen.queryByText('La papelera está vacía.')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: /Foto 1/ })).toBeTruthy()
    expect(screen.queryByText('No pudimos cargar los archivos.')).toBeNull()
  })

  it('ignores a response that arrives after a newer search', async () => {
    const slow = deferred<ResultType>()
    const fast = deferred<ResultType>()
    const searchMedia = vi.fn().mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)
    renderPanel(<MediaLibrary mode='manage' initialItems={[]} initialTotal={0} />, { actions: { searchMedia } as never })
    toggleTrash()
    toggleTrash()
    await act(async () => fast.resolve({ items: [media(2)], total: 1, page: 1 }))
    await act(async () => slow.resolve({ items: [media(1)], total: 1, page: 1 }))
    expect(screen.getByRole('button', { name: /Foto 2/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Foto 1/ })).toBeNull()
    expect(document.querySelector('[aria-busy=true]')).toBeNull()
  })

  it('loads the next page when the end of the list comes into view', async () => {
    const searchMedia = vi.fn(async ({ page }: { page: number }) => ({ items: [media(page + 1)], total: 3, page }))
    renderPanel(<MediaLibrary mode='manage' initialItems={[media(1)]} initialTotal={3} />, { actions: { searchMedia } as never })
    const sentinel = screen.getByRole('button', { name: 'Cargar más' }).parentElement
    await waitFor(() => expect(observers.at(-1)?.element).toBe(sentinel))

    const observer = observers.at(-1)!
    act(() => observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], observer as never))
    expect(await screen.findByRole('button', { name: /Foto 3/ })).toBeTruthy()
    expect(searchMedia).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))

    await waitFor(() => expect(observers.at(-1)).not.toBe(observer))
    const next = observers.at(-1)!
    act(() => next.callback([{ isIntersecting: true } as IntersectionObserverEntry], next as never))
    expect(await screen.findByRole('button', { name: /Foto 4/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull()
  })

  it('keeps the uploader open while some files still need attention', async () => {
    renderPanel(<MediaLibrary mode='manage' initialItems={[]} initialTotal={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }))
    fireEvent.click(screen.getByRole('button', { name: 'finish upload' }))
    expect(screen.getByRole('button', { name: 'finish upload' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Foto 9/ })).toBeTruthy()
  })
})
