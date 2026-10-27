---
'@linkcharsoft/cms': patch
---

`upsert()` of an import created a new collection document before saving its data, so data that failed validation left an empty draft without a slug: the next run couldn't find it and created another one. The data is now validated first (the same draft checks the save runs), and invalid data throws without creating anything or logging a `document.create`.

To update a project: nothing. An empty draft a failed import left behind goes when someone opens that collection in the panel a day later, or delete it from the list.
