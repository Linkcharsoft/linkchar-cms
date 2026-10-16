import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const secretKey = process.env.SUPABASE_SECRET_KEY ?? ''

// The suite writes freely: it refuses anything but the local Supabase.
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) throw new Error(`E2E only runs against a local Supabase, not "${url}"`)
if (!secretKey) throw new Error('SUPABASE_SECRET_KEY is missing: run `pnpm db:status` and copy it to .env.local')

export const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

export const PASSWORD = 'QaLocal12345'

export const QA = {
  super: { id: 'a0000000-0000-0000-0000-000000000001', email: 'qa-super@local.test', name: 'QA Super' },
  editor: { id: 'a0000000-0000-0000-0000-000000000002', email: 'qa-editor@local.test', name: 'QA Editor' }
} as const

export const TOUR_IDS = ['welcome', 'pages', 'page-editor', 'site', 'document', 'collection', 'media', 'publish', 'account']

// Back to the seed: password, name, role, tours seen and no two-step devices.
export const resetQaUsers = async () => {
  for (const user of Object.values(QA)) {
    await admin.auth.admin.updateUserById(user.id, { password: PASSWORD, ban_duration: 'none' })
    const { data } = await admin.auth.admin.mfa.listFactors({ userId: user.id })
    for (const factor of data?.factors ?? []) await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id })
    await admin.from('profiles').update({
      name: user.name,
      active: true,
      avatar: null,
      seen_tours: TOUR_IDS,
      role: user === QA.super ? 'superadmin' : 'editor',
      can_publish: false
    }).eq('id', user.id)
  }
}

// Documents and media the suites created are recognizable by this prefix.
export const E2E_PREFIX = 'E2E'
