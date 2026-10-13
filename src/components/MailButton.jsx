import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { CHANGELOG } from '../lib/changelog.js'
import { VERSION_LABEL } from '../lib/version.js'
import { useSound } from '../lib/sfx.jsx'
import PickerModal from './PickerModal.jsx'

// The mail button at the top. Two things live behind it: announcements from the admin, and the version history.
// A small dot says something is new. Big ("major") announcements also pop up once when the app opens; closing the
// pop-up keeps the dot until the mail is opened.
const SEEN_KEY = 'lock-in-mail-seen'          // announcement ids and the newest version already looked at
const POP_KEY = 'lock-in-mail-popup-closed'   // major announcements whose pop-up was closed
const readList = k => { try { return JSON.parse(localStorage.getItem(k) ?? '[]') } catch { return [] } }
const writeList = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v.slice(-80))) } catch { /* ignore */ } }
const fmtDate = d => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

function useMail() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [seen, setSeen] = useState(() => readList(SEEN_KEY))
  const [closed, setClosed] = useState(() => readList(POP_KEY))

  useEffect(() => {
    if (!user || !supabase) return
    let live = true
    supabase.from('announcements').select('id, title, body, major, created_at, expires_at').order('created_at', { ascending: false }).limit(30).then(({ data }) => {
      if (!live) return
      const now = Date.now()
      setItems((data ?? []).filter(a => !a.expires_at || new Date(a.expires_at).getTime() > now))
    })
    return () => { live = false }
  }, [user?.id])

  const newest = CHANGELOG[0].version
  const unread = useMemo(
    () => items.some(a => !seen.includes(a.id)) || !seen.includes('v' + newest),
    [items, seen, newest],
  )
  const markRead = useCallback(() => {
    const next = [...new Set([...seen, ...items.map(a => a.id), 'v' + newest])]
    setSeen(next); writeList(SEEN_KEY, next)
  }, [seen, items, newest])
  const popup = items.find(a => a.major && !closed.includes(a.id)) ?? null
  const closePopup = id => { const next = [...closed, id]; setClosed(next); writeList(POP_KEY, next) }
  return { items, unread, markRead, popup, closePopup }
}

export default function MailButton() {
  const { user } = useAuth()
  const { play } = useSound()
  const mail = useMail()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('news')   // news | history

  if (!user) return null

  const openMail = () => { setOpen(true); play('open'); mail.markRead() }

  return (
    <>
      <button type="button" className="mail-btn" onClick={openMail}
        aria-label={mail.unread ? 'Mail, something new' : 'Mail'} title="Announcements and version history">
        <svg className="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7.5 8 6 8-6" />
        </svg>
        {mail.unread && <span className="mail-dot" aria-hidden="true" />}
      </button>

      {open && (
        <PickerModal title="Mail" hint="Announcements, and what has changed in LOCK IN." onClose={() => setOpen(false)}>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'news'} className={tab === 'news' ? 'active' : ''} onClick={() => setTab('news')}>
              Announcements{mail.items.length ? ` (${mail.items.length})` : ''}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
              What's new
            </button>
          </div>

          {tab === 'news' && (
            <div className="mail-list">
              {mail.items.length === 0 && <p className="muted">No announcements right now.</p>}
              {mail.items.map(a => (
                <article key={a.id} className="mail-item">
                  <div className="row between">
                    <strong>{a.title}</strong>
                    {a.major && <span className="mail-tag">Big update</span>}
                  </div>
                  {a.body && <p className="small">{a.body}</p>}
                  <small className="muted">{fmtDate(a.created_at)}</small>
                </article>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div className="mail-list">
              {CHANGELOG.map(v => (
                <article key={v.version} className="mail-item">
                  <div className="row between">
                    <strong>{v.title}</strong>
                    <span className="mail-tag version">{v.version}</span>
                  </div>
                  <ul className="mail-points">{v.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  <small className="muted">{fmtDate(v.date + 'T12:00:00')}</small>
                </article>
              ))}
            </div>
          )}
          <p className="muted small mail-version">LOCK IN {VERSION_LABEL}</p>
        </PickerModal>
      )}

      {mail.popup && !open && (
        <div className="modal-backdrop update-popup">
          <div className="modal card stack" role="dialog" aria-modal="true" aria-label="Big update">
            <span className="mail-tag">Big update</span>
            <h2>{mail.popup.title}</h2>
            {mail.popup.body && <p>{mail.popup.body}</p>}
            <div className="row between">
              <button type="button" className="secondary" onClick={() => { mail.closePopup(mail.popup.id) }}>Close</button>
              <button type="button" onClick={() => { mail.closePopup(mail.popup.id); setTab('history'); openMail() }}>See what's new</button>
            </div>
            <small className="muted">You can read this again any time from the mail button.</small>
          </div>
        </div>
      )}
    </>
  )
}
