import { scoresFor } from './scores'

// compact: shown on every list card - all three scores are always listed ("-" when not available)
export default function ScoreBadges({ me, p, rel }) {
  const s = scoresFor(me, p)
  const st = rel && (rel.sent[p.user_id] || rel.received[p.user_id])
  return (
    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span className="mm-match-badge">💖 {s.profile !== null ? `${s.profile}%*` : '-'}</span>
      <span className="mm-match-badge">🔮 {s.guna !== null ? `${s.guna}/36*` : '-'}</span>
      <span className="mm-match-badge">🔤 {s.name !== null ? `${s.name}%*` : '-'}</span>
      {st && <span className={`badge badge-${st}`}>{st}</span>}
      {p.status === 'pending' && <span className="badge badge-pending">New - basic info</span>}
    </div>
  )
}

// big: shown at the top of the profile popup
export function ScoreStrip({ me, profile }) {
  const s = scoresFor(me, profile)
  const tile = (icon, label, val, why) => (
    <div className="mm-score">
      <div className="mm-score-n">{val !== null ? val : '-'}</div>
      <div className="mm-score-l">{icon} {label}</div>
      {val === null && why && <div className="mm-score-s">{why}</div>}
    </div>
  )
  return (
    <div className="mm-scores">
      {tile('💖', 'Profile', s.profile !== null ? <>{s.profile}%<sup>*</sup></> : null, s.why.profile)}
      {tile('🔮', 'Horoscope', s.guna !== null ? <>{s.guna}<small>/36</small><sup>*</sup></> : null, s.why.guna)}
      {tile('🔤', 'Name', s.name !== null ? <>{s.name}%<sup>*</sup></> : null, s.why.name)}
    </div>
  )
}
