'use client'
import { createContext } from 'react'

export interface EntryContextType {
  // Entry being edited, for fields that depend on it (e.g. the SEO preview URL).
  entryId: string | null
  // Language being edited: translated fields bind to `name.<locale>`.
  locale: string
  // The document has been published at least once: its URL is live.
  published?: boolean
}

export const EntryContext = createContext<EntryContextType>({ entryId: null, locale: '' })
