import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../config'
import { buildDefaults } from '../defaults'
import { button, email, gallery, image, list, section, text, videoFile } from '../fields'
import { missingAltLocales } from '../media'
import { countByLocale, countBySectionAndLocale, missingContent, splitLocale } from '../missing'

const config = defineCmsConfig({ schema: {}, locales: ['es', 'en'] })

const ID = { a: '6f1c3b2a-1111-4c1d-9e0f-000000000001', b: '6f1c3b2a-1111-4c1d-9e0f-000000000002' }

const fields = {
  hero: section('Portada', {
    title: text({ label: 'Título', required: true }),
    cover: image({ label: 'Imagen', required: true }),
    cta: button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }] })
  }),
  contact: section('Contacto', { email: email({ label: 'Email', required: true }) }),
  items: list({ label: 'Servicios' }, { name: text({ label: 'Nombre' }) }),
  photos: gallery({ label: 'Fotos' }),
  clip: videoFile({ label: 'Video' })
}

describe('splitLocale', () => {
  it('separates the field from the locale wherever the locale segment sits', () => {
    expect(splitLocale(config, 'hero.title.en')).toEqual({ field: 'hero.title', locale: 'en' })
    expect(splitLocale(config, 'hero.cta.label.es')).toEqual({ field: 'hero.cta.label', locale: 'es' })
    expect(splitLocale(config, 'items.0.name.en')).toEqual({ field: 'items.0.name', locale: 'en' })
    expect(splitLocale(config, 'photos.en.2')).toEqual({ field: 'photos', locale: 'en' })
    expect(splitLocale(config, 'contact.email')).toEqual({ field: 'contact.email', locale: null })
  })

  it('never reads a top-level key as a locale', () => {
    expect(splitLocale(config, 'en')).toEqual({ field: 'en', locale: null })
  })
})

describe('missingContent', () => {
  const data = () => {
    const values = buildDefaults(config, fields)
    values.hero.title = { es: 'Hola', en: '' }
    values.hero.cover = { es: ID.a }
    values.items = [{ _key: 'k1', name: { es: 'Diseño', en: '' } }]
    return values
  }

  it('lists required values, translations and alt texts with their field and locale', async () => {
    const alts: Record<string, Record<string, string>> = { [ID.a]: { es: 'Fachada' } }
    const missing = await missingContent(config, fields, data(), { mediaAlt: id => alts[id] })
    expect(missing).toEqual(expect.arrayContaining([
      { path: 'hero.title.en', field: 'hero.title', locale: 'en', kind: 'field' },
      { path: 'contact.email', field: 'contact.email', locale: null, kind: 'field' },
      { path: 'items.0.name.en', field: 'items.0.name', locale: 'en', kind: 'field' },
      { path: 'hero.cover', field: 'hero.cover', locale: 'en', kind: 'alt' }
    ]))
    expect(missing).toHaveLength(4)
  })

  it('asks for the poster of a video that has none, once, shared by every language', async () => {
    const values = { ...data(), clip: { es: ID.b, en: ID.a } }
    const missing = await missingContent(config, fields, values, { mediaPoster: id => id === ID.b })
    expect(missing.filter(item => item.kind === 'poster')).toEqual([{ path: 'clip', field: 'clip', locale: null, kind: 'poster' }])
    expect((await missingContent(config, fields, values, { mediaPoster: () => false })).some(item => item.kind === 'poster')).toBe(false)
    expect((await missingContent(config, fields, values)).some(item => item.kind === 'poster')).toBe(false)
  })

  it('leaves alt texts out without a lookup', async () => {
    expect((await missingContent(config, fields, data())).some(item => item.kind === 'alt')).toBe(false)
  })

  it('counts per locale, shared values in the default one, and per section', async () => {
    const missing = await missingContent(config, fields, data(), { mediaAlt: () => ({ es: 'Fachada' }) })
    expect(countByLocale(config, missing)).toEqual({ es: 1, en: 3 })
    expect(countBySectionAndLocale(config, missing)).toEqual({
      hero: { es: 0, en: 2 },
      contact: { es: 1, en: 0 },
      items: { es: 0, en: 1 }
    })
  })
})

describe('missingAltLocales', () => {
  it('names the locales without alt text once the default locale has one', () => {
    expect(missingAltLocales(config, { es: 'Fachada' })).toEqual(['en'])
    expect(missingAltLocales(config, { es: 'Fachada', en: ' ' })).toEqual(['en'])
    expect(missingAltLocales(config, { es: 'Fachada', en: 'Front' })).toEqual([])
    expect(missingAltLocales(config, {})).toEqual([])
  })
})
