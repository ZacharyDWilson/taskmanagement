// Which build is this? Set by the Vite mode (see .env.basic / .env.admin and the dev:* scripts).
//   basic : what a normal friend sees. Real data only, normal unlock rules.
//   admin : the developer build. Demo data, everything unlocked, plus a dev tools panel.
// Unlocking in admin mode happens in the browser only. The database rules never change, and
// nothing fake is saved to the account.
export const APP_MODE = import.meta.env.VITE_APP_MODE || 'production'
export const IS_ADMIN = APP_MODE === 'admin'
export const IS_DEV_BUILD = import.meta.env.DEV

export const APP_TITLE =
  APP_MODE === 'admin' ? 'LOCK IN · ADMIN'
  : APP_MODE === 'basic' ? 'LOCK IN · BASIC'
  : 'LOCK IN'
