import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useFormikContext } from 'formik'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gallery, image } from '../../../../core/fields'
import { renderField } from '../../../__tests__/render'
import GalleryInput from '../../GalleryInput/GalleryInput'
import MediaInput from '../MediaInput'
import type { MediaItemType } from '../../../../core/media'

// Removing asks first; here the question is accepted right away and remembered.
const confirmed = vi.hoisted(() => vi.fn())
vi.mock('primereact/confirmdialog', () => ({
  confirmDialog: (options: { header: string, accept: () => void }) => {
    confirmed(options.header)
    options.accept()
  },
  ConfirmDialog: () => null
}))

afterEach(cleanup)

const media = (n: number, alt: Record<string, string>): MediaItemType => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, path: `${n}.webp`, url: `http://127.0.0.1:54421/${n}.webp`, filename: `foto-${n}.webp`, folder: '',
  alt, caption: {}, mime: 'image/webp', size: 10, width: 800, height: 600, focalX: null, focalY: null, blurDataUrl: null, createdAt: '2026-10-01T12:00:00Z', deletedAt: null
})

const A = media(1, { es: 'Fachada', en: 'Front' })
const B = media(2, { es: 'Patio', en: 'Courtyard' })
const known = { [A.id]: A, [B.id]: B }

// What the form holds, to check what a click stores.
const Values = () => <output data-testid='values'>{JSON.stringify(useFormikContext().values)}</output>
const stored = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}')

describe('MediaInput per language', () => {
  const cover = image({ label: 'Portada' })

  it('shows the original in another language and offers one of its own', () => {
    renderField(<MediaInput name='cover' field={cover} />, { values: { cover: { es: A.id } }, locale: 'en', media: known })
    expect(screen.getByText('foto-1.webp')).toBeTruthy()
    expect(screen.getByText('Igual que en Español')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Usar otra imagen para Inglés/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull()
  })

  it('goes back to the original, dropping the language key', async () => {
    renderField(<><MediaInput name='cover' field={cover} /><Values /></>, { values: { cover: { es: A.id, en: B.id } }, locale: 'en', media: known })
    expect(screen.getByText('foto-2.webp')).toBeTruthy()
    expect(screen.getByText('Solo para Inglés')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la original' }))
    await waitFor(() => expect(screen.getByText('foto-1.webp')).toBeTruthy())
    expect(stored()).toEqual({ cover: { es: A.id } })
  })

  it('asks for the alt text this language still lacks and opens it', async () => {
    const lacking = media(3, { es: 'Escalera' })
    renderField(
      <MediaInput name='cover' field={cover} />,
      { values: { cover: { es: lacking.id } }, locale: 'en', media: { [lacking.id]: lacking } },
      { actions: { getMediaUsage: async () => [] } as never }
    )
    expect(screen.getByText('Falta el texto alternativo en Inglés.')).toBeTruthy()
    expect(screen.queryByText(/Escalera/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Completar el texto alternativo en Inglés' }))
    await waitFor(() => expect(document.getElementById('media-alt-en')).toBeTruthy())
  })

  it('keeps the usual actions in the default language', () => {
    renderField(<MediaInput name='cover' field={cover} />, { values: { cover: { es: A.id, en: B.id } }, media: known })
    expect(screen.getByText('foto-1.webp')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeTruthy()
    expect(screen.queryByText('Igual que en Español')).toBeNull()
  })
})

describe('GalleryInput per language', () => {
  const photos = gallery({ label: 'Fotos' })

  it('starts an own gallery as a copy and goes back once it is empty', async () => {
    renderField(<><GalleryInput name='photos' field={photos} /><Values /></>, { values: { photos: { es: [A.id, B.id] } }, locale: 'en', media: known })
    expect(screen.getByText('Igual que en Español')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Usar otras imágenes para Inglés' }))
    await waitFor(() => expect(screen.getByText('Solo para Inglés')).toBeTruthy())
    expect(stored().photos).toEqual({ es: [A.id, B.id], en: [A.id, B.id] })

    fireEvent.click(screen.getByRole('button', { name: 'Borrar Front' }))
    expect(confirmed).toHaveBeenCalledWith('Quitar imagen')
    await waitFor(() => expect(stored().photos.en).toEqual([B.id]))
    fireEvent.click(screen.getByRole('button', { name: 'Borrar Courtyard' }))
    await waitFor(() => expect(stored().photos).toEqual({ es: [A.id, B.id] }))
    expect(screen.getByText('Igual que en Español')).toBeTruthy()
  })
})
