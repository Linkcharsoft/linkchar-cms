import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import MediaUploader from '../MediaUploader/MediaUploader'
import type { MediaItemType } from '../../../core/media'

vi.mock('../hashBlob', () => ({ sha256Hex: async () => 'ab'.repeat(32) }))
vi.mock('../../client/supabase', () => ({ useBrowserSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) } }) }))

const upload = vi.hoisted(() => vi.fn(async () => undefined))
vi.mock('../uploadToStorage', () => ({ default: upload, UploadError: class extends Error {} }))

const existing: MediaItemType = {
  id: '6f1c3b2a-7777-4c1d-9e0f-000000000001', path: 'blog/2026/x.webp', url: 'https://db.test/x.webp', filename: 'fachada.webp', folder: 'blog',
  alt: { es: 'Fachada de ladrillo' }, caption: {}, mime: 'image/webp', size: 100, width: 10, height: 10, focalX: null, focalY: null,
  blurDataUrl: null, duration: null, posterId: null, posterUrl: null, createdAt: '2026-10-01T00:00:00Z', deletedAt: null
}

const registered = (name: string): MediaItemType => ({ ...existing, id: `6f1c3b2a-7777-4c1d-9e0f-00000000000${name.length}`, filename: name, mime: 'application/pdf' })

// jsdom has no object URLs; the preview just needs a string.
Object.assign(URL, { createObjectURL: () => 'blob:preview', revokeObjectURL: () => undefined })

const pick = (...files: File[]) => {
  const input = screen.getByLabelText('Elegir archivos para subir') as HTMLInputElement
  fireEvent.change(input, { target: { files: files.length ? files : [new File(['bytes'], 'foto.png', { type: 'image/png' })] } })
}

const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' })

const sized = (file: File, size: number) => Object.defineProperty(file, 'size', { value: size })

const dragFiles = { dataTransfer: { types: ['Files'], files: [] } }

afterEach(() => {
  cleanup()
  upload.mockClear()
})

describe('MediaUploader', () => {
  it('offers the library file that already has the same bytes', async () => {
    const onUploaded = vi.fn()
    renderPanel(<MediaUploader onUploaded={onUploaded} />, { actions: { findMediaByHash: async () => existing } as never })
    pick()
    expect(await screen.findByText('Ya existe en la librería como "Fachada de ladrillo".')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Usar el archivo existente' }))
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([existing], 0))
  })

  it('keeps the upload button for the file while its duplicate waits for a decision', async () => {
    renderPanel(<MediaUploader onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => existing } as never })
    pick()
    await screen.findByText(/Ya existe en la librería/)
    const upload = screen.getByRole('button', { name: 'Subir archivo' }) as HTMLButtonElement
    expect(upload.disabled).toBe(true)
  })

  it('lets the file go up anyway', async () => {
    renderPanel(<MediaUploader onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => existing } as never })
    pick()
    fireEvent.click(await screen.findByRole('button', { name: 'Subir igual' }))
    expect(screen.queryByText(/Ya existe en la librería/)).toBeNull()
    expect(screen.getByText('Para subir, completá el texto alternativo de cada imagen.')).toBeTruthy()
  })

  it('treats a file nobody has as new', async () => {
    renderPanel(<MediaUploader onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => null } as never })
    pick()
    await waitFor(() => expect(screen.queryByText('Revisando si ya está en la librería…')).toBeNull())
    expect(screen.queryByText(/Ya existe en la librería/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Subir archivo' })).toBeTruthy()
  })

  it('counts only the files ready to go, not the duplicates waiting for a decision', async () => {
    let calls = 0
    renderPanel(<MediaUploader onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => (calls++ === 0 ? existing : null) } as never })
    pick(pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf'))
    await screen.findByText(/Ya existe en la librería/)
    await waitFor(() => expect(screen.queryByText('Revisando si ya está en la librería…')).toBeNull())
    expect(screen.getByRole('button', { name: 'Subir 2 archivos' })).toBeTruthy()
  })

  it('tells the real limit apart for photos and PDFs', () => {
    renderPanel(<MediaUploader onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => null } as never })
    expect(screen.getByText('Imágenes hasta 50 MB (se optimizan automáticamente), PDF hasta 10 MB o videos MP4/WebM hasta 25 MB.')).toBeTruthy()
    pick(sized(new File(['x'], 'grande.png', { type: 'image/png' }), 51 * 1024 * 1024), sized(pdf('grande.pdf'), 11 * 1024 * 1024))
    expect(screen.getByText('grande.png: El archivo supera los 50 MB.')).toBeTruthy()
    expect(screen.getByText('grande.pdf: El archivo supera los 10 MB.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Subir/ })).toBeNull()
  })

  it('keeps the drop zone highlighted while the pointer crosses its children', () => {
    renderPanel(<MediaUploader onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => null } as never })
    const child = screen.getByText('Arrastrá archivos acá o')
    const zone = child.parentElement!
    fireEvent.dragEnter(zone, dragFiles)
    expect(zone.className).toContain('MediaUploader__Drop--Active')
    fireEvent.dragEnter(child, dragFiles)
    fireEvent.dragLeave(zone, dragFiles)
    expect(zone.className).toContain('MediaUploader__Drop--Active')
    fireEvent.dragLeave(child, dragFiles)
    expect(zone.className).not.toContain('MediaUploader__Drop--Active')
  })

  it('hands over what went up with how many files still need attention, keeping the remove buttons locked meanwhile', async () => {
    const onUploaded = vi.fn()
    let gate!: () => void
    upload.mockImplementationOnce(() => new Promise<undefined>(resolve => { gate = () => resolve(undefined) }))
    const registerMedia = vi.fn(async ({ filename }: { filename: string }) =>
      (filename === 'b.pdf' ? { ok: false, error: 'media.uploader.errors.failed' } : { ok: true, item: registered(filename) }))
    renderPanel(<MediaUploader onUploaded={onUploaded} />, { actions: { findMediaByHash: async () => null, registerMedia } as never })
    pick(pdf('a.pdf'), pdf('b.pdf'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Subir 2 archivos' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Subir 2 archivos' }))

    await waitFor(() => expect(upload).toHaveBeenCalled())
    for (const button of screen.getAllByRole('button', { name: /^Quitar/ })) expect((button as HTMLButtonElement).disabled).toBe(true)
    gate()

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([registered('a.pdf')], 1))
    expect(screen.getByText('No se pudo subir el archivo.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Quitar b.pdf' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
