import cmsConfig from '@playground/cms.config'
import { render } from '@testing-library/react'
import { CmsPanelContext } from '../client/context'
import type { CmsActionsType, CmsPanelType } from '../client/context'
import type { ReactElement } from 'react'

// Actions a test needs are passed in; calling any other one fails loudly.
const unexpectedActions = new Proxy({}, {
  get: (_, name) => () => { throw new Error(`Unexpected action ${String(name)}`) }
}) as CmsActionsType

export const panelFor = (overrides: Partial<CmsPanelType> = {}): CmsPanelType => ({
  config: cmsConfig,
  actions: unexpectedActions,
  inputs: {},
  supabase: { url: 'http://127.0.0.1:54421', publishableKey: 'test' },
  ...overrides
})

export const renderPanel = (ui: ReactElement, overrides: Partial<CmsPanelType> = {}) =>
  render(<CmsPanelContext.Provider value={panelFor(overrides)}>{ui}</CmsPanelContext.Provider>)
