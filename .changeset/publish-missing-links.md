---
'@linkcharsoft/cms': minor
---

Each missing item in Publish links to its field: "Title (English)" opens the editor in English with that field in view and focused, and an alt text opens the image field in its language. Pending changes' `missing` items carry that `href`, built with the new `paths.field(kind, entryId, id, { field, locale })` (`/dashboard/paginas/home?locale=en#hero.title`). The editor opens any field named in the URL hash, and the overview's "View" on an incomplete item goes to the first missing field. The `publishPanel.problems` text is now only the lead ("Not published until these are filled in: "), followed by the links.
