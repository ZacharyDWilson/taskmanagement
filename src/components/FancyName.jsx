import { THEMES, useTheme } from '../lib/theme.jsx'

// A person's name, set in its own typeface and a colour taken from the current theme's own palette, with a
// soft glow. The font and the colour both come from the name, so the same name always looks the same,
// different names look different, and it always belongs to the theme it sits in.
const FONTS = [
  "'Pacifico', cursive",
  "'Lilita One', 'Rubik', sans-serif",
  "'Baloo 2', sans-serif",
  "'Fredoka', sans-serif",
  "'Cinzel', serif",
  "'Comfortaa', sans-serif",
  "'Righteous', sans-serif",
  "'Orbitron', sans-serif",
  "'Lora', serif",
  "'Quicksand', sans-serif",
]
const DARK_LOOKS = new Set(['dark', 'arcade', 'meadow'])   // themes whose cards are dark

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  let h = 0, s = 0
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1))
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = Math.round(h * 60); if (h < 0) h += 360
  }
  return { h, s, l }
}

// The theme's vivid colours (skip whites, blacks and greys), so the name pops without clashing.
function accentsFor(themeId) {
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
  const vivid = theme.preview.map(hexToHsl).filter(c => c.s > .3 && c.l > .15 && c.l < .85)
  return vivid.length ? vivid : [{ h: 210, s: .8, l: .5 }]
}

export function nameLook(name, themeId) {
  const h = hash(String(name ?? '').trim().toLowerCase() || 'friend')
  const accents = accentsFor(themeId)
  const c = accents[(h >>> 8) % accents.length]
  const dark = DARK_LOOKS.has(themeId)
  // keep the theme's hue and richness, but set the lightness so it reads on the card behind it
  const light = dark ? Math.max(66, Math.round(c.l * 100)) : Math.min(40, Math.round(c.l * 100))
  return { font: FONTS[h % FONTS.length], hue: c.h, sat: Math.round(Math.max(.6, c.s) * 100), light, dark }
}

export default function FancyName({ name, as: Tag = 'span', className = '' }) {
  const { theme } = useTheme()
  const look = nameLook(name, theme)
  return (
    <Tag className={'fancy-name ' + className}
      style={{ '--name-hue': look.hue, '--name-sat': look.sat + '%', '--name-l': look.light + '%', fontFamily: look.font }}>
      {name}
    </Tag>
  )
}
