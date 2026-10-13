import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { APP_TITLE } from './env.js'
import { useSound } from './sfx.jsx'
import { useToast } from './toast.jsx'

const PomodoroContext = createContext(null)
export const usePomodoro = () => useContext(PomodoroContext)

export const mmss = ms => {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
// h:mm:ss for the count-up clock
export const hms = ms => {
  const s = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(s / 3600)
  return `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ---- count-up timer ---------------------------------------------------------------------------------------------
// A stopwatch for the day. It keeps counting while you work, and when the day changes (midnight) the day's total is
// saved as study time, which is where the XP comes from, and the clock starts again at zero.
// It is stored in this browser (per account) so closing the tab or moving between pages does not lose it.
const MAX_DAY_MIN = 600                                   // at most 10 hours are counted for one day
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const endOfDay = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 23, 59, 0, 0) }
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const KIND_KEY = 'lock-in-timer-kind'
// A focus round that has not been saved yet: { doneMs, runStart, lastSeen }. It lives in this browser so that closing
// the tab, a crash or a refresh in the middle of a round still saves the minutes you did, next time the app opens.
const pomoKey = uid => `lock-in-pomo-pending-${uid}`
const readPomo = uid => { try { return JSON.parse(localStorage.getItem(pomoKey(uid)) ?? 'null') } catch { return null } }
const writePomo = (uid, v) => { try { v ? localStorage.setItem(pomoKey(uid), JSON.stringify(v)) : localStorage.removeItem(pomoKey(uid)) } catch { /* ignore */ } }
const cuKey = uid => `lock-in-countup-${uid}`
const readKind = () => { try { return localStorage.getItem(KIND_KEY) === 'countup' ? 'countup' : 'pomodoro' } catch { return 'pomodoro' } }
const readCu = uid => {
  try {
    const v = JSON.parse(localStorage.getItem(cuKey(uid)) ?? 'null')
    if (v && typeof v.day === 'string') return { day: v.day, accMs: Number(v.accMs) || 0, startedAt: v.startedAt ? Number(v.startedAt) : null }
  } catch { /* fresh */ }
  return { day: dayKey(new Date()), accMs: 0, startedAt: null }
}

// Lives above the router so the timer keeps running while you move between pages.
export function PomodoroProvider({ children }) {
  const { user } = useAuth()
  const { play } = useSound()
  const toast = useToast()
  const [finished, setFinished] = useState(null)   // set when a focus round has just ended: { minutes }
  const [focusMin, setFocusMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [mode, setMode] = useState('focus')
  const [running, setRunning] = useState(false)
  const [endAt, setEndAt] = useState(0)
  const [left, setLeft] = useState(25 * 60000)
  const [msg, setMsg] = useState('')
  const [logged, setLogged] = useState(0) // bumps whenever a session is saved
  const [kind, setKindState] = useState(readKind)   // 'pomodoro' | 'countup'
  const [cu, setCu] = useState(() => ({ day: dayKey(new Date()), accMs: 0, startedAt: null }))
  const [now, setNow] = useState(() => Date.now())
  const cuRef = useRef(cu)
  cuRef.current = cu

  const total = (mode === 'focus' ? focusMin : breakMin) * 60000
  const elapsedMin = Math.floor((total - left) / 60000)

  // Re-sync the display when settings change while idle.
  useEffect(() => { if (!running) setLeft(total) }, [mode, focusMin, breakMin]) // eslint-disable-line

  // Save study time. A row holds at most 4 hours, so a long stretch becomes a few rows.
  async function logMinutes(minutes, at) {
    if (minutes < 1 || !user) return false
    let left = Math.min(minutes, MAX_DAY_MIN)
    while (left > 0) {
      const part = Math.min(240, left)
      const row = { user_id: user.id, minutes: part }
      let { error } = await supabase.from('study_sessions').insert(at ? { ...row, created_at: at.toISOString() } : row)
      if (error && at) ({ error } = await supabase.from('study_sessions').insert(row))   // could not set the time: save it as now
      if (error) { setMsg(error.message); return false }
      left -= part
    }
    setLogged(n => n + 1)
    if (!at) {
      // say where the day stands, the same way for the Pomodoro and the count-up timer
      const since = startOfDay(new Date()).toISOString()
      const { data } = await supabase.from('study_sessions').select('minutes').eq('user_id', user.id).gte('created_at', since)
      const todayMin = (data ?? []).reduce((n, r) => n + r.minutes, 0)
      if (todayMin > 0) toast(`+${Math.min(minutes, MAX_DAY_MIN)} XP · ${todayMin} min of focus today (${todayMin} XP)`, 'xp', { silent: true })
    }
    return true
  }

  async function log(minutes) {
    if (await logMinutes(minutes)) setMsg(`Logged ${minutes} min of focus. Nice work!`)
  }

  function switchMode(next) {
    setRunning(false)
    if (user && next !== 'focus') writePomo(user.id, null)
    setMode(next)
    setLeft((next === 'focus' ? focusMin : breakMin) * 60000)
  }

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const l = endAt - Date.now()
      if (l > 0) return setLeft(l)
      if (mode === 'focus') {
        // A focus round is done: celebrate, and tell them to start the break themselves.
        if (user) writePomo(user.id, null)
        log(focusMin)
        play('celebrate', { volume: .8 })
        setFinished({ minutes: focusMin })
        toast(`🎉 Focus session done! Press Start when you're ready for your ${breakMin} min break.`, 'level', { silent: true })
        try {
          if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Focus session done 🎉', { body: 'Press Start to begin your break.', tag: 'lock-in-timer' })
          }
        } catch { /* notifications blocked: fine */ }
        switchMode('break')
      } else {
        play('complete')
        toast("Break's over. Ready for another focus session?", 'info', { silent: true })
        switchMode('focus')
      }
    }, 250)
    return () => clearInterval(id)
  }, [running, endAt, mode, focusMin, breakMin]) // eslint-disable-line

  // ---- an unsaved Pomodoro round: keep it recorded while it runs, save what is left over from last time ----
  const roundRef = useRef({ doneMs: 0, runStart: null })
  useEffect(() => {
    if (!user) return
    const left0 = readPomo(user.id)
    if (left0) {
      const ms = (left0.doneMs ?? 0) + (left0.runStart ? Math.max(0, (left0.lastSeen ?? left0.runStart) - left0.runStart) : 0)
      const minutes = Math.min(120, Math.floor(ms / 60000))
      writePomo(user.id, null)
      if (minutes >= 1) {
        logMinutes(minutes, new Date(left0.lastSeen ?? Date.now())).then(ok => {
          if (ok) toast(`Saved ${minutes} min from your last focus round (the app was closed before it ended).`, 'xp')
        })
      }
    }
  }, [user?.id]) // eslint-disable-line

  useEffect(() => {
    if (!user || !running || mode !== 'focus') return
    const beat = () => writePomo(user.id, { doneMs: roundRef.current.doneMs, runStart: roundRef.current.runStart, lastSeen: Date.now() })
    beat()
    const id = setInterval(beat, 10000)
    return () => clearInterval(id)
  }, [user?.id, running, mode]) // eslint-disable-line

  // ---- count-up: load this account's clock, keep it saved, and roll over at midnight ----
  const store = next => {
    setCu(next)
    cuRef.current = next
    try { localStorage.setItem(cuKey(user.id), JSON.stringify(next)) } catch { /* ignore */ }
  }

  useEffect(() => { if (user) { setCu(readCu(user.id)); cuRef.current = readCu(user.id) } }, [user?.id]) // eslint-disable-line

  const cuTotalAt = (state, t) => state.accMs + (state.startedAt ? Math.max(0, t - state.startedAt) : 0)

  // When the day changes, save yesterday's total and start today at zero (carrying on if the clock was running).
  async function rollOver(state, t) {
    const today = dayKey(new Date(t))
    if (state.day === today) return
    const dayEnd = endOfDay(state.day)
    const ms = state.accMs + (state.startedAt ? Math.max(0, Math.min(t, dayEnd.getTime() + 60000) - state.startedAt) : 0)
    const minutes = Math.floor(ms / 60000)
    const running = !!state.startedAt
    store({ day: today, accMs: 0, startedAt: running ? startOfDay(new Date(t)).getTime() : null })
    if (minutes >= 1 && await logMinutes(minutes, dayEnd)) {
      toast(`Yesterday's count-up time was saved: ${minutes} min of focus.`, 'xp')
    }
  }

  useEffect(() => {
    if (!user) return
    const id = setInterval(() => {
      const t = Date.now()
      if (cuRef.current.startedAt) setNow(t)      // only re-draw every second while the clock is actually running
      rollOver(cuRef.current, t)
    }, 1000)
    rollOver(cuRef.current, Date.now())
    return () => clearInterval(id)
  }, [user?.id]) // eslint-disable-line

  const cuRunning = !!cu.startedAt
  const cuElapsedMs = cuTotalAt(cu, now)
  const cuMinutes = Math.floor(cuElapsedMs / 60000)

  function cuStartPause() {
    const t = Date.now()
    if (cuRef.current.startedAt) {
      play('stop')
      store({ ...cuRef.current, accMs: cuTotalAt(cuRef.current, t), startedAt: null })
    } else {
      if (running) {
        // one clock at a time: pause the Pomodoro round, keeping its time
        if (user && mode === 'focus') writePomo(user.id, { doneMs: total - left, runStart: null, lastSeen: t })
        setRunning(false)
        toast('Pomodoro paused while Count up runs.', 'info', { silent: true })
      }
      play('start')
      setMsg('')
      store({ ...cuRef.current, startedAt: t })
    }
    setNow(t)
  }

  // Save what has been counted so far, without waiting for midnight, and carry on from zero.
  async function cuLogNow() {
    const t = Date.now()
    const ms = cuTotalAt(cuRef.current, t)
    const minutes = Math.floor(ms / 60000)
    if (minutes < 1) return
    const keepRunning = !!cuRef.current.startedAt
    store({ day: cuRef.current.day, accMs: ms - minutes * 60000, startedAt: keepRunning ? t : null })
    if (await logMinutes(minutes)) setMsg(`Logged ${Math.min(minutes, MAX_DAY_MIN)} min of focus. Nice work!`)
  }

  function cuReset() {
    if (cuRef.current.accMs === 0 && !cuRef.current.startedAt) return
    store({ day: cuRef.current.day, accMs: 0, startedAt: null })
  }

  function setKind(next) {
    setKindState(next)
    try { localStorage.setItem(KIND_KEY, next) } catch { /* ignore */ }
  }

  useEffect(() => {
    document.title = running ? `${mmss(left)} · ${mode === 'focus' ? 'Focus' : 'Break'}`
      : cuRunning ? `${hms(cuElapsedMs)} · Counting` : APP_TITLE
  }, [running, left, mode, cuRunning, cuElapsedMs])

  function startPause() {
    if (running) {
      play('stop')
      // paused: what has been done so far is kept, so it is saved even if the tab is closed before resuming
      if (user && mode === 'focus') writePomo(user.id, { doneMs: total - left, runStart: null, lastSeen: Date.now() })
      return setRunning(false)
    }
    // one clock at a time: starting a round pauses the count-up timer, so the same minutes are never counted twice
    if (cuRef.current.startedAt) { cuStartPause(); toast('Count up paused while the Pomodoro runs.', 'info', { silent: true }) }
    play('start')
    setFinished(null)
    setMsg('')
    const t = Date.now()
    roundRef.current = { doneMs: total - left, runStart: t }
    setEndAt(t + left)
    setRunning(true)
  }

  async function finishEarly() {
    setRunning(false)
    if (user) writePomo(user.id, null)
    await log(elapsedMin)
    switchMode('break')
  }

  const value = {
    focusMin, setFocusMin, breakMin, setBreakMin, mode, switchMode, running, left, total,
    elapsedMin, msg, logged, startPause, finishEarly, finished, clearFinished: () => setFinished(null),
    // count-up timer
    kind, setKind, cuRunning, cuElapsedMs, cuMinutes, cuDay: cu.day, cuStartPause, cuLogNow, cuReset, maxDayMin: MAX_DAY_MIN,
  }
  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
}
