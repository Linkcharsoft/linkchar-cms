import type { DocumentDisplayStatusType } from '../../core/status'

export const DOCUMENT_SEVERITIES: Record<DocumentDisplayStatusType, 'secondary' | 'info' | 'success' | 'warning' | 'danger'> = {
  hidden: 'secondary',
  new: 'info',
  incomplete: 'warning',
  published: 'success',
  changed: 'warning',
  unpublishing: 'danger'
}

export const DOCUMENT_STATUS_LIST = Object.keys(DOCUMENT_SEVERITIES) as DocumentDisplayStatusType[]
