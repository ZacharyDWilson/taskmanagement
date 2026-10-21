import { useEffect, useState } from 'react'

// An installed app (or a tab left open) keeps running the version it loaded. This quietly checks whether a newer
// version has been published, when you come back to the app and every few minutes, and offers a one-tap update.
// Only in the real (built) site: the local dev server updates itself.
const bundleOf = html => html.match(/assets\/index-[\w-]+\.js/)?.[0] ?? null

export default function UpdateNotice() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!import.meta.env.PROD) return
    const mine = document.querySelector('script[type="module"][src*="assets/index-"]')?.getAttribute('src')?.match(/assets\/index-[\w-]+\.js/)?.[0]
    if (!mine) return
    let stopped = false
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return
      try {
        const res = await fetch(import.meta.env.BASE_URL + 'index.html?v=' + Date.now(), { cache: 'no-store' })
        if (!res.ok) return
        const theirs = bundleOf(await res.text())
        if (theirs && theirs !== mine) setReady(true)
      } catch { /* offline: try again later */ }
    }
    check()
    const id = setInterval(check, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', check)
    return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', check) }
  }, [])

  if (!ready) return null
  const update = async () => {
    try {   // drop the old saved copies, then load the new version
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
      const regs = await navigator.serviceWorker?.getRegistrations?.()
      await Promise.all((regs ?? []).map(r => r.update().catch(() => {})))
    } catch { /* fine */ }
    location.reload()
  }
  return (
    <div className="update-notice" role="status">
      <span>A new version of LOCK IN is ready.</span>
      <button type="button" onClick={update}>Update now</button>
    </div>
  )
}
