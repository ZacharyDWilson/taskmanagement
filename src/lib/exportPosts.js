import { supabase } from './supabase.js'
import { publicUrl } from './storage.js'
import { POST_KINDS } from './postKinds.js'

// "Download my posts": posts disappear after 14 days, so this saves yours (words, tags, dates and photos) as ONE
// web page file you keep. Photos are embedded in it, so it works offline. Returns how many posts were saved.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const toDataUrl = blob => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = reject
  r.readAsDataURL(blob)
})

async function embed(path) {
  if (!path) return null
  try {
    const res = await fetch(publicUrl(path))
    if (!res.ok) return null
    return await toDataUrl(await res.blob())
  } catch { return null }
}

export async function downloadMyPosts(userId) {
  const { data, error } = await supabase.from('posts')
    .select('id, body, kind, image_path, created_at, reactions(kind, user_id)')
    .eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  if (!data?.length) throw new Error('You have no posts to save yet.')

  const cards = []
  for (const p of data) {
    const img = await embed(p.image_path)
    const tag = POST_KINDS.find(k => k.id === p.kind)
    const likes = (p.reactions ?? []).length
    cards.push(`<article>
${img ? `<img src="${img}" alt="">` : ''}
<p class="meta">${esc(new Date(p.created_at).toLocaleString())}${tag ? ` · ${esc(tag.label)}` : ''}${likes ? ` · ${likes} reaction${likes === 1 ? '' : 's'}` : ''}</p>
${p.body ? `<p>${esc(p.body)}</p>` : ''}
</article>`)
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My LOCK IN posts</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px 16px;color:#222;background:#f6f7f9}
article{background:#fff;border-radius:12px;padding:14px;margin:0 0 16px;box-shadow:0 1px 4px rgba(0,0,0,.1)}
img{max-width:100%;border-radius:8px;display:block}.meta{color:#667;font-size:13px;margin:8px 0 4px}p{margin:4px 0}</style></head>
<body><h1>My LOCK IN posts</h1><p class="meta">Saved ${esc(new Date().toLocaleString())} · ${data.length} post${data.length === 1 ? '' : 's'}</p>
${cards.join('\n')}</body></html>`

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `my-lock-in-posts-${new Date().toISOString().slice(0, 10)}.html`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return data.length
}
