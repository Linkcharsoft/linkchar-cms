import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import PreviewPane from '../PreviewPane/PreviewPane'

const matchMedia = (matches: boolean) => vi.fn(() => ({ matches })) as unknown as typeof window.matchMedia

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PreviewPane', () => {
  it('scrolls itself into view on small screens, where it opens below the form', () => {
    vi.stubGlobal('ResizeObserver', class { observe () {} disconnect () {} })
    window.matchMedia = matchMedia(false)
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderPanel(<PreviewPane path='/blog/casa' savedAt={null} />)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('stays put on wide screens, where it sits next to the form', () => {
    vi.stubGlobal('ResizeObserver', class { observe () {} disconnect () {} })
    window.matchMedia = matchMedia(true)
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderPanel(<PreviewPane path='/blog/casa' savedAt={null} />)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
