import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Config } from 'tailwindcss'

const STYLES = fileURLToPath(new URL('../styles.css', import.meta.url))

let project: string
let cmsPreset: Config

// The project's own tailwind.config: the preset (for the package's @apply) and its site sources only.
const siteConfig = () => ({ presets: [cmsPreset], content: [join(project, 'src/site/**/*.tsx')] })

beforeAll(async () => {
  // A plain specifier keeps the JavaScript preset out of the type check.
  cmsPreset = (await import('../../../../tailwind/preset.js' as string) as { default: Config }).default
  project = await mkdtemp(join(tmpdir(), 'cms-styles-'))
  await mkdir(join(project, 'src', 'cms', 'fields'), { recursive: true })
  await mkdir(join(project, 'src', 'site'), { recursive: true })
  await writeFile(join(project, 'src', 'cms', 'fields', 'ColorInput.tsx'), 'export const ColorInput = () => <input className=\'w-[3.25rem]\' />\n')
  await writeFile(join(project, 'src', 'site', 'Hero.tsx'), 'export const Hero = () => <h1 className=\'tracking-[0.3em]\' />\n')
  vi.spyOn(process, 'cwd').mockReturnValue(project)
})

afterAll(async () => {
  vi.restoreAllMocks()
  await rm(project, { recursive: true, force: true })
})

const compile = async (css: string, from: string) => (await postcss([tailwindcss(siteConfig())]).process(css, { from })).css

describe('panel stylesheet', () => {
  it('compiles with its own config: the panel classes and the project inputs, never the site', async () => {
    const css = await compile((await readFile(STYLES, 'utf8')).replace(/^@import .*$/m, ''), STYLES)
    expect(css).toContain('.cms-text-regular-14')
    expect(css).toContain('.bg-cms-surface')
    expect(css).toContain('.w-\\[3\\.25rem\\]')
    expect(css).not.toContain('tracking-\\[0\\.3em\\]')
  })

  it('leaves the panel classes out of the site stylesheet', async () => {
    const css = await compile('@tailwind components;\n@tailwind utilities;\n', join(project, 'src', 'site', 'site.css'))
    expect(css).toContain('.tracking-\\[0\\.3em\\]')
    expect(css).not.toContain('cms-')
    expect(css).not.toContain('3\\.25rem')
  })
})
