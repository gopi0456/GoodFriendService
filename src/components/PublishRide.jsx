import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

const FALLBACK_CITIES = ['Mumbai', 'Pune', 'Delhi', 'Jaipur', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Goa', 'Nashik', 'Indore', 'Surat', 'Thane', 'Lonavala', 'Udaipur', 'Shimla', 'Varanasi', 'Agra', 'Lucknow']

export default function PublishRide({ onBack }) {
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [fromSug, setFromSug] = useState([])
  const [toSug, setToSug] = useState([])
  const [price, setPrice] = useState('')
  const [seats, setSeats] = useState(1)
  const [car, setCar] = useState('')
  const [rideDate, setRideDate] = useState('')
  const [rideTime, setRideTime] = useState('')
  const [errors, setErrors] = useState({})
  const fromTimer = useRef(null)
  const toTimer = useRef(null)

  const searchCities = (query, type) => {
    if (type === 'from') { clearTimeout(fromTimer.current); fromTimer.current = setTimeout(() => doSearch(query, type), 400) } 
    else { clearTimeout(toTimer.current); toTimer.current = setTimeout(() => doSearch(query, type), 400) }
  }

  // ✅ ROBUST SEARCH: Tries Photon, then Nominatim, then Local Fallback
  const doSearch = async (query, type) => {
    if (query.length < 2) { type === 'from' ? setFromSug([]) : setToSug([]); return }
    
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
  }

  const validate = () => {
    const errs = {}
    if (!fromCity.trim()) errs.fromCity = 'From city is required'
    if (!toCity.trim()) errs.toCity = 'To city is required'
    if (!car.trim()) errs.car = 'Car model is required'
    if (!rideDate) errs.rideDate = 'Date is required'
    if (!rideTime) errs.rideTime = 'Time is required'
    if (!price || Number(price) <= 0) errs.price = 'Valid price is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const publish = async () => {
    if (!validate()) { alert('Please fill all required fields correctly'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
    await supabase.from('rides').insert({
      id: 'r_' + Date.now(), driver_id: user.id, driver_name: profile?.full_name || user.email,
      driver_phone: profile?.phone || '', from_city: fromCity, to_city: toCity, price: Number(price),
      total_seats: seats, available_seats: seats, car_model: car, status: 'open',
      date_time: rideDate + 'T' + rideTime + ':00.000Z'
    })
    alert('✅ Ride Published Successfully!')
    onBack()
  }

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
        <button className="back-btn" onClick={onBack}>⬅️ Back</button>
        <div className="header-title">Publish Ride</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="content">
        <div className="card">
          <div className="input-group">
            <label>From City *</label>
            <input className={'input ' + (errors.fromCity ? 'error' : '')} placeholder="Type city name..." value={fromCity} onChange={e => { setFromCity(e.target.value); searchCities(e.target.value, 'from') }} autoComplete="off" />
            {errors.fromCity && <div className="error-msg">{errors.fromCity}</div>}
            {fromSug.length > 0 && (
              <div className="suggestions">
                {fromSug.map((city, i) => (<div key={i} className="suggestion-item" onClick={() => { setFromCity(city.name); setFromSug([]) }}>{city.display}</div>))}
              </div>
            )}
          </div>
          <div className="input-group">
            <label>To City *</label>
            <input className={'input ' + (errors.toCity ? 'error' : '')} placeholder="Type city name..." value={toCity} onChange={e => { setToCity(e.target.value); searchCities(e.target.value, 'to') }} autoComplete="off" />
            {errors.toCity && <div className="error-msg">{errors.toCity}</div>}
            {toSug.length > 0 && (
              <div className="suggestions">
                {toSug.map((city, i) => (<div key={i} className="suggestion-item" onClick={() => { setToCity(city.name); setToSug([]) }}>{city.display}</div>))}
              </div>
            )}
          </div>
          <div className="input-group"><label>Car Model *</label><input className={'input ' + (errors.car ? 'error' : '')} placeholder="e.g. Swift Dzire" value={car} onChange={e => setCar(e.target.value)} />{errors.car && <div className="error-msg">{errors.car}</div>}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{flex: 1}}><label style={{display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6}}>Date *</label><input className={'input ' + (errors.rideDate ? 'error' : '')} type="date" value={rideDate} onChange={e => setRideDate(e.target.value)} style={{marginBottom: 0}} />{errors.rideDate && <div className="error-msg">{errors.rideDate}</div>}</div>
            <div style={{flex: 1}}><label style={{display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6}}>Time *</label><input className={'input ' + (errors.rideTime ? 'error' : '')} type="time" value={rideTime} onChange={e => setRideTime(e.target.value)} style={{marginBottom: 0}} />{errors.rideTime && <div className="error-msg">{errors.rideTime}</div>}</div>
          </div>
          <div className="input-group"><label>Price () *</label><input className={'input ' + (errors.price ? 'error' : '')} type="number" placeholder="Enter price" value={price} onChange={e => setPrice(e.target.value)} />{errors.price && <div className="error-msg">{errors.price}</div>}</div>
          <div className="input-group">
            <label>Available Seats</label>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, margin: '10px 0' }}>
              <button className="btn btn-sm" style={{ width: 50, background: '#f3f4f6' }} onClick={() => setSeats(Math.max(1, seats - 1))}>−</button>
              <span style={{ fontSize: 20, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{seats}</span>
              <button className="btn btn-sm" style={{ width: 50, background: '#f3f4f6' }} onClick={() => setSeats(seats + 1)}>+</button>
            </div>
          </div>
          <button className="btn btn-success" onClick={publish}>✅ Publish Ride</button>
        </div>
      </div>
    </div>
  )
}
