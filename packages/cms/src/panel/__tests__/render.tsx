import cmsConfig from '@playground/cms.config'
import { render } from '@testing-library/react'
import { Formik } from 'formik'
import { CmsPanelContext } from '../client/context'
import { EntryContext } from '../fields/entryContext'
import { MediaRegistryContext } from '../fields/referencesContext'
import type { MediaItemType } from '../../core/media'
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

interface FieldContextType {
  values: Record<string, unknown>
  locale?: string
  media?: Record<string, MediaItemType>
}

// An input as the editor renders it: inside Formik, in one language, with the files it knows.
export const renderField = (ui: ReactElement, { values, locale = 'es', media = {} }: FieldContextType, overrides: Partial<CmsPanelType> = {}) =>
  renderPanel(
    <Formik initialValues={values} onSubmit={() => undefined}>
      <EntryContext value={{ entryId: null, locale }}>
        <MediaRegistryContext value={{ media, remember: () => undefined }}>{ui}</MediaRegistryContext>
      </EntryContext>
    </Formik>,
    overrides
  )
