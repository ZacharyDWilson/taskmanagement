import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useSound } from '../lib/sfx.jsx'
import { useMusic } from '../lib/music.jsx'
import { usernameProblem } from '../lib/username.js'
import { COLLEGES, collegeFromEmail } from '../lib/colleges.js'

// ---- The welcome splash ------------------------------------------------------------------------
// A little world of friends: a slowly turning globe, with faces and local times around it.
// Shown the first time someone lands on the login page in a browser session.
const PLACES = [
  { city: 'Vancouver', tz: 'America/Vancouver', hue: '#e0568a' },
  { city: 'Sydney',    tz: 'Australia/Sydney',  hue: '#3b82f6' },
  { city: 'Tokyo',     tz: 'Asia/Tokyo',        hue: '#f59e0b' },
  { city: 'Moscow',    tz: 'Europe/Moscow',     hue: '#8b5cf6' },
  { city: 'London',    tz: 'Europe/London',     hue: '#10b981' },
  { city: 'New York',  tz: 'America/New_York',  hue: '#ef4444' },
]
const timeIn = (tz, now) => {
  try { return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(now) }
  catch { return '' }
}

const SEEN = 'lock-in-splash-seen'
const alreadySeen = () => { try { return sessionStorage.getItem(SEEN) === '1' } catch { return true } }

function Splash({ onDone }) {
  const sound = useSound()
  const { play } = sound
  const music = useMusic()
  const [now, setNow] = useState(() => new Date())
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

  const enter = () => {
    if (leaving) return
    setLeaving(true)
    music.setPhase('quiet')
    play('intro')
    setTimeout(onDone, 750)
  }
  // Moves on by itself after a few seconds, or as soon as you tap.
  useEffect(() => {
    const t = setTimeout(enter, 6500)
    const key = e => { if (e.key === 'Enter' || e.key === ' ') enter() }
    window.addEventListener('keydown', key)
    return () => { clearTimeout(t); window.removeEventListener('keydown', key) }
  }, []) // eslint-disable-line

  // The background music is a little louder on the splash, then settles to a quiet bed once you're past it.
  useEffect(() => {
    music.setPhase('splash')
    return () => music.setPhase('quiet')
  }, []) // eslint-disable-line

  const stars = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    left: `${6 + ((i * 37) % 88)}%`, top: `${8 + ((i * 53) % 78)}%`, size: 18 + (i % 4) * 8, delay: -i * 1.3, dur: 5 + (i % 3) * 2,
  })), [])

  return createPortal(
    <div className={'splash' + (leaving ? ' leaving' : '')} onClick={enter} role="button" tabIndex={0} aria-label="Enter LOCK IN">
      {stars.map((s, i) => (
        <span key={i} className="splash-star" style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
      ))}
      <div className="splash-title">LOCK IN</div>
      <div className="globe-wrap">
        <div className="globe" aria-hidden="true">
          <div className="globe-map" />
          <div className="globe-shade" />
        </div>
        <div className="globe-time">{timeIn(undefined, now)}</div>
        {PLACES.map((p, i) => {
          const a = (i / PLACES.length) * 2 * Math.PI - Math.PI / 2
          const r = 50   // percent of the wrap, from its centre
          return (
            <div key={p.city} className="splash-place"
              style={{ left: `${50 + Math.cos(a) * r}%`, top: `${50 + Math.sin(a) * r}%`, animationDelay: `${0.15 * i}s`, '--hue': p.hue, '--side': Math.cos(a) >= 0 ? 1 : -1 }}>
              <span className="face"><i /><i /><b /></span>
              <span className="label"><small>{p.city}</small><strong>{timeIn(p.tz, now)}</strong></span>
            </div>
          )
        })}
      </div>
      <div className="splash-hint">Tap to enter</div>
    </div>,
    document.body,
  )
}

export default function Login({ preview = false }) {
  const [name, setName] = useState('')          // display name
  const [username, setUsername] = useState('')  // first and last name
  const [college, setCollege] = useState('')
  const [collegeTouched, setCollegeTouched] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [mode, setMode] = useState('login')
  const [msg, setMsg] = useState('')
  const [splash, setSplash] = useState(() => preview || !alreadySeen())
  const navigate = useNavigate()

  const finishSplash = () => {
    if (!preview) { try { sessionStorage.setItem(SEEN, '1') } catch { /* ignore */ } }
    setSplash(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!supabase) return setMsg('Supabase is not configured.')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return setMsg(error.message)
      navigate('/')
    } else {
      const problem = usernameProblem(username)
      if (problem) return setMsg(problem)
      if (!college.trim()) return setMsg('Tell us which college you are from.')
      const free = await supabase.rpc('username_available', { name: username.trim() })
      if (free.data === false) return setMsg('That username is already taken. Add a number or a middle initial.')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim(), username: username.trim(), college: college.trim(), invite_code: inviteCode.trim() } },
      })
      if (error) {
        // The database rejects bad codes, which Supabase reports as a generic "Database error".
        return setMsg(/database error/i.test(error.message)
          ? "That invite code isn't right. Ask the friend who invited you for the code."
          : error.message)
      }
      if (data.session) navigate('/')
      else setMsg('Check your email to confirm your account, then log in.')
    }
  }

  return (
    <>
      {splash && <Splash onDone={finishSplash} />}
      <form onSubmit={submit} className="card narrow stack login-card">
        <div className="login-brand">LOCK IN</div>
        <h1>{mode === 'login' ? 'Log in' : 'Join the group'}</h1>
        {mode === 'signup' && (
          <>
            <label>Your name
              <input placeholder="First and last name, e.g. Jane Doe" value={username} maxLength={40} autoComplete="name"
                onChange={e => setUsername(e.target.value)} required />
              <small className="muted">This is your username. Use your real first and last name: Jane Doe, jane.doe or JaneDoe.</small>
            </label>
            <label>Display name
              <input placeholder="What should we call you?" value={name} maxLength={40}
                onChange={e => setName(e.target.value)} required />
              <small className="muted">Shown around the app. It can be anything you like.</small>
            </label>
          </>
        )}
        <input type="email" placeholder="Email" value={email} required
          onChange={e => {
            setEmail(e.target.value)
            // A school email fills in the college for you (until you type your own).
            if (mode === 'signup' && !collegeTouched) setCollege(collegeFromEmail(e.target.value))
          }} />
        {mode === 'signup' && (
          <label>College
            <input list="college-list" placeholder="Start typing your college" value={college} maxLength={80}
              onChange={e => { setCollege(e.target.value); setCollegeTouched(true) }} required />
            <datalist id="college-list">{COLLEGES.map(c => <option key={c} value={c} />)}</datalist>
            <small className="muted">
              {collegeFromEmail(email) && college === collegeFromEmail(email)
                ? 'Picked from your school email. Change it if that is wrong.'
                : 'Friends will see this on your profile. A .edu email fills it in for you.'}
            </small>
          </label>
        )}
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          required minLength={6} />
        {mode === 'signup' && (
          <input placeholder="Invite code" value={inviteCode} autoComplete="off"
            onChange={e => setInviteCode(e.target.value)} required />
        )}
        <button type="submit">{mode === 'login' ? 'Log in' : 'Create account'}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
        </button>
        {msg && <p>{msg}</p>}
      </form>
    </>
  )
}
