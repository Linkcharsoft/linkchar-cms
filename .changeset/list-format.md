---
'@linkcharsoft/cms': patch
---

Lists of names in Publish (changed sections, missing fields), Pages ("Muestra también") and the overview's incomplete alerts are joined with `Intl.ListFormat` in the panel language ("Título, Dirección y Texto") instead of a hardcoded ", ", and the sentence punctuation moved into the catalog keys (`publishPanel.sectionsChanged` and `publishPanel.problems` now take `{sections}` / `{fields}`). `formatList` and `listParts` are exported from the core translator and `InlineList` from the panel. In Activity, picking one day and closing the calendar filters that day; before, the same day had to be clicked twice.

To update a project: nothing, unless its `messages` override those two keys: they need the placeholder now.
