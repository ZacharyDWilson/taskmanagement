import { useState } from 'react'
import Scene from '../components/Scene.jsx'
import Login from './Login.jsx'
import Logo from '../components/Logo.jsx'
import { useSound } from '../lib/sfx.jsx'

// The intro build (npm run dev:intro, http://localhost:5175).
// It shows only the first things a visitor sees: the loading screen, then the login card
// (which also switches to the sign-up form). No account or data is needed.
export default function IntroPreview() {
  const sound = useSound()
  const [run, setRun] = useState(0)     // changing this restarts the loading screen from the top

  return (
    <div className="shell">
      <Scene />
      <div className="content">
        <nav className="nav">
          <span className="brand"><Logo size={24} /><span>LOCK IN</span></span>
          <span className="intro-badge">Intro preview</span>
          <span className="spacer" />
          <button type="button" onClick={() => setRun(r => r + 1)}>Replay loading screen</button>
          <button type="button" className="sound-chip" onClick={() => sound.setEnabled(!sound.enabled)} aria-pressed={sound.enabled}>
            {sound.enabled ? '🔈' : '🔇'}
          </button>
        </nav>
        <main className="page">
          <Login key={run} preview />
        </main>
      </div>
    </div>
  )
}
