---
'@linkcharsoft/cms': minor
---

`linkchar-cms init --name "Acme" [--base-path /dashboard] [--locales es,en] [--panel-locale es] [--site-url …]` starts a project: it writes the files a project owns where none exist (`cms.config.ts` with `site.defaults` and `Register.database`, `src/cms/{schema,server}.ts`, `src/types/supabase.ts`, the panel root layout with its theme, the `(site)` layout with `DraftRefresh`, home, 404 and catch-all, `sitemap.ts`, `proxy.ts`), then runs `templates`, `routes` and `migrations sync`, and lists what is left to wire by hand (`next.config`, Tailwind, env, an existing proxy or root layout). It never overwrites a file; the starter labels come from the new `starter.*` catalog keys. CI type-checks what it writes (`pnpm check:init`).
