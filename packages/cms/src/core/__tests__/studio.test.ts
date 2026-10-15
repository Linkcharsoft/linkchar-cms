import cmsConfig from '@playground/cms.config'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { textContext } from '../config'
import { buildDefaults, withDefaults } from '../defaults'
import { diffContent } from '../diff'
import { collectionNewLabel, entryIds, getCollection } from '../entries'
import { pageSections, usedEntries } from '../pages'
import { documentReferences } from '../references'
import { missingTranslations, resolveContent } from '../translations'
import { validateContent } from '../validation'
import type { CollectionIdType, ContentOf, EntryIdType, LocaleType, PageIdType, StoredContentOf } from '../config'

// The playground's studio schema, registered through `Register`, is the reference schema of these tests.
const { schema } = cmsConfig
const ID = (n: number) => `6f1c3b2a-2222-4c1d-9e0f-${String(n).padStart(12, '0')}`

describe('the studio config', () => {
  it('loads every entry with its project kinds registered', () => {
    expect(entryIds(cmsConfig)).toEqual(['settings', 'home', 'about', 'notFound', 'projects', 'posts', 'categories', 'team', 'faq'])
    expect([...cmsConfig.fieldTypes.keys()]).toEqual(expect.arrayContaining(['openingHours', 'color']))
  })

  it('types ids, locales and content from the registered config', () => {
    expectTypeOf<EntryIdType>().toEqualTypeOf<'settings' | 'home' | 'about' | 'notFound' | 'projects' | 'posts' | 'categories' | 'team' | 'faq'>()
    expectTypeOf<PageIdType>().toEqualTypeOf<'home' | 'about' | 'notFound'>()
    expectTypeOf<CollectionIdType>().toEqualTypeOf<'projects' | 'posts' | 'categories' | 'team' | 'faq'>()
    expectTypeOf<LocaleType>().toEqualTypeOf<'es' | 'en'>()

    expectTypeOf<ContentOf<'home'>['hero']['title']>().toEqualTypeOf<string>()
    expectTypeOf<ContentOf<'home'>['hero']['cta']['variant']>().toEqualTypeOf<'primary' | 'secondary'>()
    expectTypeOf<ContentOf<'projects'>['category']>().toEqualTypeOf<string | null>()
    expectTypeOf<ContentOf<'posts'>['topics']>().toEqualTypeOf<('obra' | 'materiales' | 'estudio')[]>()
    expectTypeOf<ContentOf<'categories'>['accent']>().toEqualTypeOf<string>()
    expectTypeOf<ContentOf<'settings'>['hours']['days'][number]['day']>().toEqualTypeOf<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>()
    expectTypeOf<StoredContentOf<'home'>['hero']['title']>().toEqualTypeOf<{ [locale: string]: string }>()
    expectTypeOf<StoredContentOf<'team'>['name']>().toEqualTypeOf<string>()
  })
})

describe('every studio entry', () => {
  const entries = entryIds(cmsConfig).map(id => [id, schema[id as EntryIdType].fields] as const)

  it.each(entries)('%s: its defaults are a valid draft and survive a round trip', async (_id, fields) => {
    const defaults = buildDefaults(cmsConfig, fields)
    expect((await validateContent(cmsConfig, fields, defaults)).errors).toBeNull()
    expect(withDefaults(cmsConfig, fields, JSON.parse(JSON.stringify(defaults)))).toEqual(defaults)
    expect(missingTranslations(cmsConfig, fields, defaults)).toEqual([])
  })

  it.each(entries)('%s: reads in both locales', (_id, fields) => {
    const defaults = buildDefaults(cmsConfig, fields)
    expect(() => resolveContent(cmsConfig, fields, defaults, 'en')).not.toThrow()
  })
})

describe('the home page', () => {
  const { fields } = schema.home

  it('lists its sections with the entries they show', () => {
    const sections = pageSections(fields)
    expect(sections.map(({ key, mark }) => [key, mark?.anchor ?? null])).toEqual([
      ['hero', 'inicio'], ['services', 'servicios'], ['projects', 'proyectos'], ['extra', null], ['seo', null]
    ])
    expect(usedEntries(cmsConfig, sections)).toEqual([{ id: 'projects', kind: 'collection', label: 'Proyectos' }])
  })

  it('blocks publishing until the required fields and translations are there', async () => {
    const data = buildDefaults(cmsConfig, fields)
    data.hero.intro = { es: 'Diseñamos casas y espacios de trabajo.', en: '' }
    expect((await validateContent(cmsConfig, fields, data, { mode: 'publish' })).errors).toEqual({
      'hero.cover.es': 'Este campo es obligatorio',
      'hero.intro.en': 'Falta en Inglés'
    })

    data.hero.cover = { es: ID(1) }
    data.hero.intro.en = 'We design homes and workplaces.'
    expect((await validateContent(cmsConfig, fields, data, { mode: 'publish' })).errors).toBeNull()
  })

  it('reads the English site with the shared image', () => {
    const data = buildDefaults(cmsConfig, fields)
    data.hero.cover = { es: ID(1) }
    const home = resolveContent(cmsConfig, fields, data, 'en')
    expect(home.hero).toMatchObject({ title: 'Architecture to live in', cover: ID(1) })
    expect(home.services.items.map(item => item.name)).toEqual(['Architecture', 'Interiors'])
    expect(home.seo.title).toBe('Estudio Norte · Architecture')
  })
})

describe('collections', () => {
  it('name their create buttons in the panel language', () => {
    const posts = getCollection(cmsConfig, 'posts')!
    const categories = getCollection(cmsConfig, 'categories')!
    expect(collectionNewLabel(posts, textContext(cmsConfig))).toBe('Nuevo artículo')
    expect(collectionNewLabel(posts, textContext(cmsConfig, 'en'))).toBe('New post')
    expect(collectionNewLabel(categories, textContext(cmsConfig))).toBe('Nueva categoría')
  })

  it('validate the project kind with its own message', async () => {
    const { fields } = schema.categories
    expect((await validateContent(cmsConfig, fields, { name: 'Obra', accent: 'azul' })).errors).toEqual({ accent: 'Usá un color como #1f5fa8' })
    expect((await validateContent(cmsConfig, fields, { name: 'Obra', accent: '#1F5FA8' })).errors).toBeNull()
    expect(withDefaults(cmsConfig, fields, { accent: '#1F5FA8' }).accent).toBe('#1f5fa8')
  })

  it('find what a project points to and describe its changes', () => {
    const { fields } = schema.projects
    const project = {
      ...buildDefaults(cmsConfig, fields),
      title: { es: 'Casa del Lago', en: 'Lake House' },
      category: ID(10),
      cover: { es: ID(2), en: ID(3) },
      photos: { es: [ID(4), ID(2)] },
      brochure: { es: ID(5) }
    }
    expect(documentReferences(cmsConfig, fields, project)).toEqual({ relations: [ID(10)], media: [ID(2), ID(3), ID(4), ID(5)] })

    const changed = { ...project, year: 2024, title: { ...project.title, en: 'The Lake House' } }
    expect(diffContent(cmsConfig, fields, project, changed, { media: {} })).toEqual([
      { path: 'title.en', label: 'Nombre (Inglés)', current: 'Lake House', version: 'The Lake House' },
      { path: 'year', label: 'Año', current: '—', version: '2024' }
    ])
  })
})
