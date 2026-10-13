import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useToast } from '../lib/toast.jsx'

// "Share to feed": makes a card on the feed from something real (a badge you earned, or your study time).
// The numbers are added up by the database itself, so a card can't be made up.
//   card: 'achievement' (ref = achievement id) | 'study_day' | 'study_week'   since: when your day/week began
export default function ShareButton({ card, refId = null, since = null, children, className = 'secondary', title }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function share() {
    setBusy(true)
    const { error } = await supabase.rpc('share_to_feed', { card, ref: refId, since })
    setBusy(false)
    if (error) return toast(error.message, 'info')
    toast('✓ Shared to your feed', 'xp')
    navigate('/feed')
  }

  return (
    <button type="button" className={className} disabled={busy} onClick={share} title={title ?? 'Post this to the feed'}>
      {busy ? 'Sharing…' : children}
    </button>
  )
}
