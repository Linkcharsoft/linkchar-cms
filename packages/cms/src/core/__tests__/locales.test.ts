import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineCmsConfig } from '../config'
import { buildDefaults, withDefaults } from '../defaults'
import { diffContent } from '../diff'
import { block, blocks, button, image, list, number, richText, section, text } from '../fields'
import { openingHours } from '../kinds/openingHours'
import { mergePatch } from '../merge'
import { documentReferences } from '../references'
import { localeProgress, missingTranslations, resolveContent } from '../translations'
import { validateContent } from '../validation'
import type { StoredValuesOf, ValuesOf } from '../infer'
import type { ButtonValueType } from '../kinds/button'

const fields = {
  hero: section('Portada', {
    title: text({ label: 'Título', required: true, maxLength: 12, default: { es: 'Hola', en: 'Hello' } }),
    subtitle: text({ label: 'Bajada', default: 'Solo en español' }),
    cover: image({ label: 'Imagen' }),
    cta: button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }] }),
    code: text({ label: 'Código interno', localized: false }),
    price: number({ label: 'Precio' })
  }),
  items: list({ label: 'Servicios' }, { name: text({ label: 'Nombre' }), photo: image({ label: 'Foto' }) }),
  extra: blocks({ label: 'Bloques' }, { texto: block('Texto', { body: richText({ label: 'Texto' }) }) }),
  hours: openingHours({ label: 'Horarios' })
}

const config = defineCmsConfig({ schema: {}, locales: ['es', 'en'], fields: [openingHours] })
const single = defineCmsConfig({ schema: {}, fields: [openingHours] })

const ID = { es: '6f1c3b2a-1111-4c1d-9e0f-000000000001', en: '6f1c3b2a-1111-4c1d-9e0f-000000000002' }
const doc = (value: string) => ({ type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })

const filled = () => {
  const data = buildDefaults(config, fields)
  data.hero.title = { es: 'Hola', en: 'Hello' }
  data.hero.subtitle = { es: 'Bajada', en: 'Subtitle' }
  data.hero.cta = { label: { es: 'Ver obras', en: 'See work' }, link: { type: 'internal', href: '/obras', newTab: false }, variant: 'primary' }
  data.hero.cover = { es: ID.es }
  return data
}

describe('storage', () => {
  it('keeps one value per locale for texts and only the original for images', () => {
    const data = buildDefaults(config, fields)
    expect(data.hero).toMatchObject({
      title: { es: 'Hola', en: 'Hello' },
      subtitle: { es: 'Solo en español', en: '' },
      cover: { es: null },
      cta: { label: { es: '', en: '' }, variant: 'primary' },
      code: '',
      price: null
    })
    expect(data.hours.note).toEqual({ es: '', en: '' })
  })

  it('types the stored shape and the shape the site reads', () => {
    type Stored = StoredValuesOf<typeof fields>
    expectTypeOf<Stored['hero']['title']>().toEqualTypeOf<{ [locale: string]: string }>()
    expectTypeOf<Stored['hero']['code']>().toEqualTypeOf<string>()
    expectTypeOf<Stored['hero']['cta']['label']>().toEqualTypeOf<{ [locale: string]: string }>()
    expectTypeOf<Stored['hero']['cta']['variant']>().toEqualTypeOf<'primary'>()

    type Read = ValuesOf<typeof fields>
    expectTypeOf<Read['hero']['title']>().toEqualTypeOf<string>()
    expectTypeOf<Read['hero']['cta']>().toEqualTypeOf<ButtonValueType<'primary'>>()
    expectTypeOf<Read['items'][number]['photo']>().toEqualTypeOf<string | null>()
  })

  it('moves values saved before localizing to the default locale and drops unknown locales', () => {
    const value = withDefaults(config, fields, {
      hero: { title: 'Viejo', cta: { label: 'Turnos', link: { type: 'internal', href: '/turnos' } }, cover: ID.es, code: { es: 'A1' } },
      items: [{ _key: 'k', name: { es: 'Uno', en: 'One', fr: 'Un' }, photo: { es: ID.es, en: ID.en } }]
    })
    expect(value.hero.title).toEqual({ es: 'Viejo', en: 'Hello' })
    expect(value.hero.cta.label).toEqual({ es: 'Turnos', en: '' })
    expect(value.hero.cover).toEqual({ es: ID.es })
    expect(value.hero.code).toBe('A1')
    expect(value.items[0]).toEqual({ _key: 'k', name: { es: 'Uno', en: 'One' }, photo: { es: ID.es, en: ID.en } })
  })

  it('stores a single-locale project the same way, with one key', () => {
    expect(buildDefaults(single, fields).hero.title).toEqual({ es: 'Hola' })
  })
})

describe('resolveContent', () => {
  it('reads every value in the asked locale', () => {
    const data = filled()
    data.items = [{ _key: 'k', name: { es: 'Uno', en: 'One' }, photo: { es: ID.es, en: ID.en } }]
    const en = resolveContent(config, fields, data, 'en')

    expect(en.hero).toMatchObject({ title: 'Hello', cover: ID.es, cta: { label: 'See work', link: { href: '/obras' } } })
    expect(en.items).toEqual([{ _key: 'k', name: 'One', photo: ID.en }])
    expect(resolveContent(config, fields, data).hero.title).toBe('Hola')
  })

  it('falls back to the default locale for what is still missing', () => {
    const data = filled()
    data.hero.title = { es: 'Hola', en: '' }
    data.extra = [{ _key: 'b', _type: 'texto', body: { es: doc('Texto'), en: null } }]
    const en = resolveContent(config, fields, data, 'en')
    expect(en.hero.title).toBe('Hola')
    expect(en.extra[0].body).toEqual(doc('Texto'))
  })

  it('rejects a locale the project does not have', () => {
    expect(() => resolveContent(config, fields, {}, 'fr')).toThrow('"fr" is not one of the locales')
  })
})

describe('missingTranslations', () => {
  it('lists texts filled in the default locale and empty in another', () => {
    const data = filled()
    data.hero.subtitle = { es: 'Bajada', en: ' ' }
    data.hero.cta.label = { es: 'Ver obras', en: '' }
    data.items = [{ _key: 'k', name: { es: 'Uno', en: '' }, photo: { es: null } }]
    data.extra = [{ _key: 'b', _type: 'texto', body: { es: doc('Texto'), en: doc(' ') } }]
    data.hours.note = { es: 'Feriados cerrado', en: '' }

    const missing = missingTranslations(config, fields, data)
    expect(missing.map(item => item.path)).toEqual([
      'hero.subtitle.en',
      'hero.cta.label.en',
      'items.0.name.en',
      'extra.0.body.en',
      'hours.note.en'
    ])
    expect(localeProgress(config, missing)).toEqual({ en: 5 })
  })

  it('never counts inherited images or empty originals', () => {
    const data = filled()
    data.hero.subtitle = { es: '', en: '' }
    expect(missingTranslations(config, fields, data)).toEqual([])
    expect(missingTranslations(single, fields, data)).toEqual([])
  })

  it('checks the alt text of the images in use, inherited ones included', () => {
    const data = filled()
    const alts: Record<string, Record<string, string>> = { [ID.es]: { es: 'Fachada', en: '' }, [ID.en]: { es: 'Fachada', en: 'Front' } }
    expect(missingTranslations(config, fields, data, { mediaAlt: id => alts[id] })).toEqual([{ path: 'hero.cover', locale: 'en', kind: 'alt' }])

    data.hero.cover = { es: ID.es, en: ID.en }
    expect(missingTranslations(config, fields, data, { mediaAlt: id => alts[id] })).toEqual([])
  })
})

describe('validation per locale', () => {
  it('blocks publishing with what is missing in each locale', async () => {
    const data = filled()
    data.hero.subtitle = { es: 'Bajada', en: '' }
    expect((await validateContent(config, fields, data, { mode: 'publish' })).errors).toEqual({ 'hero.subtitle.en': 'Falta en Inglés' })
    expect((await validateContent(config, fields, data, { mode: 'draft' })).errors).toBeNull()
  })

  it('requires the default locale and checks formats in every locale', async () => {
    const data = filled()
    data.hero.title = { es: '', en: 'A title far too long' }
    expect((await validateContent(config, fields, data, { mode: 'publish' })).errors).toEqual({
      'hero.title.es': 'Este campo es obligatorio',
      'hero.title.en': 'Usá hasta 12 caracteres'
    })
  })

  it('checks image overrides like the original', async () => {
    const data = filled()
    data.hero.cover = { es: ID.es, en: 'not-an-id' }
    expect((await validateContent(config, fields, data)).errors).toEqual({ 'hero.cover.en': 'Archivo inválido' })
  })
})

describe('the rest of the engine with locale maps', () => {
  it('diffs each locale with its name', () => {
    const before = filled()
    const after = { ...before, hero: { ...before.hero, title: { es: 'Hola', en: 'Hi' }, cta: { ...before.hero.cta, label: { es: 'Ver', en: 'See work' } } } }
    expect(diffContent(config, fields, before, after)).toEqual([
      { path: 'hero.title.en', label: 'Portada › Título (Inglés)', current: 'Hello', version: 'Hi' },
      { path: 'hero.cta', label: 'Portada › Botón', current: 'Ver obras → /obras', version: 'Ver → /obras' }
    ])
  })

  it('collects media from every locale', () => {
    const data = filled()
    data.hero.cover = { es: ID.es, en: ID.en }
    expect(documentReferences(config, fields, data).media).toEqual([ID.es, ID.en])
  })

  it('merges by section even when only one locale changed', () => {
    const base = filled()
    const current = { ...base, items: [{ _key: 'k', name: { es: 'Otro', en: '' }, photo: { es: null } }] }
    const patch = { hero: { ...base.hero, title: { es: 'Hola', en: 'Hi' } } }
    expect(mergePatch(current, patch, base)).toMatchObject({ status: 'merged', data: { hero: { title: { en: 'Hi' } }, items: current.items } })
    expect(mergePatch(current, { items: base.items }, base)).toEqual({ status: 'conflict', keys: ['items'] })
  })
})
