---
'@linkcharsoft/cms': patch
---

`amplify().trigger` records no job from the hook's answer: Amplify's incoming webhook never returns one, and `build:report --start` records the job from inside the build. `publish:ping` no longer reads `CMS_BUILD_WEBHOOK_SECRET`, which it never used.

To update a project: nothing.
