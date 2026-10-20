'use client'
import { createContext, use } from 'react'
import type { MediaItemType } from '../../core/media'
import type { RelationRefType } from '../../core/relations'

export interface ResolvedReferencesType {
  relations: Record<string, RelationRefType>
  media: Record<string, MediaItemType>
}

// Labels and media rows referenced by the document, resolved on the server when the editor loads.
export const ReferencesContext = createContext<ResolvedReferencesType>({ relations: {}, media: {} })

export interface MediaRegistryType {
  media: Record<string, MediaItemType>
  remember: (...items: MediaItemType[]) => void
}

// Every media item the editor knows: loaded with the document, picked or edited since. Alt checks read it too.
export const MediaRegistryContext = createContext<MediaRegistryType>({ media: {}, remember: () => undefined })

export const useMediaRegistry = () => use(MediaRegistryContext)
