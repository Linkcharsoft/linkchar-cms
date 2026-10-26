---
'@linkcharsoft/cms': minor
---

Inline rich text, for a short text with a bold word or a link that goes inside the site's own `<p>` or card: `richText({ inline: true, marks: ['bold', 'link'] })` keeps one paragraph (blocks become lines, media is dropped), its editor offers only those marks and no headings, lists, images or videos, Enter can't split it and Shift+Enter breaks the line, and pasted paragraphs become lines. `<RichText value={lead} inline />` renders the text and its marks without `<p>` or a wrapper (a `<span>` when it gets a `className`). `marks` alone narrows the marks of a block text too; `defineCmsConfig` rejects an inline field with `headings`. Core exports `inlineRichText`, `keepMarks` and `RichTextMarkNameType`.

To update a project: nothing; existing rich text fields keep every block and mark.
