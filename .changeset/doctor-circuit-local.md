---
'@linkcharsoft/cms': patch
---

`doctor` no longer warns about an unconfirmed publish circuit against a local Supabase: the simulated build is its target by design and `publish:ping` has nothing to verify there. The warning stays for hosted projects.

To update a project: nothing.
