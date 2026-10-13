import { describe, expect, it } from 'vitest'
import { isEmptyRichText, sanitizeHref } from '../nodes'

describe('sanitizeHref', () => {
  it('keeps web, mail, phone, anchor and site links', () => {
    for (const href of ['https://hologramaspsi.com', 'http://x.com', 'mailto:hola@x.com', 'tel:+543510000000', '#turnos', '/blog/nota']) {
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
