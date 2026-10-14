import { useState } from 'react'
import { supabase, adminEmail } from '../supabaseClient'
import TravelingMenu from './TravelingMenu'
import Profile from './Profile'
import Admin from './Admin'

export default function Home({ session }) {
  const [page, setPage] = useState('home')
  const isAdmin = session.user.email === adminEmail

  if (page === 'traveling') return <TravelingMenu onBack={() => setPage('home')} />
  if (page === 'profile') return <Profile onBack={() => setPage('home')} />
  if (page === 'admin') return <Admin onBack={() => setPage('home')} />

  return (
    <div>
      <div className="header">
        <div className="header-title">Hello, {session.user.email.split('@')[0]}</div>
        {isAdmin && <button className="back-btn" onClick={() => setPage('admin')}>⚙️ Admin</button>}
      </div>
      <div className="content">
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Choose a Service</h2>
        <div className="grid-menu">
          <div className="grid-item" style={{ background: '#3B82F6' }} onClick={() => setPage('traveling')}>
            <div className="icon">🚗</div><div className="label">Traveling</div>
          </div>
          <div className="grid-item" style={{ background: '#EC4899' }} onClick={() => alert('Coming soon!')}>
            <div className="icon">💍</div><div className="label">Matrimonial</div>
          </div>
        </div>
        <div className="card" style={{ marginTop: 20, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setPage('profile')}>
          <span style={{ fontSize: 24, marginRight: 16 }}>👤</span>
          <span className="text-bold">My Profile</span>
        </div>
      </div>
    </div>
  )
}
