---
'@linkcharsoft/cms': patch
---

The uploader stays open when some files failed or still wait for a duplicate decision, instead of closing as soon as one upload succeeded; a toast says how many went up and how many still need attention ("Se subió 1 archivo; quedan 2 con problemas."). `MediaUploader`'s `onUploaded` now receives the number of files left in the queue as a second argument.

To update a project: nothing.
