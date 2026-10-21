---
'@linkcharsoft/cms': patch
---

The `focalX`/`focalY` doc of `SiteImageType` now says what they are: a 0–1 ratio (0.5 is the center), as stored and as `imageProps()` reads them. It said 0–100, so code that built `object-position` by hand from it showed the corner of the image.
