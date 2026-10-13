import { describe, expect, it } from 'vitest'
import slugify from '../slugify'

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
