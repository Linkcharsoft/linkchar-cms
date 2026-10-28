---
'@linkcharsoft/cms': patch
---

The focal point picker sizes its box with the image's own ratio (up to 420px tall, centered), so a click on a vertical image is measured over the picture and not over the letterbox around it. Before, the saved point on a tall image was off by the empty margins.

To update a project: nothing.
