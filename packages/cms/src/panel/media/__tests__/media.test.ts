import { afterEach, describe, expect, it, vi } from 'vitest'
import { sha256Hex } from '../hashBlob'
import { fitWithin } from '../processImage'
import uploadToStorage, { UploadError } from '../uploadToStorage'

describe('sha256Hex', () => {
  it('hashes the file bytes as lowercase hex', async () => {
    expect(await sha256Hex(new Blob(['hola']))).toBe('b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79')
  })
})

describe('fitWithin', () => {
  it('keeps images that already fit', () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 })
  })

  it('scales the longest side down to the limit, keeping the ratio', () => {
    expect(fitWithin(6000, 4000)).toEqual({ width: 2560, height: 1707 })
    expect(fitWithin(3000, 6000)).toEqual({ width: 1280, height: 2560 })
    expect(fitWithin(4000, 3000, 16)).toEqual({ width: 16, height: 12 })
  })
})

class FakeXhr {
  static last: FakeXhr
  headers: Record<string, string> = {}
  url = ''
  status = 200
  upload: { onprogress?: (event: { lengthComputable: boolean, loaded: number, total: number }) => void } = {}
  onload?: () => void
  onerror?: () => void
  constructor () { FakeXhr.last = this }
  open (_method: string, url: string) { this.url = url }
  setRequestHeader (name: string, value: string) { this.headers[name] = value }
  send () {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 })
    this.onload?.()
  }
}

const supabase = { url: 'http://127.0.0.1:54321/', publishableKey: 'publishable' }

afterEach(() => vi.unstubAllGlobals())

describe('uploadToStorage', () => {
  it('posts to the media bucket with the user token and reports progress', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
    const progress: number[] = []

    await uploadToStorage({
      supabase,
      path: 'blog/2026/x.webp',
      blob: new Blob(['x'], { type: 'image/webp' }),
      accessToken: 'token',
      onProgress: ratio => progress.push(ratio)
    })

    expect(FakeXhr.last.url).toBe('http://127.0.0.1:54321/storage/v1/object/media/blog/2026/x.webp')
    expect(FakeXhr.last.headers).toMatchObject({
      Authorization: 'Bearer token',
      apikey: 'publishable',
      'x-upsert': 'false',
      'Content-Type': 'image/webp'
    })
    expect(progress).toEqual([0.5])
  })

  it('rejects with the reason when Storage refuses the file', async () => {
    class TooLarge extends FakeXhr { status = 413 }
    vi.stubGlobal('XMLHttpRequest', TooLarge)

    const upload = uploadToStorage({ supabase, path: 'p', blob: new Blob(['x']), accessToken: 't' })
    await expect(upload).rejects.toBeInstanceOf(UploadError)
    await expect(upload).rejects.toMatchObject({ reason: 'tooLarge' })
  })
})
