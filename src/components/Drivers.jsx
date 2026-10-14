import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Drivers({ onBack }) {
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '', license_number: '', car_model: '', address: '' })
  const [errors, setErrors] = useState({})
  const [myId, setMyId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { 
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setMyId(user.id); setIsAdmin(user.email === 'scgopi.gopi@gmail.com') }
      loadDrivers()
    })
  }, [])

  const loadDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*')
    const sorted = (data || []).sort((a, b) => (b.created_at || b.id).localeCompare(a.created_at || a.id))
    setDrivers(sorted)
  }

  const openAddModal = () => { setEditingId(null); setForm({ full_name: '', phone: '', license_number: '', car_model: '', address: '' }); setErrors({}); setShowModal(true) }
  const openEditModal = (d) => { setEditingId(d.id); setForm({ full_name: d.full_name, phone: d.phone, license_number: d.license_number, car_model: d.car_model, address: d.address || '' }); setErrors({}); setShowModal(true) }

  const validate = () => {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Name is required'
    if (!form.phone.trim()) errs.phone = 'Phone is required'
    else if (!/^[0-9]{10}$/.test(form.phone.replace(/[^0-9]/g, ''))) errs.phone = 'Enter valid 10-digit phone'
    if (!form.license_number.trim()) errs.license_number = 'License is required'
    if (!form.car_model.trim()) errs.car_model = 'Car model is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const save = async () => {
    if (!validate()) { alert('Please fill all required fields correctly'); return }
    let error;
    if (editingId) {
      ({ error } = await supabase.from('drivers').update(form).eq('id', editingId))
    } else {
      ({ error } = await supabase.from('drivers').insert({ id: 'drv_' + Date.now(), user_id: myId, ...form }))
    }
    if (error) alert('Error: ' + error.message)
    else { setShowModal(false); loadDrivers() }
  }

  const deleteDriver = async (id) => { if (window.confirm('Delete?')) { await supabase.from('drivers').delete().eq('id', id); loadDrivers() } }

  const filtered = drivers.filter(d => d.full_name?.toLowerCase().includes(search.toLowerCase()))
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
        <button className="back-btn" onClick={onBack}>⬅️</button>
        <div className="header-title">Drivers</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="content">
        <input className="input" placeholder="🔍 Search drivers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <button className="btn btn-primary" onClick={openAddModal}>+ Register as Driver</button>
        {paginated.map(d => {
          const canEdit = (String(myId) === String(d.user_id)) || isAdmin
          return (
            <div key={d.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: 25, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18 }}>{d.full_name?.[0]?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div className="text-bold">{d.full_name}</div>
                <div className="text-sm">📞 {d.phone}</div>
                <div className="text-sm">🪪 {d.license_number}</div>
                <div className="text-sm">🚗 {d.car_model}</div>
                {d.address && <div className="text-sm">📍 {d.address}</div>}
              </div>
              {canEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <button className="btn btn-sm" style={{ background: '#3B82F6', color: 'white' }} onClick={() => openEditModal(d)}>✏️</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteDriver(d.id)}>🗑️</button>
                </div>
              )}
            </div>
          )
        })}
        {totalPages > 1 && (
          <div style={{display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20}}>
            <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>⬅️ Prev</button>
            <span style={{alignSelf: 'center', fontWeight: 'bold'}}>Page {page} of {totalPages}</span>
            <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next ➡️</button>
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingId ? 'Edit Driver' : 'Register Driver'}</h3>
            <div className="input-group"><label>Full Name *</label><input className={'input ' + (errors.full_name ? 'error' : '')} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />{errors.full_name && <div className="error-msg">{errors.full_name}</div>}</div>
            <div className="input-group"><label>Phone *</label><input className={'input ' + (errors.phone ? 'error' : '')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />{errors.phone && <div className="error-msg">{errors.phone}</div>}</div>
            <div className="input-group"><label>License Number *</label><input className={'input ' + (errors.license_number ? 'error' : '')} value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} />{errors.license_number && <div className="error-msg">{errors.license_number}</div>}</div>
            <div className="input-group"><label>Car Model *</label><input className={'input ' + (errors.car_model ? 'error' : '')} value={form.car_model} onChange={e => setForm({ ...form, car_model: e.target.value })} />{errors.car_model && <div className="error-msg">{errors.car_model}</div>}</div>
            <div className="input-group"><label>Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="modal-actions"><button className="btn" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
