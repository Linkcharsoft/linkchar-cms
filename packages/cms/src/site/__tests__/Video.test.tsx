import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Video from '../Video'
import type { SiteVideoType } from '../types'

const video: SiteVideoType = {
  id: '6f1c3b2a-4444-4c1d-9e0f-000000000003', src: 'https://cdn.test/clip.mp4', mime: 'video/mp4', size: 5000, width: 1280, height: 720, duration: 12.5,
  poster: { id: '6f1c3b2a-4444-4c1d-9e0f-000000000001', src: 'https://cdn.test/poster.webp', alt: 'Facade', caption: '', width: 1280, height: 720, focalX: null, focalY: null, blurDataUrl: null }
}

describe('Video', () => {
  it('renders a video that loads its metadata only, with its poster through the image optimizer', () => {
    const html = renderToStaticMarkup(<Video video={video} className='Hero__Video'><track kind='captions' src='/subs.vtt' /></Video>)
    expect(html).toContain('controls=""')
    expect(html).toContain('preload="metadata"')
    expect(html).toContain('playsInline=""')
    expect(html).toContain('width="1280" height="720"')
    expect(html).toContain('poster="/_next/image?url=https%3A%2F%2Fcdn.test%2Fposter.webp&amp;w=')
    expect(html).toContain('<source src="https://cdn.test/clip.mp4" type="video/mp4"/>')
    expect(html).toContain('<track kind="captions" src="/subs.vtt"/>')
    expect(html).not.toContain('autoPlay')
  })

  it('autoplays only muted and looping, without controls', () => {
    const html = renderToStaticMarkup(<Video video={{ ...video, poster: null }} autoplay />)
    expect(html).toContain('autoPlay=""')
    expect(html).toContain('muted=""')
    expect(html).toContain('loop=""')
    expect(html).not.toContain('controls')
    expect(html).not.toContain('poster=')
  })
})
