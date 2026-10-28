---
"@linkcharsoft/cms": minor
---

The per-project theme is gone: `linkchar-cms contrast` and its `--on` flag are removed, `contrastRatio` and `MIN_TEXT_CONTRAST` are no longer exported from `@linkcharsoft/cms/core`, `init` no longer writes `src/app/(cms)/theme.css`, and the README's Theme section is now Brand.

To update a project: remove `linkchar-cms contrast` from scripts and CI.
