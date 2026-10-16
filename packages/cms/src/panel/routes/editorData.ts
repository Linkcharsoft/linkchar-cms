import { withDefaults } from '../../core/defaults'
import { documentReferences } from '../../core/references'
import type { SchemaEntry } from '../../core/define'
import type { CmsServerType } from '../../server/next'

type StoredDocumentType = { id: string, data: unknown, revision: number } | null

// What every editor loads with its document: defaults filled in, its state and the labels of what it references.
export const loadEditorData = async (cms: CmsServerType, entry: SchemaEntry, document: StoredDocumentType) => {
  const data = withDefaults(cms.config, entry.fields, document?.data) as Record<string, unknown>
  const refs = documentReferences(cms.config, entry.fields, data)
  const [relations, media, state] = await Promise.all([
    cms.queries.getRelationLabels(refs.relations),
    cms.queries.getMediaByIds(refs.media),
    document ? cms.queries.getDocumentState(document.id) : null
  ])
  return { data, references: { relations, media }, state }
}

// `?locale=` of the editor URL, the language being edited.
export const editingLocale = async (searchParams: Promise<{ locale?: string | string[] }>) => {
  const { locale } = await searchParams
  return typeof locale === 'string' ? locale : undefined
}
