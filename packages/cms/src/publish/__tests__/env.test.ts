import { describe, expect, it } from 'vitest'
import { publishTargetFromEnv } from '../env'
import { isLocalSupabaseUrl } from '../local'

describe('publishTargetFromEnv', () => {
  it('takes Amplify with a build hook, wherever the database is', () => {
    const target = publishTargetFromEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', CMS_BUILD_HOOK_URL: 'https://hooks.example', CMS_BUILD_WEBHOOK_SECRET: 's' })
    expect(target).toMatchObject({ name: 'amplify' })
    expect(target?.localOnly).toBeUndefined()
  })

  it('simulates the build only against a local Supabase', () => {
    expect(publishTargetFromEnv({ NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:44421' })).toMatchObject({ name: 'mock', localOnly: true })
    expect(publishTargetFromEnv({ NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321/' }, { mock: { allowRemote: true } })).toMatchObject({ name: 'mock', localOnly: false })
    expect(publishTargetFromEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' })).toBeNull()
    expect(publishTargetFromEnv({})).toBeNull()
  })

  it('knows a local Supabase by its host', () => {
    expect(isLocalSupabaseUrl('http://127.0.0.1:44421')).toBe(true)
    expect(isLocalSupabaseUrl('http://localhost')).toBe(true)
    expect(isLocalSupabaseUrl('https://abc.supabase.co')).toBe(false)
    expect(isLocalSupabaseUrl('http://127.0.0.1.evil.test')).toBe(false)
    expect(isLocalSupabaseUrl(undefined)).toBe(false)
  })
})
