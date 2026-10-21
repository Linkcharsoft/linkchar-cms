---
'@linkcharsoft/cms': minor
---

The header's "Publicar" counter shows the changes the next publish takes, like the publish screen; incomplete documents no longer count, and when every pending change is incomplete the button stays secondary and explains it ("2 cambios incompletos: no salen hasta completarlos"). The overview's pending count follows the same rule, and the header refreshes its count each time the editor saves. New query `getPendingCounts()` returning `{ ready, incomplete }`; `getPublishStatus()` returns `{ latest, counts }` instead of `{ latest, pendingCount }`; `DashboardLayout` takes `pendingCounts`.
