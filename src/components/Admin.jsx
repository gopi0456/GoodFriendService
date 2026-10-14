import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Admin({ onBack }) {
  const [view, setView] = useState('main')
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [drivers, setDrivers] = useState([])
  const [travels, setTravels] = useState([])
  const [rides, setRides] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, table: '', item: null, form: {} })
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  const loadAllData = async () => {
    setLoading(true)
    const [u, d, t, r, b] = await Promise.all([
      supabase.from('profiles').select('*'), supabase.from('drivers').select('*'),
      supabase.from('travels').select('*'), supabase.from('rides').select('*'),
      supabase.from('bookings').select('*')
    ])
    // ✅ Sort all lists recent first
    const sortFn = (a, b) => (b.created_at || b.id).localeCompare(a.created_at || a.id)
    setUsers((u.data || []).sort(sortFn)); setDrivers((d.data || []).sort(sortFn))
    setTravels((t.data || []).sort(sortFn)); setRides((r.data || []).sort(sortFn))
    setBookings((b.data || []).sort(sortFn))
    setLoading(false)
    setPage(1)
  }
  useEffect(() => { if (view === 'traveling') loadAllData() }, [view, tab])

  const getCounts = (userId) => ({
    drv: drivers.filter(d => d.user_id === userId).length,
    trv: travels.filter(t => t.user_id === userId).length
  })

  const del = async (table, id) => {
    if (window.confirm('Delete permanently?')) {
      await supabase.from(table).delete().eq('id', id)
      loadAllData()
    }
  }

  const openEdit = (table, item) => setEditModal({ open: true, table, item, form: { ...item } })

  const saveEdit = async () => {
    const { table, form } = editModal
    let updateData = { ...form }
    if (table === 'bookings' && form.status === 'rejected' && (!form.reject_reason || form.reject_reason.trim() === '')) {
      alert('⚠️ Please enter a reason for rejection!'); return
    }
    if (table === 'travels' || table === 'rides') updateData.price = Number(form.price) || 0
    if (table === 'rides') updateData.available_seats = Number(form.available_seats) || 0
    if (table === 'bookings') { updateData.seats_booked = Number(form.seats_booked) || 1; updateData.action_date = new Date().toISOString() }

    const { error } = await supabase.from(table).update(updateData).eq('id', form.id)
    if (error) alert('Update failed: ' + error.message)
    else { alert('✅ Updated successfully!'); setEditModal({ open: false, table: '', item: null, form: {} }); loadAllData() }
  }

  const getPaginated = (data) => data.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const getTotalPages = (data) => Math.ceil(data.length / itemsPerPage)

  if (view === 'main') {
    return (
      <div>
        <div className="header" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
          <button className="back-btn" onClick={onBack}>⬅️ Back to Home</button>
          <div className="header-title">Admin Dashboard</div>
          <div style={{ width: 70 }}></div>
        </div>
        <div className="content">
          <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Select Service to Manage</h2>
          <div className="grid-menu">
            <div className="grid-item" style={{ background: '#3B82F6' }} onClick={() => setView('traveling')}>
              <div className="icon">🚗</div><div className="label">Traveling Admin</div>
            </div>
            <div className="grid-item" style={{ background: '#EC4899' }} onClick={() => alert('Matrimonial Admin coming soon!')}>
              <div className="icon">💍</div><div className="label">Matrimonial Admin</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPagination = (data) => {
    const totalPages = getTotalPages(data)
    if (totalPages <= 1) return null
    return (
      <div style={{display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20}}>
        <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>⬅️ Prev</button>
        <span style={{alignSelf: 'center', fontWeight: 'bold'}}>Page {page} of {totalPages}</span>
        <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next ➡️</button>
      </div>
    )
  }

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
        <button className="back-btn" onClick={() => setView('main')}>⬅️ Back</button>
        <div className="header-title">Traveling Admin</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="tabs">
        <div className={'tab ' + (tab === 'users' ? 'active' : '')} onClick={() => { setTab('users'); setPage(1) }}>👥 Users</div>
        <div className={'tab ' + (tab === 'drivers' ? 'active' : '')} onClick={() => { setTab('drivers'); setPage(1) }}>Drivers</div>
        <div className={'tab ' + (tab === 'travels' ? 'active' : '')} onClick={() => { setTab('travels'); setPage(1) }}>Travels</div>
        <div className={'tab ' + (tab === 'rides' ? 'active' : '')} onClick={() => { setTab('rides'); setPage(1) }}>Rides</div>
        <div className={'tab ' + (tab === 'bookings' ? 'active' : '')} onClick={() => { setTab('bookings'); setPage(1) }}>Bookings</div>
      </div>
      <div className="content">
        {loading ? <p style={{ textAlign: 'center' }}>Loading...</p> : (
          <>
            {tab === 'users' && getPaginated(users).map(u => {
              const c = getCounts(u.id)
              return (
                <div key={u.id} className="card">
                  <div className="text-bold">{u.full_name || 'Unknown'} <span style={{fontSize: 12, color: '#666'}}>({u.email})</span></div>
                  <div className="text-sm" style={{ margin: '8px 0', padding: '8px', background: '#f3f4f6', borderRadius: 8 }}>🚗 Drivers: <b>{c.drv}</b> | 🚌 Travels: <b>{c.trv}</b></div>
                  <div className="text-sm"> {u.phone || 'N/A'} {u.address ? `| 📍 ${u.address}` : ''}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button className="btn btn-sm" style={{ flex: 1, background: '#3B82F6', color: 'white' }} onClick={() => openEdit('profiles', u)}>✏️ Edit</button>
                    <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => del('profiles', u.id)}>️ Delete</button>
                  </div>
                </div>
              )
            })}
            {tab === 'drivers' && getPaginated(drivers).map(item => (
              <div key={item.id} className="card">
                <div className="text-bold">{item.full_name}</div>
                <div className="text-sm">📞 {item.phone} | 🚗 {item.car_model}</div>
                {item.address && <div className="text-sm">📍 {item.address}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button className="btn btn-sm" style={{ flex: 1, background: '#3B82F6', color: 'white' }} onClick={() => openEdit('drivers', item)}>✏️ Edit</button>
                  <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => del('drivers', item.id)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
            {tab === 'travels' && getPaginated(travels).map(item => (
              <div key={item.id} className="card">
                <div className="text-bold">{item.travel_name}</div>
                <div className="text-sm">🚗 {item.car_model} | 📞 {item.contact_phone} | ₹{item.price}</div>
                {item.address && <div className="text-sm">📍 {item.address}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button className="btn btn-sm" style={{ flex: 1, background: '#3B82F6', color: 'white' }} onClick={() => openEdit('travels', item)}>️ Edit</button>
                  <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => del('travels', item.id)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
            {tab === 'rides' && getPaginated(rides).map(item => (
              <div key={item.id} className="card">
                <div className="text-bold">{item.from_city} → {item.to_city}</div>
                <div className="text-sm">Driver: {item.driver_name} | Status: {item.status} | ₹{item.price}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button className="btn btn-sm" style={{ flex: 1, background: '#3B82F6', color: 'white' }} onClick={() => openEdit('rides', item)}>✏️ Edit</button>
                  <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => del('rides', item.id)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
            {tab === 'bookings' && getPaginated(bookings).map(item => {
              const ride = rides.find(r => r.id === item.ride_id) || {}
              return (
                <div key={item.id} className="card">
                  {ride.id && (
                    <div style={{background: '#f0f9ff', padding: 12, borderRadius: 10, marginBottom: 12, borderLeft: '4px solid #3B82F6'}}>
                      <div style={{fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase'}}> Ride</div>
                      <div className="detail-row"><span className="label">Route:</span><span className="value">{ride.from_city} → {ride.to_city}</span></div>
                      <div className="detail-row"><span className="label">Driver:</span><span className="value">{ride.driver_name} ({ride.driver_phone})</span></div>
                    </div>
                  )}
                  <div style={{background: '#fef3c7', padding: 12, borderRadius: 10, borderLeft: '4px solid #F59E0B'}}>
                    <div style={{fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase'}}>👤 Passenger</div>
                    <div className="detail-row"><span className="label">Name:</span><span className="value">{item.passenger_name || 'Unknown'}</span></div>
                    <div className="detail-row"><span className="label">Phone:</span><span className="value">{item.passenger_phone || 'N/A'}</span></div>
                    <div className="detail-row"><span className="label">Status:</span><span className="value" style={{fontWeight: 'bold', color: item.status === 'accepted' ? '#059669' : item.status === 'rejected' ? '#dc2626' : '#d97706'}}>{item.status}</span></div>
                    {item.action_date && <div className="detail-row"><span className="label">Action Date:</span><span className="value">{new Date(item.action_date).toLocaleString()}</span></div>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button className="btn btn-sm" style={{ flex: 1, background: '#3B82F6', color: 'white' }} onClick={() => openEdit('bookings', item)}>✏️ Edit</button>
                    <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => del('bookings', item.id)}>🗑️ Delete</button>
                  </div>
                </div>
              )
            })}
            {renderPagination(tab === 'users' ? users : tab === 'drivers' ? drivers : tab === 'travels' ? travels : tab === 'rides' ? rides : bookings)}
          </>
        )}
      </div>

      {editModal.open && (
        <div className="modal-overlay" onClick={() => setEditModal({ open: false, table: '', item: null, form: {} })}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxHeight: '85vh', overflowY: 'auto'}}>
            <h3>Edit {editModal.table.slice(0, -1).charAt(0).toUpperCase() + editModal.table.slice(1, -1)}</h3>
            {editModal.table === 'profiles' && (<>
              <div className="input-group"><label>Full Name</label><input className="input" value={editModal.form.full_name || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, full_name: e.target.value}})} /></div>
              <div className="input-group"><label>Phone</label><input className="input" value={editModal.form.phone || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, phone: e.target.value}})} /></div>
              <div className="input-group"><label>Address</label><input className="input" value={editModal.form.address || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, address: e.target.value}})} /></div>
            </>)}
            {editModal.table === 'drivers' && (<>
              <div className="input-group"><label>Full Name</label><input className="input" value={editModal.form.full_name || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, full_name: e.target.value}})} /></div>
              <div className="input-group"><label>Phone</label><input className="input" value={editModal.form.phone || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, phone: e.target.value}})} /></div>
              <div className="input-group"><label>License</label><input className="input" value={editModal.form.license_number || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, license_number: e.target.value}})} /></div>
              <div className="input-group"><label>Car Model</label><input className="input" value={editModal.form.car_model || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, car_model: e.target.value}})} /></div>
              <div className="input-group"><label>Address</label><input className="input" value={editModal.form.address || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, address: e.target.value}})} /></div>
            </>)}
            {editModal.table === 'travels' && (<>
              <div className="input-group"><label>Travel Name</label><input className="input" value={editModal.form.travel_name || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, travel_name: e.target.value}})} /></div>
              <div className="input-group"><label>Phone</label><input className="input" value={editModal.form.contact_phone || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, contact_phone: e.target.value}})} /></div>
              <div className="input-group"><label>Car Model</label><input className="input" value={editModal.form.car_model || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, car_model: e.target.value}})} /></div>
              <div className="input-group"><label>Price</label><input className="input" type="number" value={editModal.form.price || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, price: e.target.value}})} /></div>
              <div className="input-group"><label>Address</label><input className="input" value={editModal.form.address || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, address: e.target.value}})} /></div>
            </>)}
            {editModal.table === 'rides' && (<>
              <div className="input-group"><label>From City</label><input className="input" value={editModal.form.from_city || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, from_city: e.target.value}})} /></div>
              <div className="input-group"><label>To City</label><input className="input" value={editModal.form.to_city || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, to_city: e.target.value}})} /></div>
              <div className="input-group"><label>Driver Name</label><input className="input" value={editModal.form.driver_name || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, driver_name: e.target.value}})} /></div>
              <div className="input-group"><label>Driver Phone</label><input className="input" value={editModal.form.driver_phone || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, driver_phone: e.target.value}})} /></div>
              <div className="input-group"><label>Car Model</label><input className="input" value={editModal.form.car_model || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, car_model: e.target.value}})} /></div>
              <div className="input-group"><label>Price</label><input className="input" type="number" value={editModal.form.price || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, price: e.target.value}})} /></div>
              <div className="input-group"><label>Available Seats</label><input className="input" type="number" value={editModal.form.available_seats || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, available_seats: e.target.value}})} /></div>
              <div className="input-group"><label>Status</label><input className="input" value={editModal.form.status || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, status: e.target.value}})} /></div>
            </>)}
            {editModal.table === 'bookings' && (<>
              <div className="input-group"><label>Passenger Name</label><input className="input" value={editModal.form.passenger_name || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, passenger_name: e.target.value}})} /></div>
              <div className="input-group"><label>Passenger Phone</label><input className="input" value={editModal.form.passenger_phone || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, passenger_phone: e.target.value}})} /></div>
              <div className="input-group"><label>Seats Booked</label><input className="input" type="number" value={editModal.form.seats_booked || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, seats_booked: e.target.value}})} /></div>
              <div className="input-group"><label>Status</label>
                <select className="input" value={editModal.form.status || 'pending'} onChange={e => setEditModal({...editModal, form: {...editModal.form, status: e.target.value}})}>
                  <option value="pending">⏳ Pending</option><option value="accepted">✅ Accepted</option><option value="rejected">❌ Rejected</option>
                </select>
              </div>
              <div className="input-group"><label>Remark {editModal.form.status === 'rejected' ? '*' : ''}</label><input className="input" placeholder={editModal.form.status === 'rejected' ? 'Reason required' : 'Optional'} value={editModal.form.reject_reason || ''} onChange={e => setEditModal({...editModal, form: {...editModal.form, reject_reason: e.target.value}})} /></div>
            </>)}
            <div className="modal-actions"><button className="btn" onClick={() => setEditModal({ open: false, table: '', item: null, form: {} })}>Cancel</button><button className="btn btn-primary" onClick={saveEdit}>💾 Save Changes</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
