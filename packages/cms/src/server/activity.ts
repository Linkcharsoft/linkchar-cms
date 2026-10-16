import { actionsInGroup, ACTIVITY_ACTIONS } from '../core/activity'
import { textContext } from '../core/config'
import { dayRange } from '../core/dates'
import { getEntry } from '../core/entries'
import { resolveText } from '../core/text'
import { requireRole } from './auth'
import { asRecord } from './context'
import { describeDocument } from './publish'
import type { CmsClientType, CmsContextType } from './context'
import type { Json } from './database'
import type { ActivityActionType, ActivityGroupType } from '../core/activity'

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

export const ACTIVITY_PAGE_SIZE = 25

const RETENTION_MONTHS = 12

// Nobody holds a delete grant on the log, so expired rows go with the service role.
export const purgeExpiredActivity = async (ctx: CmsContextType) => {
  await requireRole(ctx, 'admin')
  const limit = ctx.now()
  limit.setMonth(limit.getMonth() - RETENTION_MONTHS)
  const { error } = await ctx.admin().from('activity_log').delete().lt('created_at', limit.toISOString())
  if (error) console.error('[activity] purge failed:', error.code ?? error.message)
}

export interface ActivityQueryType {
  group?: ActivityGroupType
  userId?: string
  // Calendar days in the site time zone ("2026-10-13").
  from?: string
  to?: string
  page?: number
}

export interface ActivityRowType {
  id: number
  createdAt: string
  // null when the user was deleted.
  userName: string | null
  action: string
  group: ActivityGroupType | null
  details: Record<string, unknown>
  // What a document action was about; `deleted` when it was purged since (the panel says "(eliminado)").
  subject: { title: string, href: string | null, deleted: boolean } | null
}

type LoggedDocumentType = { id: string, type: string, data: unknown, deleted_at: string | null }

// A purged document leaves no row behind: its type from the details still says what it was.
const subjectOf = (ctx: CmsContextType, documentRow: LoggedDocumentType | null, details: Record<string, unknown>) => {
  if (documentRow) {
    const described = describeDocument(ctx, documentRow)
    return described ? { title: described.title, href: described.href, deleted: false } : null
  }
  const entry = typeof details.type === 'string' ? getEntry(ctx.config, details.type) : null
  if (!entry) return null
  const name = entry.kind === 'collection' ? entry.singularLabel : entry.label
  return { title: resolveText(name, textContext(ctx.config)), href: null, deleted: true }
}

// RLS: only admins and superadmins read the log.
export const listActivity = async (ctx: CmsContextType, query: ActivityQueryType = {}) => {
  await requireRole(ctx, 'admin')
  const page = Math.max(1, query.page ?? 1)
  const start = (page - 1) * ACTIVITY_PAGE_SIZE

  let request = ctx.db.from('activity_log')
    .select('id, action, details, created_at, document_id, profiles(name), documents(id, type, data, deleted_at)', { count: 'exact' })
  if (query.group) request = request.in('action', actionsInGroup(query.group))
  if (query.userId) request = request.eq('user_id', query.userId)
  const from = query.from ? dayRange(query.from, ctx.config.timeZone) : null
  const to = query.to ? dayRange(query.to, ctx.config.timeZone) : null
  if (from) request = request.gte('created_at', from.from)
  if (to) request = request.lte('created_at', to.to)

  const [{ data, count, error }, { data: users }] = await Promise.all([
    request.order('created_at', { ascending: false }).range(start, start + ACTIVITY_PAGE_SIZE - 1),
    ctx.db.from('profiles').select('id, name').order('name')
  ])
  if (error) console.error('[activity] list failed:', error.code ?? error.message)

  const items = (data ?? []).map((row): ActivityRowType => {
    const details = asRecord(row.details)
    const author = row.profiles as { name: string } | null
    return {
      id: row.id,
      createdAt: row.created_at,
      userName: author ? author.name : null,
      action: row.action,
      group: ACTIVITY_ACTIONS[row.action as ActivityActionType] ?? null,
      details,
      subject: row.action.startsWith('document.') ? subjectOf(ctx, row.documents as LoggedDocumentType | null, details) : null
    }
  })

  return { items, total: count ?? 0, page, users: (users ?? []).map(user => ({ id: user.id, name: user.name })) }
}
