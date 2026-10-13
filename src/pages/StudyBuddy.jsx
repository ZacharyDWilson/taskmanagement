import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import Avatar from '../components/Avatar.jsx'
import { DEMO, demoQueue, isDemoId } from '../lib/demo.js' // DEMO

// Gordon's library room booking (Jenks Library, "Schedule Jenks").
const BOOKING_URL = 'https://schedulejenks.gordon.edu/'
const STALE_MS = 3 * 60 * 60 * 1000 // hide people who've been waiting 3+ hours

const ROLE_LABEL = { have_room: 'Has a study room', need_room: 'Needs a room' }

function Person({ row, children }) {
  const p = row.profiles
  return (
    <li className="buddy">
      <Avatar name={p?.display_name} path={p?.avatar_path} color={p?.color} frame={p?.frame} size={40} />
      <div className="buddy-info">
        <Link to={`/profile/${row.user_id}`}>{p?.display_name ?? 'Someone'}</Link>
        <small className="muted">
          {ROLE_LABEL[row.role]}{row.room ? ` · ${row.room}` : ''}
        </small>
        {row.note && <small>{row.note}</small>}
      </div>
      {children}
    </li>
  )
}

export default function StudyBuddy() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [role, setRole] = useState('need_room')
  const [room, setRoom] = useState('')
  const [note, setNote] = useState('')
  const [bookedRoom, setBookedRoom] = useState('')
  const [demoPartner, setDemoPartner] = useState(null) // DEMO: pretend-match with a filler person
  const demoRows = useMemo(() => (DEMO ? demoQueue() : []), []) // DEMO

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_queue')
      .select('*, profiles!study_queue_user_id_fkey(display_name, avatar_path, color, frame)')
      .order('joined_at')
    if (error) setError(error.message)
    else setRows(data)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 8000)
    return () => clearInterval(id)
  }, [load])

  async function act(promise) {
    setError('')
    const { error } = await promise
    if (error) setError(error.message)
    load()
  }

  const me = rows.find(r => r.user_id === user.id)
  const partner = (me && demoPartner) // DEMO: was only the second branch
    || (me?.matched_with ? rows.find(r => r.user_id === me.matched_with) : null)
  const open = [...demoRows, ...rows] // DEMO: was `rows`
    .filter(r => r.user_id !== user.id && !r.matched_with && r.user_id !== demoPartner?.user_id
      && Date.now() - new Date(r.joined_at) < STALE_MS)

  const join = e => {
    e.preventDefault()
    act(supabase.from('study_queue').insert({
      user_id: user.id, role, room: role === 'have_room' ? room.trim() : '', note: note.trim(),
    }))
  }
  const bothNeedRoom = me && partner && me.role === 'need_room' && partner.role === 'need_room'
  const partnerHasRoom = partner?.role === 'have_room'
  const leave = () => { setDemoPartner(null); act(supabase.rpc('leave_study_queue')) }
  const endMatch = () => (demoPartner ? setDemoPartner(null) : act(supabase.rpc('unmatch_study_buddy')))

  return (
    <div className="two">
      <div className="col">
        <section className={'card' + (me && !partner ? '' : ' fill')}>
          <h2>
            Study Buddy
            {me && <span className="status-chip">{partner ? 'Matched' : 'Open to group studying'}</span>}
          </h2>

          {!me && (
            <form className="stack" onSubmit={join}>
              <p className="muted">Join the queue so friends can see you're up for studying together.</p>
              <label className="radio">
                <input type="radio" checked={role === 'need_room'} onChange={() => setRole('need_room')} />
                I need a room (find one with a buddy)
              </label>
              <label className="radio">
                <input type="radio" checked={role === 'have_room'} onChange={() => setRole('have_room')} />
                I have a study room and can host others
              </label>
              {role === 'have_room' && (
                <input value={room} maxLength={60} placeholder="Where? e.g. Jenks 421"
                  onChange={e => setRoom(e.target.value)} required />
              )}
              <input value={note} maxLength={80} placeholder="What are you studying? (optional)"
                onChange={e => setNote(e.target.value)} />
              <button type="submit">Open to group studying</button>
            </form>
          )}

          {me && !partner && (
            <div className="stack">
              <p>
                You're in the queue: <strong>{ROLE_LABEL[me.role]}</strong>
                {me.room ? ` · ${me.room}` : ''}. Pick someone from the list to study with, or wait for a friend to pick you.
              </p>
              <button className="secondary" onClick={leave}>Leave queue</button>
            </div>
          )}

          {partner && (
            <div className="stack grow">
              <ul className="buddies"><Person row={partner} /></ul>
              {partnerHasRoom && (
                <p className="match-note">Meet <strong>{partner.profiles?.display_name}</strong> at <strong>{partner.room || 'their room'}</strong>.</p>
              )}
              {me.role === 'have_room' && (
                <p className="match-note">Your buddy is coming to <strong>{me.room || 'your room'}</strong>.</p>
              )}
              {bothNeedRoom && (
                <>
                  <div className="row between">
                    <strong>Find a Gordon study room</strong>
                    <a href={BOOKING_URL} target="_blank" rel="noreferrer">Open in new tab ↗</a>
                  </div>
                  <iframe className="embed" title="Jenks Library study rooms" src={BOOKING_URL} />
                  <form className="row" onSubmit={e => {
                    e.preventDefault()
                    act(supabase.from('study_queue').update({ role: 'have_room', room: bookedRoom.trim() }).eq('user_id', user.id))
                  }}>
                    <input value={bookedRoom} maxLength={60} placeholder="Booked one? Room name, e.g. Jenks 311"
                      onChange={e => setBookedRoom(e.target.value)} required />
                    <button type="submit">Tell my buddy</button>
                  </form>
                </>
              )}
              <div className="row">
                <button className="secondary" onClick={endMatch}>End match</button>
                <button className="secondary" onClick={leave}>Leave queue</button>
              </div>
            </div>
          )}
          {error && <p className="warn">{error}</p>}
        </section>
      </div>

      <section className="card fill">
        <h2>Open to study now</h2>
        {open.length === 0 && <p className="muted">Nobody else is in the queue right now.</p>}
        <ul className="buddies scroll">
          {open.map(r => (
            <Person key={r.user_id} row={r}>
              <button disabled={!me || !!partner} title={me ? '' : 'Join the queue first'}
                onClick={() => (isDemoId(r.user_id) // DEMO
                  ? setDemoPartner(r)
                  : act(supabase.rpc('match_study_buddy', { other: r.user_id })))}>
                Study together
              </button>
            </Person>
          ))}
        </ul>
      </section>
    </div>
  )
}
