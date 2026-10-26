import { textContext, translatorFor } from '../core/config'
import { buildDefaults, withDefaults } from '../core/defaults'
import { getCollection } from '../core/entries'
import { panelPaths } from '../core/paths'
import slugify from '../core/slugify'
import { resolveText } from '../core/text'
import { logActivity } from './activity'
import { requireRole } from './auth'
import { asRecord, CmsRedirect } from './context'
import { titleOf } from './documents'
import { atLocale, freeSlug, slugColumns, toJson } from './editing'
import type { CmsContextType, DataRecord } from './context'
import type { RelationOptionType } from './documents'
import type { CollectionEntry } from '../core/define'
import type { MessageKeyType } from '../core/i18n/types'

export type ActionResultType = { ok: true } | { ok: false, error: MessageKeyType }

const fail = (error: MessageKeyType) => ({ ok: false, error }) as const

// Orderable collections add new items at the end.
const nextSortOrder = async (ctx: CmsContextType, entryId: string, orderable: boolean) => {
  if (!orderable) return 0
  const { data: last } = await ctx.db.from('documents').select('sort_order').eq('type', entryId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle()
  return (last?.sort_order ?? -1) + 1
}

const insertDocument = async (ctx: CmsContextType, entryId: string, entry: CollectionEntry, data: DataRecord, sortOrder: number) =>
  ctx.db.from('documents')
    .insert({ type: entryId, data: toJson(data), ...slugColumns(ctx, entryId, data), sort_order: sortOrder, visible: entry.referenceOnly })
    .select('id').single()

// A document with the schema defaults at the end of the list; createDocument then opens it, an import fills it.
export const addDocument = async (ctx: CmsContextType, entryId: string): Promise<{ ok: true, id: string, data: DataRecord } | { ok: false, error: MessageKeyType }> => {
  await requireRole(ctx, 'editor')
  const entry = getCollection(ctx.config, entryId)
  if (!entry) return fail('errors.unknownEntry')

  const data = buildDefaults(ctx.config, entry.fields) as DataRecord
  const { data: created, error } = await insertDocument(ctx, entryId, entry, data, await nextSortOrder(ctx, entryId, entry.orderable))
  if (error) {
    ctx.logger.error('[documents] create failed:', error.code ?? error.message)
    return fail('errors.documents.createFailed')
  }

  await logActivity(ctx, 'document.create', created.id, { type: entryId })
  return { ok: true, id: created.id, data }
}

export const createDocument = async (ctx: CmsContextType, entryId: string): Promise<ActionResultType> => {
  const created = await addDocument(ctx, entryId)
  if (!created.ok) return created
  throw new CmsRedirect(panelPaths(ctx.config).document(entryId, created.id))
}

// From a picker: only the title is asked; the rest is completed later in its own editor.
export const createRelated = async (ctx: CmsContextType, entryId: string, title: string): Promise<RelationOptionType | null> => {
  await requireRole(ctx, 'editor')
  const entry = getCollection(ctx.config, entryId)
  const name = title.trim()
  if (!entry || !name) return null

  const data = buildDefaults(ctx.config, entry.fields) as DataRecord
  const { defaultLocale } = ctx.config
  data[entry.titleField] = atLocale(data[entry.titleField], defaultLocale, name)
  if (entry.slugField) data[entry.slugField] = atLocale(data[entry.slugField], defaultLocale, await freeSlug(ctx, entryId, slugify(name) || 'item'))

  const { data: created, error } = await insertDocument(ctx, entryId, entry, data, await nextSortOrder(ctx, entryId, entry.orderable))
  if (error) {
    ctx.logger.error('[documents] create related failed:', error.code ?? error.message)
    return null
  }

  await logActivity(ctx, 'document.create', created.id, { type: entryId })
  ctx.revalidate(panelPaths(ctx.config).collection(entryId))
  return {
    id: created.id,
    label: titleOf(ctx, entry, data),
    kind: resolveText(entry.singularLabel, textContext(ctx.config)),
    status: entry.referenceOnly ? 'new' : 'hidden',
    trashed: false
  }
}

const copyTitle = (ctx: CmsContextType, title: unknown) => {
  const copy = (text: string, locale: string) => (text ? translatorFor(ctx.config, locale).t('collection.copy', { title: text }) : text)
  if (typeof title === 'string') return copy(title, ctx.config.defaultLocale)
  return Object.fromEntries(Object.entries(asRecord(title)).map(([locale, text]) => [locale, typeof text === 'string' ? copy(text, locale) : text]))
}

// "casa" → "casa-copia" (or the next free one) in each locale.
const copySlug = async (ctx: CmsContextType, entryId: string, slug: unknown) => {
  const copyOf = async (text: unknown, locale: string) => (typeof text === 'string' && text
    ? freeSlug(ctx, entryId, `${text}-${translatorFor(ctx.config, locale).t('collection.copySlug')}`, { locale })
    : text)
  if (typeof slug === 'string') return copyOf(slug, ctx.config.defaultLocale)
  return Object.fromEntries(await Promise.all(Object.entries(asRecord(slug)).map(async ([locale, text]) => [locale, await copyOf(text, locale)])))
}

export const duplicateDocument = async (ctx: CmsContextType, entryId: string, id: string): Promise<ActionResultType> => {
  await requireRole(ctx, 'editor')
  const entry = getCollection(ctx.config, entryId)
  if (!entry) return fail('errors.unknownEntry')

  const { data: source } = await ctx.db.from('documents').select('data, sort_order')
    .eq('id', id).eq('type', entryId).is('deleted_at', null).maybeSingle()
  if (!source) return fail('errors.documents.gone')

  const data = { ...withDefaults(ctx.config, entry.fields, source.data) } as DataRecord
  data[entry.titleField] = copyTitle(ctx, data[entry.titleField])
  if (entry.slugField) data[entry.slugField] = await copySlug(ctx, entryId, data[entry.slugField])

  const { data: created, error } = await insertDocument(ctx, entryId, entry, data, source.sort_order + 1)
  if (error) {
    ctx.logger.error('[documents] duplicate failed:', error.code ?? error.message)
    return fail('errors.documents.createFailed')
  }

  await logActivity(ctx, 'document.duplicate', created.id, { type: entryId, from: id })
  throw new CmsRedirect(panelPaths(ctx.config).document(entryId, created.id))
}

// Soft delete: the document goes to the trash, and only admins can purge it.
export const trashDocument = async (ctx: CmsContextType, entryId: string, id: string): Promise<ActionResultType> => {
  await requireRole(ctx, 'editor')
  if (!getCollection(ctx.config, entryId)) return fail('errors.unknownEntry')

  const { data, error } = await ctx.db.from('documents').update({ deleted_at: ctx.now().toISOString() })
    .eq('id', id).eq('type', entryId).is('deleted_at', null).select('id').maybeSingle()
  if (error || !data) return fail('errors.documents.updateFailed')

  await logActivity(ctx, 'document.trash', id, { type: entryId })
  ctx.revalidate(panelPaths(ctx.config).collection(entryId))
  return { ok: true }
}

// Takes effect on the next publish: hiding a published document unpublishes it.
export const setDocumentVisibility = async (ctx: CmsContextType, entryId: string, id: string, visible: boolean): Promise<ActionResultType> => {
  await requireRole(ctx, 'editor')
  const entry = getCollection(ctx.config, entryId)
  if (!entry || entry.referenceOnly) return fail('errors.unknownEntry')

  const { data, error } = await ctx.db.from('documents').update({ visible })
    .eq('id', id).eq('type', entryId).is('deleted_at', null).select('id').maybeSingle()
  if (error || !data) return fail('errors.documents.updateFailed')

  await logActivity(ctx, visible ? 'document.show' : 'document.hide', id, { type: entryId })
  ctx.revalidate(panelPaths(ctx.config).collection(entryId))
  return { ok: true }
}

// `offset` is the position of ids[0] in the whole collection, so reordering one page keeps the others intact.
export const reorderCollection = async (ctx: CmsContextType, entryId: string, ids: string[], offset = 0): Promise<ActionResultType> => {
  await requireRole(ctx, 'editor')
  if (!getCollection(ctx.config, entryId)?.orderable) return fail('errors.unknownEntry')

  const results = await Promise.all(ids.map((id, index) =>
    ctx.db.from('documents').update({ sort_order: offset + index }).eq('id', id).eq('type', entryId)
  ))
  return results.every(result => !result.error) ? { ok: true } : fail('errors.documents.updateFailed')
}
