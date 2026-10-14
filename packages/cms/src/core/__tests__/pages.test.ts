import { describe, expect, it } from 'vitest'
import { countBySection, sectionSummary } from '../pages'

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
