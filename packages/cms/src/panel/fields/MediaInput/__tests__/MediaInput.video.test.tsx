import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { videoFile } from '../../../../core/fields'
import { renderField } from '../../../__tests__/render'
import MediaInput from '../MediaInput'
import type { MediaItemType } from '../../../../core/media'

vi.mock('../../../media/MediaPicker/MediaPicker', () => ({
  default: ({ accept, header }: { accept: string, header: string }) => <output data-testid='picker'>{`${header} (${accept})`}</output>
}))

afterEach(cleanup)

const clip: MediaItemType = {
  id: '00000000-0000-4000-8000-000000000004', path: 'proyectos/clip.webm', url: 'http://127.0.0.1:54421/clip.webm', filename: 'clip.webm', folder: 'proyectos',
  alt: {}, caption: {}, mime: 'video/webm', size: 3 * 1024 * 1024, width: 1280, height: 720, focalX: null, focalY: null, blurDataUrl: null,
  duration: 62, posterId: null, posterUrl: null, createdAt: '2026-10-01T12:00:00Z', deletedAt: null
}

describe('MediaInput for a video', () => {
  const field = videoFile({ label: 'Video', folder: 'proyectos' })

  it('offers to choose a video and opens the picker on videos only', () => {
    renderField(<MediaInput name='video' field={field} />, { values: { video: null } })
    fireEvent.click(screen.getByRole('button', { name: 'Elegir video para Video' }))
    expect(screen.getByTestId('picker').textContent).toBe('Elegir video (video)')
  })

  it('shows the chosen video by its poster or icon, with its size and duration, and asks for the poster', () => {
    renderField(<MediaInput name='video' field={field} />, { values: { video: { es: clip.id } }, media: { [clip.id]: clip } })
    expect(screen.getByText('clip.webm')).toBeTruthy()
    expect(screen.getByText('3.0 MB · dura 1:02')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('Falta la portada: editá el video para elegirla.')
    expect(document.querySelector('.MediaInput__Video')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cambiar video de Video' })).toBeTruthy()

    cleanup()
    const withPoster = { ...clip, posterId: '00000000-0000-4000-8000-000000000005', posterUrl: 'http://127.0.0.1:54421/poster.webp' }
    renderField(<MediaInput name='video' field={field} />, { values: { video: { es: clip.id } }, media: { [clip.id]: withPoster } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('img.MediaInput__Image')?.getAttribute('src')).toContain('poster.webp')
  })
})
