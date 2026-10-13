import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { TERMS, TERMS_VERSION } from '../lib/terms.js'

// Asks everyone to read and accept the community rules once (and again if they change). Until then the rest of the
// site stays behind this note. Shown after sign-in; the rules page itself is always reachable.
export default function TermsGate() {
  const { user } = useAuth()
  const [needs, setNeeds] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user || !supabase) return
    let live = true
    supabase.from('profiles').select('tos_version').eq('id', user.id).maybeSingle().then(({ data, error }) => {
      if (!live || error) return                       // the column is not there yet: do not block anyone
      setNeeds((data?.tos_version ?? 0) < TERMS_VERSION)
    })
    return () => { live = false }
  }, [user?.id])

  if (!needs) return null

  async function accept() {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('accept_terms', { v: TERMS_VERSION })
    setBusy(false)
    if (error) return setErr(error.message)
    setNeeds(false)
  }

  return (
    <div className="modal-backdrop terms-gate">
      <div className="modal card stack" role="dialog" aria-modal="true" aria-label="Community rules">
        <h2>Before you start: the community rules</h2>
        <p className="muted small">A short version. The full text is on the <Link to="/terms" target="_blank">rules page</Link>.</p>
        <ul className="terms-short">
          <li><strong>Be kind.</strong> No harassment, bullying, or hate.</li>
          <li><strong>Keep it about the work.</strong> No spam, ads, or outside links.</li>
          <li><strong>Post only suitable photos</strong> that are yours, with no private details.</li>
          <li><strong>Be honest.</strong> No exam answers or cheating, and no gaming the XP system.</li>
          <li><strong>Breaking the rules</strong> can get posts removed, and accounts muted or banned from posting and commenting.</li>
        </ul>
        <details className="terms-full">
          <summary>Read all of it</summary>
          {TERMS.map(s => (
            <div key={s.title}><strong>{s.title}</strong>{s.body.map((p, i) => <p key={i} className="small">{p}</p>)}</div>
          ))}
        </details>
        {err && <p className="warn">{err}</p>}
        <button type="button" onClick={accept} disabled={busy}>{busy ? 'Saving…' : 'I agree'}</button>
      </div>
    </div>
  )
}
