---
'@linkcharsoft/cms': minor
---

`createImportSession().media()` takes mp4 and webm files: they go up as they are, within 25 MB, with their duration and size read from the file, and an mp4 that is not faststart is refused with the ffmpeg flag that fixes it. `poster` takes the id of an image already imported, so the video arrives ready to publish.

To update a project: nothing.
