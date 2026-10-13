import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useToast } from '../lib/toast.jsx'
import { REPORT_REASONS } from '../lib/terms.js'
import PickerModal from './PickerModal.jsx'

// A small "Report" link for someone else's post or comment. Reports go to the admin only.
export default function ReportButton({ postId = null, commentId = null, className = 'link' }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    const why = note.trim() ? `${reason}: ${note.trim()}` : reason
    const { error } = await supabase.rpc('submit_report', { post: postId, comment: commentId, why })
    setBusy(false)
    if (error) return toast(error.message)
    setOpen(false); setNote('')
    toast('Thanks. The admin will take a look.', 'info', { silent: true })
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} title="Tell the admin this breaks the rules">report</button>
      {open && (
        <PickerModal title="Report this" hint="Only the admin sees your report. Pick what fits best." onClose={() => setOpen(false)}>
          <div className="stack">
            {REPORT_REASONS.map(r => (
              <label key={r} className="row">
                <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
              </label>
            ))}
            <input value={note} maxLength={200} placeholder="Anything else the admin should know? (optional)" onChange={e => setNote(e.target.value)} />
            <div className="row">
              <button type="button" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
              <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </PickerModal>
      )}
    </>
  )
}
