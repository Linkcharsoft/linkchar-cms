---
'@linkcharsoft/cms': patch
---

`linkchar-cms doctor` reads every package table with the secret key and tells a missing table ("apply the migrations") apart from one the secret key may not read (the `service_role` grants of 0.10.2). Before, a permission error showed as "The profiles table is missing". `init` now lists `[api] auto_expose_new_tables = false` among the `config.toml` settings, so the local database behaves like a hosted project created today.

To update a project: nothing; optionally set `auto_expose_new_tables = false` under `[api]` and give the project's own tables explicit grants.
