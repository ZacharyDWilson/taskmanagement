import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [mode, setMode] = useState('login')
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    if (!supabase) return setMsg('Supabase is not configured.')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return setMsg(error.message)
      navigate('/')
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim(), invite_code: inviteCode.trim() } },
      })
      if (error) {
        // The database rejects bad codes, which Supabase reports as a generic "Database error".
        return setMsg(/database error/i.test(error.message)
          ? "That invite code isn't right. Ask the friend who invited you for the code."
          : error.message)
      }
      if (data.session) navigate('/')
      else setMsg('Check your email to confirm your account, then log in.')
    }
  }

  return (
    <form onSubmit={submit} className="card narrow stack">
      <h1>{mode === 'login' ? 'Log in' : 'Join the group'}</h1>
      {mode === 'signup' && (
        <input placeholder="Display name" value={name} maxLength={40}
          onChange={e => setName(e.target.value)} required />
      )}
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
        required minLength={6} />
      {mode === 'signup' && (
        <input placeholder="Invite code" value={inviteCode} autoComplete="off"
          onChange={e => setInviteCode(e.target.value)} required />
      )}
      <button type="submit">{mode === 'login' ? 'Log in' : 'Create account'}</button>
      <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}>
        {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
      </button>
      {msg && <p>{msg}</p>}
    </form>
  )
}
