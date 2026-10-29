import { execFileSync } from 'node:child_process'
import { buildStamp } from '../next/index.js'
import { CliError } from './migrations.js'

/**
 * @typedef {'start' | 'ok' | 'failed'} ReportPhaseType
 * @typedef {{ url: string, secretKey: string }} ReportSettingsType
 * @typedef {{ jobId: string | null, appId: string | null, branch: string | null, region: string | null, commit: string | null, stamp: string | null, reportBranch: string | null }} BuildIdentityType
 * @typedef {{ id: number, build_status: string, job_id: string | null }} OpenRowType
 * @typedef {'started' | 'built' | 'succeeded' | 'failed' | 'none' | 'other_branch'} ReportActionType
 * @typedef {{ publishId: number | null, action: ReportActionType }} ReportResultType
 */

// Mirrors BUILD_CONFIRMATION_TIMEOUT_MS in src/core/publish.ts: an older open publish is not the one this build serves.
const OPEN_WINDOW_MS = 30 * 60 * 1000

/**
 * The publish log, from the build's environment: Amplify passes the app's variables to the build.
 * @param {Record<string, string | undefined>} env
 * @param {string} [envLabel] the env file(s) read, for the messages
 * @returns {ReportSettingsType}
 */
export const reportSettings = (env, envLabel = 'the env file') => {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY'].filter(key => !env[key])
  if (missing.length > 0) throw new CliError(`Missing ${missing.join(', ')} in the environment or ${envLabel}: the build cannot reach the publish log.`)
  return { url: /** @type {string} */ (env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, ''), secretKey: /** @type {string} */ (env.SUPABASE_SECRET_KEY) }
}

/** @returns {string | null} the checked-out commit, where there is a git checkout */
const gitHead = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null
  } catch {
    return null
  }
}

/**
 * Who this build is, from Amplify's build variables; the stamp is the one withCms gives the same build. A webhook build
 * gets AWS_COMMIT_ID as "HEAD", so the commit comes from the checkout then. CMS_BUILD_BRANCH names the branch that
 * builds publishes (the one the hook points at); the other branches of the app report nothing.
 * @param {Record<string, string | undefined>} [env]
 * @param {() => string | null} [head]
 * @returns {BuildIdentityType}
 */
export const buildIdentity = (env = process.env, head = gitHead) => ({
  jobId: env.AWS_JOB_ID || null,
  appId: env.AWS_APP_ID || null,
  branch: env.AWS_BRANCH || null,
  region: env.AWS_REGION || null,
  commit: env.AWS_COMMIT_ID && env.AWS_COMMIT_ID !== 'HEAD' ? env.AWS_COMMIT_ID : head(),
  stamp: buildStamp(env),
  reportBranch: env.CMS_BUILD_BRANCH || null
})

/**
 * The deployment in the Amplify console; mirrors amplifyConsoleUrl in src/core/publish.ts.
 * @param {{ region: string | null, app_id: string | null, branch: string | null, job_id: string | null }} row
 */
export const consoleUrlOf = ({ region, app_id: appId, branch, job_id: jobId }) =>
  (region && appId && branch && jobId ? `https://${region}.console.aws.amazon.com/amplify/apps/${appId}/branches/${encodeURIComponent(branch)}/deployments/${jobId}` : null)

/**
 * Reports one phase of the site's build to the publish that asked for it: --start takes the open publish (by the job
 * the hook stored, else the oldest open one of the last 30 minutes), --ok leaves it built with the stamp the site
 * will serve (success right away when nothing can confirm a deploy), --failed closes it. On Amplify, --ok and --failed
 * only close the publish this build's --start claimed (same job): a build of another branch, or one that started
 * before the publish existed, must not take it. No open publish: nothing.
 * @param {{ phase: ReportPhaseType, settings: ReportSettingsType, identity: BuildIdentityType, fetch?: typeof fetch, now?: () => number }} options
 * @returns {Promise<ReportResultType>}
 */
export const runBuildReport = async ({ phase, settings, identity, fetch: get = fetch, now = Date.now }) => {
  const { url, secretKey } = settings
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'content-type': 'application/json' }
  /** @param {string} query @param {RequestInit} [init] */
  const rest = async (query, init) => {
    const response = await get(`${url}/rest/v1/publish_log${query}`, { ...init, headers })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new CliError(`Supabase refused the publish log (HTTP ${response.status}${body?.message ? `: ${body.message}` : ''}).`)
    return body
  }

  if (identity.reportBranch && identity.branch !== identity.reportBranch) return { publishId: null, action: 'other_branch' }

  const open = 'build_status=in.(pending,building)'
  /** @returns {Promise<OpenRowType | null>} */
  const find = async () => {
    if (identity.jobId) {
      const [own] = /** @type {OpenRowType[]} */ (await rest(`?select=id,build_status,job_id&${open}&job_id=eq.${encodeURIComponent(identity.jobId)}&limit=1`)) ?? []
      if (own || phase !== 'start') return own ?? null
    }
    const since = new Date(now() - OPEN_WINDOW_MS).toISOString()
    const [oldest] = /** @type {OpenRowType[]} */ (await rest(`?select=id,build_status,job_id&${open}&job_id=is.null&requested_at=gte.${since}&order=requested_at.asc&limit=1`)) ?? []
    return oldest ?? null
  }

  const row = await find()
  if (!row) return { publishId: null, action: 'none' }

  const where = { ...(identity.jobId ? { job_id: identity.jobId } : {}), app_id: identity.appId, branch: identity.branch, region: identity.region, commit: identity.commit }
  /** @param {Record<string, unknown>} values */
  const patch = values => rest(`?id=eq.${row.id}&${open}`, { method: 'PATCH', body: JSON.stringify({ ...where, ...values }) })
  const at = () => new Date(now()).toISOString()

  if (phase === 'start') {
    await patch({ build_status: 'building' })
    return { publishId: row.id, action: 'started' }
  }
  if (phase === 'failed') {
    await patch({ build_status: 'failed', error_code: 'build_failed', error_detail: null, finished_at: at() })
    return { publishId: row.id, action: 'failed' }
  }
  if (identity.stamp) {
    await patch({ build_status: 'built', build_stamp: identity.stamp, built_at: at() })
    return { publishId: row.id, action: 'built' }
  }
  await patch({ build_status: 'success', finished_at: at() })
  return { publishId: row.id, action: 'succeeded' }
}

/** @param {ReportPhaseType} phase @param {ReportResultType} result @param {BuildIdentityType} identity @returns {string} */
export const describeBuildReport = (phase, result, identity) => {
  const job = identity.jobId ? ` (job ${identity.jobId})` : ''
  if (result.action === 'other_branch') return `build:report --${phase}: this build is of ${identity.branch ?? 'no branch'} and publishes are built from ${identity.reportBranch} (CMS_BUILD_BRANCH); nothing to report.`
  if (result.action === 'none' && phase !== 'start' && identity.jobId) return `build:report --${phase}: no publish claimed this build${job} at --start; nothing to report.`
  if (result.action === 'none') return `build:report --${phase}: no open publish asked for this build${job}; nothing to report.`
  if (result.action === 'started') return `build:report: publish #${result.publishId} is being built by this build${job}.`
  if (result.action === 'failed') return `build:report: publish #${result.publishId} failed with this build${job}.`
  if (result.action === 'built') return `build:report: publish #${result.publishId} is built (stamp ${identity.stamp}); the panel confirms it once the site serves this build.`
  return `build:report: publish #${result.publishId} succeeded${job}; without a stamp (CMS_BUILD_STAMP or Amplify's AWS_JOB_ID) the deploy cannot be confirmed, so the build's end counts.`
}
