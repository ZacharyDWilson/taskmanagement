import { COLORS } from '../lib/colors.js'

export default function ColorPicker({ value, onChange }) {
  return (
    <span className="swatches">
      {COLORS.map(c => (
        <button
          key={c.id}
          type="button"
          title={c.id}
          aria-label={c.id}
          aria-pressed={value === c.id}
          className={'swatch' + (value === c.id ? ' on' : '')}
          style={{ background: c.hex }}
          onClick={() => onChange(c.id)}
        />
      ))}
    </span>
  )
}
