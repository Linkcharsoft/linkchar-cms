import { describe, expect, it } from 'vitest'
import { importSettings } from '../import.js'

const supabase = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:44421',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
  SUPABASE_SECRET_KEY: 'sb_secret_x'
}

describe('importSettings', () => {
  it('signs in with --email and the password from the environment', () => {
    expect(importSettings({ ...supabase, CMS_IMPORT_PASSWORD: 'secreto' }, { email: 'ana@acme.com', otp: '123456' })).toEqual({
      email: 'ana@acme.com',
      password: 'secreto',
      otp: '123456',
      supabase: { url: 'http://127.0.0.1:44421', publishableKey: 'sb_publishable_x', secretKey: 'sb_secret_x' },
      build: { kind: 'mock' }
    })
  })

  it('builds like the project: Amplify with a hook, nothing on a hosted project without one', () => {
    const hosted = { ...supabase, NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' }
    expect(importSettings({ ...hosted, CMS_BUILD_HOOK_URL: 'https://hook', CMS_BUILD_WEBHOOK_SECRET: 's' }, { email: 'a@b.co', password: 'p' }).build)
      .toEqual({ kind: 'amplify', hookUrl: 'https://hook', webhookSecret: 's' })
    expect(importSettings(hosted, { email: 'a@b.co', password: 'p' }).build).toEqual({ kind: 'none' })
  })

  it('names what is missing', () => {
    expect(() => importSettings(supabase, { email: 'ana@acme.com' })).toThrow('CMS_IMPORT_PASSWORD')
    expect(() => importSettings({ CMS_IMPORT_EMAIL: 'a@b.co', CMS_IMPORT_PASSWORD: 'p' }, {}))
      .toThrow('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY')
  })
})
