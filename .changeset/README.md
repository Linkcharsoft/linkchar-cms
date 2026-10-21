# Changesets

Every change to `@linkcharsoft/cms` adds one file here, written by hand (`.changeset/<kebab-name>.md`), in the same commit as the change. Merging to `main` opens the version PR; merging that publishes to GitHub Packages and the entries become the [CHANGELOG](../packages/cms/CHANGELOG.md).

```md
---
'@linkcharsoft/cms': minor
---

What changed, from the user's side, in one paragraph: what the panel or the site now does, quoting the texts it shows ("Incompleto"), and the exports that appeared or changed (`displayStatus` in `@linkcharsoft/cms/core`).

To update a project: run `linkchar-cms migrations sync` and `supabase db push` (new migration `…`), and `linkchar-cms routes` (new action `…`).
```

- `minor` for anything a project can see or call: a feature, a new export, a changed signature, a migration. `patch` for fixes and internal moves. Majors wait for 1.0.
- One changeset per change, not per PR: a PR with three commits that each change behavior carries three files.
- The "To update a project:" paragraph goes in whenever a project has to run something after upgrading (`migrations sync` + `db push`, `routes`, a config key, an env var). Leave it out when nothing is needed; say "nothing, unless…" when only hand-built code is affected.
- Prose in English, like the code; the panel's texts are quoted as the panel shows them.
- A fix to a feature that is still unreleased adds a sentence to that feature's changeset instead of a new file.
