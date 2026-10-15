import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePomodoro, mmss, hms } from '../lib/pomodoro.jsx'

const KEY = 'lock-in-timer-overlay'
export const overlayOn = () => { try { return localStorage.getItem(KEY) !== '0' } catch { return true } }
export const setOverlayOn = on => {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
  window.dispatchEvent(new Event('lock-in:overlay-changed'))
}

// A faint, untouchable copy of the running timer in the corner of every page except the Study page itself.
export default function TimerOverlay() {
  const timer = usePomodoro()
  const { pathname } = useLocation()
  const [on, setOn] = useState(overlayOn)
  useEffect(() => {
    const sync = () => setOn(overlayOn())
    window.addEventListener('lock-in:overlay-changed', sync)
    return () => window.removeEventListener('lock-in:overlay-changed', sync)
  }, [])
  const counting = timer.kind === 'countup' && timer.cuRunning
  if (!on || pathname === '/study' || !(timer.running || counting)) return null
  const label = counting ? hms(timer.cuElapsedMs) : `${timer.mode === 'focus' ? '🎯' : '☕'} ${mmss(timer.left)}`
  return <div className="timer-overlay" aria-hidden="true">{label}</div>
}
