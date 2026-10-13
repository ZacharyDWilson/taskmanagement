import { createPortal } from 'react-dom'
import { useAuth } from '../lib/auth.jsx'
import { useShop } from '../lib/shop.jsx'
import { useTheme } from '../lib/theme.jsx'
import { supabase } from '../lib/supabase.js'
import { IS_ADMIN } from '../lib/env.js'

// Shown once to a brand-new account: pick Light or Dark. Both are the default (Classic) background.
// Everything else is bought with coins in the Shop.
const CHOICES = [
  { id: 'default', name: 'Light', blurb: 'Airy whites and sky blue.', colors: ['#f4f8fc', '#dfeaf5', '#bfe3ff', '#2d8fe6', '#1f2d3d'] },
  { id: 'dark', name: 'Dark', blurb: 'Deep navy, easy on the eyes at night.', colors: ['#0c1428', '#16243f', '#25395f', '#5aa9ff', '#e8eefc'] },
]

export default function LookPicker({ preview = false, open = false, onClose }) {
  const { user } = useAuth()
  const shop = useShop()
  const { theme, setTheme } = useTheme()
  const needed = !preview && user && !IS_ADMIN && !shop.starterChosen
  if (!needed && !(preview && open)) return null

  async function choose(id) {
    setTheme(id)
    if (!preview && user) {
      await supabase.from('profiles').update({ starter_chosen: true }).eq('id', user.id)
      await shop.refresh()
    }
    onClose?.()
  }

  return createPortal(
    <div className="modal-backdrop" style={{ zIndex: 65 }}>
      <div className="modal card stack look-picker" role="dialog" aria-label="Choose your look">
        <h2>How do you like it?</h2>
        <p className="muted">Pick Light or Dark. You can switch any time in My Profile, and more looks are in the Shop.</p>
        <div className="look-grid">
          {CHOICES.map(c => (
            <button key={c.id} type="button" className={'look-opt look-' + c.id + (theme === c.id ? ' on' : '')} onClick={() => choose(c.id)}>
              <span className="theme-swatch" aria-hidden="true">{c.colors.map((col, i) => <i key={i} style={{ background: col }} />)}</span>
              <strong>{c.name}</strong>
              <small>{c.blurb}</small>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
