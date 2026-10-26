import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import { collection, page } from '../../core/define'
import { section, slug, text } from '../../core/fields'
import { importSlug, processImage } from '../import'

const config = defineCmsConfig({
  schema: {
    home: page('Inicio', { hero: section('Portada', { title: text({ label: 'Título' }) }) }, { path: '/' }),
    posts: collection('Blog', { title: text({ label: 'Título' }), slug: slug({ label: 'Dirección', from: 'title' }) },
      { singularLabel: 'Artículo', titleField: 'title', slugField: 'slug', path: '/blog/:slug' })
  },
  locales: ['es', 'en']
})

const photo = (width: number, height: number, format: 'png' | 'jpeg' | 'gif') =>
  sharp({ create: { width, height, channels: 3, background: '#1f5fa8' } }).toFormat(format).toBuffer()

describe('processImage', () => {
  it('fits the image within 2560 px as WebP with a blur preview, like the panel uploader', async () => {
    const result = await processImage(await photo(3200, 1600, 'png'), 'image/png')
    expect(result).toMatchObject({ mime: 'image/webp', width: 2560, height: 1280 })
    expect(result.blurDataUrl).toMatch(/^data:image\/webp;base64,/)
    expect((await sharp(result.data).metadata()).format).toBe('webp')
  })

  it('turns phone photos upright and drops their metadata', async () => {
    const tagged = await sharp(await photo(40, 20, 'jpeg')).withMetadata({ orientation: 6 }).jpeg().toBuffer()
    const result = await processImage(tagged, 'image/jpeg')
    expect([result.width, result.height]).toEqual([20, 40])
    const metadata = await sharp(result.data).metadata()
    expect(metadata.orientation).toBeUndefined()
    expect(metadata.exif).toBeUndefined()
  })

  it('keeps a GIF as it is', async () => {
    const gif = await photo(30, 10, 'gif')
    expect(await processImage(gif, 'image/gif')).toMatchObject({ data: gif, mime: 'image/gif', width: 30, height: 10 })
  })
})

describe('importSlug', () => {
  it('finds a collection document by the slug of the default locale', () => {
    expect(importSlug(config, 'posts', { slug: { es: 'casa', en: 'house' } })).toBe('casa')
    expect(importSlug(config, 'posts', { slug: 'casa' })).toBe('casa')
    expect(importSlug(config, 'posts', { slug: { en: 'house' } })).toBeNull()
    expect(importSlug(config, 'home', { slug: 'casa' })).toBeNull()
  })
})
