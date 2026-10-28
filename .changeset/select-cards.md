---
'@linkcharsoft/cms': minor
---

`select({ display: 'cards', options: [{ value, label, preview }] })` shows one card per option instead of a dropdown, for choices that are easier to see than to read, like the layout of an image mosaic. `preview` is serializable, so the config still crosses to the browser: a PrimeIcons name (`{ icon: 'pi-th-large' }`), an image (`{ image: '/layouts/mosaic.svg' }`) or a mosaic sketch the panel draws (`{ grid: { columns, rows, cells: [{ column, row, columnSpan?, rowSpan? }] } }`, 1-based like CSS grid lines). The cards are an accessible radio group (arrows move between them, the chosen one has the brand border) and validate on each pick. `defineCmsConfig` rejects cards with an option that has no preview, previews without `display: 'cards'`, and a cell outside its grid; `multiSelect` has no cards. Core exports `SelectOptionType`, `SelectPreviewType`, `GridPreviewCellType` and `selectDisplayProblem`.

To update a project: nothing; every `select` keeps its dropdown until it sets `display: 'cards'`.
