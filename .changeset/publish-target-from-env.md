---
'@linkcharsoft/cms': minor
---

The simulated build runs only against a local Supabase. `publishTargetFromEnv(env)` from `@linkcharsoft/cms/publish` picks the project's publish target the way the import CLI already did: Amplify when `CMS_BUILD_HOOK_URL` is set, `mockBuild()` when `NEXT_PUBLIC_SUPABASE_URL` is `127.0.0.1` or `localhost`, and none otherwise, so a hosted project without a hook records `target_missing` instead of a "Publicado" nobody built. The server adds the same guard for a project that wires the targets itself: a local-only target (the mock) against a hosted project counts as no target and the logger says why once, unless it was made with `mockBuild({ allowRemote: true })`. The starter `server.ts` and the README use the helper; `@linkcharsoft/cms/publish` also exports `amplify`, `mockBuild`, `isLocalSupabaseUrl` and the target types.

To update a project: in `src/cms/server.ts`, replace the `CMS_BUILD_HOOK_URL ? amplify(…) : mockBuild()` ternary with `publishTarget: publishTargetFromEnv(env)` (keep `mock: { result, seconds }` options if the project passed them).
