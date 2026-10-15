import { describe, expect, it } from 'vitest'
import { defineCmsConfig, textContext } from '../config'
import { buildDefaults } from '../defaults'
import { collection, page } from '../define'
import { diffContent } from '../diff'
import { documentTitle } from '../entries'
import { section, select, text } from '../fields'
import { msg, resolveText } from '../text'
import { validateContent } from '../validation'
import { fieldLabel } from '../walk'

const schema = {
  home: page({ es: 'Inicio', en: 'Home' }, {
    hero: section({ es: 'Portada', en: 'Hero' }, {
      title: text({ label: { es: 'Título', en: 'Title' }, maxLength: 5 }),
      code: text({ label: 'Código', pattern: /^\d+$/, patternMessage: { es: 'Solo números', en: 'Numbers only' } }),
      tone: select({ label: 'Tono', options: [{ label: { es: 'Claro', en: 'Light' }, value: 'light' }] })
    })
  }, { path: '/' }),
  posts: collection('Blog', { title: text({ label: 'Título' }) }, { singularLabel: { es: 'Artículo', en: 'Post' }, titleField: 'title' })
}

const spanish = defineCmsConfig({ schema, locales: ['es', 'en'] })
const english = defineCmsConfig({ schema, locales: ['es', 'en'], panelLocale: 'en' })

describe('resolveText', () => {
  const ctx = textContext(english)

  it('reads plain texts, per-language texts and catalog messages', () => {
    expect(resolveText('Fijo', ctx)).toBe('Fijo')
    expect(resolveText({ es: 'Hola', en: 'Hello' }, ctx)).toBe('Hello')
    expect(resolveText(msg('collection.new', { name: 'post' }), ctx)).toBe('New post')
    expect(resolveText(undefined, ctx)).toBe('')
  })

  it('falls back to the default locale, then to any value', () => {
    expect(resolveText({ es: 'Hola' }, ctx)).toBe('Hola')
    expect(resolveText({ pt: 'Olá' }, ctx)).toBe('Olá')
  })
})

describe('schema texts in the panel language', () => {
  it('labels paths and diffs', () => {
    expect(fieldLabel(schema.home.fields, 'hero.title', textContext(english))).toBe('Hero › Title')
    expect(fieldLabel(schema.home.fields, 'seo.title', textContext(english))).toBe('How it looks on Google and when shared › Title for Google')
    expect(fieldLabel(schema.home.fields, 'seo.title', textContext(spanish))).toBe('Cómo aparece en Google y al compartir › Título para Google')

    const before = buildDefaults(english, schema.home.fields)
    const after = { ...before, hero: { ...before.hero, tone: 'light' } }
    expect(diffContent(english, schema.home.fields, before, after)).toEqual([{ path: 'hero.tone', label: 'Hero › Tono', current: '—', version: 'Light' }])
  })

  it('writes validation messages, including the schema ones, in the asked language', async () => {
    const data = { hero: { title: 'Muy largo', code: 'abc' } }
    expect((await validateContent(english, schema.home.fields, data)).errors).toEqual({ 'hero.title': 'Use up to 5 characters', 'hero.code': 'Numbers only' })
    expect((await validateContent(english, schema.home.fields, data, { locale: 'es' })).errors).toEqual({ 'hero.title': 'Usá hasta 5 caracteres', 'hero.code': 'Solo números' })
  })

  it('names untitled documents with the collection name', () => {
    expect(documentTitle(schema.posts, { title: ' ' }, textContext(english))).toBe('Untitled Post')
    expect(documentTitle(schema.posts, { title: 'Hola' }, textContext(spanish))).toBe('Hola')
  })
})
