import { translatorFor } from '../core/config'
import { withDefaults } from '../core/defaults'
import { getCollection, getEntry } from '../core/entries'
import { fieldLocalize } from '../core/locales'
import { mergePatch } from '../core/merge'
import { keepSuperadminFields } from '../core/permissions'
import slugify from '../core/slugify'
import { slugsOf } from '../core/urls'
import { validateContent } from '../core/validation'
import { dataFields } from '../core/walk'
import { requireRole } from './auth'
import { asRecord, UNIQUE_VIOLATION } from './context'
import { titleOf } from './documents'
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
  // adjusted: keys the server changed (a taken automatic slug); errors: what it left unsaved (a taken typed slug);
  // warnings: saved, but the publish would fail (a slug another document still holds on the site).
  | { status: 'saved', id: string, revision: number, updatedAt: string, data: DataRecord, adjusted?: string[], errors?: ContentErrorsType, warnings?: ContentErrorsType }
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

// Each locale's slug, and the default locale's in `slug`: unique per collection, so it guards drafts.
export const slugColumns = (ctx: CmsContextType, entryId: string, data: unknown) => {
  const entry = getCollection(ctx.config, entryId)
  const slugs = entry ? slugsOf(ctx.config, entry, data) : {}
  return { slugs, slug: slugs[ctx.config.defaultLocale] ?? null }
}

const slugTaken = async (ctx: CmsContextType, entryId: string, locale: string, slug: string, exceptId?: string) => {
  let query = ctx.db.from('documents').select('id', { count: 'exact', head: true })
    .eq('type', entryId).contains('slugs', { [locale]: slug }).is('deleted_at', null)
  if (exceptId) query = query.neq('id', exceptId)
  const { count } = await query
  return !!count
}

// Shortest free slug of the collection in a locale: "base", then "base-2", "base-3"…
export const freeSlug = async (ctx: CmsContextType, entryId: string, base: string, { locale = ctx.config.defaultLocale, exceptId }: { locale?: string, exceptId?: string } = {}) => {
  for (let attempt = 1; attempt <= 20; attempt++) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`
    if (!(await slugTaken(ctx, entryId, locale, candidate, exceptId))) return candidate
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

// Sets the value of a field in one locale, or the whole value when the field is not localized.
export const atLocale = (current: unknown, locale: string, value: string) =>
  (typeof current === 'string' ? value : { ...asRecord(current), [locale]: value })

const textAt = (ctx: CmsContextType, value: unknown, locale: string) => {
  const text = typeof value === 'string' ? value : asRecord(value)[locale] ?? asRecord(value)[ctx.config.defaultLocale]
  return typeof text === 'string' ? text : ''
}

// Where the form shows "this URL is taken": the field, or its locale when the slug is translated.
export const slugErrorPath = (ctx: CmsContextType, entryId: string, locale = ctx.config.defaultLocale) => {
  const entry = getCollection(ctx.config, entryId)
  const field = entry?.slugField ?? 'slug'
  return entry && isLocalized(ctx, entry.fields, field) ? `${field}.${locale}` : field
}

type SlugIssueType = Pick<Extract<SaveDocumentResultType, { status: 'saved' }>, 'adjusted' | 'errors'>

// Locales whose new slug another document of the collection already has.
const takenLocales = async (ctx: CmsContextType, entryId: string, slugs: Record<string, string>, stored: Record<string, string>, exceptId?: string) => {
  const changed = Object.entries(slugs).filter(([locale, slug]) => stored[locale] !== slug)
  const taken = await Promise.all(changed.map(async ([locale, slug]) => ((await slugTaken(ctx, entryId, locale, slug, exceptId)) ? locale : null)))
  return taken.filter(locale => locale !== null)
}

// Automatic slugs get a free variant; typed ones keep the stored slug and are reported. The rest is saved anyway.
const settleSlugs = async (ctx: CmsContextType, entryId: string, patch: DataRecord, saving: DataRecord, current: DataRecord, locales: string[], exceptId?: string) => {
  const entry = getCollection(ctx.config, entryId)!
  const slugField = entry.slugField!
  const field = dataFields(entry.fields).find(([name]) => name === slugField)?.[1]
  const slugs = slugsOf(ctx.config, entry, saving)
  const stored = slugsOf(ctx.config, entry, current)
  const issue: SlugIssueType = {}
  let value = patch[slugField]

  for (const locale of typeof value === 'string' ? [ctx.config.defaultLocale] : locales) {
    const slug = slugs[locale]
    if (field?.kind === 'slug' && slugify(textAt(ctx, saving[field.from], locale)) === slug) {
      value = atLocale(value, locale, await freeSlug(ctx, entryId, slug, { locale, exceptId }))
      issue.adjusted = [slugField]
    } else {
      value = atLocale(value, locale, stored[locale] ?? '')
      issue.errors = { ...issue.errors, [slugErrorPath(ctx, entryId, locale)]: translatorFor(ctx.config).t('validation.slugTaken') }
    }
  }
  return { patch: { ...patch, [slugField]: value }, issue }
}

// A slug free among drafts can still be live on another document (its draft moved on, or it waits in the trash).
const liveSlugWarnings = async (ctx: CmsContextType, entryId: string, slugs: Record<string, string>, stored: Record<string, string>, exceptId?: string) => {
  const entry = getCollection(ctx.config, entryId)!
  const changed = Object.entries(slugs).filter(([locale, slug]) => slug && stored[locale] !== slug)
  const found = await Promise.all(changed.map(async ([locale, slug]) => {
    let query = ctx.db.from('published_documents').select('id, data').eq('type', entryId).contains('slugs', { [locale]: slug }).limit(1)
    if (exceptId) query = query.neq('id', exceptId)
    const { data } = await query.maybeSingle()
    return data ? [slugErrorPath(ctx, entryId, locale), translatorFor(ctx.config).t('validation.slugLive', { title: titleOf(ctx, entry, data.data) })] as const : null
  }))
  const warnings = Object.fromEntries(found.filter(item => item !== null))
  return Object.keys(warnings).length > 0 ? warnings : undefined
}

// Non-superadmins never see superadminOnly fields: whatever they send for them is replaced by the stored value.
export const guardFields = (ctx: CmsContextType, profile: ProfileType, fields: FieldsRecord, value: DataRecord, stored: unknown) =>
  (profile.role === 'superadmin' ? value : keepSuperadminFields(ctx.config, fields, value, stored))

// Autosave target: merges the changed keys over the stored content, so editors working on different
// sections never overwrite each other. Only a key someone else changed meanwhile is a conflict.
export const saveDocument = async (ctx: CmsContextType, input: SaveDocumentInputType): Promise<SaveDocumentResultType> => {
  const { entryId, id, base } = input
  const { profile } = await requireRole(ctx, 'editor')
  const entry = getEntry(ctx.config, entryId)
  if (!entry) return { status: 'error', error: 'errors.unknownEntry' }

  let patch = input.patch
  let slugIssue: SlugIssueType | null = null
  const slugField = entry.kind === 'collection' ? entry.slugField : undefined

  for (let attempt = 0; attempt < SAVE_ATTEMPTS; attempt++) {
    const query = ctx.db.from('documents').select('id, data, revision, updated_at').eq('type', entryId).is('deleted_at', null)
    const { data: row, error: readError } = await (id ? query.eq('id', id) : query.eq('key', entryId)).maybeSingle()
    if (readError) {
      ctx.logger.error('[documents] read before save failed:', readError.code ?? readError.message)
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
    const { slug, slugs } = slugColumns(ctx, entryId, toSave)

    if (slugField && slugField in patch && !slugIssue) {
      const taken = await takenLocales(ctx, entryId, slugs, slugsOf(ctx.config, entry, current), row?.id)
      if (taken.length > 0) {
        ({ patch, issue: slugIssue } = await settleSlugs(ctx, entryId, patch, toSave, current, taken, row?.id))
        attempt--
        continue
      }
    }

    const warnings = slugField && slugField in patch
      ? await liveSlugWarnings(ctx, entryId, slugs, slugsOf(ctx.config, entry, current), row?.id)
      : undefined
    const columns = { data: toJson(toSave), slug, slugs }

    const result = row
      ? await ctx.db.from('documents').update(columns).eq('id', row.id).eq('revision', row.revision)
        .is('deleted_at', null).select('id, revision, updated_at').maybeSingle()
      : await ctx.db.from('documents').insert({ ...columns, type: entryId, key: entry.kind === 'collection' ? null : entryId })
        .select('id, revision, updated_at').single()

    if (result.error) {
      if (result.error.code !== UNIQUE_VIOLATION) {
        ctx.logger.error('[documents] save failed:', result.error.code ?? result.error.message)
        return { status: 'error', error: 'errors.documents.saveFailed' }
      }
      // Another save took the default locale's slug between the check and the write.
      if (slug && slugField && slugField in patch && !slugIssue) {
        ({ patch, issue: slugIssue } = await settleSlugs(ctx, entryId, patch, toSave, current, [ctx.config.defaultLocale], row?.id))
        attempt--
        continue
      }
      if (slug) return { status: 'invalid', errors: { [slugErrorPath(ctx, entryId)]: translatorFor(ctx.config).t('validation.slugTaken') } }
      // Someone created this singleton or page first: merge over theirs.
      continue
    }

    if (result.data) {
      return { status: 'saved', id: result.data.id, revision: result.data.revision, updatedAt: result.data.updated_at, data: toSave, ...slugIssue, ...(warnings ? { warnings } : {}) }
    }
  }

  return { status: 'error', error: 'errors.documents.busy' }
}
