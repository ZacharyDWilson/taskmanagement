import { useState } from 'react'
import { THEMES, useTheme } from '../lib/theme.jsx'
import { useToast } from '../lib/toast.jsx'
import { useNotify } from '../lib/notify.jsx'
import { useMyXp } from '../lib/xp.jsx'
import { useAuth } from '../lib/auth.jsx'
import { DEMO } from '../lib/demo.js'
import { APP_MODE } from '../lib/env.js'

// Admin dev build only. A small floating panel for poking at things quickly.
// Nothing here is saved to the account.
export default function DevPanel() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const notify = useNotify()
  const { xp, level } = useMyXp()
  const { user } = useAuth()

  const resetLocal = () => {
    try { localStorage.clear(); sessionStorage.clear() } catch { /* fine */ }
    location.reload()
  }

  return (
    <div className="devpanel">
      {open && (
        <div className="devpanel-body card">
          <h3>Admin dev tools</h3>
          <label>Theme (any, all unlocked)
            <select value={theme} onChange={e => setTheme(e.target.value)}>
              {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          <div className="stack">
            <span className="muted small">Fire a test pop-up</span>
            <div className="row">
              <button className="secondary" onClick={() => toast('+10 XP for finishing "Example task"', 'xp')}>+XP</button>
              <button className="secondary" onClick={() => toast("🎉 Level up! You're now level 5. Bonus: +125 coins", 'level')}>Level up</button>
              <button className="secondary" onClick={() => toast('Something happened')}>Plain</button>
              <button className="secondary" onClick={notify.test}>Alert</button>
            </div>
          </div>

          <dl className="devinfo">
            <dt>Build</dt><dd>{APP_MODE} (port {location.port || '80'})</dd>
            <dt>Demo data</dt><dd>{DEMO ? 'on' : 'off'}</dd>
            <dt>Level / XP</dt><dd>{level} / {xp ?? '…'}</dd>
            <dt>User</dt><dd title={user?.id}>{user?.email ?? 'signed out'}</dd>
          </dl>

          <p className="muted small">
            Everything is unlocked here: themes, frames, banners and the shop. It's a view-only
            override, so your real account and the database rules are untouched.
          </p>
          <button className="secondary danger" onClick={resetLocal}>Reset this build's local settings</button>
        </div>
      )}
      <button className="devpanel-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>🛠 Dev</button>
    </div>
  )
}
