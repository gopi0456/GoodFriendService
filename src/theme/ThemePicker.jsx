import Portal from '../matrimony/Portal'
import { THEMES } from './theme'

// the colour chooser opened by the dashboard's Theme button
export default function ThemePicker({ current, onPick, onClose }) {
  return (
    <Portal onEscape={onClose}>
      <div className="tp-overlay" onClick={onClose}>
        <div className="tp-sheet" role="dialog" aria-label="Colour theme" onClick={e => e.stopPropagation()}>
          <div className="tp-grab" />
          <h3>Colour theme</h3>
          <p>Pick a colour, or choose “Surprise me” for a new colour every time you open the app.</p>
          <div className="tp-grid">
            {THEMES.map(([key, label, swatch]) => (
              <button key={key} className={`tp-tile ${current === key ? 'on' : ''}`} onClick={() => onPick(key)} aria-pressed={current === key}>
                <span className="tp-dot" style={{ background: swatch }}>{current === key ? '✓' : ''}</span>
                <b>{label}</b>
              </button>
            ))}
          </div>
          <button className="tp-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </Portal>
  )
}
