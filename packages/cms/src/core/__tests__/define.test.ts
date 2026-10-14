import { describe, expect, expectTypeOf, it } from 'vitest'
import { buildDefaults } from '../defaults'
import { collection, defineSchema, page, singleton } from '../define'
import { block, blocks, button, group, list, note, relation, relations, richText, row, section, select, slug, tab, text } from '../fields'
import { isSectionHidden, pageSections } from '../pages'
import { buildYupSchema } from '../validation'
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
  }, { anchor: 'pie' }),
  home: page('Inicio', {
    hero: section('Portada', {
      title: text({ label: 'Título', required: true, maxLength: 80 }),
      tone: select({ label: 'Tono', options: [{ label: 'Claro', value: 'light' }, { label: 'Oscuro', value: 'dark' }] }),
      cta: button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }] }),
      meta: group({ label: 'Meta' }, { badge: text({ label: 'Badge' }) }),
      items: list({ label: 'Servicios', max: 9 }, { title: text({ label: 'Título' }) })
    }, { anchor: 'inicio', icon: 'pi-home' }),
    obras: section('Obras sociales', {
      title: text({ label: 'Título' })
    }, { anchor: 'obras', uses: ['posts'], hideable: true }),
    extra: blocks({ label: 'Bloques al final' }, {
      texto: block('Texto', { body: richText({ label: 'Texto' }) }),
      destacado: block('Destacado', { title: text({ label: 'Título' }) })
    })
  }, { path: '/', seo: { title: 'Inicio' }, sitemap: { priority: 1, changeFrequency: 'weekly' } }),
  notFound: page('Página no encontrada', {
    content: section('Contenido', { title: text({ label: 'Título' }) })
  }),
  posts: collection('Blog', {
    title: text({ label: 'Título' }),
    slug: slug({ label: 'Slug', from: 'title' }),
    category: relation({ label: 'Categoría', to: 'categories' }),
    tags: relations({ label: 'Etiquetas', to: 'tags' })
  }, { singularLabel: 'Artículo', titleField: 'title', slugField: 'slug', tabLabel: 'Artículos' }),
  categories: collection('Categorías', {
    name: text({ label: 'Nombre' })
  }, { singularLabel: 'Categoría', titleField: 'name', under: 'posts' })
})

describe('defineSchema', () => {
  it('keeps entry kinds and collection options', () => {
    expect(schema.settings).toMatchObject({ kind: 'singleton', anchor: 'pie' })
    expect(schema.home).toMatchObject({ kind: 'page', path: '/', sitemap: { priority: 1, changeFrequency: 'weekly' } })
    expect(schema.posts).toMatchObject({ kind: 'collection', titleField: 'title', slugField: 'slug', orderable: false, tabLabel: 'Artículos' })
    expect(schema.categories.under).toBe('posts')
  })

  it('infers the data shape, flattening tabs and rows', () => {
    type Settings = EntryValues<typeof schema.settings>
    expectTypeOf<Settings>().toEqualTypeOf<{ siteName: string, phone: string, whatsapp: string }>()

    type Post = EntryValues<typeof schema.posts>
    expectTypeOf<Post['category']>().toEqualTypeOf<string | null>()
    expectTypeOf<Post['tags']>().toEqualTypeOf<string[]>()
  })
})

describe('page', () => {
  it('stores each section as a nested object and types it', () => {
    type Home = EntryValues<typeof schema.home>
    expectTypeOf<Home['hero']['tone']>().toEqualTypeOf<'light' | 'dark' | null>()
    expectTypeOf<Home['hero']['cta']>().toEqualTypeOf<ButtonValueType<'primary'>>()
    expectTypeOf<Home['hero']['meta']>().toEqualTypeOf<{ badge: string }>()
    expectTypeOf<Home['hero']['items'][number]>().toEqualTypeOf<{ _key: string, title: string }>()
    expectTypeOf<Home['obras']>().toEqualTypeOf<{ title: string, _hidden: boolean }>()
    expectTypeOf<Home['extra'][number]>().toEqualTypeOf<
      { _key: string, _type: 'texto', body: RichTextDocType | null } | { _key: string, _type: 'destacado', title: string }
    >()
    expectTypeOf<Home['seo']>().toEqualTypeOf<{ title: string, description: string, image: string | null }>()
  })

  it('adds a trailing SEO section only to pages with a path', () => {
    expect(Object.keys(schema.home.fields)).toEqual(['hero', 'obras', 'extra', 'seo'])
    expect(schema.home.fields.seo).toMatchObject({ kind: 'group', seo: { path: '/' }, section: { hideable: false } })
    expect(buildDefaults(schema.home.fields).seo.title).toBe('Inicio')
    expect(Object.keys(schema.notFound.fields)).toEqual(['content'])
  })

  it('lists the page parts with their section marks', () => {
    expect(pageSections(schema.home.fields).map(({ key, mark }) => [key, mark?.anchor ?? null])).toEqual([
      ['hero', 'inicio'],
      ['obras', 'obras'],
      ['extra', null],
      ['seo', null]
    ])
    expect(pageSections(schema.home.fields)[1].mark).toEqual({ anchor: 'obras', uses: ['posts'], hideable: true })
  })

  it('gives hideable sections a visible-by-default switch', () => {
    const defaults = buildDefaults(schema.home.fields)
    expect(defaults.obras._hidden).toBe(false)
    expect('_hidden' in defaults.hero).toBe(false)
    expect(isSectionHidden({ ...defaults.obras, _hidden: true })).toBe(true)
    expect(isSectionHidden(defaults.hero)).toBe(false)
  })

  it('validates nested section fields', async () => {
    const data = buildDefaults(schema.home.fields)
    await expect(buildYupSchema(schema.home.fields, 'publish').validate(data)).rejects.toThrow('obligatorio')
    data.hero.title = 'Hola'
    await expect(buildYupSchema(schema.home.fields, 'publish').validate(data)).resolves.toBeTruthy()
  })
})

describe('dataFields', () => {
  it('flattens tabs and rows and skips notes', () => {
    expect(dataFields(schema.settings.fields).map(([key]) => key)).toEqual(['siteName', 'phone', 'whatsapp'])
  })
})

describe('fieldLabel', () => {
  it('builds readable labels for nested paths', () => {
    const fields = schema.home.fields
    expect(fieldLabel(fields, 'hero.title')).toBe('Portada › Título')
    expect(fieldLabel(fields, 'hero.meta.badge')).toBe('Portada › Meta › Badge')
    expect(fieldLabel(fields, 'hero.items.2.title')).toBe('Portada › Servicios 3 › Título')
    expect(fieldLabel(fields, 'seo.title')).toBe('Cómo aparece en Google y al compartir › Título para Google')
  })
})
