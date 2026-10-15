import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineCmsConfig } from '../config'
import { buildDefaults } from '../defaults'
import { singleton } from '../define'
import { diffContent } from '../diff'
import { select, text } from '../fields'
import { defineField, issue, noReferences } from '../kinds/registry'
import { validateContent } from '../validation'
import type { EntryValues } from '../define'
import type { BaseOptions } from '../fields'

interface RatingField extends BaseOptions<number> {
  kind: 'rating'
  stars: number
}

declare module '../kinds/registry' {
  interface FieldTypes<F> {
    rating: { field: RatingField, value: number, localize: false }
  }
}

const rating = defineField({
  kind: 'rating',
  localize: false,
  defaultValue: () => 0,
  normalize: value => (typeof value === 'number' ? value : 0),
  isEmpty: value => !value,
  validate: (value, field, ctx) => {
    if (typeof value !== 'number') return [issue('number')]
    if (ctx.required && value === 0) return [issue('required')]
    return value > field.stars ? [issue('max', { max: field.stars })] : []
  },
  references: noReferences,
  summarize: value => '★'.repeat(Number(value))
})

const schema = {
  review: singleton('Reseña', {
    title: text({ label: 'Título' }),
    score: rating({ label: 'Puntaje', stars: 5, required: true }),
    tone: select({ label: 'Tono', options: [{ label: 'Claro', value: 'light' }] })
  })
}

describe('defineField', () => {
  it('adds a kind without touching the package', async () => {
    const config = defineCmsConfig({ schema, fields: [rating] })
    const fields = schema.review.fields

    expect(buildDefaults(config, fields)).toEqual({ title: '', score: 0, tone: null })
    expect((await validateContent(config, fields, { score: 7 })).errors).toEqual({ score: 'El máximo es 5' })
    expect((await validateContent(config, fields, { score: 0 }, { mode: 'publish' })).errors).toEqual({ score: 'Este campo es obligatorio' })
    expect(diffContent(config, fields, { score: 2 }, { score: 4 })).toEqual([{ path: 'score', label: 'Puntaje', current: '★★', version: '★★★★' }])
  })

  it('types the values of its fields', () => {
    expectTypeOf<EntryValues<typeof schema.review>>().toEqualTypeOf<{ title: string, score: number, tone: 'light' | null }>()
  })

  it('fails at startup when a schema uses a kind that is not registered', () => {
    expect(() => defineCmsConfig({ schema })).toThrow('review.score uses the field kind "rating", which is not registered')
    expect(() => defineCmsConfig({ schema, fields: [rating, rating] })).toThrow('defined twice')
    expect(() => defineCmsConfig({ schema: {}, fields: [text] })).toThrow('defined twice')
  })

  it('makes a definition with a missing or mistyped part a type error', () => {
    const base = { ...rating }
    // @ts-expect-error summarize is missing
    defineField({ kind: 'rating', localize: false, defaultValue: base.defaultValue, normalize: base.normalize, isEmpty: base.isEmpty, validate: base.validate, references: noReferences })
    // @ts-expect-error the default does not match the declared value type
    defineField({ ...base, defaultValue: () => 'cinco' })
    // @ts-expect-error the localization does not match the declared one
    defineField({ ...base, localize: 'translate' })
    // @ts-expect-error a kind nobody declared in FieldTypes
    defineField({ ...base, kind: 'stars' })
  })

  it('rejects unknown options in a field', () => {
    // @ts-expect-error `maxlength` is not an option of text
    text({ label: 'Título', maxlength: 10 })
    // @ts-expect-error a rating needs its stars
    rating({ label: 'Puntaje' })
  })
})

describe('field options', () => {
  const schema = {
    event: singleton('Evento', {
      starts: text({ label: 'Empieza' }),
      ends: text({
        label: 'Termina',
        validate: (value, { parent }) => (value && value < String(parent.starts) ? { es: 'Tiene que ser después del inicio', en: 'Must be after the start' } : null)
      }),
      code: text({ label: 'Código', maxLength: 4, validate: async value => (value === 'USED' ? 'Ya existe' : null) }),
      notes: text({ label: 'Notas', component: () => import('./fixtures/NotesInput') })
    })
  }
  const config = defineCmsConfig({ schema })

  it('runs project validators after the kind rules, async ones too', async () => {
    const fields = schema.event.fields
    expect((await validateContent(config, fields, { starts: '2026-10', ends: '2026-01' })).errors).toEqual({ ends: 'Tiene que ser después del inicio' })
    expect((await validateContent(config, fields, { code: 'USED' })).errors).toEqual({ code: 'Ya existe' })
    expect((await validateContent(config, fields, { code: 'TAKE' })).errors).toBeNull()
    expect((await validateContent(config, fields, { code: 'TOOLONG' })).errors).toEqual({ code: 'Usá hasta 4 caracteres' })
  })

  it('types the validator with the field value', () => {
    // @ts-expect-error a text value is a string
    text({ label: 'X', validate: (value: number) => (value > 1 ? 'no' : null) })
  })

  it('keeps a custom input loader per field', async () => {
    const loaded = await schema.event.fields.notes.component()
    expect(loaded.default).toBe('NotesInput')
  })
})
