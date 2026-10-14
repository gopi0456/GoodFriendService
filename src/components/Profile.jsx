import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Profile({ onBack }) {
  const [profile, setProfile] = useState({ full_name: '', phone: '', email: '', address: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadProfile() }, [])
  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
    }
  }
  const updateProfile = async () => {
    if (!/^[0-9]{10}$/.test(profile.phone.replace(/[^0-9]/g, ''))) {
      return alert('⚠️ Phone number must be exactly 10 digits!')
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name, phone: profile.phone, address: profile.address
    }).eq('id', user.id)
    if (error) alert('Error: ' + error.message)
    else alert('✅ Profile updated successfully!')
    setLoading(false)
  }
  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
        <button className="back-btn" onClick={onBack}>⬅️ Back</button>
        <div className="header-title">My Profile</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="content">
        <div className="card">
          <div className="input-group"><label>Email</label><input className="input" value={profile.email} disabled style={{ background: '#f3f4f6' }} /></div>
          <div className="input-group"><label>Full Name</label><input className="input" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} /></div>
          <div className="input-group"><label>Phone Number (10 digits)</label><input className="input" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} /></div>
          <div className="input-group"><label>Address</label><input className="input" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} /></div>
          <button className="btn btn-primary" onClick={updateProfile} disabled={loading}>{loading ? 'Saving...' : '💾 Save Changes'}</button>
        </div>
        <button className="btn btn-danger" onClick={() => supabase.auth.signOut()}>🚪 Logout</button>
      </div>
    </div>
  )
}