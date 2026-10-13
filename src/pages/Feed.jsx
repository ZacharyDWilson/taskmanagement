import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { publicUrl, removeImage, uploadImage } from '../lib/storage.js'
import { useToast } from '../lib/toast.jsx'
import { useTopBadges } from '../lib/achievements.jsx'
import MiniBadges from '../components/MiniBadges.jsx'
import ReportButton from '../components/ReportButton.jsx'
import { useMyModeration, blockedText } from '../lib/moderation.js'
import Avatar from '../components/Avatar.jsx'
import { DEMO, demoComments, demoPosts } from '../lib/demo.js' // DEMO

const REACTIONS = [
  { kind: 'like', icon: '❤️' },
  { kind: 'fire', icon: '🔥' },
  { kind: 'clap', icon: '👏' },
  { kind: 'strong', icon: '💪' },
]
const MAX_CAPTION = 140

function Composer({ onPosted }) {
  const { user } = useAuth()
  const toast = useToast()
  const mod = useMyModeration()
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef()
  const preview = file ? URL.createObjectURL(file) : null

  async function submit(e) {
    e.preventDefault()
    if (!file) return setError('Add a photo of your progress.')
    setBusy(true); setError('')
    try {
      const image_path = await uploadImage(file, user.id)
      const { error } = await supabase.from('posts').insert({ user_id: user.id, body: caption.trim(), image_path })
      if (error) { await removeImage(image_path); throw error }
      setFile(null); setCaption(''); input.current.value = ''
      toast('✓ Posted to your feed')
      onPosted()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Share your progress</h2>
      {mod.status && <p className="warn">{blockedText(mod)}</p>}
      <input ref={input} type="file" accept="image/*" onChange={e => {
        const f = e.target.files[0] ?? null
        setFile(f)
        if (f) toast(`📷 Photo chosen: ${f.name}`, 'info', { silent: true })
      }} />
      {preview && <img className="preview" src={preview} alt="Preview" />}
      <div className="row">
        <input value={caption} maxLength={MAX_CAPTION} placeholder="Short caption…"
          onChange={e => setCaption(e.target.value)} />
        <button disabled={busy || !!mod.status}>{busy ? 'Posting…' : 'Post'}</button>
      </div>
      <small className="muted">{caption.length}/{MAX_CAPTION} · Posting means you agree to the <Link to="/terms">community rules</Link>.</small>
      {error && <p className="warn">{error}</p>}
    </form>
  )
}

const MAX_COMMENT = 200

function Comments({ post, onCount }) {
  const { user } = useAuth()
  const toast = useToast()
  const mod = useMyModeration()
  const [items, setItems] = useState(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const isPostAuthor = post.user_id === user.id

  const load = useCallback(async () => {
    if (post.demo) { setItems(prev => prev ?? demoComments(post.id)); return } // DEMO
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(display_name, avatar_path, color, frame)')
      .eq('post_id', post.id)
      .order('created_at')
    if (error) setError(error.message)
    else setItems(data)
  }, [post.id, post.demo])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (items) onCount(items.length) }, [items]) // eslint-disable-line

  async function add(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setError('')
    if (post.demo) { // DEMO: comments on filler posts stay in the browser
      setItems(cs => [...cs, {
        id: `demo-c-${Date.now()}`, user_id: user.id, body: text, created_at: new Date().toISOString(),
        profiles: { display_name: user.user_metadata?.display_name ?? 'You', color: 'blue', frame: 'frame-none' },
      }])
      toast('💬 Comment sent')
      return setBody('')
    }
    const { error } = await supabase.from('comments').insert({ post_id: post.id, user_id: user.id, body: text })
    if (error) return setError(error.message)
    setBody('')
    toast('💬 Comment sent')
    load()
  }

  async function remove(c) {
    if (post.demo) { setItems(cs => cs.filter(x => x.id !== c.id)); toast('Comment deleted', 'info', { silent: true }); return } // DEMO
    const { error } = await supabase.from('comments').delete().eq('id', c.id)
    if (error) return setError(error.message)
    toast('Comment deleted', 'info', { silent: true })
    load()
  }

  return (
    <div className="comments">
      {items === null && !error && <p className="muted small">Loading…</p>}
      {items?.length === 0 && <p className="muted small">No comments yet. Be the first to write one.</p>}
      <ul>
        {items?.map(c => (
          <li key={c.id}>
            <Avatar name={c.profiles?.display_name} path={c.profiles?.avatar_path} color={c.profiles?.color}
              frame={c.profiles?.frame} size={30} />
            <div className="comment-body">
              <div>
                <Link to={`/profile/${c.user_id}`}><strong>{c.profiles?.display_name ?? 'Someone'}</strong></Link>
                {' '}<span className="muted small">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <span>{c.body}</span>
            </div>
            {(c.user_id === user.id || isPostAuthor) && (
              <button className="link" aria-label="Delete comment" onClick={() => remove(c)}>×</button>
            )}
            {c.user_id !== user.id && !post.demo && <ReportButton commentId={c.id} className="link report-link" />}
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={add}>
        <input value={body} maxLength={MAX_COMMENT} placeholder="Write a comment…" aria-label="Write a comment"
          onChange={e => setBody(e.target.value)} />
        <button disabled={!body.trim() || !!mod.status}>Comment</button>
      </form>
      {mod.status && <p className="warn small">{blockedText(mod)}</p>}
      {error && <p className="warn">{error}</p>}
    </div>
  )
}

function PostCard({ post, onChanged, badges }) {
  const { user } = useAuth()
  const toast = useToast()
  const author = post.profiles
  const [open, setOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(null)
  const baseCount = post.demo ? demoComments(post.id).length : (post.comments?.[0]?.count ?? 0)
  const shownCount = commentCount ?? baseCount
  const [demoReactions, setDemoReactions] = useState(post.reactions) // DEMO
  const reactions = post.demo ? demoReactions : post.reactions // DEMO

  async function toggle(kind) {
    const mine = reactions.some(r => r.user_id === user.id && r.kind === kind)
    const icon = REACTIONS.find(r => r.kind === kind)?.icon ?? ''
    if (!mine) toast(`${icon} Reaction sent`, 'info', { silent: true })
    if (post.demo) { // DEMO: demo posts react locally only
      return setDemoReactions(rs => mine
        ? rs.filter(r => !(r.user_id === user.id && r.kind === kind))
        : [...rs, { kind, user_id: user.id }])
    }
    const q = supabase.from('reactions')
    const { error } = mine
      ? await q.delete().match({ post_id: post.id, user_id: user.id, kind })
      : await q.insert({ post_id: post.id, user_id: user.id, kind })
    if (!error) onChanged()
  }

  async function remove() {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', post.id)
    await removeImage(post.image_path)
    toast('Post deleted')
    onChanged()
  }

  return (
    <article className="card post">
      <header className="row">
        <Avatar name={author?.display_name} path={author?.avatar_path} color={author?.color}
          frame={author?.frame} size={40} />
        <Link to={`/profile/${post.user_id}`}>{author?.display_name ?? 'Someone'}</Link>
        <MiniBadges userId={post.user_id} list={badges?.get(post.user_id)} />
        <span className="muted small">{new Date(post.created_at).toLocaleString()}</span>
        <span className="spacer" />
        {post.user_id === user.id && <button className="link" onClick={remove}>delete</button>}
        {post.user_id !== user.id && !post.demo && <ReportButton postId={post.id} className="link report-link" />}
      </header>
      {(post.image_url || post.image_path) && (
        <img className="photo" src={post.image_url ?? publicUrl(post.image_path)} alt={post.body} loading="lazy" />
      )}
      {post.body && <p>{post.body}</p>}
      <footer className="row reactions" aria-label="Reactions">
        {REACTIONS.map(({ kind, icon }) => {
          const count = reactions.filter(r => r.kind === kind).length
          const mine = reactions.some(r => r.user_id === user.id && r.kind === kind)
          return (
            <button key={kind} className={'react' + (mine ? ' on' : '')} onClick={() => toggle(kind)}>
              {icon} {count > 0 && count}
            </button>
          )
        })}
      </footer>
      <button type="button" className={'comment-toggle' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span aria-hidden="true">💬</span>
        {shownCount === 0 ? 'Add a comment' : `${shownCount} comment${shownCount === 1 ? '' : 's'}`}
        <span className="chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && <Comments post={post} onCount={setCommentCount} />}
    </article>
  )
}

export default function Feed() {
  const [posts, setPosts] = useState([])
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(display_name, avatar_path, color, frame), reactions(kind, user_id), comments(count)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) setError(error.message)
    else setPosts(DEMO // DEMO
      ? [...data, ...demoPosts()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : data)
  }
  useEffect(() => { load() }, [])
  const badges = useTopBadges(posts.map(p => p.user_id))

  return (
    <div className="narrow">
      <h1>Progress feed</h1>
      <Composer onPosted={load} />
      {error && <p className="warn">{error}</p>}
      {posts.length === 0 && !error && <p className="muted">No posts yet. Be the first to share your progress!</p>}
      {posts.map(p => <PostCard key={p.id} post={p} onChanged={load} badges={badges} />)}
    </div>
  )
}
