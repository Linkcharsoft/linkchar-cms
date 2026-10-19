---
'@linkcharsoft/cms': minor
---

Slugs and URLs per locale. Documents keep `slugs` (`{ es: 'casa', en: 'house' }`) next to `slug`, which stays as the default locale's copy; published documents also keep `paths`, the live URL of each locale. `publish_site` takes `urls` per locale instead of `redirectPrefix`, refuses a slug taken in the same collection and locale or a URL taken by another document, and leaves a 301 for every locale whose URL changed, pages included. Saving checks the slug of every locale like the default one: an automatic slug that another document has gets a free variant, one typed by hand stays as it was and the field says so. Duplicating finds a free slug in every locale. Documents published before this keep their redirects: the default locale's old URL comes from `slug`.

To update a project: run `linkchar-cms migrations sync` and `supabase db push` (new migration `20261022000000_locale_slugs.sql` and pgTAP suite `locale_slugs.test.sql`).
