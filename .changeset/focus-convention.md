---
'@linkcharsoft/cms': patch
---

One focus indicator across the panel: a 2 px ring in the brand violet on light grounds and a 2 px magenta outline on the dark sidebar and the dark ground of the sign-in screens. Page outline, section headers, collection tabs and the sidebar used their own outlines, list handles, media tiles, the block picker and the focal point picker showed the ring and the browser's outline together, and plain links (missing-content links, media usage, the overview, publish, list titles, the preview link, the guide's buttons) showed only what the browser drew. The ring and outline are defined once (`FOCUS_RING`, `FOCUS_VISIBLE_RING` and `FOCUS_OUTLINE_DARK` in the passthrough, `focus-ring` and `focus-outline-dark` mixins in Sass, a base rule for anything else) and a unit test keeps every stylesheet on them.

To update a project: nothing; a project input that still spells its own ring keeps working.
