import { describe, expect, it } from 'vitest'
import { contrastRatio, MIN_TEXT_CONTRAST, mixOklab } from '../contrast'

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

describe('mixOklab', () => {
  it('returns either end at 100% and 0%', () => {
    expect(mixOklab('#6e14be', '#ffffff', 100)).toBe('#6e14be')
    expect(mixOklab('#6e14be', '#ffffff', 0)).toBe('#ffffff')
  })

  it('matches what the browser paints for color-mix(in oklab, #6e14be 55%, #ffffff)', () => {
    expect(mixOklab('#6e14be', '#ffffff', 55)).toBe('#aa8be0')
  })
})
