// "Aero" sounds: the bubbly, glassy, airy feel of the early-2000s aqua look. Nothing to download:
// every sound is built from a few sine tones with the Web Audio API.
let ctx = null
const audio = () => {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC() }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// One soft tone: starts at `freq`, optionally glides to `to`, fades out. `partial` adds a quiet octave for a glassy ring.
function tone({ freq, to, dur = .12, gain = .2, at = 0, type = 'sine', partial = 0 }, master) {
  const c = audio()
  const t = c.currentTime + at
  const make = (f, g) => {
    const o = c.createOscillator(), a = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(f, t)
    if (to) o.frequency.exponentialRampToValueAtTime(to * (f / freq), t + dur)
    a.gain.setValueAtTime(.0001, t)
    a.gain.exponentialRampToValueAtTime(Math.max(.0002, g * master), t + .012)
    a.gain.exponentialRampToValueAtTime(.0001, t + dur)
    o.connect(a).connect(c.destination)
    o.start(t); o.stop(t + dur + .03)
  }
  make(freq, gain)
  if (partial) make(freq * 2, gain * partial)
}

const arp = (notes, step = .075, dur = .22, gain = .16) =>
  notes.map((freq, i) => ({ freq, at: i * step, dur, gain, partial: .35 }))

const RECIPES = {
  hover:        [{ freq: 1500, to: 1750, dur: .045, gain: .05 }],
  press:        [{ freq: 380, to: 1150, dur: .09, gain: .24 }],                              // a bubble pop
  open:         [{ freq: 660, dur: .16, gain: .15, partial: .4 }, { freq: 990, dur: .2, gain: .13, at: .07, partial: .4 }],
  close:        [{ freq: 880, to: 520, dur: .14, gain: .15, partial: .3 }],
  check:        [{ freq: 880, to: 1320, dur: .11, gain: .18, partial: .3 }],
  uncheck:      [{ freq: 660, to: 440, dur: .1, gain: .14 }],
  success:      arp([523, 659, 784]),
  celebrate:    [...arp([523, 659, 784, 1047, 1319], .07, .28, .17), { freq: 2093, dur: .4, gain: .09, at: .34 }],
  achievement:  arp([523, 659, 784, 1047], .08, .3),
  info:         [{ freq: 1175, dur: .2, gain: .13, partial: .4 }],
  notification: [{ freq: 1319, dur: .28, gain: .15, partial: .45 }, { freq: 1760, dur: .4, gain: .13, at: .13, partial: .45 }],
  start:        [{ freq: 400, to: 1000, dur: .26, gain: .15, partial: .25 }],
  stop:         [{ freq: 800, to: 400, dur: .2, gain: .14 }],
  complete:     arp([784, 988, 1175, 1568], .08, .3, .15),
  intro:        arp([392, 523, 659, 784, 1047], .1, .5, .13),
  error:        [{ freq: 320, to: 220, dur: .18, gain: .12, type: 'triangle' }],
  send:         [{ freq: 520, to: 1040, dur: .1, gain: .17 }],
  delete:       [{ freq: 600, to: 250, dur: .15, gain: .13 }],
}

export function playAero(cue, volume = .85) {
  const recipe = RECIPES[cue]
  if (!recipe) return false
  try { for (const part of recipe) tone(part, Math.max(0, Math.min(1, volume)) * 1.15) } catch { return false }
  return true
}
