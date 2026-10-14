import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMembers } from '../lib/members.js'
import Avatar from './Avatar.jsx'

// "Find people": everyone in the group, narrowed as you type a name or @username; a tap opens their profile.
export default function PeopleSearch() {
  const members = useMembers()
  const [q, setQ] = useState('')
  const term = q.trim().replace(/^@/, '').toLowerCase()
  const hits = useMemo(() => (
    term
      ? members.filter(m => (m.display_name ?? '').toLowerCase().includes(term) || (m.username ?? '').toLowerCase().includes(term))
      : members
  ), [members, term])

  return (
    <div className="people-search">
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or @username"
        aria-label="Find people" autoComplete="off" />
      <ul className="people-results" aria-label="People">
        {hits.length === 0 && <li className="muted small">{term ? `Nobody matches “${q.trim()}”.` : 'No one here yet.'}</li>}
        {hits.map(m => (
          <li key={m.id}>
            <Link to={'/profile/' + m.id}>
              <Avatar name={m.display_name} path={m.avatar_path} color={m.color} frame={m.frame} size={34} />
              <span><strong>{m.display_name}</strong>{m.username && <small className="muted"> @{m.username}</small>}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
