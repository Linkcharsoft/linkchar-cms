---
'@linkcharsoft/cms': patch
---

The panel's tabs show the brand icon as their favicon: the root layout of the panel declares `branding.icon`, or the icon `withCms` found in the project, as `<link rel="icon">`, and as `<link rel="apple-touch-icon">` when it is a PNG. Without an icon the tab keeps the browser's default and the panel its initials. `doctor` now reads "Panel icon and favicon: …".

To update a project: nothing, unless `app/(cms)/layout.tsx` was edited by hand and no longer exports the `metadata` of `rootLayout`.
