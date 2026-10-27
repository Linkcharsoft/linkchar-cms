import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { authChecks, configPorts, environmentChecks, excludesPackageFromQuarantine, parseExcludedRanges, portChecks, postcssCheck } from '../doctor.js'

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
  const answer = (admins: unknown[] | null) => (async (url: string) => (url.includes('/rest/v1/profiles')
    ? (admins ? Response.json(admins) : new Response('{}', { status: 404 }))
    : new Response('{}'))) as typeof fetch

  const levels = async (options: Partial<Parameters<typeof environmentChecks>[0]>) => {
    const root = await mkdtemp(join(tmpdir(), 'cms-doctor-'))
    try {
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
    expect((await levels({ env: { NODE_AUTH_TOKEN: 'x' }, siteUrl: null })).map(check => check.text)).toEqual([
      'Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY in the environment or .env.local',
      'site.url is empty: the sitemap throws and canonical URLs stay relative (set NEXT_PUBLIC_SITE_URL)'
    ])
    expect((await levels({ fetch: answer(null) })).find(check => check.level === 'fail')?.text).toContain('apply the migrations')
    expect((await levels({ fetch: answer([]) })).find(check => check.level === 'fail')?.text).toBe('No superadmin yet: linkchar-cms admin --email …')
    expect((await levels({ fetch: (async () => { throw new Error('ECONNREFUSED') }) as typeof fetch })).find(check => check.level === 'fail')?.text)
      .toContain('ECONNREFUSED')
  })

  it('warns when pnpm would quarantine a version released today', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cms-doctor-'))
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'minimumReleaseAge: 1440\n')
    const checks = await environmentChecks({ root, supabaseDir: join(root, 'supabase'), env, siteUrl: 'https://acme.com', fetch: answer([{ id: 'u1' }]) })
    expect(checks.find(check => check.level === 'warn')?.text).toContain('minimumReleaseAgeExclude')
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
