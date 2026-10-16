import type { DocumentStatusType } from '../../core/status'

export const DOCUMENT_SEVERITIES: Record<DocumentStatusType, 'secondary' | 'info' | 'success' | 'warning' | 'danger'> = {
  hidden: 'secondary',
  new: 'info',
  published: 'success',
  changed: 'warning',
  unpublishing: 'danger'
}

export const DOCUMENT_STATUS_LIST = Object.keys(DOCUMENT_SEVERITIES) as DocumentStatusType[]
