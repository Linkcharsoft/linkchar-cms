'use client'
import './CollectionTable.sass'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { Paginator } from 'primereact/paginator'
import { Tag } from 'primereact/tag'
import { useState } from 'react'
import { useCms, useT } from '../../client/context'
import DocumentActions from '../../editor/DocumentActions/DocumentActions'
import DashboardToolbar from '../../primitives/DashboardToolbar/DashboardToolbar'
import DateCell from '../../primitives/DateCell/DateCell'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import SearchInput from '../../primitives/SearchInput/SearchInput'
import { useNotify } from '../../providers/notify'
import { DOCUMENT_SEVERITIES, DOCUMENT_STATUS_LIST } from '../documentStatus'
import type { DocumentDisplayStatusType } from '../../../core/status'
import type { CollectionItemType, CollectionSortType } from '../../../server/documents'
import type { Route } from 'next'

interface Props {
  entryId: string
  singularLabel: string
  orderable: boolean
  items: CollectionItemType[]
  total: number
  page: number
  pageSize: number
  sort: CollectionSortType
  search: string
  status: DocumentDisplayStatusType | null
}

// PrimeReact shows an empty Dropdown for '', so "no filter" needs its own value.
const ALL = 'all'

const CollectionTable = ({ entryId, singularLabel, orderable, items, total, page, pageSize, sort, search, status }: Props) => {
  const { t, translate, locale } = useT()
  const { actions } = useCms()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const notify = useNotify()
  const [rows, setRows] = useState(items)
  const [lastItems, setLastItems] = useState(items)

  if (items !== lastItems) {
    setLastItems(items)
    setRows(items)
  }

  const statusOptions = [
    { label: t('collectionList.allStatuses'), value: ALL },
    ...DOCUMENT_STATUS_LIST.map(value => ({ label: t(`documentStatus.${value}`), value }))
  ]
  const sortOptions = [
    ...(orderable ? [{ label: t('collectionList.sorts.manual'), value: 'manual' }] : []),
    { label: t('collectionList.sorts.updated'), value: 'updated' },
    { label: t('collectionList.sorts.title'), value: 'title' }
  ]
  const canReorder = orderable && sort === 'manual' && !search && !status

  const updateQuery = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(changes).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)))
    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}` as Route)
  }

  const titleTemplate = (item: CollectionItemType) => (
    <Link href={item.href as Route} className='CollectionTable__Title'>{item.title}</Link>
  )

  const statusTemplate = (item: CollectionItemType) => (
    <Tag value={t(`documentStatus.${item.status}`)} severity={DOCUMENT_SEVERITIES[item.status]} />
  )

  const dateTemplate = (item: CollectionItemType) => (
    <DateCell value={item.updatedAt} />
  )

  const actionsTemplate = (item: CollectionItemType) => (
    <DocumentActions entryId={item.entryId} documentId={item.id} title={item.title} compact />
  )

  return (
    <div className='CollectionTable' data-tour='collection-list'>
      <DashboardToolbar>
        <SearchInput
          initialValue={search || undefined}
          placeholder={t('collectionList.searchPlaceholder')}
          onChange={value => updateQuery({ q: value?.trim() || undefined, page: undefined })}
        />
        <Dropdown
          inputId={`${entryId}-sort`}
          aria-label={t('collectionList.sortBy')}
          value={sort}
          options={sortOptions}
          onChange={event => updateQuery({ sort: event.value, page: undefined })}
        />
        <Dropdown
          inputId={`${entryId}-status`}
          aria-label={t('collectionList.filterStatus')}
          value={status ?? ALL}
          options={statusOptions}
          onChange={event => updateQuery({ status: event.value === ALL ? undefined : event.value, page: undefined })}
        />
      </DashboardToolbar>

      <DataTable
        value={rows}
        dataKey='id'
        responsiveLayout='stack'
        breakpoint='767px'
        reorderableRows={canReorder}
        onRowReorder={async event => {
          const reordered = event.value as CollectionItemType[]
          setRows(reordered)
          const result = await actions.reorderCollection(entryId, reordered.map(row => row.id), (page - 1) * pageSize)
          if (!result.ok) notify({ severity: 'error', summary: t('collectionList.reorderFailed'), detail: translate(result.error) })
        }}
        emptyMessage={search || status
          ? <EmptyState compact icon='pi pi-filter-slash' title={t('collectionList.noResults')} />
          : (
            <EmptyState
              compact
              icon='pi pi-file'
              title={t('collectionList.empty')}
              description={t('collectionList.emptyHelp', { name: singularLabel.toLocaleLowerCase(locale) })}
            />
          )}
        className='CollectionTable__Table'
      >
        {canReorder && <Column rowReorder className='CollectionTable__Handle' header={<span className='sr-only'>{t('listColumns.reorder')}</span>} />}
        <Column header={t('collectionList.title')} body={titleTemplate} />
        <Column header={t('listColumns.status')} body={statusTemplate} />
        <Column header={t('listColumns.edited')} body={dateTemplate} />
        <Column header={<span className='sr-only'>{t('listColumns.actions')}</span>} body={actionsTemplate} className='CollectionTable__Actions' />
      </DataTable>

      {total > pageSize && (
        <Paginator
          first={(page - 1) * pageSize}
          rows={pageSize}
          totalRecords={total}
          onPageChange={event => updateQuery({ page: event.page > 0 ? String(event.page + 1) : undefined })}
        />
      )}
    </div>
  )
}

export default CollectionTable
