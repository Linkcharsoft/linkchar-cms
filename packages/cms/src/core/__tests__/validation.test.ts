import { describe, expect, it } from 'vitest'
import { buildDefaults } from '../defaults'
import { block, blocks, button, email, link, list, multiSelect, openingHours, relation, richText, slug, tab, text, url, video } from '../fields'
import { validateContent } from '../validation'

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
  ...buildDefaults(fields),
  title: 'Hola',
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Algo' }] }] },
  items: [{ _key: 'k1', name: 'Psicología' }]
})

describe('validateContent', () => {
  it('saves an empty draft but blocks publishing until required fields are filled', async () => {
    const empty = buildDefaults(fields)

    expect((await validateContent(fields, empty, 'draft')).errors).toBeNull()

    const { errors } = await validateContent(fields, empty, 'publish')
    expect(errors).toMatchObject({
      title: 'Este campo es obligatorio',
      body: 'Este campo es obligatorio',
      items: 'Cargá al menos 1'
    })
  })

  it('accepts complete content in publish mode', async () => {
    expect((await validateContent(fields, valid(), 'publish')).errors).toBeNull()
  })

  it('checks formats in draft mode too', async () => {
    const { errors } = await validateContent(fields, {
      ...valid(),
      title: 'Demasiado largo',
      slug: 'Con Espacios',
      contact: 'no-es-email',
      site: 'ftp://algo',
      clip: 'https://example.com/video',
      areas: ['z'],
      category: 'no-uuid',
      more: { type: 'internal', href: 'https://externo.com', newTab: false }
    }, 'draft')

    expect(errors).toMatchObject({
      title: 'Usá hasta 10 caracteres',
      slug: 'Usá minúsculas, números y guiones',
      contact: 'Ingresá un email válido',
      site: 'Ingresá una URL que empiece con https://',
      clip: 'Pegá un link de YouTube o Vimeo',
      'areas.0': 'Elegí una opción válida',
      category: 'Referencia inválida',
      'more.href': 'Los links internos empiezan con /'
    })
  })

  it('enforces list max always and reports nested paths', async () => {
    const { errors } = await validateContent(fields, {
      ...valid(),
      items: [{ _key: 'a', name: 'x' }, { _key: 'b', name: '' }, { _key: 'c', name: 'z' }]
    }, 'publish')

    expect(errors).toMatchObject({ items: 'Podés cargar hasta 2', 'items.1.name': 'Este campo es obligatorio' })
  })

  it('rejects unknown block types and bad opening hours', async () => {
    const hours = buildDefaults(fields).hours
    hours.days[0] = { day: 'lunes', closed: false, from: '18:00', to: '09:00' }

    const { errors } = await validateContent(fields, {
      ...valid(),
      hours,
      content: [{ _key: 'b1', _type: 'video-raro' }]
    }, 'draft')

    expect(errors).toMatchObject({
      'hours.days.0.to': 'El cierre tiene que ser posterior a la apertura',
      'content.0': 'Tipo de bloque desconocido'
    })
  })

  it('strips keys that are not in the schema', async () => {
    const { value } = await validateContent(fields, { ...valid(), hacked: true, items: [{ _key: 'k', name: 'x', extra: 1 }] })

    expect(value).not.toHaveProperty('hacked')
    expect(value?.items).toEqual([{ _key: 'k', name: 'x' }])
  })
})
