---
'@linkcharsoft/cms': minor
---

A built publish the site serves is confirmed however late the log is read. The panel used to ask the site for the stamp only during the 30 minutes after the build and then closed the publish as "Sin confirmar", so a publish made at the end of the day and read the next morning showed the warning and offered a retry while the site was already serving it; `doctor` and `publish:ping` confirmed it instead. The rule is now one pure function in the core, `settlePublishRows(rows, servedStamp, now)` (with `needsSiteStamp`): built publishes whose stamp the site serves are confirmed first, then the open ones nothing confirmed in 30 minutes are closed. The server applies it in `settlePublishes`, which replaces `confirmBuiltPublishes` and `closeStalePublishes`; the CLI loads it with jiti instead of keeping its own copy, and reuses `consoleUrlOf` for the Amplify link. The server also logs a publish log read PostgREST refuses instead of reading it as empty.

To update a project: nothing; publishes already closed as unconfirmed stay so. Code that imported `confirmBuiltPublishes` or `closeStalePublishes` calls `settlePublishes(ctx, rows)`.
