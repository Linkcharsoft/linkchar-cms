---
'@linkcharsoft/cms': minor
---

`POST /api/cms/build-status` exists only while `CMS_BUILD_WEBHOOK_SECRET` is set: `amplify()` defines `readWebhook` only with a secret, so a project that reports builds from `amplify.yml` answers 404 there instead of 401, and nothing waits for EventBridge.

To update a project: nothing, unless it relies on the 401 (keep `CMS_BUILD_WEBHOOK_SECRET` to keep the webhook).
