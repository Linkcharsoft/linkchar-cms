import { exec, execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

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

/** @param {string} text pnpm-workspace.yaml */
export const excludesPackageFromQuarantine = text => /minimumReleaseAgeExclude:[\s\S]*?-\s*['"]?@linkcharsoft\/cms['"]?/.test(text)

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
 * @param {{ root: string, supabaseDir: string, env: Record<string, string | undefined>, siteUrl: string | null, fetch?: typeof fetch }} options
 * @returns {Promise<CheckType[]>}
 */
export const environmentChecks = async ({ root, supabaseDir, env, siteUrl, fetch: get = fetch }) => {
  /** @type {CheckType[]} */
  const checks = []
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].filter(key => !env[key])
  checks.push(missing.length > 0
    ? { level: 'fail', text: `Missing ${missing.join(', ')} in the environment or .env.local` }
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
      const admins = await get(`${url}/rest/v1/profiles?select=id&role=eq.superadmin&limit=1`, { headers })
      if (!admins.ok) {
        checks.push({ level: 'fail', text: 'The profiles table is missing: apply the migrations (supabase db reset locally, supabase db push hosted)' })
      } else {
        checks.push((await admins.json()).length > 0
          ? { level: 'ok', text: 'There is a superadmin' }
          : { level: 'fail', text: 'No superadmin yet: linkchar-cms admin --email …' })
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

  const configToml = join(supabaseDir, 'config.toml')
  if (process.platform === 'win32' && existsSync(configToml)) {
    const ranges = await windowsExcludedRanges()
    if (ranges) checks.push(...portChecks(configPorts(await readFile(configToml, 'utf8')), ranges))
  }
  return checks
}
