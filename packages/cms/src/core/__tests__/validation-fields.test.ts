import { describe, expect, it } from 'vitest'
import { buildDefaults } from '../defaults'
import { block, blocks, button, date, datetime, group, number, phone, select, text } from '../fields'
import { validateContent } from '../validation'
import { config } from './helpers'

const fields = {
  minutes: number({ label: 'Minutos', min: 1, max: 60 }),
  day: date({ label: 'Fecha' }),
  moment: datetime({ label: 'Momento' }),
  color: select({ label: 'Color', options: [{ label: 'Azul', value: 'blue' }] }),
  whatsapp: phone({ label: 'WhatsApp' }),
  cta: button({ label: 'Botón', required: true, variants: [{ label: 'Principal', value: 'primary' }] }),
  extra: group({ label: 'Extra' }, { note: text({ label: 'Nota', required: true, maxLength: 5 }) }),
  sections: blocks({ label: 'Bloques', min: 1, max: 1 }, { texto: block('Texto', { body: text({ label: 'Texto' }) }) })
}

const base = () => ({
  ...buildDefaults(config, fields),
  cta: { label: 'Turnos', link: { type: 'internal', href: '/turnos', newTab: false }, variant: 'primary' },
  extra: { note: 'Hola' },
  sections: [{ _key: 'b1', _type: 'texto', body: 'Algo' }]
})

const errorsFor = async (patch: Record<string, unknown>, mode: 'draft' | 'publish' = 'publish') =>
  (await validateContent(config, fields, { ...base(), ...patch }, { mode })).errors ?? {}

describe('validateContent field kinds', () => {
  it('accepts a complete document', async () => {
    expect((await validateContent(config, fields, base(), { mode: 'publish' })).errors).toBeNull()
  })

  it('checks number ranges and types', async () => {
    expect((await errorsFor({ minutes: 0 })).minutes).toBeTruthy()
    expect((await errorsFor({ minutes: 61 })).minutes).toBeTruthy()
    expect((await errorsFor({ minutes: 'diez' })).minutes).toBeTruthy()
    expect((await errorsFor({ minutes: 15 })).minutes).toBeUndefined()
  })

  it('rejects malformed dates and unknown options', async () => {
    expect((await errorsFor({ day: '31/12/2026' })).day).toBeTruthy()
    expect((await errorsFor({ moment: 'mañana' })).moment).toBeTruthy()
    expect((await errorsFor({ color: 'verde' })).color).toBeTruthy()
    expect((await errorsFor({ day: '2026-12-31', moment: '2026-12-31T10:00:00.000Z', color: 'blue' }))).toEqual({})
  })

  it('validates phones and buttons', async () => {
    expect((await errorsFor({ whatsapp: 'llamame' })).whatsapp).toBeTruthy()
    expect(Object.keys(await errorsFor({ cta: { label: '', link: { type: 'internal', href: '', newTab: false }, variant: 'primary' } })).some(key => key.startsWith('cta'))).toBe(true)
    expect(Object.keys(await errorsFor({ cta: { label: 'Ir', link: { type: 'internal', href: '/x', newTab: false }, variant: 'neon' } })).some(key => key.startsWith('cta'))).toBe(true)
  })

  it('validates nested groups and block limits', async () => {
    expect(Object.keys(await errorsFor({ extra: { note: 'demasiado largo' } })).some(key => key.startsWith('extra'))).toBe(true)
    expect((await errorsFor({ sections: [] })).sections).toBeTruthy()
    expect((await errorsFor({ sections: [] }, 'draft')).sections).toBeUndefined()
  })
})
