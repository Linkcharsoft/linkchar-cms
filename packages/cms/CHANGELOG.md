# @linkcharsoft/cms

## 0.2.0

### Minor Changes

- Database and publishing.
  
  - `@linkcharsoft/cms/server`: the Supabase queries and actions for documents, versions, trash, media, publishing, users, account and sign-in. Each takes the config and clients through a context; `createCmsServer` binds them to Next (cookies, redirects, revalidation) from the project's own environment. Errors are catalog keys (`errors.*`), never prose.
  - `PublishTarget` with `@linkcharsoft/cms/publish/amplify` (build hook + EventBridge webhook, matching an unknown job only to an open publish of the last 30 minutes, failures stored as `error_code`) and `@linkcharsoft/cms/publish/mock` for local development.
  - `publishTarget` moved from `defineCmsConfig` to `createCmsServer`: the config is imported by the browser and must not carry secrets.
  - Base migration `20261020000000_cms_base.sql` (alt text and caption per locale in `media`) and the generic pgTAP suites, copied into a project with `linkchar-cms migrations sync`.
  - Form validators for sign-in, account and users that return catalog messages, shared by the panel and the server.

## 0.1.0

### Minor Changes

- First release: the CMS core, extracted from Hologramas.
  
  - `defineCmsConfig` with the project's types registered through `Register`.
  - Field kinds on a registry (`defineField`): one place per kind for its default, validation, references, diff summary, localization and input. Projects add their own; `openingHours` is opt-in.
  - Validation without Yup: issue codes translated by the catalogs, plus per-field `validate` and `component`.
  - Catalogs (`es`, `en`) with `t()` and `Intl.PluralRules`; schema labels accept a text, `{ es, en }` or `msg()`.
  - Localized values: one value per locale for texts, inherited images with per-locale overrides, `resolveContent` for the site and `missingTranslations` for publishing.
