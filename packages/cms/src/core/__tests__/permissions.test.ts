import { describe, expect, it } from 'vitest'
import { group, row, tab, text } from '../fields'
import { keepSuperadminFields, visibleFields } from '../permissions'
import { dataFields } from '../walk'

const fields = {
  general: tab('General', {
    title: text({ label: 'Título' }),
    anchor: text({ label: 'Ancla', superadminOnly: true, default: 'inicio' })
  }),
  meta: group({ label: 'Meta' }, {
    badge: text({ label: 'Badge' }),
    tracking: text({ label: 'Tracking', superadminOnly: true })
  }),
  pair: row({ secret: text({ label: 'Secreto', superadminOnly: true }) })
}

describe('keepSuperadminFields', () => {
  it('replaces superadminOnly values with the stored ones, also inside groups', () => {
    const result = keepSuperadminFields(
      fields,
      { title: 'Nuevo', anchor: 'hackeado', meta: { badge: 'B', tracking: 'hackeado' }, secret: 'hackeado' },
      { title: 'Viejo', anchor: 'servicios', meta: { badge: 'A', tracking: 'UA-1' }, secret: 's3' }
    )

    expect(result).toEqual({ title: 'Nuevo', anchor: 'servicios', meta: { badge: 'B', tracking: 'UA-1' }, secret: 's3' })
  })

  it('falls back to the field default when nothing was stored yet', () => {
    const result = keepSuperadminFields(fields, { title: 'x', anchor: 'hackeado', meta: { badge: '' }, secret: 'y' }, null)
    expect(result).toMatchObject({ anchor: 'inicio', secret: '' })
  })
})

describe('visibleFields', () => {
  it('removes superadminOnly fields for other roles and keeps them for superadmins', () => {
    expect(dataFields(visibleFields(fields, false)).map(([key]) => key)).toEqual(['title', 'meta'])
    expect(dataFields(visibleFields(fields, true)).map(([key]) => key)).toEqual(['title', 'anchor', 'meta', 'secret'])
  })
})
