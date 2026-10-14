import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMembers } from '../lib/members.js'
import Avatar from './Avatar.jsx'

// "Find people": type a name or @username and jump to their profile.
export default function PeopleSearch() {
  const members = useMembers()
  const [q, setQ] = useState('')
  const term = q.trim().replace(/^@/, '').toLowerCase()
  const hits = useMemo(() => {
    if (!term) return []
    return members
      .filter(m => (m.display_name ?? '').toLowerCase().includes(term) || (m.username ?? '').toLowerCase().includes(term))
      .slice(0, 8)
  }, [members, term])

  return (
    <div className="people-search">
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Find people by name or @username"
        aria-label="Find people" autoComplete="off" />
      {term && (
        <ul className="people-results" role="listbox" aria-label="People">
          {hits.length === 0 && <li className="muted small">Nobody matches “{q.trim()}”.</li>}
          {hits.map(m => (
            <li key={m.id}>
              <Link to={'/profile/' + m.id} onClick={() => setQ('')}>
                <Avatar name={m.display_name} path={m.avatar_path} color={m.color} frame={m.frame} size={32} />
                <span><strong>{m.display_name}</strong>{m.username && <small className="muted"> @{m.username}</small>}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
