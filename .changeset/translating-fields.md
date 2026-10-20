---
'@linkcharsoft/cms': minor
---

While editing another language than the default one, each translated field shows the default language's text above it ("Spanish: Architecture to live in"; rich text as plain text, long ones cut with "Show all") and each shared value says "Same in every language": emails, numbers, options, links, a button's style and link, opening hours' days. Lists and blocks warn that adding, removing or reordering items changes every language. Project inputs get the same with `useLocaleNote(name, field, part?)` from `@linkcharsoft/cms/panel` (`{ badge, note, describedBy }`, for the new `badge` and `note` props of `InputContainer`), plus `SharedBadge` and `useEditingTranslation`. `describedBy` takes extra ids.
