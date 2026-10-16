'use client'
import './TrashList.sass'
import { useRouter } from 'next/navigation'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Tag } from 'primereact/tag'
import { useCms, useT } from '../../client/context'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DateCell from '../../primitives/DateCell/DateCell'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import { useNotify } from '../../providers/notify'
import type { TrashItemType } from '../../../server/documents'

interface Props {
  items: TrashItemType[]
  canPurge: boolean
}

const TrashList = ({ items, canPurge }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const router = useRouter()
  const notify = useNotify()
  const confirm = useConfirm()

  const restore = async (item: TrashItemType) => {
    const result = await actions.restoreDocument(item.id)
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
      const result = await actions.purgeDocument(item.id)
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
      <CustomButton type='button' variant='secondary' size='sm' onClick={() => restore(item)}>
        <i className='pi pi-replay' aria-hidden='true' />
        {t('trashList.restore')}
      </CustomButton>
      {canPurge && (
        <CustomButton
          type='button'
          variant='danger-ghost'
          size='md'
          iconOnly
          icon='pi pi-trash'
          aria-label={t('trashList.purgeNamed', { title: item.title })}
          onClick={() => askPurge(item)}
        />
      )}
    </div>
  )

  return (
    <div className='TrashList'>
      <DataTable
        responsiveLayout='stack'
        breakpoint='767px'
        value={items}
        dataKey='id'
        emptyMessage={<EmptyState compact icon='pi pi-trash' title={t('trashList.empty')} />}
        className='TrashList__Table'
      >
        <Column header={t('trashList.content')} body={titleTemplate} />
        <Column header={t('listColumns.status')} body={statusTemplate} />
        <Column header={t('trashList.trashedAt')} body={dateTemplate} />
        <Column header={<span className='sr-only'>{t('listColumns.actions')}</span>} body={actionsTemplate} />
      </DataTable>
    </div>
  )
}

export default TrashList
