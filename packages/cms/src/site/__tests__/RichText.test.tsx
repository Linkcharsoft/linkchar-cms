import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { imageProps } from '../image'
import JsonLd from '../JsonLd'
import RichText from '../RichText'
import type { SiteRichTextType } from '../types'

afterEach(cleanup)

const value: SiteRichTextType = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Obras' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Una ', marks: [{ type: 'bold' }] },
        { type: 'text', text: 'nota', marks: [{ type: 'link', attrs: { href: '/en/blog/house', target: '_blank' } }] },
        { type: 'text', text: ' y ' },
        { type: 'text', text: 'otra', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }
      ]
    },
    { type: 'image', attrs: { src: 'https://cdn.test/a.webp', alt: 'Fachada', width: 800, height: 600, caption: 'La casa' } },
    { type: 'video', attrs: { src: 'https://youtu.be/abcdefghijk', caption: 'Recorrido' } },
    { type: 'codeBlock', content: [{ type: 'text', text: 'bloque de código' }] }
  ]
}

describe('RichText', () => {
  it('renders the allowed nodes and marks, with safe links', () => {
    const { container } = render(<RichText value={value} className='Post__Body' />)
    expect(container.querySelector('.Post__Body h2')?.textContent).toBe('Obras')
    expect(container.querySelector('strong')?.textContent).toBe('Una ')
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/en/blog/house')
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer')
    expect(container.textContent).toContain('otra')
    expect(container.textContent).not.toContain('bloque de código')
  })

  it('renders images with their caption, or the project component', () => {
    const { container } = render(<RichText value={value} />)
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Fachada')
    expect(container.querySelector('figure figcaption')?.textContent).toBe('La casa')

    cleanup()
    const custom = render(<RichText value={value} components={{ image: ({ alt }) => <span data-testid='image'>{alt}</span> }} />)
    expect(custom.getByTestId('image').textContent).toBe('Fachada')
  })

  it('embeds videos without tracking cookies', () => {
    const { container } = render(<RichText value={value} />)
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk')
  })

  it('renders nothing for an empty text', () => {
    expect(render(<RichText value={null} />).container.innerHTML).toBe('')
  })
})

describe('JsonLd', () => {
  it('escapes what could close the script tag', () => {
    const { container } = render(<JsonLd data={{ name: '</script><script>alert(1)</script>' }} />)
    expect(container.innerHTML).not.toContain('</script><script>')
  })
})

describe('imageProps', () => {
  it('turns the focal point into object-position and passes the blur placeholder', () => {
    const image = { id: 'x', src: 'https://cdn.test/a.webp', alt: 'Sala', caption: '', width: 800, height: 600, focalX: 20, focalY: null, blurDataUrl: 'data:image/png;base64,AA' }
    expect(imageProps(image, { sizes: '100vw' })).toEqual({
      src: 'https://cdn.test/a.webp', alt: 'Sala', width: 800, height: 600, sizes: '100vw',
      style: { objectPosition: '20% 50%' }, placeholder: 'blur', blurDataURL: 'data:image/png;base64,AA'
    })
  })
})
