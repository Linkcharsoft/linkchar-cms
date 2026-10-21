import { textContext, translatorFor } from '../core/config'
import { withDefaults } from '../core/defaults'
import { getEntry } from '../core/entries'
import { languageName } from '../core/i18n/translator'
import { missingContent } from '../core/missing'
import { documentReferences } from '../core/references'
import { fieldLabel } from '../core/walk'
import type { CmsContextType } from './context'
import type { FieldsRecord } from '../core/fields'
import type { MissingContentType } from '../core/missing'
import type { LocalizedTextType } from '../core/text'

// One thing that keeps a document out of the publication, with the data path the editor opens.
export interface MissingItemType {
  path: string
  // The language it is missing in; null for values shared by every language.
  locale: string | null
  kind: 'field' | 'alt'
  label: string
  // The field in the editor, in that language.
  href: string
}

export type MediaAltType = (id: string) => LocalizedTextType | undefined

export const missingItems = async (
  ctx: CmsContextType, fields: FieldsRecord, data: unknown, mediaAlt: MediaAltType, hrefOf: (item: MissingContentType) => string
): Promise<MissingItemType[]> => {
  const { config } = ctx
  const texts = textContext(config)
  const { t } = translatorFor(config)
  const named = (label: string, locale: string | null) =>
    (locale && locale !== config.defaultLocale ? `${label} (${languageName(locale, config.panelLocale)})` : label)

  return (await missingContent(config, fields, data, { mediaAlt })).map(item => {
    const label = fieldLabel(fields, item.field, texts)
    return {
      path: item.path,
      locale: item.locale,
      kind: item.kind,
      label: named(item.kind === 'alt' ? t('validation.altOf', { field: label }) : label, item.locale),
      href: hrefOf(item)
    }
  })
}

// Alt texts of every file the documents use, for the missing translations check.
export const mediaAltOf = async (ctx: CmsContextType, documents: { type: string | null, data: unknown }[]): Promise<MediaAltType> => {
  const ids = [...new Set(documents.flatMap(({ type, data }) => {
    const entry = type ? getEntry(ctx.config, type) : null
    return entry ? documentReferences(ctx.config, entry.fields, withDefaults(ctx.config, entry.fields, data)).media : []
  }))]
  if (ids.length === 0 || ctx.config.locales.length < 2) return () => undefined
  const { data } = await ctx.db.from('media').select('id, alt').in('id', ids)
  const alts = new Map((data ?? []).map(row => [row.id, row.alt as LocalizedTextType]))
  return id => alts.get(id)
}

type ContentRowType = { id: string | null, type: string | null, data: unknown, status: string | null }

// Ids of the pending rows that missing content keeps out of the publication: what the panel shows as "Incompleto".
export const incompleteIds = async (ctx: CmsContextType, rows: ContentRowType[]): Promise<Set<string>> => {
  const pending = rows.filter(row => row.id && row.type && (row.status === 'new' || row.status === 'changed') && getEntry(ctx.config, row.type))
  if (pending.length === 0) return new Set()
  const mediaAlt = await mediaAltOf(ctx, pending)
  const checks = await Promise.all(pending.map(async row => {
    const entry = getEntry(ctx.config, row.type!)!
    return (await missingContent(ctx.config, entry.fields, row.data, { mediaAlt })).length > 0 ? row.id! : null
  }))
  return new Set(checks.filter((id): id is string => id !== null))
}
