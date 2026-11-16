import { useEffect, useMemo, useState } from 'react'
import { buildKundli } from './kundli'
import { localize } from './localize'
import { LANGS, dict } from './i18n'
import { kundliPdf } from './kundliPdf'
import { savePdf } from './download'
import { FONT_FAMILY, ensureFont } from './fonts'
import ErrorBoundary from './ErrorBoundary'
import Portal from './Portal'
import { CHART_LINES, chartTexts } from './chartSpec'

function NorthChart({ houses, title }) {
  return (
    <div className="mm-chartbox">
      <div className="mm-chart-title">{title}</div>
      <svg viewBox="-4 -4 308 308" className="mm-chart">
        {CHART_LINES.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="#7a1a33" strokeWidth="1.5" />)}
        {chartTexts(houses).map((t, i) => (
          <text key={i} x={t.x} y={t.y + 3} textAnchor="middle" fontSize={t.size + 2} fontWeight={t.bold ? 700 : 400} fill={t.gray ? '#888' : '#111'}>{t.text}</text>
        ))}
      </svg>
    </div>
  )
}

const Rows = ({ rows }) => (
  <div className="ride-details">
    {rows.map(([label, value]) => (
      <div className="detail-row" key={label}><span className="label">{label}</span><span className="value">{value}</span></div>
    ))}
  </div>
)

const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)))

// birth = { name, gender, dob, time, place, utcOffset }
function KundliInner({ birth, onClose }) {
  const [mode, setMode] = useState('minimal')
  const [lang, setLang] = useState('en')
  const [stage, setStage] = useState('') // '' = idle, otherwise what we are doing
  const birthKey = JSON.stringify(birth) // stable key: the parent may pass a new object on every render

  const { k, L, error } = useMemo(() => {
    try {
      const kk = buildKundli(JSON.parse(birthKey), mode === 'full')
      return { k: kk, L: kk ? localize(kk, lang) : null, error: '' }
    } catch (e) {
      return { k: null, L: null, error: String((e && e.message) || e) }
    }
  }, [birthKey, mode, lang])

  // load the language's font so the screen matches the PDF
  useEffect(() => { ensureFont(lang, JSON.stringify(dict(lang))) }, [lang])

  const download = async () => {
    if (stage) return
    const watchdog = setTimeout(() => setStage(''), 45000) // the button can never stay stuck
    try {
      setStage('Loading font...'); await nextFrame()
      await ensureFont(lang, JSON.stringify(dict(lang)))
      setStage('Making PDF...'); await nextFrame()
      const bytes = kundliPdf(k, lang)
      setStage('Saving...'); await nextFrame()
      const safe = (birth.name || 'profile').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profile'
      await savePdf(bytes, `Kundli-${safe}-${mode}-${lang}.pdf`)
    } catch (e) {
      alert('Could not save the PDF: ' + ((e && e.message) || e))
    } finally { clearTimeout(watchdog); setStage('') }
  }

  const family = FONT_FAMILY[lang] ? `"${FONT_FAMILY[lang]}", sans-serif` : undefined

  return (
    <Portal onEscape={onClose}>
    <div className="mm-sheet-overlay" onClick={onClose}>
      <div className="mm-sheet mm-kundli" onClick={e => e.stopPropagation()}>
        <button className="mm-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="mm-kundli-head">
          <div className="mm-kundli-title">📜 Kundli</div>
          <div>{birth.name || 'Profile'}</div>
        </div>

        <div className="mm-body" style={{ paddingTop: 12 }}>
          {error && <div className="mm-banner bad">Could not make the kundli: {error}</div>}
          {!error && !k ? (
            <div className="mm-banner warn">Date and time of birth are needed to make a kundli.</div>
          ) : !error && (
            <>
              <div className="mm-row" style={{ marginBottom: 10 }}>
                <div className="mm-subtabs" style={{ marginBottom: 0 }}>
                  <div className={`mm-subtab ${mode === 'minimal' ? 'active' : ''}`} onClick={() => setMode('minimal')}>Minimal</div>
                  <div className={`mm-subtab ${mode === 'full' ? 'active' : ''}`} onClick={() => setMode('full')}>Full</div>
                </div>
                <select className="input mm-select" style={{ marginBottom: 0 }} value={lang} onChange={e => setLang(e.target.value)} aria-label="Language">
                  {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              <div style={{ fontFamily: family }}>
                <div className="mm-section-title">{L.ui.birth}</div>
                <Rows rows={L.birthRows} />
                <div className="mm-section-title">{L.ui.panchang}</div>
                <Rows rows={L.panchangRows} />
                <div className="mm-section-title">{L.ui.moonAttr}</div>
                <Rows rows={L.moonRows} />

                {L.full && (
                  <>
                    <div className="mm-section-title">{L.ui.charts}</div>
                    {L.noLagnaNote && <div className="mm-banner warn">{L.noLagnaNote}</div>}
                    <NorthChart houses={L.rashiChart} title={L.rashiTitle} />
                    <NorthChart houses={L.navamsaChart} title={L.navamsaTitle} />

                    <div className="mm-section-title">{L.ui.planets}</div>
                    <div className="mm-scroll">
                      <table className="mm-table">
                        <thead><tr>{L.planetHeaders.map(h => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>{L.planetRows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
                      </table>
                    </div>

                    <div className="mm-section-title">{L.ui.manglik}</div>
                    <div className={`mm-banner ${L.manglikWarn ? 'warn' : 'ok'}`}>{L.manglikText}<br /><span className="text-sm">{L.marsText}</span></div>
                  </>
                )}

                <div className="mm-section-title">{L.ui.dasha}</div>
                <p className="text-sm" style={{ marginBottom: 6 }}><b>{L.dashaBalance}</b></p>
                {L.dashaRunning && <p className="text-sm" style={{ marginBottom: 6 }}>{L.dashaRunning}</p>}
                <div className="mm-scroll">
                  <table className="mm-table">
                    <thead><tr><th>{L.ui.mahadasha}</th><th>{L.ui.from}</th><th>{L.ui.to}</th></tr></thead>
                    <tbody>{L.dashaRows.map(r => <tr key={r[0]}><td>{r[0]} ({r[3]})</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
                  </table>
                </div>

                <div className="mm-note">{L.ui.note}</div>
              </div>
            </>
          )}
        </div>

        <div className="mm-footer">
          <button className="btn mm-btn-light" onClick={onClose}>Close</button>
          <button className="btn mm-btn-pink" disabled={!k || !!stage} onClick={download}>{stage || '⬇️ Download PDF'}</button>
        </div>
      </div>
    </div>
    </Portal>
  )
}

// a crash inside the kundli shows a message with a Back button instead of freezing the app
export default function KundliView(props) {
  return (
    <ErrorBoundary onBack={props.onClose}>
      <KundliInner {...props} />
    </ErrorBoundary>
  )
}
