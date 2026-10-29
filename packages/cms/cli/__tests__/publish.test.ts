import { describe, expect, it } from 'vitest'
import { describePing, maskHookUrl, pingSettings, runPing } from '../publish.js'

type RowType = { id: number, build_status: string, job_id: string | null, error_code: string | null, error_detail: string | null, requested_at: string }

const settings = { url: 'http://127.0.0.1:44421', secretKey: 'sk', hookUrl: 'https://hooks.example', webhookSecret: 's', siteUrl: 'https://acme.com' }

// A publish_log behind PostgREST: the latest row, the insert and the patches the ping sends.
const fakeLog = (rows: RowType[] = [], now = () => 1_000_000) => {
  const requests: string[] = []
  const get = (async (url: string, init?: RequestInit) => {
    const query = url.replace('http://127.0.0.1:44421/rest/v1/publish_log', '')
    requests.push(`${init?.method ?? 'GET'} ${query}`)
    if (init?.method === 'POST') {
      const row: RowType = { id: rows.length + 1, build_status: 'pending', job_id: null, error_code: null, error_detail: null, requested_at: new Date(now()).toISOString() }
      rows.push(row)
      return Response.json([row])
    }
    const id = Number(/id=eq\.(\d+)/.exec(query)?.[1])
    if (init?.method === 'PATCH') {
      const onlyWhile = /build_status=eq\.(\w+)/.exec(query)?.[1]
      const row = rows.find(current => current.id === id)
      if (row && (!onlyWhile || row.build_status === onlyWhile)) Object.assign(row, JSON.parse(String(init.body)))
      return Response.json([])
    }
    if (id) return Response.json(rows.filter(row => row.id === id))
    return Response.json([...rows].sort((a, b) => Date.parse(b.requested_at) - Date.parse(a.requested_at)).slice(0, 1))
  }) as typeof fetch
  return { rows, requests, get }
}

describe('pingSettings', () => {
  it('needs the secret key and the build hook', () => {
    expect(pingSettings({ NEXT_PUBLIC_SUPABASE_URL: 'http://db/', SUPABASE_SECRET_KEY: 'sk', CMS_BUILD_HOOK_URL: 'https://hook', CMS_BUILD_WEBHOOK_SECRET: 's', NEXT_PUBLIC_SITE_URL: 'https://acme.com/' }))
      .toEqual({ url: 'http://db', secretKey: 'sk', hookUrl: 'https://hook', webhookSecret: 's', siteUrl: 'https://acme.com' })
    expect(pingSettings({ NEXT_PUBLIC_SUPABASE_URL: 'http://db', SUPABASE_SECRET_KEY: 'sk', CMS_BUILD_HOOK_URL: 'https://hook' }, '.env', 'https://site.test').siteUrl).toBe('https://site.test')
    expect(pingSettings({ NEXT_PUBLIC_SUPABASE_URL: 'http://db', SUPABASE_SECRET_KEY: 'sk', CMS_BUILD_HOOK_URL: 'https://hook' }).siteUrl).toBeNull()
    expect(() => pingSettings({ NEXT_PUBLIC_SUPABASE_URL: 'http://db', SUPABASE_SECRET_KEY: 'sk' })).toThrow('CMS_BUILD_HOOK_URL')
    expect(() => pingSettings({ CMS_BUILD_HOOK_URL: 'https://hook' })).toThrow('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY')
  })

  it('shows the hook without its token', () => {
    expect(maskHookUrl('https://webhooks.amplify.us-east-1.amazonaws.com/prod/webhooks?id=abc-123&token=SECRET&operation=startbuild'))
      .toBe('https://webhooks.amplify.us-east-1.amazonaws.com/prod/webhooks?id=abc-123')
    expect(maskHookUrl('https://hooks.example/build')).toBe('https://hooks.example/build')
    expect(maskHookUrl('nope')).toBe('(unreadable URL)')
  })
})

describe('runPing', () => {
  it('logs an empty publish, fires the hook and reports the success the webhook writes', async () => {
    let clock = 1_000_000
    const log = fakeLog([], () => clock)
    const lines: string[] = []
    const trigger = async () => ({ ok: true as const, jobId: '42' })
    const sleep = async () => {
      clock += 60_000
      const row = log.rows[0]
      if (clock >= 1_180_000) Object.assign(row, { build_status: 'success', job_id: '42' })
      else if (clock >= 1_060_000) Object.assign(row, { build_status: 'building', job_id: '42' })
    }
    const result = await runPing({ settings, trigger, timeoutMs: 20 * 60_000, fetch: log.get, sleep, now: () => clock, log: line => lines.push(line) })
    expect(result).toEqual({ ok: true, id: 1, jobId: '42', minutes: 3 })
    expect(log.requests.slice(0, 3)).toEqual(['GET ?select=id,build_status,requested_at&order=requested_at.desc&limit=1', 'POST ', 'PATCH ?id=eq.1&build_status=eq.pending'])
    expect(log.rows[0]).toMatchObject({ build_status: 'success', job_id: '42' })
    expect(lines).toEqual([
      'Publish #1 logged (no documents). Triggering the build hook…',
      'Hook accepted (job 42). Waiting for the build to report…',
      '#1: success (job 42) after 3 min'
    ])
    expect(describePing(result)).toContain('the publish circuit works')
  })

  it('refuses while a publish is still building', async () => {
    const log = fakeLog([{ id: 7, build_status: 'building', job_id: '1', error_code: null, error_detail: null, requested_at: new Date(1_000_000 - 5 * 60_000).toISOString() }])
    await expect(runPing({ settings, trigger: async () => ({ ok: true, jobId: null }), timeoutMs: 1, fetch: log.get, sleep: async () => {}, now: () => 1_000_000, log: () => {} }))
      .rejects.toThrow('Publish #7 is still building (5 min ago)')
    expect(log.rows).toHaveLength(1)
  })

  it('goes past a publish that never heard back after 30 minutes', async () => {
    const log = fakeLog([{ id: 7, build_status: 'building', job_id: '1', error_code: null, error_detail: null, requested_at: new Date(1_000_000 - 31 * 60_000).toISOString() }])
    let clock = 1_000_000
    const result = await runPing({ settings, trigger: async () => ({ ok: true, jobId: '9' }), timeoutMs: 10 * 60_000, intervalMs: 60_000, fetch: log.get, sleep: async () => { clock += 60_000 }, now: () => clock, log: () => {} })
    expect(result).toEqual({ ok: false, id: 2, code: 'unconfirmed', detail: null, minutes: 10, stage: 'no_end', consoleUrl: null, siteUrl: 'https://acme.com' })
    expect(describePing(result)).toContain('never reported its end')
    expect(log.rows[1]).toMatchObject({ build_status: 'building', job_id: '9' })
  })

  it('tells a build that never reported from one that never ended, and names the deployment', async () => {
    let clock = 1_000_000
    const silent = fakeLog([], () => clock)
    const quiet = await runPing({ settings, trigger: async () => ({ ok: true, jobId: null }), timeoutMs: 5 * 60_000, intervalMs: 60_000, fetch: silent.get, sleep: async () => { clock += 60_000 }, now: () => clock, log: () => {} })
    expect(quiet).toMatchObject({ ok: false, code: 'unconfirmed', stage: 'no_start' })
    expect(describePing(quiet)).toContain('build:report --start')

    clock = 1_000_000
    const started = fakeLog([], () => clock)
    const sleep = async () => {
      clock += 60_000
      Object.assign(started.rows[0], { job_id: '7', app_id: 'd1', branch: 'main', region: 'us-east-1' })
    }
    const endless = await runPing({ settings, trigger: async () => ({ ok: true, jobId: null }), timeoutMs: 3 * 60_000, intervalMs: 60_000, fetch: started.get, sleep, now: () => clock, log: () => {} })
    expect(endless).toMatchObject({ stage: 'no_end', consoleUrl: 'https://us-east-1.console.aws.amazon.com/amplify/apps/d1/branches/main/deployments/7' })
    expect(describePing(endless)).toContain('deployments/7')
  })

  it('confirms a built publish itself once the site serves the stamp, and reports a deploy that never does', async () => {
    const site = (stamp: string) => (async (url: string, init?: RequestInit) => (url.startsWith('https://acme.com/') ? Response.json({ stamp }) : log.get(url, init))) as typeof fetch
    let clock = 1_000_000
    const log = fakeLog([], () => clock)
    const lines: string[] = []
    const sleep = async () => {
      clock += 60_000
      Object.assign(log.rows[0], { build_status: 'built', job_id: '7', build_stamp: 'd1.main.7' })
    }
    const result = await runPing({ settings, trigger: async () => ({ ok: true, jobId: null }), timeoutMs: 10 * 60_000, intervalMs: 60_000, fetch: site('d1.main.7'), sleep, now: () => clock, log: line => lines.push(line) })
    expect(result).toEqual({ ok: true, id: 1, jobId: '7', minutes: 1 })
    expect(log.rows[0]).toMatchObject({ build_status: 'success' })
    expect(lines.at(-1)).toBe('#1: success, the site serves d1.main.7 after 1 min')

    clock = 1_000_000
    const stale = fakeLog([], () => clock)
    const stuck = await runPing({ settings, trigger: async () => ({ ok: true, jobId: null }), timeoutMs: 3 * 60_000, intervalMs: 60_000, fetch: (async (url: string, init?: RequestInit) => (url.startsWith('https://acme.com/') ? Response.json({ stamp: 'd1.main.6' }) : stale.get(url, init))) as typeof fetch, sleep: async () => { clock += 60_000; Object.assign(stale.rows[0], { build_status: 'built', job_id: '7', build_stamp: 'd1.main.7' }) }, now: () => clock, log: () => {} })
    expect(stuck).toMatchObject({ ok: false, code: 'unconfirmed', stage: 'no_deploy', siteUrl: 'https://acme.com' })
    expect(describePing(stuck)).toContain('https://acme.com never served it')
    expect(stale.rows[0].build_status).toBe('built')

    clock = 1_000_000
    const blind = fakeLog([], () => clock)
    const unknown = await runPing({ settings: { ...settings, siteUrl: null }, trigger: async () => ({ ok: true, jobId: null }), timeoutMs: 2 * 60_000, intervalMs: 60_000, fetch: blind.get, sleep: async () => { clock += 60_000; Object.assign(blind.rows[0], { build_status: 'built', build_stamp: 'x' }) }, now: () => clock, log: () => {} })
    expect(unknown).toMatchObject({ stage: 'no_site' })
    expect(describePing(unknown)).toContain('NEXT_PUBLIC_SITE_URL')
  })

  it('records a hook the site refused and a build that failed', async () => {
    const refused = fakeLog()
    const result = await runPing({ settings, trigger: async () => ({ ok: false, code: 'hook_refused', detail: '403' }), timeoutMs: 1, fetch: refused.get, sleep: async () => {}, now: () => 1_000_000, log: () => {} })
    expect(result).toEqual({ ok: false, id: 1, code: 'hook_refused', detail: '403', minutes: 0 })
    expect(refused.rows[0]).toMatchObject({ build_status: 'failed', error_code: 'hook_refused', error_detail: '403' })
    expect(describePing(result)).toContain('check CMS_BUILD_HOOK_URL')

    let clock = 1_000_000
    const failed = fakeLog([], () => clock)
    const sleep = async () => {
      clock += 60_000
      Object.assign(failed.rows[0], { build_status: 'failed', job_id: '5', error_code: 'build_failed' })
    }
    const outcome = await runPing({ settings, trigger: async () => ({ ok: true, jobId: '5' }), timeoutMs: 60 * 60_000, fetch: failed.get, sleep, now: () => clock, log: () => {} })
    expect(outcome).toEqual({ ok: false, id: 1, code: 'build_failed', detail: null, minutes: 1 })
    expect(describePing(outcome)).toContain('Check the Amplify build log')
  })

  it('applies the events a target reports in-process', async () => {
    const log = fakeLog()
    const trigger: Parameters<typeof runPing>[0]['trigger'] = async ({ report }) => {
      await report({ jobId: 'mock-1', status: 'started' })
      await report({ jobId: 'mock-1', status: 'succeeded' })
      return { ok: true, jobId: 'mock-1' }
    }
    let clock = 1_000_000
    const result = await runPing({ settings, trigger, timeoutMs: 60_000, fetch: log.get, sleep: async () => { clock += 1_000 }, now: () => clock, log: () => {} })
    expect(result).toMatchObject({ ok: true, id: 1, jobId: 'mock-1' })
    expect(log.rows[0]).toMatchObject({ build_status: 'success', job_id: 'mock-1' })
  })
})
