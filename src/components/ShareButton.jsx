import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useToast } from '../lib/toast.jsx'

// "Share to feed": makes a card on the feed from something real (a badge you earned, or your study time).
// Nothing is posted by the first press: it shows what will be posted and waits for "Post to feed".
// The numbers are added up by the database itself, so a card can't be made up.
//   card: 'achievement' (ref = achievement id) | 'study_day' | 'study_week'   since: when your day/week began
//   preview: a short line describing the card, shown in the confirmation
export default function ShareButton({ card, refId = null, since = null, preview = '', children, className = 'secondary', title }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)

  async function share() {
    setBusy(true)
    const { error } = await supabase.rpc('share_to_feed', { card, ref: refId, since })
    setBusy(false)
    setAsking(false)
    if (error) return toast(error.message, 'info')
    toast('✓ Shared to your feed', 'xp')
    navigate('/feed')
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setAsking(true)} title={title ?? 'Post this to the feed'}>
        {children}
      </button>
      {asking && (
        <div className="modal-backdrop" onClick={() => !busy && setAsking(false)}>
          <div className="modal card stack" role="dialog" aria-modal="true" aria-label="Share to the feed" onClick={e => e.stopPropagation()}>
            <h2>Post this to the feed?</h2>
            {preview && <p className="share-preview">{preview}</p>}
            <p className="muted small">Everyone in the group will see it. You can delete it from the feed afterwards.</p>
            <div className="row between">
              <button type="button" className="secondary" disabled={busy} onClick={() => setAsking(false)}>Cancel</button>
              <button type="button" disabled={busy} onClick={share}>{busy ? 'Posting…' : 'Post to feed'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
