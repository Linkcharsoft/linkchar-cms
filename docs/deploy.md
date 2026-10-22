# Deploying a project with @linkcharsoft/cms

> Draft: written before the first real deploy of a project on the package. The trial deploy of stage 6 fills in what is missing and replaces this note.

A project runs on two services: **Supabase** (database, auth, storage) and **Amplify** (the Next.js site, which also serves the panel). Each client has its own Supabase account and project.

## 1. Supabase project

1. Create the project (region close to the site's users) and keep its database password.
2. Link it and apply the package migrations:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

3. Push the auth settings from `supabase/config.toml` (site URL, redirect URLs, password rules, email templates):

   ```toml
   [auth]
   site_url = "https://acme.com"
   additional_redirect_urls = ["https://acme.com"]
   minimum_password_length = 10
   password_requirements = "letters_digits"
   ```

   ```bash
   supabase config push
   ```

   `site_url` is what `{{ .SiteURL }}` becomes in the invitation and recovery emails: it must be the public origin of the site, never `localhost`.

4. **SMTP.** Supabase's built-in email service only sends to the project's team and a few emails per hour: invitations to a client never arrive. Set a custom SMTP (Resend) in Authentication → Emails → SMTP settings, with a sender on a verified domain.
5. **First superadmin**, with the hosted keys in the environment:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=<secret> pnpm exec linkchar-cms admin --email ana@acme.com --password '…'
   ```

6. `linkchar-cms doctor --env-file .env.production` (or the same variables in the shell) checks the project from the outside.

From some networks the direct database host (`db.<ref>.supabase.co`) does not answer; the pooler does (`aws-1-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`), with `--db-url` and the password percent-encoded.

## 2. Amplify app

1. Connect the repository and the production branch.
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `CMS_BUILD_HOOK_URL`, `CMS_BUILD_WEBHOOK_SECRET`, and `GITHUB_PACKAGES_TOKEN` (a token with `read:packages` on Linkcharsoft) for the install.
3. `amplify.yml` writes the token before installing:

   ```yaml
   preBuild:
     commands:
       - echo "//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}" >> ~/.npmrc
       - pnpm install --frozen-lockfile
   ```

4. The build hook and the EventBridge rule that reports each build to the panel: [Amplify setup](../packages/cms/README.md#amplify-setup).

## 3. Check it works

- Sign in at `https://acme.com/<basePath>` with the superadmin.
- Invite a user from Usuarios: the email arrives and its link opens the invitation screen on the site's domain.
- Edit a page and open the preview: the draft shows, and "Salir" leaves Draft Mode.
- Publish: the build starts, and its end (success or failure) shows in Publicar without reloading.
