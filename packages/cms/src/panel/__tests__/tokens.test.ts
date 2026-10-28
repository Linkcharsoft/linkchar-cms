import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contrastRatio, MIN_TEXT_CONTRAST } from '../../core/contrast'

const css = readFileSync(fileURLToPath(new URL('../theme/tokens.css', import.meta.url)), 'utf8')
const token = (name: string) => {
  const value = new RegExp(`--cms-${name}:\\s*(#[\\da-f]{6});`, 'i').exec(css)?.[1]
  if (!value) throw new Error(`--cms-${name} is not a hex color in tokens.css`)
  return value
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

describe('brand tokens', () => {
  it.each(PAIRS)('%s on %s reaches AA', (text, ground) => {
    expect(contrastRatio(token(text), token(ground))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it('lives on .CmsRoot, out of reach of a project :root', () => {
    expect(css).toMatch(/^\.CmsRoot \{/m)
  })
})
