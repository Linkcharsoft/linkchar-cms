---
"@linkcharsoft/cms": minor
---

The panel wears Inferencia's brand in every project instead of each project's colors: a dark sidebar (`#0e0e13`) with the magenta star as its accent, a light workspace with violet-tinted neutrals, and the brand violet `#6e14be` for buttons, links and focus rings. Text is Hanken Grotesk and headings Bricolage Grotesque, both SIL Open Font License and bundled through Fontsource (`@fontsource-variable/*`), so the panel no longer depends on the project's fonts. The tokens moved from `:where(:root)` to `.CmsRoot`, which leaves a project's `:root { --cms-primary }` without effect, and Tailwind gets `cms-accent`. `rootLayout(cms, CmsClient)` loses its third argument, which only passed font classes to `<body>`. Every text and ground pair of the palette reaches 4.5:1, and a unit test keeps it there.

To update a project: delete `src/app/(cms)/theme.css` (or the stylesheet that set `--cms-*`) and its import in `src/app/(cms)/layout.tsx`, and call `rootLayout(cms, CmsClient)` without options; drop the `next/font` the panel layout loaded for it.
