import { useId } from 'react'

// The LOCK IN mark (an L whose foot has clicked into place, and an I with a padlock for its dot) drawn in one
// colour: it takes the surrounding text colour, with the foot and the padlock a step fainter, so it sits in
// every theme like an overlay instead of adding a new colour. Used in the top bar, login card and splash.
export default function Logo({ size = 26, className = '' }) {
  const id = 'lm' + useId().replace(/:/g, '')
  return (
    <svg className={'logo-mark ' + className} viewBox="8 10 104 94" height={size} width={Math.round(size * 104 / 94)} aria-hidden="true" focusable="false">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="130" height="120">
          <rect width="130" height="120" fill="#fff" />
          <circle cx="94.5" cy="41" r="3.4" fill="#000" />
        </mask>
      </defs>
      <path d="M20.5 20V93H49.5" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M94.5 66V93" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
      <g className="logo-accent">
        <rect x="57.5" y="86" width="20" height="14" rx="7" fill="currentColor" />
        <g mask={`url(#${id})`}>
          <path d="M88.5 33V29a6 6 0 0 1 12 0V33" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <rect x="82.5" y="32" width="24" height="20" rx="6" fill="currentColor" />
        </g>
      </g>
    </svg>
  )
}
