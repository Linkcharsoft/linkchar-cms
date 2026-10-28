'use client'
import './SortableList.sass'
import { closestCenter, DndContext, KeyboardSensor, MeasuringStrategy, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useId } from 'react'
import { useT } from '../../client/context'
import type { Announcements } from '@dnd-kit/core'
import type { ReactNode } from 'react'

interface Props {
  ids: string[]
  labelOf: (id: string) => string
  onMove: (from: number, to: number) => void
  // Items are collapsed while dragging: tall open items make collision detection pick the wrong slot.
  onDragStart?: () => void
  // After a drop or a cancel.
  onDragEnd?: () => void
  children: ReactNode
}

const SortableList = ({ ids, labelOf, onMove, onDragStart, onDragEnd, children }: Props) => {
  const { t } = useT()
  // dnd-kit numbers its aria ids with a global counter that differs between server and client.
  const id = useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const position = (id: unknown) => ids.indexOf(String(id)) + 1

  const announcements: Announcements = {
    onDragStart: ({ active }) => t('fields.sortable.dragStart', { label: labelOf(String(active.id)), position: position(active.id), total: ids.length }),
    onDragOver: ({ active, over }) => (over ? t('fields.sortable.dragOver', { label: labelOf(String(active.id)), position: position(over.id) }) : undefined),
    onDragEnd: ({ active, over }) => (over ? t('fields.sortable.dragEnd', { label: labelOf(String(active.id)), position: position(over.id) }) : undefined),
    onDragCancel: ({ active }) => t('fields.sortable.dragCancel', { label: labelOf(String(active.id)) })
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t('fields.sortable.instructions') } }}
      onDragCancel={onDragEnd}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
        onDragEnd?.()
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className='SortableList'>{children}</ul>
      </SortableContext>
    </DndContext>
  )
}

export default SortableList
