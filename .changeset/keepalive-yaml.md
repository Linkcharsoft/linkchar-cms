---
'@linkcharsoft/cms': patch
---

The generated keepalive workflow was not valid YAML: the `run:` line held `"apikey: ${{ … }}"` in a plain scalar, which YAML reads as a nested mapping, so GitHub registered the file under its file name, refused `workflow_dispatch` and never ran the cron. The `curl` now sits in a folded scalar (`run: >-`), the package's tests parse the generated text with a YAML parser, and `linkchar-cms routes --check` and `doctor` parse the project's file instead of trusting its name: a workflow that does not parse, has no schedule or dispatch, or no job with steps fails `--check` and reads `✗` in `doctor`. Every keepalive written by 0.16.0 or 0.17.0 never ran.

To update a project: `linkchar-cms routes` rewrites `.github/workflows/supabase-keepalive.yml` (it carries the marker); commit it and check the workflow appears by its name, "Supabase keepalive", under Actions.
