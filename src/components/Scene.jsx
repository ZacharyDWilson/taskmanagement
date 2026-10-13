// The animated backdrop that shows through the glass. It's just empty shapes: each theme in
// styles.css decides what they look like and how they move (pollen, stars, petals, fireflies...).
// It sits behind everything, ignores the mouse, and stops moving for people who prefer less motion.
const PARTICLES = Array.from({ length: 14 }, (_, i) => i)

export default function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <i className="g1" />
      <i className="g2" />
      {PARTICLES.map(i => <span key={i} style={{ '--i': i }} />)}
    </div>
  )
}
