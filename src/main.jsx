import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import IntroPreview from './pages/IntroPreview.jsx'
import { IS_INTRO } from './lib/env.js'
import { AuthProvider } from './lib/auth.jsx'
import { ThemeProvider } from './lib/theme.jsx'
import { SoundProvider } from './lib/sfx.jsx'
import { ToastProvider } from './lib/toast.jsx'
import { MusicProvider } from './lib/music.jsx'
import { PomodoroProvider } from './lib/pomodoro.jsx'
import { XpProvider } from './lib/xp.jsx'
import { ShopProvider } from './lib/shop.jsx'
import { AchievementsProvider } from './lib/achievements.jsx'
import { NotifyProvider } from './lib/notify.jsx'
import { installDragLift } from './lib/dragLift.js'
import './lib/motion.js'      // applies the saved "calm mode" before anything is drawn
import './lib/install.js'     // starts listening for the browser's install offer right away
import './styles.css'

// Developer helper for the test build only: http://localhost:5176/?shot=rose opens the fake account on its Profile page in that
// theme, with no intro or pop-ups, ready to be photographed for the Shop's preview pictures. It never runs on the live site.
if (import.meta.env.DEV && import.meta.env.VITE_FAKE_BACKEND === 'true') {
  const m = location.search.match(/[?&]shot=([A-Za-z0-9_-]+)/)
  if (m) {
    try {
      localStorage.setItem('friends-site-theme', m[1])
      localStorage.setItem('lock-in-intro', '0')
      localStorage.setItem('lock-in-fake-session', '1')
    } catch { /* ignore */ }
    location.hash = '#/profile'
    document.documentElement.classList.add('shotmode')
  }
}

installDragLift()

// Register the service worker in production builds only (it would get in the way of dev hot reload).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* HashRouter works on GitHub Pages without 404 redirect hacks */}
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <SoundProvider>
            <ToastProvider>
              <PomodoroProvider>
                <MusicProvider>
                  <XpProvider>
                    <ShopProvider>
                      <AchievementsProvider>
                        <NotifyProvider>
                          {IS_INTRO ? <IntroPreview /> : <App />}
                        </NotifyProvider>
                      </AchievementsProvider>
                    </ShopProvider>
                  </XpProvider>
                </MusicProvider>
              </PomodoroProvider>
            </ToastProvider>
          </SoundProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)
