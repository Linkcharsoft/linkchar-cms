---
'@linkcharsoft/cms': patch
---

The overview warns about hidden collection drafts nobody touched for two weeks ("'Casa' lleva 20 días como borrador sin publicar. Publicalo o mandalo a la papelera."), five at most, oldest first. New query `getStaleDrafts(limit)` and alert code `stale`; `overviewAlerts` takes them as its fifth argument.
