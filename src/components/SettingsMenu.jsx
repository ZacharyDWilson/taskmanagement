import { useState } from 'react'
import { useSound, PACK_LABELS, SOUND_PACKS, SIGNATURE } from '../lib/sfx.jsx'
import { useMusic } from '../lib/music.jsx'
import { useNotify } from '../lib/notify.jsx'
import { useReducedMotion } from '../lib/motion.js'
import { useTheme } from '../lib/theme.jsx'
import { replayTour } from './Tour.jsx'
import PickerModal from './PickerModal.jsx'

// The settings button (top left) and its pop-up: sounds and music, notifications, and animations, in one place.
export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const sound = useSound()
  const music = useMusic()
  const notify = useNotify()
  const { theme } = useTheme()
  const [calm, setCalm] = useReducedMotion()

  return (
    <>
      <button type="button" className="settings-btn" onClick={() => { setOpen(true); sound.play('open') }}
        aria-label="Settings" title="Settings">
        <svg className="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
        </svg>
      </button>

      {open && (
        <PickerModal title="Settings" hint="Saved on this device." onClose={() => setOpen(false)}>
          <section className="settings-group">
            <h3>Sound</h3>
            <label className="row">
              <input type="checkbox" checked={sound.enabled} onChange={e => sound.setEnabled(e.target.checked)} />
              Interface sounds
            </label>
            <label className="row">
              <input type="checkbox" checked={music.musicOn} disabled={!sound.enabled}
                onChange={e => music.setMusicOn(e.target.checked)} />
              Quiet background music <span className="muted small">(pauses while the timer runs)</span>
            </label>
            <label>Volume
              <input type="range" min="0" max="1" step="0.05" value={sound.volume} disabled={!sound.enabled}
                onChange={e => sound.setVolume(Number(e.target.value))}
                onPointerUp={() => sound.play('press')} />
            </label>
            <label>Sound style
              <select value={sound.override} disabled={!sound.enabled} onChange={e => sound.setOverride(e.target.value)}>
                <option value="">{SIGNATURE ? 'LOCK IN sounds (default)' : `Match my theme (${PACK_LABELS[SOUND_PACKS[theme]] ?? 'Minimal'})`}</option>
                {SIGNATURE && <option value="theme">Match my theme ({PACK_LABELS[SOUND_PACKS[theme]] ?? 'Minimal'})</option>}
                {Object.entries(PACK_LABELS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          </section>

          <section className="settings-group">
            <h3>Animations</h3>
            <label className="row">
              <input type="checkbox" checked={calm} onChange={e => setCalm(e.target.checked)} />
              Calm mode <span className="muted small">(stills the moving backgrounds, glows and bouncing)</span>
            </label>
          </section>

          <section className="settings-group">
            <h3>Notifications</h3>
            {!notify.supported && (
              <p className="muted small">This browser can't show notifications. On iPhone, add LOCK IN to your Home Screen first.</p>
            )}
            {notify.supported && notify.permission === 'denied' && (
              <p className="muted small">Notifications are blocked for this site. Allow them in your browser's site settings, then come back.</p>
            )}
            {notify.supported && notify.permission !== 'denied' && (
              <label className="row">
                <input type="checkbox" checked={!!notify.enabled}
                  onChange={e => (e.target.checked ? notify.enable() : notify.disable())} />
                Alert me when a study buddy matches with me
              </label>
            )}
          </section>

          <section className="settings-group">
            <h3>Help</h3>
            <div className="row">
              <button type="button" className="secondary" onClick={() => { setOpen(false); replayTour() }}>Replay the welcome tour</button>
            </div>
          </section>
        </PickerModal>
      )}
    </>
  )
}
