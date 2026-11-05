import { describe, expect, it } from 'vitest'
import { AMPLIFY_CACHE_PATH, AMPLIFY_PULL_LINE, GITIGNORE_LINE, pullLines, pullSettings } from '../media.js'

describe('pullSettings', () => {
  it('reads with the public values the site builds with, and names what is missing', () => {
    expect(pullSettings({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk', SUPABASE_SECRET_KEY: 'sk' }))
      .toEqual({ url: 'https://abc.supabase.co', publishableKey: 'pk' })
    expect(() => pullSettings({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' }, '.env.remote')).toThrow('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the environment or .env.remote')
    expect(() => pullSettings({})).toThrow('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  })
})

describe('pullLines', () => {
  it('sums up the pull and lists the files Storage refused', () => {
    expect(pullLines({ downloaded: 3, reused: 12, removed: 1, failed: [], downloadedBytes: 3 * 1024 * 1024, totalBytes: 150 * 1024 * 1024 }, 'https://abc.supabase.co')).toEqual([
      'Media of the published content in public/cms-media: 3 files downloaded (3.0 MB), 12 reused, 1 removed; 150.0 MB in all, from https://abc.supabase.co.'
    ])
    expect(pullLines({ downloaded: 0, reused: 0, removed: 0, failed: ['sitio/2026/a.mp4'], downloadedBytes: 0, totalBytes: 0 }, 'https://abc.supabase.co')[1])
      .toBe('! 1 file could not be downloaded and the site serves it from Storage: sitio/2026/a.mp4')
  })

  it('names the lines doctor and init agree on', () => {
    expect(AMPLIFY_PULL_LINE).toBe('pnpm exec linkchar-cms media:pull')
    expect(AMPLIFY_CACHE_PATH).toBe('public/cms-media/**/*')
    expect(GITIGNORE_LINE).toBe('public/cms-media/')
  })
})
