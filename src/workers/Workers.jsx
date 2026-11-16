import { useState } from 'react'
import { adminEmail } from '../supabaseClient'
import ErrorBoundary from '../matrimony/ErrorBoundary'
import './workers.css'
import WorkerFind from './WorkerFind'
import MyWorker from './MyWorker'
import WorkersAdmin from './WorkersAdmin'

function WorkersInner({ session, onBack, initialTab }) {
  const uid = session.user.id
  const isAdmin = (session.user.email || '').toLowerCase() === adminEmail.toLowerCase()
  const [tab, setTab] = useState(initialTab === 'admin' && isAdmin ? 'admin' : 'find')
  const [query, setQuery] = useState('')

  const tabs = [['find', 'Find'], ['mine', 'My listing']]
  if (isAdmin) tabs.push(['admin', 'Admin'])

  return (
    <div className="wk">
      <div className="wk-header">
        <div className="wk-header-row">
          <button className="wk-back" onClick={onBack}>← Back</button>
          <div className="wk-title">🛠️ Workers</div>
          <span style={{ width: 62 }} />
        </div>
        {tab === 'find' && (
          <div className="wk-search">
            <span>🔎</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search plumber, carpenter, area..." />
            {query && <button onClick={() => setQuery('')} aria-label="Clear">✕</button>}
          </div>
        )}
      </div>

      <div className="wk-tabs">
        {tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      <div className="wk-body">
        {tab === 'find' && <WorkerFind query={query} />}
        {tab === 'mine' && <MyWorker uid={uid} />}
        {tab === 'admin' && isAdmin && <WorkersAdmin />}
      </div>

      {tab === 'find' && <button className="wk-fab" onClick={() => setTab('mine')}>＋ Register as worker</button>}
    </div>
  )
}

export default function Workers(props) {
  return (
    <ErrorBoundary onBack={props.onBack}>
      <WorkersInner {...props} />
    </ErrorBoundary>
  )
}
