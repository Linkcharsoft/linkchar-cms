import { describe, expect, it, vi } from 'vitest'
import { readRedirects, withCms } from '../index.js'

describe('withCms', () => {
  it('compiles the package with the project and allows the Supabase images', () => {
    const config = withCms(
      { transpilePackages: ['@linkcharsoft/cms', 'other'], images: { remotePatterns: [{ hostname: 'cdn.test' }] } },
      { supabaseUrl: 'https://abc.supabase.co', publishableKey: 'key', redirects: false }
    )
    expect(config.transpilePackages).toEqual(['@linkcharsoft/cms', 'other'])
    expect(config.images?.remotePatterns).toEqual([
      { hostname: 'cdn.test' },
      { protocol: 'https', hostname: 'abc.supabase.co', port: '', pathname: '/storage/v1/object/public/media/**' }
    ])
    expect(config.images).not.toHaveProperty('dangerouslyAllowLocalIP')
  })

  it('lets Next optimize images from a local Supabase', () => {
    const config = withCms({}, { supabaseUrl: 'http://127.0.0.1:54421', publishableKey: 'key' })
    expect(config.images).toMatchObject({ dangerouslyAllowLocalIP: true, remotePatterns: [{ protocol: 'http', hostname: '127.0.0.1', port: '54421' }] })
  })

  it('keeps the project redirects and skips the database without credentials', async () => {
    const own = [{ source: '/viejo', destination: '/', permanent: true }]
    const config = withCms({ redirects: async () => own }, { supabaseUrl: undefined, publishableKey: undefined })
    expect(await config.redirects?.()).toEqual(own)
  })

  it('keeps next dev running when the redirects cannot be read', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const own = [{ source: '/viejo', destination: '/', permanent: true }]
    try {
      const config = withCms({ redirects: async () => own }, { supabaseUrl: 'http://127.0.0.1:9', publishableKey: 'key' })
      expect(await config.redirects?.()).toEqual(own)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Running without the published redirects'))
    } finally {
      warn.mockRestore()
    }
  })

  it('skips the database while next typegen runs', async () => {
    const argv = process.argv
    process.argv = [...argv, 'typegen']
    try {
      const config = withCms({}, { supabaseUrl: 'http://127.0.0.1:9', publishableKey: 'key' })
      expect(await config.redirects?.()).toEqual([])
    } finally {
      process.argv = argv
    }
  })
})

describe('readRedirects', () => {
  it('maps the redirects table and escapes what Next reads as patterns', async () => {
    const fetcher = vi.fn(async () => Response.json([
      { from_path: '/blog/casa', to_path: '/blog/casa-nueva', status: 301 },
      { from_path: '/promo(2026)', to_path: '/promo', status: 302 }
    ]))
    expect(await readRedirects('https://abc.supabase.co/', 'key', fetcher)).toEqual([
      { source: '/blog/casa', destination: '/blog/casa-nueva', permanent: true },
      { source: '/promo\\(2026\\)', destination: '/promo', permanent: false }
    ])
    expect(fetcher).toHaveBeenCalledWith('https://abc.supabase.co/rest/v1/redirects?select=from_path,to_path,status&order=from_path', {
      headers: { apikey: 'key', Authorization: 'Bearer key' }
    })
  })

  it('fails the build when they cannot be read', async () => {
    await expect(readRedirects('https://abc.supabase.co', 'key', async () => new Response('', { status: 500 }))).rejects.toThrow('HTTP 500')
  })
})
