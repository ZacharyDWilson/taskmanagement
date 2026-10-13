import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { fmtMinutes, startOfWeek } from '../lib/dates.js'
import { levelFromXp, useCosmetics, useXp } from '../lib/levels.js'
import { publicUrl, uploadImage } from '../lib/storage.js'
import Avatar from '../components/Avatar.jsx'
import { DEMO, demoProfile, isDemoId } from '../lib/demo.js' // DEMO
import ColorPicker from '../components/ColorPicker.jsx'
import LevelCard from '../components/LevelCard.jsx'

function StylePicker({ title, items, value, level, onChange }) {
  return (
    <div>
      <div className="muted small">{title}</div>
      <div className="styles">
        {items.map(c => {
          const locked = c.min_level > level
          return (
            <button
              key={c.id}
              type="button"
              disabled={locked}
              className={'style-opt' + (value === c.id ? ' on' : '')}
              onClick={() => onChange(c.id)}
              title={locked ? `Unlocks at level ${c.min_level}` : c.name}
            >
              <span className={'swatch-preview ' + c.id} />
              <span>{c.name}</span>
              <small>{locked ? `🔒 Lv ${c.min_level}` : `Lv ${c.min_level}`}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const { id } = useParams()
  const userId = id ?? user.id
  const mine = userId === user.id

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [minutes, setMinutes] = useState(0)
  const [msg, setMsg] = useState('')
  const demo = DEMO && isDemoId(userId) ? demoProfile(userId) : null // DEMO: filler friend's profile
  const realXp = useXp(demo ? user.id : userId) // DEMO: was `const xp = useXp(userId)`
  const xp = demo ? demo.xp : realXp // DEMO
  const cosmetics = useCosmetics()
  const level = levelFromXp(xp ?? 0)

  useEffect(() => {
    if (demo) { // DEMO
      setProfile(demo.profile); setPosts(demo.posts); setMinutes(demo.minutes)
      return
    }
    setProfile(null)
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      .then(({ data }) => setProfile(data ?? false))
    supabase.from('posts').select('id, image_path, body').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setPosts(data ?? []))
    supabase.from('study_sessions').select('minutes').eq('user_id', userId)
      .gte('created_at', startOfWeek().toISOString())
      .then(({ data }) => setMinutes((data ?? []).reduce((s, r) => s + r.minutes, 0)))
  }, [userId])

  if (profile === null) return <p>Loading…</p>
  if (profile === false) return <p>Profile not found.</p>

  const edit = patch => setProfile(p => ({ ...p, ...patch }))

  async function save(e) {
    e.preventDefault()
    const { display_name, bio, color, avatar_path, frame, banner } = profile
    const { error } = await supabase.from('profiles')
      .update({ display_name: display_name.trim() || 'Friend', bio, color, avatar_path, frame, banner })
      .eq('id', user.id)
    setMsg(error ? error.message : 'Saved!')
  }

  async function onAvatar(e) {
    const file = e.target.files[0]
    if (!file) return
    try { edit({ avatar_path: await uploadImage(file, user.id) }) }
    catch (err) { setMsg(err.message) }
  }

  return (
    <div className={mine ? 'two' : 'one'}>
      <div className="col">
      <section className="card profile-head">
        <div className={'banner ' + profile.banner} />
        <div className="profile-id">
          <Avatar name={profile.display_name} path={profile.avatar_path} color={profile.color}
            frame={profile.frame} size={88} />
          <div>
            <h1>{profile.display_name}</h1>
            <p className="muted">{fmtMinutes(minutes)} studied this week</p>
          </div>
        </div>
        <LevelCard xp={xp} />
        {!mine && <p>{profile.bio || 'No bio yet.'}</p>}
      </section>

      <section className="card fill">
        <h2>Posts</h2>
        {posts.length === 0 && <p className="muted">No posts yet.</p>}
        <div className="gallery scroll">
          {posts.map(p => (p.image_url || p.image_path) && (
            <img key={p.id} src={p.image_url ?? publicUrl(p.image_path)} alt={p.body} loading="lazy" />
          ))}
        </div>
      </section>
      </div>

      {mine && (
        <form className="card stack scroll-y" onSubmit={save}>
          <h2>Edit profile</h2>
          <label>Display name
            <input value={profile.display_name} maxLength={40} onChange={e => edit({ display_name: e.target.value })} />
          </label>
          <label>Bio
            <textarea value={profile.bio} maxLength={200} rows={3} onChange={e => edit({ bio: e.target.value })} />
          </label>
          <label>Profile picture
            <input type="file" accept="image/*" onChange={onAvatar} />
          </label>
          <label>Your color
            <ColorPicker value={profile.color} onChange={color => edit({ color })} />
          </label>
          <StylePicker title="Picture frame" level={level} value={profile.frame}
            items={cosmetics.filter(c => c.kind === 'frame')} onChange={frame => edit({ frame })} />
          <StylePicker title="Banner" level={level} value={profile.banner}
            items={cosmetics.filter(c => c.kind === 'banner')} onChange={banner => edit({ banner })} />
          <button type="submit">Save profile</button>
          {msg && <p className="muted">{msg}</p>}
          <small className="muted">
            Earn XP: 1 per focus minute, 10 per finished task, 25 per post, 2 per reaction you receive.
          </small>
        </form>
      )}
    </div>
  )
}
