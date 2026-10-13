import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { TERMS, TERMS_VERSION } from '../lib/terms.js'

// Asks everyone to accept the community rules, one rule at a time. Each rule has to be read (a short pause) and agreed
// to on its own before the next one opens, and only then can the whole set be accepted. It shows after sign-in, and again
// if the rules change (TERMS_VERSION). Until then the rest of the site stays behind it.
const READ_SECONDS = 2        // a short, fixed pause on every rule
const readSeconds = () => READ_SECONDS

export default function TermsGate() {
  const { user } = useAuth()
  const [needs, setNeeds] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [step, setStep] = useState(0)                 // 0..TERMS.length-1 are the rules; TERMS.length is the final step
  const [agreed, setAgreed] = useState(() => TERMS.map(() => false))
  const [wait, setWait] = useState(0)                 // seconds left before this rule can be agreed to

  const last = step === TERMS.length
  const section = TERMS[step]
  const secs = useMemo(() => (section ? readSeconds(section) : 0), [section])

  useEffect(() => {
    if (!user || !supabase) return
    let live = true
    supabase.from('profiles').select('tos_version').eq('id', user.id).maybeSingle().then(({ data, error }) => {
      if (!live || error) return                       // the column is not there yet: do not block anyone
      setNeeds((data?.tos_version ?? 0) < TERMS_VERSION)
    })
    return () => { live = false }
  }, [user?.id])

  // every new rule starts with a short pause so it actually gets read
  useEffect(() => {
    if (!needs || last) return
    setWait(agreed[step] ? 0 : secs)
  }, [needs, step]) // eslint-disable-line
  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

  if (!needs) return null

  const allAgreed = agreed.every(Boolean)
  const setOne = (i, v) => setAgreed(a => a.map((x, n) => (n === i ? v : x)))

  async function accept() {
    if (!allAgreed) return
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('accept_terms', { v: TERMS_VERSION })
    setBusy(false)
    if (error) return setErr(error.message)
    setNeeds(false)
  }

  return (
    <div className="modal-backdrop terms-gate">
      <div className="modal card stack" role="dialog" aria-modal="true" aria-label="Community rules">
        <div className="row between">
          <h2>Community rules</h2>
          <span className="muted small">{last ? 'All done' : `${step + 1} of ${TERMS.length}`}</span>
        </div>
        <div className="terms-dots" aria-hidden="true">
          {TERMS.map((_, i) => <span key={i} className={(i === step ? 'on ' : '') + (agreed[i] ? 'done' : '')} />)}
        </div>

        {!last ? (
          <>
            <section className="terms-step">
              <h3>{section.title}</h3>
              {section.body.map((p, i) => <p key={i}>{p}</p>)}
            </section>
            <label className={'terms-check' + (wait > 0 ? ' disabled' : '')}>
              <input type="checkbox" checked={agreed[step]} disabled={wait > 0}
                onChange={e => setOne(step, e.target.checked)} />
              <span>I have read this and I agree to it{wait > 0 ? ` (take a moment to read: ${wait}s)` : ''}</span>
            </label>
            <div className="row between">
              <button type="button" className="secondary" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Back</button>
              <button type="button" onClick={() => setStep(s => s + 1)} disabled={!agreed[step]}>
                {step === TERMS.length - 1 ? 'Review' : 'Next rule'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>You have agreed to each of the {TERMS.length} parts of the community rules:</p>
            <ul className="terms-summary">
              {TERMS.map((s, i) => (
                <li key={s.title}>
                  <label><input type="checkbox" checked={agreed[i]} onChange={e => setOne(i, e.target.checked)} /> {s.title}</label>
                </li>
              ))}
            </ul>
            <p className="muted small">
              Breaking them can mean removed posts, a mute, or a ban from posting and commenting. The full text is always on the{' '}
              <Link to="/terms" target="_blank">rules page</Link>.
            </p>
            {err && <p className="warn">{err}</p>}
            <div className="row between">
              <button type="button" className="secondary" onClick={() => setStep(0)}>Read again</button>
              <button type="button" onClick={accept} disabled={busy || !allAgreed}>{busy ? 'Saving…' : 'I agree to all of these'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
