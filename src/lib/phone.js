import { useEffect, useState } from 'react'

// true on a phone-sized screen (700px or narrower); updates when the window is resized or rotated
export function usePhone() {
  const q = '(max-width: 700px)'
  const [on, setOn] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const m = matchMedia(q)
    const f = () => setOn(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return on
}
