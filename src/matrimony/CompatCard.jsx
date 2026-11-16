import { computeCompat } from './compat'

export default function CompatCard({ me, profile, title = 'Match with you', subtitle = 'with your profile details' }) {
  const c = computeCompat(me, profile)
  if (!c) return <div className="mm-banner warn">Complete your own profile to see the match percentage.</div>
  if (c.unsupported) return <div className="mm-banner warn">{c.unsupported}</div>

  const R = 34
  const C = 2 * Math.PI * R
  return (
    <div className="mm-compat">
      <div className="mm-compat-top">
        <div className="mm-ring">
          <svg viewBox="0 0 80 80" width="88" height="88">
            <circle cx="40" cy="40" r={R} fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle cx="40" cy="40" r={R} fill="none" stroke={c.verdict.color} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(C * c.percent) / 100} ${C}`} transform="rotate(-90 40 40)" />
          </svg>
          <div className="mm-ring-num" style={{ color: c.verdict.color }}>{c.percent}%<sup>*</sup></div>
        </div>
        <div className="mm-compat-main">
          <div className="mm-compat-label">{title}</div>
          <div className="mm-verdict" style={{ color: c.verdict.color }}>{c.verdict.emoji} {c.verdict.title}</div>
          <div className="text-sm">{subtitle}</div>
        </div>
      </div>
      {c.coverage < 0.5 && <div className="text-sm" style={{ marginTop: 8 }}>Limited information so far. The score becomes more accurate once this profile is approved.</div>}
      <details className="mm-compat-more">
        <summary>How is this calculated?</summary>
        {c.factors.map(f => (
          <div className="mm-factor" key={f.label}>
            <span className="mm-factor-icon">{f.score >= 0.8 ? '✅' : f.score >= 0.5 ? '🟡' : '❌'}</span>
            <span className="mm-factor-label">{f.label}</span>
            <span className="mm-factor-note">{f.note}</span>
          </div>
        ))}
        <div className="text-sm" style={{ marginTop: 6 }}>Indicative only, based on profile details. Family, values and personal choice matter most.</div>
      </details>
    </div>
  )
}
