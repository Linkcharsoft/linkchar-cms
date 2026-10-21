import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DraftRefresh from '../DraftRefresh'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const post = (data: unknown, origin = window.location.origin) =>
  act(() => { window.dispatchEvent(new MessageEvent('message', { data, origin })) })

describe('DraftRefresh', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView
    document.body.insertAdjacentHTML('beforeend', '<section id="contacto"></section>')
  })

  afterEach(() => {
    refresh.mockReset()
    scrollIntoView.mockReset()
    document.getElementById('contacto')?.remove()
  })

  it('refreshes the page after an autosave', () => {
    render(<DraftRefresh />)
    post({ type: 'cms:refresh' })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('scrolls to the section the editor is on', () => {
    render(<DraftRefresh />)
    post({ type: 'cms:scroll', anchor: 'contacto' })
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('ignores invalid anchors and other origins', () => {
    render(<DraftRefresh />)
    post({ type: 'cms:scroll', anchor: 'contacto, body' })
    post({ type: 'cms:scroll', anchor: 'contacto' }, 'https://evil.example')
    post({ type: 'cms:refresh' }, 'https://evil.example')
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('leaves the preview through the Draft Mode exit, in the language asked for', () => {
    render(<DraftRefresh locale='en' />)
    const exit = screen.getByRole('link', { name: 'Previewing drafts · Exit' })
    expect(exit.getAttribute('href')).toBe('/api/cms/disable-draft')
    expect(exit.getAttribute('style')).toContain('position: fixed')
  })

  it('takes the project text and look', () => {
    render(<DraftRefresh label='Salir de la vista previa' className='Exit' />)
    const exit = screen.getByRole('link', { name: 'Salir de la vista previa' })
    expect(exit.className).toBe('Exit')
    expect(exit.getAttribute('style')).toBeNull()
  })
})
