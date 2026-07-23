# Deploy Ví Thẻ → GitHub + Netlify

Same auto-deploy pipeline as Commit and café-music-checker: push to GitHub `main`,
Netlify rebuilds and publishes automatically. Build settings are already in
`netlify.toml`, so Netlify will auto-detect everything.

You only need to do this once. After that, every `git push` redeploys.

---

## Step 0 — one-time cleanup (10 seconds)
A half-made `.git` folder is in here from setup. Delete it first so git starts clean.

- **File Explorer:** turn on "Hidden items" (View menu), then delete the `.git`
  folder inside `CardApp`.
- **Or PowerShell** (in the `CardApp` folder):
  ```
  Remove-Item -Recurse -Force .git
  ```

---

## Step 1 — push to GitHub

**Easiest (let Claude Code do it):** open the `CardApp` folder in Claude Code on your
machine and say: *"create a new GitHub repo called `vicard` and push this to main."*
It has your GitHub login, so it'll just work.

**Or by command line** (in the `CardApp` folder):
```
git init
git add -A
git commit -m "Initial commit: Vi The v0.1"
git branch -M main
gh repo create vicard --public --source=. --push
```
(`gh` is the GitHub CLI — you already used it for your other repos.)

You should end up with `github.com/henrywilliamsvn/vicard`.

---

## Step 2 — connect Netlify (auto-deploy)

1. Go to https://app.netlify.com/teams/henrywilliamsvn → **Add new site → Import an existing project**.
2. Choose **GitHub** → pick the **vicard** repo.
3. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `dist`
   Leave them as-is → **Deploy**.
4. First build takes ~1 minute. You'll get a live URL like `vicard.netlify.app`
   (you can rename it in Site settings).

That's it — from now on, any push to `main` redeploys automatically.

---

## Step 3 — tell me when it's live
Once it's deployed, send me the Netlify URL (or just say "it's live") and I'll
**verify the deploy from here** using the Netlify connection — check the build
succeeded, the site is up, and flag any errors.

---

### If the build fails
The most likely cause is a TypeScript error. The code type-checks clean locally,
but if Netlify complains, copy me the error from the deploy log and I'll fix it.

## Server-side price reader (/api/price) — added 2026-06-30

The app now ships a Cloudflare **Worker** (`worker/index.ts`) alongside the static SPA.
It serves the built site via the `ASSETS` binding and adds one endpoint:

    GET /api/price?url=<product url>  →  { price, currency:"VND", title, source }

It fetches the product page on Cloudflare's edge (no browser CORS limit) and reads the
price from JSON-LD + OpenGraph/meta tags. Hosts are allow-listed (Shopee/Lazada/Tiki/
TGDĐ/CellphoneS/FPT/ShopDunk/… ) so it can't be abused as an open proxy. JS-walled pages
(esp. Shopee) ship no price in their HTML → returns `price:null` and the app asks the user
to type the amount. "Mua gì?" calls this automatically when a bare product link is pasted.

### Files to upload for this change
- `worker/index.ts`  (NEW)
- `wrangler.jsonc`    (now has `"main": "worker/index.ts"` + `assets.binding: "ASSETS"`)
- `src/BuyFlow.tsx`   (calls /api/price, debounced, with reading/failed states)
- `src/components/StoreDiscovery.tsx`  (from the earlier merge)

### Local testing
`vite dev` does NOT serve `/api/price`. To test the endpoint locally run the Worker:

    npm run build        # produces dist/
    npx wrangler dev     # serves SPA + /api/price at http://localhost:8787

### Deploy
GitHub upload → Cloudflare build runs `npm run build` then `wrangler deploy`, which bundles
the Worker and serves `dist/` through it. No env vars or secrets needed for this endpoint.
