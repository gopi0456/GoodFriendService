import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { CITIES, STATES, OUTSIDE } from './places'
import { CASTES } from './castes'
import SearchSelect from './SearchSelect'
import ProfileView, { ProfileCard } from './ProfileView'
import ScoreBadges from './ScoreBadges'
import { computeCompat } from './compat'

const PAGE = 15
const ALL_PLACES = [...new Set([...STATES.filter(s => s !== OUTSIDE), ...Object.values(CITIES).flat()])]
const ALL_CASTES = [...new Set(Object.values(CASTES).flat())].filter(c => c !== 'Other').sort()
// quotes and * would break the filter syntax; brackets and commas are safe because values are quoted
const clean = (s) => s.replace(/["*]/g, ' ').replace(/\s+/g, ' ').trim()

export default function Browse({ userId, me, rel }) {
  // the list is fixed by the user's own profile and cannot be changed: men see brides, women see grooms
  const target = me.gender === 'male' ? 'female' : 'male'
  const targetLabel = target === 'female' ? '👰 Brides' : '🤵 Grooms'

  const [filters, setFilters] = useState({ ageMin: 21, ageMax: 40, caste: '', places: [] })
  const [placeInput, setPlaceInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [more, setMore] = useState(false)
  const [open, setOpen] = useState(null)
  const [sort, setSort] = useState('new')

  const load = useCallback(async (reset, f) => {
    setLoading(true)
    const from = reset ? 0 : items.length
    let q = supabase.from('matrimony_directory').select('*')
      .neq('user_id', userId).eq('gender', target)
      .gte('age', Number(f.ageMin) || 18)
      .lte('age', Number(f.ageMax) || 80)
    if (f.caste.trim()) q = q.ilike('caste', `%${clean(f.caste)}%`)
    if (f.places.length) {
      // any of the chosen places can match the city or the state
      q = q.or(f.places.map(p => `city.ilike."*${clean(p)}*",state.ilike."*${clean(p)}*"`).join(','))
    }
    const { data, error } = await q.order('created_at', { ascending: false }).range(from, from + PAGE - 1)
    if (error) alert('Error: ' + error.message)
    const rows = data || []
    setItems(prev => (reset ? rows : [...prev, ...rows]))
    setMore(rows.length === PAGE)
    setLoading(false)
  }, [userId, target, items.length])

  useEffect(() => { load(true, filters) }, []) // first load only

  const addPlaceValue = (v) => {
    const p = clean(v || '')
    if (!p) return
    setFilters(f => (f.places.some(x => x.toLowerCase() === p.toLowerCase()) ? f : { ...f, places: [...f.places, p] }))
    setPlaceInput('')
  }
  const removePlace = (p) => setFilters(f => ({ ...f, places: f.places.filter(x => x !== p) }))

  const apply = () => {
    const p = clean(placeInput)
    const f = p && !filters.places.some(x => x.toLowerCase() === p.toLowerCase()) ? { ...filters, places: [...filters.places, p] } : filters
    setFilters(f)
    setPlaceInput('')
    setShowFilters(false)
    load(true, f)
  }
  const reset = () => {
    const f = { ageMin: 21, ageMax: 40, caste: '', places: [] }
    setFilters(f); setPlaceInput(''); load(true, f)
  }

  const pct = (p) => {
    const c = computeCompat(me, p)
    return c && c.percent != null ? c.percent : null
  }
  const sorted = sort === 'match' ? [...items].sort((a, b) => (pct(b) ?? -1) - (pct(a) ?? -1)) : items
  const activeCount = (filters.caste.trim() ? 1 : 0) + (filters.places.length ? 1 : 0)

  return (
    <div>
      <div className="mm-locked">Showing: <b>{targetLabel}</b> <span>🔒 based on your profile</span></div>

      {me.status !== 'approved' && (
        <div className="mm-banner warn" style={{ marginTop: 10, marginBottom: 0 }}>⏳ Waiting for admin approval. Full details show once you are approved.</div>
      )}

      <button className="btn mm-btn-light" style={{ marginTop: 10 }} onClick={() => setShowFilters(s => !s)}>
        🔍 Filters{activeCount ? ` (${activeCount})` : ''} {showFilters ? '▲' : '▼'}
      </button>

      {showFilters && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="mm-row">
            <div className="input-group"><label>Age from</label>
              <input className="input" type="number" inputMode="numeric" value={filters.ageMin} onChange={e => setFilters(f => ({ ...f, ageMin: e.target.value }))} /></div>
            <div className="input-group"><label>Age to</label>
              <input className="input" type="number" inputMode="numeric" value={filters.ageMax} onChange={e => setFilters(f => ({ ...f, ageMax: e.target.value }))} /></div>
          </div>

          <div className="input-group"><label>Caste / sub-caste</label>
            <SearchSelect value={filters.caste} onChange={v => setFilters(f => ({ ...f, caste: v }))} options={ALL_CASTES} placeholder="Type or pick a caste (any if empty)" />
          </div>

          <div className="input-group"><label>Locations (add one or more)</label>
            <SearchSelect value={placeInput} onChange={setPlaceInput} options={ALL_PLACES} placeholder="Type a city or state" onPick={addPlaceValue} />
            <button type="button" className="btn btn-sm mm-btn-light" style={{ marginTop: 8 }} onClick={() => addPlaceValue(placeInput)}>➕ Add this place</button>
            {filters.places.length > 0 && (
              <div className="mm-chips">
                {filters.places.map(p => <span className="mm-chip" key={p}>📍 {p} <b onClick={() => removePlace(p)}>✕</b></span>)}
              </div>
            )}
            <div className="text-sm" style={{ marginTop: 6 }}>Profiles from any of these places are shown. Location and caste are visible only on approved profiles.</div>
          </div>

          <div className="mm-row">
            <button className="btn mm-btn-light" onClick={reset}>Reset</button>
            <button className="btn mm-btn-pink" onClick={apply}>Apply filters</button>
          </div>
        </div>
      )}

      <div className="mm-subtabs" style={{ marginTop: 14 }}>
        <div className={`mm-subtab ${sort === 'new' ? 'active' : ''}`} onClick={() => setSort('new')}>🕒 Newest</div>
        <div className={`mm-subtab ${sort === 'match' ? 'active' : ''}`} onClick={() => setSort('match')}>💖 Best match*</div>
      </div>

      <div>
        {sorted.map(p => (
          <ProfileCard key={p.user_id} profile={p} onOpen={() => setOpen(p)} footer={<ScoreBadges me={me} p={p} rel={rel} />} />
        ))}
        {!loading && items.length === 0 && <div className="mm-empty">No profiles match these filters yet.</div>}
        {loading && <div className="mm-empty">Loading...</div>}
        {more && !loading && <button className="btn mm-btn-light" onClick={() => load(false, filters)}>Load more</button>}
        {items.length > 0 && <div className="mm-note">* Online matching is for reference only. For more accurate guidance, please consult an astrologer.</div>}
      </div>

      {open && <ProfileView profile={open} userId={userId} me={me} rel={rel} onClose={() => setOpen(null)} />}
    </div>
  )
}
