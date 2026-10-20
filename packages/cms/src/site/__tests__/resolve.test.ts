import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import { collection, page } from '../../core/define'
import { button, gallery, image, link, richText, section, slug, text } from '../../core/fields'
import { resolveSiteContent } from '../resolve'
import type { MediaItemType } from '../../core/media'
import type { SiteRefsType } from '../resolve'

const ID = (n: number) => `6f1c3b2a-4444-4c1d-9e0f-${String(n).padStart(12, '0')}`

const schema = {
  home: page('Inicio', {
    hero: section('Portada', {
      title: text({ label: 'Título' }),
      cover: image({ label: 'Imagen' }),
      photos: gallery({ label: 'Fotos' }),
      cta: button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }] }),
      more: link({ label: 'Más' }),
      body: richText({ label: 'Texto' })
    }, { anchor: 'inicio' })
  }, { path: '/' }),
  about: page('Estudio', { story: section('Historia', { title: text({ label: 'Título' }) }, { anchor: 'historia' }) }, { path: { es: '/estudio', en: '/studio' } }),
  posts: collection('Blog', { title: text({ label: 'Título' }), slug: slug({ label: 'Dirección', from: 'title' }) },
    { singularLabel: 'Artículo', titleField: 'title', slugField: 'slug', path: '/blog/:slug' })
}

const config = defineCmsConfig({ schema, locales: ['es', 'en'] })

const media = (n: number, alt: Record<string, string>): MediaItemType => ({
  id: ID(n), path: `sitio/${n}.webp`, url: `https://cdn.test/${n}.webp`, filename: `${n}.webp`, folder: 'sitio', alt, caption: {},
  mime: 'image/webp', size: 100, width: 1200, height: 800, focalX: 0.3, focalY: null, blurDataUrl: null, createdAt: '', deletedAt: null
})

const refs: SiteRefsType = {
  media: new Map([[ID(1), media(1, { es: 'Fachada', en: 'Facade' })], [ID(2), media(2, { es: 'Patio' })]]),
  documents: new Map([[ID(9), { type: 'posts', slugs: { es: 'casa', en: 'house' } }]])
}

const data = {
  hero: {
    title: { es: 'Hola', en: 'Hello' },
    cover: { es: ID(1) },
    photos: { es: [ID(1), ID(2), ID(3)] },
    cta: { label: { es: 'Ver estudio', en: 'See the studio' }, link: { type: 'entry', href: '', newTab: false, entry: 'about', anchor: 'historia' }, variant: 'primary' },
    more: { type: 'entry', href: '', newTab: true, entry: 'posts', id: ID(9) },
    body: {
      es: { type: 'doc', content: [] },
      en: {
        type: 'doc',
        content: [
          { type: 'image', attrs: { mediaId: ID(2) } },
          { type: 'image', attrs: { mediaId: ID(4) } },
          { type: 'paragraph', content: [{ type: 'text', text: 'post', marks: [{ type: 'link', attrs: { href: '/blog/', entry: 'posts', id: ID(9), target: '_blank' } }] }] }
        ]
      }
    }
  }
}

describe('resolveSiteContent', () => {
  it('reads images with the alt text of the locale, falling back to the default one', () => {
    const { hero } = resolveSiteContent(config, schema.home.fields, data, 'en', refs)
    expect(hero.title).toBe('Hello')
    expect(hero.cover).toEqual({ id: ID(1), src: 'https://cdn.test/1.webp', alt: 'Facade', caption: '', width: 1200, height: 800, focalX: 0.3, focalY: null, blurDataUrl: null })
    expect(hero.photos.map(photo => photo.alt)).toEqual(['Facade', 'Patio'])
  })

  it('resolves links to pages and documents to their URL in each locale', () => {
    const es = resolveSiteContent(config, schema.home.fields, data, 'es', refs).hero
    const en = resolveSiteContent(config, schema.home.fields, data, 'en', refs).hero
    expect(es.cta).toEqual({ label: 'Ver estudio', variant: 'primary', link: { href: '/estudio#historia', newTab: false, external: false } })
    expect(en.cta.link.href).toBe('/en/studio#historia')
    expect(es.more).toEqual({ href: '/blog/casa', newTab: true, external: false })
    expect(en.more.href).toBe('/en/blog/house')
  })

  it('leaves a link to something that is not on the site without a URL', () => {
    const missing = { ...data, hero: { ...data.hero, more: { type: 'entry', href: '', newTab: false, entry: 'posts', id: ID(8) } } }
    expect(resolveSiteContent(config, schema.home.fields, missing, 'es', refs).hero.more.href).toBe('')
  })

  it('resolves the images and links inside rich text', () => {
    const body = resolveSiteContent(config, schema.home.fields, data, 'en', refs).hero.body
    expect(body?.content).toEqual([
      { type: 'image', attrs: { mediaId: ID(2), src: 'https://cdn.test/2.webp', alt: 'Patio', width: 1200, height: 800, caption: '' } },
      { type: 'paragraph', content: [{ type: 'text', text: 'post', marks: [{ type: 'link', attrs: { href: '/en/blog/house', target: '_blank' } }] }] }
    ])
  })

  it('turns email and phone links into mailto and tel', () => {
    const contact = { ...data, hero: { ...data.hero, more: { type: 'tel', href: '+54 9 351 555-0000', newTab: false } } }
    expect(resolveSiteContent(config, schema.home.fields, contact, 'es', refs).hero.more.href).toBe('tel:+5493515550000')
  })
})
