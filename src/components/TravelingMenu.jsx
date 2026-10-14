import FindRide from './FindRide'
import PublishRide from './PublishRide'
import Drivers from './Drivers'
import Travels from './Travels'
import Messages from './Messages'
import MyTrips from './MyTrips'
import { useState } from 'react'

export default function TravelingMenu({ onBack }) {
  const [page, setPage] = useState('menu')

  if (page === 'find') return <FindRide onBack={() => setPage('menu')} />
  if (page === 'publish') return <PublishRide onBack={() => setPage('menu')} />
  if (page === 'drivers') return <Drivers onBack={() => setPage('menu')} />
  if (page === 'travels') return <Travels onBack={() => setPage('menu')} />
  if (page === 'messages') return <Messages onBack={() => setPage('menu')} />
  if (page === 'trips') return <MyTrips onBack={() => setPage('menu')} />

  const items = [
    { icon: '🔍', label: 'Find a Ride', color: '#3B82F6', action: () => setPage('find') },
    { icon: '➕', label: 'Publish Ride', color: '#10B981', action: () => setPage('publish') },
    { icon: '👥', label: 'Drivers', color: '#8B5CF6', action: () => setPage('drivers') },
    { icon: '🚌', label: 'Travels', color: '#F59E0B', action: () => setPage('travels') },
    { icon: '💬', label: 'Messages', color: '#EC4899', action: () => setPage('messages') },
    { icon: '📅', label: 'My Trips', color: '#6366F1', action: () => setPage('trips') },
  ]

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
        <button className="back-btn" onClick={onBack}>⬅️ Back</button>
        <div className="header-title">Traveling Services</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="content">
        <div className="grid-menu">
          {items.map((item, i) => (
            <div key={i} className="grid-item" style={{ background: item.color }} onClick={item.action}>
              <div className="icon">{item.icon}</div>
              <div className="label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
