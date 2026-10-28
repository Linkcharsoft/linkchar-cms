'use client'
import { createCmsClient } from '@linkcharsoft/cms/panel/client'
import cmsConfig from '../../cms.config'
import * as actions from './actions'

export const CmsClient = createCmsClient({
  config: cmsConfig,
  actions,
  inputs: { rating: () => import('./fields/RatingInput') }
})
