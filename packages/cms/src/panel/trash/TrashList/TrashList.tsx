'use client'
import './TrashList.sass'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Paginator } from 'primereact/paginator'
import { Tag } from 'primereact/tag'
import { useState } from 'react'
import { useCms, useT } from '../../client/context'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DashboardToolbar from '../../primitives/DashboardToolbar/DashboardToolbar'
import DateCell from '../../primitives/DateCell/DateCell'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import SearchInput from '../../primitives/SearchInput/SearchInput'
import { useNotify } from '../../providers/notify'
import type { TrashItemType } from '../../../server/documents'
import type { Route } from 'next'

interface Props {
  items: TrashItemType[]
  total: number
  page: number
  pageSize: number
  search: string
  canPurge: boolean
}

const TrashList = ({ items, total, page, pageSize, search, canPurge }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const notify = useNotify()
  const confirm = useConfirm()
  const [busy, setBusy] = useState<string | null>(null)

  const updateQuery = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(changes).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)))
    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}` as Route)
  }

  const restore = async (item: TrashItemType) => {
    setBusy(item.id)
    const result = await actions.restoreDocument(item.id)
    setBusy(null)
    if (!result.ok) {
      notify({ severity: 'error', summary: t('trashList.restoreFailed'), detail: translate(result.error) })
      return
    }
    notify({ severity: 'success', summary: t('trashList.restored'), detail: t('trashList.restoredDetail', { title: item.title, entry: item.entryLabel }) })
    router.refresh()
  }

  const askPurge = (item: TrashItemType) => confirm({
    header: t('trashList.purgeHeader'),
    message: t('trashList.purgeMessage', { title: item.title }),
    acceptLabel: t('trashList.purge'),
    tone: 'danger',
    accept: async () => {
      setBusy(item.id)
      const result = await actions.purgeDocument(item.id)
      setBusy(null)
      if (!result.ok) {
        notify({ severity: 'error', summary: t('trashList.purgeFailed'), detail: translate(result.error), life: 6000 })
        return
      }
      notify({ severity: 'success', summary: t('trashList.purged') })
      router.refresh()
    }
  })

  const titleTemplate = (item: TrashItemType) => (
    <span className='TrashList__Title'>
      {item.title}
      <span className='TrashList__Meta'>{item.entryLabel}</span>
    </span>
  )

  const dateTemplate = (item: TrashItemType) => (
    <DateCell value={item.deletedAt} />
  )

  const statusTemplate = (item: TrashItemType) => (item.published
    ? <Tag value={t('documentStatus.unpublishing')} severity='danger' />
    : <Tag value={t('trashList.offSite')} severity='secondary' />)

  const actionsTemplate = (item: TrashItemType) => (
    <div className='TrashList__Actions'>
      <CustomButton type='button' variant='secondary' size='sm' loading={busy === item.id} disabled={busy !== null && busy !== item.id} onClick={() => restore(item)}>
        <i className='pi pi-replay' aria-hidden='true' />
        {t('trashList.restore')}
      </CustomButton>
      {canPurge && (
        <CustomButton
          type='button'
          variant='danger-ghost'
          size='sm'
          iconOnly
          icon='pi pi-trash'
          aria-label={t('trashList.purgeNamed', { title: item.title })}
          disabled={busy !== null}
          onClick={() => askPurge(item)}
        />
      )}
    </div>
  )

  return (
    <div className='TrashList'>
      {(total > 0 || search) && (
        <DashboardToolbar>
          <SearchInput
            key={search}
            initialValue={search || undefined}
            placeholder={t('trashList.searchPlaceholder')}
            onChange={value => updateQuery({ q: value?.trim() || undefined, page: undefined })}
          />
        </DashboardToolbar>
      )}

      <DataTable
        responsiveLayout='stack'
        breakpoint='767px'
        value={items}
        dataKey='id'
        emptyMessage={search
          ? <EmptyState compact icon='pi pi-filter-slash' title={t('trashList.noResults')} />
          : <EmptyState compact icon='pi pi-trash' title={t('trashList.empty')} />}
        className='TrashList__Table'
      >
        <Column header={t('trashList.content')} body={titleTemplate} />
        <Column header={t('listColumns.status')} body={statusTemplate} />
        <Column header={t('trashList.trashedAt')} body={dateTemplate} />
        <Column header={<span className='sr-only'>{t('listColumns.actions')}</span>} body={actionsTemplate} />
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

export default TrashList
