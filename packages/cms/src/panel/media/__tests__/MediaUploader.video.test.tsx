import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import MediaUploader from '../MediaUploader/MediaUploader'
import type { MediaItemType } from '../../../core/media'
import type { VideoProbeType } from '../probeVideo'

vi.mock('../hashBlob', () => ({ sha256Hex: async () => 'cd'.repeat(32) }))
vi.mock('../../client/supabase', () => ({ useBrowserSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) } }) }))
vi.mock('../uploadToStorage', () => ({ default: async () => undefined, UploadError: class extends Error {} }))

const probe = vi.hoisted(() => ({ result: { fastStart: true, width: 1280, height: 720, duration: 12.5 } as VideoProbeType }))
vi.mock('../probeVideo', () => ({ probeVideo: async () => probe.result }))

const registered: MediaItemType = {
  id: '6f1c3b2a-7777-4c1d-9e0f-000000000009', path: 'blog/2026/x.mp4', url: 'https://db.test/x.mp4', filename: 'clip.mp4', folder: 'blog',
  alt: {}, caption: {}, mime: 'video/mp4', size: 100, width: 1280, height: 720, focalX: null, focalY: null,
  blurDataUrl: null, duration: 12.5, posterId: null, posterUrl: null, createdAt: '2026-10-01T00:00:00Z', deletedAt: null
}

Object.assign(URL, { createObjectURL: () => 'blob:preview', revokeObjectURL: () => undefined })

const pick = (file: File) => {
  const input = screen.getByLabelText('Elegir archivos para subir') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

const clip = (name = 'clip.mp4', type = 'video/mp4') => new File(['bytes'], name, { type })

const sized = (file: File, size: number) => Object.defineProperty(file, 'size', { value: size })

afterEach(() => {
  cleanup()
  probe.result = { fastStart: true, width: 1280, height: 720, duration: 12.5 }
})

describe('MediaUploader with videos', () => {
  it('uploads a faststart video as it is, with the size and duration the browser read', async () => {
    const onUploaded = vi.fn()
    const registerMedia = vi.fn(async () => ({ ok: true, item: registered }))
    renderPanel(<MediaUploader onUploaded={onUploaded} />, { actions: { findMediaByHash: async () => null, registerMedia } as never })
    pick(clip())
    const upload = await screen.findByRole('button', { name: 'Subir archivo' })
    await waitFor(() => expect((upload as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(upload)
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([registered], 0))
    expect(registerMedia).toHaveBeenCalledWith(expect.objectContaining({ mime: 'video/mp4', width: 1280, height: 720, duration: 12.5, blurDataUrl: null }))
  })

  it('turns away an mp4 that is not faststart, saying how to export it', async () => {
    probe.result = { fastStart: false, width: null, height: null, duration: null }
    renderPanel(<MediaUploader onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => null } as never })
    pick(clip('lento.mp4'))
    expect(await screen.findByText(/lento\.mp4: El video no está preparado para reproducirse mientras se descarga/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Subir/ })).toBeNull()
  })

  it('caps videos at their own size and keeps them out of image-only and PDF-only fields', () => {
    renderPanel(<MediaUploader onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => null } as never })
    pick(sized(clip('grande.mp4'), 26 * 1024 * 1024))
    expect(screen.getByText('grande.mp4: El video supera los 25 MB. Exportalo en 720p con H.264 (CRF 28) o recortalo.')).toBeTruthy()
    cleanup()

    renderPanel(<MediaUploader accept='image' onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => null } as never })
    pick(clip())
    expect(screen.getByText('clip.mp4: Acá solo se pueden subir imágenes.')).toBeTruthy()
    cleanup()

    renderPanel(<MediaUploader accept='video' onUploaded={vi.fn()} />, { actions: { findMediaByHash: async () => null } as never })
    pick(new File(['%PDF'], 'ficha.pdf', { type: 'application/pdf' }))
    expect(screen.getByText('ficha.pdf: Acá solo se pueden subir videos (MP4 o WebM).')).toBeTruthy()
  })
})
