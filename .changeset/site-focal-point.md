---
'@linkcharsoft/cms': patch
---

`imageProps` turns the focal point into `object-position` in percent. Media stores it as a 0–1 ratio, so images on the site were placed at "0.3%" instead of "30%".
