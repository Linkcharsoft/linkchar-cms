import { describe, expect, it } from 'vitest'
import { diffContent } from '../diff'
import { block, blocks, boolean, group, image, list, relation, richText, select, text } from '../fields'
import { config } from './helpers'

const fields = {
  hero: group({ label: 'Portada' }, {
    title: text({ label: 'Título' }),
    image: image({ label: 'Imagen' }),
    tone: select({ label: 'Tono', options: [{ label: 'Claro', value: 'light' }, { label: 'Oscuro', value: 'dark' }] }),
    visible: boolean({ label: 'Visible' })
  }),
  items: list({ label: 'Puntos' }, { text: text({ label: 'Punto' }) }),
  body: richText({ label: 'Cuerpo' }),
  author: relation({ label: 'Autor', to: 'authors' }),
  extra: blocks({ label: 'Bloques' }, { cita: block('Cita', { quote: text({ label: 'Frase' }) }) })
}

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

describe('diffContent', () => {
  it('lists only what differs, with the path of labels', () => {
    const current = { hero: { title: 'Hola', image: 'm1', tone: 'light', visible: true }, items: [], body: null, author: null, extra: [] }
    const version = { ...current, hero: { ...current.hero, title: 'Chau', tone: 'dark', visible: false } }
    expect(diffContent(config, fields, current, version)).toEqual([
      { path: 'hero.title.es', label: 'Portada › Título', current: 'Hola', version: 'Chau' },
      { path: 'hero.tone', label: 'Portada › Tono', current: 'Claro', version: 'Oscuro' },
      { path: 'hero.visible', label: 'Portada › Visible', current: 'Sí', version: 'No' }
    ])
  })

  it('names media and related items, and reads rich text as plain text', () => {
    const names = { media: { m1: 'Foto vieja', m2: 'Foto nueva' }, relations: { a1: 'Ana' } }
    const diff = diffContent(config, fields, { hero: { image: 'm1' }, body: doc('Nuevo texto'), author: null }, { hero: { image: 'm2' }, body: doc('Texto viejo'), author: 'a1' }, names)
    expect(diff.map(({ label, current, version }) => [label, current, version])).toEqual([
      ['Portada › Imagen', 'Foto vieja', 'Foto nueva'],
      ['Cuerpo', 'Nuevo texto', 'Texto viejo'],
      ['Autor', '—', 'Ana']
    ])
  })

  it('compares list items by position and shows added or removed ones whole', () => {
    const diff = diffContent(config, fields, { items: [{ _key: 'a', text: 'Uno' }, { _key: 'b', text: 'Dos' }] }, { items: [{ _key: 'x', text: 'Uno' }, { _key: 'y', text: 'Otro' }, { _key: 'z', text: 'Tres' }] })
    expect(diff).toEqual([
      { path: 'items.1.text.es', label: 'Puntos 2 › Punto', current: 'Dos', version: 'Otro' },
      { path: 'items.2', label: 'Puntos 3', current: '—', version: 'Tres' }
    ])
  })

  it('names the block type of changed blocks', () => {
    const diff = diffContent(config, fields, { extra: [{ _key: 'a', _type: 'cita', quote: 'Antes' }] }, { extra: [{ _key: 'a', _type: 'cita', quote: 'Después' }] })
    expect(diff[0]).toMatchObject({ label: 'Bloques 1 (Cita) › Frase', current: 'Antes', version: 'Después' })
  })
})
