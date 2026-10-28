---
'@linkcharsoft/cms': patch
---

A collection document that is not shown on the site reads "Oculto" ("Hidden") in the editor, the lists and the overview instead of "Borrador": the panel already calls every unpublished edit a draft, so the same word for the visibility switch made editors think a hidden item would come out with the next publish.

To update a project: nothing, unless its `messages` override `documentStatus.hidden`.
