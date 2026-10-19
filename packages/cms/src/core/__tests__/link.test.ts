import cmsConfig from '@playground/cms.config'
import { describe, expect, it } from 'vitest'
import { button, link } from '../fields'
import { documentReferences } from '../references'
import { validateContent } from '../validation'

const POST = '6f1c3b2a-1111-4c1d-9e0f-000000000001'

const fields = {
  more: link({ label: 'Ver más', required: true }),
  cta: button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }] })
}

const errorsFor = async (more: unknown, mode: 'draft' | 'publish' = 'publish') =>
  (await validateContent(cmsConfig, fields, { more, cta: { label: { es: '', en: '' }, link: { type: 'entry', href: '', newTab: false }, variant: 'primary' } }, { mode })).errors ?? {}

describe('links to entries', () => {
  it('accepts a page, a page section and a collection document', async () => {
    expect(await errorsFor({ type: 'entry', href: '', newTab: false, entry: 'about' })).toEqual({})
    expect(await errorsFor({ type: 'entry', href: '', newTab: false, entry: 'home', anchor: 'servicios' })).toEqual({})
    expect(await errorsFor({ type: 'entry', href: '', newTab: true, entry: 'posts', id: POST })).toEqual({})
  })

  it('rejects entries without a URL, documents without an id and malformed anchors', async () => {
    expect(Object.keys(await errorsFor({ type: 'entry', href: '', newTab: false, entry: 'team' }))).toEqual(['more.entry'])
    expect(Object.keys(await errorsFor({ type: 'entry', href: '', newTab: false, entry: 'nope' }))).toEqual(['more.entry'])
    expect(Object.keys(await errorsFor({ type: 'entry', href: '', newTab: false, entry: 'posts' }))).toEqual(['more.id'])
    expect(Object.keys(await errorsFor({ type: 'entry', href: '', newTab: false, entry: 'about', id: POST }))).toEqual(['more.id'])
    expect(Object.keys(await errorsFor({ type: 'entry', href: '', newTab: false, entry: 'home', anchor: '#x y' }))).toEqual(['more.anchor'])
  })

  it('asks for a destination only when publishing', async () => {
    expect(Object.keys(await errorsFor({ type: 'entry', href: '', newTab: false }))).toEqual(['more.entry'])
    expect(await errorsFor({ type: 'entry', href: '', newTab: false }, 'draft')).toEqual({})
  })

  it('keeps paths typed by hand valid', async () => {
    expect(await errorsFor({ type: 'internal', href: '/contacto', newTab: false })).toEqual({})
  })

  it('references the linked document, from a link or a button', () => {
    const data = {
      more: { type: 'entry', href: '', newTab: false, entry: 'posts', id: POST },
      cta: { label: { es: 'Leer' }, link: { type: 'entry', href: '', newTab: false, entry: 'about' }, variant: 'primary' }
    }
    expect(documentReferences(cmsConfig, fields, data).relations).toEqual([POST])
    expect(documentReferences(cmsConfig, fields, { ...data, more: { type: 'internal', href: '/x', newTab: false } }).relations).toEqual([])
  })
})
