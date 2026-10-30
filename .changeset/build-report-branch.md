---
'@linkcharsoft/cms': minor
---

`build:report --ok` and `--failed` only close the publish this build's `--start` claimed (the row with its `AWS_JOB_ID`), never "the oldest open publish": a build of another branch, or one that started before the publish existed, could take a publish that was not its own and leave the panel confirming against the wrong stamp. `CMS_BUILD_BRANCH` names the branch that builds publishes (the one the hook points at); with it set in Amplify, builds of other branches report nothing and say so in the build log. `--start` records the checked-out commit when Amplify passes `AWS_COMMIT_ID` as `HEAD` (webhook builds).

To update a project with a preview branch on the same Supabase: set `CMS_BUILD_BRANCH` (`main`) in the Amplify app's environment variables. Nothing else.
