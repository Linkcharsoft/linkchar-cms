import { notFound } from 'next/navigation'
import { textContext } from '../../core/config'
import { collectionNewLabel, getCollection } from '../../core/entries'
import { isDisplayStatus } from '../../core/status'
import { resolveText } from '../../core/text'
import { COLLECTION_PAGE_SIZE } from '../../server/documents'
import CollectionTable from '../lists/CollectionTable/CollectionTable'
import CollectionTabs from '../lists/CollectionTabs/CollectionTabs'
import CreateDocumentButton from '../lists/CreateDocumentButton/CreateDocumentButton'
import DashboardPageHeader from '../primitives/DashboardPageHeader/DashboardPageHeader'
import { collectionTabs } from '../shell/navigation'
import type { CollectionQueryType, CollectionSortType } from '../../server/documents'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

type SearchParamsType = Record<string, string | string[] | undefined>

interface Props {
  params: Promise<{ entry: string }>
  searchParams: Promise<SearchParamsType>
}

const SORTS: readonly CollectionSortType[] = ['updated', 'title', 'manual']

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export const collectionRoute = (cms: CmsServerType) => {
  const generateMetadata = async ({ params }: Pick<Props, 'params'>): Promise<Metadata> => {
    const ctx = textContext(cms.config)
    const entry = getCollection(cms.config, (await params).entry)
    return { title: entry ? resolveText(entry.label, ctx) : ctx.translator.t('collectionList.fallbackTitle') }
  }

  const Page = async ({ params, searchParams }: Props) => {
    const [{ entry: entryId }, query] = await Promise.all([params, searchParams])
    await cms.queries.requireRole()
    const entry = getCollection(cms.config, entryId)
    if (!entry) notFound()

    const ctx = textContext(cms.config)
    const { t } = ctx.translator
    const search = param(query.q) ?? ''
    const requestedSort = param(query.sort)
    const requestedStatus = param(query.status)
    const status = isDisplayStatus(requestedStatus) ? requestedStatus : undefined
    const collectionQuery: CollectionQueryType = {
      search,
      sort: SORTS.find(sort => sort === requestedSort),
      status,
      page: Number(param(query.page)) || 1
    }
    const { items, total, page, sort } = await cms.queries.listCollection(entryId, collectionQuery)
    const tabs = collectionTabs(cms.config, entryId)
    const parent = entry.under ? getCollection(cms.config, entry.under) : null
    const title = resolveText((parent ?? entry).label, ctx)

    return (
      <main id='main' className='flex-1'>
        <section className='CmsContainer py-6'>
          <DashboardPageHeader
            title={title}
            subtitle={t('collectionList.count', { count: total })}
            actions={<CreateDocumentButton entryId={entryId} label={collectionNewLabel(entry, ctx)} />}
          />

          {tabs.length > 0 && <CollectionTabs tabs={tabs} activeId={entryId} label={t('collectionList.sections', { name: title })} />}

          <CollectionTable
            entryId={entryId}
            singularLabel={resolveText(entry.singularLabel, ctx)}
            orderable={entry.orderable}
            items={items}
            total={total}
            page={page}
            pageSize={COLLECTION_PAGE_SIZE}
            sort={sort}
            search={search}
            status={status ?? null}
          />
        </section>
      </main>
    )
  }

  return { Page, generateMetadata }
}
