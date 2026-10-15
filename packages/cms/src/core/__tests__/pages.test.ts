import { describe, expect, it } from 'vitest'
import { section, text } from '../fields'
import { changedSections, countBySection, sectionSummary } from '../pages'

describe('sectionSummary', () => {
  it('prefers the title and falls back to the first filled-in text', () => {
    expect(sectionSummary({ eyebrow: 'Antes', title: 'Quiénes somos' })).toBe('Quiénes somos')
    expect(sectionSummary({ title: ' ', badge: 'Blog', text: 'Notas' })).toBe('Blog')
    expect(sectionSummary({ ctaTitle: 'Conocé cada\nespecialidad' })).toBe('Conocé cada especialidad')
    expect(sectionSummary({ items: [] })).toBe('')
    expect(sectionSummary(null)).toBe('')
  })
})

describe('countBySection', () => {
  it('groups error paths by their section', () => {
    expect(countBySection(['hero.title', 'hero.image', 'seo.title', 'quienes.paragraphs.0.text'])).toEqual({ hero: 2, seo: 1, quienes: 1 })
  })
})

describe('changedSections', () => {
  it('lists the sections whose draft differs from the published page', () => {
    const fields = {
      hero: section('Portada', { title: text({ label: 'Título' }) }),
      porque: section('Por qué', { title: text({ label: 'Título' }) }, { hideable: true }),
      contacto: section('Contacto', { title: text({ label: 'Título' }) })
    }
    const published = { hero: { title: 'Hola' }, contacto: { title: 'Contacto' } }
    const draft = { ...published, hero: { title: 'Chau' }, porque: { _hidden: true } }
    expect(changedSections(fields, draft, published).map(({ key }) => key)).toEqual(['hero', 'porque'])
    expect(changedSections(fields, published, published)).toEqual([])
  })
})
