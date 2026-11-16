import { useMemo, useState } from 'react'

// A text box you can always type in, with a tappable suggestion list underneath (works on phones).
export default function SearchSelect({ value, onChange, options, placeholder, maxShow = 8, onPick }) {
  const [open, setOpen] = useState(false)
  const q = (value || '').trim().toLowerCase()
  const list = useMemo(() => {
    if (!open) return []
    return options.filter(o => !q || o.toLowerCase().includes(q)).slice(0, maxShow)
  }, [open, q, options, maxShow])
  const exact = list.length === 1 && list[0].toLowerCase() === q

  const choose = (o) => { onChange(o); setOpen(false); if (onPick) onPick(o) }

  return (
    <div className="mm-ss">
      <input className="input" value={value} placeholder={placeholder} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && list.length > 0 && !exact && (
        <div className="mm-ss-list">
          {list.map(o => (
            <div key={o} className="mm-ss-item" onMouseDown={e => { e.preventDefault(); choose(o) }} onClick={() => choose(o)}>{o}</div>
          ))}
        </div>
      )}
    </div>
  )
}
