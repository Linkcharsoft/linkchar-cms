import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../config'
import { singleton } from '../define'
import { select } from '../fields'

describe('select as cards', () => {
  const grid = { columns: 2, rows: 2, cells: [{ column: 1, row: 1, rowSpan: 2 }, { column: 2, row: 1 }, { column: 2, row: 2 }] }
  const cards = (options: Parameters<typeof select>[0]['options'], display?: 'cards' | 'dropdown') =>
    () => defineCmsConfig({ schema: { home: singleton('Inicio', { layout: select({ label: 'Mosaico', options, display }) }) } })

  it('accepts icon, image and grid previews', () => {
    expect(cards([
      { label: 'Mosaico', value: 'mosaic', preview: { grid } },
      { label: 'Fila', value: 'row', preview: { icon: 'pi-th-large' } },
      { label: 'Foto', value: 'photo', preview: { image: '/layouts/photo.svg' } }
    ], 'cards')).not.toThrow()
  })

  it('rejects cards without a preview on every option, previews without cards and cells outside the grid', () => {
    expect(cards([{ label: 'Fila', value: 'row', preview: { icon: 'pi-th-large' } }, { label: 'Dos', value: 'two' }], 'cards')).toThrow('home.layout shows cards, so every option needs a preview ("two" has none).')
    expect(cards([{ label: 'Fila', value: 'row', preview: { icon: 'pi-th-large' } }])).toThrow('home.layout has option previews: set display: \'cards\'')
    expect(cards([{ label: 'Uno', value: 'one', preview: { grid: { columns: 2, rows: 1, cells: [{ column: 2, row: 1, columnSpan: 2 }] } } }], 'cards')).toThrow('outside its 2×1 grid')
    expect(cards([{ label: 'Uno', value: 'one', preview: { grid: { columns: 0, rows: 1, cells: [] } } }], 'cards')).toThrow('without columns and rows')
  })
})
