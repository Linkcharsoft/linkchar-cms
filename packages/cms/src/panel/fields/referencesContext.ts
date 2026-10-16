'use client'
import { createContext } from 'react'
import type { MediaItemType } from '../../core/media'
import type { RelationRefType } from '../../core/relations'

export interface ResolvedReferencesType {
  relations: Record<string, RelationRefType>
  media: Record<string, MediaItemType>
}

// Labels and media rows referenced by the document, resolved on the server when the editor loads.
export const ReferencesContext = createContext<ResolvedReferencesType>({ relations: {}, media: {} })
