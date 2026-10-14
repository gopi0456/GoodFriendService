import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function MyTrips({ onBack }) {
  const [tab, setTab] = useState('offers')
  const [myRides, setMyRides] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [requests, setRequests] = useState([])
  const [myId, setMyId] = useState('')

  const getRideStatus = (ride) => {
    if (!ride) return { text: 'Closed', color: '#ef4444' }
    if (ride.available_seats <= 0) return { text: 'Closed', color: '#ef4444' } // ✅ Just "Closed"
    if (ride.date_time && new Date(ride.date_time) < new Date()) return { text: 'Closed', color: '#ef4444' } // ✅ Just "Closed"
    return { text: 'Open', color: '#10b981' }
  }

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyId(user.id)

    const { data: rides } = await supabase.from('rides').select('*').eq('driver_id', user.id)
    // ✅ Sort recent first
    const sortedRides = (rides || []).sort((a, b) => (b.created_at || b.id).localeCompare(a.created_at || a.id))
    setMyRides(sortedRides)

    const { data: bookings } = await supabase.from('bookings').select('*').eq('passenger_id', user.id)
    let mergedBookings = []
    if (bookings && bookings.length > 0) {
      const rideIds = [...new Set(bookings.map(b => b.ride_id))]
      const { data: rideDetails } = await supabase.from('rides').select('*').in('id', rideIds)
      const rideMap = {}; rideDetails?.forEach(r => { rideMap[r.id] = r })
      mergedBookings = bookings.sort((a, b) => (b.created_at || b.id).localeCompare(a.created_at || a.id)).map(b => ({ ...b, ride: rideMap[b.ride_id] || {} }))
    }
    setMyBookings(mergedBookings)

    if (sortedRides && sortedRides.length > 0) {
      const rideIds = sortedRides.map(r => r.id)
      const { data: pendingBookings } = await supabase.from('bookings').select('*').in('ride_id', rideIds).eq('status', 'pending')
      if (pendingBookings && pendingBookings.length > 0) {
        const passengerIds = [...new Set(pendingBookings.map(b => b.passenger_id))]
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone').in('id', passengerIds)
        const profileMap = {}; profiles?.forEach(p => { profileMap[p.id] = p })
        setRequests(pendingBookings.map(b => ({
          ...b, passenger_name: profileMap[b.passenger_id]?.full_name || 'Unknown',
          passenger_phone: profileMap[b.passenger_id]?.phone || 'N/A',
          ride: sortedRides.find(r => r.id === b.ride_id) || {}
        })))
      } else setRequests([])
    } else setRequests([])
  }

  useEffect(() => { loadData() }, [])

  const handleRequest = async (bookingId, status, rideId) => {
    let remark = status === 'rejected' ? (prompt('Reason for rejection:') || 'Rejected') : (prompt('Remark:') || 'Accepted')
    const actionDate = new Date().toISOString()
    const { error } = await supabase.from('bookings').update({ status, reject_reason: remark, action_date: actionDate }).eq('id', bookingId)
    if (!error) {
      if (status === 'accepted' && rideId) {
        const { data: ride } = await supabase.from('rides').select('available_seats').eq('id', rideId).single()
        if (ride && ride.available_seats > 0) await supabase.from('rides').update({ available_seats: ride.available_seats - 1 }).eq('id', rideId)
      }
      loadData()
    }
  }

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
        <button className="back-btn" onClick={onBack}>⬅️</button>
        <div className="header-title">My Trips</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="tabs">
        <div className={'tab ' + (tab === 'offers' ? 'active' : '')} onClick={() => setTab('offers')}> Offers</div>
        <div className={'tab ' + (tab === 'bookings' ? 'active' : '')} onClick={() => setTab('bookings')}>📅 Bookings</div>
        <div className={'tab ' + (tab === 'requests' ? 'active' : '')} onClick={() => setTab('requests')}>📩 Requests ({requests.length})</div>
      </div>
      <div className="content">
        {tab === 'offers' && (myRides.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No rides published yet.</p>
        ) : myRides.map(r => {
          const status = getRideStatus(r)
          return (
            <div key={r.id} className="card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <div className="text-bold">{r.from_city} → {r.to_city}</div>
                <span style={{background: status.color, color: 'white', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold'}}>{status.text}</span>
              </div>
              <div className="ride-details">
                <div className="detail-row"><span className="label">Car:</span><span className="value">{r.car_model}</span></div>
                <div className="detail-row"><span className="label">Price:</span><span className="value" style={{color: '#10b981'}}>₹{r.price}</span></div>
                <div className="detail-row"><span className="label">Seats:</span><span className="value">{r.available_seats}/{r.total_seats}</span></div>
              </div>
            </div>
          )
        }))}
        
        {tab === 'bookings' && (myBookings.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No bookings yet.</p>
        ) : myBookings.map(b => (
          <div key={b.id} className="card">
            {b.ride && b.ride.id ? (
              <div style={{background: '#f0f9ff', padding: 12, borderRadius: 10, marginBottom: 12, borderLeft: '4px solid #3B82F6'}}>
                <div style={{fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase'}}>🚗 Ride Details</div>
                <div className="detail-row"><span className="label">Route:</span><span className="value">{b.ride.from_city} → {b.ride.to_city}</span></div>
                <div className="detail-row"><span className="label">Driver:</span><span className="value">{b.ride.driver_name}</span></div>
                <div className="detail-row"><span className="label">Driver Phone:</span><span className="value" style={{color: '#2563EB', fontWeight: 'bold'}}>{b.ride.driver_phone || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Car:</span><span className="value">{b.ride.car_model || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Price:</span><span className="value" style={{color: '#059669', fontWeight: 'bold'}}>₹{b.ride.price}</span></div>
              </div>
            ) : <div className="text-sm" style={{color: '#ef4444', marginBottom: 12}}>️ Ride details unavailable.</div>}
            <div style={{background: '#fef3c7', padding: 12, borderRadius: 10, borderLeft: '4px solid #F59E0B'}}>
              <div style={{fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase'}}>👤 Your Booking Status</div>
              <div className="detail-row"><span className="label">Status:</span><span className="value" style={{color: b.status === 'accepted' ? '#059669' : b.status === 'rejected' ? '#dc2626' : '#d97706', fontWeight: 'bold'}}>{b.status.toUpperCase()}</span></div>
              <div className="detail-row"><span className="label">Your Phone:</span><span className="value" style={{color: '#2563EB', fontWeight: 'bold'}}>{b.passenger_phone || 'N/A'}</span></div>
              <div className="detail-row"><span className="label">Seats:</span><span className="value">{b.seats_booked}</span></div>
              {b.reject_reason && <div className="detail-row"><span className="label">Remark:</span><span className="value" style={{color: '#dc2626'}}>{b.reject_reason}</span></div>}
              {b.action_date && <div className="detail-row"><span className="label">Updated:</span><span className="value">{new Date(b.action_date).toLocaleString()}</span></div>}
            </div>
          </div>
        )))}
        
        {tab === 'requests' && (requests.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No pending requests.</p>
        ) : requests.map(req => (
          <div key={req.id} className="card">
            <div style={{background: '#f0f9ff', padding: 12, borderRadius: 10, marginBottom: 12, borderLeft: '4px solid #3B82F6'}}>
              <div style={{fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase'}}> Ride Details</div>
              <div className="detail-row"><span className="label">Route:</span><span className="value">{req.ride?.from_city} → {req.ride?.to_city}</span></div>
              <div className="detail-row"><span className="label">Price:</span><span className="value" style={{color: '#059669', fontWeight: 'bold'}}>₹{req.ride?.price}</span></div>
            </div>
            <div style={{background: '#fef3c7', padding: 12, borderRadius: 10, marginBottom: 12, borderLeft: '4px solid #F59E0B'}}>
              <div style={{fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase'}}>👤 Passenger</div>
              <div className="detail-row"><span className="label">Name:</span><span className="value">{req.passenger_name}</span></div>
              <div className="detail-row"><span className="label">Phone:</span><span className="value" style={{color: '#2563EB', fontWeight: 'bold'}}>{req.passenger_phone}</span></div>
              <div className="detail-row"><span className="label">Seats:</span><span className="value">{req.seats_booked}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleRequest(req.id, 'accepted', req.ride_id)}>✅ Accept</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleRequest(req.id, 'rejected', req.ride_id)}>❌ Reject</button>
            </div>
          </div>
        )))}
      </div>
    </div>
  )
}
