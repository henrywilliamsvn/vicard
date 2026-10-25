# Deploying Mẹo săn sales (CardApp)

_Rewritten 25 October 2026, when the app moved to push-to-deploy. Previous version: git history._

---

## The whole thing in one line

**Push to the `production` branch on GitHub → Cloudflare builds and publishes it.** Nobody runs a
deploy command any more.

- Repo: `henrywilliamsvn/vicard`
- Cloudflare Worker: `vicard` (Workers Builds connected; production branch = **`production`**)
- Build command: `npm run build` · Deploy command: `npx wrangler deploy`
- Any **other** branch gets a preview version with its own URL (`<version>-vicard.henrywilliams-vn.workers.dev`)
  and does **not** touch the live site.

⚠️ **Never build from `main`.** It holds a July 2026 web upload and is stale. Production is `production`.

---

## How a change goes live

1. Claude edits on a branch (e.g. `preview/<topic>`) and pushes it.
2. Cloudflare builds it and posts a **preview URL** in the build log (Worker → Deployments → build).
3. Henry opens the preview and checks it.
4. Henry says "ship it" → the branch is merged into `production` → Cloudflare publishes it (~1 min).
5. Check the live site **and that one `/media/` video actually plays** (not just loads).

Undo: Worker → Deployments → pick the previous version → "Deploy". Or revert the commit on `production`.

---

## Videos and covers live in R2, not in git

- Bucket: **`meo-media`** (R2), bound to the Worker as `MEDIA`.
- URLs unchanged: `https://meosansales.com/media/<file>` is served from the bucket by `worker/index.ts`,
  with byte-range support (phones, Metricool).
- ✅ A missing file now returns a **real 404**. (Before 25 Oct, the SPA fallback served the home page for a
  missing video, so a broken link looked like a working page.)
- `public/media` is git-ignored (1 GB). It can stay on Henry's PC as the render output folder, but the
  live site no longer reads it.

**Weekly videos:** drag the new `.mp4` and `-cover.png` files from `MeoVideos\out` into the `meo-media`
bucket (Cloudflare → R2 → meo-media → Upload). No deploy needed. Then check one URL plays.

Cost: R2 free tier = 10 GB storage + free bandwidth; beyond that $0.015/GB-month.

---

## Accounts / cloud sync (Supabase)

Live since 25 Oct 2026. Build variables in Cloudflare (Worker → Settings → Builds → Variables):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the anon key is public by design; security is the
row-level policies in `supabase/0001_user_data.sql`). Without them the app runs guest-only.
Supabase settings as of launch: email sign-up on, "Confirm email" off, Site URL `https://meosansales.com`,
default email sender (a few emails/hour — add custom SMTP before sign-ups grow).

---

## Local development (optional)

```
npm install
npm run dev
```

Typecheck only: `node node_modules/typescript/bin/tsc -b`. A local `npx wrangler deploy` still works in an
emergency, but it bypasses GitHub — avoid it so the repo stays the single source of truth.
