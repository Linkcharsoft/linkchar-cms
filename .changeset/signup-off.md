---
'@linkcharsoft/cms': patch
---

The README and `linkchar-cms doctor` now require Supabase sign-ups off (`enable_signup = false` under `[auth]`) and two-step verification on (`[auth.mfa.totp]` enroll and verify). Supabase lets anyone sign up by default with the publishable key, and every new user gets an active `editor` profile: with sign-ups on, a stranger could create a user and edit drafts.

To update a project: set `enable_signup = false` and the `[auth.mfa.totp]` flags in `supabase/config.toml` and restart Supabase; on the hosted project, turn off Authentication → Sign In / Providers → "Allow new users to sign up" (or `supabase config push`). `linkchar-cms doctor` checks the local file.
