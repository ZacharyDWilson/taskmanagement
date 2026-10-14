import { useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { useToast } from '../lib/toast.jsx'
import { useShop } from '../lib/shop.jsx'

const PLACE = ['', '1st', '2nd', '3rd']

// When you open the app after a week ended and you finished in the top three, say so (once).
export default function PrizeNews() {
  const { user } = useAuth()
  const toast = useToast()
  const shop = useShop()

  useEffect(() => {
    if (!user || !supabase) return
    let live = true
    supabase.rpc('my_new_prizes').then(({ data, error }) => {
      if (!live || error || !data?.length) return
      data.forEach((p, i) => {
        setTimeout(() => toast(`🏆 You finished ${PLACE[p.rank] ?? '#' + p.rank} on last week's leaderboard! +${p.coins} coins`, 'level'), i * 1500)
      })
      shop.refresh?.()
    })
    return () => { live = false }
  }, [user?.id]) // eslint-disable-line

  return null
}
