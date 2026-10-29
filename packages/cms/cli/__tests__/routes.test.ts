import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PANEL_SEGMENTS } from '../../src/core/paths'
import { checkProxy, loadConfig, MARKER, syncRoutes } from '../routes.js'

let root: string
let sourceDir: string
let configFile: string

const config = (paths: Partial<typeof DEFAULT_PANEL_SEGMENTS> = {}, basePath = '/dashboard') =>
  ({ basePath, paths: { ...DEFAULT_PANEL_SEGMENTS, ...paths } })

const sync = (options: { paths?: Partial<typeof DEFAULT_PANEL_SEGMENTS>, basePath?: string, write?: boolean } = {}) =>
  syncRoutes({ sourceDir, configFile, config: config(options.paths, options.basePath), write: options.write })

const read = (file: string) => readFile(join(sourceDir, file), 'utf8')

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cms-routes-'))
  sourceDir = join(root, 'src')
  configFile = join(root, 'cms.config.ts')
  await mkdir(sourceDir, { recursive: true })
})

afterEach(() => rm(root, { recursive: true, force: true }))

describe('syncRoutes', () => {
  it('writes the panel wiring under basePath with imports relative to each file', async () => {
    const changes = await sync()
    expect(changes.every(change => change.status === 'added')).toBe(true)

    const login = await read('app/(cms)/dashboard/(auth)/login/page.tsx')
    expect(login.startsWith(MARKER)).toBe(true)
    expect(login).toContain('import { cms } from \'../../../../../cms/server\'')
    expect(login).toContain('export const metadata = route.metadata')
    expect(await read('app/(cms)/dashboard/auth/signout/route.ts')).toContain('export const GET = cms.handlers.signout')
    expect(await read('app/api/cms/build-status/route.ts')).toContain('export const GET = cms.handlers.buildStamp\nexport const POST = cms.handlers.buildStatus')
    expect(await read('app/(cms)/dashboard/(auth)/auth/confirm/page.tsx')).toContain('@linkcharsoft/cms/panel/routes/confirm-link')
    expect(existsSync(join(sourceDir, 'app/(cms)/dashboard/auth/confirm'))).toBe(false)
    expect(await read('cms/actions.ts')).toMatch(/^\/\/ Generated[^\n]*\n'use server'\n/)
    expect(await read('cms/client.ts')).toContain('import cmsConfig from \'../../cms.config\'')
    expect(await read('app/(cms)/layout.tsx')).not.toContain(MARKER)
    expect(await read('app/(cms)/dashboard/(panel)/error.tsx')).toMatch(/^\/\/ Generated[^\n]*\n'use client'\n/)
    expect(await read('app/(cms)/dashboard/(panel)/not-found.tsx')).toContain('@linkcharsoft/cms/panel/routes/not-found')
    expect(await read('app/(cms)/dashboard/(panel)/(workspace)/[...notFound]/page.tsx')).toContain('notFound()')
    expect(await read('app/(cms)/dashboard/(panel)/(workspace)/colecciones/[entry]/[id]/loading.tsx')).toContain('routes/loading-editor')
  })

  it('changes nothing on a second run', async () => {
    await sync()
    expect((await sync()).filter(change => change.status !== 'same' && change.status !== 'kept')).toEqual([])
  })

  it('follows the configured segments and removes the routes left behind', async () => {
    await sync()
    const changes = await sync({ paths: { login: 'ingresar' } })
    expect(changes).toContainEqual({ file: 'app/(cms)/dashboard/(auth)/ingresar/page.tsx', status: 'added' })
    expect(changes).toContainEqual({ file: 'app/(cms)/dashboard/(auth)/login/page.tsx', status: 'removed' })
    expect(existsSync(join(sourceDir, 'app/(cms)/dashboard/(auth)/login'))).toBe(false)
  })

  it('never touches files the project owns', async () => {
    await sync()
    await writeFile(join(sourceDir, 'app/(cms)/layout.tsx'), 'export default function Layout () { return null }\n')
    await writeFile(join(sourceDir, 'app/(cms)/dashboard/(auth)/login/page.tsx'), 'export default function Mine () { return null }\n')
    await mkdir(join(sourceDir, 'app/(cms)/dashboard/(panel)/estadisticas'), { recursive: true })
    await writeFile(join(sourceDir, 'app/(cms)/dashboard/(panel)/estadisticas/page.tsx'), 'export default function Stats () { return null }\n')

    const changes = await sync({ paths: { login: 'ingresar' } })
    expect(changes).toContainEqual({ file: 'app/(cms)/layout.tsx', status: 'kept' })
    expect(await read('app/(cms)/dashboard/(auth)/login/page.tsx')).toContain('Mine')
    expect(await read('app/(cms)/dashboard/(panel)/estadisticas/page.tsx')).toContain('Stats')
  })

  it('only reports in check mode', async () => {
    const changes = await sync({ write: false })
    expect(changes.length).toBeGreaterThan(0)
    expect(existsSync(join(sourceDir, 'app'))).toBe(false)
  })

  it('nests a deeper basePath', async () => {
    await sync({ basePath: '/admin/cms' })
    expect(await read('app/(cms)/admin/cms/(auth)/login/page.tsx')).toContain('../../../../../../cms/server')
  })
})

describe('checkProxy', () => {
  it('asks for a matcher that covers basePath', async () => {
    expect(await checkProxy({ sourceDir, basePath: '/dashboard' })).toBe('missing')
    await writeFile(join(sourceDir, 'proxy.ts'), 'export const config = { matcher: [\'/admin/:path*\'] }\n')
    expect(await checkProxy({ sourceDir, basePath: '/dashboard' })).toBe('stale')
    expect(await checkProxy({ sourceDir, basePath: '/admin' })).toBe('ok')
  })
})

describe('loadConfig', () => {
  it('reads a project config that imports the package source', async () => {
    const loaded = await loadConfig(fileURLToPath(new URL('../../../../apps/playground/cms.config.ts', import.meta.url)))
    expect(loaded.basePath).toBe('/dashboard')
    expect(loaded.paths.pages).toBe('paginas')
  })

  it('explains a missing config', async () => {
    await expect(loadConfig(join(root, 'nope.ts'))).rejects.toThrow('pass --config')
  })
})
