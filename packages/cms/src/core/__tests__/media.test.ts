import { describe, expect, it } from 'vitest'
import { buildAvatarPath, buildMediaPath, formatBytes, isAvatarPath, isImageMime, isPathInFolder, mediaPublicUrl } from '../media'

describe('media helpers', () => {
  it('builds paths under the folder and year, never from the original filename', () => {
    const path = buildMediaPath('blog', 'image/webp', new Date('2026-10-13'))
    expect(path).toMatch(/^blog\/2026\/[0-9a-f-]{36}\.webp$/)
    expect(isPathInFolder(path, 'blog')).toBe(true)
    expect(isPathInFolder(path, 'sitio')).toBe(false)
  })

  it('rejects paths that escape the folder or use other extensions', () => {
    expect(isPathInFolder('blog/../private/cv.pdf', 'blog')).toBe(false)
    expect(isPathInFolder(`blog/2026/${crypto.randomUUID()}.html`, 'blog')).toBe(false)
  })

  it('tells images apart and formats sizes', () => {
    expect(isImageMime('image/png')).toBe(true)
    expect(isImageMime('application/pdf')).toBe(false)
    expect(formatBytes(512)).toBe('1 KB')
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB')
  })

  it('builds public URLs from the project Supabase URL', () => {
    expect(mediaPublicUrl('http://127.0.0.1:54421/', 'blog/2026/a.webp')).toBe('http://127.0.0.1:54421/storage/v1/object/public/media/blog/2026/a.webp')
  })
})

describe('avatar paths', () => {
  const user = '11111111-2222-3333-4444-555555555555'

  it('accepts only photos inside the user folder', () => {
    const path = buildAvatarPath(user, 'image/webp')
    expect(isAvatarPath(path, user)).toBe(true)
    expect(isAvatarPath(path, '99999999-2222-3333-4444-555555555555')).toBe(false)
    expect(isAvatarPath(`avatars/${user}/../blog/2026/x.webp`, user)).toBe(false)
    expect(isAvatarPath(buildAvatarPath(user, 'application/pdf'), user)).toBe(false)
  })
})

describe('isPathInFolder', () => {
  it('rejects folder names that would act as patterns', () => {
    expect(isPathInFolder('avatars/11111111-2222-3333-4444-555555555555/x.webp', 'avatars/[^/]+/[^/]+|x')).toBe(false)
    expect(isPathInFolder('a/b.png', '.*|x')).toBe(false)
    expect(isPathInFolder(`${'a'.repeat(40)}!`, '(a+)+$')).toBe(false)
  })
})
