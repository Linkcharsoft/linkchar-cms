import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import MediaUploader from '../MediaUploader/MediaUploader'
import type { MediaItemType } from '../../../core/media'

vi.mock('../hashBlob', () => ({ sha256Hex: async () => 'ab'.repeat(32) }))

const existing: MediaItemType = {
  id: '6f1c3b2a-7777-4c1d-9e0f-000000000001', path: 'blog/2026/x.webp', url: 'https://db.test/x.webp', filename: 'fachada.webp', folder: 'blog',
  alt: { es: 'Fachada de ladrillo' }, caption: {}, mime: 'image/webp', size: 100, width: 10, height: 10, focalX: null, focalY: null,
  blurDataUrl: null, createdAt: '2026-10-01T00:00:00Z', deletedAt: null
}

// jsdom has no object URLs; the preview just needs a string.
Object.assign(URL, { createObjectURL: () => 'blob:preview', revokeObjectURL: () => undefined })

const pick = () => {
  const input = screen.getByLabelText('Elegir archivos para subir') as HTMLInputElement
  fireEvent.change(input, { target: { files: [new File(['bytes'], 'foto.png', { type: 'image/png' })] } })
}

afterEach(cleanup)

describe('MediaUploader', () => {
  it('offers the library file that already has the same bytes', async () => {
    const onUploaded = vi.fn()
    renderPanel(<MediaUploader onUploaded={onUploaded} />, { actions: { findMediaByHash: async () => existing } as never })
    pick()
    expect(await screen.findByText('Ya existe en la librería como "Fachada de ladrillo".')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Usar el archivo existente' }))
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([existing]))
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
})
