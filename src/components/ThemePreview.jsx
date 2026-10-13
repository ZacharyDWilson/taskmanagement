// A theme's colour palette with a small picture of what the page looks like in it. The pictures are screenshots of
// the real page, one per theme, kept in src/assets/theme-previews/<theme id>.jpg. A theme without a picture
// still shows its palette.
const pictures = import.meta.glob('../assets/theme-previews/*.jpg', { eager: true, query: '?url', import: 'default' })

export default function ThemePreview({ id, colors = [] }) {
  const src = pictures[`../assets/theme-previews/${id}.jpg`]
  return (
    <span className="theme-preview" aria-hidden="true">
      {src && <img className="theme-shot" src={src} alt="" loading="lazy" draggable="false" />}
      <span className="theme-swatch">
        {colors.map((c, i) => <i key={i} style={{ background: c }} />)}
      </span>
    </span>
  )
}
