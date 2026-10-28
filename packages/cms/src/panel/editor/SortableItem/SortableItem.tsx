'use client'
import './SortableItem.sass'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { classNames } from 'primereact/utils'
import { useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import type { ReactNode } from 'react'

interface Props {
  id: string
  title: string
  badge?: string
  icon?: string
  open?: boolean
  // Fields with a problem inside, shown on the collapsed row.
  issues?: number
  thumbnail?: ReactNode
  // Without onToggle the row is static (e.g. gallery thumbnails): no expand/collapse body.
  onToggle?: () => void
  onDuplicate?: () => void
  // Why duplicating or removing is off right now; the button stays, disabled, with the reason as its tooltip.
  duplicateDisabledReason?: string
  onRemove: () => void
  removeDisabledReason?: string
  children?: ReactNode
}

const SortableItem = ({
  id, title, badge, icon, open = false, issues = 0, thumbnail, onToggle, onDuplicate, duplicateDisabledReason, onRemove, removeDisabledReason, children
}: Props) => {
  const { t } = useT()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const bodyId = `sortable-${id}`

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={classNames('SortableItem', { 'SortableItem--Dragging': isDragging })}
    >
      <div className='SortableItem__Header'>
        {/* Native button: dnd-kit needs the activator ref, which CustomButton doesn't forward. */}
        <button
          type='button'
          ref={setActivatorNodeRef}
          className='SortableItem__Handle'
          aria-label={t('fields.sortable.move', { title })}
          {...attributes}
          {...listeners}
        >
          <i className='pi pi-bars' aria-hidden='true' />
        </button>

        {onToggle ? (
          <button type='button' className='SortableItem__Toggle' aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
            {thumbnail}
            {icon && <i className={classNames('pi', icon, 'SortableItem__Icon')} aria-hidden='true' />}
            {badge && <span className='SortableItem__Badge'>{badge}</span>}
            <span className='SortableItem__Title'>{title}</span>
            {!open && issues > 0 && <span className='SortableItem__Issues' aria-label={t('fields.issues', { count: issues })}>{issues}</span>}
            <i className={classNames('pi', open ? 'pi-chevron-up' : 'pi-chevron-down')} aria-hidden='true' />
          </button>
        ) : (
          <div className='SortableItem__Static'>
            {thumbnail}
            <span className='SortableItem__Title'>{title}</span>
          </div>
        )}

        {onDuplicate && (
          <CustomButton
            type='button'
            variant='ghost'
            size='sm'
            iconOnly
            icon='pi pi-copy'
            aria-label={t('fields.sortable.duplicate', { title })}
            disabled={!!duplicateDisabledReason}
            tooltip={duplicateDisabledReason}
            onClick={onDuplicate}
          />
        )}
        <CustomButton
          type='button'
          variant='danger-ghost'
          size='sm'
          iconOnly
          icon='pi pi-trash'
          aria-label={t('fields.sortable.remove', { title })}
          disabled={!!removeDisabledReason}
          tooltip={removeDisabledReason}
          onClick={onRemove}
        />
      </div>

      {open && children && <div id={bodyId} className='SortableItem__Body'>{children}</div>}
    </li>
  )
}

export default SortableItem
