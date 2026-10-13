import { colorHex } from '../lib/colors.js'
import { publicUrl } from '../lib/storage.js'

// `frame` is a cosmetic id such as "frame-gold"; its look lives in styles.css.
export default function Avatar({ name = '?', path, color, frame = 'frame-none', size = 36 }) {
  const pad = frame === 'frame-none' ? 0 : Math.max(2, Math.round(size / 12))
  const inner = size - pad * 2
  const style = { width: inner, height: inner, fontSize: inner * 0.45 }

  const face = path
    ? <img className="avatar" style={style} src={publicUrl(path)} alt={name} />
    : (
      <span className="avatar" style={{ ...style, background: colorHex(color) }}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </span>
    )

  if (!pad) return face
  return <span className={`frame ${frame}`} style={{ padding: pad }}>{face}</span>
}
