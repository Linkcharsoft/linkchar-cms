---
'@linkcharsoft/cms': patch
---

A tour looks its anchors up when each step shows, instead of once 700 ms after arriving: a button that re-mounts (the preview or publish button, when its tooltip appears) keeps its highlight instead of jumping to the corner, an anchor still loading gets up to 1.5 s, and one missing on this screen is skipped. A tour with nothing to show never starts nor counts as seen; from the Help menu it says "Esta guía no tiene nada para mostrar en esta pantalla todavía.". The stage hugs the element (4 px padding, 12 px radius), the close button reads "Cerrar la guía", the animations follow `prefers-reduced-motion`, the Help button exposes `aria-expanded`, and the highlight follows the element when it resizes.

To update a project: nothing.
