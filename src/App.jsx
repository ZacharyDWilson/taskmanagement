import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { usePomodoro, mmss } from './lib/pomodoro.jsx'
import { supabase, isConfigured } from './lib/supabase.js'
import Overview from './pages/Overview.jsx'
import Feed from './pages/Feed.jsx'
import Todo from './pages/Todo.jsx'
import Pomodoro from './pages/Pomodoro.jsx'
import StudyBuddy from './pages/StudyBuddy.jsx'
import Profile from './pages/Profile.jsx'
import Login from './pages/Login.jsx'
import InstallButton from './components/InstallButton.jsx'
import { DEMO } from './lib/demo.js' // DEMO

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="page">Loading…</p>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()
  const timer = usePomodoro()
  const { pathname } = useLocation()
  // Every page fits the screen without scrolling, except the feed.
  const pageClass = 'page' + (pathname === '/feed' ? '' : ' fit') + (pathname === '/todo' ? ' wide' : '')
  return (
    <>
      <nav className="nav">
        <Link to="/" className="brand">Friends Site</Link>
        {user && (
          <>
            <NavLink to="/" end>Overview</NavLink>
            <NavLink to="/todo">To Do</NavLink>
            <NavLink to="/feed">Feed</NavLink>
            <NavLink to="/pomodoro">Pomodoro</NavLink>
            <NavLink to="/buddy">Study Buddy</NavLink>
            <NavLink to="/profile" end>My Profile</NavLink>
          </>
        )}
        <span className="spacer" />
        {user && timer.running && (
          <Link to="/pomodoro" className="timer-chip">
            {timer.mode === 'focus' ? '🎯' : '☕'} {mmss(timer.left)}
          </Link>
        )}
        {DEMO && <span className="demo-chip" title="Filler data is switched on (VITE_DEMO_DATA)">Demo data</span>} {/* DEMO */}
        <InstallButton />
        {user ? (
          <button className="secondary" onClick={() => supabase.auth.signOut()}>Log out</button>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </nav>
      <main className={pageClass}>
        {!isConfigured && (
          <p className="warn">
            Supabase isn't configured yet. Copy <code>.env.example</code> to <code>.env</code> and fill it in.
          </p>
        )}
        <Routes>
          <Route path="/" element={<RequireAuth><Overview /></RequireAuth>} />
          <Route path="/todo" element={<RequireAuth><Todo /></RequireAuth>} />
          <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
          <Route path="/pomodoro" element={<RequireAuth><Pomodoro /></RequireAuth>} />
          <Route path="/buddy" element={<RequireAuth><StudyBuddy /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/profile/:id" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
