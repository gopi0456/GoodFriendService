import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const FALLBACK_CITIES = ['Mumbai', 'Pune', 'Delhi', 'Jaipur', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Goa', 'Nashik', 'Indore', 'Surat', 'Thane', 'Lonavala', 'Udaipur', 'Shimla', 'Varanasi', 'Agra', 'Lucknow']

export default function FindRide({ onBack }) {
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [fromSug, setFromSug] = useState([])
  const [toSug, setToSug] = useState([])
  const [rides, setRides] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(1)
  const fromTimer = useRef(null)
  const toTimer = useRef(null)
  const itemsPerPage = 10

  useEffect(() => { loadRides() }, [])

  const loadRides = async () => {
    setLoading(true)
    const { data } = await supabase.from('rides').select('*').eq('status', 'open').gt('available_seats', 0)
    const activeRides = (data || [])
      .filter(r => !r.date_time || new Date(r.date_time) > new Date())
      .sort((a, b) => (b.created_at || b.id).localeCompare(a.created_at || a.id))
    setRides(activeRides)
    setResults(activeRides)
    setLoading(false)
  }

  const searchCities = (query, type) => {
    if (type === 'from') { clearTimeout(fromTimer.current); fromTimer.current = setTimeout(() => doSearch(query, type), 400) } 
    else { clearTimeout(toTimer.current); toTimer.current = setTimeout(() => doSearch(query, type), 400) }
  }

  // ✅ ROBUST SEARCH: Tries Photon, then Nominatim, then Local Fallback
  const doSearch = async (query, type) => {
    if (query.length < 2) { type === 'from' ? setFromSug([]) : setToSug([]); return }
    setSearching(true)
    
    let cities = []
    
    // 1. Try Photon API
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en&countrycodes=in`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.features && data.features.length > 0) {
          const seen = new Set()
          data.features.forEach(f => {
            const name = f.properties.name
            const state = f.properties.state || ''
            if (name && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase())
              cities.push({ name: name, display: state ? `${name}, ${state}` : name })
            }
          })
        }
      }
    } catch (error) { console.warn('Photon failed, trying Nominatim...') }

    // 2. If Photon failed, try Nominatim (OpenStreetMap - More Reliable)
    if (cities.length === 0) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=10&accept-language=en`
        const response = await fetch(url, { headers: { 'Accept-Language': 'en' } })
        if (response.ok) {
          const data = await response.json()
          const seen = new Set()
          data.forEach(f => {
            const name = f.name || f.display_name.split(',')[0]
            const state = f.address?.state || ''
            if (name && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase())
              cities.push({ name: name, display: state ? `${name}, ${state}` : name })
            }
          })
        }
      } catch (error) { console.warn('Nominatim failed, using local fallback...') }
    }

    // 3. Final Local Fallback
    if (cities.length === 0) {
      cities = FALLBACK_CITIES.filter(c => c.toLowerCase().includes(query.toLowerCase())).map(c => ({ name: c, display: c }))
    }

    type === 'from' ? setFromSug(cities) : setToSug(cities)
    setSearching(false)
  }

  const handleSearch = () => {
    let filtered = rides
    if (fromCity.trim()) filtered = filtered.filter(r => (r.from_city || '').toLowerCase().includes(fromCity.trim().toLowerCase()))
    if (toCity.trim()) filtered = filtered.filter(r => (r.to_city || '').toLowerCase().includes(toCity.trim().toLowerCase()))
    setResults(filtered)
    setPage(1)
  }

  const bookRide = async (ride) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Please login first'); return }
    const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
    
    if (!profile?.phone || !/^[0-9]{10}$/.test(profile.phone)) {
      alert('⚠️ Please update your profile with a valid 10-digit phone number before booking!')
      return
    }

    const { error } = await supabase.from('bookings').insert({
      id: 'book_' + Date.now(), ride_id: ride.id, passenger_id: user.id,
      passenger_name: profile.full_name, passenger_phone: profile.phone,
      seats_booked: 1, status: 'pending', reject_reason: ''
    })
    if (error) alert('Booking failed: ' + error.message)
    else { alert('✅ Booking request sent!'); loadRides() }
  }

  const paginatedResults = results.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const totalPages = Math.ceil(results.length / itemsPerPage)

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
        <button className="back-btn" onClick={onBack}>⬅️ Back</button>
        <div className="header-title">Find a Ride</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="content">
        <div className="card">
          <div className="input-group">
            <label>Leaving from</label>
            <input className="input" placeholder="Type city name..." value={fromCity} onChange={e => { setFromCity(e.target.value); searchCities(e.target.value, 'from') }} autoComplete="off" />
            {searching && <div className="text-sm" style={{color: '#6366f1'}}> Searching...</div>}
            {fromSug.length > 0 && (
              <div className="suggestions">
                {fromSug.map((city, i) => (<div key={i} className="suggestion-item" onClick={() => { setFromCity(city.name); setFromSug([]) }}>{city.display}</div>))}
              </div>
            )}
          </div>
          <div className="input-group">
            <label>Going to</label>
            <input className="input" placeholder="Type city name..." value={toCity} onChange={e => { setToCity(e.target.value); searchCities(e.target.value, 'to') }} autoComplete="off" />
            {toSug.length > 0 && (
              <div className="suggestions">
                {toSug.map((city, i) => (<div key={i} className="suggestion-item" onClick={() => { setToCity(city.name); setToSug([]) }}>{city.display}</div>))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={handleSearch}>🔍 Search Rides</button>
        </div>
        {loading ? <p style={{ textAlign: 'center', marginTop: 20 }}>Loading rides...</p> : paginatedResults.length === 0 ? <p style={{textAlign:'center', color:'#666', marginTop: 20}}>No rides found.</p> : paginatedResults.map(r => (
          <div key={r.id} className="card">
            <div className="text-bold" style={{fontSize: 16}}>{r.from_city} → {r.to_city}</div>
            <div className="ride-details">
              <div className="detail-row"><span className="label">Driver:</span><span className="value">{r.driver_name}</span></div>
              <div className="detail-row"><span className="label">Phone:</span><span className="value">{r.driver_phone || 'N/A'}</span></div>
              <div className="detail-row"><span className="label">Car:</span><span className="value">{r.car_model || 'N/A'}</span></div>
              <div className="detail-row"><span className="label">Price:</span><span className="value" style={{color: '#10b981'}}>₹{r.price}</span></div>
              <div className="detail-row"><span className="label">Seats:</span><span className="value">{r.available_seats}/{r.total_seats}</span></div>
              {r.date_time && <div className="detail-row"><span className="label">Date:</span><span className="value">{new Date(r.date_time).toLocaleString()}</span></div>}
            </div>
            <button className="btn btn-success" onClick={() => bookRide(r)}>📩 Send Booking Request</button>
          </div>
        ))}
        {totalPages > 1 && (
          <div style={{display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20}}>
            <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>⬅️ Prev</button>
            <span style={{alignSelf: 'center', fontWeight: 'bold'}}>Page {page} of {totalPages}</span>
            <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next ➡️</button>
          </div>
        )}
      </div>
    </div>
  )
}
