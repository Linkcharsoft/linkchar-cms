---
"@linkcharsoft/cms": minor
---

`linkchar-cms templates` writes the invitation and recovery emails with Inferencia's brand: a dark header with the star, the name and the product (`branding.name`), and a violet button, in tables with inline styles that email clients keep. A template still as 0.10 wrote it is rewritten (`updated`); one the project edited is kept, as before. `templates --check` and `doctor` fail while one is unbranded.

To update a project: `linkchar-cms templates`, then `supabase stop && supabase start` locally and `supabase config push` (or paste them in Authentication → Emails) for the hosted project.
