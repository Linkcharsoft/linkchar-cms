import { describe, expect, it } from 'vitest'
import { buildIdentity, consoleUrlOf, describeBuildReport, reportSettings, runBuildReport } from '../build.js'

type RowType = Record<string, unknown> & { id: number, build_status: string, job_id: string | null, requested_at: string }

const settings = { url: 'http://127.0.0.1:44421', secretKey: 'sk' }
const NOW = 1_000_000
const at = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString()
const amplify = { jobId: '7', appId: 'd1', branch: 'main', region: 'us-east-1', commit: 'abc', stamp: 'd1.main.7', reportBranch: null }
const nowhere = { jobId: null, appId: null, branch: null, region: null, commit: null, stamp: null, reportBranch: null }

const isOpen = (row: RowType) => ['pending', 'building'].includes(row.build_status)

// publish_log behind PostgREST: the two lookups of an open publish and the patches, which only touch an open row.
const fakeLog = (rows: RowType[]) => {
  const requests: string[] = []
  const get = (async (url: string, init?: RequestInit) => {
    const query = decodeURIComponent(url.replace('http://127.0.0.1:44421/rest/v1/publish_log', ''))
    requests.push(`${init?.method ?? 'GET'} ${query}`)
    if (init?.method === 'PATCH') {
      const row = rows.find(current => current.id === Number(/id=eq\.(\d+)/.exec(query)?.[1]))
      if (row && isOpen(row)) Object.assign(row, JSON.parse(String(init.body)))
      return Response.json([])
    }
    const jobId = /job_id=eq\.([^&]+)/.exec(query)?.[1]
    if (jobId) return Response.json(rows.filter(row => isOpen(row) && row.job_id === jobId).slice(0, 1))
    const since = /requested_at=gte\.([^&]+)/.exec(query)![1]
    const only = /&branch=eq\.([^&]+)/.exec(query)?.[1]
    const either = /&or=\(branch\.eq\."([^"]+)",branch\.is\.null\)/.exec(query)?.[1]
    const ofBranch = (row: RowType) => (only ? row.branch === only : either ? row.branch === either || row.branch == null : true)
    const open = rows.filter(row => isOpen(row) && row.job_id === null && row.requested_at >= since && ofBranch(row))
    return Response.json(open.sort((a, b) => a.requested_at.localeCompare(b.requested_at)).slice(0, 1))
  }) as typeof fetch
  return { rows, requests, get }
}

const row = (id: number, values: Partial<RowType> = {}): RowType => ({ id, build_status: 'building', job_id: null, requested_at: at(3), ...values })

const report = (phase: 'start' | 'ok' | 'failed', log: ReturnType<typeof fakeLog>, identity: Parameters<typeof runBuildReport>[0]['identity'] = amplify) =>
  runBuildReport({ phase, settings, identity, fetch: log.get, now: () => NOW })

describe('runBuildReport', () => {
  it('--start takes the oldest open publish of the last 30 minutes and names the job that builds it', async () => {
    const log = fakeLog([row(1, { requested_at: at(45) }), row(2, { requested_at: at(5), build_status: 'pending' }), row(3, { requested_at: at(2) })])
    const result = await report('start', log)
    expect(result).toEqual({ publishId: 2, action: 'started' })
    expect(log.rows[1]).toMatchObject({ build_status: 'building', job_id: '7', app_id: 'd1', branch: 'main', region: 'us-east-1', commit: 'abc' })
    expect(log.rows[0]).toMatchObject({ job_id: null })
    expect(log.rows[2]).toMatchObject({ job_id: null })
    expect(describeBuildReport('start', result, amplify)).toBe('build:report: publish #2 is being built by this build (job 7).')
  })

  it('--ok finds the publish --start claimed and leaves it built with the stamp the site will serve', async () => {
    const log = fakeLog([row(2, { job_id: '7', requested_at: at(9) }), row(3, { requested_at: at(1) })])
    const result = await report('ok', log)
    expect(result).toEqual({ publishId: 2, action: 'built' })
    expect(log.rows[0]).toMatchObject({ build_status: 'built', build_stamp: 'd1.main.7', built_at: at(0), job_id: '7' })
    expect(log.rows[1].build_status).toBe('building')
    expect(describeBuildReport('ok', result, amplify)).toContain('publish #2 is built (stamp d1.main.7)')
  })

  it('--ok and --failed never take a publish this build\'s --start did not claim', async () => {
    const log = fakeLog([row(2, { requested_at: at(9) }), row(3, { job_id: '9', requested_at: at(1) })])
    expect(await report('ok', log)).toEqual({ publishId: null, action: 'none' })
    expect(await report('failed', log)).toEqual({ publishId: null, action: 'none' })
    expect(log.rows.map(current => current.build_status)).toEqual(['building', 'building'])
    expect(log.requests.filter(request => request.includes('job_id=is.null'))).toEqual([])
    expect(describeBuildReport('ok', { publishId: null, action: 'none' }, amplify)).toBe('build:report --ok: no publish claimed this build (job 7) at --start; nothing to report.')
  })

  it('--start claims the publishes of its own branch, and the ones without a branch only from the default branch', async () => {
    const preview = { ...amplify, branch: 'new-landing', jobId: '8', stamp: 'd1.new-landing.8' }
    const log = fakeLog([row(2, { branch: 'new-landing', requested_at: at(9) }), row(3, { branch: 'main', requested_at: at(8) }), row(4, { branch: null, requested_at: at(7) })])
    expect(await report('start', log, preview)).toEqual({ publishId: 2, action: 'started' })
    expect(log.rows[0]).toMatchObject({ job_id: '8', branch: 'new-landing' })
    expect(await report('start', log, { ...preview, jobId: '10' })).toEqual({ publishId: null, action: 'none' })
    expect(describeBuildReport('start', { publishId: null, action: 'none' }, preview)).toBe('build:report --start: no open publish asked for a build of new-landing (job 8); nothing to report.')
    expect(await report('start', log)).toEqual({ publishId: 3, action: 'started' })
    expect(await report('start', log, { ...amplify, jobId: '9' })).toEqual({ publishId: 4, action: 'started' })
    expect(log.rows[2]).toMatchObject({ job_id: '9', branch: 'main' })
  })

  it('CMS_BUILD_BRANCH moves the publishes without a branch to another branch\'s build', async () => {
    const log = fakeLog([row(4, { branch: null })])
    expect(await report('start', log, { ...amplify, reportBranch: 'production' })).toEqual({ publishId: null, action: 'none' })
    expect(await report('start', log, { ...amplify, branch: 'production', reportBranch: 'production' })).toEqual({ publishId: 4, action: 'started' })
    const none = fakeLog([row(5, { branch: null })])
    expect(await report('start', none, nowhere)).toEqual({ publishId: 5, action: 'started' })
  })

  it('--ok without a stamp closes the publish as a success, since no deploy can be confirmed', async () => {
    const log = fakeLog([row(4)])
    const result = await report('ok', log, nowhere)
    expect(result).toEqual({ publishId: 4, action: 'succeeded' })
    expect(log.rows[0]).toMatchObject({ build_status: 'success', finished_at: at(0), job_id: null })
    expect(describeBuildReport('ok', result, nowhere)).toContain('without a stamp')
  })

  it('--failed closes the publish with the build as the reason', async () => {
    const log = fakeLog([row(5, { job_id: '7' })])
    expect(await report('failed', log)).toEqual({ publishId: 5, action: 'failed' })
    expect(log.rows[0]).toMatchObject({ build_status: 'failed', error_code: 'build_failed', finished_at: at(0) })
  })

  it('does nothing without an open publish: a push build, or a publish a webhook already closed', async () => {
    const log = fakeLog([row(6, { build_status: 'success', job_id: '7' }), row(7, { build_status: 'failed' })])
    for (const phase of ['start', 'ok', 'failed'] as const) {
      const result = await report(phase, log)
      expect(result).toEqual({ publishId: null, action: 'none' })
      expect(describeBuildReport(phase, result, amplify)).toContain('nothing to report')
    }
    expect(log.requests.filter(request => request.startsWith('PATCH'))).toEqual([])
    expect(log.rows[0].build_status).toBe('success')
  })

  it('--start asks the log for the open publish by job first, then by age', async () => {
    const log = fakeLog([])
    await report('start', log)
    expect(log.requests).toEqual([
      'GET ?select=id,build_status,job_id&build_status=in.(pending,building)&job_id=eq.7&limit=1',
      `GET ?select=id,build_status,job_id&build_status=in.(pending,building)&job_id=is.null&requested_at=gte.${at(30)}&or=(branch.eq."main",branch.is.null)&order=requested_at.asc&limit=1`
    ])
  })

  it('reports what Supabase refused', async () => {
    const refused = (async () => Response.json({ message: 'permission denied' }, { status: 403 })) as unknown as typeof fetch
    await expect(runBuildReport({ phase: 'start', settings, identity: amplify, fetch: refused })).rejects.toThrow('Supabase refused the publish log (HTTP 403: permission denied)')
  })
})

describe('reportSettings and buildIdentity', () => {
  it('needs the Supabase URL and the secret key', () => {
    expect(reportSettings({ NEXT_PUBLIC_SUPABASE_URL: 'http://db/', SUPABASE_SECRET_KEY: 'sk' })).toEqual({ url: 'http://db', secretKey: 'sk' })
    expect(() => reportSettings({ NEXT_PUBLIC_SUPABASE_URL: 'http://db' }, '.env.local')).toThrow('Missing SUPABASE_SECRET_KEY in the environment or .env.local')
  })

  it('reads the build from Amplify\'s variables, with the stamp withCms gives the same build', () => {
    const head = () => 'deadbeef'
    expect(buildIdentity({ AWS_JOB_ID: '7', AWS_APP_ID: 'd1', AWS_BRANCH: 'main', AWS_REGION: 'us-east-1', AWS_COMMIT_ID: 'abc' }, head)).toEqual(amplify)
    expect(buildIdentity({ CMS_BUILD_STAMP: 'given', AWS_JOB_ID: '' }, () => null)).toEqual({ ...nowhere, stamp: 'given' })
    expect(buildIdentity({}, () => null)).toEqual(nowhere)
    expect(buildIdentity({ AWS_JOB_ID: '7', AWS_COMMIT_ID: 'HEAD', CMS_BUILD_BRANCH: 'main' }, head)).toMatchObject({ commit: 'deadbeef', reportBranch: 'main' })
    expect(buildIdentity({}).commit).toMatch(/^[0-9a-f]{40}$/)
  })

  it('links the deployment in the Amplify console', () => {
    expect(consoleUrlOf({ region: 'us-east-1', app_id: 'd1', branch: 'main', job_id: '7' })).toBe('https://us-east-1.console.aws.amazon.com/amplify/apps/d1/branches/main/deployments/7')
    expect(consoleUrlOf({ region: null, app_id: 'd1', branch: 'main', job_id: '7' })).toBeNull()
  })
})
