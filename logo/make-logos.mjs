// Generates the logo concept files in this folder:  node logo/make-logos.mjs
import fs from 'fs'

const INK = '#16233a', BLUE = '#2d8fe6'
const FONT = "font-family=\"'Nunito','Quicksand','Segoe UI',system-ui,sans-serif\""

// Marks are drawn in a 120 x 120 box.
const marks = {
  // 1. a dot clicks into the gap of a timer ring
  click: `<circle cx="60" cy="60" r="36" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="188 38.2" transform="rotate(-61 60 60)"/>
    <circle cx="60" cy="24" r="10" fill="${BLUE}"/>`,
  // 2. L and I shoulder to shoulder; the dot of the I is the piece that has locked in
  li: `<path d="M30 20V92H66" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M90 58V92" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
    <path d="M82 31V27a8 8 0 0 1 16 0V31" fill="none" stroke="${BLUE}" stroke-width="5.5" stroke-linecap="round"/>
    <rect x="76" y="30" width="28" height="22" rx="7" fill="${BLUE}"/>
    <circle cx="90" cy="40" r="3" fill="#fff"/>`,
  // 3. a bolt slides into its slot
  slot: `<rect x="12" y="38" width="96" height="44" rx="22" fill="none" stroke="${INK}" stroke-width="10"/>
    <rect x="52" y="49" width="42" height="22" rx="11" fill="${BLUE}"/>
    <path d="M24 60h14" stroke="${BLUE}" stroke-width="7" stroke-linecap="round"/>`,
  // 5. three tiles in a grid, the fourth sliding into place
  tile: `<rect x="16" y="16" width="40" height="40" rx="11" fill="${INK}"/>
    <rect x="64" y="16" width="40" height="40" rx="11" fill="${INK}"/>
    <rect x="16" y="64" width="40" height="40" rx="11" fill="${INK}"/>
    <rect x="64" y="64" width="40" height="40" rx="11" fill="none" stroke="${BLUE}" stroke-width="4" stroke-dasharray="5 6"/>
    <rect x="70" y="70" width="40" height="40" rx="11" fill="${BLUE}"/>`,
}

// 4. a wordmark built from single strokes, with a keyhole for the O
const word = `<g fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 0V56H30"/>
    <rect x="46" y="0" width="34" height="56" rx="17"/>
    <path d="M130 0H113A17 17 0 0 0 96 17V39A17 17 0 0 0 113 56H130"/>
    <path d="M146 0V56M180 0L148 30M158 22L180 56"/>
    <path d="M230 0V56"/>
    <path d="M254 56V0L288 56V0"/>
  </g>
  <circle cx="63" cy="22" r="5.5" fill="${BLUE}"/>
  <path d="M63 31V40" stroke="${BLUE}" stroke-width="7" stroke-linecap="round"/>`

const solo = (m, size = 480) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="LOCK IN">${m}</svg>\n`
const lockup = m =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 120" width="1040" height="240" role="img" aria-label="LOCK IN">
  <g>${m}</g>
  <text x="150" y="78" ${FONT} font-weight="800" font-size="52" letter-spacing="7" fill="${INK}">LOCK<tspan fill="${BLUE}"> IN</tspan></text>
</svg>\n`

const files = {}
for (const [name, m] of Object.entries(marks)) {
  files[`concept-${name}.svg`] = solo(m)
  files[`concept-${name}-lockup.svg`] = lockup(m)
}
files['concept-keyhole-wordmark.svg'] =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 322 80" width="966" height="240" role="img" aria-label="LOCK IN"><g transform="translate(17 12)">${word}</g></svg>\n`
for (const [n, c] of Object.entries(files)) fs.writeFileSync(`logo/${n}`, c)

// A contact sheet to compare them side by side.
const cards = [
  ['1  Click', marks.click, 'a dot locks into the timer ring'],
  ['2  LI', marks.li, 'L and I, the dot is the piece that clicked in'],
  ['3  Slot', marks.slot, 'a bolt sliding into its slot'],
  ['5  Tiles', marks.tile, 'the last tile snaps into the grid'],
]
const cell = (i, [title, m, note]) => {
  const x = 30 + (i % 2) * 540, y = 30 + Math.floor(i / 2) * 330
  return `<g transform="translate(${x} ${y})">
    <rect width="500" height="300" rx="24" fill="#f4f8fc" stroke="#dbe6f1"/>
    <g transform="translate(26 24) scale(1.0)">${m}</g>
    <g transform="translate(160 66)"><text ${FONT} font-weight="800" font-size="40" letter-spacing="5" fill="${INK}">LOCK<tspan fill="${BLUE}"> IN</tspan></text></g>
    <text x="160" y="104" ${FONT} font-size="17" fill="#64748b">${note}</text>
    <text x="28" y="270" ${FONT} font-weight="700" font-size="18" fill="${INK}">${title}</text>
    <g transform="translate(330 150) scale(.8)"><rect width="120" height="120" rx="28" fill="${BLUE}"/><g transform="translate(14 14) scale(.77)" style="filter:brightness(0) invert(1)">${m}</g></g>
  </g>`
}
const wm = `<g transform="translate(30 690)">
    <rect width="1040" height="190" rx="24" fill="#f4f8fc" stroke="#dbe6f1"/>
    <g transform="translate(300 62) scale(1.3)">${word}</g>
    <text x="28" y="40" ${FONT} font-weight="700" font-size="18" fill="${INK}">4  Keyhole wordmark</text>
    <text x="28" y="165" ${FONT} font-size="17" fill="#64748b">single-stroke letters, the O is a keyhole</text>
  </g>`
fs.writeFileSync('logo/concepts-sheet.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 910" width="1100" height="910"><rect width="1100" height="910" fill="#fff"/>${cards.map((c, i) => cell(i, c)).join('')}${wm}</svg>\n`)
console.log(Object.keys(files).length + 1, 'files written')
