'use client'
import { arrayMove } from '@dnd-kit/sortable'
import { getIn, setIn, useField, useFormikContext } from 'formik'
import { use, useEffect, useRef, useState } from 'react'
import { newKey } from '../../core/defaults'
import { FormFocusContext } from '../fields/formFocusContext'

interface KeyedItemType {
  _key: string
}

interface SortableFieldType<T extends KeyedItemType> {
  items: T[]
  isOpen: (key: string) => boolean
  allOpen: boolean
  toggle: (key: string) => void
  openAll: () => void
  collapseAll: () => void
  // Items are collapsed while dragging and reopened after it.
  startDrag: () => void
  endDrag: () => void
  add: (item: T) => void
  duplicate: (index: number) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
}

// Array operations for list and blocks fields bound to a Formik path. Every item keeps a stable `_key`.
// Touched is kept per item: marking the whole array would hide the errors of every item inside.
const useSortableField = <T extends KeyedItemType>(name: string, initiallyOpen: (items: T[]) => string[] = () => []): SortableFieldType<T> => {
  const [{ value }, , helpers] = useField<T[]>(name)
  const { touched, setTouched } = useFormikContext<Record<string, unknown>>()
  const items = Array.isArray(value) ? value : []
  const [openKeys, setOpenKeys] = useState<string[]>(() => initiallyOpen(items))
  const beforeDrag = useRef<string[] | null>(null)

  const touchedItems = (): unknown[] => {
    const current: unknown = getIn(touched, name)
    return Array.isArray(current) ? [...current] : []
  }

  const commit = (next: T[], nextTouched: unknown[]) => {
    void helpers.setValue(next, true)
    void setTouched(setIn(touched, name, nextTouched) as typeof touched, false)
  }

  const open = (key: string) => setOpenKeys(current => (current.includes(key) ? current : [...current, key]))

  const { reveal } = use(FormFocusContext)
  useEffect(() => {
    if (!reveal?.path.startsWith(`${name}.`)) return
    const key = items[Number(reveal.path.slice(name.length + 1).split('.')[0])]?._key
    if (key) open(key)
  // Only when a new reveal arrives.
  }, [reveal?.nonce])

  return {
    items,
    isOpen: key => openKeys.includes(key),
    allOpen: items.length > 0 && items.every(item => openKeys.includes(item._key)),
    toggle: key => setOpenKeys(current => (current.includes(key) ? current.filter(k => k !== key) : [...current, key])),
    openAll: () => setOpenKeys(items.map(item => item._key)),
    collapseAll: () => setOpenKeys([]),
    startDrag: () => {
      beforeDrag.current = openKeys
      setOpenKeys([])
    },
    endDrag: () => {
      if (beforeDrag.current) setOpenKeys(beforeDrag.current)
      beforeDrag.current = null
    },
    add: item => {
      commit([...items, item], touchedItems())
      open(item._key)
    },
    duplicate: index => {
      const copy = { ...structuredClone(items[index]), _key: newKey() }
      const nextTouched = touchedItems()
      nextTouched.splice(index + 1, 0, undefined)
      commit([...items.slice(0, index + 1), copy, ...items.slice(index + 1)], nextTouched)
      open(copy._key)
    },
    remove: index => {
      const nextTouched = touchedItems()
      nextTouched.splice(index, 1)
      commit(items.filter((_, i) => i !== index), nextTouched)
    },
    move: (from, to) => {
      const nextTouched = touchedItems()
      while (nextTouched.length <= Math.max(from, to)) nextTouched.push(undefined)
      commit(arrayMove(items, from, to), arrayMove(nextTouched, from, to))
    }
  }
}

export default useSortableField
