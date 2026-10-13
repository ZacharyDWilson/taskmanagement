import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { ThemeProvider } from './lib/theme.jsx'
import { SoundProvider } from './lib/sfx.jsx'
import { ToastProvider } from './lib/toast.jsx'
import { PomodoroProvider } from './lib/pomodoro.jsx'
import { XpProvider } from './lib/xp.jsx'
import { ShopProvider } from './lib/shop.jsx'
import { NotifyProvider } from './lib/notify.jsx'
import { installDragLift } from './lib/dragLift.js'
import './styles.css'

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
                <XpProvider>
                  <ShopProvider>
                    <NotifyProvider>
                      <App />
                    </NotifyProvider>
                  </ShopProvider>
                </XpProvider>
              </PomodoroProvider>
            </ToastProvider>
          </SoundProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)
