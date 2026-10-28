import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contrastRatio, MIN_TEXT_CONTRAST, MIN_UI_CONTRAST, mixOklab } from '../../core/contrast'

const css = readFileSync(fileURLToPath(new URL('../theme/tokens.css', import.meta.url)), 'utf8')
const token = (name: string) => {
  const value = new RegExp(`--cms-${name}:\\s*(#[\\da-f]{6});`, 'i').exec(css)?.[1]
  if (!value) throw new Error(`--cms-${name} is not a hex color in tokens.css`)
  return value
}

// A token derived as `color-mix(in oklab, var(--cms-x) N%, #hex)`, resolved to the hex the browser paints.
const mixed = (name: string) => {
  const match = new RegExp(`--cms-${name}:\\s*color-mix\\(in oklab, var\\(--cms-([a-z0-9-]+)\\) (\\d+)%, (#[\\da-f]{6})\\);`, 'i').exec(css)
  if (!match) throw new Error(`--cms-${name} is not an oklab mix in tokens.css`)
  return mixOklab(token(match[1]), match[3], Number(match[2]))
}

// Text over ground, as the panel pairs them.
const PAIRS: [string, string][] = [
  ['on-primary', 'primary'],
  ['primary', 'surface'],
  ['primary', 'neutral-50'],
  ['on-sidebar', 'sidebar'],
  ['on-sidebar-muted', 'sidebar'],
  ['accent', 'sidebar'],
  ['ink-900', 'neutral-50'],
  ['ink-600', 'neutral-100'],
  ['ink-500', 'neutral-50']
]

// The focus ring sits on the input's surface and on the page grounds around it.
const RING_GROUNDS = ['surface', 'neutral-50', 'neutral-100']

describe('brand tokens', () => {
  it.each(PAIRS)('%s on %s reaches AA', (text, ground) => {
    expect(contrastRatio(token(text), token(ground))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it.each(RING_GROUNDS)('the focus ring reaches 3:1 on %s', ground => {
    expect(contrastRatio(mixed('primary-ring'), token(ground))).toBeGreaterThanOrEqual(MIN_UI_CONTRAST)
  })

  it('lives on .CmsRoot, out of reach of a project :root', () => {
    expect(css).toMatch(/^\.CmsRoot \{/m)
  })
})
