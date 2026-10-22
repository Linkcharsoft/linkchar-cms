---
'@linkcharsoft/cms': minor
---

`linkchar-cms admin --email ana@acme.com [--password …] [--name "Ana"] [--env-file .env.local]` makes the first superadmin with `SUPABASE_SECRET_KEY`: with a password it creates a confirmed user, without one it sends the invitation email, and a user that already exists is only promoted (its password updated when one is given). The profile gets `superadmin`, `can_publish` and `active`. It replaces the SQL that promoted the first user by hand.
