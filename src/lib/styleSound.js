// Built-in sounds for the three Style packs (Clay Pop, Neo Brutal, Wabi-Sabi). Nothing to download: every sound is
// a few tones made with the Web Audio API, each pack with its own material (soft squish, hard clack, wood and bell).
let ctx = null
const audio = () => {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC() }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone({ freq, to, dur = .12, gain = .2, at = 0, type = 'sine', lp = 0 }, master) {
  const c = audio()
  const t = c.currentTime + at
  const o = c.createOscillator(), a = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  a.gain.setValueAtTime(.0001, t)
  a.gain.exponentialRampToValueAtTime(Math.max(.0002, gain * master), t + .008)
  a.gain.exponentialRampToValueAtTime(.0001, t + dur)
  let out = a
  o.connect(a)
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; a.connect(f); out = f }
  out.connect(c.destination)
  o.start(t); o.stop(t + dur + .03)
}

const seq = (notes, step, dur, gain, extra = {}) => notes.map((freq, i) => ({ freq, at: i * step, dur, gain, ...extra }))

// Clay: round, low, squishy "bloops" (sine with a falling or rising glide, softened with a low-pass).
const A = { type: 'sine', lp: 1800 }
const CLAY = {
  hover:        [{ freq: 520, to: 600, dur: .05, gain: .05, ...A }],
  press:        [{ freq: 330, to: 170, dur: .14, gain: .3, ...A }],
  open:         [{ freq: 260, to: 420, dur: .18, gain: .22, ...A }],
  close:        [{ freq: 420, to: 240, dur: .16, gain: .2, ...A }],
  check:        [{ freq: 300, to: 520, dur: .12, gain: .25, ...A }],
  uncheck:      [{ freq: 400, to: 220, dur: .12, gain: .2, ...A }],
  success:      seq([392, 523, 659], .09, .22, .22, A),
  celebrate:    seq([392, 523, 659, 784, 988], .08, .26, .22, A),
  achievement:  seq([392, 494, 659, 784], .09, .28, .22, A),
  info:         [{ freq: 700, to: 640, dur: .2, gain: .18, ...A }],
  notification: seq([660, 880], .12, .3, .2, A),
  start:        [{ freq: 240, to: 520, dur: .24, gain: .22, ...A }],
  stop:         [{ freq: 520, to: 240, dur: .2, gain: .2, ...A }],
  complete:     seq([523, 659, 784, 1047], .09, .26, .2, A),
  intro:        seq([262, 330, 392, 523], .13, .4, .2, A),
  error:        [{ freq: 200, to: 120, dur: .22, gain: .22, ...A }],
  send:         [{ freq: 300, to: 620, dur: .13, gain: .22, ...A }],
  delete:       [{ freq: 280, to: 90, dur: .2, gain: .24, ...A }],
}

// Brutal: short, hard, square-wave clacks and stabs. Dry, no tail.
const B = { type: 'square', lp: 3200 }
const BRUTAL = {
  hover:        [{ freq: 900, dur: .02, gain: .035, ...B }],
  press:        [{ freq: 190, to: 95, dur: .07, gain: .2, ...B }, { freq: 1400, dur: .015, gain: .07, ...B }],
  open:         [{ freq: 220, dur: .06, gain: .16, ...B }, { freq: 330, dur: .08, at: .06, gain: .16, ...B }],
  close:        [{ freq: 330, dur: .06, gain: .16, ...B }, { freq: 220, dur: .08, at: .06, gain: .16, ...B }],
  check:        [{ freq: 440, dur: .05, gain: .16, ...B }, { freq: 660, dur: .07, at: .05, gain: .16, ...B }],
  uncheck:      [{ freq: 330, dur: .05, gain: .14, ...B }, { freq: 220, dur: .07, at: .05, gain: .14, ...B }],
  success:      seq([392, 523, 659], .07, .1, .16, B),
  celebrate:    seq([392, 523, 659, 784, 1047], .06, .12, .16, B),
  achievement:  seq([330, 440, 554, 659], .07, .14, .16, B),
  info:         [{ freq: 880, dur: .09, gain: .14, ...B }],
  notification: seq([880, 1175], .09, .12, .15, B),
  start:        [{ freq: 220, to: 440, dur: .12, gain: .16, ...B }],
  stop:         [{ freq: 440, to: 220, dur: .12, gain: .16, ...B }],
  complete:     seq([440, 554, 659, 880], .07, .12, .15, B),
  intro:        seq([196, 262, 330, 392], .1, .18, .15, B),
  error:        [{ freq: 150, dur: .12, gain: .18, ...B }, { freq: 110, dur: .16, at: .1, gain: .18, ...B }],
  send:         [{ freq: 300, to: 700, dur: .08, gain: .16, ...B }],
  delete:       [{ freq: 260, to: 70, dur: .14, gain: .2, ...B }],
}

// Wabi: wood blocks and quiet bells, uneven and unhurried (a pentatonic scale, a little space between notes).
const W = { type: 'triangle', lp: 2600 }
const bell = (f, at = 0, g = .16) => [{ freq: f, dur: .7, gain: g, at, type: 'sine' }, { freq: f * 2.76, dur: .35, gain: g * .25, at, type: 'sine' }]
const WABI = {
  hover:        [{ freq: 620, dur: .04, gain: .04, ...W }],
  press:        [{ freq: 520, to: 470, dur: .09, gain: .26, ...W }, { freq: 1040, to: 940, dur: .05, gain: .06, ...W }],
  open:         bell(523, 0, .14),
  close:        bell(392, 0, .13),
  check:        [{ freq: 600, to: 560, dur: .08, gain: .22, ...W }, ...bell(880, .04, .08)],
  uncheck:      [{ freq: 440, to: 400, dur: .09, gain: .2, ...W }],
  success:      [...bell(523, 0, .14), ...bell(659, .16, .14), ...bell(784, .34, .14)],
  celebrate:    [...bell(523, 0, .14), ...bell(587, .12, .14), ...bell(784, .26, .14), ...bell(880, .42, .14), ...bell(1175, .6, .12)],
  achievement:  [...bell(392, 0, .15), ...bell(523, .18, .15), ...bell(659, .38, .15)],
  info:         bell(784, 0, .12),
  notification: [...bell(880, 0, .13), ...bell(660, .22, .12)],
  start:        [...bell(440, 0, .13), ...bell(587, .14, .12)],
  stop:         [...bell(587, 0, .12), ...bell(440, .14, .12)],
  complete:     [...bell(523, 0, .13), ...bell(659, .15, .13), ...bell(880, .32, .13)],
  intro:        [...bell(392, 0, .13), ...bell(494, .25, .13), ...bell(587, .5, .13), ...bell(784, .78, .13)],
  error:        [{ freq: 220, to: 170, dur: .18, gain: .22, ...W }],
  send:         [{ freq: 520, to: 620, dur: .09, gain: .2, ...W }],
  delete:       [{ freq: 330, to: 200, dur: .16, gain: .2, ...W }],
}

const PACKS = { clay: CLAY, brutal: BRUTAL, wabi: WABI }
export const isStylePack = id => id in PACKS

export function playStyle(pack, cue, volume = .85) {
  const recipe = PACKS[pack]?.[cue]
  if (!recipe) return false
  try { for (const part of recipe) tone(part, Math.max(0, Math.min(1, volume)) * 1.15) } catch { return false }
  return true
}
