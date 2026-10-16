'use client'
import CmsProviders from '../providers/CmsProviders'
import { CmsPanelContext } from './context'
import type { CmsActionsType, FieldInputsType } from './context'
import type { CmsConfigType } from '../../core/config'
import type { ReactNode } from 'react'

export interface CmsClientOptionsType {
  config: CmsConfigType
  // The project's 'use server' re-exports (src/cms/actions.ts), so the browser calls them as server actions.
  actions: CmsActionsType
  inputs?: FieldInputsType
}

export interface CmsClientPropsType {
  supabaseUrl: string
  publishableKey: string
  children: ReactNode
}

// Called from the project's 'use client' file: the config holds functions, so it can't travel as a prop.
export const createCmsClient = ({ config, actions, inputs = {} }: CmsClientOptionsType) => {
  const CmsClient = ({ supabaseUrl, publishableKey, children }: CmsClientPropsType) => (
    <CmsPanelContext.Provider value={{ config, actions, inputs, supabase: { url: supabaseUrl, publishableKey } }}>
      <CmsProviders panelLocale={config.panelLocale}>{children}</CmsProviders>
    </CmsPanelContext.Provider>
  )
  return CmsClient
}
