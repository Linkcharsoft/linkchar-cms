---
'@linkcharsoft/cms': patch
---

`next build` failed on sites with their own Tailwind theme since 0.10.0: Tailwind 3 keeps the `@config` of the panel stylesheet for every later stylesheet of the same PostCSS plugin, and Next runs the whole build through one, so site Sass modules compiled with the panel config (`The inf-xs:grid-cols-[…] class does not exist` for the project's own screens and colors under `@apply`), and site stylesheets compiled after the panel's could lose their utilities without an error. Which file failed changed from one build to the next. `@linkcharsoft/cms/tailwind/postcss` is the same Tailwind run per stylesheet, so the panel config stays in the panel stylesheet. `linkchar-cms doctor` fails while the project's PostCSS config runs `tailwindcss` directly, and `init` lists the change among the steps left by hand.

To update a project: in `postcss.config.js`, replace `tailwindcss: {}` with `'@linkcharsoft/cms/tailwind/postcss': {}`. A project that patched `tailwindcss` with `pnpm patch` to get around it removes the patch (`pnpm patch-remove tailwindcss@3.4.19`).
