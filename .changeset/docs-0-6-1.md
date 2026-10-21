---
'@linkcharsoft/cms': patch
---

Documentation release. The README is rewritten by sections for a project adopting 0.6: install with pnpm 12 (pinned version, `minimumReleaseAgeExclude`, the peers and the Tailwind 3 tooling), a schema and config that compile, a Supabase section (migrations, `config.toml` keys, the invitation and recovery email templates the panel needs, the first superadmin, adopting an existing database), `logger` and `build_cancelled` in the server, the site's app structure and `SiteDocumentType`, the playground's color kind verbatim, Amplify setup (EventBridge rule and API destination) and the upgrade steps. `docs/decisions.md` lists the decisions behind the package's shape and `.changeset/README.md` the changeset convention. No code changes.
