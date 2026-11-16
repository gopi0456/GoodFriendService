import { NAKSHATRA, RASHI, RASHI_EN, ashtakoot, horoOf } from './astro'

const label = (h) => `${RASHI[h.rashi]} (${RASHI_EN[h.rashi]}) · ${NAKSHATRA[h.nakshatra]}`

export default function HoroscopeCard({ me, profile, names }) {
  if (!me || !profile || me.gender === profile.gender) return null
  const a = horoOf(me)
  const b = horoOf(profile)

  if (!a) return <div className="mm-banner warn">{names ? <>🔮 Birth time is missing for <b>{names.a}</b>.</> : <>🔮 Add your birth time in <b>My Profile → Horoscope</b> to see horoscope matching.</>}</div>
  if (!b) return <div className="mm-banner warn">{names ? <>🔮 Birth time is missing for <b>{names.b}</b>.</> : <>🔮 This profile has not added a birth time yet, so horoscope matching is not available.</>}</div>

  const groom = me.gender === 'male' ? a : b
  const bride = me.gender === 'male' ? b : a
  const r = ashtakoot(groom, bride)

  return (
    <div className="mm-compat">
      <div className="mm-compat-top">
        <div className="mm-ring">
          <div className="mm-guna" style={{ borderColor: r.verdict.color, color: r.verdict.color }}>
            <b>{r.total}<sup>*</sup></b><span>/ 36</span>
          </div>
        </div>
        <div className="mm-compat-main">
          <div className="mm-compat-label">🔮 Horoscope match (Ashtakoot)</div>
          <div className="mm-verdict" style={{ color: r.verdict.color }}>{r.verdict.emoji} {r.verdict.title}</div>
          <div className="text-sm">{r.verdict.text}</div>
        </div>
      </div>

      <div className="text-sm" style={{ marginTop: 10 }}>{names ? names.a : 'You'}: {label(a)}</div>
      <div className="text-sm">{names ? names.b : 'Them'}: {label(b)}</div>

      {r.doshas.length > 0 && (
        <div className="mm-banner bad" style={{ marginTop: 10, marginBottom: 0 }}>
          ⚠️ Doshas to discuss with an astrologer: {r.doshas.join(', ')}
        </div>
      )}

      <details className="mm-compat-more">
        <summary>See the 8 koota scores</summary>
        {r.kootas.map(k => (
          <div className="mm-factor" key={k.name}>
            <span className="mm-factor-icon">{k.got >= k.max * 0.75 ? '✅' : k.got > 0 ? '🟡' : '❌'}</span>
            <span className="mm-factor-label">{k.name}</span>
            <span className="mm-factor-note">{k.got} / {k.max}</span>
          </div>
        ))}
        <div className="text-sm" style={{ marginTop: 6 }}>
          18 or more out of 36 is the traditional minimum. Vashya and Yoni use simplified tables, and Manglik (Kuja) dosha is not checked. Please confirm with your priest or astrologer.
        </div>
      </details>
    </div>
  )
}
