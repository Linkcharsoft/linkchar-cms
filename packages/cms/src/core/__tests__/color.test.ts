import { describe, expect, expectTypeOf, it } from 'vitest'
import { buildDefaults, withDefaults } from '../defaults'
import { diffContent } from '../diff'
import { color } from '../fields'
import { validateContent } from '../validation'
import { config } from './helpers'

const fields = {
  brand: color({ label: 'Color de marca', default: '#1F5FA8', presets: ['#1f5fa8', '#d92d20'] }),
  accent: color({ label: 'Acento', required: true })
}

const errorsFor = async (patch: Record<string, unknown>, mode: 'draft' | 'publish' = 'draft') =>
  (await validateContent(config, fields, { ...buildDefaults(config, fields), ...patch }, { mode })).errors ?? {}

describe('color', () => {
  it('starts empty, lowercases the default and repairs stored values to lowercase hex', () => {
    expect(buildDefaults(config, fields)).toEqual({ brand: '#1f5fa8', accent: '' })
    expect(withDefaults(config, fields, { brand: '#ABCDEF', accent: 'rojo' })).toEqual({ brand: '#abcdef', accent: '' })
  })

  it('accepts #rrggbb only and asks for the required one when publishing', async () => {
    expect(await errorsFor({ brand: '#abc' })).toEqual({ brand: 'Usá un color como #1f5fa8' })
    expect(await errorsFor({ brand: 'red' })).toEqual({ brand: 'Usá un color como #1f5fa8' })
    expect(await errorsFor({ brand: '#1F5FA8', accent: '#d92d20' })).toEqual({})
    expect(await errorsFor({ accent: '' })).toEqual({})
    expect(await errorsFor({ accent: '' }, 'publish')).toEqual({ accent: 'Este campo es obligatorio' })
  })

  it('summarizes as the hex in upper case', () => {
    expect(diffContent(config, fields, { brand: '#1f5fa8' }, { brand: '#d92d20' })).toEqual([
      { path: 'brand', label: 'Color de marca', current: '#1F5FA8', version: '#D92D20' }
    ])
    expect(diffContent(config, fields, { brand: '' }, { brand: '#d92d20' })[0].current).toBe('—')
  })

  it('types the value as a string', () => {
    expectTypeOf(buildDefaults(config, fields).brand).toEqualTypeOf<string>()
  })
})
