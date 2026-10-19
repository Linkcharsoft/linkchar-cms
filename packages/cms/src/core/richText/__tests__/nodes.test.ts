import { describe, expect, it } from 'vitest'
import { isEmptyRichText, normalizeRichText, richTextReferences, sanitizeHref } from '../nodes'
import type { RichTextDocType } from '../nodes'

describe('sanitizeHref', () => {
  it('keeps web, mail, phone, anchor and site links', () => {
    for (const href of ['https://estudionorte.com', 'http://x.com', 'mailto:hola@x.com', 'tel:+543510000000', '#contacto', '/blog/nota']) {
      expect(sanitizeHref(href)).toBe(href)
    }
    expect(sanitizeHref('  /servicios  ')).toBe('/servicios')
  })

  it('drops script, data and protocol-relative links', () => {
    for (const href of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,hola', '//evil.com', 'vbscript:x', 'ftp://x.com']) {
      expect(sanitizeHref(href)).toBeNull()
    }
    expect(sanitizeHref(42)).toBeNull()
  })
})

describe('isEmptyRichText', () => {
  it('treats whitespace-only paragraphs as empty and media as content', () => {
    expect(isEmptyRichText(null)).toBe(true)
    expect(isEmptyRichText({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '  ' }] }] })).toBe(true)
    expect(isEmptyRichText({ type: 'doc', content: [{ type: 'horizontalRule' }] })).toBe(false)
    expect(isEmptyRichText({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }] })).toBe(false)
  })
})

const MEDIA = '6f1c3b2a-2222-4c1d-9e0f-000000000001'
const POST = '6f1c3b2a-2222-4c1d-9e0f-000000000002'

const doc: RichTextDocType = {
  type: 'doc',
  content: [
    { type: 'image', attrs: { src: 'http://127.0.0.1:54321/storage/v1/object/public/media/a.webp', alt: 'Copia vieja', width: 800, mediaId: MEDIA } },
    { type: 'image', attrs: { src: 'https://otro.com/x.jpg', alt: 'Sin media' } },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Ver la nota', marks: [{ type: 'link', attrs: { href: '/blog/nota', entry: 'posts', id: POST } }] },
        { type: 'text', text: ' o la portada', marks: [{ type: 'link', attrs: { href: '/', entry: 'home' } }] }
      ]
    }
  ]
}

describe('normalizeRichText', () => {
  it('keeps only the media id of images and drops images that are not in Media', () => {
    expect(normalizeRichText(doc).content).toEqual([{ type: 'image', attrs: { mediaId: MEDIA } }, doc.content?.at(-1)])
    expect(normalizeRichText({ type: 'doc' })).toEqual({ type: 'doc' })
  })
})

describe('richTextReferences', () => {
  it('lists the images and the linked documents', () => {
    expect(richTextReferences(doc)).toEqual({ media: [MEDIA], relations: [POST] })
  })
})
