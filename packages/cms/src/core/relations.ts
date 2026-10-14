import type { DocumentStatusType } from './publish'

export interface RelationRefType {
  label: string
  // Singular name of its collection ("Autor").
  kind: string
  status: DocumentStatusType
  trashed: boolean
}

export interface RelationIssueType {
  tag: string
  severity: 'secondary' | 'info' | 'danger'
  // false when the item comes out with the next publish.
  missing: boolean
  text: string
}

// Why a referenced item won't be on the site as expected; null when it already is.
export const relationIssue = (ref: RelationRefType): RelationIssueType | null => {
  if (ref.trashed) return { tag: 'En la papelera', severity: 'danger', missing: true, text: 'está en la papelera' }
  if (ref.status === 'hidden') return { tag: 'Oculto', severity: 'secondary', missing: true, text: 'está oculto' }
  if (ref.status === 'unpublishing') return { tag: 'Se quita al publicar', severity: 'danger', missing: true, text: 'se quita del sitio al publicar' }
  if (ref.status === 'new') return { tag: 'Sin publicar', severity: 'info', missing: false, text: 'todavía no está publicado: sale con la próxima publicación' }
  return null
}

// Away from its field (the publish list) the notice also says what the item is: "Ana" (autor).
export const relationName = (ref: RelationRefType, withKind = false) =>
  `"${ref.label}"${withKind ? ` (${ref.kind.toLowerCase()})` : ''}`

export const relationNotice = (ref: RelationRefType, issue: RelationIssueType, withKind = false) =>
  `${relationName(ref, withKind)} ${issue.text}${issue.missing ? ': no va a aparecer en el sitio.' : '.'}`

// What the publish list says about the items a document points to. A new item comes out in the same publish
// unless it has missing fields (comesOut answers that).
export const referenceWarnings = (ids: string[], refs: Record<string, RelationRefType>, comesOut: (id: string) => boolean) =>
  ids.flatMap(id => {
    const ref = refs[id]
    if (!ref) return ['Un contenido elegido ya no existe: no va a aparecer en el sitio.']
    const issue = relationIssue(ref)
    if (!issue) return []
    if (issue.missing) return [relationNotice(ref, issue, true)]
    return comesOut(id) ? [] : [`${relationName(ref, true)} no se publica hasta completar sus campos: no va a aparecer en el sitio.`]
  })
