import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import ambientUrl from '../assets/music/ambient.mp3'
import { useSound } from './sfx.jsx'
import { usePomodoro } from './pomodoro.jsx'

// Background music. A calm track that:
//  - plays a little louder on the login splash,
//  - drops to a very quiet bed once you're past it (and stays there while you use the app),
//  - switches off while the focus timer is running, and comes back when it stops,
//  - loops with no gap: each pass is cross-faded into the next, so there is never a seam.
const SPLASH_LEVEL = 1.2    // × your volume setting
const QUIET_LEVEL = .3      // × your volume setting
const XFADE = 5             // seconds of overlap between passes

function createLoop(url) {
  let ctx = null, master = null, buffer = null, loading = null
  let timer = 0, nextAt = 0, running = false, epoch = 0
  let sources = []

  async function prepare() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0
      master.connect(ctx.destination)
    }
    if (!buffer) {
      loading ??= fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b))
      buffer = await loading
    }
  }

  function schedulePass(at, first) {
    const d = buffer.duration
    const fade = Math.min(XFADE, d / 3)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const g = ctx.createGain()
    src.connect(g); g.connect(master)
    g.gain.setValueAtTime(first ? .001 : 0, at)
    g.gain.linearRampToValueAtTime(1, at + (first ? 1.2 : fade))
    g.gain.setValueAtTime(1, at + d - fade)
    g.gain.linearRampToValueAtTime(0, at + d)
    src.start(at)
    src.stop(at + d + .1)
    src.onended = () => { sources = sources.filter(s => s !== src) }
    sources.push(src)
    nextAt = at + d - fade     // the next pass starts while this one is fading out
  }

  return {
    // Needs a user gesture the first time; call again after one if it was blocked.
    async start() {
      try {
        await prepare()
        if (ctx.state === 'suspended') await ctx.resume()
        if (ctx.state !== 'running' || running) return ctx.state === 'running'
        running = true
        epoch++
        schedulePass(ctx.currentTime + .05, true)
        timer = setInterval(() => {
          if (ctx.currentTime > nextAt - 1.5) schedulePass(nextAt, false)
        }, 400)
        return true
      } catch { return false }
    },
    level(v, seconds = 1.5) {
      if (!ctx || !master) return
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(Math.max(0, v), t + seconds)
    },
    stop(afterSeconds = 0) {
      const halt = () => {
        running = false
        clearInterval(timer)
        sources.forEach(s => { try { s.stop() } catch { /* already stopped */ } })
        sources = []
      }
      const e = epoch
      afterSeconds > 0 ? setTimeout(() => { if (e === epoch) halt() }, afterSeconds * 1000) : halt()
    },
    get running() { return running },
    get ready() { return !!ctx && ctx.state === 'running' },
  }
}

const KEY = 'lock-in-music'
const readOn = () => { try { return localStorage.getItem(KEY) !== '0' } catch { return true } }

const MusicContext = createContext({ setPhase: () => {}, musicOn: true, setMusicOn: () => {} })
export const useMusic = () => useContext(MusicContext)

export function MusicProvider({ children }) {
  const { enabled, volume } = useSound()
  const pomodoro = usePomodoro()
  const [musicOn, setMusicOnState] = useState(readOn)
  const [phase, setPhase] = useState('quiet')    // 'splash' | 'quiet'
  const loop = useRef(null)
  if (!loop.current && typeof window !== 'undefined') loop.current = createLoop(ambientUrl)
  if (import.meta.env.DEV) window.__music = loop.current

  const setMusicOn = useCallback(on => {
    setMusicOnState(on)
    try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
  }, [])

  const timerRunning = !!pomodoro?.running
  const wanted = enabled && musicOn && !timerRunning
  const level = Math.min(1, volume * (phase === 'splash' ? SPLASH_LEVEL : QUIET_LEVEL))

  // Start (or stop) and set the level whenever something relevant changes.
  useEffect(() => {
    const l = loop.current
    if (!l) return
    let cancelled = false
    if (wanted) {
      l.start().then(ok => { if (!cancelled && ok) l.level(level) })
    } else {
      l.level(0, .9)
      l.stop(1)
    }
    return () => { cancelled = true }
  }, [wanted]) // eslint-disable-line

  useEffect(() => { if (wanted && loop.current?.running) loop.current.level(level) }, [level, wanted])

  // Browsers only allow audio after a tap or key press: try again on the first one.
  useEffect(() => {
    const l = loop.current
    if (!l) return
    const go = () => { if (wanted) l.start().then(ok => ok && l.level(level)) }
    window.addEventListener('pointerdown', go)
    window.addEventListener('keydown', go)
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go) }
  }, [wanted, level])

  const value = useMemo(() => ({ setPhase, musicOn, setMusicOn }), [musicOn, setMusicOn])
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
}
