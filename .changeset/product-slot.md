---
"@linkcharsoft/cms": minor
---

What each project shows is now its product slot: `branding.name` and a square `branding.icon` at the top of the sidebar and on the sign-in screens, under the "Inferencia CMS" signature. `branding.logo` is now `branding.icon` and the config throws when it finds `logo`. Without `icon`, `withCms` takes the project's favicon at build (`app/icon.svg`, `icon.png`, `apple-icon.png`, then `public/icon.svg`, `favicon.svg`, the largest `favicon*.png`, then `favicon.ico`) and passes it as `CMS_BRAND_ICON`; `findBrandIcon` is exported from `@linkcharsoft/cms/next`, and `linkchar-cms doctor` says which file it found. With no icon at all, the sidebar shows the initials of the name. The sign-in screens moved to the dark brand ground, with the white card unchanged.

To update a project: rename `branding.logo` to `branding.icon`, or remove it to use the favicon; set `icon` when the largest favicon is too small for 56px.
