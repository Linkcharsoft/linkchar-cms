import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineCmsConfig, translatorFor } from '../config'
import { collection, page, singleton } from '../define'
import { getCollection, getEntry, getPage } from '../entries'
import { relation, section, slug, text } from '../fields'

const schema = {
  settings: singleton('Sitio', { name: text({ label: 'Nombre' }) }),
  home: page('Inicio', { hero: section('Portada', { title: text({ label: 'Título' }) }) }, { path: '/' }),
  posts: collection('Blog', {
    title: text({ label: 'Título' }),
    slug: slug({ label: 'Slug', from: 'title' }),
    category: relation({ label: 'Categoría', to: 'categories' })
  }, { singularLabel: 'Artículo', titleField: 'title', slugField: 'slug' }),
  categories: collection('Categorías', { name: text({ label: 'Nombre' }) }, { singularLabel: 'Categoría', titleField: 'name', under: 'posts' })
}

describe('defineCmsConfig', () => {
  it('fills the defaults', () => {
    const config = defineCmsConfig({ schema })
    expect(config).toMatchObject({ locales: ['es'], defaultLocale: 'es', panelLocale: 'es', basePath: '/dashboard', publishTarget: null })
    expect(Object.isFrozen(config)).toBe(true)
  })

  it('keeps the locales as a type', () => {
    const config = defineCmsConfig({ schema, locales: ['es', 'en'], defaultLocale: 'en' })
    expectTypeOf(config.defaultLocale).toEqualTypeOf<'es' | 'en'>()
    // @ts-expect-error the default locale must be one of the locales
    expect(() => defineCmsConfig({ schema, locales: ['es', 'en'], defaultLocale: 'pt' })).toThrow('not in locales')
  })

  it('rejects inconsistent locales and base paths', () => {
    expect(() => defineCmsConfig({ schema, locales: [] })).toThrow('at least one')
    expect(() => defineCmsConfig({ schema, locales: ['es', 'es'] })).toThrow('repeated')
    expect(() => defineCmsConfig({ schema, locales: ['Spanish'] })).toThrow('locale code')
    expect(() => defineCmsConfig({ schema, basePath: '/admin/' })).toThrow('basePath')
    expect(() => defineCmsConfig({ schema, basePath: 'admin' })).toThrow('basePath')
  })

  it('rejects schemas that point to entries or fields that do not exist', () => {
    const broken = (fields: Parameters<typeof collection>[1]) =>
      () => defineCmsConfig({ schema: { posts: collection('Blog', fields, { singularLabel: 'Artículo', titleField: 'title' }) } })

    expect(broken({ title: text({ label: 'Título' }), author: relation({ label: 'Autor', to: 'authors' }) })).toThrow('posts.author points to "authors"')
    expect(broken({ title: text({ label: 'Título' }), slug: slug({ label: 'Slug', from: 'name' }) })).toThrow('generated from "name"')
    expect(broken({ name: text({ label: 'Nombre' }) })).toThrow('titleField "title"')
  })
})

describe('entries', () => {
  const config = defineCmsConfig({ schema })

  it('finds entries by kind', () => {
    expect(getEntry(config, 'settings')?.kind).toBe('singleton')
    expect(getPage(config, 'home')?.label).toBe('Inicio')
    expect(getPage(config, 'posts')).toBeNull()
    expect(getCollection(config, 'categories')?.under).toBe('posts')
    expect(getEntry(config, 'toString')).toBeNull()
  })
})

describe('translatorFor', () => {
  it('uses the panel language and the project overrides', () => {
    const config = defineCmsConfig({ schema, panelLocale: 'en', messages: { en: { common: { yes: 'Yep' } } } })
    expect(translatorFor(config).t('common.yes')).toBe('Yep')
    expect(translatorFor(config, 'es').t('common.yes')).toBe('Sí')
    expect(translatorFor(config)).toBe(translatorFor(config))
  })
})
