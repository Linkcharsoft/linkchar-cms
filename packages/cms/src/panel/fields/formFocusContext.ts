'use client'
import { createContext, use, useEffect, useRef } from 'react'
import { dataFields } from '../../core/walk'
import type { FieldsRecord } from '../../core/fields'

export interface RevealType {
  path: string
  // A new request for the same field still counts.
  nonce: number
}

export interface FormFocusType {
  // Data paths with a missing required value or an invalid one.
  issues: string[]
  reveal: RevealType | null
}

// Lets tabs, panels and collapsed groups mark what's missing inside and open to show a field.
export const FormFocusContext = createContext<FormFocusType>({ issues: [], reveal: null })

const inside = (path: string, keys: string[]) => keys.some(key => path === key || path.startsWith(`${key}.`))

const keysOf = (fields: FieldsRecord, prefix: string) => dataFields(fields).map(([key]) => `${prefix}${key}`)

export const countIssues = (issues: string[], fields: FieldsRecord, prefix: string) => {
  const keys = keysOf(fields, prefix)
  return issues.filter(path => inside(path, keys)).length
}

export const holdsPath = (path: string, fields: FieldsRecord, prefix: string) => inside(path, keysOf(fields, prefix))

// Calls open() when asked to reveal a field inside, and when problems first appear inside.
export const useOpenOnFocus = (fields: FieldsRecord, prefix: string, open: () => void) => {
  const { issues, reveal } = use(FormFocusContext)
  const count = countIssues(issues, fields, prefix)
  const hadIssues = useRef(false)

  useEffect(() => {
    if (reveal && holdsPath(reveal.path, fields, prefix)) open()
  // Only when a new reveal arrives.
  }, [reveal?.nonce])

  useEffect(() => {
    if (count > 0 && !hadIssues.current) open()
    hadIssues.current = count > 0
  }, [count])

  return count
}

// Paths of Formik's nested errors ("hero.title", "items.0.text").
export const errorPaths = (errors: unknown, prefix = ''): string[] => {
  if (typeof errors === 'string') return [prefix.slice(0, -1)]
  if (typeof errors !== 'object' || errors === null) return []
  return Object.entries(errors).flatMap(([key, value]) => errorPaths(value, `${prefix}${key}.`))
}
