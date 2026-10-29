import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../config'
import { singleton } from '../define'
import { select } from '../fields'
import { gridLines, gridPlacement } from '../kinds/select'

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

  it('takes CSS grid lines as strings and checks them against the grid', () => {
    const lines = { columns: 3, rows: 2, cells: [{ column: '1 / 3', row: '1 / span 2' }, { column: 3, row: '1 / 2' }, { column: '3', row: 2 }] }
    expect(cards([{ label: 'Uno', value: 'one', preview: { grid: lines } }], 'cards')).not.toThrow()
    expect(cards([{ label: 'Uno', value: 'one', preview: { grid: { columns: 3, rows: 2, cells: [{ column: '1 / 5', row: 1 }] } } }], 'cards')).toThrow('outside its 3×2 grid')
    expect(cards([{ label: 'Uno', value: 'one', preview: { grid: { columns: 3, rows: 2, cells: [{ column: '1 // 4', row: 1 }] } } }], 'cards')).toThrow('invalid line')
    expect(cards([{ label: 'Uno', value: 'one', preview: { grid: { columns: 3, rows: 2, cells: [{ column: '3 / 2', row: 1 }] } } }], 'cards')).toThrow('invalid line')
  })

  it('paints a numeric line with its span and a string as written', () => {
    expect(gridLines(2, 2)).toEqual({ start: 2, end: 4 })
    expect(gridLines('1 / 4')).toEqual({ start: 1, end: 4 })
    expect(gridLines('2 / span 2')).toEqual({ start: 2, end: 4 })
    expect(gridLines(' 3 ')).toEqual({ start: 3, end: 4 })
    expect(gridLines('span 2')).toBeNull()
    expect(gridPlacement(1, 2)).toBe('1 / span 2')
    expect(gridPlacement(' 1 / 4 ')).toBe('1 / 4')
  })
})
