import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import MyProfile from './MyProfile'

// Step 2 (optional): add a profile for a login that already exists and has no profile yet.
// Step 1 is "Create login" - that never forces a profile.
export default function QuickAddProfile({ refreshKey = 0 }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [pick, setPick] = useState('')
  const [editing, setEditing] = useState(null) // { user_id, email }
  const [saved, setSaved] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('matrimony_admin_users')
    if (error) alert('Error: ' + error.message)
    setAccounts((data || []).filter(r => !r.profile_status))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  if (editing) {
    return (
      <div>
        <div className="mm-banner warn">Adding the profile for <b>{editing.email}</b>. It is approved straight away.</div>
        <MyProfile userId={editing.user_id} me={null} adminMode
          onSaved={() => { setSaved(n => n + 1); setEditing(null); setPick(''); load() }} />
        <button className="btn mm-btn-light" onClick={() => setEditing(null)}>Cancel</button>
      </div>
    )
  }

  const term = q.trim().toLowerCase()
  const shown = accounts.filter(a => !term || (a.email || '').toLowerCase().includes(term))
  const chosen = accounts.find(a => a.user_id === pick)

  return (
    <div className="card">
      <h3 style={{ marginBottom: 6 }}>⚡ Quick add profile (optional)</h3>
      <p className="text-sm" style={{ marginBottom: 10 }}>Choose a login that has no profile yet, and fill in its profile. Create the login first (above) if it does not exist. You can add profiles one after another.</p>
      {saved > 0 && <div className="mm-banner ok">✅ {saved} profile{saved > 1 ? 's' : ''} added. Choose the next login to add another.</div>}

      {loading && <div className="mm-empty">Loading...</div>}
      {!loading && accounts.length === 0 && <div className="mm-empty">Every login already has a profile. Create a new login above to add another.</div>}

      {!loading && accounts.length > 0 && (
        <>
          <input className="input" placeholder="Search login" value={q} onChange={e => setQ(e.target.value)} />
          <select className="input mm-select" value={pick} onChange={e => setPick(e.target.value)}>
            <option value="">Select a login without profile ({shown.length})</option>
            {shown.map(a => <option key={a.user_id} value={a.user_id}>{a.email}</option>)}
          </select>
          <button className="btn mm-btn-pink" disabled={!chosen} onClick={() => setEditing({ user_id: chosen.user_id, email: chosen.email })}>📝 Add profile for this login</button>
        </>
      )}
    </div>
  )
}
