const LOCAL_SUPABASE = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/

/** A Supabase that runs on this machine (supabase start): the simulated build is its target. @param {string | undefined} url */
export const isLocalSupabaseUrl = url => !!url && LOCAL_SUPABASE.test(url.replace(/\/$/, ''))
