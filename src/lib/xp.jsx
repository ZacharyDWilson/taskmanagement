import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { usePomodoro } from './pomodoro.jsx'
import { levelFromXp } from './levels.js'

const XpContext = createContext({ xp: null, level: 1, refresh: async () => 0 })
export const useMyXp = () => useContext(XpContext)

// Keeps your XP and level up to date everywhere (top bar, Overview, To Do pop-ups).
// It re-checks when you change page and whenever a focus session is logged.
export function XpProvider({ children }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const timer = usePomodoro()
  const [xp, setXp] = useState(null)

  const refresh = useCallback(async () => {
    if (!user || !supabase) return 0
    const { data } = await supabase.rpc('user_xp', { uid: user.id })
    const value = data ?? 0
    setXp(value)
    return value
  }, [user?.id]) // eslint-disable-line

  useEffect(() => { refresh() }, [refresh, pathname, timer.logged])

  return (
    <XpContext.Provider value={{ xp, level: levelFromXp(xp ?? 0), refresh }}>
      {children}
    </XpContext.Provider>
  )
}
