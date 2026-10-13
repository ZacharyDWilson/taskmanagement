# Friends Site

React + Vite frontend hosted on GitHub Pages, with Supabase as the backend (login, database, file storage).

## One-time setup

### 1. Create the Supabase backend (free)
1. Sign up at https://supabase.com and create a new project.
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This creates the `posts` table, the `uploads` storage bucket, and the security rules.
3. Open **Project Settings > API** and copy the **Project URL** and the **anon public** key.

### 2. Run it locally
```bash
npm install
cp .env.example .env   # then paste your URL and anon key into .env
npm run dev
```

### 3. Put it on GitHub and publish
1. Create a new GitHub repository and push this folder to its `main` branch.
2. Repo **Settings > Secrets and variables > Actions**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Repo **Settings > Pages**: set Source to **GitHub Actions**.
4. Every push to `main` now builds and deploys the site automatically.

### 4. Allow your site's address in Supabase
In Supabase **Authentication > URL Configuration**, set the Site URL to your GitHub Pages address
(`https://<your-username>.github.io/<repo-name>/`) so confirmation emails link back correctly.

## Project layout
- `src/pages/` — one file per page (Home, Login, Posts, Files). Add new pages here and register them in `src/App.jsx`.
- `src/lib/supabase.js` — the Supabase client.
- `src/lib/auth.jsx` — `useAuth()` hook giving the current user.
- `supabase/schema.sql` — database tables and row-level security rules. Add new tables here.
- `.github/workflows/deploy.yml` — automatic deploy to GitHub Pages.

## Notes
- The anon key is meant to be public. Real protection comes from the row-level security rules in `schema.sql`, so every new table needs `enable row level security` plus policies.
- The `uploads` bucket is public-readable by URL (anyone with a link can open a file). Make it private if you need stricter access.

## Install as an app (PWA)
Once the site is live on GitHub Pages, friends can install it like an app:
- **Android (Chrome):** open the site, tap the **Install app** button in the top bar (or browser menu > Install app).
- **iPhone / iPad (Safari):** tap Share > **Add to Home Screen**.
- **Windows / Mac (Chrome or Edge):** click **Install app** in the top bar, or the install icon in the address bar.

Notes:
- Installing needs the site to be served over HTTPS (GitHub Pages is).
- The service worker (`public/sw.js`) only caches the app shell. Data always comes live from Supabase.
- To force everyone onto a new build after big changes, bump `CACHE` in `public/sw.js`.
- Icons live in `public/icons/` and the name/colors in `public/manifest.webmanifest`.

## Invite-only sign-ups
New accounts need an invite code, checked inside the database (`supabase/005_invite_code.sql`), so it can't be skipped by calling Supabase directly.
- Friends enter the code in the **Invite code** box at the bottom of the sign-up form.
- To change the code, run this in the Supabase SQL Editor:
  `update public.app_settings set value = 'new-code-here' where key = 'invite_code';`
- Changing the code does not affect people who already have accounts.
- Supabase's own rate limits and email confirmation still apply on top of this.

## Demo / filler data (test version)
Set `VITE_DEMO_DATA=true` in `.env` and restart `npm run dev` to show fake friends, posts, tasks, leaderboard entries, and Study Buddy queue entries. A "Demo data" badge appears in the top bar. It never writes to the database.
- For the final site, set it to `false` (or leave it out). The GitHub deploy only turns it on if you add a repository *variable* named `VITE_DEMO_DATA` set to `true`.
- To remove it permanently: delete `src/lib/demo.js`, then delete every line marked `// DEMO` (search for "DEMO").
