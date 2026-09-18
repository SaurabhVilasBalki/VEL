# Test Case Tracker

A shared, open-editing web app for tracking test cases: id, title, status,
author, and automation info. Anyone with the link can view and edit
everything — there's no login. This is the Vercel-deployable version of the
prototype you tried in chat, with a real Postgres database instead of
in-chat storage.

## What's inside

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Vercel Postgres** (Neon) for storage — one `test_cases` table
- API routes for listing, creating, editing (including renaming the ID),
  and deleting test cases
- `data/seed.json` — your 3,444 test cases from the original CSV, ready to
  import

## Deploy it

### 1. Push this project to GitHub

Create a new repo and push this folder's contents to it.

### 2. Import into Vercel

Go to [vercel.com/new](https://vercel.com/new), import the repo. Vercel
will detect Next.js automatically — no build settings to change.

### 3. Add a Postgres database

In your new Vercel project: **Storage → Create Database → Postgres**
(this provisions a Neon database and is free on Vercel's Hobby plan for
small projects). Connect it to your project. Vercel will automatically set
the `POSTGRES_URL` and related environment variables — you don't need to
copy anything by hand.

Redeploy once (Deployments → ⋯ → Redeploy) so the new environment
variables take effect.

### 4. Set a seed secret

In **Settings → Environment Variables**, add:

```
SEED_SECRET = <any random string you choose>
```

This protects the one-time data-import endpoint. Redeploy again after
adding it.

### 5. Import your test cases

Pick one:

**Option A — call the seed endpoint** (simplest, no local setup):

```
curl -X POST "https://your-app.vercel.app/api/seed?secret=YOUR_SEED_SECRET"
```

It's safe to call more than once — existing IDs are skipped, not
duplicated. It responds with a count of rows inserted vs. skipped.

**Option B — run the script locally:**

```bash
npm install
vercel link           # connects this folder to your Vercel project
vercel env pull .env.local
npm run seed
```

### 6. Open the app

Visit your Vercel URL. You should see all 3,444 test cases, fully
editable by anyone who opens the link.

## Local development

```bash
npm install
vercel env pull .env.local   # requires `vercel link` first, see above
npm run dev
```

Opens at `http://localhost:3000`.

## Notes on how it works

- **No authentication.** Anyone with the URL can view and edit every
  field, add new test cases, and delete existing ones — this matches
  what you asked for originally. If you later want to restrict access,
  the simplest option is Vercel's built-in [password
  protection](https://vercel.com/docs/deployment-protection) or [Vercel
  Authentication](https://vercel.com/docs/security/deployment-protection)
  on the project, which puts a single shared password in front of the
  whole app without any code changes here.
- **ID renames** go through the same validation as the in-chat version:
  you can't rename a test case to an ID that's already taken.
- **Search** supports both a plain ID (`3229`) and the `VEL-3229` format;
  the `VEL-` form requires an exact match, everything else does partial
  matching across ID, title, author, and automated-by.
- The database schema is created automatically on first request
  (`CREATE TABLE IF NOT EXISTS`) — there's no separate migration step.
