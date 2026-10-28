'use client'
import './PageList.sass'
import Link from 'next/link'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Tag } from 'primereact/tag'
import { useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DateCell from '../../primitives/DateCell/DateCell'
import InlineList from '../../primitives/InlineList/InlineList'
import { DOCUMENT_SEVERITIES } from '../documentStatus'
import type { PageListItemType } from '../../../server/pages'
import type { Route } from 'next'

interface Props {
  pages: PageListItemType[]
}

const PageList = ({ pages }: Props) => {
  const { t } = useT()

  const nameTemplate = (page: PageListItemType) => (
    <span className='PageList__Name'>
      <i className={`pi ${page.icon} PageList__Icon`} aria-hidden='true' />
      <span className='PageList__NameText'>
        <Link href={page.href as Route} className='PageList__Title'>{page.label}</Link>
        {page.path
          ? (
            <a href={page.path} target='_blank' rel='noopener noreferrer' className='PageList__Url'>
              {page.path}
              <i className='pi pi-external-link' aria-hidden='true' />
              <span className='sr-only'>{t('pagesList.viewOnSite')}</span>
            </a>
          )
          : <span className='PageList__Meta'>{t('pagesList.systemPage')}</span>}
      </span>
    </span>
  )

  const statusTemplate = (page: PageListItemType) => (page.status
    ? <Tag value={t(`documentStatus.${page.status}`)} severity={DOCUMENT_SEVERITIES[page.status]} />
    : <Tag value={t('pagesList.noContent')} severity='secondary' />)

  const editedTemplate = (page: PageListItemType) => (
    <span className='PageList__Edited'>
      <DateCell value={page.updatedAt} />
      {page.updatedBy && <span className='PageList__Meta'>{page.updatedBy}</span>}
    </span>
  )

  const usesTemplate = (page: PageListItemType) => (page.uses.length === 0
    ? <span className='PageList__Meta'>{t('common.empty')}</span>
    : (
      <span className='PageList__Uses'>
        <InlineList
          items={page.uses}
          label={use => (use.count === null ? use.label : t('pagesList.useCount', { label: use.label, count: use.count }))}
          render={use => (
            <Link href={use.href as Route} className='PageList__UseLink'>
              {use.count === null ? use.label : t('pagesList.useCount', { label: use.label, count: use.count })}
            </Link>
          )}
        />
      </span>
    ))

  const actionsTemplate = (page: PageListItemType) => (
    <div className='PageList__Actions'>
      <CustomButton href={page.href} variant='secondary' size='sm' aria-label={t('pagesList.editNamed', { name: page.label })}>
        <i className='pi pi-pencil' aria-hidden='true' />
        {t('pagesList.edit')}
      </CustomButton>
    </div>
  )

  return (
    <div className='PageList'>
      <DataTable responsiveLayout='stack' breakpoint='767px' value={pages} dataKey='id' className='PageList__Table' pt={{ bodyRow: { 'data-tour': 'pages-row' } }}>
        <Column header={t('pagesList.page')} body={nameTemplate} />
        <Column header={t('listColumns.status')} body={statusTemplate} />
        <Column header={t('listColumns.edited')} body={editedTemplate} />
        <Column header={t('pagesList.alsoShows')} body={usesTemplate} />
        <Column header={<span className='sr-only'>{t('listColumns.actions')}</span>} body={actionsTemplate} />
      </DataTable>
    </div>
  )
}

export default PageList
