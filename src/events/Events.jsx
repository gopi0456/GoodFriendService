import { useState } from 'react'
import { adminEmail } from '../supabaseClient'
import ErrorBoundary from '../matrimony/ErrorBoundary'
import './events.css'
import EventFind from './EventFind'
import MyEvent from './MyEvent'
import EventsAdmin from './EventsAdmin'

function EventsInner({ session, onBack, initialTab }) {
  const uid = session.user.id
  const isAdmin = (session.user.email || '').toLowerCase() === adminEmail.toLowerCase()
  const [tab, setTab] = useState(initialTab === 'admin' && isAdmin ? 'admin' : 'find')
  const [query, setQuery] = useState('')
  const tabs = [['find', 'Find'], ['mine', 'My listing']]
  if (isAdmin) tabs.push(['admin', 'Admin'])

  return (
    <div className="ev">
      <div className="ev-header">
        <div className="ev-header-row">
          <button className="ev-back" onClick={onBack}>← Back</button>
          <div className="ev-title">🎉 Events</div>
          <span style={{ width: 62 }} />
        </div>
        {tab === 'find' && (
          <div className="ev-search">
            <span>🔎</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search hall, catering, decoration, area..." />
            {query && <button onClick={() => setQuery('')} aria-label="Clear">✕</button>}
          </div>
        )}
      </div>
      <div className="ev-tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="ev-bodywrap">
        {tab === 'find' && <EventFind query={query} />}
        {tab === 'mine' && <MyEvent uid={uid} />}
        {tab === 'admin' && isAdmin && <EventsAdmin />}
      </div>
      {tab === 'find' && <button className="ev-fab" onClick={() => setTab('mine')}>＋ List your service</button>}
    </div>
  )
}

export default function Events(props) {
  return (
    <ErrorBoundary onBack={props.onBack}>
      <EventsInner {...props} />
    </ErrorBoundary>
  )
}
