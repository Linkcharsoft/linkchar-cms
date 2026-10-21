import { panelPaths } from '../core/paths'
import { logActivity } from './activity'
import { requireRole } from './auth'
import { UNIQUE_VIOLATION } from './context'
import type { ActionResultType } from './collections'
import type { CmsContextType } from './context'

export const restoreDocument = async (ctx: CmsContextType, id: string): Promise<ActionResultType> => {
  await requireRole(ctx, 'editor')
  const { data, error } = await ctx.db.from('documents').update({ deleted_at: null })
    .eq('id', id).not('deleted_at', 'is', null).select('id, type').maybeSingle()

  if (error?.code === UNIQUE_VIOLATION) return { ok: false, error: 'errors.trash.slugTaken' }
  if (error || !data) return { ok: false, error: 'errors.trash.restoreFailed' }

  await logActivity(ctx, 'document.untrash', id, { type: data.type })
  ctx.revalidate(panelPaths(ctx.config).trash)
  return { ok: true }
}

// Admin only (RLS too). A document still on the site has to be unpublished first.
export const purgeDocument = async (ctx: CmsContextType, id: string): Promise<ActionResultType> => {
  await requireRole(ctx, 'admin')
  const { data: row } = await ctx.db.from('document_status').select('type, status')
    .eq('id', id).not('deleted_at', 'is', null).maybeSingle()

  if (!row) return { ok: false, error: 'errors.trash.notTrashed' }
  if (row.status === 'unpublishing') return { ok: false, error: 'errors.trash.stillPublished' }

  const { error } = await ctx.db.from('documents').delete().eq('id', id)
  if (error) return { ok: false, error: 'errors.trash.purgeFailed' }

  await logActivity(ctx, 'document.purge', null, { id, type: row.type })
  ctx.revalidate(panelPaths(ctx.config).trash)
  return { ok: true }
}
