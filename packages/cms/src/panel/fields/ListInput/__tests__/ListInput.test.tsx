import cmsConfig from '@playground/cms.config'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Formik, setIn } from 'formik'
import { afterEach, describe, expect, it } from 'vitest'
import { block, blocks, image, list, text, url } from '../../../../core'
import { validateContent } from '../../../../core/validation'
import { renderPanel } from '../../../__tests__/render'
import BlocksInput from '../../BlocksInput/BlocksInput'
import { EntryContext } from '../../entryContext'
import { FormFocusContext } from '../../formFocusContext'
import { MediaRegistryContext } from '../../referencesContext'
import ListInput from '../ListInput'
import type { FieldsRecord } from '../../../../core/fields'
import type { MediaItemType } from '../../../../core/media'
import type { ReactElement } from 'react'

afterEach(cleanup)

const PHOTO: MediaItemType = {
  id: '00000000-0000-4000-8000-000000000001', path: '1.webp', url: 'http://127.0.0.1:54421/1.webp', filename: 'foto-1.webp', folder: '',
  alt: { es: 'Fachada' }, caption: {}, mime: 'image/webp', size: 10, width: 800, height: 600, focalX: null, focalY: null, blurDataUrl: null, duration: null, posterId: null, posterUrl: null, createdAt: '2026-10-01T12:00:00Z', deletedAt: null
}

const toNested = (errors: Record<string, string>) => Object.entries(errors).reduce<Record<string, unknown>>((acc, [path, message]) => setIn(acc, path, message), {})

// The editor's form: the same draft validation, errors shown once a field was touched.
const renderList = (ui: ReactElement, fields: FieldsRecord, values: Record<string, unknown>, issues: string[] = []) => renderPanel(
  <Formik initialValues={values} validateOnChange={false} validate={async current => toNested((await validateContent(cmsConfig, fields, current, { mode: 'draft' })).errors ?? {})} onSubmit={() => undefined}>
    <EntryContext value={{ entryId: null, locale: 'es' }}>
      <MediaRegistryContext value={{ media: { [PHOTO.id]: PHOTO }, remember: () => undefined }}>
        <FormFocusContext value={{ issues, reveal: null }}>{ui}</FormFocusContext>
      </MediaRegistryContext>
    </EntryContext>
  </Formik>
)

const items = (count: number, extra: Record<string, unknown> = {}) => Array.from({ length: count }, (_, index) => ({ _key: `k${index}`, name: { es: `Item ${index + 1}` }, ...extra }))

const openBodies = () => document.querySelectorAll('.SortableItem__Body').length

describe('ListInput', () => {
  it('keeps the error of an item after another one is added', async () => {
    const networks = list({ label: 'Redes' }, { link: url({ label: 'Link' }) })
    const fields = { networks }
    renderList(<ListInput name='networks' field={networks} />, fields, { networks: [{ _key: 'a', link: 'abc' }] })

    fireEvent.blur(document.getElementById('cms-networks-0-link')!)
    await screen.findByText('Ingresá una URL que empiece con https://')

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    await waitFor(() => expect(document.querySelectorAll('.SortableItem').length).toBe(2))
    expect(screen.getByText('Ingresá una URL que empiece con https://')).toBeTruthy()
  })

  it('starts open with up to three items, collapsed beyond that, unless open says otherwise', () => {
    const services = list({ label: 'Servicios', itemLabel: 'name' }, { name: text({ label: 'Nombre' }) })
    const { unmount } = renderList(<ListInput name='items' field={services} />, { items: services }, { items: items(3) })
    expect(openBodies()).toBe(3)
    unmount()

    const { unmount: unmountLong } = renderList(<ListInput name='items' field={services} />, { items: services }, { items: items(4) })
    expect(openBodies()).toBe(0)
    unmountLong()

    const forced = { ...services, open: true }
    const { unmount: unmountForced } = renderList(<ListInput name='items' field={forced} />, { items: forced }, { items: items(4) })
    expect(openBodies()).toBe(4)
    unmountForced()

    const closed = { ...services, open: false }
    renderList(<ListInput name='items' field={closed} />, { items: closed }, { items: items(2) })
    expect(openBodies()).toBe(0)
  })

  it('shows the item image as a thumbnail and expands or collapses everything at once', async () => {
    const tiles = list({ label: 'Mosaico', itemLabel: 'name' }, { name: text({ label: 'Nombre' }), photo: image({ label: 'Foto' }) })
    renderList(<ListInput name='tiles' field={tiles} />, { tiles }, { tiles: [...items(4, { photo: { es: PHOTO.id } }), { _key: 'empty', name: { es: 'Sin foto' } }] })

    expect(openBodies()).toBe(5)
    const thumbs = document.querySelectorAll('.SortableItem__Thumb')
    expect(thumbs.length).toBe(5)
    expect(thumbs[0].querySelector('img')?.getAttribute('src')).toContain('1.webp')
    expect(thumbs[4].querySelector('img')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Colapsar todo' }))
    await waitFor(() => expect(openBodies()).toBe(0))
    expect(document.querySelectorAll('.SortableItem__Thumb').length).toBe(5)

    fireEvent.click(screen.getByRole('button', { name: 'Expandir todo' }))
    await waitFor(() => expect(openBodies()).toBe(5))
  })

  it('names items by their singular, counts their problems while collapsed and keeps the minimum', () => {
    const services = list({ label: 'Servicios', min: 1, max: 6, singularLabel: 'servicio', open: false }, { name: text({ label: 'Nombre' }) })
    renderList(<ListInput name='items' field={services} />, { items: services }, { items: [{ _key: 'k0', name: { es: '' } }] }, ['items.0.name.es'])

    expect(screen.getByText('Servicio 1')).toBeTruthy()
    expect(screen.getByText('1 de 6, mínimo 1')).toBeTruthy()
    expect(screen.getByLabelText('1 campo por revisar').textContent).toBe('1')
    expect(screen.getByRole('button', { name: 'Agregar servicio' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Borrar Servicio 1' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Duplicar Servicio 1' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('BlocksInput', () => {
  it('keeps a block whose type left the schema, with only its remove button', () => {
    const content = blocks({ label: 'Bloques' }, { texto: block('Texto', { body: text({ label: 'Texto' }) }) })
    renderList(<BlocksInput name='content' field={content} />, { content }, { content: [{ _key: 'x', _type: 'old' }, { _key: 'y', _type: 'texto', body: { es: 'Hola' } }] })

    expect(screen.getByText('Bloque "old", que ya no existe en el esquema: solo se puede borrar')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Borrar Bloque "old"/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Duplicar Bloque "old"/ })).toBeNull()
    expect(openBodies()).toBe(1)
    expect(screen.getByText('2')).toBeTruthy()
  })
})
