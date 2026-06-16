# Turning on cloud accounts (Supabase)

The app works **fully in guest mode right now** — no setup needed. Cloud
accounts (email + password, synced across devices) switch on once you do the
4 steps below. Until then, the "Sign in / Sign up" button shows "Guest mode".

This is the same Supabase stack as your Commit app.

---

## Step 1 — create a Supabase project
1. Go to https://supabase.com → New project (use a **separate** project from Commit,
   e.g. `vicard`). Pick a region close to Vietnam (Singapore).
2. Wait ~2 minutes for it to provision.

## Step 2 — create the data table
1. In the project: **SQL Editor → New query**.
2. Paste the contents of `supabase/0001_user_data.sql` (in this folder) and **Run**.
   This creates one `user_data` table with row-level security so each user can
   only read/write their own data.

## Step 3 — turn OFF email confirmation (for a smooth MVP)
1. **Authentication → Providers → Email**.
2. Turn **"Confirm email" OFF** so people can sign up and use it immediately.
   (You hit email/SMTP limits on Commit; leaving this off avoids that. You can
   turn it back on later once you set up an email sender.)

## Step 4 — give the app your keys
In Supabase: **Project Settings → API**. Copy two values:
- **Project URL** (looks like `https://abcd.supabase.co`)
- **anon public** key (the long one labeled `anon` / `public` — safe to expose)

Then put them where the app can read them. **Two options:**

**A) Netlify (recommended — needed for the live site):**
Netlify → your site → **Site configuration → Environment variables → Add**:
- `VITE_SUPABASE_URL` = your Project URL
- `VITE_SUPABASE_ANON_KEY` = your anon public key

Then trigger a redeploy (Deploys → Trigger deploy, or just push again).

**B) Local dev:** copy `.env.example` to `.env` and fill in the same two values,
then `npm run dev`.

> Tip: once you've created the project, paste me the Project URL + anon key and I
> can set the Netlify environment variables for you through the Netlify connection.

---

## How it behaves
- **Guest:** everything saves on the device (as today).
- **Sign up (first time):** your current guest wallet is uploaded to your account.
- **Log in on another device:** your saved wallet downloads and replaces the local one.
- Changes auto-save to your account a moment after you make them.

The `anon` key is meant to be public; security is enforced by the row-level
security policy in the migration, so each account only ever sees its own data.
