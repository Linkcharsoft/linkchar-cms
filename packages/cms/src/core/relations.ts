import type { DocumentStatusType } from './publish'

export interface RelationRefType {
  label: string
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

export const relationNotice = (ref: RelationRefType, issue: RelationIssueType) =>
  `"${ref.label}" ${issue.text}${issue.missing ? ': no va a aparecer en el sitio.' : '.'}`
