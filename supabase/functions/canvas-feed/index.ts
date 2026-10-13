// Supabase Edge Function: canvas-feed
// Reads the signed-in person's saved Canvas calendar feed and returns their assignments as JSON.
// (A browser can't read the feed directly, and the feed link is private, so this runs on the server.)
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Only a Canvas-style calendar feed over https, and never an internal address.
function feedOk(raw: string) {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    if (!/\/feeds\/calendars\/.+\.ics$/i.test(u.pathname)) return false
    const h = u.hostname.toLowerCase()
    if (h === 'localhost' || h.endsWith('.local') || /^[0-9.]+$/.test(h) || h.includes(':')) return false
    return true
  } catch { return false }
}

const unfold = (s: string) => s.replace(/\r?\n[ \t]/g, '')
const unescapeText = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')

function parseDate(v: string) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (!h) return { iso: `${y}-${mo}-${d}`, allDay: true }
  const date = z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    : new Date(+y, +mo - 1, +d, +h, +mi, +s)
  return { iso: date.toISOString(), allDay: false }
}

function parseIcs(text: string) {
  const out: Array<Record<string, unknown>> = []
  for (const block of unfold(text).split('BEGIN:VEVENT').slice(1)) {
    const body = block.split('END:VEVENT')[0]
    const field = (name: string) => {
      const m = body.match(new RegExp('^' + name + '(?:;[^:\\r\\n]*)?:(.*)$', 'mi'))
      return m ? m[1].trim() : ''
    }
    const summary = unescapeText(field('SUMMARY'))
    const start = parseDate(field('DTSTART'))
    if (!summary || !start) continue
    // Canvas puts the course at the end: "Essay 2 [ENG101-01 Fall 2026]"
    const course = summary.match(/\[([^\]]+)\]\s*$/)?.[1]?.trim() ?? ''
    out.push({
      uid: field('UID'),
      title: summary.replace(/\s*\[[^\]]+\]\s*$/, '').trim(),
      course,
      due: start.iso,
      allDay: start.allDay,
      url: field('URL'),
      description: unescapeText(field('DESCRIPTION')).slice(0, 400),
    })
  }
  return out
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Sign in first' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return json({ error: 'Sign in first' }, 401)

  const { data: feed } = await supabase.from('canvas_feeds').select('url').eq('user_id', userData.user.id).maybeSingle()
  if (!feed?.url) return json({ assignments: [], connected: false })
  if (!feedOk(feed.url)) return json({ error: 'That does not look like a Canvas calendar feed link.' }, 400)

  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'LOCK-IN' } })
    if (!res.ok) return json({ error: `Canvas answered ${res.status}. The link may have changed.` }, 502)
    const assignments = parseIcs(await res.text())
      .sort((a, b) => String(a.due).localeCompare(String(b.due)))
    return json({ assignments, connected: true })
  } catch {
    return json({ error: 'Could not reach Canvas right now. Try again in a bit.' }, 502)
  }
})
