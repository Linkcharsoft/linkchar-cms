import { afterEach, describe, expect, it, vi } from 'vitest'
import { amplify, parseAmplifyEvent } from '../amplify'
import { mockBuild } from '../mock'

const event = (detail: unknown) => ({ source: 'aws.amplify', 'detail-type': 'Amplify Deployment Status Change', detail })

const webhook = (body: unknown, authorization?: string) => new Request('http://localhost/api/cms/build-status', {
  method: 'POST',
  headers: authorization ? { authorization, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body)
})

const triggerContext = () => ({ report: async () => {}, logger: { error: vi.fn() } })

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('amplify trigger', () => {
  const target = amplify({ hookUrl: 'https://hooks.example/build', webhookSecret: 's3cret' })

  it('needs a build hook', async () => {
    expect(await amplify({ hookUrl: undefined, webhookSecret: 's' }).trigger(triggerContext())).toEqual({ ok: false, code: 'target_missing' })
  })

  it('keeps the status code when the hook refuses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('no', { status: 500 }))
    expect(await target.trigger(triggerContext())).toEqual({ ok: false, code: 'hook_refused', detail: '500' })
  })

  it('fails gracefully when the hook is unreachable, and tells the logger', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'))
    const context = triggerContext()
    expect(await target.trigger(context)).toEqual({ ok: false, code: 'hook_unreachable' })
    expect(context.logger.error).toHaveBeenCalledWith('[publish] build hook failed:', 'timeout')
  })

  it('returns the Amplify job, when the hook says it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ jobId: '42' }))
    expect(await target.trigger(triggerContext())).toEqual({ ok: true, jobId: '42' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))
    expect(await target.trigger(triggerContext())).toEqual({ ok: true, jobId: null })
  })
})

describe('amplify webhook', () => {
  const target = amplify({ hookUrl: 'https://hooks.example/build', webhookSecret: 's3cret' })

  it('reads build events sent with the shared secret', async () => {
    expect(await target.readWebhook!(webhook(event({ jobId: '12', jobStatus: 'SUCCEED' }), 'Bearer s3cret'))).toEqual({ jobId: '12', status: 'succeeded' })
  })

  it('refuses other secrets, and has no webhook when no secret is set', async () => {
    expect(await target.readWebhook!(webhook(event({ jobId: '12', jobStatus: 'SUCCEED' }), 'Bearer nope'))).toBe('unauthorized')
    expect(await target.readWebhook!(webhook(event({ jobId: '12', jobStatus: 'SUCCEED' })))).toBe('unauthorized')
    expect(amplify({ hookUrl: undefined, webhookSecret: '' }).readWebhook).toBeUndefined()
    expect(amplify({ hookUrl: 'https://hooks.example/build', webhookSecret: undefined }).readWebhook).toBeUndefined()
  })

  it('rejects bodies that are not build events', async () => {
    expect(await target.readWebhook!(webhook('not json', 'Bearer s3cret'))).toBe('invalid')
  })
})

describe('parseAmplifyEvent', () => {
  it('maps Amplify job statuses', () => {
    expect(parseAmplifyEvent(event({ appId: 'a', branchName: 'main', jobId: '12', jobStatus: 'STARTED' }))).toEqual({ jobId: '12', status: 'started' })
    expect(parseAmplifyEvent(event({ jobId: '12', jobStatus: 'SUCCEED' }))).toEqual({ jobId: '12', status: 'succeeded' })
    expect(parseAmplifyEvent(event({ jobId: '12', jobStatus: 'FAILED' }))).toEqual({ jobId: '12', status: 'failed' })
    expect(parseAmplifyEvent(event({ jobId: '12', jobStatus: 'CANCELLED' }))).toEqual({ jobId: '12', status: 'cancelled' })
  })

  it('rejects malformed or unknown events', () => {
    expect(parseAmplifyEvent(null)).toBeNull()
    expect(parseAmplifyEvent('SUCCEED')).toBeNull()
    expect(parseAmplifyEvent({ jobId: '12', jobStatus: 'SUCCEED' })).toBeNull()
    expect(parseAmplifyEvent(event({ jobId: '', jobStatus: 'SUCCEED' }))).toBeNull()
    expect(parseAmplifyEvent(event({ jobId: '12', jobStatus: 'PROVISIONING' }))).toBeNull()
    expect(parseAmplifyEvent(event({ jobId: 12, jobStatus: 'SUCCEED' }))).toBeNull()
  })
})

describe('mockBuild', () => {
  it('is meant for a local Supabase unless the project insists', () => {
    expect(mockBuild().localOnly).toBe(true)
    expect(mockBuild({ allowRemote: true }).localOnly).toBe(false)
  })

  it('reports the start and then the result', async () => {
    vi.useFakeTimers()
    const reported = vi.fn(async () => {})
    const result = await mockBuild({ result: 'failed', seconds: 5 }).trigger({ report: reported, logger: { error: vi.fn() } })
    expect(result).toMatchObject({ ok: true, jobId: expect.stringMatching(/^mock-/) })

    await vi.advanceTimersByTimeAsync(1000)
    expect(reported).toHaveBeenLastCalledWith({ jobId: result.ok && result.jobId, status: 'started' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(reported).toHaveBeenLastCalledWith({ jobId: result.ok && result.jobId, status: 'failed' })
  })
})
