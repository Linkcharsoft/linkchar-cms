import type { CmsClientType } from './context'
import type { Json } from './database'
import type { ActivityActionType } from '../core/activity'

// Best effort: a failed log entry never blocks the editor's action.
export const logActivity = async (
  client: CmsClientType,
  action: ActivityActionType,
  documentId: string | null,
  details: Record<string, Json> = {}
) => {
  const { error } = await client.from('activity_log').insert({ action, document_id: documentId, details })
  if (error) console.error('[activity] insert failed:', error.code ?? error.message)
}
