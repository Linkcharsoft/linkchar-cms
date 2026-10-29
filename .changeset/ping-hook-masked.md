---
'@linkcharsoft/cms': patch
---

`publish:ping` no longer prints the build hook URL whole: it carries the token that starts builds, so only the host and the `id` are shown. The message after the hook answers no longer mentions a missing job id, which Amplify's hook never returns.

To update a project: nothing.
