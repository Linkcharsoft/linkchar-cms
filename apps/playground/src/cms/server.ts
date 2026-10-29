import 'server-only'
import { publishTargetFromEnv } from '@linkcharsoft/cms/publish'
import { createCmsServer } from '@linkcharsoft/cms/server'
import cmsConfig from '../../cms.config'

const env = process.env

export const cms = createCmsServer({
  config: cmsConfig,
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: env.SUPABASE_SECRET_KEY
  },
  // Amplify with CMS_BUILD_HOOK_URL, the simulated build against the local Supabase (its outcome from the environment), no build otherwise.
  publishTarget: publishTargetFromEnv(env, {
    mock: {
      result: env.CMS_MOCK_BUILD_RESULT === 'failed' || env.CMS_MOCK_BUILD_RESULT === 'cancelled' ? env.CMS_MOCK_BUILD_RESULT : 'success',
      seconds: Number(env.CMS_MOCK_BUILD_SECONDS) || 15
    }
  })
})
