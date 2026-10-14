import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { useToast } from '../lib/toast.jsx'
import { useSound } from '../lib/sfx.jsx'
import { dueReminders, isoOf, readSeen, remindersOn, writeSeen } from '../lib/dueReminders.js'
import { systemNotify } from '../lib/notify.jsx'

// Watches your tasks that have due dates and reminds you as they come up: a short sound and a pop-up on the page,
// and a system notification when the app is in the background and you allowed notifications. Switch it off in Settings.
export default function DueReminders() {
  const { user } = useAuth()
  const toast = useToast()
  const { play } = useSound()
  const tasks = useRef([])

  const check = useCallback(() => {
    if (!remindersOn()) return
    const seen = readSeen()
    const due = dueReminders(tasks.current, new Date(), seen)
    if (!due.length) return
    const now = Date.now()
    due.forEach(d => { seen[d.key] = now })
    writeSeen(seen)
    // a pile of reminders becomes one message
    const text = due.length > 3
      ? `${due.length} tasks need attention: ${due.slice(0, 3).map(d => d.text.replace(/^[^:]+: /, '')).join(', ')}…`
      : due.map(d => d.text).join('\n')
    play('notification')
    toast(text, 'reminder', { silent: true })
    if (document.visibilityState === 'hidden' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      systemNotify('LOCK IN reminder', text)
    }
  }, [toast, play])

  const load = useCallback(async () => {
    if (!user || !supabase) return
    const from = isoOf(new Date(Date.now() - 8 * 86400000))
    const to = isoOf(new Date(Date.now() + 2 * 86400000))
    const { data } = await supabase.from('tasks').select('id, title, due_date, due_time, done')
      .eq('user_id', user.id).eq('done', false).gte('due_date', from).lte('due_date', to)
    tasks.current = data ?? []
    check()
  }, [user?.id, check]) // eslint-disable-line

  useEffect(() => {
    load()
    const refetch = setInterval(load, 5 * 60000)     // new or changed tasks
    const tick = setInterval(check, 30000)           // the clock moving on
    const vis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(refetch); clearInterval(tick); document.removeEventListener('visibilitychange', vis) }
  }, [load, check])

  return null
}
