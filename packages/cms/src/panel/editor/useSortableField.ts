'use client'
import { arrayMove } from '@dnd-kit/sortable'
import { useField } from 'formik'
import { useState } from 'react'
import { newKey } from '../../core/defaults'

interface KeyedItemType {
  _key: string
}

interface SortableFieldType<T extends KeyedItemType> {
  items: T[]
  isOpen: (key: string) => boolean
  toggle: (key: string) => void
  collapseAll: () => void
  add: (item: T) => void
  duplicate: (index: number) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
}

// Array operations for list and blocks fields bound to a Formik path. Every item keeps a stable `_key`.
const useSortableField = <T extends KeyedItemType>(name: string): SortableFieldType<T> => {
  const [{ value }, , helpers] = useField<T[]>(name)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const items = Array.isArray(value) ? value : []

  const commit = (next: T[]) => {
    helpers.setValue(next)
    helpers.setTouched(true, false)
  }

  const open = (key: string) => setOpenKeys(current => (current.includes(key) ? current : [...current, key]))

  return {
    items,
    isOpen: key => openKeys.includes(key),
    toggle: key => setOpenKeys(current => (current.includes(key) ? current.filter(k => k !== key) : [...current, key])),
    collapseAll: () => setOpenKeys([]),
    add: item => {
      commit([...items, item])
      open(item._key)
    },
    duplicate: index => {
      const copy = { ...structuredClone(items[index]), _key: newKey() }
      commit([...items.slice(0, index + 1), copy, ...items.slice(index + 1)])
      open(copy._key)
    },
    remove: index => commit(items.filter((_, i) => i !== index)),
    move: (from, to) => commit(arrayMove(items, from, to))
  }
}

export default useSortableField
