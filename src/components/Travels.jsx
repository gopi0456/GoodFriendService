import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Travels({ onBack }) {
  const [travels, setTravels] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ travel_name: '', price: 0, car_model: '', contact_phone: '', address: '', seats: 1 })
  const [errors, setErrors] = useState({})
  const [myId, setMyId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { 
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setMyId(user.id); setIsAdmin(user.email === 'scgopi.gopi@gmail.com') }
      loadTravels()
    })
  }, [])

  const loadTravels = async () => {
    const { data } = await supabase.from('travels').select('*')
    const sorted = (data || []).sort((a, b) => (b.created_at || b.id).localeCompare(a.created_at || a.id))
    setTravels(sorted)
  }

  const openAddModal = () => { setEditingId(null); setForm({ travel_name: '', price: 0, car_model: '', contact_phone: '', address: '', seats: 1 }); setErrors({}); setShowModal(true) }
  const openEditModal = (t) => { setEditingId(t.id); setForm({ travel_name: t.travel_name, price: t.price, car_model: t.car_model || '', contact_phone: t.contact_phone || '', address: t.address || '', seats: t.seats || 1 }); setErrors({}); setShowModal(true) }

  const validate = () => {
    const errs = {}
    if (!form.travel_name.trim()) errs.travel_name = 'Travel name is required'
    if (!form.car_model.trim()) errs.car_model = 'Car model is required'
    if (!form.contact_phone.trim()) errs.contact_phone = 'Phone is required'
    else if (!/^[0-9]{10}$/.test(form.contact_phone.replace(/[^0-9]/g, ''))) errs.contact_phone = 'Enter valid 10-digit phone'
    if (!form.price || Number(form.price) <= 0) errs.price = 'Valid price is required'
    if (!form.seats || Number(form.seats) <= 0) errs.seats = 'Seats must be at least 1'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const save = async () => {
    if (!validate()) { alert('Please fill all required fields correctly'); return }
    
    // ✅ FIX: Include date_time and seats to satisfy database constraints
    const dataToSave = {
      travel_name: form.travel_name,
      car_model: form.car_model,
      contact_phone: form.contact_phone,
      address: form.address,
      price: Number(form.price),
      seats: Number(form.seats) || 1,
      from_city: '', 
      to_city: '',
      date_time: new Date().toISOString() // ✅ Prevents NOT NULL error
    }

    let res;
    if (editingId) {
      res = await supabase.from('travels').update(dataToSave).eq('id', editingId)
    } else {
      dataToSave.id = 'trv_' + Date.now()
      dataToSave.user_id = myId
      res = await supabase.from('travels').insert(dataToSave)
    }

    if (res.error) {
      alert('❌ Error saving travel: ' + res.error.message)
      console.error('Supabase Error:', res.error)
    } else {
      setShowModal(false)
      loadTravels()
    }
  }

  const deleteTravel = async (id) => { if (window.confirm('Delete?')) { await supabase.from('travels').delete().eq('id', id); loadTravels() } }

  const filtered = travels.filter(t => t.travel_name?.toLowerCase().includes(search.toLowerCase()) || t.car_model?.toLowerCase().includes(search.toLowerCase()))
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
        <button className="back-btn" onClick={onBack}>⬅️</button>
        <div className="header-title">Travels</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="content">
        <input className="input" placeholder="🔍 Search travels..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }} onClick={openAddModal}>+ Add Travel</button>
        {paginated.map(t => {
          const canEdit = (String(myId) === String(t.user_id)) || isAdmin
          return (
            <div key={t.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="text-bold" style={{ fontSize: 17 }}>🚌 {t.travel_name}</div>
                <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: 18 }}>₹{t.price}</div>
              </div>
              <div className="ride-details" style={{margin: 0}}>
                <div className="detail-row"><span className="label">Car:</span><span className="value">{t.car_model || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Seats:</span><span className="value">{t.seats || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Phone:</span><span className="value">{t.contact_phone || 'N/A'}</span></div>
                {t.address && <div className="detail-row"><span className="label">Address:</span><span className="value">{t.address}</span></div>}
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="btn btn-sm" style={{ flex: 1, background: '#3B82F6', color: 'white' }} onClick={() => openEditModal(t)}>✏️ Edit</button>
                  <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => deleteTravel(t.id)}>🗑️ Delete</button>
                </div>
              )}
            </div>
          )
        })}
        {totalPages > 1 && (
          <div style={{display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20}}>
            <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>️ Prev</button>
            <span style={{alignSelf: 'center', fontWeight: 'bold'}}>Page {page} of {totalPages}</span>
            <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next ➡️</button>
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingId ? 'Edit Travel' : 'Add Travel'}</h3>
            <div className="input-group"><label>Travel Name *</label><input className={'input ' + (errors.travel_name ? 'error' : '')} value={form.travel_name} onChange={e => setForm({ ...form, travel_name: e.target.value })} />{errors.travel_name && <div className="error-msg">{errors.travel_name}</div>}</div>
            <div className="input-group"><label>Car Model *</label><input className={'input ' + (errors.car_model ? 'error' : '')} value={form.car_model} onChange={e => setForm({ ...form, car_model: e.target.value })} />{errors.car_model && <div className="error-msg">{errors.car_model}</div>}</div>
            <div className="input-group"><label>Contact Phone *</label><input className={'input ' + (errors.contact_phone ? 'error' : '')} value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />{errors.contact_phone && <div className="error-msg">{errors.contact_phone}</div>}</div>
            {/* ✅ NEW: Seats Input */}
            <div className="input-group"><label>Number of Seats *</label><input className={'input ' + (errors.seats ? 'error' : '')} type="number" placeholder="e.g. 12" value={form.seats} onChange={e => setForm({ ...form, seats: e.target.value })} />{errors.seats && <div className="error-msg">{errors.seats}</div>}</div>
            <div className="input-group"><label>Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="input-group"><label>Price (₹) *</label><input className={'input ' + (errors.price ? 'error' : '')} type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />{errors.price && <div className="error-msg">{errors.price}</div>}</div>
            <div className="modal-actions"><button className="btn" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }} onClick={save}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
