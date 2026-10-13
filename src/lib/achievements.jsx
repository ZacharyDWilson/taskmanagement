import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { useMyXp } from './xp.jsx'
import { useShop } from './shop.jsx'
import { useToast } from './toast.jsx'

const AchievementsContext = createContext({
  catalog: [], earned: new Map(), stats: {}, loaded: false,
  refresh: async () => {}, pin: async () => null,
})
export const useAchievements = () => useContext(AchievementsContext)

// The achievements catalogue, what you have earned and how far along you are. It asks the database to grant anything
// newly earned whenever your XP changes or you change page, and pops up a message for each new badge.
// The top badges (pinned first, then highest tier, then newest) for a list of people, in one query.
// Returns a Map of userId -> [achievement, ...]. Used next to names on the leaderboard and the feed.
const TIER_RANK = { gold: 3, silver: 2, bronze: 1 }
export function useTopBadges(userIds, perPerson = 3) {
  const { catalog } = useContext(AchievementsContext)
  const [rows, setRows] = useState([])
  const key = [...new Set(userIds.filter(Boolean))].sort().join(',')
  useEffect(() => {
    if (!key || !supabase) { setRows([]); return }
    let live = true
    supabase.from('user_achievements').select('user_id, achievement_id, earned_at, pinned').in('user_id', key.split(','))
      .then(({ data }) => { if (live) setRows(data ?? []) })
    return () => { live = false }
  }, [key])
  return useMemo(() => {
    const byId = new Map(catalog.map(a => [a.id, a]))
    const out = new Map()
    for (const r of rows) {
      const a = byId.get(r.achievement_id)
      if (!a) continue
      if (!out.has(r.user_id)) out.set(r.user_id, [])
      out.get(r.user_id).push({ ...a, pinned: r.pinned, earned_at: r.earned_at })
    }
    for (const [uid, list] of out) {
      list.sort((x, y) => (y.pinned - x.pinned) || (TIER_RANK[y.tier] - TIER_RANK[x.tier]) || String(y.earned_at).localeCompare(String(x.earned_at)))
      out.set(uid, list.slice(0, perPerson))
    }
    return out
  }, [rows, catalog, perPerson])
}

export function AchievementsProvider({ children }) {
  const { user } = useAuth()
  const { xp } = useMyXp()
  const { pathname } = useLocation()
  const toast = useToast()
  const shop = useShop()
  const [catalog, setCatalog] = useState([])
  const [earned, setEarned] = useState(new Map())
  const [stats, setStats] = useState({})
  const [loaded, setLoaded] = useState(false)
  const busy = useRef(false)

  const load = useCallback(async () => {
    if (!user || !supabase) return
    const [cat, mine, st] = await Promise.all([
      supabase.from('achievements').select('*').order('sort'),
      supabase.from('user_achievements').select('*').eq('user_id', user.id),
      supabase.rpc('my_achievement_stats'),
    ])
    setCatalog(cat.data ?? [])
    setEarned(new Map((mine.data ?? []).map(r => [r.achievement_id, r])))
    setStats(st.data ?? {})
    setLoaded(true)
  }, [user?.id]) // eslint-disable-line

  const check = useCallback(async () => {
    if (!user || !supabase || busy.current) return
    busy.current = true
    try {
      const { data } = await supabase.rpc('check_achievements')
      const fresh = Array.isArray(data) ? data : []
      if (fresh.length > 2) {
        // a lot at once (the first time, for an account that has been around): one message instead of a pile of them
        const coins = fresh.reduce((n, x) => n + (x.ach_coins ?? 0), 0)
        const styles = fresh.filter(x => x.ach_item).length
        toast(`🏆 ${fresh.length} achievements unlocked · +${coins} coins${styles ? ', ' + styles + ' new exclusive style' + (styles > 1 ? 's' : '') : ''}. See them on the Achievements page.`, 'level')
      } else {
        for (const a of fresh) {
          const bits = []
          if (a.ach_coins > 0) bits.push(`+${a.ach_coins} coins`)
          if (a.ach_item) bits.push('a new exclusive style')
          toast(`🏆 Achievement unlocked: ${a.ach_name}${bits.length ? ' · ' + bits.join(', ') : ''}`, 'level')
        }
      }
      await load()
      if (fresh.length) shop.refresh?.()
    } finally {
      busy.current = false
    }
  }, [user?.id, load]) // eslint-disable-line

  useEffect(() => { check() }, [check, xp, pathname])

  // Choose up to three earned badges to show first on your profile. Returns an error message, or null.
  const pin = useCallback(async ids => {
    const { error } = await supabase.rpc('set_pinned_achievements', { ids })
    await load()
    return error?.message ?? null
  }, [load])

  const value = useMemo(() => ({ catalog, earned, stats, loaded, refresh: load, pin }), [catalog, earned, stats, loaded, load, pin])
  return <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>
}
