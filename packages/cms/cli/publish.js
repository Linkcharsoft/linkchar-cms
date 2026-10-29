import { fileURLToPath } from 'node:url'
import { CliError } from './migrations.js'

/**
 * @typedef {{ url: string, secretKey: string, hookUrl: string, webhookSecret?: string, siteUrl: string | null }} PingSettingsType
 * @typedef {{ jobId: string, status: 'started' | 'succeeded' | 'failed' | 'cancelled' }} BuildEventType
 * @typedef {{ report: (event: BuildEventType) => Promise<unknown>, logger: { error: (message: string, detail?: unknown) => void } }} TriggerContextType
 * @typedef {(ctx: TriggerContextType) => Promise<{ ok: true, jobId: string | null } | { ok: false, code: string, detail?: string }>} TriggerType
 * @typedef {{ build_status: string, job_id: string | null, error_code: string | null, error_detail: string | null, requested_at: string, build_stamp?: string | null, app_id?: string | null, branch?: string | null, region?: string | null }} LogRowType
 * @typedef {'no_start' | 'no_end' | 'no_deploy' | 'no_site'} UnconfirmedStageType
 * @typedef {{ ok: true, id: number, jobId: string | null, minutes: number } | { ok: false, id: number, code: string, detail: string | null, minutes: number, stage?: UnconfirmedStageType, consoleUrl?: string | null, siteUrl?: string | null }} PingResultType
 */

// Mirrors BUILD_CONFIRMATION_TIMEOUT_MS in src/core/publish.ts: past it a publish stops blocking the next one.
const BUILDING_LOCK_MS = 30 * 60 * 1000

const FAILURE_CODES = { failed: 'build_failed', cancelled: 'build_cancelled' }

/**
 * Where the ping goes, from the environment: the publish log through the secret key, the Amplify build hook and the
 * site that serves the build (cms.config.ts site.url, else NEXT_PUBLIC_SITE_URL).
 * @param {Record<string, string | undefined>} env
 * @param {string} [envLabel] the env file(s) read, for the messages
 * @param {string | null} [siteUrl]
 * @returns {PingSettingsType}
 */
export const pingSettings = (env, envLabel = 'the env file', siteUrl = env.NEXT_PUBLIC_SITE_URL ?? null) => {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY'].filter(key => !env[key])
  if (missing.length > 0) throw new CliError(`Missing ${missing.join(', ')} in the environment or ${envLabel}.`)
  if (!env.CMS_BUILD_HOOK_URL) throw new CliError(`publish:ping needs CMS_BUILD_HOOK_URL, not in the environment or ${envLabel}: without a build hook there is no circuit to verify (a local Supabase runs the simulated build).`)
  return {
    url: /** @type {string} */ (env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, ''),
    secretKey: /** @type {string} */ (env.SUPABASE_SECRET_KEY),
    hookUrl: env.CMS_BUILD_HOOK_URL,
    webhookSecret: env.CMS_BUILD_WEBHOOK_SECRET,
    siteUrl: siteUrl ? siteUrl.replace(/\/$/, '') : null
  }
}

// The hook URL starts builds for whoever has it: only its host and id are shown.
/** @param {string} url */
export const maskHookUrl = url => {
  try {
    const parsed = new URL(url)
    const id = parsed.searchParams.get('id')
    return `${parsed.origin}${parsed.pathname}${id ? `?id=${id}` : ''}`
  } catch {
    return '(unreadable URL)'
  }
}

/**
 * The stamp of the build the site serves, through GET /api/cms/build-status; null when it can't say.
 * @param {typeof fetch} get @param {string} siteUrl
 */
const siteStamp = async (get, siteUrl) => {
  try {
    const response = await get(`${siteUrl}/api/cms/build-status`, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return null
    const body = /** @type {{ stamp?: unknown } | null} */ (await response.json().catch(() => null))
    return typeof body?.stamp === 'string' ? body.stamp : null
  } catch {
    return null
  }
}

/** @param {LogRowType} row @returns {string | null} */
const consoleUrl = ({ region, app_id: appId, branch, job_id: jobId }) =>
  (region && appId && branch && jobId ? `https://${region}.console.aws.amazon.com/amplify/apps/${appId}/branches/${encodeURIComponent(branch)}/deployments/${jobId}` : null)

/** @param {PingSettingsType} settings @returns {Promise<TriggerType>} the package's Amplify target, loaded from its TypeScript */
export const amplifyTrigger = async ({ hookUrl, webhookSecret }) => {
  const { createJiti } = await import('jiti')
  const jiti = createJiti(import.meta.url)
  const { amplify } = /** @type {typeof import('../src/publish/amplify')} */ (await jiti.import(fileURLToPath(new URL('../src/publish/amplify.ts', import.meta.url))))
  return amplify({ hookUrl, webhookSecret }).trigger
}

/** @param {number} ms */
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Logs an empty publish, fires the build hook and waits for the build to report itself and the site to serve it, as
 * "Publicar" does; the panel's own confirmation is done here too, so the ping needs no panel visit.
 * @param {{
 *   settings: PingSettingsType, trigger: TriggerType, timeoutMs: number, intervalMs?: number,
 *   fetch?: typeof fetch, sleep?: (ms: number) => Promise<unknown>, now?: () => number, log?: (line: string) => void
 * }} options
 * @returns {Promise<PingResultType>}
 */
export const runPing = async ({ settings, trigger, timeoutMs, intervalMs = 15_000, fetch: get = fetch, sleep = wait, now = Date.now, log = console.log }) => {
  const { url, secretKey, siteUrl } = settings
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'content-type': 'application/json' }
  /** @param {string} query @param {RequestInit} [init] */
  const rest = async (query, init) => {
    const response = await get(`${url}/rest/v1/publish_log${query}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new CliError(`Supabase refused the publish log (HTTP ${response.status}${body?.message ? `: ${body.message}` : ''}).`)
    return body
  }
  const minutesSince = (/** @type {number} */ start) => Math.round((now() - start) / 60_000)

  const [latest] = /** @type {(LogRowType & { id: number })[]} */ (await rest('?select=id,build_status,requested_at&order=requested_at.desc&limit=1')) ?? []
  if (latest && ['pending', 'building'].includes(latest.build_status) && now() - Date.parse(latest.requested_at) < BUILDING_LOCK_MS) {
    throw new CliError(`Publish #${latest.id} is still building (${minutesSince(Date.parse(latest.requested_at))} min ago): wait for it, or for the 30-minute timeout, and run this again.`)
  }

  const [row] = /** @type {{ id: number }[]} */ (await rest('', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ documents_count: 0, removed_count: 0, items: [] }) }))
  const id = row.id
  const started = now()
  /** @param {Record<string, unknown>} values @param {string} [onlyWhile] */
  const patch = (values, onlyWhile) => rest(`?id=eq.${id}${onlyWhile ? `&build_status=eq.${onlyWhile}` : ''}`, { method: 'PATCH', body: JSON.stringify(values) })
  const finished = () => new Date(now()).toISOString()
  log(`Publish #${id} logged (no documents). Triggering the build hook…`)

  const result = await trigger({
    report: async ({ jobId, status }) => (status === 'started'
      ? patch({ build_status: 'building', job_id: jobId })
      : patch({ build_status: status === 'succeeded' ? 'success' : 'failed', job_id: jobId, error_code: FAILURE_CODES[/** @type {'failed' | 'cancelled'} */ (status)] ?? null, finished_at: finished() })),
    logger: { error: message => log(message) }
  })
  if (!result.ok) {
    await patch({ build_status: 'failed', error_code: result.code, error_detail: result.detail ?? null, finished_at: finished() })
    return { ok: false, id, code: result.code, detail: result.detail ?? null, minutes: 0 }
  }
  await patch({ build_status: 'building', ...(result.jobId ? { job_id: result.jobId } : {}) }, 'pending')
  log(`Hook accepted${result.jobId ? ` (job ${result.jobId})` : ''}. Waiting for the build to report…`)

  let seen = `building ${result.jobId ?? ''}`
  /** @type {LogRowType | null} */
  let current = null
  while (now() - started < timeoutMs) {
    await sleep(intervalMs)
    ;[current] = /** @type {LogRowType[]} */ (await rest(`?id=eq.${id}&select=build_status,job_id,error_code,error_detail,requested_at,build_stamp,app_id,branch,region`)) ?? []
    if (!current) throw new CliError(`Publish #${id} disappeared from the log.`)
    const state = `${current.build_status} ${current.job_id ?? ''}`
    if (state !== seen) {
      seen = state
      log(`#${id}: ${current.build_status}${current.job_id ? ` (job ${current.job_id})` : ''}${current.build_status === 'built' ? `, stamp ${current.build_stamp}: waiting for the site to serve it` : ''} after ${minutesSince(started)} min`)
    }
    if (current.build_status === 'success') return { ok: true, id, jobId: current.job_id, minutes: minutesSince(started) }
    if (current.build_status === 'failed') return { ok: false, id, code: current.error_code ?? 'build_failed', detail: current.error_detail, minutes: minutesSince(started) }
    if (current.build_status === 'built' && current.build_stamp && siteUrl && await siteStamp(get, siteUrl) === current.build_stamp) {
      await patch({ build_status: 'success', finished_at: finished() }, 'built')
      log(`#${id}: success, the site serves ${current.build_stamp} after ${minutesSince(started)} min`)
      return { ok: true, id, jobId: current.job_id, minutes: minutesSince(started) }
    }
  }
  const stage = !current?.job_id && current?.build_status !== 'built' ? 'no_start' : current?.build_status !== 'built' ? 'no_end' : siteUrl ? 'no_deploy' : 'no_site'
  return { ok: false, id, code: 'unconfirmed', detail: null, minutes: minutesSince(started), stage, consoleUrl: current ? consoleUrl(current) : null, siteUrl }
}

/** @param {PingResultType} result @returns {string} */
export const describePing = result => {
  if (result.ok) return `The site confirmed the build of publish #${result.id} in ${result.minutes} min${result.jobId ? ` (job ${result.jobId})` : ''}: the publish circuit works.`
  if (result.code === 'unconfirmed') {
    const where = result.consoleUrl ? ` The build: ${result.consoleUrl}.` : ''
    const stays = `Publish #${result.id} stays "sin confirmar".`
    if (result.stage === 'no_start') return `The build never reported in ${result.minutes} min: amplify.yml does not run "linkchar-cms build:report --start" in preBuild (linkchar-cms doctor checks it), the build lacks NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY, or the hook started no build. ${stays}`
    if (result.stage === 'no_end') return `The build started but never reported its end in ${result.minutes} min: amplify.yml does not run build:report --ok and --failed around the build, or the build is still running.${where} ${stays}`
    if (result.stage === 'no_site') return `The build ended but there is no site URL to confirm the deploy: set site.url in cms.config.ts (NEXT_PUBLIC_SITE_URL). ${stays}`
    return `The build ended but ${result.siteUrl} never served it in ${result.minutes} min: the deploy failed, or site.url is not this Amplify app.${where} ${stays}`
  }
  if (result.code === 'target_missing' || result.code === 'hook_refused' || result.code === 'hook_unreachable') {
    return `The build hook did not accept the request (${result.code}${result.detail ? `, ${result.detail}` : ''}): check CMS_BUILD_HOOK_URL.`
  }
  return `The build of publish #${result.id} ended as ${result.code}${result.detail ? ` (${result.detail})` : ''}: the circuit reports back, the build itself fails. Check the Amplify build log.`
}
