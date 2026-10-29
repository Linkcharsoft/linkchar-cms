import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import MediaDetails from '../MediaDetails/MediaDetails'
import type { MediaItemType } from '../../../core/media'

vi.mock('../../client/supabase', () => ({ useBrowserSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) } }) }))

const video: MediaItemType = {
  id: '00000000-0000-4000-8000-000000000004', path: 'sitio/clip.mp4', url: 'http://127.0.0.1:54421/clip.mp4', filename: 'clip.mp4', folder: 'sitio',
  alt: {}, caption: {}, mime: 'video/mp4', size: 12 * 1024 * 1024, width: 1280, height: 720, focalX: null, focalY: null, blurDataUrl: null,
  duration: 65, posterId: null, posterUrl: null, createdAt: '2026-10-01T12:00:00Z', deletedAt: null
}

afterEach(cleanup)

describe('MediaDetails for a video', () => {
  it('plays the file, says what a thousand plays cost and asks for the poster', async () => {
    renderPanel(<MediaDetails item={video} canPurge={false} onChanged={vi.fn()} onRemoved={vi.fn()} onHide={vi.fn()} />, { actions: { getMediaUsage: async () => [] } as never })
    const player = document.querySelector('video.MediaDetails__Video') as HTMLVideoElement
    expect(player.getAttribute('src')).toBe(video.url)
    expect(player.getAttribute('preload')).toBe('metadata')
    expect(screen.getByText(/12\.0 MB · 1280×720px · dura 1:05/)).toBeTruthy()
    expect(screen.getByText(/1\.000 reproducciones completas ≈ 11,7 GB de egreso/)).toBeTruthy()
    expect(screen.getByText('Falta la portada')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Elegir portada' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Capturar fotograma' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Quitar portada' })).toBeNull()
    await waitFor(() => expect(screen.getByText('No se usa en ningún contenido.')).toBeTruthy())
  })

  it('saves the poster with the texts, and drops it when removed', async () => {
    const withPoster = { ...video, posterId: '00000000-0000-4000-8000-000000000005', posterUrl: 'http://127.0.0.1:54421/poster.webp' }
    const updateMedia = vi.fn(async () => ({ ok: true, item: withPoster }))
    renderPanel(<MediaDetails item={withPoster} canPurge={false} onChanged={vi.fn()} onRemoved={vi.fn()} onHide={vi.fn()} />, { actions: { getMediaUsage: async () => [], updateMedia } as never })
    expect(screen.queryByText('Falta la portada')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cambiar portada' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar portada' }))
    expect(screen.getByText('Falta la portada')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(updateMedia).toHaveBeenCalledWith(withPoster.id, expect.objectContaining({ posterId: null })))
  })
})
