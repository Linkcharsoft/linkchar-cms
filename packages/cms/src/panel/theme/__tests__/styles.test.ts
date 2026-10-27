import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AcceptedPlugin } from 'postcss'
import type { Config } from 'tailwindcss'

const STYLES = fileURLToPath(new URL('../styles.css', import.meta.url))

let project: string
let cmsPreset: Config
let cmsTailwind: (config: Config) => AcceptedPlugin

// The project's own tailwind.config: the preset (for the package's @apply), its site sources and its own theme.
const siteConfig = (): Config => ({
  presets: [cmsPreset],
  content: [join(project, 'src/site/**/*.tsx')],
  theme: { extend: { screens: { 'site-xs': { max: '640px' }, 'site-lg': { min: '901px' } }, colors: { 'site-ink': '#120e1c' } } }
})

beforeAll(async () => {
  // A plain specifier keeps the JavaScript preset out of the type check.
  cmsPreset = (await import('../../../../tailwind/preset.js' as string) as { default: Config }).default
  cmsTailwind = (await import('../../../../tailwind/postcss.cjs' as string) as { default: typeof cmsTailwind }).default
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

const panelStyles = async () => (await readFile(STYLES, 'utf8')).replace(/^@import .*$/m, '')

// What Sass hands PostCSS for a site module that applies the project's own screens and colors.
const SITE_MODULE = '.Gallery { @apply grid-cols-1 site-xs:grid-cols-2 site-lg:grid-cols-3 bg-site-ink/[0.92]; }\n'

describe('panel stylesheet', () => {
  it('compiles with its own config: the panel classes and the project inputs, never the site', async () => {
    const css = await compile(await panelStyles(), STYLES)
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

// Next runs every stylesheet of a build through one PostCSS processor.
describe('the Tailwind PostCSS plugin', () => {
  const siteFile = (name: string) => join(project, 'src', 'site', name)

  it('compiles the site stylesheets after the panel one with the project config', async () => {
    const processor = postcss([cmsTailwind(siteConfig())])
    const panel = (await processor.process(await panelStyles(), { from: STYLES })).css
    const module = (await processor.process(SITE_MODULE, { from: siteFile('Gallery.module.sass') })).css
    const site = (await processor.process('@tailwind utilities;\n', { from: siteFile('site.css') })).css

    expect(panel).toContain('.cms-text-regular-14')
    expect(module).toContain('@media (max-width: 640px)')
    expect(module).toContain('@media (min-width: 901px)')
    expect(module).toContain('rgb(18 14 28 / 0.92)')
    expect(site).toContain('.tracking-\\[0\\.3em\\]')
    expect(site).not.toContain('cms-')
  })

  it('compiles the panel stylesheet with its own config after a site one', async () => {
    const processor = postcss([cmsTailwind(siteConfig())])
    await processor.process(SITE_MODULE, { from: siteFile('Gallery.module.sass') })
    const panel = (await processor.process(await panelStyles(), { from: STYLES })).css

    expect(panel).toContain('.bg-cms-surface')
    expect(panel).toContain('.w-\\[3\\.25rem\\]')
    expect(panel).not.toContain('tracking-\\[0\\.3em\\]')
  })
})
