import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useSound } from '../lib/sfx.jsx'
import { CUSTOM_SFX } from '../lib/customSfx.js'

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
  const audioStop = useRef(null)
  const [now, setNow] = useState(() => new Date())
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

  const enter = () => {
    if (leaving) return
    setLeaving(true)
    audioStop.current?.()
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

  // Optional loading music: put loading.mp3 (or .wav/.ogg) in src/assets/sfx/. It loops quietly and fades out on entry.
  useEffect(() => {
    const url = CUSTOM_SFX.loading
    if (!url || !sound.enabled) return
    const a = new Audio(url)
    a.loop = true
    a.volume = Math.min(1, sound.volume * .8)
    const start = () => a.play().catch(() => {})
    start()
    window.addEventListener('pointerdown', start, { once: true })
    window.addEventListener('keydown', start, { once: true })
    let fade
    const stop = () => {
      fade = setInterval(() => { a.volume = Math.max(0, a.volume - .08); if (a.volume <= 0) { clearInterval(fade); a.pause() } }, 60)
    }
    audioStop.current = stop
    return () => { window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start); clearInterval(fade); a.pause() }
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
  const [name, setName] = useState('')
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim(), invite_code: inviteCode.trim() } },
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
          <input placeholder="Display name" value={name} maxLength={40}
            onChange={e => setName(e.target.value)} required />
        )}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
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
