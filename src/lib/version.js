// The version shown top left and in Settings. It comes from the newest entry in src/lib/changelog.js, so adding a
// release note there is what bumps it. (Minor number for features and fixes, major number for something big.)
import { CHANGELOG } from './changelog.js'

export const APP_STAGE = 'alpha'
export const APP_VERSION = CHANGELOG[0].version
export const VERSION_LABEL = `${APP_STAGE} ${APP_VERSION}`
