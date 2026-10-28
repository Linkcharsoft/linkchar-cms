---
'@linkcharsoft/cms': patch
---

Dragging files over the uploader no longer flickers while the pointer crosses its children, and a file dropped anywhere else in the panel (or with the uploader closed) no longer opens in the tab and leaves the panel. The upload button counts only the files ready to go, the remove buttons are locked while an upload runs, and a file removed before its turn is skipped. The hint and the rejection message now say the real limits: images up to 50 MB (optimized in the browser) and PDFs up to 10 MB; `MAX_RAW_IMAGE_BYTES` is exported from `@linkcharsoft/cms/core`.

To update a project: nothing.
