---
'@linkcharsoft/cms': patch
---

The focus ring (`--cms-primary-ring`) is now 65% of the brand violet instead of 55%: with the 0.11.0 palette the lighter mix reached 2.8:1 on white and 2.5:1 on the panel's grey, under the 3:1 WCAG asks of a non-text indicator; the new mix reaches 3.5:1 on white and 3.1:1 on the darkest ground an input sits on. The tokens test now resolves the `color-mix()` the way the browser does (`mixOklab` in core) and keeps the ring at 3:1 on the surface and both neutrals.

To update a project: nothing.
