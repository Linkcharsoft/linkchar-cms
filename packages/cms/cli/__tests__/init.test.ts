import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initProject, nextSteps, normalizeBasePath } from '../init.js'
import { translatorOf } from '../templates.js'

let root: string
let paths: { root: string, sourceDir: string, configFile: string }

const options = { name: 'Acme', basePath: '/cms', locales: ['es', 'en'], panelLocale: 'es', siteUrl: 'http://localhost:3000' }

const init = async (overrides: Partial<typeof options> = {}) => initProject({ ...options, ...overrides }, { ...paths, t: await translatorOf(overrides.panelLocale ?? 'es') })

const read = (file: string) => readFile(join(root, file), 'utf8')

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cms-init-'))
  paths = { root, sourceDir: join(root, 'src'), configFile: join(root, 'cms.config.ts') }
})

afterEach(() => rm(root, { recursive: true, force: true }))

describe('initProject', () => {
  it('writes a project that reads its site defaults, registers its database and serves the panel under basePath', async () => {
    const changes = await init()
    expect(changes.every(change => change.status === 'added')).toBe(true)
    expect(changes.map(change => change.file)).toEqual(expect.arrayContaining([
      'cms.config.ts', 'src/cms/schema.ts', 'src/cms/server.ts', 'src/types/supabase.ts', 'src/app/(cms)/layout.tsx',
      'src/app/(site)/layout.tsx', 'src/app/(site)/page.tsx', 'src/app/(site)/not-found.tsx', 'src/app/(site)/[...notFound]/page.tsx',
      'src/app/sitemap.ts', 'src/proxy.ts'
    ]))

    const config = await read('cms.config.ts')
    expect(config).toContain('import { schema } from \'./src/cms/schema\'')
    expect(config).toContain('basePath: \'/cms\',')
    expect(config).toContain('locales: [\'es\', \'en\'],')
    expect(config).toContain('titleTemplate: \'%s | Acme\',')
    expect(config).toContain('defaults: { entry: \'settings\', description: \'tagline\', image: \'shareImage\' }')
    expect(config).toContain('    database: Database')
    expect(await read('src/cms/server.ts')).toContain('import cmsConfig from \'../../cms.config\'')
    expect(await read('src/proxy.ts')).toContain('export const config = { matcher: [\'/cms/:path*\'] }')
    expect(await read('src/app/(site)/layout.tsx')).toContain('<DraftRefresh locale=\'es\' />')
    expect(await read('src/app/(cms)/layout.tsx')).toContain('import { cms } from \'../../cms/server\'')
  })

  it('labels the starter schema in the panel language', async () => {
    await init({ panelLocale: 'en' })
    const schema = await read('src/cms/schema.ts')
    expect(schema).toContain('settings: singleton(\'Site settings\', {')
    expect(schema).toContain('hero: section(\'Hero\', {')
    expect(await read('src/app/(site)/not-found.tsx')).toContain('<h1>{\'We could not find this page\'}</h1>')
  })

  it('leaves what the project already has and says what to wire by hand', async () => {
    await mkdir(join(root, 'src', 'app', '(landing)'), { recursive: true })
    await writeFile(join(root, 'src', 'app', 'layout.tsx'), 'export default function Layout () {}\n')
    await writeFile(join(root, 'src', 'app', '(landing)', 'page.tsx'), 'export default function Page () {}\n')
    await writeFile(join(root, 'src', 'proxy.ts'), 'export const proxy = () => {}\n')

    const changes = await init()
    const files = changes.map(change => change.file)
    expect(files).not.toContain('src/app/(site)/layout.tsx')
    expect(files).not.toContain('src/app/(site)/page.tsx')
    expect(changes.find(change => change.file === 'src/proxy.ts')?.status).toBe('kept')
    expect(await read('src/proxy.ts')).toBe('export const proxy = () => {}\n')

    const steps = nextSteps(options, paths, changes)
    expect(steps[0]).toContain('src/proxy.ts exists: send /cms requests to cms.proxy and add \'/cms/:path*\' to its matcher.')
    expect(steps[1]).toContain('Move src/app/layout.tsx with the site\'s pages into app/(site)/')
  })

  it('leaves the site to a root layout under a dynamic segment', async () => {
    await mkdir(join(root, 'src', 'app', '[lang]'), { recursive: true })
    await writeFile(join(root, 'src', 'app', '[lang]', 'layout.tsx'), 'export default function Layout () {}\n')

    const changes = await init()
    expect(changes.filter(change => change.file.includes('(site)'))).toEqual([])
    expect(changes.map(change => change.file)).toEqual(expect.arrayContaining(['src/app/(cms)/layout.tsx', 'src/app/sitemap.ts']))
    expect(await read('cms.config.ts')).toContain('  prefixDefaultLocale: true,')

    const steps = nextSteps(options, paths, changes)
    expect(steps[0]).toContain('src/app/[lang]/layout.tsx is the site\'s root layout: render <DraftRefresh locale=\'es\' /> there')
    expect(steps.join('\n')).not.toContain('into app/(site)/')
  })

  it('does nothing twice', async () => {
    await init()
    expect((await init()).every(change => change.status === 'kept')).toBe(true)
  })

  it('takes the base path with or without its slash and explains one the shell rewrote', () => {
    expect(normalizeBasePath('cms')).toBe('/cms')
    expect(normalizeBasePath('/cms')).toBe('/cms')
    expect(() => normalizeBasePath('C:/Program Files/Git/cms')).toThrow('pass it without the slash, --base-path cms')
  })

  it('refuses options it would write wrong', async () => {
    await expect(init({ name: ' ' })).rejects.toThrow('--name is required')
    await expect(init({ basePath: 'cms' })).rejects.toThrow('--base-path "cms"')
    await expect(init({ locales: ['es', 'english'] })).rejects.toThrow('--locales')
    await expect(init({ panelLocale: 'fr' })).rejects.toThrow('--panel-locale "fr"')
    await expect(init({ siteUrl: 'acme.com' })).rejects.toThrow('--site-url')
  })
})
