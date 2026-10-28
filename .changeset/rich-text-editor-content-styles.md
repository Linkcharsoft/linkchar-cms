---
'@linkcharsoft/cms': patch
---

The rich text editor showed headings, lists, quotes, links and images as plain text since 0.10.0: their styles were nested under the inline variant by mistake. The editor now takes the same focus ring as every other input and says `aria-invalid` on its text when the field has an error, the toolbar no longer declares itself sticky (it never stuck, clipped by the editor's rounded border, and would sit under the document's own sticky bar), and "Rehacer" shows a redo arrow instead of a refresh icon.

To update a project: nothing.
