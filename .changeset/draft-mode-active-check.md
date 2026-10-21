---
'@linkcharsoft/cms': patch
---

The site reads drafts in Draft Mode only for a signed-in, active panel user past the second factor, the same check `/api/cms/draft` makes before enabling the preview. Before, a deactivated user (or one with a revoked session or a pending second factor) whose Draft Mode cookie was still alive kept reading drafts; now they get the published site.
