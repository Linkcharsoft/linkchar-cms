import { exec, execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { isLocalSupabaseUrl } from './local.js'
import { migrationVersions, PACKAGE_SUPABASE } from './migrations.js'

/**
 * @typedef {{ level: 'ok' | 'warn' | 'fail', text: string }} CheckType
 * @typedef {[number, number]} RangeType
 */

// Windows (Hyper-V, WSL, Docker) reserves blocks of TCP ports above it; ports below are never taken that way.
export const DYNAMIC_PORTS_START = 49152

/** @param {string} text output of `netsh interface ipv4 show excludedportrange protocol=tcp` @returns {RangeType[]} */
export const parseExcludedRanges = text => [...text.matchAll(/^\s*(\d+)\s+(\d+)\s*\*?\s*$/gm)].map(match => [Number(match[1]), Number(match[2])])

/** @param {string} text supabase/config.toml @returns {{ key: string, port: number }[]} */
export const configPorts = text => {
  let section = ''
  /** @type {{ key: string, port: number }[]} */
  const ports = []
  for (const line of text.split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]/.exec(line)
    if (header) section = header[1]
    const port = /^\s*((?:shadow_|smtp_|pop3_)?port)\s*=\s*(\d+)/.exec(line)
    if (port) ports.push({ key: `${section}.${port[1]}`, port: Number(port[2]) })
  }
  return ports
}

/** @param {{ key: string, port: number }[]} ports @param {RangeType[]} ranges @returns {CheckType[]} */
export const portChecks = (ports, ranges) => {
  const blocked = ports.filter(({ port }) => ranges.some(([from, to]) => port >= from && port <= to))
  if (blocked.length > 0) {
    return [{ level: 'fail', text: `Windows reserves ${blocked.map(({ key, port }) => `${port} (${key})`).join(', ')}: move the Supabase ports in config.toml below ${DYNAMIC_PORTS_START}.` }]
  }
  const dynamic = ports.filter(({ port }) => port >= DYNAMIC_PORTS_START)
  if (dynamic.length > 0) {
    return [{ level: 'warn', text: `Supabase ports ${dynamic.map(({ port }) => port).join(', ')} are in the dynamic range: Windows can reserve them after a restart. Ports below ${DYNAMIC_PORTS_START} are safe.` }]
  }
  return [{ level: 'ok', text: 'Supabase ports are clear of the ports Windows reserves' }]
}

/** @param {string} text supabase/config.toml @returns {Record<string, string>} keys as "section.key" */
export const configValues = text => {
  let section = ''
  /** @type {Record<string, string>} */
  const values = {}
  for (const line of text.split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]/.exec(line)
    if (header) section = header[1]
    const pair = /^\s*([a-z_]+)\s*=\s*(.+?)\s*$/.exec(line)
    if (pair) values[`${section}.${pair[1]}`] = pair[2].replace(/^"(.*)"$/, '$1')
  }
  return values
}

// The auth settings the panel relies on; Supabase's defaults let anyone sign up and turn two-step verification off.
/** @param {string} text supabase/config.toml @returns {CheckType[]} */
export const authChecks = text => {
  const values = configValues(text)
  /** @type {CheckType[]} */
  const checks = []
  checks.push(values['auth.enable_signup'] === 'false'
    ? { level: 'ok', text: 'Sign-ups are off: only invited users get in' }
    : { level: 'fail', text: 'Sign-ups are on: anyone with the site URL can create a user and edit drafts. Set enable_signup = false under [auth] (hosted: Authentication → Sign In / Providers → Allow new users to sign up)' })
  checks.push(values['auth.mfa.totp.enroll_enabled'] === 'true' && values['auth.mfa.totp.verify_enabled'] === 'true'
    ? { level: 'ok', text: 'Two-step verification (TOTP) is on' }
    : { level: 'fail', text: 'Two-step verification is off: the MFA screens of the panel fail. Set enroll_enabled and verify_enabled = true under [auth.mfa.totp]' })
  if (Number(values['auth.minimum_password_length'] ?? 6) < 10 || values['auth.password_requirements'] !== 'letters_digits') {
    checks.push({ level: 'warn', text: 'Password rules are looser than the panel says (10 characters, letters and digits): minimum_password_length = 10 and password_requirements = "letters_digits" under [auth]' })
  }
  return checks
}

/** @param {string} text pnpm-workspace.yaml */
export const excludesPackageFromQuarantine = text => /minimumReleaseAgeExclude:[\s\S]*?-\s*['"]?@linkcharsoft\/cms['"]?/.test(text)

const POSTCSS_CONFIGS = ['postcss.config.js', 'postcss.config.cjs', 'postcss.config.mjs', 'postcss.config.ts', 'postcss.config.json', '.postcssrc.json', '.postcssrc']

/** @param {string} text the project's PostCSS config @returns {CheckType} */
export const postcssCheck = text => (/@linkcharsoft\/cms\/tailwind\/postcss/.test(text)
  ? { level: 'ok', text: 'PostCSS runs Tailwind per stylesheet (@linkcharsoft/cms/tailwind/postcss)' }
  : { level: 'fail', text: 'The PostCSS config runs tailwindcss directly: the panel\'s @config reaches the site\'s stylesheets and next build fails on the project\'s own classes. Replace tailwindcss: {} with \'@linkcharsoft/cms/tailwind/postcss\': {}' })

/** @param {string} text the project's amplify.yml @returns {CheckType | null} */
export const amplifyCacheCheck = text => (/\.next\/cache/.test(text) && !/fetch-cache/.test(text)
  ? { level: 'warn', text: 'amplify.yml keeps .next/cache between builds, fetch-cache included: add "rm -rf .next/cache/fetch-cache" to preBuild, or the cache grows with every build' }
  : null)

/**
 * Whether a real build ever reported a publish back; the simulated build's successes don't count.
 * @param {typeof fetch} get @param {string} url @param {Record<string, string>} headers @returns {Promise<CheckType | null>}
 */
export const publishCircuitCheck = async (get, url, headers) => {
  /** @param {string} query */
  const count = async query => {
    const body = await (await get(`${url}/rest/v1/publish_log?select=id&${query}`, { headers })).json().catch(() => null)
    return Array.isArray(body) ? body.length : 0
  }
  if (await count('limit=1') === 0) return null
  return await count('build_status=eq.success&job_id=not.is.null&job_id=not.like.mock-*&limit=1') > 0
    ? { level: 'ok', text: 'The site confirmed a publish' }
    : { level: 'warn', text: 'No publish has been confirmed by the site yet: the successes in the log are simulated or unconfirmed. Check the circuit with linkchar-cms publish:ping' }
}

/**
 * The migrations the database applied against those the package and the project ship; needs cms_migrations() (0.13.0).
 * @param {typeof fetch} get @param {string} url @param {Record<string, string>} headers @param {string[]} expected
 * @returns {Promise<CheckType>}
 */
export const appliedMigrationsCheck = async (get, url, headers, expected) => {
  const response = await get(`${url}/rest/v1/rpc/cms_migrations`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}' })
  const body = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(body)) {
    const code = body && typeof body === 'object' && 'code' in body ? String(body.code) : `HTTP ${response.status}`
    return code === 'PGRST202'
      ? { level: 'warn', text: 'Cannot list the applied migrations: the database lacks cms_migrations() (0.13.0). Run linkchar-cms migrations sync, then supabase migration up (local) or supabase db push (hosted)' }
      : { level: 'warn', text: `Cannot list the applied migrations (${code})` }
  }
  const applied = new Set(body.map(String))
  const missing = expected.filter(version => !applied.has(version))
  return missing.length === 0
    ? { level: 'ok', text: `The database has every migration (${expected.length})` }
    : { level: 'fail', text: `The database at ${url} lacks migrations ${missing.join(', ')}: supabase migration up (local) or supabase db push (hosted)` }
}

export const PACKAGE_RELATIONS = ['profiles', 'documents', 'published_documents', 'document_status', 'document_versions', 'redirects', 'media', 'activity_log', 'publish_log']

/** @param {Response} response @returns {Promise<string | null>} the PostgREST or Postgres error code */
const errorCode = async response => {
  if (response.ok) return null
  const body = await response.json().catch(() => null)
  return typeof body?.code === 'string' ? body.code : `HTTP ${response.status}`
}

/** @param {{ table: string, code: string | null }[]} failed what the secret key could not read @returns {CheckType} */
export const tablesCheck = failed => {
  const missing = failed.filter(({ code }) => code === 'PGRST205').map(({ table }) => table)
  if (missing.length > 0) return { level: 'fail', text: `Missing ${missing.join(', ')}: apply the migrations (supabase db reset locally, supabase db push hosted)` }
  const denied = failed.filter(({ code }) => code === '42501').map(({ table }) => table)
  if (denied.length > 0) {
    return { level: 'fail', text: `The secret key cannot read ${denied.join(', ')}: the database lacks the service_role grants of the package (0.10.2). Run linkchar-cms migrations sync, then supabase db push` }
  }
  return { level: 'fail', text: `Supabase refused ${failed.map(({ table, code }) => `${table} (${code})`).join(', ')}` }
}

const run = promisify(execFile)
const shell = promisify(exec)

/** @returns {Promise<RangeType[] | null>} */
const windowsExcludedRanges = async () => {
  try {
    const { stdout } = await run('netsh', ['interface', 'ipv4', 'show', 'excludedportrange', 'protocol=tcp'])
    return parseExcludedRanges(stdout)
  } catch {
    return null
  }
}

/** @param {Record<string, string | undefined>} env @returns {Promise<boolean | null>} */
const hasPackagesToken = async env => {
  if (env.NODE_AUTH_TOKEN || env.GITHUB_PACKAGES_TOKEN) return true
  try {
    const { stdout } = await shell('pnpm config get //npm.pkg.github.com/:_authToken')
    return Boolean(stdout.trim()) && stdout.trim() !== 'undefined'
  } catch {
    return null
  }
}

/**
 * Environment checks the other commands don't cover: variables, Supabase, the package registry and the ports.
 * @param {{ root: string, supabaseDir: string, env: Record<string, string | undefined>, envFile?: string, siteUrl: string | null, fetch?: typeof fetch }} options envFile names the env file(s) read, for the messages
 * @returns {Promise<CheckType[]>}
 */
export const environmentChecks = async ({ root, supabaseDir, env, envFile = '.env.local', siteUrl, fetch: get = fetch }) => {
  /** @type {CheckType[]} */
  const checks = []
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].filter(key => !env[key])
  checks.push(missing.length > 0
    ? { level: 'fail', text: `Missing ${missing.join(', ')} in the environment or ${envFile} (--env-file picks another file)` }
    : { level: 'ok', text: 'Supabase variables are set' })
  checks.push(siteUrl
    ? { level: 'ok', text: `site.url is ${siteUrl}` }
    : { level: 'fail', text: 'site.url is empty: the sitemap throws and canonical URLs stay relative (set NEXT_PUBLIC_SITE_URL)' })

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = env.SUPABASE_SECRET_KEY
  if (url && secretKey) {
    const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}` }
    try {
      const health = await get(`${url}/auth/v1/health`, { headers })
      if (!health.ok) throw new Error(`HTTP ${health.status}`)
      checks.push({ level: 'ok', text: `Supabase answers at ${url}` })
      const probes = await Promise.all(PACKAGE_RELATIONS.map(async table => ({ table, code: await errorCode(await get(`${url}/rest/v1/${table}?select=*&limit=0`, { headers })) })))
      const failed = probes.filter(probe => probe.code)
      if (failed.length > 0) {
        checks.push(tablesCheck(failed))
      } else {
        const admins = await get(`${url}/rest/v1/profiles?select=id&role=eq.superadmin&limit=1`, { headers })
        checks.push((await admins.json()).length > 0
          ? { level: 'ok', text: 'There is a superadmin' }
          : { level: 'fail', text: 'No superadmin yet: linkchar-cms admin --email …' })
        const circuit = isLocalSupabaseUrl(url) ? null : await publishCircuitCheck(get, url, headers)
        if (circuit) checks.push(circuit)
        const expected = [...new Set([...await migrationVersions(join(PACKAGE_SUPABASE, 'migrations')), ...await migrationVersions(join(supabaseDir, 'migrations'))])].sort()
        checks.push(await appliedMigrationsCheck(get, url, headers, expected))
      }
    } catch (error) {
      checks.push({ level: 'fail', text: `Supabase does not answer at ${url} (${error instanceof Error ? error.message : error}): supabase start?` })
    }
  }

  const token = await hasPackagesToken(env)
  if (token === false) checks.push({ level: 'warn', text: 'No GitHub Packages token in the npm/pnpm user config: installing @linkcharsoft/cms will fail with 401' })
  const workspace = join(root, 'pnpm-workspace.yaml')
  if (existsSync(workspace) && !excludesPackageFromQuarantine(await readFile(workspace, 'utf8'))) {
    checks.push({ level: 'warn', text: 'pnpm-workspace.yaml lacks minimumReleaseAgeExclude: [\'@linkcharsoft/cms\']: a version released today will not install' })
  }
  const postcssConfig = POSTCSS_CONFIGS.map(name => join(root, name)).find(path => existsSync(path))
  if (postcssConfig) checks.push(postcssCheck(await readFile(postcssConfig, 'utf8')))
  const amplifyConfig = join(root, 'amplify.yml')
  const amplifyCache = existsSync(amplifyConfig) ? amplifyCacheCheck(await readFile(amplifyConfig, 'utf8')) : null
  if (amplifyCache) checks.push(amplifyCache)

  const configToml = join(supabaseDir, 'config.toml')
  if (process.platform === 'win32' && existsSync(configToml)) {
    const ranges = await windowsExcludedRanges()
    if (ranges) checks.push(...portChecks(configPorts(await readFile(configToml, 'utf8')), ranges))
  }
  return checks
}
