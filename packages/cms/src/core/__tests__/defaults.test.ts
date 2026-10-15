import { describe, expect, it } from 'vitest'
import { buildDefaults, newBlock, withDefaults } from '../defaults'
import { block, blocks, boolean, button, group, list, relation, relations, row, text } from '../fields'
import { openingHours } from '../kinds/openingHours'
import { config } from './helpers'

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
    const defaults = buildDefaults(config, fields)

    expect(defaults).toMatchObject({
      title: { es: 'Hola' },
      visible: true,
      subtitle: { es: '' },
      cta: { label: { es: '' }, link: { type: 'internal', href: '', newTab: false }, variant: 'primary' },
      meta: { badge: { es: '' } },
      author: null,
      tags: [],
      items: [],
      content: []
    })
    expect(defaults.hours.days).toHaveLength(7)
    expect(defaults.hours.days[0]).toEqual({ day: 'mon', closed: true, from: '', to: '' })
  })
})

describe('withDefaults', () => {
  it('fills missing fields and drops unknown keys', () => {
    const value = withDefaults(config, fields, { subtitle: 'Guardado', legacy: 'x' })

    expect(value.subtitle).toEqual({ es: 'Guardado' })
    expect(value.title).toEqual({ es: 'Hola' })
    expect(value).not.toHaveProperty('legacy')
  })

  it('repairs nested content: list keys, unknown blocks and partial buttons', () => {
    const value = withDefaults(config, fields, {
      items: [{ name: 'Sin key' }, 'basura'],
      content: [{ _key: 'b1', _type: 'cita', quote: 'Hola' }, { _key: 'b2', _type: 'borrado' }],
      cta: { label: 'Contacto' }
    })

    expect(value.items).toHaveLength(1)
    expect(value.items[0].name).toEqual({ es: 'Sin key' })
    expect(value.items[0]._key).toMatch(/^[0-9a-f-]{36}$/)
    expect(value.content).toEqual([{ _key: 'b1', _type: 'cita', quote: { es: 'Hola' } }])
    expect(value.cta).toEqual({ label: { es: 'Contacto' }, link: { type: 'internal', href: '', newTab: false }, variant: 'primary' })
  })

  it('returns full defaults for non-object input', () => {
    expect(withDefaults(config, fields, null)).toEqual({ ...buildDefaults(config, fields), items: [], content: [] })
  })
})

describe('newBlock', () => {
  it('creates a typed block with a fresh key', () => {
    const created = newBlock(config, 'cita', fields.content.blocks.cita)
    expect(created).toMatchObject({ _type: 'cita', quote: { es: '' } })
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
    const { links } = buildDefaults(config, menu)
    expect(links).toMatchObject([{ label: { es: 'Inicio' }, visible: true }, { label: { es: 'Blog' }, visible: false }])
    expect(links.every(item => /^[0-9a-f-]{36}$/.test(item._key))).toBe(true)
  })

  it('uses them only when the document has no value yet', () => {
    expect(withDefaults(config, menu, {}).links).toHaveLength(2)
    expect(withDefaults(config, menu, { links: [] }).links).toEqual([])
  })
})
