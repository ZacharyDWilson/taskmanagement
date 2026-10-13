import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotify } from '../lib/notify.jsx'
import { useSound } from '../lib/sfx.jsx'
import { BOOKING_URL, ROLE_LABEL, fmtTime, roomStatus, toTimeValue } from '../lib/studyBuddy.js'
import Avatar from './Avatar.jsx'
import PickerModal from './PickerModal.jsx'

export function Person({ row, children }) {
  const p = row.profiles
  const status = roomStatus(row)
  return (
    <li className="buddy">
      <Avatar name={p?.display_name} path={p?.avatar_path} color={p?.color} frame={p?.frame} size={40} />
      <div className="buddy-info">
        <Link to={`/profile/${row.user_id}`}>{p?.display_name ?? 'Someone'}</Link>
        <small className="muted">{ROLE_LABEL[row.role]}{row.room ? ` · ${row.room}` : ''}</small>
        {status && <small className="room-until">🕐 {status}</small>}
        {row.note && <small>{row.note}</small>}
      </div>
      {children}
    </li>
  )
}

// The pop-up that appears when you are matched: who, where, and what to do next.
function MatchPopup({ buddy, onClose }) {
  const { me, partner } = buddy
  const [room, setRoom] = useState('')
  const [until, setUntil] = useState('')
  const bothNeedRoom = me.role === 'need_room' && partner.role === 'need_room'
  const [copied, setCopied] = useState(false)
  async function copyLink() {
    try { await navigator.clipboard.writeText(BOOKING_URL) } catch {
      // clipboard blocked: select the text instead so Ctrl+C works
      const el = document.querySelector('.booking-url')
      if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r) }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }
  const name = partner.profiles?.display_name ?? 'Your buddy'
  return (
    <PickerModal title={`🎉 You're studying with ${name}`} onClose={onClose}>
      <ul className="buddies"><Person row={partner} /></ul>
      {partner.role === 'have_room' && (
        <p className="match-note">
          Meet <strong>{name}</strong> at <strong>{partner.room || 'their room'}</strong>
          {partner.room_until ? <> (until <strong>{fmtTime(partner.room_until)}</strong>)</> : null}.
        </p>
      )}
      {me.role === 'have_room' && (
        <p className="match-note">
          Your buddy is coming to <strong>{me.room || 'your room'}</strong>
          {me.room_until ? <> (until <strong>{fmtTime(me.room_until)}</strong>)</> : null}.
        </p>
      )}
      {bothNeedRoom && (
        <>
          <div className="booking-card">
            <strong>Neither of you has a room yet</strong>
            <p className="muted small">
              Copy the Gordon booking link and open it in a new tab to book a room, then come back and
              tell your buddy where it is.
            </p>
            <div className="row">
              <button type="button" onClick={copyLink}>{copied ? '✓ Link copied' : 'Copy booking link'}</button>
              <code className="booking-url">{BOOKING_URL}</code>
            </div>
          </div>
          <form className="stack" onSubmit={e => { e.preventDefault(); buddy.bookedRoom(room, until) }}>
            <input value={room} maxLength={60} placeholder="Booked one? Room name, e.g. Jenks 311"
              onChange={e => setRoom(e.target.value)} required />
            <div className="row">
              <label className="row small">Booked until
                <input type="time" value={until} onChange={e => setUntil(e.target.value)} required />
              </label>
              <button type="submit">Tell my buddy</button>
            </div>
          </form>
        </>
      )}
      <div className="row">
        <button type="button" className="secondary" onClick={() => { buddy.endMatch(); onClose() }}>End match</button>
        <button type="button" className="secondary" onClick={() => { buddy.leave(); onClose() }}>Leave</button>
      </div>
    </PickerModal>
  )
}

// A small row to turn alerts on, so you hear about friends and matches while the app is in the background.
function AlertsRow() {
  const n = useNotify()
  if (!n.supported) return <p className="muted small">Alerts need a browser that supports notifications. On iPhone, add the app to your Home Screen first.</p>
  if (n.permission === 'denied') return <p className="muted small">Notifications are blocked for this site. Allow them in your browser's site settings to get match alerts.</p>
  return n.enabled
    ? <p className="small">🔔 Alerts are <strong>on</strong>. <button type="button" className="link" onClick={n.disable}>Turn off</button></p>
    : <p className="small">🔔 <button type="button" className="link" onClick={n.enable}>Turn on alerts</button> to hear when a friend matches with you.</p>
}

// "Study with a friend": the whole old Study Buddy page, boiled down to one card plus a pop-up on match.
export default function BuddyPanel({ buddy }) {
  const { me, partner, error } = buddy
  const { play } = useSound()
  const [role, setRole] = useState('need_room')
  const [room, setRoom] = useState('')
  const [until, setUntil] = useState('')
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [popup, setPopup] = useState(false)
  const seen = useRef(null)

  // Pop up once each time a new match appears.
  useEffect(() => {
    const id = partner?.user_id ?? null
    if (id && seen.current !== id) { seen.current = id; setPopup(true); play('notification') }
    if (!id) seen.current = null
  }, [partner?.user_id]) // eslint-disable-line

  return (
    <section className="card buddy-panel">
      <h2>
        Study with a friend
        {me && <span className="status-chip">{partner ? 'Matched' : 'Open'}</span>}
      </h2>

      {!me && !showForm && (
        <div className="stack">
          <p className="muted">Let friends know you're up for studying together. You'll get a pop-up and a notification when someone matches with you.</p>
          <button type="button" onClick={() => setShowForm(true)}>Open to study together</button>
        </div>
      )}

      {!me && showForm && (
        <form className="stack" onSubmit={e => { e.preventDefault(); buddy.join({ role, room, until, note }); setShowForm(false) }}>
          <label className="radio">
            <input type="radio" checked={role === 'need_room'} onChange={() => setRole('need_room')} />
            I need a room (find one with a buddy)
          </label>
          <label className="radio">
            <input type="radio" checked={role === 'have_room'} onChange={() => setRole('have_room')} />
            I have a study room and can host others
          </label>
          {role === 'have_room' && (
            <>
              <input value={room} maxLength={60} placeholder="Where? e.g. Jenks 421" onChange={e => setRoom(e.target.value)} required />
              <label>Room is yours until
                <input type="time" value={until} onChange={e => setUntil(e.target.value)} required />
              </label>
            </>
          )}
          <input value={note} maxLength={80} placeholder="What are you studying? (optional)" onChange={e => setNote(e.target.value)} />
          <div className="row">
            <button type="submit">Open to study together</button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {me && !partner && (
        <div className="stack">
          <p>
            You're open: <strong>{ROLE_LABEL[me.role]}</strong>{me.room ? ` · ${me.room}` : ''}
            {roomStatus(me) ? ` · ${roomStatus(me).toLowerCase()}` : ''}. Pick someone from the list, or wait for a friend to pick you.
          </p>
          {me.role === 'have_room' && (
            <form className="row" key={`${me.room}|${me.room_until}`}
              onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); buddy.saveRoom(String(f.get('room')), String(f.get('until'))) }}>
              <input name="room" defaultValue={me.room} maxLength={60} placeholder="Room" required />
              <label className="row small">Until
                <input name="until" type="time" defaultValue={toTimeValue(me.room_until)} required />
              </label>
              <button className="secondary" type="submit">Update</button>
            </form>
          )}
          <button type="button" className="secondary" onClick={buddy.leave}>Stop being open</button>
        </div>
      )}

      {me && partner && (
        <div className="stack">
          <ul className="buddies"><Person row={partner} /></ul>
          <div className="row">
            <button type="button" onClick={() => setPopup(true)}>See details</button>
            <button type="button" className="secondary" onClick={buddy.endMatch}>End match</button>
          </div>
        </div>
      )}

      <AlertsRow />
      {error && <p className="warn">{error}</p>}
      {popup && me && partner && <MatchPopup buddy={buddy} onClose={() => setPopup(false)} />}
    </section>
  )
}
