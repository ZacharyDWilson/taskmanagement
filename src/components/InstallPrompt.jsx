import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { useInstall, platform } from '../lib/install.js'

// After someone's first sign-in (once the welcome steps are out of the way), gently suggest keeping the
// app handy: install it, or bookmark it. Shows once per person, per device.
const keyFor = id => `lock-in-install-${id}`
const done = id => { try { return localStorage.getItem(keyFor(id)) === '1' } catch { return true } }
const remember = id => { try { localStorage.setItem(keyFor(id), '1') } catch { /* ignore */ } }

export default function InstallPrompt() {
  const { user } = useAuth()
  const { canPrompt, standalone, install } = useInstall()
  const [show, setShow] = useState(false)
  const os = platform()

  useEffect(() => {
    if (!user || standalone || done(user.id)) return
    // wait until the look picker and the tour (both modal) are out of the way
    const id = setInterval(() => {
      if (document.querySelector('.modal-backdrop, .tour-tip')) return
      setShow(true)
      clearInterval(id)
    }, 1500)
    return () => clearInterval(id)
  }, [user?.id, standalone]) // eslint-disable-line

  if (!show || !user) return null
  const close = () => { remember(user.id); setShow(false) }
  const mac = /Mac/.test(navigator.platform)

  return (
    <aside className="install-card card" role="dialog" aria-label="Keep LOCK IN handy">
      <button type="button" className="link install-x" onClick={close} aria-label="Dismiss">×</button>
      <h2>📌 Keep LOCK IN handy</h2>
      {canPrompt ? (
        <>
          <p>Install it as an app so it opens in its own window, with its own icon.</p>
          <div className="row">
            <button type="button" onClick={async () => { await install(); close() }}>Install app</button>
            <button type="button" className="secondary" onClick={close}>Not now</button>
          </div>
        </>
      ) : (
        <>
          {os === 'ios' && <p>Tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>. It will open like an app.</p>}
          {os === 'android' && <p>Open your browser menu <strong>⋮</strong> and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>}
          {os === 'desktop' && <p>Bookmark this page with <strong>{mac ? '⌘ D' : 'Ctrl + D'}</strong> so it is one click away.</p>}
          <div className="row"><button type="button" onClick={close}>Got it</button></div>
        </>
      )}
    </aside>
  )
}
