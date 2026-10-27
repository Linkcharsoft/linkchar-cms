---
'@linkcharsoft/cms': patch
---

`linkchar-cms admin --password` on a user that already existed set the password but left an unconfirmed email unconfirmed, so a user first invited with `admin --email` alone still got "Email not confirmed" at sign-in. It now confirms the email along with the password.
