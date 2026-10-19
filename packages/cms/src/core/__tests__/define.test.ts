import { describe, expect, expectTypeOf, it } from 'vitest'
import { textContext } from '../config'
import { buildDefaults } from '../defaults'
import { collection, defineSchema, page, singleton } from '../define'
import { collectionNewLabel } from '../entries'
import { block, blocks, button, group, list, note, panel, relation, relations, richText, row, section, select, slug, tab, text } from '../fields'
import { isSectionHidden, pageSections } from '../pages'
import { validateContent } from '../validation'
import { dataFields, fieldLabel } from '../walk'
import { config } from './helpers'
import type { EntryValues } from '../define'
import type { ButtonValueType } from '../fields'
import type { RichTextDocType } from '../richText/nodes'

const schema = defineSchema({
  settings: singleton('Configuración', {
    general: tab('General', {
      siteName: text({ label: 'Nombre del sitio', required: true }),
      info: note('Se muestra en la pestaña del navegador.')
    }),
    contacto: panel('Contacto', {
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
    obras: section('Obras', {
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
    expect(schema.posts).toMatchObject({ kind: 'collection', titleField: 'title', slugField: 'slug', orderable: false, tabLabel: 'Artículos', referenceOnly: false })
    expect(collectionNewLabel(schema.posts, textContext(config))).toBe('Nuevo artículo')
    expect(schema.categories.under).toBe('posts')
  })

  it('infers the data shape, flattening tabs, panels and rows', () => {
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
    expect(schema.home.fields.seo).toMatchObject({ kind: 'group', seo: {}, section: { hideable: false } })
    expect(buildDefaults(config, schema.home.fields).seo.title).toEqual({ es: 'Inicio' })
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
    const defaults = buildDefaults(config, schema.home.fields)
    expect(defaults.obras._hidden).toBe(false)
    expect('_hidden' in defaults.hero).toBe(false)
    expect(isSectionHidden({ ...defaults.obras, _hidden: true })).toBe(true)
    expect(isSectionHidden(defaults.hero)).toBe(false)
  })

  it('validates nested section fields', async () => {
    const data = buildDefaults(config, schema.home.fields)
    expect((await validateContent(config, schema.home.fields, data, { mode: 'publish' })).errors).toEqual({ 'hero.title.es': 'Este campo es obligatorio' })
    data.hero.title = { es: 'Hola' }
    expect((await validateContent(config, schema.home.fields, data, { mode: 'publish' })).errors).toBeNull()
  })
})

describe('dataFields', () => {
  it('flattens tabs, panels and rows and skips notes', () => {
    expect(dataFields(schema.settings.fields).map(([key]) => key)).toEqual(['siteName', 'phone', 'whatsapp'])
  })
})

describe('fieldLabel', () => {
  it('builds readable labels for nested paths', () => {
    const fields = schema.home.fields
    expect(fieldLabel(fields, 'hero.title', textContext(config))).toBe('Portada › Título')
    expect(fieldLabel(fields, 'hero.meta.badge', textContext(config))).toBe('Portada › Meta › Badge')
    expect(fieldLabel(fields, 'hero.items.2.title', textContext(config))).toBe('Portada › Servicios 3 › Título')
    expect(fieldLabel(fields, 'seo.title', textContext(config))).toBe('Cómo aparece en Google y al compartir › Título para Google')
  })
})
