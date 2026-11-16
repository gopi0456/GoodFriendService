import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Avatar } from './ProfileView'
import KundliView from './KundliView'
import SearchSelect from './SearchSelect'
import { KNOWN_PLACES } from './cities'
import { TIMEZONES } from './MyProfile'
import { birthFromProfile } from './kundli'
import { ageOf } from './utils'

// Admin menu: the kundli of every profile (view + PDF download), and a kundli for anyone from typed-in details.
export default function AdminKundli({ perms, onEdit }) {
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [onlyTime, setOnlyTime] = useState(false)
  const [birth, setBirth] = useState(null)
  const [quick, setQuick] = useState(false)
  const [f, setF] = useState({ name: '', gender: '', dob: '', time: '', place: '', tz: '5.5' })

  useEffect(() => {
    supabase.from('matrimony_profiles')
      .select('user_id,full_name,gender,dob,birth_time,birth_place,birth_utc_offset,city,photo_path,status')
      .in('status', ['pending', 'approved', 'married']).order('full_name').range(0, 999)
      .then(({ data, error }) => { if (error) alert('Error: ' + error.message); setRows(data || []) })
  }, [])

  const make = (e) => {
    e.preventDefault()
    if (!f.dob) return alert('Enter the date of birth')
    if (!f.time) return alert('Enter the time of birth')
    setBirth({ name: f.name.trim() || 'Kundli', gender: f.gender === 'male' ? 'Male' : f.gender === 'female' ? 'Female' : '', dob: f.dob, time: f.time, place: f.place.trim(), utcOffset: Number(f.tz) })
  }
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))

  if (rows === null) return <div className="mm-empty">Loading...</div>
  const term = q.trim().toLowerCase()
  const shown = rows.filter(r => (!onlyTime || r.birth_time) && (!term || (r.full_name || '').toLowerCase().includes(term)))
  const withTime = rows.filter(r => r.birth_time).length

  return (
    <div>
      <div className="mm-banner ok">📜 {withTime} of {rows.length} profiles have a birth time, so their kundli is ready.</div>

      <button className="btn mm-btn-light" style={{ marginTop: 0 }} onClick={() => setQuick(v => !v)}>➕ Kundli for anyone {quick ? '▲' : '▼'}</button>
      {quick && (
        <form className="card" style={{ marginTop: 10 }} onSubmit={make}>
          <div className="input-group"><label>Name</label><input className="input" value={f.name} onChange={set('name')} /></div>
          <div className="mm-row">
            <div className="input-group"><label>Gender</label>
              <select className="input mm-select" value={f.gender} onChange={set('gender')}><option value="">-</option><option value="male">Male</option><option value="female">Female</option></select></div>
            <div className="input-group"><label>Date of birth *</label><input className="input" type="date" value={f.dob} onChange={set('dob')} /></div>
          </div>
          <div className="mm-row">
            <div className="input-group"><label>Time of birth *</label><input className="input" type="time" value={f.time} onChange={set('time')} /></div>
            <div className="input-group"><label>Time zone</label>
              <select className="input mm-select" value={f.tz} onChange={set('tz')}>{TIMEZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
          <div className="input-group"><label>Place of birth</label>
            <SearchSelect value={f.place} onChange={v => setF(x => ({ ...x, place: v }))} options={KNOWN_PLACES} placeholder="Type or pick the nearest big city" /></div>
          <button className="btn mm-btn-pink" type="submit">📜 Make kundli</button>
        </form>
      )}

      <input className="input" style={{ marginTop: 12 }} placeholder="Search a profile by name" value={q} onChange={e => setQ(e.target.value)} />
      <label className="mm-check" style={{ borderBottom: 0 }}><input type="checkbox" checked={onlyTime} onChange={e => setOnlyTime(e.target.checked)} /><span>Only profiles with a birth time</span></label>

      {shown.map(r => (
        <div className={`card mm-card mm-theme-${r.gender}`} key={r.user_id} style={{ cursor: 'default' }}>
          <Avatar profile={r} />
          <div className="mm-card-body">
            <div className="text-bold">{r.full_name}, {ageOf(r)}</div>
            <div className="text-sm">{r.dob} · {r.birth_time ? r.birth_time.slice(0, 5) : '⚠ birth time missing'}{(r.birth_place || r.city) ? ` · ${r.birth_place || r.city}` : ''}</div>
            <div style={{ marginTop: 8 }}>
              {r.birth_time
                ? <button className="btn btn-sm mm-btn-pink" style={{ width: 'auto' }} onClick={() => setBirth(birthFromProfile(r))}>📜 Kundli</button>
                : perms.add_profile && <button className="btn btn-sm mm-btn-light" style={{ width: 'auto' }} onClick={() => onEdit(r.user_id, r.full_name)}>✏️ Add birth time</button>}
            </div>
          </div>
        </div>
      ))}
      {shown.length === 0 && <div className="mm-empty">No profiles found.</div>}

      {birth && <KundliView birth={birth} onClose={() => setBirth(null)} />}
    </div>
  )
}
