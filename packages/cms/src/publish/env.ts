import { amplify } from './amplify'
import { isLocalSupabaseUrl } from './local'
import { mockBuild } from './mock'
import type { MockBuildOptionsType } from './mock'
import type { PublishTargetType } from './types'

// process.env, or the subset a project reads: NEXT_PUBLIC_SUPABASE_URL, CMS_BUILD_HOOK_URL, CMS_BUILD_WEBHOOK_SECRET.
export type PublishTargetEnvType = Record<string, string | undefined>

export interface PublishTargetFromEnvOptionsType {
  mock?: MockBuildOptionsType
}

// Amplify with a hook, the mock only against a local Supabase, none otherwise: a hosted project never fakes a success.
export const publishTargetFromEnv = (env: PublishTargetEnvType = process.env, { mock }: PublishTargetFromEnvOptionsType = {}): PublishTargetType | null => {
  if (env.CMS_BUILD_HOOK_URL) return amplify({ hookUrl: env.CMS_BUILD_HOOK_URL, webhookSecret: env.CMS_BUILD_WEBHOOK_SECRET })
  return isLocalSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) ? mockBuild(mock) : null
}
