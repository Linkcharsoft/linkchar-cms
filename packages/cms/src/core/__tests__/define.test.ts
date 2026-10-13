import { describe, expect, expectTypeOf, it } from 'vitest'
import { collection, defineSchema, section, singleton } from '../define'
import { block, blocks, button, group, list, note, relation, relations, richText, row, select, slug, tab, text } from '../fields'
import { dataFields, fieldLabel } from '../walk'
import type { EntryValues } from '../define'
import type { ButtonValueType } from '../fields'
import type { RichTextDocType } from '../richText/nodes'

const schema = defineSchema({
  settings: singleton('Configuración', {
    general: tab('General', {
      siteName: text({ label: 'Nombre del sitio', required: true }),
      info: note('Se muestra en la pestaña del navegador.')
    }),
    contacto: tab('Contacto', {
      phones: row({ phone: text({ label: 'Teléfono' }), whatsapp: text({ label: 'WhatsApp' }) })
    })
  }),
  'home.hero': section('Inicio · Portada', {
    title: text({ label: 'Título', maxLength: 80 }),
    tone: select({ label: 'Tono', options: [{ label: 'Claro', value: 'light' }, { label: 'Oscuro', value: 'dark' }] }),
    cta: button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }] }),
    meta: group({ label: 'Meta' }, { badge: text({ label: 'Badge' }) }),
    items: list({ label: 'Servicios', max: 9 }, { title: text({ label: 'Título' }) }),
    content: blocks({ label: 'Contenido' }, {
      texto: block('Texto', { body: richText({ label: 'Texto' }) }),
      destacado: block('Destacado', { title: text({ label: 'Título' }) })
    })
  }),
  posts: collection('Blog', {
    title: text({ label: 'Título' }),
    slug: slug({ label: 'Slug', from: 'title' }),
    category: relation({ label: 'Categoría', to: 'categories' }),
    tags: relations({ label: 'Etiquetas', to: 'tags' })
  }, { singularLabel: 'Artículo', titleField: 'title', slugField: 'slug' })
})

describe('defineSchema', () => {
  it('keeps entry kinds and collection options', () => {
    expect(schema.settings.kind).toBe('singleton')
    expect(schema['home.hero'].kind).toBe('section')
    expect(schema.posts).toMatchObject({ kind: 'collection', titleField: 'title', slugField: 'slug', orderable: false })
  })

  it('infers the data shape, flattening tabs and rows', () => {
    type Settings = EntryValues<typeof schema.settings>
    expectTypeOf<Settings>().toEqualTypeOf<{ siteName: string, phone: string, whatsapp: string }>()

    type Hero = EntryValues<typeof schema['home.hero']>
    expectTypeOf<Hero['tone']>().toEqualTypeOf<'light' | 'dark' | null>()
    expectTypeOf<Hero['cta']>().toEqualTypeOf<ButtonValueType<'primary'>>()
    expectTypeOf<Hero['meta']>().toEqualTypeOf<{ badge: string }>()
    expectTypeOf<Hero['items'][number]>().toEqualTypeOf<{ _key: string, title: string }>()
    expectTypeOf<Hero['content'][number]>().toEqualTypeOf<
      { _key: string, _type: 'texto', body: RichTextDocType | null } | { _key: string, _type: 'destacado', title: string }
    >()

    type Post = EntryValues<typeof schema.posts>
    expectTypeOf<Post['category']>().toEqualTypeOf<string | null>()
    expectTypeOf<Post['tags']>().toEqualTypeOf<string[]>()
  })
})

describe('dataFields', () => {
  it('flattens tabs and rows and skips notes', () => {
    expect(dataFields(schema.settings.fields).map(([key]) => key)).toEqual(['siteName', 'phone', 'whatsapp'])
  })
})

describe('fieldLabel', () => {
  it('builds readable labels for nested paths', () => {
    const fields = schema['home.hero'].fields
    expect(fieldLabel(fields, 'title')).toBe('Título')
    expect(fieldLabel(fields, 'meta.badge')).toBe('Meta › Badge')
    expect(fieldLabel(fields, 'items.2.title')).toBe('Servicios 3 › Título')
  })
})
