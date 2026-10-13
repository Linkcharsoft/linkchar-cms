import { describe, expect, expectTypeOf, it } from 'vitest'
import { buildDefaults } from '../defaults'
import { ENTRY_IDS, getCollection, getEntry } from '../entries'
import { mediaFolders } from '../schema'
import { validateContent } from '../validation'
import { dataFields } from '../walk'
import type { ContentOf } from '../entries'
import type { DataField, FieldsRecord } from '../fields'

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
    expectTypeOf<ContentOf<'home.hero'>['secondaryCta']['variant']>().toEqualTypeOf<'primary' | 'secondary'>()
    expectTypeOf<ContentOf<'services'>['icon']>().toEqualTypeOf<'microphone' | 'lightbulb' | 'book' | 'headphones' | 'nutrition' | null>()
    expectTypeOf<ContentOf<'home.porque'>['items'][number]['color']>().toEqualTypeOf<'blue' | 'cyan' | null>()
  })

  it('returns null for unknown entries', () => {
    expect(getEntry('nope')).toBeNull()
    expect(getEntry('toString')).toBeNull()
    expect(getCollection('settings')).toBeNull()
  })
})
