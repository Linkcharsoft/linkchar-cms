'use client'
import { createContext, useContext } from 'react'
import { textContext, translatorFor } from '../../core/config'
import { formatDate } from '../../core/dates'
import { panelPaths } from '../../core/paths'
import type { CmsConfigType } from '../../core/config'
import type { DateStyleType } from '../../core/dates'
import type { FieldInputLoaderType } from '../../core/kinds/registry'
import type { CmsServerType } from '../../server/next'

export type CmsActionsType = CmsServerType['actions']

// Inputs for the project's own field kinds, by kind.
export type FieldInputsType = Readonly<Record<string, FieldInputLoaderType>>

export interface CmsPanelType {
  config: CmsConfigType
  actions: CmsActionsType
  inputs: FieldInputsType
  supabase: { url: string, publishableKey: string }
}

export const CmsPanelContext = createContext<CmsPanelType | null>(null)

export const useCms = (): CmsPanelType => {
  const panel = useContext(CmsPanelContext)
  if (!panel) throw new Error('[@linkcharsoft/cms] Panel components must render inside the CmsClient of src/cms/client.ts.')
  return panel
}

export const useT = () => translatorFor(useCms().config)

export const useTextContext = () => textContext(useCms().config)

export const usePaths = () => panelPaths(useCms().config)

export const useFormatDate = () => {
  const { config } = useCms()
  return (value: string | Date, style: DateStyleType = 'dateTime') =>
    formatDate(value, style, { locale: config.panelLocale, timeZone: config.timeZone })
}
