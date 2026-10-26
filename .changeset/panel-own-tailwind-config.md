---
'@linkcharsoft/cms': minor
---

The panel stylesheet compiles with the package's own Tailwind config (`@config '../../../tailwind/panel.config.js'` in `styles.css`): the preset, the package sources and the project's panel code (`src/cms/**`, `src/app/(cms)/**`, or the same without `src/`). The project's `tailwind.config` no longer spreads `cmsContent()`, so its site CSS stops carrying the panel's utilities: on linkchar-page, the site's Tailwind output went from 30.6 KB to 10.2 KB minified (6.1 to 2.9 KB gzip). The panel CSS also stops carrying the site's utilities and plugins. `cmsContent()` stays exported.

To update a project: remove `...cmsContent()` from `content` in `tailwind.config` and keep `presets: [cmsPreset]` (the package's Sass applies its tokens). Project panel inputs and extension screens must live under `src/cms/` or `src/app/(cms)/`; classes used only elsewhere stop reaching the panel.
