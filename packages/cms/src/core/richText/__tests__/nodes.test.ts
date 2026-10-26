import { describe, expect, it } from 'vitest'
import { richText } from '../../kinds/richText'
import { inlineRichText, isEmptyRichText, keepMarks, normalizeRichText, richTextReferences, sanitizeHref } from '../nodes'
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

const text = (value: string, marks?: string[]) => ({ type: 'text', text: value, ...(marks ? { marks: marks.map(type => ({ type })) } : {}) })

describe('inline rich text', () => {
  const blocks: RichTextDocType = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [text('Givxo')] },
      { type: 'paragraph', content: [text('Una app de '), text('donaciones', ['bold', 'italic'])] },
      { type: 'image', attrs: { mediaId: MEDIA } },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('iOS')] }] }] },
      { type: 'paragraph' }
    ]
  }

  it('turns every block into a line of one paragraph and drops media', () => {
    expect(inlineRichText(blocks)).toEqual({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [text('Givxo'), { type: 'hardBreak' }, text('Una app de '), text('donaciones', ['bold', 'italic']), { type: 'hardBreak' }, text('iOS')]
      }]
    })
    expect(inlineRichText(inlineRichText(blocks))).toEqual(inlineRichText(blocks))
    expect(inlineRichText({ type: 'doc', content: [] })).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('keeps only the allowed marks', () => {
    const [, paragraph] = keepMarks(blocks, ['bold']).content!
    expect(paragraph.content).toEqual([text('Una app de '), text('donaciones', ['bold'])])
  })

  it('applies both when the field is inline with a mark allowlist', () => {
    const field = { kind: 'richText', label: 'Resumen', inline: true, marks: ['bold'] } as const
    expect(richText.normalize(blocks, field)).toEqual({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [text('Givxo'), { type: 'hardBreak' }, text('Una app de '), text('donaciones', ['bold']), { type: 'hardBreak' }, text('iOS')]
      }]
    })
    expect(richText.references(richText.normalize(blocks, field), field)).toEqual({ media: [], relations: [] })
  })
})
