import { levelFromXp, xpForLevel } from '../lib/levels.js'

export default function LevelCard({ xp, compact = false }) {
  if (xp === null) return null
  const level = levelFromXp(xp)
  const floor = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const pct = Math.min(100, ((xp - floor) / (next - floor)) * 100)

  if (compact) {
    // one slim line: Lv 1 [=====   ] 2/100 XP (the full wording is in the tooltip)
    return (
      <div className="level compact" title={`${xp - floor} / ${next - floor} XP to level ${level + 1}`}>
        <span className="level-badge">Lv {level}</span>
        <div className="level-bar"><div style={{ width: `${pct}%` }} /></div>
        <small className="muted">{xp - floor}/{next - floor} XP</small>
      </div>
    )
  }

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
