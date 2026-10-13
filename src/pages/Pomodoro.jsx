import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { usePomodoro, mmss, hms } from '../lib/pomodoro.jsx'
import { fmtMinutes, startOfWeek } from '../lib/dates.js'
import Leaderboard from '../components/Leaderboard.jsx'
import TimerFace from '../components/TimerFace.jsx'
import PickerModal from '../components/PickerModal.jsx'
import { TIMER_STYLES, timerItemId, useTimerStyle } from '../lib/timerStyles.js'
import { useShop } from '../lib/shop.jsx'
import { useToast } from '../lib/toast.jsx'
import { Link } from 'react-router-dom'
import { IS_ADMIN } from '../lib/env.js'
import BuddyPanel, { Person } from '../components/BuddyPanel.jsx'
import ShareButton from '../components/ShareButton.jsx'
import { useStudyBuddy } from '../lib/studyBuddy.js'

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || lo))

export default function Study() {
  const { user } = useAuth()
  const p = usePomodoro()
  const [sessions, setSessions] = useState([])
  const shop = useShop()
  const toast = useToast()
  const timerStyle = useTimerStyle(shop.owned, IS_ADMIN)
  const priceOf = s => shop.items.find(i => i.id === timerItemId(s.id))?.price
  const [pickStyle, setPickStyle] = useState(false)
  const buddy = useStudyBuddy()
  const locked = TIMER_STYLES.filter(s => !timerStyle.unlocked(s))
  async function buyStyle(s) {
    const err = await shop.buy(timerItemId(s.id))
    if (err) toast(err)
    else { toast('You bought the ' + s.name + ' timer!', 'xp'); timerStyle.choose(s.id) }
  }

  useEffect(() => {
    supabase
      .from('study_sessions')
      .select('id, minutes, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfWeek().toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => setSessions(data ?? []))
  }, [user.id, p.logged])

  const todayKey = new Date().toDateString()
  const today = sessions.filter(s => new Date(s.created_at).toDateString() === todayKey)
  const sum = list => list.reduce((n, s) => n + s.minutes, 0)

  return (
    <div className="dash overview study">
      <div className="col">
      <section className="card pomodoro center">
        <h1>Study</h1>
        <div className="tabs kind-tabs" role="tablist" aria-label="Timer type">
          <button type="button" role="tab" aria-selected={p.kind === 'pomodoro'} className={p.kind === 'pomodoro' ? 'active' : ''} onClick={() => p.setKind('pomodoro')}>Pomodoro</button>
          <button type="button" role="tab" aria-selected={p.kind === 'countup'} className={p.kind === 'countup' ? 'active' : ''} onClick={() => p.setKind('countup')}>Count up</button>
        </div>
        {p.kind === 'countup' ? (
          <div className="countup stack center">
            <p className="muted small">Counts up through the day. Pause and resume as you like. At midnight the day's total is saved as study time (that is where the XP comes from) and the clock starts again at zero.</p>
            {timerStyle.current.id === 'plain'
              ? <div className={'countup-clock' + (p.cuRunning ? ' running' : '')} aria-live="off">{hms(p.cuElapsedMs)}</div>
              : <TimerFace styleId={timerStyle.current.id} countUp elapsedMs={p.cuElapsedMs} mode="focus" running={p.cuRunning} />}
            <small className="muted">{p.cuMinutes} min counted today{p.cuMinutes >= p.maxDayMin ? ' (the daily limit)' : ''}</small>
            <div className="row">
              <button onClick={p.cuStartPause}>{p.cuRunning ? 'Pause' : p.cuElapsedMs > 0 ? 'Resume' : 'Start'}</button>
              <button className="secondary" onClick={p.cuReset} disabled={p.cuElapsedMs === 0}>Reset</button>
              {p.cuMinutes >= 1 && <button className="secondary" onClick={p.cuLogNow}>Save {p.cuMinutes}m now</button>}
            </div>
            {p.msg && <p className="muted">{p.msg}</p>}
            <small className="muted">Up to {Math.round(p.maxDayMin / 60)} hours count for one day.</small>
          </div>
        ) : (<>
        <div className="tabs">
          <button className={p.mode === 'focus' ? 'active' : ''} onClick={() => p.switchMode('focus')}>Focus</button>
          <button className={p.mode === 'break' ? 'active' : ''} onClick={() => p.switchMode('break')}>Break</button>
        </div>
        {p.finished && (
          <div className="celebrate" role="status">
            <span className="confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</span>
            <strong>🎉 Focus session complete!</strong>
            <span>{p.finished.minutes} min logged. Press <b>Start</b> to begin your {p.breakMin} min break.</span>
          </div>
        )}
        <TimerFace styleId={timerStyle.current.id} left={p.left} total={p.total} mode={p.mode} running={p.running} />
        <div className="row">
          <button className={p.finished && !p.running ? 'pulse-cta' : ''} onClick={p.startPause}>{p.running ? 'Pause' : p.left < p.total ? 'Resume' : p.finished ? 'Start break' : 'Start'}</button>
          <button className="secondary" onClick={() => { p.clearFinished(); p.switchMode(p.mode) }}>Reset</button>
          {p.mode === 'focus' && p.elapsedMin >= 1 && (
            <button className="secondary" onClick={p.finishEarly}>Finish &amp; log {p.elapsedMin}m</button>
          )}
        </div>
        <div className="row small">
          <label>Focus <input type="number" min="1" max="120" value={p.focusMin} disabled={p.running}
            onChange={e => p.setFocusMin(clamp(e.target.value, 1, 120))} /> min</label>
          <label>Break <input type="number" min="1" max="60" value={p.breakMin} disabled={p.running}
            onChange={e => p.setBreakMin(clamp(e.target.value, 1, 60))} /> min</label>
        </div>
        {p.msg && <p className="muted">{p.msg}</p>}
        </>)}
        <button type="button" className="secondary timer-style-btn" onClick={() => setPickStyle(true)}>
          Timer style: <strong>{timerStyle.current.name}</strong> ›
        </button>
        {locked.length > 0 && <small className="muted">{locked.length} more timer style{locked.length === 1 ? '' : 's'} in the <Link to="/shop">Shop</Link></small>}
      </section>

      </div>

      <div className="col">
        <BuddyPanel buddy={buddy} />
        <section className="card fill">
          <h2>Open to study now</h2>
          {buddy.open.length === 0 && <p className="muted">Nobody else is open right now.</p>}
          <ul className="buddies scroll">
            {buddy.open.map(r => (
              <Person key={r.user_id} row={r}>
                <button disabled={!buddy.me || !!buddy.partner} title={buddy.me ? '' : 'Open to study together first'}
                  onClick={() => buddy.pick(r)}>Study together</button>
              </Person>
            ))}
          </ul>
        </section>

      </div>

      {pickStyle && (
        <PickerModal title="Timer style" hint={`Buy more ways to watch the clock with coins. You have ${shop.balance} coins.`} onClose={() => setPickStyle(false)}>
          <div className="styles timer-styles">
            {TIMER_STYLES.map(s => {
              const open = timerStyle.unlocked(s)
              return (
                <button key={s.id} type="button" disabled={!open && (priceOf(s) ?? 0) > shop.balance}
                  className={'style-opt' + (timerStyle.current.id === s.id ? ' on' : '')}
                  onClick={() => (open ? (timerStyle.choose(s.id), setPickStyle(false)) : buyStyle(s))}>
                  <span className="timer-thumb"><TimerFace styleId={s.id} left={p.total * 0.4} total={p.total} mode="focus" running={false} small /></span>
                  <span>{s.name}</span>
                  <small>{open ? s.blurb : priceOf(s) == null ? 'In the Shop' : `Buy · 🪙 ${priceOf(s)}`}</small>
                </button>
              )
            })}
          </div>
        </PickerModal>
      )}


      <div className="col">
        <Leaderboard version={p.logged} />

        <section className="card fill">
          <h2>Your focus time</h2>
          <div className="stats">
            <div><strong>{fmtMinutes(sum(today))}</strong><span>today</span></div>
            <div><strong>{fmtMinutes(sum(sessions))}</strong><span>this week</span></div>
            <div><strong>{today.length}</strong><span>sessions today</span></div>
          </div>
          {today.length === 0 && <p className="muted">No sessions yet today. Start your first one!</p>}
          {sessions.length > 0 && (
            <div className="share-row">
              {today.length > 0 && <ShareButton card="study_day" preview={`⏱️ Studied ${fmtMinutes(sum(today))} today (${today.length} session${today.length === 1 ? '' : 's'})`} since={(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString() })()}>📣 Share today</ShareButton>}
              <ShareButton card="study_week" preview={`⏱️ Studied ${fmtMinutes(sum(sessions))} this week`} since={startOfWeek().toISOString()}>📣 Share this week</ShareButton>
            </div>
          )}
          <ul className="list scroll">
            {today.map(s => (
              <li key={s.id}>
                <span>{new Date(s.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                <strong>{s.minutes} min</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
