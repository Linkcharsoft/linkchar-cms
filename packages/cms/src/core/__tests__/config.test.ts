import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineCmsConfig, translatorFor } from '../config'
import { collection, page, singleton } from '../define'
import { getCollection, getEntry, getPage } from '../entries'
import { image, relation, section, slug, text } from '../fields'

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
    expect(config).toMatchObject({ locales: ['es'], defaultLocale: 'es', panelLocale: 'es', basePath: '/dashboard' })
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

  it('checks the project extensions', () => {
    const stats = { id: 'stats', label: 'Estadísticas', path: 'estadisticas' }
    expect(defineCmsConfig({ schema, extensions: [stats] }).extensions).toEqual([stats])
    expect(() => defineCmsConfig({ schema, extensions: [stats, stats] })).toThrow('defined twice')
    expect(() => defineCmsConfig({ schema, extensions: [{ id: 'x', label: 'X' }] })).toThrow('either a path')
    expect(() => defineCmsConfig({ schema, extensions: [{ id: 'x', label: 'X', path: 'a', href: 'https://a.com' }] })).toThrow('either a path')
    expect(() => defineCmsConfig({ schema, extensions: [{ id: 'x', label: 'X', path: 'media' }] })).toThrow('already a panel screen')
    expect(() => defineCmsConfig({ schema, extensions: [{ id: 'x', label: 'X', href: 'javascript:alert(1)' }] })).toThrow('https://')
  })

  it('checks the site settings', () => {
    expect(defineCmsConfig({ schema }).site).toEqual({ url: null, titleTemplate: '%s', defaults: null, xDefault: 'es' })
    expect(defineCmsConfig({ schema, locales: ['es', 'en'], site: { xDefault: 'en' } }).site.xDefault).toBe('en')
    // @ts-expect-error: x-default must be one of the locales
    expect(() => defineCmsConfig({ schema, locales: ['es', 'en'], site: { xDefault: 'pt' } })).toThrow('not in locales')
    expect(defineCmsConfig({ schema, site: { url: 'https://acme.com', titleTemplate: '%s | Acme' } }).site.titleTemplate).toBe('%s | Acme')
    expect(() => defineCmsConfig({ schema, site: { titleTemplate: 'Acme' } })).toThrow('%s')
    expect(() => defineCmsConfig({ schema, site: { url: 'https://acme.com/blog' } })).toThrow('origin')
  })

  it('takes the site defaults from text and image fields of a page or singleton', () => {
    const withShare = { ...schema, settings: singleton('Sitio', { name: text({ label: 'Nombre' }), share: image({ label: 'Imagen' }) }) }
    expect(defineCmsConfig({ schema: withShare, site: { defaults: { entry: 'settings', description: 'name', image: 'share' } } }).site.defaults)
      .toEqual({ entry: 'settings', description: 'name', image: 'share' })
    expect(() => defineCmsConfig({ schema: withShare, site: { defaults: { entry: 'settings', description: 'share' } } })).toThrow('site.defaults.description "share" must be a text or textarea field')
    expect(() => defineCmsConfig({ schema: withShare, site: { defaults: { entry: 'settings', image: 'name' } } })).toThrow('site.defaults.image')
    // @ts-expect-error a collection has no single value to fall back to
    expect(() => defineCmsConfig({ schema, site: { defaults: { entry: 'posts', description: 'title' } } })).toThrow('page or singleton')
    // @ts-expect-error only keys of the entry's fields
    expect(() => defineCmsConfig({ schema, site: { defaults: { entry: 'settings', description: 'tagline' } } })).toThrow('"tagline"')
  })

  it('rejects panel segments that are not URL-safe or collide', () => {
    expect(() => defineCmsConfig({ schema, paths: { pages: 'Pages' } })).toThrow('paths.pages')
    expect(() => defineCmsConfig({ schema, paths: { trash: 'auth' } })).toThrow('sign-in links')
    expect(() => defineCmsConfig({ schema, paths: { pages: 'media' } })).toThrow('"media" for two screens')
  })

  it('rejects schemas that point to entries or fields that do not exist', () => {
    const broken = (fields: Parameters<typeof collection>[1]) =>
      () => defineCmsConfig({ schema: { posts: collection('Blog', fields, { singularLabel: 'Artículo', titleField: 'title' }) } })

    expect(broken({ title: text({ label: 'Título' }), author: relation({ label: 'Autor', to: 'authors' }) })).toThrow('posts.author points to "authors"')
    expect(broken({ title: text({ label: 'Título' }), slug: slug({ label: 'Slug', from: 'name' }) })).toThrow('generated from "name"')
    expect(broken({ name: text({ label: 'Nombre' }) })).toThrow('titleField "title"')
    expect(broken({ title: text({ label: 'Título' }), cover: image({ label: 'Portada', folder: 'blog' }) })).toThrow('folder "blog"')
  })
})

describe('previewPath', () => {
  it('lets entries share a preview location and rejects :slug in it', () => {
    const footer = singleton('Pie', { text: text({ label: 'Texto' }) }, { previewPath: '/', anchor: 'pie' })
    const menu = singleton('Menú', { text: text({ label: 'Texto' }) }, { previewPath: '/' })
    expect(() => defineCmsConfig({ schema: { home: schema.home, footer, menu } })).not.toThrow()
    const broken = singleton('Pie', { text: text({ label: 'Texto' }) }, { previewPath: '/blog/:slug' })
    expect(() => defineCmsConfig({ schema: { footer: broken } })).toThrow('footer.previewPath "/blog/:slug" can\'t use :slug')
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
