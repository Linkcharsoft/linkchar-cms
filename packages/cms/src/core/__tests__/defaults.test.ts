import { describe, expect, it } from 'vitest'
import { buildDefaults, newBlock, withDefaults } from '../defaults'
import { block, blocks, boolean, button, group, list, openingHours, relation, relations, row, text } from '../fields'

const fields = {
  title: text({ label: 'Título', default: 'Hola' }),
  layout: row({ visible: boolean({ label: 'Visible', default: true }), subtitle: text({ label: 'Subtítulo' }) }),
  cta: button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }, { label: 'Secundario', value: 'secondary' }] }),
  meta: group({ label: 'Meta' }, { badge: text({ label: 'Badge' }) }),
  author: relation({ label: 'Autor', to: 'authors' }),
  tags: relations({ label: 'Etiquetas', to: 'tags' }),
  hours: openingHours({ label: 'Horarios' }),
  items: list({ label: 'Ítems' }, { name: text({ label: 'Nombre' }) }),
  content: blocks({ label: 'Contenido' }, { cita: block('Cita', { quote: text({ label: 'Cita' }) }) })
}

describe('buildDefaults', () => {
  it('builds empty values for every data field, honoring explicit defaults', () => {
    const defaults = buildDefaults(fields)

    expect(defaults).toMatchObject({
      title: 'Hola',
      visible: true,
      subtitle: '',
      cta: { label: '', link: { type: 'internal', href: '', newTab: false }, variant: 'primary' },
      meta: { badge: '' },
      author: null,
      tags: [],
      items: [],
      content: []
    })
    expect(defaults.hours.days).toHaveLength(7)
    expect(defaults.hours.days[0]).toEqual({ day: 'lunes', closed: true, from: '', to: '' })
  })
})

describe('withDefaults', () => {
  it('fills missing fields and drops unknown keys', () => {
    const value = withDefaults(fields, { subtitle: 'Guardado', legacy: 'x' })

    expect(value.subtitle).toBe('Guardado')
    expect(value.title).toBe('Hola')
    expect(value).not.toHaveProperty('legacy')
  })

  it('repairs nested content: list keys, unknown blocks and partial buttons', () => {
    const value = withDefaults(fields, {
      items: [{ name: 'Sin key' }, 'basura'],
      content: [{ _key: 'b1', _type: 'cita', quote: 'Hola' }, { _key: 'b2', _type: 'borrado' }],
      cta: { label: 'Turnos' }
    })

    expect(value.items).toHaveLength(1)
    expect(value.items[0].name).toBe('Sin key')
    expect(value.items[0]._key).toMatch(/^[0-9a-f-]{36}$/)
    expect(value.content).toEqual([{ _key: 'b1', _type: 'cita', quote: 'Hola' }])
    expect(value.cta).toEqual({ label: 'Turnos', link: { type: 'internal', href: '', newTab: false }, variant: 'primary' })
  })

  it('returns full defaults for non-object input', () => {
    expect(withDefaults(fields, null)).toEqual({ ...buildDefaults(fields), items: [], content: [] })
  })
})

describe('newBlock', () => {
  it('creates a typed block with a fresh key', () => {
    const created = newBlock('cita', fields.content.blocks.cita)
    expect(created).toMatchObject({ _type: 'cita', quote: '' })
    expect(created._key).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('list defaults', () => {
  const menu = {
    links: list({ label: 'Links', default: [{ label: 'Inicio' }, { label: 'Blog', visible: false }] }, {
      label: text({ label: 'Texto' }),
      visible: boolean({ label: 'Visible', default: true })
    })
  }

  it('fills each default item and gives it a key', () => {
    const { links } = buildDefaults(menu)
    expect(links).toMatchObject([{ label: 'Inicio', visible: true }, { label: 'Blog', visible: false }])
    expect(links.every(item => /^[0-9a-f-]{36}$/.test(item._key))).toBe(true)
  })

  it('uses them only when the document has no value yet', () => {
    expect(withDefaults(menu, {}).links).toHaveLength(2)
    expect(withDefaults(menu, { links: [] }).links).toEqual([])
  })
})
