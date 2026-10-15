# @linkcharsoft/cms

## 0.1.0

### Minor Changes

- First release: the CMS core, extracted from Hologramas.
  
  - `defineCmsConfig` with the project's types registered through `Register`.
  - Field kinds on a registry (`defineField`): one place per kind for its default, validation, references, diff summary, localization and input. Projects add their own; `openingHours` is opt-in.
  - Validation without Yup: issue codes translated by the catalogs, plus per-field `validate` and `component`.
  - Catalogs (`es`, `en`) with `t()` and `Intl.PluralRules`; schema labels accept a text, `{ es, en }` or `msg()`.
  - Localized values: one value per locale for texts, inherited images with per-locale overrides, `resolveContent` for the site and `missingTranslations` for publishing.
