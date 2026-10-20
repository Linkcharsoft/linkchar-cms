---
'@linkcharsoft/cms': minor
---

`withCms(nextConfig)` from the new entry point `@linkcharsoft/cms/next`: adds the package to `transpilePackages`, allows images from the project's Supabase bucket (and from a local Supabase), and adds the 301s that publishing leaves to `redirects()`, read once per build with the public key. A build fails if the redirects can't be read; `withCms(config, { redirects: false })` skips them.
