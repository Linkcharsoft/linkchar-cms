---
'@linkcharsoft/cms': minor
---

A publish carries the branch of the site that asked for it, so two Amplify branches on one Supabase never take each other's publishes and nothing needs configuring. `withCms` inlines `AWS_BRANCH` as `CMS_SITE_BRANCH` next to the build stamp; the server writes it to `publish_log.branch` when "Publicar" (or a retry) fires the hook; `build:report --start` claims only the open publishes of its own `AWS_BRANCH`. A publish without a branch (a local panel, `publish:ping` from a terminal) goes to the build of `CMS_BUILD_BRANCH`, `main` when unset, which is all the variable does now: builds of other branches report their own publishes instead of staying quiet. `CmsContextType` gains `siteBranch`.

To update a project: nothing; `CMS_BUILD_BRANCH` can stay or go unless the hook's branch is not `main` and the panel also runs outside Amplify.
