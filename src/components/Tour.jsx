import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { useShop } from '../lib/shop.jsx'
import Icon from './Icon.jsx'

// A short, hands-on welcome tour for brand-new accounts. It walks through the real pages, spotlighting
// the parts that matter, and you can keep using the page while it is open. Shows once (per person, per
// device) in the first week of an account, and can be replayed from My Profile.
//
// `target` is a list of selectors: the first one found on the page gets the spotlight.
const STEPS = [
  { emoji: '🔒', title: 'Welcome to LOCK IN',
    text: 'A calm place to plan your work, focus, and keep up with friends. Let me show you around. It takes about a minute.' },
  { target: ['.dock', '.tabbar'], title: 'Your toolbar',
    text: 'This is how you move around. On a computer it runs down the left side of the screen; on a phone it sits along the bottom. Home, To Do, Feed, Study, and Me (your profile).' },
  { route: '/', target: ['.overview .card'], title: 'Home',
    text: 'Your week at a glance: hours studied, what is due today, and the friends leaderboard. It always fits on one screen.' },
  { route: '/todo', target: ['.todo .planner', '.todo'], title: 'To Do',
    text: 'Add a task, then drag it onto a day to plan your week. Click a task to add its class, due date and notes. Finishing one earns XP.',
    tryIt: 'Try it: drag a task onto a day.' },
  { route: '/feed', target: ['form.card'], title: 'Feed',
    text: 'Share a photo of your progress with a short caption. Friends can react with an emoji or leave a comment.' },
  { route: '/study', target: ['.pomodoro'], title: 'The focus timer',
    text: 'Start a focus round and your time is logged automatically. Prefer a stopwatch? Switch to Count up: it runs all day and saves your total as study time at midnight.',
    tryIt: 'Try it: press Start.' },
  { route: '/study', target: ['.buddy-panel'], title: 'Study with a friend',
    text: 'Open yourself up to study together. When someone matches with you, a pop-up appears and you get a notification.' },
  { route: '/profile', target: ['.customize'], title: 'Make it yours',
    text: 'Pick a page theme, a picture frame and a banner. XP raises your level and earns coins to spend in the Shop. Choose your free starter theme there first.' },
  { target: ['.settings-btn'], title: 'Settings',
    text: 'Sounds, calm mode (less motion, better for older phones), notifications and installing the app are all here, top left.' },
  { target: ['.help-btn'], title: 'Help on every page',
    text: 'Stuck? This ? button explains the page you are on, step by step, and can replay this tour. That is it. Welcome in.' },
]

const keyFor = id => `lock-in-tour-${id}`
const seen = id => { try { return localStorage.getItem(keyFor(id)) === '1' } catch { return true } }
const markSeen = id => { try { localStorage.setItem(keyFor(id), '1') } catch { /* ignore */ } }

export const replayTour = () => window.dispatchEvent(new Event('lock-in:tour'))

// True while a brand-new account still has its first tour ahead of it (or is in it). The community rules wait for this.
export const tourPending = user => {
  if (!user) return false
  const ageDays = (Date.now() - new Date(user.created_at ?? 0).getTime()) / 86400000
  return !seen(user.id) && ageDays < 7
}
export const TOUR_CLOSED_EVENT = 'lock-in:tour-closed'

const PAD = 8
// the first matching element that is actually on screen (the left toolbar and the phone tab bar are never both shown)
const pickVisible = sels => sels.map(s => document.querySelector(s)).find(el => el && el.getBoundingClientRect().width > 0)

export default function Tour({ preview = false }) {
  const auth = useAuth()
  const shop = useShop()
  // the intro build runs the tour with no account at all
  const user = preview ? { id: 'preview', created_at: new Date().toISOString() } : auth.user
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)       // the spotlighted element's box, or null
  const [tipH, setTipH] = useState(190)
  const tip = useRef(null)

  // Brand-new accounts: show once, during the first week.
  useEffect(() => {
    if (!user || preview) return
    if (!shop.starterChosen) return          // pick Light or Dark first, then the tour
    const ageDays = (Date.now() - new Date(user.created_at ?? 0).getTime()) / 86400000
    if (!seen(user.id) && ageDays < 7) { setI(0); setOpen(true) }
  }, [user?.id, shop.starterChosen]) // eslint-disable-line

  useEffect(() => {
    const again = () => { setI(0); setOpen(true) }
    window.addEventListener('lock-in:tour', again)
    return () => window.removeEventListener('lock-in:tour', again)
  }, [])

  const step = STEPS[i]

  // Take you to the page this step is about.
  useEffect(() => {
    if (open && step.route && step.route !== pathname) navigate(step.route)
  }, [open, i]) // eslint-disable-line

  // Find the target (the page may still be loading) and keep its box up to date.
  // Only ever replaces the box when it really moved, and keeps the last box while the page is still loading.
  // (Swapping between "no box" and "a box", or setting a new object every tick, made the whole screen flicker.)
  const measure = useCallback(() => {
    if (!step.target) { setRect(null); return }
    const el = pickVisible(step.target)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return
    const next = { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }
    setRect(prev => (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height ? prev : next))
  }, [step])

  useEffect(() => {
    if (!open) return
    let scrolled = false
    const tick = () => {
      measure()
      if (!scrolled) {
        const el = step.target ? pickVisible(step.target) : null
        if (el) {
          const b = el.getBoundingClientRect()
          const visible = b.top >= 56 && b.bottom <= window.innerHeight - 90
          if (!visible) el.scrollIntoView({ block: 'center', behavior: 'auto' })   // jump, don't glide: a glide fights the box
          scrolled = true
        }
      }
    }
    tick()
    const id = setInterval(tick, 250)
    window.addEventListener('resize', measure)
    return () => { clearInterval(id); window.removeEventListener('resize', measure) }
  }, [open, i, measure]) // eslint-disable-line

  useLayoutEffect(() => {
    if (!tip.current) return
    const h = tip.current.offsetHeight
    setTipH(prev => (prev === h ? prev : h))
  })

  if (!open || !user) return null
  const last = i === STEPS.length - 1
  const close = () => {
    if (!preview) markSeen(user.id)
    setOpen(false)
    window.dispatchEvent(new Event(TOUR_CLOSED_EVENT))
  }
  const go = n => setI(Math.max(0, Math.min(STEPS.length - 1, n)))

  const vw = window.innerWidth, vh = window.innerHeight
  const tipW = Math.min(360, vw - 24)
  let tipStyle
  if (!rect) {
    tipStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: tipW }
  } else {
    const tall = rect.height > vh * .5
    const below = rect.top + rect.height + PAD + 14 + tipH < vh
    const above = rect.top - PAD - 14 - tipH > 8
    let top
    if (tall || (!below && !above)) top = vh - tipH - 16        // big targets: park the note at the bottom
    else top = below ? rect.top + rect.height + PAD + 14 : rect.top - PAD - 14 - tipH
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - tipW / 2), vw - tipW - 12)
    tipStyle = { left, top, width: tipW }
  }

  return createPortal(
    <>
      {rect
        ? <div className="tour-spot" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
        : <div className="tour-dim" />}
      <div className="tour-tip card" ref={tip} style={tipStyle} role="dialog" aria-label="Welcome tour">
        <div className="tour-head">
          <span className="tour-art" aria-hidden="true">
            {step.emoji ? step.emoji : <Icon name={{ '/': 'overview', '/todo': 'todo', '/feed': 'feed', '/study': 'timer' }[step.route] ?? 'overview'} size={22} />}
          </span>
          <h2>{step.title}</h2>
          <span className="tour-count">{i + 1}/{STEPS.length}</span>
        </div>
        <p>{step.text}</p>
        {step.tryIt && <p className="tour-try">{step.tryIt}</p>}
        <div className="tour-dots" aria-hidden="true">
          {STEPS.map((_, n) => <span key={n} className={n === i ? 'on' : ''} />)}
        </div>
        <div className="row between">
          {last ? <span /> : <button type="button" className="link" onClick={close}>Skip tour</button>}
          <div className="row">
            {i > 0 && <button type="button" className="secondary" onClick={() => go(i - 1)}>Back</button>}
            {!last && <button type="button" onClick={() => go(i + 1)}>{i === 0 ? 'Show me' : 'Next'}</button>}
            {last && <button type="button" className="secondary" onClick={() => { close(); navigate('/shop') }}>Open the Shop</button>}
            {last && <button type="button" onClick={close}>Let's go</button>}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
