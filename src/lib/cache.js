import { supabase } from './supabase.js'
import { APP_VERSION } from './version.js'

// Lists that hardly ever change (shop items, bundles, achievements, cosmetics) are kept on the device so they are
// not downloaded again on every page and every XP change.
//  - once per visit: one tiny request that only counts the rows. Same count = use what is stored.
//  - a different count (something was added or removed): ask for the ids, fetch ONLY the new rows and add them to the
//    stored list, drop the ones that are gone.
//  - a new app version, or a week old: fetch the whole list fresh (that is also how a changed price gets picked up).
const KEY = 'lock-in-cache:'
const WEEK = 7 * 24 * 3600 * 1000
const memo = new Map()   // table -> promise, so one visit asks at most once

const read = table => { try { return JSON.parse(localStorage.getItem(KEY + table)) } catch { return null } }
const write = (table, rows) => {
  try { localStorage.setItem(KEY + table, JSON.stringify({ v: APP_VERSION, at: Date.now(), rows })) } catch { /* storage full or blocked: fine */ }
}

async function load(table, order) {
  const hit = read(table)
  const usable = hit && hit.v === APP_VERSION && Array.isArray(hit.rows) && Date.now() - hit.at < WEEK
  if (usable) {
    const head = await supabase.from(table).select('id', { count: 'exact', head: true })
    if (!head.error && head.count === hit.rows.length) return hit.rows
    if (!head.error) {
      const ids = await supabase.from(table).select('id')
      if (!ids.error) {
        const live = new Set((ids.data ?? []).map(r => r.id))
        const have = new Set(hit.rows.map(r => r.id))
        const missing = [...live].filter(id => !have.has(id))
        let added = []
        if (missing.length) {
          const got = await supabase.from(table).select('*').in('id', missing)
          if (got.error) return hit.rows
          added = got.data ?? []
        }
        const rows = [...hit.rows.filter(r => live.has(r.id)), ...added]
          .sort((a, b) => (a[order] > b[order] ? 1 : a[order] < b[order] ? -1 : 0))
        write(table, rows)
        return rows
      }
    }
    return hit.rows
  }
  const { data, error } = await supabase.from(table).select('*').order(order)
  if (error) return hit?.rows ?? []
  write(table, data ?? [])
  return data ?? []
}

export function cachedTable(table, order = 'id') {
  if (!memo.has(table)) memo.set(table, load(table, order))
  return memo.get(table)
}
