// Supabase Edge Function: cleanup-files
// Runs the nightly cleanup (expired posts, old tasks, merged study rows) and then deletes the photo FILES that
// expired posts left behind, plus any uploaded file nothing points to. Safe to call any time and as often as you like:
// it only removes what was already due, so the app asks for it about once a day per device.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Only a signed-in member may start the cleanup (the public key alone is not enough).
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Sign in first' }, 401)
  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: who } = await caller.auth.getUser()
  if (!who?.user) return json({ error: 'Sign in first' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const summary: Record<string, unknown> = {}

  const night = await admin.rpc('nightly_cleanup')
  summary.cleanup = night.error ? night.error.message : night.data

  const trash = await admin.from('file_trash').select('path').limit(500)
  const queued = (trash.data ?? []).map((r: { path: string }) => r.path)
  const orphans = await admin.rpc('storage_orphans')
  const orphanList = Array.isArray(orphans.data) ? (orphans.data as string[]) : []

  const paths = [...new Set([...queued, ...orphanList])]
  let removed = 0
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100)
    const res = await admin.storage.from('uploads').remove(batch)
    if (!res.error) removed += batch.length
  }
  if (queued.length) await admin.from('file_trash').delete().in('path', queued)

  summary.files_removed = removed
  summary.orphans = orphanList.length
  return json(summary)
})
