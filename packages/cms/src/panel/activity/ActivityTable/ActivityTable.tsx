'use client'
import './ActivityTable.sass'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { Paginator } from 'primereact/paginator'
import { useState } from 'react'
import { ACTIVITY_GROUPS, activityDetail, activityLabel } from '../../../core/activity'
import { useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DashboardToolbar from '../../primitives/DashboardToolbar/DashboardToolbar'
import DateCell from '../../primitives/DateCell/DateCell'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import type { ActivityGroupType } from '../../../core/activity'
import type { ActivityRowType } from '../../../server/activity'
import type { Route } from 'next'

interface Props {
  items: ActivityRowType[]
  total: number
  page: number
  pageSize: number
  users: { id: string, name: string }[]
  group: ActivityGroupType | ''
  userId: string
  from: string
  to: string
}

const ALL = 'all'

const pad = (value: number) => String(value).padStart(2, '0')

// The picker works in the browser's calendar; the query keeps plain days ("2026-10-13").
const toDay = (date: Date | null | undefined) => (date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : undefined)

const fromDay = (day: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}

const dateTemplate = (row: ActivityRowType) => <DateCell value={row.createdAt} />

const ActivityTable = ({ items, total, page, pageSize, users, group, userId, from, to }: Props) => {
  const translator = useT()
  const { t } = translator
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filtered = !!(group || userId || from || to)
  // The first day picked, until a second one completes the range or the calendar closes (one day alone).
  const [picking, setPicking] = useState<Date | null>(null)

  const groupOptions = [
    { label: t('activityScreen.allActions'), value: ALL },
    ...ACTIVITY_GROUPS.map(value => ({ label: t(`activity.groups.${value}`), value }))
  ]

  // Any filter change goes back to the first page.
  const updateQuery = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries({ pagina: undefined, ...changes }).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)))
    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}` as Route)
  }

  const actionTemplate = (row: ActivityRowType) => {
    const detail = activityDetail(row.action, row.details, translator)
    const subject = row.subject
    const subjectTitle = subject ? (subject.deleted ? `${subject.title} ${t('activity.deleted')}` : subject.title) : null
    return (
      <div className='ActivityTable__Action'>
        <span>
          {activityLabel(row.action, translator)}
          {subject && ' '}
          {subject && (subject.href
            ? <Link href={subject.href as Route} className='ActivityTable__Subject'>{subjectTitle}</Link>
            : <span className='ActivityTable__Subject'>{subjectTitle}</span>)}
        </span>
        {detail && <span className='ActivityTable__Detail'>{detail}</span>}
      </div>
    )
  }

  return (
    <div className='ActivityTable'>
      <DashboardToolbar>
        <Dropdown
          inputId='activity-group'
          aria-label={t('activityScreen.actionType')}
          value={group || ALL}
          options={groupOptions}
          onChange={event => updateQuery({ accion: event.value === ALL ? undefined : event.value })}
        />
        {users.length > 1 && (
          <Dropdown
            inputId='activity-user'
            aria-label={t('activityScreen.user')}
            value={userId || ALL}
            options={[{ label: t('activityScreen.allUsers'), value: ALL }, ...users.map(user => ({ label: user.name, value: user.id }))]}
            onChange={event => updateQuery({ usuario: event.value === ALL ? undefined : event.value })}
          />
        )}
        <Calendar
          inputId='activity-dates'
          aria-label={t('activityScreen.dates')}
          selectionMode='range'
          value={picking ? [picking, null] : from ? [fromDay(from), fromDay(to || from)] : null}
          placeholder={t('activityScreen.dates')}
          maxDate={new Date()}
          readOnlyInput
          showIcon
          showButtonBar
          onChange={event => {
            const [start, end] = event.value ?? []
            if (start && !end) return setPicking(start)
            setPicking(null)
            updateQuery({ desde: toDay(start), hasta: toDay(end) })
          }}
          onHide={() => {
            if (!picking) return
            setPicking(null)
            updateQuery({ desde: toDay(picking), hasta: toDay(picking) })
          }}
        />
        {filtered && (
          <CustomButton type='button' variant='ghost' size='sm' onClick={() => router.push(pathname as Route)}>
            {t('activityScreen.clear')}
          </CustomButton>
        )}
      </DashboardToolbar>

      <DataTable
        responsiveLayout='stack'
        breakpoint='767px'
        value={items}
        dataKey='id'
        emptyMessage={<EmptyState compact icon='pi pi-history' title={t('activityScreen.noMatches')} />}
        className='ActivityTable__Table'
      >
        <Column header={t('activityScreen.columns.date')} body={dateTemplate} className='ActivityTable__DateColumn' />
        <Column header={t('activityScreen.columns.user')} body={(row: ActivityRowType) => row.userName ?? t('activityScreen.deletedUser')} />
        <Column header={t('activityScreen.columns.action')} body={actionTemplate} />
      </DataTable>

      {total > pageSize && (
        <Paginator
          first={(page - 1) * pageSize}
          rows={pageSize}
          totalRecords={total}
          onPageChange={event => updateQuery({ pagina: event.page > 0 ? String(event.page + 1) : undefined })}
        />
      )}
    </div>
  )
}

export default ActivityTable
