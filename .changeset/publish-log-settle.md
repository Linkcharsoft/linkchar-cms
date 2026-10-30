---
'@linkcharsoft/cms': minor
---

Whoever reads the publish log settles it, not only the panel: `doctor` and `publish:ping` confirm a `built` publish when the site serves its stamp and close every `pending`, `building` or `built` publish nothing confirmed in 30 minutes (so a publish from before the circuit no longer stays "building" forever), writing `failed` with the new `error_code` `unconfirmed`, which the panel keeps reading as "Sin confirmar" ("No recibimos la confirmación del sitio en 30 minutos.") and offers to retry; the panel does the same when it reads the log. `doctor` names the publish that confirms the circuit and the log it read (`The site confirmed publish #11 (job 123) in the log at https://…`), and says where it asks for the build stamp. `publish:ping` refuses while the latest publish is `built` (deploying), credits a confirmation only to what the site it was given serves (`marked by the panel; the site serves it`), ends with `confirmed_elsewhere` when another site on the same Supabase confirmed the row (a preview branch, pointing at `CMS_BUILD_BRANCH`), and says after "Hook accepted" that preBuild takes 2–4 minutes before the build reports. `BuildErrorCodeType` gains `unconfirmed`; `publishDisplayStatus` reads `errorCode` from the record.

To update a project: nothing. Running `doctor --env-file .env.remote` once closes the old open publishes.
