import { beforeEach, describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import { collection, page } from '../../core/define'
import { image, section, seo, slug, text, textarea, videoFile } from '../../core/fields'
import { createFakeDb, fakeClient } from '../../server/__tests__/fakeSupabase'
import { createSiteReaders } from '../readers'
import { documentJsonLd, documentMetadata } from '../seo'
import type { FakeDbType } from '../../server/__tests__/fakeSupabase'
import type { SiteSourceType } from '../readers'
import type { SiteVideoType } from '../types'

const ID = (n: number) => `6f1c3b2a-5555-4c1d-9e0f-${String(n).padStart(12, '0')}`

const schema = {
  home: page('Inicio', { hero: section('Portada', { title: text({ label: 'Título' }), cover: image({ label: 'Imagen' }), clip: videoFile({ label: 'Video' }) }) },
    { path: '/', sitemap: { priority: 1, changeFrequency: 'weekly' } }),
  posts: collection('Blog', {
    title: text({ label: 'Título' }),
    slug: slug({ label: 'Dirección', from: 'title' }),
    excerpt: textarea({ label: 'Resumen' }),
    seo: seo({ titleFrom: 'title', descriptionFrom: 'excerpt' })
  }, { singularLabel: 'Artículo', titleField: 'title', slugField: 'slug', path: { es: '/blog/:slug', en: '/news/:slug' } }),
  team: collection('Equipo', { name: text({ label: 'Nombre' }) }, { singularLabel: 'Integrante', titleField: 'name' })
}

const config = defineCmsConfig({ schema, locales: ['es', 'en'], site: { url: 'https://norte.com', titleTemplate: '%s | Norte' } })

const post = (n: number, es: string, en: string, publishedAt: string) => ({
  id: ID(n), type: 'posts', key: null, slug: es, slugs: { es, en }, sort_order: 0, published_at: publishedAt,
  paths: { es: `/blog/${es}`, en: `/en/news/${en}` },
  data: { title: { es: `Título ${es}`, en: `Title ${en}` }, slug: { es, en }, excerpt: { es: 'Resumen', en: 'Summary' } }
})

let db: FakeDbType
let source: SiteSourceType

const readers = () => createSiteReaders({ config, supabaseUrl: () => 'https://db.test', source: async () => source, published: () => fakeClient(db) })

beforeEach(() => {
  db = createFakeDb()
  source = { db: fakeClient(db), draft: false }
  db.tables.media.push({
    id: ID(7), path: 'sitio/portada.webp', filename: 'portada.webp', folder: 'sitio', alt: { es: 'Fachada', en: 'Facade' }, caption: {},
    mime: 'image/webp', size: 10, width: 1600, height: 900, focal_x: null, focal_y: null, blur_data_url: null, created_at: '', deleted_at: null
  })
  db.tables.published_documents.push(
    { id: ID(1), type: 'home', key: 'home', slug: null, slugs: {}, paths: { es: '/', en: '/en' }, sort_order: 0, published_at: '2026-10-01T00:00:00Z',
      data: { hero: { title: { es: 'Hola', en: 'Hello' }, cover: { es: ID(7) } } } },
    post(2, 'casa', 'house', '2026-10-02T00:00:00Z'),
    post(3, 'patio', 'yard', '2026-10-03T00:00:00Z')
  )
})

describe('site readers', () => {
  it('loads the poster of a video although the content points only at the video', async () => {
    db.tables.media.push(
      { id: ID(8), path: 'sitio/clip.mp4', filename: 'clip.mp4', folder: 'sitio', alt: {}, caption: {}, mime: 'video/mp4', size: 5000, width: 1280, height: 720,
        focal_x: null, focal_y: null, blur_data_url: null, duration: 4, poster_id: ID(9), created_at: '', deleted_at: null },
      { id: ID(9), path: 'sitio/poster.webp', filename: 'poster.webp', folder: 'sitio', alt: { es: 'Portada' }, caption: {}, mime: 'image/webp', size: 10, width: 1280, height: 720,
        focal_x: null, focal_y: null, blur_data_url: null, duration: null, poster_id: null, created_at: '', deleted_at: null }
    )
    db.tables.published_documents[0].data = { hero: { title: { es: 'Hola' }, clip: { es: ID(8) } } }
    const home = await readers().getEntryContent('home')
    const hero = home.content.hero as unknown as { clip: SiteVideoType | null }
    expect(hero.clip).toMatchObject({ src: 'https://db.test/storage/v1/object/public/media/sitio/clip.mp4', duration: 4, poster: { src: 'https://db.test/storage/v1/object/public/media/sitio/poster.webp', alt: 'Portada' } })
  })

  it('reads a published page in one locale, with its media and its URLs', async () => {
    const home = await readers().getEntryContent('home', { locale: 'en' })
    expect(home).toMatchObject({ id: ID(1), locale: 'en', path: '/en', urls: { es: '/', en: '/en' }, draft: false })
    expect(home.content.hero.title).toBe('Hello')
    expect(home.content.hero.cover).toMatchObject({ src: 'https://db.test/storage/v1/object/public/media/sitio/portada.webp', alt: 'Facade', width: 1600 })
  })

  it('reads a page that was never published as the schema defaults', async () => {
    db.tables.published_documents = []
    const home = await readers().getEntryContent('home')
    expect(home).toMatchObject({ id: null, locale: 'es', path: '/', content: { hero: { title: '', cover: null } } })
  })

  it('reads drafts while previewing', async () => {
    db.tables.documents.push({ id: ID(1), type: 'home', key: 'home', slugs: {}, deleted_at: null, visible: true, data: { hero: { title: { es: 'Borrador' } } } })
    source = { db: fakeClient(db), draft: true }
    expect(await readers().getEntryContent('home')).toMatchObject({ draft: true, content: { hero: { title: 'Borrador' } } })
  })

  it('finds documents by the slug of each locale', async () => {
    const found = await readers().getDocumentBySlug('posts', 'house', { locale: 'en' })
    expect(found).toMatchObject({ id: ID(2), slug: 'house', path: '/en/news/house', urls: { es: '/blog/casa', en: '/en/news/house' } })
    expect(found?.content.title).toBe('Title house')
    expect(await readers().getDocumentBySlug('posts', 'casa', { locale: 'en' })).toBeNull()
  })

  it('lists documents, most recent first, and keeps the order of picked ones', async () => {
    expect((await readers().listDocuments('posts')).map(item => item.slug)).toEqual(['patio', 'casa'])
    expect((await readers().getDocuments('posts', [ID(2), ID(9), ID(3)])).map(item => item.id)).toEqual([ID(2), ID(3)])
  })

  it('gives the static params of each locale', async () => {
    expect(await readers().staticParams('posts', { locale: 'en' })).toEqual([{ slug: 'house' }, { slug: 'yard' }])
  })

  it('lists every published URL with its languages in the sitemap', async () => {
    const sitemap = await readers().sitemap()
    expect(sitemap).toContainEqual({
      url: 'https://norte.com/en', lastModified: '2026-10-01T00:00:00Z', changeFrequency: 'weekly', priority: 1,
      alternates: { languages: { es: 'https://norte.com/', en: 'https://norte.com/en', 'x-default': 'https://norte.com/' } }
    })
    expect(sitemap.map(item => item.url)).toEqual(expect.arrayContaining(['https://norte.com/blog/casa', 'https://norte.com/en/news/house']))
    expect(sitemap).toHaveLength(6)
  })

  it('dates a page in the sitemap by the last publish of what its sections show', async () => {
    const listing = page('Blog', { list: section('Artículos', { title: text({ label: 'Título' }) }, { uses: ['posts', 'team'] }) }, { path: '/blog' })
    const withList = defineCmsConfig({ schema: { ...schema, listing }, locales: ['es', 'en'], site: { url: 'https://norte.com' } })
    db.tables.published_documents.push(
      { id: ID(8), type: 'listing', key: 'listing', slug: null, slugs: {}, paths: { es: '/blog', en: '/en/blog' }, sort_order: 0, published_at: '2026-09-01T00:00:00Z', data: {} },
      { id: ID(9), type: 'team', key: null, slug: null, slugs: {}, paths: {}, sort_order: 0, published_at: '2026-09-15T00:00:00Z', data: {} }
    )
    const sitemap = await createSiteReaders({ config: withList, supabaseUrl: () => 'https://db.test', source: async () => source, published: () => fakeClient(db) }).sitemap()
    expect(sitemap.find(item => item.url === 'https://norte.com/en/blog')?.lastModified).toBe('2026-10-03T00:00:00Z')
    expect(sitemap.find(item => item.url === 'https://norte.com/blog/casa')?.lastModified).toBe('2026-10-02T00:00:00Z')
    expect(sitemap.some(item => item.url.includes('team'))).toBe(false)
    expect(sitemap).toHaveLength(8)
  })

  it('refuses to build a sitemap without site.url', async () => {
    const relative = createSiteReaders({ config: defineCmsConfig({ schema, locales: ['es', 'en'] }), supabaseUrl: () => 'https://db.test', source: async () => source, published: () => fakeClient(db) })
    await expect(relative.sitemap()).rejects.toThrow('needs site.url')
  })

  it('rejects locales the config does not have', async () => {
    await expect(readers().getEntryContent('home', { locale: 'pt' })).rejects.toThrow('not one of the locales')
  })
})

describe('site metadata', () => {
  it('titles a document with the site template and links its other languages', async () => {
    const found = (await readers().getDocumentBySlug('posts', 'casa'))!
    expect(documentMetadata(config, found)).toEqual({
      title: { absolute: 'Título casa | Norte' },
      description: 'Resumen',
      alternates: {
        canonical: 'https://norte.com/blog/casa',
        languages: { es: 'https://norte.com/blog/casa', en: 'https://norte.com/en/news/house', 'x-default': 'https://norte.com/blog/casa' }
      },
      openGraph: { title: 'Título casa', description: 'Resumen', url: 'https://norte.com/blog/casa', locale: 'es', type: 'article' }
    })
  })

  it('fills what the SEO leaves empty with the site defaults, never over its own values', async () => {
    const cover = { id: ID(7), src: 'https://cdn.test/share.webp', alt: 'Fachada', caption: '', width: 1200, height: 630, focalX: null, focalY: null, blurDataUrl: null }
    const defaults = { description: 'Arquitectura que se habita', image: cover }
    const home = await readers().getEntryContent('home')
    expect(documentMetadata(config, home, defaults)).toMatchObject({
      description: 'Arquitectura que se habita',
      openGraph: { description: 'Arquitectura que se habita', images: [{ url: 'https://cdn.test/share.webp', alt: 'Fachada', width: 1200, height: 630 }] }
    })
    const post = (await readers().getDocumentBySlug('posts', 'casa'))!
    expect(documentMetadata(config, post, defaults)).toMatchObject({ description: 'Resumen', openGraph: { description: 'Resumen' } })
  })

  it('describes the page for schema.org in its language', async () => {
    const home = await readers().getEntryContent('home', { locale: 'en' })
    expect(documentJsonLd(config, home)).toEqual({
      '@context': 'https://schema.org', '@type': 'WebPage', name: 'Inicio', url: 'https://norte.com/en', inLanguage: 'en', datePublished: '2026-10-01T00:00:00Z'
    })
  })
})
