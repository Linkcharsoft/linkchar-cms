import { fileURLToPath } from 'node:url'
import { CliError } from './migrations.js'

/**
 * @typedef {{ url: string, secretKey: string, hookUrl: string, webhookSecret?: string }} PingSettingsType
 * @typedef {{ jobId: string, status: 'started' | 'succeeded' | 'failed' | 'cancelled' }} BuildEventType
 * @typedef {{ report: (event: BuildEventType) => Promise<unknown>, logger: { error: (message: string, detail?: unknown) => void } }} TriggerContextType
 * @typedef {(ctx: TriggerContextType) => Promise<{ ok: true, jobId: string | null } | { ok: false, code: string, detail?: string }>} TriggerType
 * @typedef {{ build_status: string, job_id: string | null, error_code: string | null, error_detail: string | null, requested_at: string }} LogRowType
 * @typedef {{ ok: true, id: number, jobId: string | null, minutes: number } | { ok: false, id: number, code: string, detail: string | null, minutes: number }} PingResultType
 */

// Mirrors BUILD_CONFIRMATION_TIMEOUT_MS in src/core/publish.ts: past it a publish stops blocking the next one.
const BUILDING_LOCK_MS = 30 * 60 * 1000

const FAILURE_CODES = { failed: 'build_failed', cancelled: 'build_cancelled' }

/**
 * Where the ping goes, from the environment: the publish log through the secret key and the Amplify build hook.
 * @param {Record<string, string | undefined>} env
 * @returns {PingSettingsType}
 */
export const pingSettings = env => {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY'].filter(key => !env[key])
  if (missing.length > 0) throw new CliError(`Missing ${missing.join(', ')} in the environment or the env file.`)
  if (!env.CMS_BUILD_HOOK_URL) throw new CliError('publish:ping needs CMS_BUILD_HOOK_URL: without a build hook there is no circuit to verify (a local Supabase runs the simulated build).')
  return {
    url: /** @type {string} */ (env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, ''),
    secretKey: /** @type {string} */ (env.SUPABASE_SECRET_KEY),
    hookUrl: env.CMS_BUILD_HOOK_URL,
    webhookSecret: env.CMS_BUILD_WEBHOOK_SECRET
  }
}

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
 * Logs an empty publish, fires the build hook and waits for the site to report the build back, as "Publicar" does.
 * @param {{
 *   settings: PingSettingsType, trigger: TriggerType, timeoutMs: number, intervalMs?: number,
 *   fetch?: typeof fetch, sleep?: (ms: number) => Promise<unknown>, now?: () => number, log?: (line: string) => void
 * }} options
 * @returns {Promise<PingResultType>}
 */
export const runPing = async ({ settings, trigger, timeoutMs, intervalMs = 15_000, fetch: get = fetch, sleep = wait, now = Date.now, log = console.log }) => {
  const { url, secretKey } = settings
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
  log(`Hook accepted${result.jobId ? ` (job ${result.jobId})` : ' (no job id in the answer)'}. Waiting for the site to report the build…`)

  let seen = 'building'
  while (now() - started < timeoutMs) {
    await sleep(intervalMs)
    const [current] = /** @type {LogRowType[]} */ (await rest(`?id=eq.${id}&select=build_status,job_id,error_code,error_detail,requested_at`)) ?? []
    if (!current) throw new CliError(`Publish #${id} disappeared from the log.`)
    if (current.build_status !== seen) {
      seen = current.build_status
      log(`#${id}: ${seen}${current.job_id ? ` (job ${current.job_id})` : ''} after ${minutesSince(started)} min`)
    }
    if (current.build_status === 'success') return { ok: true, id, jobId: current.job_id, minutes: minutesSince(started) }
    if (current.build_status === 'failed') return { ok: false, id, code: current.error_code ?? 'build_failed', detail: current.error_detail, minutes: minutesSince(started) }
  }
  return { ok: false, id, code: 'unconfirmed', detail: null, minutes: minutesSince(started) }
}

/** @param {PingResultType} result @returns {string} */
export const describePing = result => {
  if (result.ok) return `The site confirmed the build of publish #${result.id} in ${result.minutes} min${result.jobId ? ` (job ${result.jobId})` : ''}: the publish circuit works.`
  if (result.code === 'unconfirmed') {
    return `No build status reached the panel in ${result.minutes} min: the EventBridge rule, the API destination or CMS_BUILD_WEBHOOK_SECRET is missing or wrong (README → Amplify setup). Publish #${result.id} stays "sin confirmar".`
  }
  if (result.code === 'target_missing' || result.code === 'hook_refused' || result.code === 'hook_unreachable') {
    return `The build hook did not accept the request (${result.code}${result.detail ? `, ${result.detail}` : ''}): check CMS_BUILD_HOOK_URL.`
  }
  return `The build of publish #${result.id} ended as ${result.code}${result.detail ? ` (${result.detail})` : ''}: the circuit reports back, the build itself fails. Check the Amplify build log.`
}
