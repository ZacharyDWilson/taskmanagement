import { badgeIcon } from '../lib/badgeIcon.js'
import { Link } from 'react-router-dom'

// A few small badges after someone's name. Clicking one opens that person's achievements.
export default function MiniBadges({ userId, list }) {
  if (!list || list.length === 0) return null
  return (
    <Link to={`/achievements/${userId}`} className="mini-badges" aria-label="Their achievements">
      {list.map(a => (
        <span key={a.id} className={'badge mini tier-' + a.tier} title={a.name}><span aria-hidden="true">{badgeIcon(a.icon)}</span></span>
      ))}
    </Link>
  )
}
