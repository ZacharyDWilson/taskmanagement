import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { useToast } from '../lib/toast.jsx'
import { useShop } from '../lib/shop.jsx'
import { usePomodoro } from '../lib/pomodoro.jsx'

// Post to the Feed and your next focus session earns double coins (once a day, up to +30).
// <PostBoostWatcher/> lives in the app shell and tells you when the bonus lands; <PostBoostChip/> sits on the Study page.

export function PostBoostWatcher() {
  const { user } = useAuth()
  const toast = useToast()
  const shop = useShop()
  const timer = usePomodoro()

  const check = useCallback(async () => {
    if (!user || !supabase) return
    const { data, error } = await supabase.rpc('boost_news')
    if (error || !data?.length) return
    const coins = data.reduce((n, r) => n + r.coins, 0)
    toast(`✨ Post boost! Double coins on that focus session: +${coins} bonus coins`, 'level')
    shop.refresh?.()
  }, [user?.id]) // eslint-disable-line

  useEffect(() => { check() }, [check, timer.logged])
  return null
}

export function PostBoostChip() {
  const { user } = useAuth()
  const timer = usePomodoro()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user || !supabase) return
    let live = true
    supabase.rpc('boost_status').then(({ data, error }) => { if (live && !error) setReady(!!data?.ready) })
    return () => { live = false }
  }, [user?.id, timer.logged, timer.running]) // eslint-disable-line

  if (!ready) return null
  return (
    <p className="boost-chip" role="status">
      ✨ <strong>Post boost ready:</strong> your next focus session earns double coins (once a day, up to +30).
    </p>
  )
}
