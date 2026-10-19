---
'@linkcharsoft/cms': minor
---

Rich text images keep only their media id: the URL, size and alt text come from Media when the text is read, so fixing an alt text in Media fixes it in every article and in every language, and a new Supabase URL doesn't break them. Images without a media id are dropped when the text is saved again. Rich text links can point to a page or document of the site, like link fields ("Site page" or "Other address" in the link dialog). The images and linked documents of a text count as its references: Media's "Where it's used", the usage warnings and the alt texts missing in another language include them. New dependency: `@tiptap/extension-link`.
