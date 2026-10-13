// A tiny in-memory stand-in for Supabase, used only by the preview build (npm run build:wip).
// It talks to nothing: no server, no real accounts, no real data. It understands just the calls this app makes
// (select / insert / update / delete / upsert with eq, in, gte, ..., or, order, limit, single), keeps rows in
// memory (and in this browser's localStorage, so a refresh keeps them), and signs in one fixed fake account.
import seed from './fakeSeed.json'

export const FAKE_EMAIL = 'preview@lock-in.test'
export const FAKE_PASSWORD = 'lockin-preview'
const ME = '00000000-0000-4000-8000-000000000001'
const KEY = 'lock-in-fake-db'
const SESSION_KEY = 'lock-in-fake-session'

const iso = d => d.toISOString().slice(0, 10)
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now())

function freshDb() {
  const today = new Date()
  const plus = n => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d) }
  const t = (title, day, extra = {}) => ({
    id: uid(), user_id: ME, title, day, done: false, color: 'blue', course: null, category: null, due_date: null,
    notes: null, created_at: new Date().toISOString(), ...extra,
  })
  return {
    profiles: [{
      id: ME, display_name: 'Preview Admin', username: 'preview.admin', college: 'Gordon College', bio: 'Trying out LOCK IN.',
      color: 'blue', avatar_path: null, frame: 'frame-none', banner: 'banner-solid', theme: 'default', starter_chosen: true,
      created_at: new Date().toISOString(),
    }],
    cosmetics: seed.cosmetics,
    shop_items: seed.shop_items,
    purchases: [],
    achievements: seed.achievements ?? [],
    user_achievements: [],
    tasks: [
      t('Review lecture notes', plus(0), { course: 'BIO 101', category: 'Study' }),
      t('Email professor about the essay', plus(0), { course: 'ENG 101', category: 'Personal' }),
      t('Lab report: first draft', plus(1), { course: 'CHE 121', category: 'Homework', color: 'green' }),
      t('Read chapter 5', plus(2), { course: 'HIS 210', category: 'Reading', color: 'amber' }),
      t('Plan group project', null, { course: 'COM 150', category: 'Project' }),
    ],
    study_sessions: [], posts: [], comments: [], reactions: [], study_queue: [], canvas_feeds: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* fresh */ }
  return freshDb()
}
const db = load()
// shop rows always come from the seed so new items appear after a rebuild
db.cosmetics = seed.cosmetics
db.shop_items = seed.shop_items
db.achievements = seed.achievements ?? []
db.user_achievements ??= []
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ } }

// ---- filters --------------------------------------------------------------------------------
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const OPS = {
  eq: (v, x) => v === x || String(v) === String(x),
  neq: (v, x) => !(v === x || String(v) === String(x)),
  gt: (v, x) => v != null && cmp(v, x) > 0,
  gte: (v, x) => v != null && cmp(v, x) >= 0,
  lt: (v, x) => v != null && cmp(v, x) < 0,
  lte: (v, x) => v != null && cmp(v, x) <= 0,
  is: (v, x) => (x === 'null' || x === null ? v == null : String(v) === String(x)),
  in: (v, x) => (Array.isArray(x) ? x : String(x).replace(/[()]/g, '').split(',')).map(String).includes(String(v)),
  contains: (v, x) => Array.isArray(v) && (Array.isArray(x) ? x : [x]).every(i => v.includes(i)),
}

// parses PostgREST's or=(a.is.null,and(b.gte.1,b.lte.2)) into a predicate
function splitTop(s) {
  const parts = []; let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { parts.push(cur); cur = '' } else cur += ch
  }
  if (cur) parts.push(cur)
  return parts
}
function orPredicate(expr) {
  const term = s => {
    const and = /^and\((.*)\)$/.exec(s)
    if (and) { const ps = splitTop(and[1]).map(term); return r => ps.every(p => p(r)) }
    const m = /^([^.]+)\.([^.]+)\.(.*)$/.exec(s)
    if (!m) return () => true
    const [, col, op, val] = m
    return r => (OPS[op] ?? OPS.eq)(r[col], val)
  }
  const ps = splitTop(expr).map(term)
  return r => ps.some(p => p(r))
}

// ---- joins in select("*, profiles(display_name), reactions(kind), comments(count)") ----------------
function embeds(sel) {
  const out = []
  const re = /(\w+)(?:!\w+)?\(([^)]*)\)/g
  let m
  while ((m = re.exec(sel || ''))) out.push({ rel: m[1], cols: m[2].split(',').map(c => c.trim()).filter(Boolean) })
  return out
}
const pick = (row, cols) => (!row ? row : Object.fromEntries(cols.map(c => [c, row[c]])))

function shape(row, table, sel) {
  let r = { ...row }
  for (const { rel, cols } of embeds(sel)) {
    if (rel === 'profiles') {
      const p = db.profiles.find(x => x.id === (r.user_id ?? r.id))
      r.profiles = p ? pick(p, cols.includes('*') ? Object.keys(p) : cols) : null
    } else if (cols.length === 1 && cols[0] === 'count') {
      r[rel] = [{ count: (db[rel] ?? []).filter(x => x[table.replace(/s$/, '') + '_id'] === r.id).length }]
    } else if (db[rel]) {
      const fk = table.replace(/s$/, '') + '_id'
      r[rel] = db[rel].filter(x => x[fk] === r.id).map(x => pick(x, cols))
    }
  }
  const plain = (sel || '*').replace(/\w+(?:!\w+)?\([^)]*\)/g, '').split(',').map(s => s.trim()).filter(Boolean)
  if (plain.length && !plain.includes('*')) {
    const keep = new Set([...plain, ...embeds(sel).map(e => e.rel)])
    r = Object.fromEntries(Object.entries(r).filter(([k]) => keep.has(k)))
  }
  return r
}

class Query {
  constructor(table) { this.table = table; this.op = 'select'; this.filters = []; this.orders = []; this.max = null; this.want = 'many'; this.sel = '*' }
  select(s = '*') { this.sel = s; this.returning = true; return this }
  insert(v) { this.op = 'insert'; this.payload = v; return this }
  update(v) { this.op = 'update'; this.payload = v; return this }
  upsert(v) { this.op = 'upsert'; this.payload = v; return this }
  delete() { this.op = 'delete'; return this }
  eq(c, v) { return this.f(c, 'eq', v) }
  neq(c, v) { return this.f(c, 'neq', v) }
  gt(c, v) { return this.f(c, 'gt', v) }
  gte(c, v) { return this.f(c, 'gte', v) }
  lt(c, v) { return this.f(c, 'lt', v) }
  lte(c, v) { return this.f(c, 'lte', v) }
  in(c, v) { return this.f(c, 'in', v) }
  is(c, v) { return this.f(c, 'is', v) }
  contains(c, v) { return this.f(c, 'contains', v) }
  or(expr) { this.filters.push(orPredicate(expr)); return this }
  f(c, op, v) { this.filters.push(r => OPS[op](r[c], v)); return this }
  order(c, o = {}) { this.orders.push([c, o.ascending !== false]); return this }
  limit(n) { this.max = n; return this }
  range(a, b) { this.max = b + 1; return this }
  single() { this.want = 'single'; return this }
  maybeSingle() { this.want = 'maybe'; return this }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej) }

  run() {
    const rows = (db[this.table] ??= [])
    const match = r => this.filters.every(p => p(r))
    let hit = []
    if (this.op === 'insert' || this.op === 'upsert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload]
      for (const v of list) {
        const row = { id: uid(), created_at: new Date().toISOString(), ...v }
        const key = this.table === 'canvas_feeds' ? 'user_id' : null
        const i = key ? rows.findIndex(r => r[key] === row[key]) : -1
        if (this.op === 'upsert' && i >= 0) { rows[i] = { ...rows[i], ...v }; hit.push(rows[i]) } else { rows.push(row); hit.push(row) }
      }
      save()
    } else if (this.op === 'update') {
      for (const r of rows) if (match(r)) { Object.assign(r, this.payload); hit.push(r) }
      save()
    } else if (this.op === 'delete') {
      db[this.table] = rows.filter(r => { const m = match(r); if (m) hit.push(r); return !m })
      save()
    } else hit = rows.filter(match)

    if (this.op !== 'select' && !this.returning) return { data: null, error: null }
    hit = hit.map(r => shape(r, this.table, this.sel))
    for (const [c, asc] of [...this.orders].reverse()) hit.sort((a, b) => (asc ? 1 : -1) * cmp(a[c] ?? '', b[c] ?? ''))
    if (this.max != null) hit = hit.slice(0, this.max)
    if (this.want === 'single') return hit.length === 1 ? { data: hit[0], error: null } : { data: null, error: { message: 'No row found' } }
    if (this.want === 'maybe') return { data: hit[0] ?? null, error: null }
    return { data: hit, error: null }
  }
}

// ---- rpc -------------------------------------------------------------------------------------
const FAKE_XP = 20000   // a high level, so the preview feels fully unlocked
const FAKE_STATS = {
  tasks_done: 28, sessions: 9, focus_minutes: 1320, longest_session: 75, streak_days: 5, weekly_minutes_best: 640,
  posts: 1, comments: 4, reactions_received: 7, level: 6, purchases: 2, profile_complete: 1,
}
const rpcs = {
  user_xp: () => FAKE_XP,
  coin_balance: () => 9999,
  my_achievement_stats: () => FAKE_STATS,
  check_achievements: () => {
    const fresh = []
    for (const a of db.achievements) {
      if (db.user_achievements.some(r => r.achievement_id === a.id)) continue
      if ((FAKE_STATS[a.stat] ?? 0) >= a.goal) {
        db.user_achievements.push({ user_id: ME, achievement_id: a.id, earned_at: new Date().toISOString(), coins_paid: a.reward_coins, pinned: false })
        fresh.push({ ach_id: a.id, ach_name: a.name, ach_coins: a.reward_coins, ach_item: a.reward_item })
      }
    }
    if (fresh.length) save()
    return fresh
  },
  set_pinned_achievements: args => {
    const ids = args?.ids ?? []
    db.user_achievements.forEach(r => { r.pinned = ids.includes(r.achievement_id) })
    save()
    return null
  },
  username_available: () => true,
  weekly_leaderboard: () => [],
}

// ---- auth ------------------------------------------------------------------------------------
const fakeUser = () => ({
  id: ME, email: FAKE_EMAIL, created_at: new Date().toISOString(),
  user_metadata: { display_name: 'Preview Admin' },
})
const listeners = new Set()
const readSession = () => { try { return localStorage.getItem(SESSION_KEY) === '1' ? { user: fakeUser() } : null } catch { return null } }
const setSession = on => {
  try { on ? localStorage.setItem(SESSION_KEY, '1') : localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  const s = on ? { user: fakeUser() } : null
  listeners.forEach(fn => fn(on ? 'SIGNED_IN' : 'SIGNED_OUT', s))
}

const uploaded = {}

export const fakeSupabase = {
  from: table => new Query(table),
  rpc: async (name, args) => ({ data: rpcs[name] ? rpcs[name](args) : null, error: null }),
  auth: {
    getSession: async () => ({ data: { session: readSession() } }),
    onAuthStateChange: fn => {
      listeners.add(fn)
      return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } }
    },
    signInWithPassword: async ({ email, password }) => {
      if (String(email).trim().toLowerCase() !== FAKE_EMAIL || password !== FAKE_PASSWORD) {
        return { data: null, error: { message: 'Use the preview login shown on this card.' } }
      }
      setSession(true)
      return { data: { session: readSession() }, error: null }
    },
    signUp: async () => ({ data: null, error: { message: 'Sign-up is switched off in the preview. Use the preview login.' } }),
    signOut: async () => { setSession(false); return { error: null } },
  },
  storage: {
    from: () => ({
      upload: async (path, blob) => { try { uploaded[path] = URL.createObjectURL(blob) } catch { /* ignore */ } return { error: null } },
      remove: async () => ({ error: null }),
      getPublicUrl: path => ({ data: { publicUrl: uploaded[path] ?? '' } }),
    }),
  },
  functions: { invoke: async () => ({ data: { assignments: [] }, error: null }) },
  channel() { const c = { on: () => c, subscribe: () => c }; return c },
  removeChannel() {},
}
