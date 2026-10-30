# Deploying a project with @linkcharsoft/cms

> The Supabase half was measured on a hosted trial project (2026-10-22). On Amplify, the build hook and the SSR runtime variables ran on linkchar-page (2026-10-29); the build report (`linkchar-cms build:report`, 0.15.0) replaced the EventBridge rule, whose API destination needs an IAM role a developer usually can't create.

A project runs on two services: **Supabase** (database, auth, storage) and **Amplify** (the Next.js site, which also serves the panel). Each client has its own Supabase account and project.

**The build needs the project's Supabase.** The site is static and publishing rebuilds it: the build bakes the published content in (the sitemap and every CMS page prerender) and `withCms` reads the redirects past publishes left. Every place that builds needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` of a reachable project: Amplify, CI, and a local `pre-push` hook that builds (start the local Supabase first, or export the hosted values in the shell, which win over `.env.local`).

## 1. Supabase project

1. Create the project (region close to the site's users) and keep its database password. The keys come from the dashboard or from the CLI; the secret one only with `--reveal`, which the CLI otherwise prints masked:

   ```bash
   supabase projects api-keys --project-ref <ref> --reveal
   ```

2. Apply the package migrations. From some networks the direct database host (`db.<ref>.supabase.co`) does not answer; the pooler does (user `postgres.<ref>`, the password percent-encoded):

   ```bash
   supabase db push --db-url "postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres"
   ```

3. **SMTP first.** Supabase's built-in email service only sends to the project's team and a few emails per hour, so invitations to a client never arrive; and while a free project uses it, Supabase refuses custom email templates, which makes the `config push` of step 4 fail. Set a custom SMTP (Resend) in Authentication → Emails → SMTP settings, with a sender on a verified domain.
4. Push the auth settings from `supabase/config.toml`. The file is the local development one; a `[remotes.hosted]` block with the project's id overrides what differs for the hosted project, the site URL above all:

   ```toml
   [auth]
   site_url = "http://localhost:3000"
   additional_redirect_urls = ["http://localhost:3000"]
   enable_signup = false
   minimum_password_length = 10
   password_requirements = "letters_digits"

   [auth.mfa.totp]
   enroll_enabled = true
   verify_enabled = true

   # supabase init turns vector buckets on; the CMS does not use them and a free project rejects the push.
   [storage.vector]
   enabled = false

   [remotes.hosted]
   project_id = "<ref>"

   [remotes.hosted.auth]
   site_url = "https://acme.com"
   additional_redirect_urls = ["https://acme.com"]
   ```

   ```bash
   supabase config push --project-ref <ref>
   ```

   `site_url` is what `{{ .SiteURL }}` becomes in the invitation and recovery emails: on the hosted project it must be the public origin of the site, never `localhost`. `enable_signup = false` is not optional: a new project lets anyone sign up with the publishable key, and every user gets a panel profile. Check it took: `GET https://<ref>.supabase.co/auth/v1/settings` (with the publishable key as `apikey`) answers `"disable_signup": true`, and Authentication → Sign In / Providers → "Allow new users to sign up" is off.

5. **First superadmin**, with the hosted keys in an env file kept out of git (`.env*` is ignored):

   ```bash
   pnpm exec linkchar-cms admin --email ana@acme.com --password '…' --env-file .env.remote
   ```

6. `pnpm exec linkchar-cms doctor --env-file .env.remote` checks the project from the outside: it answers, has the package tables and a superadmin, and the local `config.toml` has sign-ups off and two-step verification on.

## 2. Amplify app

1. Connect the repository and the production branch.
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `CMS_BUILD_HOOK_URL` (the branch's incoming webhook), `CMS_BUILD_BRANCH` only when the hook's branch is not `main` and a panel outside Amplify publishes against the project, and `GITHUB_PACKAGES_TOKEN` (a token with `read:packages` on Linkcharsoft) for the install.
3. Amplify gives the environment variables to the build but not to the SSR runtime: `amplify.yml` copies the ones the server reads at runtime into `.env.production` (`SUPABASE_SECRET_KEY`, `CMS_BUILD_HOOK_URL`; the `NEXT_PUBLIC_*` ones are inlined at build), writes the package token before installing, and reports the build to the panel:

   ```yaml
   frontend:
     phases:
       preBuild:
         commands:
           - echo "//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}" >> ~/.npmrc
           - pnpm install --frozen-lockfile
           - env | grep -E "^(SUPABASE_SECRET_KEY|CMS_BUILD_HOOK_URL)=" >> .env.production || true
           - rm -rf .next/cache/fetch-cache
           - pnpm exec linkchar-cms build:report --start
       build:
         commands:
           - pnpm run build && pnpm exec linkchar-cms build:report --ok || (pnpm exec linkchar-cms build:report --failed; exit 1)
   ```

   Amplify restores `.next/cache` before each build and Next keeps the site's reads there (`fetch-cache`, for a year). The package stamps every build, so a build never serves the content of the previous one, but the folder grows with every build: the `rm -rf` line drops it, and `doctor` warns while `amplify.yml` keeps `.next/cache` without that line. `build:report` is how the panel learns which build took a publish and when it ended; `doctor` fails while the two lines are missing.

4. The build hook, the report and the confirmation of the deploy: [Amplify setup](../packages/cms/README.md#amplify-setup). `pnpm exec linkchar-cms publish:ping --env-file .env.remote` proves the whole circuit once.

## 3. CI

Projects on `linkchar-frontend-workflows` pass the package token and the Supabase project's public values to `next-ci.yml` (v2.2.0 or later):

```yaml
  ci:
    uses: Linkcharsoft/linkchar-frontend-workflows/.github/workflows/next-ci.yml@v2.2.0
    secrets:
      PACKAGES_TOKEN: ${{ secrets.PACKAGES_TOKEN }}
    with:
      build-env: |
        NEXT_PUBLIC_SUPABASE_URL=${{ vars.SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${{ vars.SUPABASE_PUBLISHABLE_KEY }}
```

`PACKAGES_TOKEN` is a repository secret under both **Actions** and **Dependabot** (Dependabot runs read only their own secrets); `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are repository variables. Without the token both jobs fail at `pnpm install` (`ERR_PNPM_META_FETCH_FAIL` on `npm.pkg.github.com`); without the variables the build fails at `/sitemap.xml`.

## 4. Check it works

- Sign in at `https://acme.com/<basePath>` with the superadmin.
- Invite a user from Usuarios: the email arrives and its link opens the invitation screen on the site's domain.
- Edit a page and open the preview: the draft shows, and "Salir" leaves Draft Mode.
- Publish: the build starts, Publicar shows "Publicando · desplegando" when it ends and "Listo" once the site serves the new build, without reloading.

## Free plan

Supabase's Free plan includes 500 MB of database, 1 GB of storage, 5 GB of egress plus 5 GB of cached egress per month, and files up to 50 MB (the `media` bucket takes 10 MB for images and PDFs and 25 MB for videos). Images reach visitors through Next's image optimizer, which caches each size, so Media costs little egress. A video is served whole on every play: a 12 MB clip played a thousand times is 12 GB, more than the month. Keep Media videos short and small (the panel says what a thousand plays cost), and leave a site's own hero loop in `public/`, where Amplify's CDN serves it.

**A free project pauses after a week with too little database activity**; Supabase's own guide asks for a few requests to the database each day. While it is paused, the site's static pages keep serving from Amplify, but the panel can't sign in, publishing fails, every build fails (`withCms` reads the redirects and the pages read the content) while Amplify keeps the last good deploy, and images the optimizer hasn't cached yet stop loading. The weekly build is not enough: it is one request a week, and it fails once the project is paused. A production client goes on Pro, which never pauses. A free project gets the keepalive `linkchar-cms routes` writes: `.github/workflows/supabase-keepalive.yml`, a GitHub Actions cron every three days that reads `published_documents` with the repository variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (the ones the CI build uses) and fails, so GitHub notifies, when the answer is not 200. Commit it with the routes; `doctor` warns while it is missing.

A paused project comes back with Restore in the dashboard; then run the build again from Publicar.

