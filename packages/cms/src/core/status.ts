export type DocumentStatusType = 'hidden' | 'new' | 'published' | 'changed' | 'unpublishing'

// What the panel shows: a pending document that missing content keeps out of the publication reads "Incompleto".
export type DocumentDisplayStatusType = DocumentStatusType | 'incomplete'

export const DISPLAY_STATUSES: readonly DocumentDisplayStatusType[] = ['hidden', 'new', 'incomplete', 'published', 'changed', 'unpublishing']

export const displayStatus = (status: DocumentStatusType, incomplete: boolean): DocumentDisplayStatusType =>
  ((status === 'new' || status === 'changed') && incomplete ? 'incomplete' : status)

export const isDisplayStatus = (value: unknown): value is DocumentDisplayStatusType =>
  typeof value === 'string' && (DISPLAY_STATUSES as readonly string[]).includes(value)
