import { Link } from 'react-router-dom'

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Shows post and comment text with the tagged "@Name"s as links to that person's profile.
export default function RichText({ text, mentions = [], members = [] }) {
  const byId = new Map(members.map(m => [m.id, m]))
  const tagged = (mentions ?? []).map(id => byId.get(id)).filter(Boolean)
  if (!text || !tagged.length) return <>{text}</>
  const idOf = new Map()
  for (const p of tagged) if (!idOf.has(p.display_name)) idOf.set(p.display_name, p.id)
  const names = [...idOf.keys()].sort((a, b) => b.length - a.length)   // "Sam Lee" before "Sam"
  const re = new RegExp('@(' + names.map(esc).join('|') + ')', 'g')
  const out = []
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<Link key={m.index} className="mention" to={`/profile/${idOf.get(m[1])}`}>@{m[1]}</Link>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
