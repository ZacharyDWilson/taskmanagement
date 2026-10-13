import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// A pop-up that holds the options for one customization. Rendered into <body> so a blurred, animated
// ancestor can't trap the fixed-position overlay.
export default function PickerModal({ title, hint, onClose, children }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal card stack picker-modal" role="dialog" aria-label={title}>
        <div className="row between">
          <h2>{title}</h2>
          <button type="button" className="secondary" onClick={onClose}>Done</button>
        </div>
        {hint && <p className="muted small">{hint}</p>}
        {children}
      </div>
    </div>,
    document.body,
  )
}
