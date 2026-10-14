import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createUISFX, getCue } from 'uisfx'
import { useTheme } from './theme.jsx'
import { CUSTOM_SFX, HAS_CUSTOM_SFX, CRISP_SFX, HAS_CRISP } from './customSfx.js'
import { playAero } from './aeroSound.js'
import STARTUP_SOUND from '../assets/intro/startup.webm?url'

// Sound effects, from the open-source "UI SFX" library (MIT code, CC0 audio; https://uisfx.com).
// Every theme gets its own sound personality (a "pack"). Same actions, different feel.
export const SOUND_PACKS = {
  // Polished, short menu clicks (think a console's system menu): crisp and dry, never bleepy.
  default: 'minimal',
  dark: 'minimal',
  aero: 'aero',          // the Frutiger Aero look brings its own bubbly sounds
  gordon: 'soft',
  stonybrook: 'studio',
  console: 'minimal',
  capsule: 'minimal',
  arcade: 'studio',     // deliberately NOT the chiptune pack
  lofi: 'soft',
  shore: 'organic',     // water and soft wood
  twilight: 'zen',      // quiet chimes
  sprout: 'organic',    // soft wood and water
  island: 'zen',        // paper, brush strokes and quiet chimes
  meadow: 'zen',
  tile: 'organic',      // clay and wood
  golden: 'studio',     // warm and a little ceremonial
  handheld: 'soft',     // gentle, rounded blips
  rose: 'soft',         // muted, like felt and paper
}
// Only the understated packs are offered. The bright, bleepy ones are left out on purpose.
export const PACK_LABELS = { ...(HAS_CRISP ? { crisp: 'Crisp UI' } : {}), aero: 'Aero bubbles', minimal: 'Minimal', soft: 'Soft', studio: 'Studio', zen: 'Zen', organic: 'Organic' }
export const DEFAULT_VOLUME = .85

// '' = the default (your LOCK IN sounds when they exist, otherwise the theme's pack); 'theme' = the theme's pack
const OVERRIDE_KEY = 'lock-in-sound-pack'
export const SIGNATURE = HAS_CUSTOM_SFX
const readOverride = () => { try { return localStorage.getItem(OVERRIDE_KEY) || '' } catch { return '' } }

const noop = () => null
const SoundContext = createContext({
  play: noop, enabled: false, setEnabled: () => {}, volume: DEFAULT_VOLUME, setVolume: () => {},
  override: '', setOverride: () => {}, pack: 'minimal',
})
export const useSound = () => useContext(SoundContext)

export function SoundProvider({ children }) {
  const { theme } = useTheme()
  const player = useRef(null)
  const [enabled, setEnabledState] = useState(true)
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME)
  const [override, setOverrideState] = useState(readOverride)
  const themePack = SOUND_PACKS[theme] || 'minimal'
  const pack = (override && override !== 'theme') ? override : themePack
  // your own files lead, unless the theme brings its own sounds (Aero)
  const useSignature = SIGNATURE && override === '' && themePack !== 'aero'

  // One player for the whole app. The audio engine itself only starts after your first tap or key press.
  if (!player.current && typeof window !== 'undefined') {
    try {
      player.current = createUISFX({ pack, volume: DEFAULT_VOLUME, preferences: { key: 'lock-in-sfx-v3:sound' } })
    } catch { player.current = null }
  }
  useEffect(() => {
    const p = player.current
    if (!p) return
    setEnabledState(p.enabled ?? true)
    setVolumeState(p.volume ?? DEFAULT_VOLUME)
  }, [])

  // The theme (or your override) picks the pack.
  useEffect(() => { try { if (pack !== 'aero') player.current?.setPack(pack === 'crisp' ? 'minimal' : pack) } catch { /* ignore */ } }, [pack])

  const volumeRef = useRef(DEFAULT_VOLUME)
  const enabledRef = useRef(true)
  volumeRef.current = volume
  enabledRef.current = enabled
  const signatureRef = useRef(false)
  const packRef = useRef('minimal')
  packRef.current = pack
  signatureRef.current = useSignature

  const play = useCallback((cue, options) => {
    try {
      // the startup sound that plays when the globe appears, the same in every theme
      if (cue === 'intro') {
        if (!enabledRef.current) return null
        const a = new Audio(STARTUP_SOUND)
        a.volume = Math.min(1, Math.max(0, volumeRef.current * 1.2))
        const promise = a.play()
        promise?.catch?.(() => {})
        return { stop: () => a.pause(), promise }
      }
      if (packRef.current === 'aero') {
        if (!enabledRef.current) return null
        playAero(cue === 'intro' ? 'intro' : cue, volumeRef.current)
        return { stop() {} }
      }
      // "Crisp UI": its own recordings where it has one, trimmed so a long file never rings on, and nudged a touch
      // in speed each time so the same tap never sounds machine-gunned. Other moments use the Minimal pack.
      if (packRef.current === 'crisp' && CRISP_SFX[cue]) {
        if (!enabledRef.current) return null
        const a = new Audio(CRISP_SFX[cue])
        a.volume = Math.min(1, Math.max(0, volumeRef.current * 1.3))
        a.playbackRate = 0.96 + Math.random() * 0.08
        a.play().catch(() => {})
        const t = setTimeout(() => a.pause(), 1600)
        return { stop: () => { clearTimeout(t); a.pause() } }
      }
      const file = signatureRef.current ? CUSTOM_SFX[cue] : null
      if (file) {
        if (!enabledRef.current) return null
        const a = new Audio(file)
        a.volume = Math.min(1, Math.max(0, volumeRef.current * 1.4))
        a.play().catch(() => {})
        return { stop: () => a.pause() }
      }
      const name = cue === 'intro' ? 'start' : cue === 'celebrate' ? 'achievement' : cue
      // The built-in cues are mixed very low; lift each one so the default is comfortably audible.
      const base = getCue(name)?.defaultVolume ?? .2
      return player.current?.play(name, { volume: Math.min(1, base * 2.6), ...options }) ?? null
    } catch { return null }
  }, [])

  const setEnabled = useCallback(on => {
    try { player.current?.setEnabled(on) } catch { /* ignore */ }
    setEnabledState(on)
    if (on) play('toggle-on')
  }, [play])
  const setVolume = useCallback(v => {
    try { player.current?.setVolume(v) } catch { /* ignore */ }
    setVolumeState(v)
  }, [])
  const setOverride = useCallback(id => {
    try { id ? localStorage.setItem(OVERRIDE_KEY, id) : localStorage.removeItem(OVERRIDE_KEY) } catch { /* ignore */ }
    setOverrideState(id)
  }, [])

  // Sound reacts to ordinary clicks, so no page needs to be wired by hand.
  useEffect(() => {
    const p = player.current
    if (!p) return
    const unlock = () => { p.unlock?.().catch?.(() => {}) }

    const pressSound = e => {
      const t = e.target instanceof Element ? e.target : null
      if (!t) return
      if (t.closest('input[type="checkbox"]')) return                 // handled on change
      if (t.closest('.dock a, .tabbar a')) return                      // handled as navigation
      const btn = t.closest('button, [role="button"], summary')
      if (!btn || btn.disabled) return
      if (btn.matches('.danger, [aria-label*="elete" i]')) { play('delete'); return }
      play('press')
    }
    // A mouse sounds the moment it is pressed. A finger sounds only when the tap completes (the click),
    // so scrolling or swiping across buttons stays silent.
    const onPointerDown = e => {
      unlock()
      if (e.pointerType && e.pointerType !== 'mouse') return
      pressSound(e)
    }
    const onClick = e => {
      const t = e.target instanceof Element ? e.target : null
      if (!t) return
      const nav = t.closest('.dock a, .tabbar a')
      if (nav) { play('open'); return }
      if (e.pointerType === 'touch' || e.pointerType === 'pen') { pressSound(e); return }
      const btn = t.closest('button')
      if (btn && btn.type === 'submit' && !btn.disabled) play('press')
    }
    // A faint tick when you point at (or arrow-key onto) something clickable, like a console menu.
    const CLICKABLE = 'a[href], button, [role="button"], summary, label.radio, input[type="checkbox"], input[type="radio"], .style-opt, .theme-opt, .week-chip, .chip, .task-main'
    let lastHover = null
    const onOver = e => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      if (e.buttons) return                                        // mid-drag or mid-click
      const t = e.target instanceof Element ? e.target.closest(CLICKABLE) : null
      if (!t || t === lastHover || t.disabled || t.getAttribute?.('aria-disabled') === 'true') { if (!t) lastHover = null; return }
      lastHover = t
      play('hover')
    }
    const onFocus = e => {
      const t = e.target
      if (t instanceof Element && t.matches(':focus-visible') && t.matches(CLICKABLE)) play('hover')
    }
    const onChange = e => {
      const t = e.target
      if (t instanceof HTMLInputElement && t.type === 'checkbox') play(t.checked ? 'check' : 'uncheck')
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('change', onChange, true)
    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('focusin', onFocus, true)
    document.addEventListener('keydown', unlock, { once: true })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('change', onChange, true)
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('focusin', onFocus, true)
    }
  }, [play])

  // Pop-ups (modals, the tour note) get a very quiet open and close sound.
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return
    const isPopup = n => n.nodeType === 1 && (n.matches?.('.modal-backdrop, .tour-tip') || n.querySelector?.('.modal-backdrop, .tour-tip'))
    let last = 0
    const obs = new MutationObserver(list => {
      for (const m of list) {
        const now = Date.now()
        if (now - last < 150) return
        if ([...m.addedNodes].some(isPopup)) { last = now; play('open'); return }
        if ([...m.removedNodes].some(isPopup)) { last = now; play('close'); return }
      }
    })
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [play])

  const value = useMemo(() => ({ play, enabled, setEnabled, volume, setVolume, override, setOverride, pack }),
    [play, enabled, setEnabled, volume, setVolume, override, setOverride, pack])
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}
