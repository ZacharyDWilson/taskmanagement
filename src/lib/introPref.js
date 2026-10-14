// "Show the welcome globe when the app opens": on by default, saved on this device only.
const KEY = 'lock-in-intro'

export const introEnabled = () => {
  try { return localStorage.getItem(KEY) !== '0' } catch { return true }
}
export const setIntroEnabled = on => {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
}
