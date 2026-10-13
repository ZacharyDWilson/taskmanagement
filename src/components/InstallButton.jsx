import { useEffect, useState } from 'react'

// Shows an "Install app" button when the browser says the site can be installed
// (Chrome / Edge / Android). On iPhone, installing is Share > Add to Home Screen.
export default function InstallButton() {
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setPrompt(e) }
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!prompt) return null
  return (
    <button className="secondary" onClick={async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null) }}>
      Install app
    </button>
  )
}
