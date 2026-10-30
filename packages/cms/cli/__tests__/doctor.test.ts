import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AMPLIFY_BUILD_LINE, AMPLIFY_START_LINE, amplifyCacheCheck, amplifyReportCheck, appliedMigrationsCheck, authChecks, configPorts, environmentChecks, excludesPackageFromQuarantine, parseExcludedRanges, portChecks, postcssCheck, publishCircuitCheck, tablesCheck } from '../doctor.js'
import { KEEPALIVE_FILE, keepaliveWorkflow } from '../keepalive.js'
import { migrationVersions, PACKAGE_SUPABASE } from '../migrations.js'

const NETSH = `
Protocol tcp Port Exclusion Ranges

Start Port    End Port
----------    --------
     50000       50059     *
     54017       54116
     54417       54516

* - Administered port exclusions.
`

const TOML = `[api]
port = 54421
[db]
port = 54422
shadow_port = 54420
[inbucket]
port = 54424
# smtp_port = 54425
`

describe('ports', () => {
  it('reads the ranges Windows reserves and the ports of config.toml', () => {
    expect(parseExcludedRanges(NETSH)).toEqual([[50000, 50059], [54017, 54116], [54417, 54516]])
    expect(configPorts(TOML)).toEqual([
      { key: 'api.port', port: 54421 }, { key: 'db.port', port: 54422 }, { key: 'db.shadow_port', port: 54420 }, { key: 'inbucket.port', port: 54424 }
    ])
  })

  it('fails on a reserved port, warns on the dynamic range and passes below it', () => {
    const ranges = parseExcludedRanges(NETSH)
    expect(portChecks(configPorts(TOML), ranges)[0]).toMatchObject({ level: 'fail', text: expect.stringContaining('54421 (api.port)') })
    expect(portChecks([{ key: 'api.port', port: 54521 }], ranges)[0]).toMatchObject({ level: 'warn' })
    expect(portChecks([{ key: 'api.port', port: 44421 }], ranges)[0]).toMatchObject({ level: 'ok' })
  })
})

describe('authChecks', () => {
  const SAFE = `[auth]
enable_signup = false
minimum_password_length = 10
password_requirements = "letters_digits"
[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
`

  it('passes the settings the panel relies on', () => {
    expect(authChecks(SAFE).map(check => check.level)).toEqual(['ok', 'ok'])
  })

  it('fails on Supabase defaults: open sign-ups and no two-step verification', () => {
    const checks = authChecks(`[auth]
enable_signup = true
minimum_password_length = 6
[auth.email]
enable_signup = false
[auth.mfa.totp]
enroll_enabled = false
`)
    expect(checks.map(check => check.level)).toEqual(['fail', 'fail', 'warn'])
    expect(checks[0].text).toContain('anyone with the site URL can create a user')
    expect(authChecks('[auth]\n').map(check => check.level)).toEqual(['fail', 'fail', 'warn'])
  })
})

describe('environmentChecks', () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:44421', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk', SUPABASE_SECRET_KEY: 'sk', NODE_AUTH_TOKEN: 'x' }
  const answer = (admins: unknown[], refused: Record<string, { status: number, code: string }> = {}, publishes: { any: boolean, confirmed: boolean } = { any: false, confirmed: false }) => (async (url: string) => {
    const table = /\/rest\/v1\/(\w+)\?select=\*&limit=0$/.exec(url)?.[1]
    if (table && refused[table]) return Response.json({ code: refused[table].code, message: '' }, { status: refused[table].status })
    if (table) return Response.json([])
    if (url.includes('/rest/v1/publish_log')) return Response.json((url.includes('build_status=eq.success') ? publishes.confirmed : publishes.any) ? [{ id: 1 }] : [])
    if (url.endsWith('/rest/v1/rpc/cms_migrations')) return Response.json(await migrationVersions(join(PACKAGE_SUPABASE, 'migrations')))
    return url.includes('/rest/v1/profiles') ? Response.json(admins) : new Response('{}')
  }) as typeof fetch

  const levels = async (options: Partial<Parameters<typeof environmentChecks>[0]>, files: Record<string, string | null> = {}) => {
    const root = await mkdtemp(join(tmpdir(), 'cms-doctor-'))
    try {
      for (const [name, text] of Object.entries({ [KEEPALIVE_FILE]: keepaliveWorkflow(), ...files })) {
        if (text === null) continue
        await mkdir(dirname(join(root, name)), { recursive: true })
        await writeFile(join(root, name), text)
      }
      return await environmentChecks({ root, supabaseDir: join(root, 'supabase'), env, siteUrl: 'https://acme.com', fetch: answer([{ id: 'u1' }]), ...options })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }

  it('passes a project with its variables, its database and a superadmin', async () => {
    const checks = await levels({})
    expect(checks.filter(check => check.level !== 'ok')).toEqual([])
    expect(checks.map(check => check.text)).toContain('There is a superadmin')
  })

  it('names what is missing and the command that fixes it', async () => {
    expect((await levels({ env: { NODE_AUTH_TOKEN: 'x' }, siteUrl: null })).filter(check => check.level !== 'ok').map(check => check.text)).toEqual([
      'Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY in the environment or .env.local (--env-file picks another file)',
      'site.url is empty: the sitemap throws and canonical URLs stay relative (set NEXT_PUBLIC_SITE_URL)'
    ])
    expect((await levels({ fetch: answer([], { profiles: { status: 404, code: 'PGRST205' } }) })).find(check => check.level === 'fail')?.text)
      .toBe('Missing profiles: apply the migrations (supabase db reset locally, supabase db push hosted)')
    expect((await levels({ fetch: answer([]) })).find(check => check.level === 'fail')?.text).toBe('No superadmin yet: linkchar-cms admin --email …')
    expect((await levels({ fetch: (async () => { throw new Error('ECONNREFUSED') }) as typeof fetch })).find(check => check.level === 'fail')?.text)
      .toContain('ECONNREFUSED')
  })

  it('warns while the Supabase keepalive workflow is missing, and fails when the file would not run', async () => {
    expect((await levels({}, { [KEEPALIVE_FILE]: null })).filter(check => check.level === 'warn').map(check => check.text)).toEqual([expect.stringContaining('supabase-keepalive.yml')])
    expect((await levels({})).map(check => check.text)).toContainEqual(expect.stringContaining('keepalive workflow is in place and parses'))
    const broken = 'on:\n  schedule:\n    - cron: "0 0 * * *"\njobs:\n  ping:\n    steps:\n      - run: curl -H "apikey: x" https://db\n'
    expect((await levels({}, { [KEEPALIVE_FILE]: broken })).filter(check => check.level === 'fail').map(check => check.text)).toEqual([expect.stringContaining('will not run on GitHub: not valid YAML')])
  })

  it('names the env file it read', async () => {
    expect((await levels({ env: { NODE_AUTH_TOKEN: 'x' }, envFile: '.env.remote' }))[0].text).toContain('in the environment or .env.remote')
  })

  it('warns while amplify.yml keeps the fetch cache of the previous build', async () => {
    const keeps = 'frontend:\n  cache:\n    paths:\n      - node_modules/**/*\n      - .next/cache/**/*\n'
    const drops = `frontend:\n  phases:\n    preBuild:\n      commands:\n        - rm -rf .next/cache/fetch-cache\n        - ${AMPLIFY_START_LINE}\n    build:\n      commands:\n        - ${AMPLIFY_BUILD_LINE}\n  cache:\n    paths:\n      - .next/cache/**/*\n`
    expect(amplifyCacheCheck(keeps)).toMatchObject({ level: 'warn', text: expect.stringContaining('rm -rf .next/cache/fetch-cache') })
    expect(amplifyCacheCheck(drops)).toBeNull()
    expect(amplifyCacheCheck('frontend:\n  cache:\n    paths:\n      - node_modules/**/*\n')).toBeNull()
    expect((await levels({}, { 'amplify.yml': keeps })).filter(check => check.level === 'warn').map(check => check.text)).toEqual([expect.stringContaining('amplify.yml keeps .next/cache')])
    expect((await levels({}, { 'amplify.yml': drops })).filter(check => check.level !== 'ok')).toEqual([])
  })

  it('fails while amplify.yml does not report the build to the panel', async () => {
    const reporting = `preBuild:\n  commands:\n    - ${AMPLIFY_START_LINE}\nbuild:\n  commands:\n    - ${AMPLIFY_BUILD_LINE}\n`
    expect(amplifyReportCheck(reporting)).toMatchObject({ level: 'ok' })
    expect(amplifyReportCheck(`build:\n  commands:\n    - ${AMPLIFY_BUILD_LINE}\n`)).toMatchObject({ level: 'fail', text: expect.stringContaining('build:report --start in preBuild)') })
    expect(amplifyReportCheck(`preBuild:\n  commands:\n    - ${AMPLIFY_START_LINE}\nbuild:\n  commands:\n    - pnpm run build && pnpm exec linkchar-cms build:report --ok\n`))
      .toMatchObject({ level: 'fail', text: expect.stringContaining('--ok and --failed around the build)') })
    const silent = amplifyReportCheck('frontend:\n  phases:\n    build:\n      commands:\n        - pnpm run build\n')
    expect(silent.text).toContain(`"${AMPLIFY_START_LINE}"`)
    expect(silent.text).toContain(`"${AMPLIFY_BUILD_LINE}"`)
    expect((await levels({}, { 'amplify.yml': 'frontend:\n  phases:\n    build:\n      commands:\n        - pnpm run build\n' })).filter(check => check.level === 'fail').map(check => check.text))
      .toEqual([expect.stringContaining('amplify.yml does not report the build')])
  })

  it('warns while no real build confirmed a publish, on a hosted project only', async () => {
    const hosted = { ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' }
    const texts = async (publishes: { any: boolean, confirmed: boolean }, overrides = { env: hosted }) => (await levels({ ...overrides, fetch: answer([{ id: 'u1' }], {}, publishes) })).filter(check => check.level !== 'ok').map(check => check.text)
    expect(await texts({ any: false, confirmed: false })).toEqual([])
    expect(await texts({ any: true, confirmed: false })).toEqual([expect.stringMatching(/linkchar-cms build:report.*linkchar-cms publish:ping/)])
    expect(await texts({ any: true, confirmed: true })).toEqual([])
    expect((await levels({ env: hosted, fetch: answer([{ id: 'u1' }], {}, { any: true, confirmed: true }) })).map(check => check.text)).toContainEqual(expect.stringContaining('The site confirmed publish #1'))
    const local = (await levels({ fetch: answer([{ id: 'u1' }], {}, { any: true, confirmed: false }) })).map(check => check.text)
    expect(local).not.toContainEqual(expect.stringContaining('publish:ping'))
    expect(local).not.toContainEqual(expect.stringContaining('The site confirmed publish'))
    const urls: string[] = []
    const query = (async (url: string) => { urls.push(url); return Response.json([{ id: 7 }]) }) as unknown as typeof fetch
    await publishCircuitCheck(query, 'http://db', { apikey: 'sk' })
    expect(urls[1]).toBe('http://db/rest/v1/publish_log?select=id,build_status,job_id,build_stamp,built_at,requested_at&build_status=in.(pending,building,built)&order=requested_at.asc')
    expect(urls[2]).toBe('http://db/rest/v1/publish_log?select=id,job_id&build_status=eq.success&job_id=not.is.null&job_id=not.like.mock-*&order=requested_at.desc&limit=1')
  })

  it('compares the applied migrations with the package and the project', async () => {
    const versions = await migrationVersions(join(PACKAGE_SUPABASE, 'migrations'))
    expect(versions).toContain('20261029110000')
    const applied = (body: unknown, status = 200) => (async () => Response.json(body, { status })) as unknown as typeof fetch
    const expected = [...versions, '20270101000000']
    expect(await appliedMigrationsCheck(applied(versions), 'http://db', {}, versions)).toEqual({ level: 'ok', text: `The database has every migration (${versions.length})` })
    expect(await appliedMigrationsCheck(applied(versions.slice(0, -1)), 'http://db', {}, expected)).toEqual({
      level: 'fail', text: `The database at http://db lacks migrations ${versions.at(-1)}, 20270101000000: supabase migration up (local) or supabase db push (hosted)`
    })
    expect((await appliedMigrationsCheck(applied({ code: 'PGRST202', message: '' }, 404), 'http://db', {}, versions))).toMatchObject({ level: 'warn', text: expect.stringContaining('lacks cms_migrations()') })
    expect((await appliedMigrationsCheck(applied('no', 500), 'http://db', {}, versions))).toEqual({ level: 'warn', text: 'Cannot list the applied migrations (HTTP 500)' })
    expect((await levels({})).map(check => check.text)).toContain(`The database has every migration (${versions.length})`)
  })

  it('tells missing grants of the secret key apart from missing migrations', async () => {
    const denied = { status: 403, code: '42501' }
    const checks = await levels({ fetch: answer([{ id: 'u1' }], { profiles: denied, document_status: denied }) })
    expect(checks.filter(check => check.level === 'fail').map(check => check.text)).toEqual([
      'The secret key cannot read profiles, document_status: the database lacks the service_role grants of the package (0.10.2). Run linkchar-cms migrations sync, then supabase db push'
    ])
    expect(tablesCheck([{ table: 'media', code: 'HTTP 500' }]).text).toBe('Supabase refused media (HTTP 500)')
  })

  it('warns when pnpm would quarantine a version released today', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cms-doctor-'))
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'minimumReleaseAge: 1440\n')
    const checks = await environmentChecks({ root, supabaseDir: join(root, 'supabase'), env, siteUrl: 'https://acme.com', fetch: answer([{ id: 'u1' }]) })
    expect(checks.filter(check => check.level === 'warn').map(check => check.text)).toContainEqual(expect.stringContaining('minimumReleaseAgeExclude'))
    await rm(root, { recursive: true, force: true })
    expect(excludesPackageFromQuarantine('minimumReleaseAgeExclude:\n  - \'@linkcharsoft/cms\'\n')).toBe(true)
  })

  it('fails while PostCSS runs tailwindcss directly, which lets the panel config reach the site', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cms-doctor-'))
    await writeFile(join(root, 'postcss.config.js'), 'module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }\n')
    const checks = await environmentChecks({ root, supabaseDir: join(root, 'supabase'), env, siteUrl: 'https://acme.com', fetch: answer([{ id: 'u1' }]) })
    expect(checks.find(check => check.level === 'fail')?.text).toContain('\'@linkcharsoft/cms/tailwind/postcss\': {}')
    await rm(root, { recursive: true, force: true })
    expect(postcssCheck('module.exports = { plugins: { \'@linkcharsoft/cms/tailwind/postcss\': {}, autoprefixer: {} } }').level).toBe('ok')
  })
})
