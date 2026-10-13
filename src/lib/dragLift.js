// When you drag a task, the card itself is "picked up": it lifts with a little 3D tilt, follows the
// pointer and leans into the direction you move, then settles when you drop it.
// The normal HTML drag-and-drop still decides where it lands; this only replaces the ghost image.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export function installDragLift() {
  if (typeof document === 'undefined' || window.__dragLift) return
  window.__dragLift = true
  const blank = new Image()
  blank.src = BLANK

  let ghost = null, source = null, raf = 0
  let grab = { x: 0, y: 0 }                 // where inside the card you grabbed it
  let pos = { x: 0, y: 0 }                  // pointer position
  let prev = { x: 0, y: 0 }
  let tilt = { x: 0, y: 0 }                 // current lean, eased toward the target each frame
  let target = { x: 0, y: 0 }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

  function frame() {
    if (!ghost) return
    // lean into the motion, then relax back to flat
    target.y = clamp((pos.x - prev.x) * .9, -16, 16)
    target.x = clamp(-(pos.y - prev.y) * .9, -16, 16)
    prev = { ...pos }
    tilt.x += (target.x - tilt.x) * .22
    tilt.y += (target.y - tilt.y) * .22
    ghost.style.transform =
      `translate3d(${pos.x - grab.x}px, ${pos.y - grab.y}px, 0) perspective(800px) rotateX(${tilt.x + 4}deg) rotateY(${tilt.y}deg)`
    raf = requestAnimationFrame(frame)
  }

  function move(e) {
    if (!ghost || (e.clientX === 0 && e.clientY === 0)) return
    pos = { x: e.clientX, y: e.clientY }
  }

  function end() {
    if (!ghost) return
    cancelAnimationFrame(raf)
    const g = ghost
    g.classList.remove('lifted')
    g.classList.add('landing')
    setTimeout(() => g.remove(), 220)
    source?.classList.remove('is-dragging')
    ghost = null; source = null
  }

  document.addEventListener('dragstart', e => {
    const el = e.target instanceof Element ? e.target.closest('.task') : null
    if (!el || !e.dataTransfer) return
    try { e.dataTransfer.setDragImage(blank, 0, 0) } catch { return }
    const r = el.getBoundingClientRect()
    ghost = el.cloneNode(true)
    ghost.removeAttribute('draggable')
    ghost.classList.add('drag-ghost')
    ghost.style.width = `${r.width}px`
    ghost.style.minHeight = `${r.height}px`
    document.body.appendChild(ghost)
    grab = { x: e.clientX - r.left, y: e.clientY - r.top }
    pos = { x: e.clientX, y: e.clientY }
    prev = { ...pos }
    tilt = { x: 0, y: 0 }
    ghost.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`
    source = el
    setTimeout(() => source?.classList.add('is-dragging'), 0)   // after the browser has taken its snapshot
    requestAnimationFrame(() => ghost?.classList.add('lifted'))
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(frame)
  }, true)

  document.addEventListener('dragover', move, true)
  document.addEventListener('drag', move, true)
  document.addEventListener('dragend', end, true)
  document.addEventListener('drop', end, true)
}
