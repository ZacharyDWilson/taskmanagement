// The chosen LOCK IN logo: an "L" whose foot is the toggle slot (a bolt slides into it) and an "I" topped by a
// little padlock.   node logo/make-final.mjs   writes lock-in-*.svg and lock-in-preview.svg in this folder.
import fs from 'fs'

const INK = '#16233a', BLUE = '#2d8fe6', SKY = '#4aa9f5'
const FONT = `font-family="'Nunito','Quicksand','Segoe UI',system-ui,sans-serif"`

// 120 x 120 box. structure = the L and I, accent = the bolt and the padlock, hole = the keyhole dot.
const mark = (structure, accent, hole) => `<g transform="translate(-8.5 2)">
    <path d="M29 18V91H58" fill="none" stroke="${structure}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="66" y="84" width="20" height="14" rx="7" fill="${accent}"/>
    <path d="M103 64V91" stroke="${structure}" stroke-width="14" stroke-linecap="round"/>
    <path d="M97 31V27a6 6 0 0 1 12 0V31" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    <rect x="91" y="30" width="24" height="20" rx="6" fill="${accent}"/>
    <circle cx="103" cy="39" r="2.8" fill="${hole}"/>
  </g>`

const svg = (w, h, vb, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-label="LOCK IN">${body}</svg>\n`
const icon = (bg, structure, accent, hole, { rx = 28, k = .78 } = {}) =>
  svg(512, 512, '0 0 120 120', `<rect width="120" height="120" rx="${rx}" fill="${bg}"/>
  <g transform="translate(60 60) scale(${k}) translate(-60 -60)">${mark(structure, accent, hole)}</g>`)

fs.writeFileSync('logo/lock-in-mark.svg', svg(480, 480, '0 0 120 120', mark(INK, BLUE, '#fff')))
fs.writeFileSync('logo/lock-in-icon.svg', icon(BLUE, '#ffffff', INK, '#ffffff'))
fs.writeFileSync('logo/lock-in-icon-square.svg', icon(BLUE, '#ffffff', INK, '#ffffff', { rx: 0 }))
fs.writeFileSync('logo/lock-in-icon-maskable.svg', icon(BLUE, '#ffffff', INK, '#ffffff', { rx: 0, k: .62 }))
fs.writeFileSync('logo/lock-in-icon-dark.svg', icon(INK, '#ffffff', SKY, INK))
fs.writeFileSync('logo/lock-in-lockup.svg', svg(1040, 240, '0 0 520 120', `${mark(INK, BLUE, '#fff')}
  <text x="150" y="78" ${FONT} font-weight="800" font-size="52" letter-spacing="7" fill="${INK}">LOCK<tspan fill="${BLUE}"> IN</tspan></text>`))

// small-size check: how it reads at app sizes
const sizes = [96, 48, 32, 20].map((s, i) => {
  const x = 50 + [0, 120, 190, 245][i]
  return `<g transform="translate(${x} 250) scale(${s / 120})">${icon(BLUE, '#fff', INK, '#fff').replace(/<\/?svg[^>]*>/g, '')}</g>`
}).join('')
fs.writeFileSync('logo/lock-in-preview.svg', svg(900, 420, '0 0 900 420', `<rect width="900" height="420" fill="#f4f8fc"/>
  <g transform="translate(30 20) scale(1.6)">${mark(INK, BLUE, '#fff')}</g>
  <text x="250" y="110" ${FONT} font-weight="800" font-size="64" letter-spacing="9" fill="${INK}">LOCK<tspan fill="${BLUE}"> IN</tspan></text>
  <text x="252" y="150" ${FONT} font-size="20" fill="#64748b">L whose foot clicks into place, I topped with a padlock</text>
  <g transform="translate(500 190) scale(1.5)">${icon(INK, '#fff', SKY, INK).replace(/<\/?svg[^>]*>/g, '')}</g>
  ${sizes}`))
console.log('written')
