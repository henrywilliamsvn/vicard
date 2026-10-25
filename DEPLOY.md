# Deploying Mẹo săn sales (CardApp)

_Last verified: 4 August 2026, by deploying and then checking the live site._

---

## The whole thing in one line

The app is a **Cloudflare Worker** called `vicard`. You build the site into a
`dist` folder on your own machine, and `wrangler` uploads that folder to
Cloudflare. That's it.

```
npm run deploy
```

That single command runs the build and the upload together. If you'd rather see
the two steps separately (useful when something breaks), they are:

```
npm run build
npx wrangler deploy
```

Takes about 40 seconds. The site is live the moment `wrangler` finishes.

---

## ⚠️ Git is NOT how this deploys

This is the thing that has caused the most confusion, so it's first.

**Pushing to GitHub does nothing.** There is no auto-deploy. Nothing watches the
repo. You can commit, push, merge, and the live site will not change by a single
byte until you run the deploy command above.

The reverse is also true: **you can deploy code that was never committed.** The
deploy takes whatever is in your `dist` folder right now, which comes from
whatever is in `src` right now. Uncommitted, half-finished, doesn't matter — if
you built it, it ships.

Git is still worth using, as a safety net so you can undo a bad change. But treat
it as a separate activity from deploying. They are not connected.

_(Two older documents described a GitHub → Netlify pipeline and a
GitHub → Cloudflare CI pipeline. Both are dead. `netlify.toml` has been deleted.
If you find instructions mentioning either, they're stale.)_

---

## First time on a new machine

You only do this once.

```
npm install
npx wrangler login
```

`wrangler login` opens your browser and asks you to authorise Cloudflare. There's
no wrangler installed globally on your machine and there doesn't need to be —
`npx` fetches it on demand. That's why plain `wrangler deploy` gives you
`'wrangler' is not recognized`; the `npx` in front is required.

---

## What the two steps actually do

**`npm run build`** runs the TypeScript compiler (catches errors before they
reach real users), then Vite, which bundles everything in `src/` into a couple of
files in `dist/` and copies everything in `public/` alongside them. If TypeScript
finds a mistake, the build stops here and nothing ships. That's a feature.

**`npx wrangler deploy`** reads `wrangler.jsonc`, bundles `worker/index.ts`, and
uploads it together with the contents of `dist/`. It only uploads files that
changed, which is why you'll usually see something like "Uploaded 3 files
(33 already uploaded)".

You should see, at the end:

```
Deployed vicard triggers
  https://vicard.henrywilliams-vn.workers.dev
Current Version ID: <a new id each time>
```

`meosansales.com` points at that same Worker. The custom domain is attached in
the Cloudflare dashboard (Workers & Pages → vicard → Settings → Domains), **not**
in `wrangler.jsonc` — so if the domain ever stops resolving, that's where to look,
and it is not something a redeploy will fix.

---

## Check that it actually shipped

`wrangler` saying "Success" means the upload worked. It does not prove the change
you cared about is live — you might have deployed a stale `dist` because the build
failed and you didn't notice.

The honest check takes ten seconds. Open the live site, press **F12** →
**Console**, paste this, press Enter:

```js
const src = [...document.querySelectorAll('script[src]')]
  .map(s => s.getAttribute('src')).find(s => s?.startsWith('/assets/'));
fetch(src).then(r => r.text()).then(js => console.log({
  bundle: src,
  found: js.includes('PUT_SOMETHING_FROM_YOUR_CHANGE_HERE')
}));
```

Replace the placeholder with any distinctive string from what you changed — an
affiliate code, a new Vietnamese phrase, a function name. `found: true` means it's
genuinely live. `found: false` means it isn't, no matter what the terminal said.

Do a hard refresh (**Ctrl+Shift+R**) first if you're unsure — your browser caches
the old bundle.

---

## Media files (videos and images)

`public/media` holds the Meo videos and carousel images. It is currently **133 MB
across 21 files**, and it grows every week.

**Keep it out of git.** Git stores every version of every binary forever, so a few
months of weekly videos would leave you with a repo several gigabytes large that
can never be shrunk. GitHub also rejects individual files over 100 MB.

Add this to `.gitignore` if it isn't there yet:

```
public/media
```

This does not affect deployment at all. The build copies `public/` into `dist/`,
and wrangler uploads `dist/` — git is never involved. Your videos reach the site
exactly the same way whether or not they're tracked.

Keep the master copies in the `MeoVideos/out` folder and in OneDrive. That's your
backup, not git.

---

## Secrets

The Worker has one optional pair of secrets for the Shopee price lookup:

```
npx wrangler secret put SHOPEE_AFFILIATE_APP_ID
npx wrangler secret put SHOPEE_AFFILIATE_SECRET
```

Set them once and they persist across deploys. Without them the price reader
still works on a best-effort basis and simply returns `null` for Shopee, at which
point the app asks the user to type the amount instead. Nothing breaks.

**Never put a secret in `wrangler.jsonc` or any file in the repo.** These commands
send it straight to Cloudflare; it never touches your source code.

---

## If something goes wrong

**`'wrangler' is not recognized`** — you left off `npx`. Use `npx wrangler deploy`.

**The build fails with a TypeScript error** — nothing shipped, the live site is
untouched. Read the error, fix the file, build again. This is the compiler doing
its job.

**Deploy succeeds but the site looks unchanged** — run the check above. Nine times
out of ten either the build didn't re-run, or your browser is showing you a cached
bundle. Ctrl+Shift+R.

**You shipped something broken** — Cloudflare keeps every previous version. Go to
Workers & Pages → vicard → Deployments, find the last good Version ID, and roll
back from there. Faster than fixing forward under pressure.

**A page 404s on refresh** — `wrangler.jsonc` sets
`not_found_handling: "single-page-application"`, which is what makes
`/wallet`, `/rewards` and `/deals` work on a direct visit. If that ever gets
removed, those URLs break.

---

## Local testing

`npm run dev` gives you the fast dev server, but it does **not** serve
`/api/price` — that lives in the Worker. To test the price reader locally:

```
npm run build
npx wrangler dev
```

Then open `http://localhost:8787`.

---

## Quick reference

| What | Command |
|---|---|
| Work on it locally | `npm run dev` |
| Test the price API locally | `npm run build` then `npx wrangler dev` |
| **Ship it** | `npm run deploy` |
| Log in to Cloudflare (once) | `npx wrangler login` |
| Add a secret | `npx wrangler secret put NAME` |
| Roll back | Cloudflare dashboard → vicard → Deployments |
