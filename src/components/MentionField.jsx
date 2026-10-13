import { useRef, useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { useMembers } from '../lib/members.js'
import Avatar from './Avatar.jsx'

// A text box where typing "@" suggests friends to tag. The picked people are reported through onMentions (ids);
// the text keeps a readable "@Name". Works as a textarea (multiline) or a single-line input.
export default function MentionField({ value, onChange, mentions, onMentions, multiline = false, maxLength, placeholder, ariaLabel, rows = 3 }) {
  const { user } = useAuth()
  const members = useMembers()
  const ref = useRef(null)
  const [query, setQuery] = useState(null)   // { start, text } while an @ is being typed
  const [idx, setIdx] = useState(0)

  const options = query
    ? members.filter(m => m.id !== user?.id && m.display_name.toLowerCase().includes(query.text.toLowerCase())).slice(0, 5)
    : []

  function detect(text, caret) {
    const m = text.slice(0, caret).match(/(^|\s)@([^@\n]{0,20})$/)
    setQuery(m ? { start: caret - m[2].length - 1, text: m[2] } : null)
    setIdx(0)
  }

  function pick(m) {
    const el = ref.current
    const caret = el?.selectionStart ?? value.length
    let next = value.slice(0, query.start) + '@' + m.display_name + ' ' + value.slice(caret)
    if (maxLength) next = next.slice(0, maxLength)
    onChange(next)
    onMentions([...new Set([...mentions, m.id])].slice(0, 5))
    setQuery(null)
    const pos = Math.min(query.start + m.display_name.length + 2, next.length)
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos) })
  }

  const onKeyDown = e => {
    if (!options.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => (i + 1) % options.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => (i - 1 + options.length) % options.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[idx]) }
    else if (e.key === 'Escape') { e.preventDefault(); setQuery(null) }
  }

  const props = {
    ref, value, maxLength, placeholder, 'aria-label': ariaLabel,
    onChange: e => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart) },
    onKeyDown,
    onClick: e => detect(e.target.value, e.target.selectionStart),
    onBlur: () => setTimeout(() => setQuery(null), 120),
  }

  return (
    <div className="mention-wrap">
      {multiline ? <textarea rows={rows} {...props} /> : <input {...props} />}
      {options.length > 0 && (
        <ul className="mention-list" role="listbox" aria-label="People to tag">
          {options.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === idx} className={i === idx ? 'on' : ''}
              onMouseDown={e => { e.preventDefault(); pick(m) }}>
              <Avatar name={m.display_name} path={m.avatar_path} color={m.color} frame={m.frame} size={24} />
              <span>{m.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
