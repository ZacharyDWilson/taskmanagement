// Exports the site's data to ./backup/*.json (run by .github/workflows/backup.yml, which then encrypts it).
// Needs SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment. The service key bypasses row-level security,
// so it only ever lives in GitHub Secrets. Never commit it.
import fs from 'node:fs'

const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1) }

// Left out on purpose: canvas_feeds (private calendar links).
const TABLES = [
  'profiles', 'posts', 'comments', 'reactions', 'tasks', 'study_sessions', 'xp_log', 'user_archive',
  'purchases', 'user_achievements', 'notifications', 'study_queue', 'app_admins', 'user_moderation',
  'reports', 'announcements', 'coin_grants', 'admin_log',
]
const headers = { apikey: key, Authorization: `Bearer ${key}` }
fs.mkdirSync('backup', { recursive: true })
const manifest = { taken_at: new Date().toISOString(), tables: {}, problems: [] }

async function exportTable(name) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${url}/rest/v1/${name}?select=*`, { headers: { ...headers, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } })
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`)
    const page = await r.json()
    rows.push(...page)
    if (page.length < 1000) break
  }
  fs.writeFileSync(`backup/${name}.json`, JSON.stringify(rows, null, 1))
  manifest.tables[name] = rows.length
}

for (const t of TABLES) {
  try { await exportTable(t) } catch (e) { manifest.problems.push(String(e.message || e)) }
}

// the account list (emails, sign-up dates) comes from the auth admin API
try {
  const users = []
  for (let page = 1; ; page++) {
    const r = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, { headers })
    if (!r.ok) throw new Error(`auth users: HTTP ${r.status}`)
    const j = await r.json()
    const batch = j.users ?? []
    users.push(...batch.map(u => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at })))
    if (batch.length < 200) break
  }
  fs.writeFileSync('backup/auth_users.json', JSON.stringify(users, null, 1))
  manifest.tables.auth_users = users.length
} catch (e) { manifest.problems.push(String(e.message || e)) }

fs.writeFileSync('backup/manifest.json', JSON.stringify(manifest, null, 1))
console.log(JSON.stringify(manifest, null, 1))
// every table failing means the key or URL is wrong: make the run fail so you notice
if (Object.keys(manifest.tables).length === 0) process.exit(1)
