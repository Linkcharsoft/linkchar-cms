import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../config'
import { collection, page, singleton } from '../define'
import { section, slug, text } from '../fields'
import { alternates, entryPath, entryUrls, localePrefix, publishUrls, slugPrefixFor, slugsOf } from '../urls'

const schema = {
  settings: singleton('Sitio', { name: text({ label: 'Nombre' }) }),
  home: page('Inicio', { hero: section('Portada', { title: text({ label: 'Título' }) }) }, { path: '/' }),
  about: page('Estudio', { story: section('Historia', { title: text({ label: 'Título' }) }) }, { path: { es: '/estudio', en: '/studio' } }),
  posts: collection('Blog', {
    title: text({ label: 'Título' }),
    slug: slug({ label: 'Dirección', from: 'title' })
  }, { singularLabel: 'Artículo', titleField: 'title', slugField: 'slug', path: '/blog/:slug' }),
  projects: collection('Proyectos', {
    name: text({ label: 'Nombre' }),
    slug: slug({ label: 'Dirección', from: 'name', localized: false })
  }, { singularLabel: 'Proyecto', titleField: 'name', slugField: 'slug', path: { es: '/proyectos/:slug', en: '/projects/:slug' } })
}

const config = defineCmsConfig({ schema, locales: ['es', 'en'], site: { url: 'https://norte.com' } })

describe('entry URLs', () => {
  it('leaves the default locale without a prefix', () => {
    expect(localePrefix(config, 'es')).toBe('')
    expect(localePrefix(config, 'en')).toBe('/en')
    expect(entryPath(config, schema.home)).toBe('/')
    expect(entryPath(config, schema.home, { locale: 'en' })).toBe('/en')
    expect(entryPath(config, schema.settings)).toBeNull()
  })

  it('uses the pattern of each locale and the slug of the document', () => {
    expect(entryPath(config, schema.about, { locale: 'en' })).toBe('/en/studio')
    expect(entryPath(config, schema.projects, { locale: 'en', slug: 'casa del bosque' })).toBe('/en/projects/casa%20del%20bosque')
    expect(entryPath(config, schema.posts, { slug: ' ' })).toBeNull()
    expect(slugPrefixFor(config, schema.projects, 'es')).toBe('/proyectos/')
    expect(slugPrefixFor(config, schema.about, 'es')).toBeNull()
  })

  it('reads the slugs of a document per locale', () => {
    expect(slugsOf(config, schema.posts, { slug: { es: 'casa', en: 'house' } })).toEqual({ es: 'casa', en: 'house' })
    expect(slugsOf(config, schema.posts, { slug: { es: 'casa', en: '' } })).toEqual({ es: 'casa' })
    expect(slugsOf(config, schema.projects, { slug: 'norte' })).toEqual({ es: 'norte', en: 'norte' })
    expect(slugsOf(config, schema.about, {})).toEqual({})
  })

  it('lists the URLs, the publish inputs and the hreflang links', () => {
    const urls = entryUrls(config, schema.posts, { es: 'casa', en: 'house' })
    expect(urls).toEqual({ es: '/blog/casa', en: '/en/blog/house' })
    expect(entryUrls(config, schema.posts, { es: 'casa' })).toEqual({ es: '/blog/casa' })

    expect(publishUrls(config, schema.posts)).toEqual({ es: { prefix: '/blog/', primary: true }, en: { prefix: '/en/blog/', primary: false } })
    expect(publishUrls(config, schema.about)).toEqual({ es: { path: '/estudio' }, en: { path: '/en/studio' } })
    expect(publishUrls(config, schema.settings)).toEqual({})

    expect(alternates(config, urls, 'en')).toEqual({
      canonical: 'https://norte.com/en/blog/house',
      languages: { es: 'https://norte.com/blog/casa', en: 'https://norte.com/en/blog/house', 'x-default': 'https://norte.com/blog/casa' }
    })
  })
})

describe('entry URLs with prefixDefaultLocale', () => {
  const prefixed = defineCmsConfig({ schema, locales: ['es', 'en'], prefixDefaultLocale: true, site: { url: 'https://norte.com' } })

  it('prefixes the default locale too', () => {
    expect(localePrefix(prefixed, 'es')).toBe('/es')
    expect(entryPath(prefixed, schema.home)).toBe('/es')
    expect(entryPath(prefixed, schema.home, { locale: 'en' })).toBe('/en')
    expect(entryPath(prefixed, schema.about)).toBe('/es/estudio')
    expect(slugPrefixFor(prefixed, schema.projects, 'es')).toBe('/es/proyectos/')
    expect(entryUrls(prefixed, schema.posts, { es: 'casa', en: 'house' })).toEqual({ es: '/es/blog/casa', en: '/en/blog/house' })
  })

  it('gives publish_site the prefixed URLs', () => {
    expect(publishUrls(prefixed, schema.posts)).toEqual({ es: { prefix: '/es/blog/', primary: true }, en: { prefix: '/en/blog/', primary: false } })
    expect(publishUrls(prefixed, schema.home)).toEqual({ es: { path: '/es' }, en: { path: '/en' } })
  })

  it('rejects patterns that already start with a locale', () => {
    const about = (path: string | Record<string, string>) => ({ about: page('Estudio', {}, { path }) })
    expect(() => defineCmsConfig({ schema: about('/es/estudio'), locales: ['es', 'en'], prefixDefaultLocale: true })).toThrow('"/es/es/estudio"')
    expect(() => defineCmsConfig({ schema: about({ es: '/estudio', en: '/en' }), locales: ['es', 'en'], prefixDefaultLocale: true })).toThrow('"/en/en"')
    expect(defineCmsConfig({ schema: about('/estudio'), locales: ['es', 'en'], prefixDefaultLocale: true }).prefixDefaultLocale).toBe(true)
  })
})

describe('entry paths in defineCmsConfig', () => {
  const posts = (path: string | Record<string, string>) => ({
    posts: collection('Blog', { title: text({ label: 'Título' }), slug: slug({ label: 'Dirección', from: 'title' }) },
      { singularLabel: 'Artículo', titleField: 'title', slugField: 'slug', path })
  })

  it('rejects malformed or incomplete patterns', () => {
    expect(() => defineCmsConfig({ schema: posts({ es: '/blog/:slug' }), locales: ['es', 'en'] })).toThrow('one pattern per locale')
    expect(() => defineCmsConfig({ schema: posts('blog/:slug') })).toThrow('must start with /')
    expect(() => defineCmsConfig({ schema: posts('/:slug/blog') })).toThrow(':slug only at the end')
    expect(() => defineCmsConfig({ schema: posts('/blog') })).toThrow('needs :slug')
    expect(() => defineCmsConfig({ schema: { home: page('Inicio', {}, { path: '/:slug' }) } })).toThrow('can\'t use :slug')
  })

  it('rejects two entries on one URL and paths inside another locale', () => {
    const twice = { home: page('Inicio', {}, { path: '/' }), start: page('Comienzo', {}, { path: '/' }) }
    expect(() => defineCmsConfig({ schema: twice })).toThrow('also the path of home')
    expect(() => defineCmsConfig({ schema: { about: page('Estudio', {}, { path: '/en/estudio' }) }, locales: ['es', 'en'] })).toThrow('another locale\'s prefix')
  })
})
