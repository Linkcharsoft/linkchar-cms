import { describe, expect, it } from 'vitest'
import { changedKeys, mergePatch, pickKeys, rebase, sameContent } from '../merge'

const hero = { title: 'Hola', items: [{ _key: 'a', text: 'Uno' }] }
const contacto = { title: 'Contacto' }

describe('sameContent', () => {
  it('compares JSON structurally, ignoring key order and list item keys', () => {
    expect(sameContent({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true)
    expect(sameContent(hero, { ...hero, items: [{ _key: 'otro', text: 'Uno' }] })).toBe(true)
    expect(sameContent(hero, { ...hero, items: [{ _key: 'a', text: 'Dos' }] })).toBe(false)
    expect(sameContent([1, 2], [2, 1])).toBe(false)
    expect(sameContent({ a: null }, {})).toBe(false)
    expect(sameContent('1', 1)).toBe(false)
  })
})

describe('changedKeys', () => {
  it('lists the top-level keys that differ from the saved state', () => {
    expect(changedKeys({ hero: { ...hero, title: 'Chau' }, contacto }, { hero, contacto })).toEqual(['hero'])
    expect(changedKeys({ hero }, { hero, contacto })).toEqual(['contacto'])
    expect(changedKeys({ hero, contacto }, { hero, contacto })).toEqual([])
  })

  it('picks only existing keys', () => {
    expect(pickKeys({ hero, contacto }, ['hero', 'nope'])).toEqual({ hero })
  })
})

describe('mergePatch', () => {
  it('merges a section over what others saved in other sections', () => {
    const current = { hero, contacto: { title: 'Contacto nuevo' } }
    expect(mergePatch(current, { hero: { ...hero, title: 'Chau' } }, { hero })).toEqual({
      status: 'merged',
      data: { hero: { ...hero, title: 'Chau' }, contacto: { title: 'Contacto nuevo' } }
    })
  })

  it('reports the sections someone else changed since the editor loaded them', () => {
    const current = { hero: { ...hero, title: 'Otra persona' }, contacto }
    expect(mergePatch(current, { hero: { ...hero, title: 'Yo' }, contacto: { title: 'X' } }, { hero, contacto }))
      .toEqual({ status: 'conflict', keys: ['hero'] })
  })

  it('does not report a conflict when the stored value only got new list keys', () => {
    const current = { hero: { ...hero, items: [{ _key: 'generado', text: 'Uno' }] } }
    expect(mergePatch(current, { hero: { ...hero, title: 'Chau' } }, { hero }).status).toBe('merged')
  })
})

describe('rebase', () => {
  it('takes what others saved in sections the editor did not touch', () => {
    const base = { hero, contacto }
    const saved = { hero: { ...hero, title: 'Mío' }, contacto: { title: 'De otra persona' } }
    const values = { hero: { ...hero, title: 'Mío' }, contacto }

    expect(rebase(values, base, saved, ['hero'])).toEqual({ values: saved, base: saved, adopted: ['contacto'] })
  })

  it('keeps the old base of a section the editor is changing, so the next save reports the conflict', () => {
    const base = { hero, contacto }
    const saved = { hero, contacto: { title: 'De otra persona' } }
    const values = { hero, contacto: { title: 'Lo que estoy escribiendo' } }

    const result = rebase(values, base, saved, ['hero'])
    expect(result.values.contacto).toEqual({ title: 'Lo que estoy escribiendo' })
    expect(result.base.contacto).toEqual(contacto)
    expect(result.adopted).toEqual([])
    expect(mergePatch(saved, pickKeys(result.values, ['contacto']), pickKeys(result.base, ['contacto'])).status).toBe('conflict')
  })

  it('keeps edits made to a saved section while the request was in flight', () => {
    const saved = { hero: { ...hero, title: 'Enviado' } }
    const values = { hero: { ...hero, title: 'Enviado y más' } }
    expect(rebase(values, { hero }, saved, ['hero'])).toEqual({ values, base: saved, adopted: [] })
  })
})
