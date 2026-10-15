import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePomodoro, mmss, hms } from '../lib/pomodoro.jsx'

const EVENT = 'lock-in:pip-open'
export const pipSupported = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window
// Call from a click handler (the browser only allows opening the window from one).
export const openPip = () => window.dispatchEvent(new Event(EVENT))

// A small always-on-top window (Chrome / Edge on a computer) that shows the timer over other tabs and apps.
export default function PipTimer() {
  const timer = usePomodoro()
  const [win, setWin] = useState(null)

  useEffect(() => {
    if (!pipSupported()) return
    const open = async () => {
      if (window.documentPictureInPicture.window) return
      try {
        const w = await window.documentPictureInPicture.requestWindow({ width: 260, height: 150 })
        w.document.title = 'LOCK IN timer'
        Object.assign(w.document.body.style, { margin: '0', fontFamily: 'system-ui, sans-serif', background: '#1b1f2a', color: '#fff' })
        w.addEventListener('pagehide', () => setWin(null))
        setWin(w)
      } catch { /* declined or not allowed */ }
    }
    window.addEventListener(EVENT, open)
    return () => window.removeEventListener(EVENT, open)
  }, [])

  useEffect(() => () => { try { win?.close() } catch { /* ignore */ } }, [win])
  if (!win) return null

  const counting = timer.kind === 'countup'
  const running = counting ? timer.cuRunning : timer.running
  const time = counting ? hms(timer.cuElapsedMs) : mmss(timer.left)
  const label = counting ? 'Study today' : timer.mode === 'focus' ? 'Focus' : 'Break'
  const toggle = counting ? timer.cuStartPause : timer.startPause
  return createPortal(
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 6 }}>
      <div style={{ fontSize: 13, opacity: .7, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 48, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{time}</div>
      <button type="button" onClick={toggle}
        style={{ border: 0, borderRadius: 999, padding: '6px 18px', fontWeight: 700, cursor: 'pointer', background: '#7c9cff', color: '#10131c' }}>
        {running ? 'Pause' : 'Start'}
      </button>
    </div>,
    win.document.body,
  )
}
