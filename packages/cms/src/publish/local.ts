const LOCAL_SUPABASE = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/

// A Supabase that runs on this machine (`supabase start`), where a simulated build is harmless.
export const isLocalSupabaseUrl = (url: string | undefined) => !!url && LOCAL_SUPABASE.test(url.replace(/\/$/, ''))
