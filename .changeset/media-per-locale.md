---
'@linkcharsoft/cms': minor
---

Images, galleries and PDFs per language in the editor. In another language than the default one they show the original with "Same as in Spanish", and "Use another image for English" gives that language its own; "Back to the original" drops it again. A gallery of its own starts as a copy of the original and goes back to it once emptied. The site already read these values: `resolveContent` and `leafVariants` now also treat an empty override (`null` or `[]`) as reusing the original, so a language never shows an empty gallery by mistake. New `inheritsOriginal` in `@linkcharsoft/cms/core` and `useMediaVariant(name)` in `@linkcharsoft/cms/panel`.
