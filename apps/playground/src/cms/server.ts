import 'server-only'
import { amplify } from '@linkcharsoft/cms/publish/amplify'
import { mockBuild } from '@linkcharsoft/cms/publish/mock'
import { createCmsServer } from '@linkcharsoft/cms/server'
import cmsConfig from '../../cms.config'

const env = process.env

// Without a build hook (local development) publishing runs against the mock build.
const publishTarget = env.CMS_BUILD_HOOK_URL
  ? amplify({ hookUrl: env.CMS_BUILD_HOOK_URL, webhookSecret: env.CMS_BUILD_WEBHOOK_SECRET })
  : mockBuild({ result: env.CMS_MOCK_BUILD_RESULT === 'failed' || env.CMS_MOCK_BUILD_RESULT === 'cancelled' ? env.CMS_MOCK_BUILD_RESULT : 'success', seconds: Number(env.CMS_MOCK_BUILD_SECONDS) || 15 })

export const cms = createCmsServer({
  config: cmsConfig,
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: env.SUPABASE_SECRET_KEY
  },
  publishTarget
})
