---
'@linkcharsoft/cms': minor
---

`color()` is a built-in field kind: `color({ label: 'Color de marca', presets: ['#1f5fa8', '#0e0e13'] })` stores one `#rrggbb` in lower case (a stored `#1F5FA8` is repaired on read; `red` or `#abc` is "Usá un color como #1f5fa8", a new `validation.color` catalog key). The panel input is the browser's color picker next to the hex text, with `presets` as swatches the editor picks in one click, and the version history shows each color with its swatch. Imports take the same hex through `upsert()`. Core exports `color`, `ColorField`, `HEX_COLOR` and `isHexColor`. The README's example of a project kind is now `rating` (the playground's), since `color` no longer needs to be one.

To update a project: a project with its own `color` kind removes it (`defineCmsConfig` rejects a kind defined twice), drops it from `fields` and from `createCmsClient({ inputs })`, and imports `color` from `@linkcharsoft/cms/core`; stored values stay valid.
