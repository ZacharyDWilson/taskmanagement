import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { useToast } from './toast.jsx'

const KEY = 'friends-site-notify'
const supported = () => typeof window !== 'undefined' && 'Notification' in window
const fmtTime = iso =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// Shows a system notification: through the service worker where there is one (needed on Android
// and for the installed app), otherwise a plain browser notification (desktop).
async function systemNotify(title, body) {
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (reg) {
      await reg.showNotification(title, {
        body, tag: 'study-buddy', icon: './icons/icon-192.png', badge: './icons/icon-192.png',
      })
      return
    }
  } catch { /* fall through to the plain version */ }
  try { new Notification(title, { body, tag: 'study-buddy', icon: './icons/icon-192.png' }) } catch { /* blocked */ }
}

const NotifyContext = createContext({
  supported: false, permission: 'unsupported', enabled: false, enable: async () => {}, disable: () => {}, test: () => {},
})
export const useNotify = () => useContext(NotifyContext)

// Listens for Study Buddy activity (live) and alerts you: a toast in the app, plus a system
// notification on PC or phone if you've turned them on.
export function NotifyProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const [permission, setPermission] = useState(supported() ? Notification.permission : 'unsupported')
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  const enabledRef = useRef(false)
  const announced = useRef(new Set())
  enabledRef.current = enabled && permission === 'granted'

  const remember = on => { try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* fine */ } }

  const enable = useCallback(async () => {
    if (!supported()) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    setEnabled(result === 'granted')
    remember(result === 'granted')
    return result
  }, [])

  const disable = useCallback(() => { setEnabled(false); remember(false) }, [])

  const alert = useCallback((title, body) => {
    if (document.visibilityState === 'visible') toast(`${title}. ${body}`.trim())
    if (enabledRef.current) systemNotify(title, body)
  }, [toast])

  const test = useCallback(() => alert('Notifications are on', 'You\'ll hear about friends who are open to study.'), [alert])

  useEffect(() => {
    if (!user || !supabase) return
    const nameOf = async id => {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', id).maybeSingle()
      return data?.display_name ?? 'A friend'
    }

    const channel = supabase
      .channel('study-queue-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_queue' }, async ({ new: row }) => {
        if (!row || row.user_id === user.id) return
        const name = await nameOf(row.user_id)
        const until = row.room_until ? ` until ${fmtTime(row.room_until)}` : ''
        const body = row.role === 'have_room'
          ? `Has ${row.room || 'a study room'}${until}.${row.note ? ` ${row.note}` : ''}`
          : `Looking for a study buddy.${row.note ? ` ${row.note}` : ''}`
        alert(`${name} is open to study`, body)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'study_queue' }, async ({ new: row }) => {
        if (!row || row.user_id === user.id) return
        if (row.matched_with === user.id) {
          if (announced.current.has(row.user_id)) return
          announced.current.add(row.user_id)
          alert(`${await nameOf(row.user_id)} wants to study with you`, 'Open Study Buddy to see the details.')
        } else {
          announced.current.delete(row.user_id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, alert]) // eslint-disable-line

  const value = { supported: supported(), permission, enabled: enabledRef.current, enable, disable, test }
  return <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>
}
