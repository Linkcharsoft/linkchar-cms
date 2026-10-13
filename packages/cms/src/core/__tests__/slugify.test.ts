import { describe, expect, it } from 'vitest'
import slugify, { typingSlug } from '../slugify'

describe('typingSlug', () => {
  it('keeps a trailing dash while the user types', () => {
    expect(typingSlug('Hola ')).toBe('hola-')
    expect(typingSlug('Año  nuevo')).toBe('ano-nuevo')
  })
})

describe('slugify', () => {
  it('removes accents, ñ and symbols', () => {
    expect(slugify('Niñez y Adolescencia: ¿cuándo consultar?')).toBe('ninez-y-adolescencia-cuando-consultar')
  })

  it('collapses separators and trims dashes', () => {
    expect(slugify('  --Salud   mental--  ')).toBe('salud-mental')
  })

  it('caps the length without leaving a trailing dash', () => {
    const result = slugify(`${'a'.repeat(79)} b`)
    expect(result.length).toBeLessThanOrEqual(80)
    expect(result.endsWith('-')).toBe(false)
  })
})
