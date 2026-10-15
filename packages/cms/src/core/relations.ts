import type { TranslatorType } from './i18n/types'
import type { DocumentStatusType } from './status'

export interface RelationRefType {
  label: string
  // Singular name of its collection ("Autor"), already in the panel language.
  kind: string
  status: DocumentStatusType
  trashed: boolean
}

export type RelationReasonType = 'trashed' | 'hidden' | 'unpublishing' | 'new'

export interface RelationIssueType {
  reason: RelationReasonType
  tag: string
  severity: 'secondary' | 'info' | 'danger'
  // false when the item comes out with the next publish.
  missing: boolean
  text: string
}

type TranslateType = TranslatorType['t']

const REASONS: Record<RelationReasonType, Pick<RelationIssueType, 'severity' | 'missing'>> = {
  trashed: { severity: 'danger', missing: true },
  hidden: { severity: 'secondary', missing: true },
  unpublishing: { severity: 'danger', missing: true },
  new: { severity: 'info', missing: false }
}

const reasonOf = (ref: RelationRefType): RelationReasonType | null => {
  if (ref.trashed) return 'trashed'
  if (ref.status === 'hidden' || ref.status === 'unpublishing' || ref.status === 'new') return ref.status
  return null
}

// Why a referenced item won't be on the site as expected; null when it already is.
export const relationIssue = (ref: RelationRefType, t: TranslateType): RelationIssueType | null => {
  const reason = reasonOf(ref)
  if (!reason) return null
  return { reason, ...REASONS[reason], tag: t(`relations.${reason}Tag`), text: t(`relations.${reason}`) }
}

// Away from its field (the publish list) the notice also says what the item is: "Ana" (autor).
export const relationName = (ref: RelationRefType, withKind = false) =>
  `"${ref.label}"${withKind ? ` (${ref.kind.toLowerCase()})` : ''}`

export const relationNotice = (ref: RelationRefType, issue: RelationIssueType, t: TranslateType, withKind = false) =>
  t(issue.missing ? 'relations.missing' : 'relations.notice', { name: relationName(ref, withKind), reason: issue.text })

// What the publish list says about the items a document points to. A new item comes out in the same publish
// unless it has missing fields (comesOut answers that).
export const referenceWarnings = (ids: string[], refs: Record<string, RelationRefType>, comesOut: (id: string) => boolean, t: TranslateType) =>
  ids.flatMap(id => {
    const ref = refs[id]
    if (!ref) return [t('relations.deleted')]
    const issue = relationIssue(ref, t)
    if (!issue) return []
    if (issue.missing) return [relationNotice(ref, issue, t, true)]
    return comesOut(id) ? [] : [t('relations.incomplete', { name: relationName(ref, true) })]
  })
