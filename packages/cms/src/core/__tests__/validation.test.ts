import { describe, expect, it } from 'vitest'
import { buildDefaults } from '../defaults'
import { block, blocks, button, email, file, gallery, image, link, list, multiSelect, relation, richText, slug, tab, text, url, video } from '../fields'
import { openingHours } from '../kinds/openingHours'
import { validateContent } from '../validation'
import { config } from './helpers'

const fields = {
  general: tab('General', {
    title: text({ label: 'Título', required: true, maxLength: 10 }),
    slug: slug({ label: 'Slug', from: 'title' }),
    contact: email({ label: 'Email' }),
    site: url({ label: 'Sitio' }),
    clip: video({ label: 'Video' })
  }),
  body: richText({ label: 'Cuerpo', required: true }),
  areas: multiSelect({ label: 'Áreas', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] }),
  cta: button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }] }),
  more: link({ label: 'Más info' }),
  category: relation({ label: 'Categoría', to: 'categories' }),
  hours: openingHours({ label: 'Horarios' }),
  items: list({ label: 'Servicios', min: 1, max: 2 }, { name: text({ label: 'Nombre', required: true }) }),
  content: blocks({ label: 'Contenido' }, { texto: block('Texto', { body: text({ label: 'Texto' }) }) })
}

const valid = () => ({
  ...buildDefaults(config, fields),
  title: 'Hola',
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Algo' }] }] },
  items: [{ _key: 'k1', name: 'Arquitectura' }]
})

describe('validateContent', () => {
  it('saves an empty draft but blocks publishing until required fields are filled', async () => {
    const empty = buildDefaults(config, fields)

    expect((await validateContent(config, fields, empty, { mode: 'draft' })).errors).toBeNull()

    const { errors } = await validateContent(config, fields, empty, { mode: 'publish' })
    expect(errors).toMatchObject({
      'title.es': 'Este campo es obligatorio',
      'body.es': 'Este campo es obligatorio',
      items: 'Cargá al menos 1'
    })
  })

  it('accepts complete content in publish mode', async () => {
    expect((await validateContent(config, fields, valid(), { mode: 'publish' })).errors).toBeNull()
  })

  it('checks formats in draft mode too', async () => {
    const { errors } = await validateContent(config, fields, {
      ...valid(),
      title: 'Demasiado largo',
      slug: 'Con Espacios',
      contact: 'no-es-email',
      site: 'ftp://algo',
      clip: 'https://example.com/video',
      areas: ['z'],
      category: 'no-uuid',
      more: { type: 'internal', href: 'https://externo.com', newTab: false }
    }, { mode: 'draft' })

    expect(errors).toMatchObject({
      'title.es': 'Usá hasta 10 caracteres',
      'slug.es': 'Usá minúsculas, números y guiones',
      contact: 'Ingresá un email válido',
      site: 'Ingresá una URL que empiece con https://',
      clip: 'Pegá un link de YouTube o Vimeo',
      'areas.0': 'Elegí una opción válida',
      category: 'Referencia inválida',
      'more.href': 'Los links internos empiezan con /'
    })
  })

  it('enforces list max always and reports nested paths', async () => {
    const { errors } = await validateContent(config, fields, {
      ...valid(),
      items: [{ _key: 'a', name: 'x' }, { _key: 'b', name: '' }, { _key: 'c', name: 'z' }]
    }, { mode: 'publish' })

    expect(errors).toMatchObject({ items: 'Podés cargar hasta 2', 'items.1.name.es': 'Este campo es obligatorio' })
  })

  it('accepts hours past midnight and ignores the hours of a closed day', async () => {
    const hours = buildDefaults(config, fields).hours
    hours.days[0] = { day: 'mon', closed: false, from: '20:00', to: '02:00' }
    hours.days[1] = { day: 'tue', closed: true, from: '25:00', to: '09:00' }

    const { errors } = await validateContent(config, fields, { ...valid(), hours }, { mode: 'draft' })

    expect(errors).toBeNull()
  })

  it('rejects unknown block types and bad opening hours', async () => {
    const hours = buildDefaults(config, fields).hours
    hours.days[0] = { day: 'mon', closed: false, from: '18:00', to: '18:00' }

    const { errors } = await validateContent(config, fields, {
      ...valid(),
      hours,
      content: [{ _key: 'b1', _type: 'video-raro' }]
    }, { mode: 'draft' })

    expect(errors).toMatchObject({
      'hours.days.0.to': 'El cierre no puede ser a la misma hora que la apertura',
      'content.0': 'Tipo de bloque desconocido'
    })
  })

  it('keeps rich text documents intact (attrs and marks are not unknown keys)', async () => {
    const body = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Título' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'negrita', marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://a.com', target: '_blank' } }] }] },
        { type: 'video', attrs: { src: 'https://vimeo.com/1' } }
      ]
    }
    const { value } = await validateContent(config, fields, { ...valid(), body })
    expect(value?.body).toEqual({ es: body })
  })

  it('validates media references by id', async () => {
    const media = {
      cover: image({ label: 'Portada', required: true }),
      photos: gallery({ label: 'Fotos', min: 2, max: 3 }),
      pdf: file({ label: 'PDF' })
    }
    const id = () => crypto.randomUUID()

    expect((await validateContent(config, media, { cover: null, photos: [], pdf: null }, { mode: 'draft' })).errors).toBeNull()
    expect((await validateContent(config, media, { cover: null, photos: [id()], pdf: null }, { mode: 'publish' })).errors).toMatchObject({
      'cover.es': 'Este campo es obligatorio',
      'photos.es': 'Elegí al menos 2 imágenes'
    })
    expect((await validateContent(config, media, { cover: 'x', photos: [id(), id(), id(), id()], pdf: 'y' }, { mode: 'draft' })).errors).toMatchObject({
      'cover.es': 'Archivo inválido',
      'photos.es': 'Podés elegir hasta 3 imágenes',
      'pdf.es': 'Archivo inválido'
    })
  })

  it('strips keys that are not in the schema', async () => {
    const { value } = await validateContent(config, fields, { ...valid(), hacked: true, items: [{ _key: 'k', name: 'x', extra: 1 }] })

    expect(value).not.toHaveProperty('hacked')
    expect(value?.items).toEqual([{ _key: 'k', name: { es: 'x' } }])
  })
})
