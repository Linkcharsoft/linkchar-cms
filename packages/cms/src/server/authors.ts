import type { CmsContextType } from './context'

// RLS hides other profiles from editors; history and logs still need their names (author_names() is security definer).
export const authorNames = async (ctx: CmsContextType, ids: (string | null)[]): Promise<Record<string, string>> => {
  const unique = [...new Set(ids.filter((id): id is string => !!id))]
  if (unique.length === 0) return {}

  const { data } = await ctx.db.rpc('author_names', { ids: unique })
  return Object.fromEntries((data ?? []).map(row => [row.id, row.name]))
}
