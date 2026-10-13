import { createContext, useContext, useEffect, useState } from 'react'
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

  const total = (mode === 'focus' ? focusMin : breakMin) * 60000
  const elapsedMin = Math.floor((total - left) / 60000)

  // Re-sync the display when settings change while idle.
  useEffect(() => { if (!running) setLeft(total) }, [mode, focusMin, breakMin]) // eslint-disable-line

  async function log(minutes) {
    if (minutes < 1 || !user) return
    const { error } = await supabase.from('study_sessions').insert({ user_id: user.id, minutes })
    if (error) return setMsg(error.message)
    setMsg(`Logged ${minutes} min of focus. Nice work!`)
    setLogged(n => n + 1)
  }

  function switchMode(next) {
    setRunning(false)
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

  useEffect(() => {
    document.title = running ? `${mmss(left)} · ${mode === 'focus' ? 'Focus' : 'Break'}` : APP_TITLE
  }, [running, left, mode])

  function startPause() {
    if (running) { play('stop'); return setRunning(false) }
    play('start')
    setFinished(null)
    setMsg('')
    setEndAt(Date.now() + left)
    setRunning(true)
  }

  async function finishEarly() {
    setRunning(false)
    await log(elapsedMin)
    switchMode('break')
  }

  const value = {
    focusMin, setFocusMin, breakMin, setBreakMin, mode, switchMode, running, left, total,
    elapsedMin, msg, logged, startPause, finishEarly, finished, clearFinished: () => setFinished(null),
  }
  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
}
