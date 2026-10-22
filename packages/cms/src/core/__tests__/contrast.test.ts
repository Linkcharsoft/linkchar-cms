import { describe, expect, it } from 'vitest'
import { contrastRatio, MIN_TEXT_CONTRAST } from '../contrast'

describe('contrastRatio', () => {
  it('goes from 1 for the same color to 21 for black on white, in either order', () => {
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1)
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5)
  })

  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
    expect(contrastRatio('#1f5fa8', '#FFFFFF')).toBeGreaterThan(MIN_TEXT_CONTRAST)
    expect(contrastRatio('#7db4f0', '#ffffff')).toBeLessThan(MIN_TEXT_CONTRAST)
  })

  it('rejects what is not a hex color', () => {
    expect(() => contrastRatio('rgb(0 0 0)', '#fff')).toThrow('is not a hex color')
    expect(() => contrastRatio('#12345', '#fff')).toThrow('"#12345"')
  })
})
