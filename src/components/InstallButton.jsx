import { useInstall } from '../lib/install.js'

// Shows an "Install app" button when the browser says the site can be installed
// (Chrome / Edge / Android). On iPhone, installing is Share > Add to Home Screen.
export default function InstallButton() {
  const { canPrompt, install } = useInstall()
  if (!canPrompt) return null
  return <button className="secondary install-btn" onClick={install}>Install app</button>
}
