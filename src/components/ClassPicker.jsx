import { useId } from 'react'

// Pick the class/subject a task is for: type a new one, or tap one you've used before.
export default function ClassPicker({ value, onChange, options = [], placeholder = 'Class or subject (optional)', compact = false }) {
  const listId = useId()
  return (
    <div className="class-picker">
      <input value={value} maxLength={60} placeholder={placeholder} list={listId}
        onChange={e => onChange(e.target.value)} />
      <datalist id={listId}>{options.map(c => <option key={c} value={c} />)}</datalist>
      {!compact && options.length > 0 && (
        <div className="chips">
          {options.slice(0, 6).map(c => (
            <button key={c} type="button" className={'chip' + (value === c ? ' on' : '')}
              onClick={() => onChange(value === c ? '' : c)}>{c}</button>
          ))}
        </div>
      )}
    </div>
  )
}
