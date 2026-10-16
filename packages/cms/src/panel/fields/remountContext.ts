'use client'
import { createContext } from 'react'

// Top-level key → version, bumped when a field's value arrives from someone else's save (rich text isn't controlled).
export const RemountContext = createContext<Record<string, number>>({})
