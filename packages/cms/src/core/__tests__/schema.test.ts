import { describe, expect, expectTypeOf, it } from 'vitest'
import { SECTION_IDS } from '@/constants/landing'
import { buildDefaults } from '../defaults'
import { ENTRY_IDS, getCollection, getEntry, getPage } from '../entries'
import { pageSections } from '../pages'
import { mediaFolders } from '../schema'
import { validateContent } from '../validation'
import { dataFields } from '../walk'
import type { ContentOf } from '../entries'
import type { DataField, FieldsRecord } from '../fields'

const PAGE_IDS = ENTRY_IDS.filter(id => getPage(id))

const allFields = (fields: FieldsRecord): DataField[] =>
  dataFields(fields).flatMap(([, field]) => {
    if (field.kind === 'group' || field.kind === 'list') return [field, ...allFields(field.fields)]
    if (field.kind === 'blocks') return [field, ...Object.values(field.blocks).flatMap(block => allFields(block.fields))]
    return [field]
  })

describe('Hologramas content schema', () => {
  it.each(ENTRY_IDS)('%s defaults are a valid draft', async id => {
    const entry = getEntry(id)!
    expect((await validateContent(entry.fields, buildDefaults(entry.fields), 'draft')).errors).toBeNull()
  })

  it.each(ENTRY_IDS)('%s references existing fields and collections', id => {
    const entry = getEntry(id)!
    const keys = dataFields(entry.fields).map(([key]) => key)

    if (entry.kind === 'collection') {
      expect(keys).toContain(entry.titleField)
      if (entry.slugField) expect(keys).toContain(entry.slugField)
    }

    for (const field of allFields(entry.fields)) {
      if (field.kind === 'relation') expect(getCollection(field.to), `relation to ${field.to}`).not.toBeNull()
      if (field.kind === 'slug') expect(keys, `slug source ${field.from}`).toContain(field.from)
      if ((field.kind === 'image' || field.kind === 'gallery' || field.kind === 'file') && field.folder) {
        expect(mediaFolders.map(folder => folder.value as string), `media folder ${field.folder}`).toContain(field.folder)
      }
    }
  })

  it('exposes typed content for the pages', () => {
    expectTypeOf<ContentOf<'home'>['hero']['secondaryCta']['variant']>().toEqualTypeOf<'primary' | 'secondary'>()
    expectTypeOf<ContentOf<'home'>['hero']['booking']['extraInsurers'][number]>().toEqualTypeOf<{ _key: string, text: string }>()
    expectTypeOf<ContentOf<'home'>['porque']['_hidden']>().toEqualTypeOf<boolean>()
    expectTypeOf<ContentOf<'trabaja'>['success']>().toEqualTypeOf<{ title: string, text: string }>()
    expectTypeOf<ContentOf<'services'>['icon']>().toEqualTypeOf<'microphone' | 'lightbulb' | 'book' | 'headphones' | 'nutrition' | null>()
    expectTypeOf<ContentOf<'home'>['porque']['items'][number]['color']>().toEqualTypeOf<'blue' | 'cyan' | null>()
  })

  it.each(PAGE_IDS)('%s is made of sections with unique anchors that exist on the site', id => {
    const page = getPage(id)!
    expect(Object.values(page.fields).some(node => node.kind === 'tab'), 'pages use sections, not tabs').toBe(false)

    const sections = pageSections(page.fields)
    expect(sections.every(({ mark }) => mark), 'every part of the page is a section').toBe(true)
    const anchors = sections.flatMap(({ mark }) => (mark?.anchor ? [mark.anchor] : []))
    expect(new Set(anchors).size).toBe(anchors.length)
    for (const anchor of anchors) expect(Object.values(SECTION_IDS) as string[]).toContain(anchor)
    for (const { mark } of sections) for (const used of mark?.uses ?? []) expect(getEntry(used), `uses ${used}`).not.toBeNull()

    if (page.path) expect(sections.at(-1)?.key).toBe('seo')
  })

  it('hides only the agreed sections', () => {
    const hideable = PAGE_IDS.flatMap(id => pageSections(getPage(id)!.fields).filter(({ mark }) => mark?.hideable).map(({ key }) => `${id}.${key}`))
    expect(hideable).toEqual(['home.porque', 'home.obras', 'servicios.highlight'])
  })

  it('nests collections only under existing collections', () => {
    for (const id of ENTRY_IDS) {
      const under = getCollection(id)?.under
      if (under) expect(getCollection(under)?.under, `${id} under ${under}`).toBeUndefined()
    }
    expect(ENTRY_IDS.filter(id => getCollection(id)?.under === 'posts')).toEqual(['categories', 'authors'])
  })

  it('never writes menu paths in help texts (sections link what they use through `uses`)', () => {
    const helps = ENTRY_IDS.flatMap(id => allFields(getEntry(id)!.fields).flatMap(field => (field.help ? [field.help] : [])))
    for (const help of helps) expect(help).not.toContain('›')
  })

  it('keeps tabs for long collection documents only: other forms stack their panels', () => {
    const withTabs = ENTRY_IDS.filter(id => Object.values(getEntry(id)!.fields).some(node => node.kind === 'tab'))
    for (const id of withTabs) expect(getEntry(id)?.kind, `${id} uses tabs`).toBe('collection')
  })

  it('keeps reference-only collections without a URL and picked from a relation', () => {
    const referenceOnly = ENTRY_IDS.filter(id => getCollection(id)?.referenceOnly)
    expect(referenceOnly).toEqual(['categories', 'authors'])
    const targets = ENTRY_IDS.flatMap(id => allFields(getEntry(id)!.fields).flatMap(field => (field.kind === 'relation' ? [field.to] : [])))
    for (const id of referenceOnly) {
      expect(getCollection(id)?.path, `${id} has no page of its own`).toBeUndefined()
      expect(targets, `${id} is the target of a relation`).toContain(id)
    }
  })

  it('returns null for unknown entries', () => {
    expect(getEntry('nope')).toBeNull()
    expect(getEntry('toString')).toBeNull()
    expect(getCollection('settings')).toBeNull()
  })
})
