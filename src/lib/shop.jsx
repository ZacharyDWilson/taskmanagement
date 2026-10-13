import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { useMyXp } from './xp.jsx'
import { IS_ADMIN } from './env.js'
import { cachedTable } from './cache.js'

const ShopContext = createContext({
  items: [], bundles: [], owned: new Set(), balance: 0, starterChosen: true,
  buy: async () => null, buyBundle: async () => null, chooseStarter: async () => null, refresh: async () => {},
})
export const useShop = () => useContext(ShopContext)

// Coins, what's in the shop, and what you own. Re-checks whenever your XP changes.
export function ShopProvider({ children }) {
  const { user } = useAuth()
  const { xp } = useMyXp()
  const [items, setItems] = useState([])
  const [bundles, setBundles] = useState([])
  const [owned, setOwned] = useState(new Set())
  const [balance, setBalance] = useState(0)
  // Assume "already chosen" until we know, so the starter picker never flashes up by mistake.
  const [starterChosen, setStarterChosen] = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !supabase) return
    const [shop, bought, coins, profile, bund] = await Promise.all([
      cachedTable('shop_items', 'sort').then(data => ({ data })),
      supabase.from('purchases').select('item_id').eq('user_id', user.id),
      supabase.rpc('coin_balance', { uid: user.id }),
      supabase.from('profiles').select('starter_chosen').eq('id', user.id).maybeSingle(),
      cachedTable('shop_bundles', 'sort').then(data => ({ data })),
    ])
    setItems(shop.data ?? [])
    setBundles(bund.data ?? [])
    setOwned(new Set((bought.data ?? []).map(r => r.item_id)))
    setBalance(coins.data ?? 0)
    setStarterChosen(profile.data?.starter_chosen ?? true)
  }, [user?.id]) // eslint-disable-line

  useEffect(() => { refresh() }, [refresh, xp])

  // Both return an error message, or null when it worked.
  const buy = useCallback(async id => {
    const { error } = await supabase.rpc('buy_item', { item: id })
    await refresh()
    return error?.message ?? null
  }, [refresh])

  const buyBundle = useCallback(async id => {
    const { error } = await supabase.rpc('buy_bundle', { bundle: id })
    await refresh()
    return error?.message ?? null
  }, [refresh])

  const chooseStarter = useCallback(async id => {
    const { error } = await supabase.rpc('choose_starter_theme', { item: id })
    await refresh()
    return error?.message ?? null
  }, [refresh])

  return (
    // Admin dev build: show everything as owned. This is view-only; the database is not touched.
    <ShopContext.Provider value={{
      items, bundles,
      owned: IS_ADMIN ? new Set(items.map(i => i.id)) : owned,
      balance: IS_ADMIN ? 9999 : balance,
      starterChosen: IS_ADMIN ? true : starterChosen,
      buy, buyBundle, chooseStarter, refresh,
    }}>
      {children}
    </ShopContext.Provider>
  )
}
