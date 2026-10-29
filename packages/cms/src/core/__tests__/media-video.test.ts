import { describe, expect, it } from 'vitest'
import { buildMediaPath, egressGigabytes, formatDuration, isPathInFolder, maxBytesFor, mediaTypeOf } from '../media'

describe('video media helpers', () => {
  it('formats a duration as minutes and seconds, with hours past sixty minutes', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65.4)).toBe('1:05')
    expect(formatDuration(3723)).toBe('1:02:03')
  })

  it('estimates the egress of a thousand full plays in gigabytes', () => {
    expect(egressGigabytes(12 * 1024 * 1024)).toBe(11.7)
    expect(egressGigabytes(1024 * 1024 * 1024, 2)).toBe(2)
  })

  it('tells videos from images and documents and caps them lower than the bucket', () => {
    expect(mediaTypeOf('video/mp4')).toBe('video')
    expect(mediaTypeOf('video/webm')).toBe('video')
    expect(mediaTypeOf('image/webp')).toBe('image')
    expect(mediaTypeOf('application/pdf')).toBe('document')
    expect(maxBytesFor('video/mp4')).toBe(25 * 1024 * 1024)
    expect(maxBytesFor('application/pdf')).toBe(10 * 1024 * 1024)
  })

  it('builds and recognizes video paths in a folder', () => {
    const path = buildMediaPath('proyectos', 'video/mp4', new Date('2026-10-29'))
    expect(path).toMatch(/^proyectos\/2026\/[0-9a-f-]{36}\.mp4$/)
    expect(isPathInFolder(path, 'proyectos')).toBe(true)
    expect(isPathInFolder(buildMediaPath('proyectos', 'video/webm'), 'proyectos')).toBe(true)
  })
})
