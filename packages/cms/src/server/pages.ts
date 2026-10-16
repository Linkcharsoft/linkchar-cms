import { textContext } from '../core/config'
import { entryIds, getPage } from '../core/entries'
import { pageSections, usedEntries } from '../core/pages'
import { panelPaths } from '../core/paths'
import { resolveText } from '../core/text'
import { authorNames } from './authors'
import type { CmsContextType } from './context'
import type { DocumentStatusType } from '../core/status'

export interface PageUseType {
  label: string
  href: string
  // Items of a used collection; null for singletons.
  count: number | null
}

export interface PageListItemType {
  id: string
  label: string
  icon: string
  // Public URL; null for system pages (404).
  path: string | null
  href: string
  // null while the page was never saved.
  status: DocumentStatusType | null
  updatedAt: string | null
  updatedBy: string | null
  uses: PageUseType[]
}

export const listPages = async (ctx: CmsContextType): Promise<PageListItemType[]> => {
  const pages = entryIds(ctx.config).flatMap(id => {
    const page = getPage(ctx.config, id)
    return page ? [{ id, page, uses: usedEntries(ctx.config, pageSections(page.fields)) }] : []
  })
  const collections = [...new Set(pages.flatMap(({ uses }) => uses.filter(({ kind }) => kind === 'collection').map(({ id }) => id)))]

  const [{ data: rows }, counts] = await Promise.all([
    ctx.db.from('document_status').select('type, status, updated_at, updated_by').in('type', pages.map(({ id }) => id)).is('deleted_at', null),
    Promise.all(collections.map(async id => {
      const { count } = await ctx.db.from('documents').select('id', { count: 'exact', head: true }).eq('type', id).is('deleted_at', null)
      return [id, count ?? 0] as const
    }))
  ])
  const names = await authorNames(ctx, (rows ?? []).map(row => row.updated_by))
  const countOf = Object.fromEntries(counts)
  const paths = panelPaths(ctx.config)
  const texts = textContext(ctx.config)

  return pages.map(({ id, page, uses }) => {
    const row = rows?.find(item => item.type === id)
    return {
      id,
      label: resolveText(page.label, texts),
      icon: page.icon ?? 'pi-file',
      path: page.path ?? null,
      href: paths.page(id),
      status: (row?.status as DocumentStatusType | undefined) ?? null,
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by ? names[row.updated_by] ?? null : null,
      uses: uses.map(used => ({ label: resolveText(used.label, texts), href: paths.entry(used.kind, used.id), count: countOf[used.id] ?? null }))
    }
  })
}
