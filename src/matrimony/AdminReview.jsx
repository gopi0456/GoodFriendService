import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { ageOf, heightLabel, maritalLabel } from './utils'
import { Avatar } from './ProfileView'

function Profiles() {
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('matrimony_profiles').select('*')
      .eq('status', status).order('created_at', { ascending: false })
    if (error) alert('Error: ' + error.message)
    setItems(data || [])
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  const setProfileStatus = async (id, next) => {
    const { error } = await supabase.from('matrimony_profiles').update({ status: next }).eq('user_id', id)
    if (error) return alert('Error: ' + error.message)
    load()
  }

  return (
    <div>
      <div className="mm-subtabs">
        {['pending', 'approved', 'rejected'].map(s => (
          <div key={s} className={`mm-subtab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s}</div>
        ))}
      </div>
      {loading && <div className="mm-empty">Loading...</div>}
      {!loading && items.length === 0 && <div className="mm-empty">Nothing here.</div>}
      {items.map(p => (
        <div className="card mm-card" key={p.user_id} style={{ cursor: 'default' }}>
          <Avatar profile={p} />
          <div className="mm-card-body">
            <div className="text-bold">{p.full_name}, {ageOf(p)} ({p.gender})</div>
            <div className="text-sm">{[heightLabel(p.height_cm), maritalLabel(p.marital_status), p.religion].filter(Boolean).join(' • ')}</div>
            <div className="text-sm">{[p.education, p.occupation, p.city].filter(Boolean).join(' • ')}</div>
            {p.about && <div className="text-sm">{p.about}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {status !== 'approved' && <button className="btn btn-sm btn-success" onClick={() => setProfileStatus(p.user_id, 'approved')}>Approve</button>}
              {status !== 'rejected' && <button className="btn btn-sm btn-danger" onClick={() => setProfileStatus(p.user_id, 'rejected')}>Reject</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Requests() {
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [people, setPeople] = useState({})
  const [phones, setPhones] = useState({})
  const [replies, setReplies] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('matrimony_contact_requests').select('*')
      .eq('status', status).order('created_at', { ascending: false })
    if (error) alert('Error: ' + error.message)
    const rows = data || []
    setItems(rows)
    const ids = [...new Set(rows.flatMap(r => [r.from_user, r.about_user]))]
    if (ids.length) {
      const [pr, ph] = await Promise.all([
        supabase.from('matrimony_profiles').select('*').in('user_id', ids),
        supabase.from('matrimony_contacts').select('*').in('user_id', ids),
      ])
      const pm = {}; (pr.data || []).forEach(p => { pm[p.user_id] = p })
      const phm = {}; (ph.data || []).forEach(p => { phm[p.user_id] = p.phone })
      setPeople(pm); setPhones(phm)
    }
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  const answer = async (id, next) => {
    const { error } = await supabase.from('matrimony_contact_requests')
      .update({ status: next, admin_reply: (replies[id] || '').trim() || null }).eq('id', id)
    if (error) return alert('Error: ' + error.message)
    load()
  }

  const who = (uid) => {
    const p = people[uid]
    return p ? `${p.full_name} (${ageOf(p)}, ${p.gender})` : 'Unknown user'
  }

  return (
    <div>
      <div className="mm-subtabs">
        {['pending', 'granted', 'declined'].map(s => (
          <div key={s} className={`mm-subtab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s}</div>
        ))}
      </div>
      {loading && <div className="mm-empty">Loading...</div>}
      {!loading && items.length === 0 && <div className="mm-empty">No {status} requests.</div>}
      {items.map(r => (
        <div className="card" key={r.id}>
          <div className="text-bold">{who(r.from_user)}</div>
          <div className="text-sm">📞 {phones[r.from_user] || 'no number'}</div>
          <div className="text-sm" style={{ margin: '6px 0' }}>wants the contact of</div>
          <div className="text-bold">{who(r.about_user)}</div>
          <div className="text-sm">📞 {phones[r.about_user] || 'no number'}</div>
          <div className="mm-banner warn" style={{ marginTop: 10 }}>💬 {r.message}</div>
          {r.status === 'pending' ? (
            <>
              <input className="input" placeholder="Optional reply to the user" value={replies[r.id] || ''}
                onChange={e => setReplies(x => ({ ...x, [r.id]: e.target.value }))} />
              <div className="mm-row" style={{ marginTop: 8 }}>
                <button className="btn btn-success" onClick={() => answer(r.id, 'granted')}>✅ Release number</button>
                <button className="btn btn-danger" onClick={() => answer(r.id, 'declined')}>✖ Decline</button>
              </div>
            </>
          ) : (
            <div className="text-sm">{r.admin_reply ? `Reply: ${r.admin_reply}` : 'No reply text'}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AdminReview() {
  const [mode, setMode] = useState('requests')
  return (
    <div>
      <div className="mm-subtabs">
        <div className={`mm-subtab ${mode === 'requests' ? 'active' : ''}`} onClick={() => setMode('requests')}>📩 Messages</div>
        <div className={`mm-subtab ${mode === 'profiles' ? 'active' : ''}`} onClick={() => setMode('profiles')}>👥 Profiles</div>
      </div>
      {mode === 'requests' ? <Requests /> : <Profiles />}
    </div>
  )
}
