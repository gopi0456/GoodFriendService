import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { ageOf, MATCH_NOTE } from './utils'
import { computeCompat } from './compat'
import { ashtakoot, horoOf } from './astro'
import { nameMatch } from './names'
import CompatCard from './CompatCard'
import HoroscopeCard from './HoroscopeCard'
import NameMatchCard from './NameMatchCard'

const colorOf = (n) => (n >= 75 ? '#059669' : n >= 60 ? '#2563eb' : n >= 45 ? '#d97706' : '#dc2626')

function pairResult(A, B) {
  const c = computeCompat(A, B)
  const profile = c && c.percent != null ? c.percent : null
  const ha = horoOf(A), hb = horoOf(B)
  const guna = ha && hb && A.gender !== B.gender
    ? ashtakoot(A.gender === 'male' ? ha : hb, A.gender === 'male' ? hb : ha).total
    : null
  const nm = nameMatch(A.full_name, B.full_name)
  const parts = []
  if (profile !== null) parts.push([profile, 0.4])
  if (guna !== null) parts.push([(guna / 36) * 100, 0.4])
  if (nm) parts.push([nm.percent, 0.2])
  const w = parts.reduce((a, p) => a + p[1], 0)
  const overall = w ? Math.round(parts.reduce((a, p) => a + p[0] * p[1], 0) / w) : null
  return { B, profile, guna, name: nm ? nm.percent : null, overall }
}

export default function AdminMatch({ canMark = false }) {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [aId, setAId] = useState('')
  const [qA, setQA] = useState('')
  const [qB, setQB] = useState('')
  const [picked, setPicked] = useState(new Set())
  const [results, setResults] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [notes, setNotes] = useState({})

  useEffect(() => {
    supabase.from('matrimony_profiles').select('*').in('status', ['pending', 'approved']).order('full_name').range(0, 999)
      .then(({ data, error }) => { if (error) alert('Error: ' + error.message); setAll(data || []); setLoading(false) })
  }, [])

  const A = all.find(p => p.user_id === aId)
  const term = (s) => s.trim().toLowerCase()
  const optionsA = all.filter(p => !term(qA) || p.full_name.toLowerCase().includes(term(qA)))
  const candidates = A ? all.filter(p => p.gender !== A.gender && (!term(qB) || p.full_name.toLowerCase().includes(term(qB)))) : []

  const toggle = (id) => setPicked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectShown = () => setPicked(s => new Set([...s, ...candidates.map(p => p.user_id)]))
  const clearAll = () => { setPicked(new Set()); setResults(null) }
  const changeA = (id) => { setAId(id); setPicked(new Set()); setResults(null); setOpenId(null) }

  const compare = () => {
    if (!A) return alert('Choose the first profile')
    if (!picked.size) return alert('Choose at least one profile to compare with')
    const rows = [...picked].map(id => all.find(p => p.user_id === id)).filter(Boolean).map(B => pairResult(A, B))
    rows.sort((x, y) => (y.overall ?? -1) - (x.overall ?? -1))
    setResults(rows); setOpenId(null)
  }

  const markMarried = async (X, Y) => {
    const groom = X.gender === 'male' ? X : Y
    const bride = X.gender === 'male' ? Y : X
    if (!window.confirm(`Mark ${groom.full_name} and ${bride.full_name} as married?\n\nBoth profiles are removed from Browse and shown on the dashboard as a completed match.`)) return
    const ins = await supabase.from('matrimony_success').insert({
      groom_id: groom.user_id, bride_id: bride.user_id, groom_name: groom.full_name, bride_name: bride.full_name,
      groom_photo: groom.photo_path, bride_photo: bride.photo_path, note: (notes[Y.user_id] || '').trim() || null,
    })
    if (ins.error) return alert('Error: ' + ins.error.message + '\n\nHave you run matrimony-update7.sql?')
    const up = await supabase.from('matrimony_profiles').update({ status: 'married' }).in('user_id', [groom.user_id, bride.user_id])
    if (up.error) return alert('Error: ' + up.error.message)
    setAll(list => list.filter(p => p.user_id !== groom.user_id && p.user_id !== bride.user_id))
    setPicked(new Set()); setResults(null); setAId(''); setOpenId(null)
    alert('💍 Marked as married. Congratulations to the couple!')
  }

  if (loading) return <div className="mm-empty">Loading...</div>

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>1️⃣ First profile</h3>
        <input className="input" placeholder="Search name" value={qA} onChange={e => setQA(e.target.value)} />
        <select className="input mm-select" value={aId} onChange={e => changeA(e.target.value)}>
          <option value="">Select a profile ({optionsA.length})</option>
          {optionsA.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name} - {p.gender === 'male' ? 'Groom' : 'Bride'}, {ageOf(p)}</option>)}
        </select>
        {A && <div className="text-sm">Comparing {A.gender === 'male' ? '🤵 groom' : '👰 bride'} <b>{A.full_name}</b> with {A.gender === 'male' ? 'brides' : 'grooms'}.</div>}
      </div>

      {A && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>2️⃣ Compare with ({picked.size} selected)</h3>
          <input className="input" placeholder="Search name" value={qB} onChange={e => setQB(e.target.value)} />
          <div className="mm-row" style={{ marginBottom: 8 }}>
            <button className="btn btn-sm mm-btn-light" onClick={selectShown}>Select all shown ({candidates.length})</button>
            <button className="btn btn-sm mm-btn-light" onClick={clearAll}>Clear</button>
          </div>
          <div className="mm-picklist">
            {candidates.map(p => (
              <label key={p.user_id} className="mm-check">
                <input type="checkbox" checked={picked.has(p.user_id)} onChange={() => toggle(p.user_id)} />
                <span>{p.full_name}, {ageOf(p)}{p.city ? ` - ${p.city}` : ''}</span>
              </label>
            ))}
            {candidates.length === 0 && <div className="mm-empty">No profiles of the other gender yet.</div>}
          </div>
          <button className="btn mm-btn-pink" onClick={compare}>💞 Check match{picked.size > 1 ? 'es' : ''}</button>
        </div>
      )}

      {results && (
        <div>
          <div className="mm-section-title">Results (best first)</div>
          {results.map(r => (
            <div className="card" key={r.B.user_id}>
              <div className="mm-result-head" onClick={() => setOpenId(openId === r.B.user_id ? null : r.B.user_id)}>
                <div className="mm-result-score" style={{ color: r.overall != null ? colorOf(r.overall) : '#6b7280' }}>
                  {r.overall != null ? <>{r.overall}%<sup>*</sup></> : '-'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-bold">{A.full_name} ❤ {r.B.full_name}</div>
                  <div className="text-sm">
                    Profile {r.profile != null ? `${r.profile}%` : '-'} · Horoscope {r.guna != null ? `${r.guna}/36` : '-'} · Name {r.name != null ? `${r.name}%` : '-'}
                  </div>
                  <div className="text-sm">{openId === r.B.user_id ? '▲ Hide details' : '▼ Tap for details'}</div>
                </div>
              </div>
              {openId === r.B.user_id && (
                <div style={{ marginTop: 10 }}>
                  <CompatCard me={A} profile={r.B} title="Profile match" subtitle="based on profile details" />
                  <HoroscopeCard me={A} profile={r.B} names={{ a: A.full_name, b: r.B.full_name }} />
                  <NameMatchCard a={A.full_name} b={r.B.full_name} />
                  {canMark && (
                    <div className="card" style={{ background: '#fff7ed' }}>
                      <div className="text-bold" style={{ marginBottom: 6 }}>💍 Match completed?</div>
                      <input className="input" placeholder="Optional note (wedding date, place...)" value={notes[r.B.user_id] || ''}
                        onChange={e => setNotes(n => ({ ...n, [r.B.user_id]: e.target.value }))} />
                      <button className="btn mm-btn-pink" onClick={() => markMarried(A, r.B)}>💍 Mark as married</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="mm-note">* {MATCH_NOTE} The overall score combines profile (40%), horoscope (40%) and name (20%) matching, using whichever are available.</div>
        </div>
      )}
    </div>
  )
}
