---
'@linkcharsoft/cms': patch
---

Dialog widths no longer depend on the order of the CSS: the panel's dialogs (Media, the picker, the block picker, links, confirmations) set `--cms-dialog-width` and the Dialog passthrough reads it, where before each dialog's class competed with the passthrough's `w-[min(640px,…)]` at equal specificity and a build could leave the media dialogs at 640 px.

To update a project: nothing.
