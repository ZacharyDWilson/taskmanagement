import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { IS_ADMIN } from './env.js'

// Original fan-inspired looks. They use their own names and palettes, with no logos or characters.
// `preview` is the theme's five-colour palette, shown as swatches in the picker and the shop.
// Each theme also has its own animated background (see "Themes" at the bottom of styles.css).
export const THEMES = [
  { id: 'default', name: 'Classic', blurb: 'Airy whites and sky blue, with soft light drifting by.',
    preview: ['#f4f8fc', '#dfeaf5', '#bfe3ff', '#2d8fe6', '#1f2d3d'] },
  { id: 'sprout', name: 'Sprout Squad', blurb: 'Olive leaves, cream and warm amber, with pollen floating up.',
    preview: ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'] },
  { id: 'console', name: 'Retro Console', blurb: 'Mint, steel blue and a pop of red over sliding stripes and tiles.',
    preview: ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'] },
  { id: 'capsule', name: 'Capsule Quest', blurb: 'Navy, red and sunny orange under a slowly turning sunburst.',
    preview: ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'] },
  { id: 'meadow', name: "Hero's Meadow", blurb: 'Dark earth, teal and parchment, lit by drifting fireflies.',
    preview: ['#0a0908', '#22333b', '#eae0d5', '#c6ac8f', '#5e503f'] },
  { id: 'island', name: 'Cozy Island', blurb: 'Rose petals drifting down over soft aqua.',
    preview: ['#880d1e', '#dd2d4a', '#f26a8d', '#f49cbb', '#cbeef3'] },
  { id: 'arcade', name: 'Starlit Arcade', blurb: 'Deep lavender night with twinkling stars and drifting aurora.',
    preview: ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'] },
]

const KEY = 'friends-site-theme'
const valid = id => THEMES.some(t => t.id === id)
const readLocal = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const writeLocal = id => { try { localStorage.setItem(KEY, id) } catch { /* private mode: fine */ } }

function apply(id) {
  const root = document.documentElement
  if (id && id !== 'default') root.dataset.theme = id
  else delete root.dataset.theme
}

const ThemeContext = createContext({ theme: 'default', setTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState(() => {
    const saved = readLocal()
    const id = valid(saved) ? saved : 'default'
    apply(id) // before first paint, so there's no flash of the wrong look
    return id
  })

  useEffect(() => { apply(theme) }, [theme])

  // Pick up the theme you saved on another device.
  useEffect(() => {
    if (!user || !supabase || IS_ADMIN) return   // the admin build keeps its own, local-only choice
    supabase.from('profiles').select('theme').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data?.theme && valid(data.theme)) { setThemeState(data.theme); writeLocal(data.theme) }
    })
  }, [user?.id]) // eslint-disable-line

  const setTheme = useCallback(async id => {
    if (!valid(id)) return
    setThemeState(id)
    writeLocal(id)
    if (user && supabase && !IS_ADMIN) await supabase.from('profiles').update({ theme: id }).eq('id', user.id)
  }, [user?.id]) // eslint-disable-line

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
