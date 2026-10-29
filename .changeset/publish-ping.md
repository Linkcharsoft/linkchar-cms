---
'@linkcharsoft/cms': minor
---

`linkchar-cms publish:ping [--timeout 20] [--env-file .env.local]` verifies the publish circuit end to end without the AWS console: it logs an empty publish with the secret key, fires `CMS_BUILD_HOOK_URL` as "Publicar" does, and waits for the site's webhook to report the build back, printing each status change and exiting with 0 only when the site confirmed it. A hook that answers but never reports points at the EventBridge rule, the API destination or `CMS_BUILD_WEBHOOK_SECRET`; a refused hook points at the hook URL. It refuses while a publish is still building, costs one Amplify build and takes the 30-minute publish lock like any publish.

To update a project: run it once against the hosted project (`--env-file .env.remote`) after the Amplify setup; nothing else.
