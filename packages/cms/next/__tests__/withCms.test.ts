import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildStamp, findBrandIcon, readRedirects, withCms } from '../index.js'

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

  it('sets one build stamp for the build, keeps the one its workers inherit and inlines it for the site', () => {
    delete process.env.CMS_BUILD_STAMP
    try {
      const config = withCms({}, { supabaseUrl: 'https://abc.supabase.co', publishableKey: 'key', redirects: false })
      const stamp = process.env.CMS_BUILD_STAMP
      expect(stamp).toMatch(/^[0-9a-z]+$/)
      expect(config.env).toEqual({ CMS_BUILD_STAMP: stamp })
      withCms({}, { supabaseUrl: 'https://abc.supabase.co', publishableKey: 'key', redirects: false })
      expect(process.env.CMS_BUILD_STAMP).toBe(stamp)
    } finally {
      delete process.env.CMS_BUILD_STAMP
    }
  })

  it('takes the stamp from the Amplify job, so build:report --ok can name the same build', () => {
    expect(buildStamp({ AWS_APP_ID: 'd1abc', AWS_BRANCH: 'main', AWS_JOB_ID: '7' })).toBe('d1abc.main.7')
    expect(buildStamp({ AWS_JOB_ID: '7' })).toBe('7')
    expect(buildStamp({ CMS_BUILD_STAMP: 'given', AWS_JOB_ID: '7' })).toBe('given')
    expect(buildStamp({})).toBeNull()
    delete process.env.CMS_BUILD_STAMP
    process.env.AWS_JOB_ID = '7'
    process.env.AWS_APP_ID = 'd1abc'
    process.env.AWS_BRANCH = 'main'
    try {
      withCms({}, { redirects: false })
      expect(process.env.CMS_BUILD_STAMP).toBe('d1abc.main.7')
    } finally {
      delete process.env.CMS_BUILD_STAMP
      delete process.env.AWS_JOB_ID
      delete process.env.AWS_APP_ID
      delete process.env.AWS_BRANCH
    }
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

describe('findBrandIcon', () => {
  let root: string

  const png = (width: number) => {
    const head = Buffer.alloc(24)
    head.write('IHDR', 12, 'latin1')
    head.writeUInt32BE(width, 16)
    return head
  }
  const add = (file: string, content: string | Buffer = '') => {
    mkdirSync(join(root, file, '..'), { recursive: true })
    writeFileSync(join(root, file), content)
  }

  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'cms-icon-')) })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('prefers the app icon Next serves', () => {
    add('public/favicon192.png', png(192))
    add('src/app/favicon.ico')
    add('src/app/icon.png', png(512))
    expect(findBrandIcon(root)).toEqual({ url: '/icon.png', file: 'src/app/icon.png' })
  })

  it('takes the largest favicon in public/ before a favicon.ico', () => {
    add('app/favicon.ico')
    add('public/favicon.png', png(16))
    add('public/favicon192.png', png(192))
    add('public/favicon48.png', png(48))
    add('public/og.png', png(1200))
    expect(findBrandIcon(root)).toEqual({ url: '/favicon192.png', file: 'public/favicon192.png' })
  })

  it('looks under public/seo/ after public/', () => {
    add('public/seo/favicon.png', png(32))
    add('public/seo/favicon192.png', png(192))
    expect(findBrandIcon(root)).toEqual({ url: '/seo/favicon192.png', file: 'public/seo/favicon192.png' })
    add('public/seo/icon.svg')
    expect(findBrandIcon(root)).toEqual({ url: '/seo/icon.svg', file: 'public/seo/icon.svg' })
    add('public/favicon.png', png(16))
    expect(findBrandIcon(root)).toEqual({ url: '/favicon.png', file: 'public/favicon.png' })
  })

  it('falls back to favicon.ico, and to nothing', () => {
    expect(findBrandIcon(root)).toBeNull()
    add('app/favicon.ico')
    expect(findBrandIcon(root)).toEqual({ url: '/favicon.ico', file: 'app/favicon.ico' })
  })

  it('reaches the panel through CMS_BRAND_ICON, under the Next basePath', () => {
    add('app/icon.svg')
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root)
    try {
      expect(withCms({ basePath: '/web' }, { redirects: false }).env).toEqual({ CMS_BRAND_ICON: '/web/icon.svg', CMS_BUILD_STAMP: expect.any(String) })
      expect(withCms({ env: { CMS_BRAND_ICON: '/own.png' } }, { redirects: false }).env).toEqual({ CMS_BRAND_ICON: '/own.png', CMS_BUILD_STAMP: expect.any(String) })
    } finally {
      cwd.mockRestore()
    }
  })
})
