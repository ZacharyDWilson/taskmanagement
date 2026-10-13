import { levelFromXp, xpForLevel } from '../lib/levels.js'

export default function LevelCard({ xp }) {
  if (xp === null) return null
  const level = levelFromXp(xp)
  const floor = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const pct = Math.min(100, ((xp - floor) / (next - floor)) * 100)

  return (
    <div className="level">
      <span className="level-badge">Lv {level}</span>
      <div className="level-bar" title={`${xp} XP`}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <small className="muted">{xp - floor} / {next - floor} XP to level {level + 1}</small>
    </div>
  )
}
