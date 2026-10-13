import { useEffect, useState } from 'react'

// "Calm mode": switches off every animation and transition (the dock bobbing, drifting scenes, glows) and the
// frosted-glass blur, which is what makes busy backgrounds stutter on older phones.
// It is a per-device choice, remembered in this browser, and it is applied before the first paint.
// Until someone picks, it starts ON for devices that ask for less motion (the system "reduce motion" setting,
// data saver, or a very low-memory phone) and OFF everywhere else.
const KEY = 'lock-in-reduce-motion'
function deviceWantsCalm() {
  try {
    const nav = navigator
    return !!(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || nav.connection?.saveData
      || (nav.deviceMemory && nav.deviceMemory <= 2))
  } catch { return false }
}
const read = () => {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? deviceWantsCalm() : v === '1'
  } catch { return deviceWantsCalm() }
}
const apply = on => { document.documentElement.dataset.motion = on ? 'reduced' : 'full' }

apply(read())

export function setReducedMotion(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
  apply(on)
  window.dispatchEvent(new Event('lock-in:motion'))
}

export function useReducedMotion() {
  const [on, setOn] = useState(read)
  useEffect(() => {
    const sync = () => setOn(read())
    window.addEventListener('lock-in:motion', sync)
    return () => window.removeEventListener('lock-in:motion', sync)
  }, [])
  return [on, setReducedMotion]
}

// ---- the side bar on its own --------------------------------------------------------------------------------------
// The side bar buttons (bobbing bubbles, swaying flowers, glows) and the phone tab bar's liquid can be switched off by
// themselves, without turning on Calm mode for the whole site. Per device, remembered in this browser.
const DOCK_KEY = 'lock-in-dock-animated'
const readDock = () => { try { return localStorage.getItem(DOCK_KEY) !== '0' } catch { return true } }
const applyDock = on => { document.documentElement.dataset.dock = on ? 'animated' : 'still' }
applyDock(readDock())

export function setDockAnimated(on) {
  try { localStorage.setItem(DOCK_KEY, on ? '1' : '0') } catch { /* ignore */ }
  applyDock(on)
  window.dispatchEvent(new Event('lock-in:dock'))
}

export function useDockAnimated() {
  const [on, setOn] = useState(readDock)
  useEffect(() => {
    const sync = () => setOn(readDock())
    window.addEventListener('lock-in:dock', sync)
    return () => window.removeEventListener('lock-in:dock', sync)
  }, [])
  return [on, setDockAnimated]
}
