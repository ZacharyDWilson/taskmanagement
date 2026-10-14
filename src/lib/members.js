import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Everyone in the group (a few dozen rows): used for @mention suggestions and to show names. Asked for once per visit.
let memo = null
export function loadMembers() {
  if (!supabase) return Promise.resolve([])
  memo ??= supabase.from('profiles').select('id, display_name, username, avatar_path, color, frame').order('display_name')
    .then(({ data }) => data ?? [])
  return memo
}

export function useMembers() {
  const [list, setList] = useState([])
  useEffect(() => {
    let live = true
    loadMembers().then(rows => { if (live) setList(rows) })
    return () => { live = false }
  }, [])
  return list
}

// the names still written in the text decide who is really mentioned (people can delete a name after picking it)
export function mentionedIds(text, ids, members) {
  const names = new Map(members.map(m => [m.id, m.display_name]))
  return [...new Set(ids)].filter(id => names.has(id) && text.includes('@' + names.get(id))).slice(0, 5)
}
