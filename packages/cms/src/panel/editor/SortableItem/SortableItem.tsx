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
  canDuplicate?: boolean
  // Static row (e.g. gallery thumbnails): no expand/collapse body.
  thumbnail?: ReactNode
  onToggle?: () => void
  onDuplicate?: () => void
  onRemove: () => void
  children?: ReactNode
}

const SortableItem = ({ id, title, badge, icon, open = false, canDuplicate = false, thumbnail, onToggle, onDuplicate, onRemove, children }: Props) => {
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
            {icon && <i className={classNames('pi', icon, 'SortableItem__Icon')} aria-hidden='true' />}
            {badge && <span className='SortableItem__Badge'>{badge}</span>}
            <span className='SortableItem__Title'>{title}</span>
            <i className={classNames('pi', open ? 'pi-chevron-up' : 'pi-chevron-down')} aria-hidden='true' />
          </button>
        ) : (
          <div className='SortableItem__Static'>
            {thumbnail}
            <span className='SortableItem__Title'>{title}</span>
          </div>
        )}

        {canDuplicate && onDuplicate && (
          <CustomButton type='button' variant='ghost' size='sm' iconOnly icon='pi pi-copy' aria-label={t('fields.sortable.duplicate', { title })} onClick={onDuplicate} />
        )}
        <CustomButton type='button' variant='danger-ghost' size='sm' iconOnly icon='pi pi-trash' aria-label={t('fields.sortable.remove', { title })} onClick={onRemove} />
      </div>

      {open && children && <div id={bodyId} className='SortableItem__Body'>{children}</div>}
    </li>
  )
}

export default SortableItem
