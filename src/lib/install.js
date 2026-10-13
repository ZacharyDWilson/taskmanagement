import { useEffect, useState } from 'react'

// One place that remembers the browser's "this site can be installed" offer. The browser fires it
// once, early, so it is captured here at start-up and any component can use it later.
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach(fn => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

export function platform() {
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force(n => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return {
    canPrompt: !!deferred,
    standalone: isStandalone(),
    async install() {
      if (!deferred) return 'unavailable'
      deferred.prompt()
      const choice = await deferred.userChoice
      deferred = null
      notify()
      return choice?.outcome ?? 'dismissed'
    },
  }
}
