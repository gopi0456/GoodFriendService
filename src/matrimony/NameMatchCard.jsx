import { nameMatch } from './names'

export default function NameMatchCard({ a, b }) {
  const m = nameMatch(a, b)
  if (!m) return <div className="mm-banner warn">Name matching needs both names written in English letters.</div>
  return (
    <div className="mm-compat">
      <div className="mm-compat-top">
        <div className="mm-ring"><div className="mm-guna" style={{ borderColor: m.verdict.color, color: m.verdict.color }}><b>{m.percent}%<sup>*</sup></b></div></div>
        <div className="mm-compat-main">
          <div className="mm-compat-label">🔤 Name match (numerology)</div>
          <div className="mm-verdict" style={{ color: m.verdict.color }}>{m.verdict.emoji} {m.verdict.title}</div>
          <div className="text-sm">{a} &amp; {b}</div>
        </div>
      </div>
      <details className="mm-compat-more">
        <summary>See the name numbers</summary>
        {m.parts.map(p => (
          <div className="mm-factor" key={p.label}>
            <span className="mm-factor-icon">{p.score >= 85 ? '✅' : p.score >= 65 ? '🟡' : '❌'}</span>
            <span className="mm-factor-label">{p.label}</span>
            <span className="mm-factor-note">{p.a} &amp; {p.b} → {p.score}%</span>
          </div>
        ))}
        <div className="text-sm" style={{ marginTop: 6 }}>💐 A name is only the beginning. Trust, respect and understanding build a happy married life together.</div>
      </details>
    </div>
  )
}
