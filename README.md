# LOCK IN

> A calm, private place for a group of friends to plan their work, focus together, and keep each other going.

## About the app

LOCK IN is a small study-and-tasks site built for one group of friends (about twenty people), not for the public. It is invite-only, it runs for free, and it is meant to feel more like a shared room than a social network: no ads, no algorithm, nothing to scroll forever.

### What you can do here
| Page | What it is for |
|---|---|
| **Home (Overview)** | Your day at a glance: what is due today, your week so far, your Canvas / Brightspace assignments, and the leaderboard. A single **LOCK IN: Focus** button starts a session. |
| **To Do** | Plan tasks into days of the week. Drag a task onto a day (or tap a day on a phone to open it full screen). Finished tasks earn XP. |
| **Feed** | Share what you finished, a question, a win, or a photo of your notes. React, comment, tag friends with @, and look people up to visit their profiles. Posts disappear after 14 days to keep things light. |
| **Study** | A Pomodoro or count-up timer, plus Study Buddy: open yourself up to study and pair with a friend. |
| **Me (Profile)** | Your picture, banner, bio, level, badges, posts and a chart of your study time each day. Friends' profiles look the same. |
| **Shop and Achievements** | Spend coins on themes, frames and banners. Unlock badges for streaks, focus time and helping others. |

### How progress works
- **XP** comes from focus minutes, finished tasks, posts and reactions you receive; levels follow from XP.
- **Coins** come from XP and level-ups, and are spent in the Shop. Spending never lowers your level.
- **Nothing is graded and nothing is public.** The leaderboard is only your friend group.

### House rules (the short version)
Be kind, don't share anything private about someone else, and keep it useful. You accept the full community rules when you sign up and again when they change. Anyone can report a post or comment; the admin can mute or remove content.

### Your data
- Posts and photos are deleted automatically after 14 days; finished tasks after 14 days, unfinished ones after 21 days.
- Old study history is rolled up into totals so your XP and badges stay correct.
- You can download your own posts from your profile.

### Install it like an app
On a phone, open the site and use **Add to Home Screen** (iPhone) or **Install app** (Android). On a computer, use the install icon in the address bar.

---

# For the person running it (setup and developer notes)

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


## Test data
The filler ("demo") data has been removed: `src/lib/demo.js` is now a set of empty stubs, and the live build contains no test accounts, no fake backend and no preview login. The fake backend (`src/lib/fakeSupabase.js`) is only bundled for the local phone preview (`npm run dev:phone` / `--mode wip`).

## Invite codes
Sign-ups need a **temporary** invite code that stops working after 15 minutes (`supabase/034_temp_invite_codes.sql`). Make one with:
```sql
select * from public.make_invite_code();      -- 15 minutes
select * from public.make_invite_code(60);    -- 60 minutes
```
The permanent code is switched off by that migration.

## Backups (the free Supabase plan has none)
A GitHub Action (`.github/workflows/backup.yml`) exports your data every Sunday and keeps it 14 days as a workflow artifact. The file is **encrypted** with a passphrase, so it is private even if the repository is public.
- **Set up once** (repo Settings > Secrets and variables > Actions): add `SUPABASE_SERVICE_KEY` (Supabase > Project Settings > API > service_role) and `BACKUP_PASSPHRASE` (a long random phrase; keep it in a password manager).
- **Run one now:** Actions tab > "Weekly data backup" > Run workflow. Download the `lock-in-backup` artifact from the finished run.
- **Open one:** `gpg --decrypt lock-in-backup-DATE.tar.gz.gpg > backup.tar.gz`, then `tar -xzf backup.tar.gz`. You get one JSON file per table plus `manifest.json` (row counts and any problems).
- **Not included:** `canvas_feeds` (private calendar links) and the photos in Storage.

## XP, themes and Study Buddy alerts
- **XP:** 1 per focus minute, 10 per finished task (max 10 tasks/day), 25 per post (max 3/day), 2 per reaction received. Task XP is kept in a ledger (`xp_log`), so deleting a finished task does not lower your level; marking a task "not done" takes its XP back.
- **Themes:** picked on your profile and saved to your account (`profiles.theme`). They are original fan-inspired looks defined as CSS variables at the bottom of `src/styles.css`. To add one, add an entry to `THEMES` in `src/lib/theme.jsx`, a `:root[data-theme='...']` block in the stylesheet, and the new id to the `check` list in `supabase/008_task_xp_and_themes.sql`.
- **Study Buddy alerts:** a toast in the app plus a system notification (PC and phone) when a friend opens up to study or picks you. They arrive while the app is open or running in the background. Alerts while the app is fully closed need Web Push (a push server and VAPID keys), which is not set up yet.

## Coins and the Shop
- **Coins** come from XP: 1 coin per 5 XP, plus a level-up bonus of 25 x each new level reached. Spending never lowers XP or level. The balance is calculated by `coin_balance()` in `supabase/010_shop.sql`.
- **Shop** (`/shop`, reached from the Shop button on My Profile): everyone picks one free starter theme, the rest are bought with coins (300, or 450 for Hero's Meadow and Starlit Arcade). Prices live in the `shop_items` table, so they can be changed without a code change.
- **Enforced in the database:** buying and the starter pick go through `buy_item()` / `choose_starter_theme()`, and a trigger refuses to equip a theme you don't own, so the shop can't be skipped from the browser.
- **Navigation:** on a PC the six pages are an icon dock down the left side (dim until hovered, "My Profile" shows your photo); on a phone they become a bottom bar with a liquid blob that follows the button you press. Icons live in `src/components/Icon.jsx`.

## Look and feel (minimal glassmorphism + animated backgrounds)
Cards, bars, the dock and fields are frosted glass (translucent tint, blur, hairline edge) floating over an animated scene. A theme is a palette plus its own scene, defined at the bottom of `src/styles.css`:

| Theme | Palette | Scene |
|---|---|---|
| Classic | whites and sky blue | soft light orbs drifting, slow gloss sweep |
| Sprout Squad | Olive Garden Feast | pollen and leaves floating up |
| Capsule Quest | navy / red / orange / yellow | turning sunburst, bobbing two-tone capsules |
| Starlit Arcade | Soft Lavender | twinkling stars, drifting aurora |
| Cozy Island | Rose Petal | petals falling and swaying |
| Retro Console | red / mint / aqua / steel blue / navy | sliding stripes, floating tiles |
| Hero's Meadow | black / deep teal / parchment / tan / brown | fireflies and slow fog |

- The scene is `<Scene />` (`src/components/Scene.jsx`): two glow shapes and 14 particles, each styled per theme in CSS. It sits behind everything, ignores the pointer, and stops moving when the device asks for reduced motion.
- To add a theme: add an entry to `THEMES` in `src/lib/theme.jsx`, a `:root[data-theme='...']` block (palette + scene) in the stylesheet, a row in `shop_items`, and the id to the `check` list in `supabase/008_task_xp_and_themes.sql`.

## Two local dev builds
| Command | Address | What it is |
|---|---|---|
| `npm run dev:basic` (or `npm run dev`) | http://localhost:5173 | **Basic**: what a normal friend sees. Real data only, normal unlock rules, no demo data. |
| `npm run dev:admin` | http://localhost:5174 | **Admin dev**: demo data on, every theme/frame/banner unlocked, shop shows everything owned, plus a 🛠 Dev panel. |
| `npm run dev:both` | both of the above | Starts the two together in one terminal. |

- Each build is labelled in the top bar and the tab title, so they can't be confused.
- The two addresses are different origins, so you sign in once on each.
- Admin unlocks are view-only: they live in the browser, never write fake items to the account, and don't change the database rules.
- Mode settings are in `.env.basic` / `.env.admin` (no secrets); the Supabase URL and key come from `.env`, which every mode loads.
