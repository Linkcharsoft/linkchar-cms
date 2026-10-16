import { translatorFor } from '../core/config'
import { withDefaults } from '../core/defaults'
import { getCollection, getEntry } from '../core/entries'
import { fieldLocalize } from '../core/locales'
import { mergePatch } from '../core/merge'
import { keepSuperadminFields } from '../core/permissions'
import { validateContent } from '../core/validation'
import { dataFields } from '../core/walk'
import { requireRole } from './auth'
import { asRecord, UNIQUE_VIOLATION } from './context'
import type { CmsContextType, DataRecord, ProfileType } from './context'
import type { Json } from './database'
import type { FieldsRecord } from '../core/fields'
import type { MessageKeyType } from '../core/i18n/types'
import type { LeafField } from '../core/kinds/registry'
import type { ContentErrorsType } from '../core/validation'

export interface SaveDocumentInputType {
  entryId: string
  id: string | null
  // Top-level keys (page sections, document fields) changed since `base`, the last saved state the editor knows.
  patch: DataRecord
  base: DataRecord
}

export type SaveDocumentResultType =
  | { status: 'saved', id: string, revision: number, updatedAt: string, data: DataRecord }
  | { status: 'invalid', errors: ContentErrorsType }
  | { status: 'conflict', id: string, keys: string[], data: DataRecord, revision: number, updatedAt: string }
  | { status: 'error', error: MessageKeyType }

// Another save between our read and our write only costs a retry: the merge runs again on fresh data.
export const SAVE_ATTEMPTS = 3

export const toJson = (data: DataRecord) => data as NonNullable<Json>

const isLocalized = (ctx: CmsContextType, fields: FieldsRecord, key: string) => {
  const field = dataFields(fields).find(([name]) => name === key)?.[1]
  return !!field && field.kind !== 'group' && field.kind !== 'list' && field.kind !== 'blocks'
    && fieldLocalize(ctx.config, field as LeafField) !== false
}

// The slug column holds the default locale's slug: unique per collection, and what redirects follow.
export const slugOf = (ctx: CmsContextType, entryId: string, data: DataRecord) => {
  const entry = getCollection(ctx.config, entryId)
  const stored = entry?.slugField ? data[entry.slugField] : null
  const value = typeof stored === 'string' ? stored : asRecord(stored)[ctx.config.defaultLocale]
  return typeof value === 'string' && value ? value : null
}

// Where the form shows "this URL is taken": the field, or its default locale when the slug is translated.
export const slugErrorPath = (ctx: CmsContextType, entryId: string) => {
  const entry = getCollection(ctx.config, entryId)
  const field = entry?.slugField ?? 'slug'
  return entry && isLocalized(ctx, entry.fields, field) ? `${field}.${ctx.config.defaultLocale}` : field
}

// Non-superadmins never see superadminOnly fields: whatever they send for them is replaced by the stored value.
export const guardFields = (ctx: CmsContextType, profile: ProfileType, fields: FieldsRecord, value: DataRecord, stored: unknown) =>
  (profile.role === 'superadmin' ? value : keepSuperadminFields(ctx.config, fields, value, stored))

// Autosave target: merges the changed keys over the stored content, so editors working on different
// sections never overwrite each other. Only a key someone else changed meanwhile is a conflict.
export const saveDocument = async (ctx: CmsContextType, { entryId, id, patch, base }: SaveDocumentInputType): Promise<SaveDocumentResultType> => {
  const { profile } = await requireRole(ctx, 'editor')
  const entry = getEntry(ctx.config, entryId)
  if (!entry) return { status: 'error', error: 'errors.unknownEntry' }

  for (let attempt = 0; attempt < SAVE_ATTEMPTS; attempt++) {
    const query = ctx.db.from('documents').select('id, data, revision, updated_at').eq('type', entryId).is('deleted_at', null)
    const { data: row, error: readError } = await (id ? query.eq('id', id) : query.eq('key', entryId)).maybeSingle()
    if (readError) {
      console.error('[documents] read before save failed:', readError.code ?? readError.message)
      return { status: 'error', error: 'errors.documents.saveFailed' }
    }
    if (!row && id) return { status: 'error', error: 'errors.documents.gone' }

    const current = withDefaults(ctx.config, entry.fields, row ? row.data : base) as DataRecord
    const merged = mergePatch(current, patch, base)

    if (merged.status === 'conflict') {
      if (!row) return { status: 'error', error: 'errors.documents.saveFailed' }
      // The editor's version is kept so it can be restored from the history.
      await ctx.db.from('document_versions').insert({ document_id: row.id, data: toJson({ ...current, ...patch }), reason: 'conflict' })
      return { status: 'conflict', id: row.id, keys: merged.keys, data: current, revision: row.revision, updatedAt: row.updated_at }
    }

    const { value, errors } = await validateContent(ctx.config, entry.fields, merged.data, { mode: 'draft' })
    if (!value) return { status: 'invalid', errors: errors ?? {} }

    const toSave = guardFields(ctx, profile, entry.fields, value, row?.data)
    const slug = slugOf(ctx, entryId, toSave)
    const columns = { data: toJson(toSave), slug }

    const result = row
      ? await ctx.db.from('documents').update(columns).eq('id', row.id).eq('revision', row.revision)
        .is('deleted_at', null).select('id, revision, updated_at').maybeSingle()
      : await ctx.db.from('documents').insert({ ...columns, type: entryId, key: entry.kind === 'collection' ? null : entryId })
        .select('id, revision, updated_at').single()

    if (result.error) {
      if (result.error.code !== UNIQUE_VIOLATION) {
        console.error('[documents] save failed:', result.error.code ?? result.error.message)
        return { status: 'error', error: 'errors.documents.saveFailed' }
      }
      if (slug) return { status: 'invalid', errors: { [slugErrorPath(ctx, entryId)]: translatorFor(ctx.config).t('validation.slugTaken') } }
      // Someone created this singleton or page first: merge over theirs.
      continue
    }

    if (result.data) {
      return { status: 'saved', id: result.data.id, revision: result.data.revision, updatedAt: result.data.updated_at, data: toSave }
    }
  }

  return { status: 'error', error: 'errors.documents.busy' }
}
