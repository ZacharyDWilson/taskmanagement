// Clean outline icons that all share one line width, rounded ends, and no fill (so they stay
// transparent and take on the surrounding text color). Brightness is controlled by CSS.
const ICONS = {
  // list with a magnifier: your overview
  overview: (
    <>
      <path d="M19 12V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h5" />
      <path d="M8 9h.01M11 9h5M8 13h.01M11 13h5M8 17h.01M11 17h1.5" />
      <circle cx="17" cy="17" r="3" />
      <path d="m19.2 19.2 1.8 1.8" />
    </>
  ),
  // clipboard with ticked rows: to do
  todo: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="3" />
      <rect x="9" y="2.5" width="6" height="4" rx="1.5" />
      <path d="m8 10.5 1.2 1.2 2-2.2M13.5 10.5h3M8 14.5l1.2 1.2 2-2.2M13.5 14.5h3M8 18.5l1.2 1.2 2-2.2M13.5 18.5h3" />
    </>
  ),
  // paper plane: share to the feed
  feed: (
    <>
      <path d="M21.5 2.5 2.5 9.8l7.6 3 3 7.7z" />
      <path d="M21.5 2.5 10.1 12.8" />
    </>
  ),
  // stopwatch: pomodoro
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 6V3M9.5 2.5h5" />
      <path d="M12 9.5v4l2.6 1.6" />
      <path d="m18.6 7.4 1.2-1.2" />
    </>
  ),
  // open book: study buddy
  book: (
    <>
      <path d="M12 6.5C10.3 5 8 4.5 4 4.5v13c4 0 6.3.5 8 2 1.7-1.5 4-2 8-2v-13c-4 0-6.3.5-8 2z" />
      <path d="M12 6.5v13" />
    </>
  ),
}

export default function Icon({ name, size = 26 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  )
}
