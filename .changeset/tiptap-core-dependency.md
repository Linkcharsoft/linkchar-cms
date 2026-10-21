---
'@linkcharsoft/cms': patch
---

`@tiptap/core` is a declared dependency of the package, so the rich text editor always types against the tiptap version the package ships. A project with an older `@tiptap/core` of its own used to break the package's `RichTextEditor` in `tsc`.
