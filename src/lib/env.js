// Which build is this? Set by the Vite mode (see .env.basic / .env.admin and the dev:* scripts).
//   basic : what a normal friend sees. Real data only, normal unlock rules.
//   admin : the developer build. Demo data, everything unlocked, plus a dev tools panel.
// Unlocking in admin mode happens in the browser only. The database rules never change, and
// nothing fake is saved to the account.
export const APP_MODE = import.meta.env.VITE_APP_MODE || 'production'
export const IS_ADMIN = APP_MODE === 'admin'
export const IS_INTRO = APP_MODE === 'intro'   // the start page and tour preview (port 5175)
export const IS_DEV_BUILD = import.meta.env.DEV
// The shareable preview build (npm run build:wip): a fake in-memory backend and one fake login, no real data.
export const IS_FAKE = import.meta.env.VITE_FAKE_BACKEND === 'true'

export const APP_TITLE =
  IS_FAKE ? 'LOCK IN · PREVIEW'
  : APP_MODE === 'admin' ? 'LOCK IN · ADMIN'
  : APP_MODE === 'basic' ? 'LOCK IN · BASIC'
  : APP_MODE === 'intro' ? 'LOCK IN · INTRO'
  : 'LOCK IN'
