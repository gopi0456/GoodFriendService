import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { TOPICS, TOPIC_ICON, TOPIC_NAME } from '../engage/engageApi'

const when = (t) => (t ? new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

// ------------------------------------------------------------------ messages written to the admin
export function GeneralMessages({ onChanged }) {
  const [status, setStatus] = useState('open')
  const [topic, setTopic] = useState('all')
  const [items, setItems] = useState(null)
  const [names, setNames] = useState({})
  const [replies, setReplies] = useState({})

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('matrimony_messages').select('*')
      .eq('status', status).order('created_at', { ascending: false }).range(0, 199)
    if (error) alert('Error: ' + error.message + '\n\nHave you run matrimony-update8.sql in Supabase?')
    const rows = data || []
    setItems(rows)
    const ids = [...new Set(rows.map(r => r.from_user))]
    if (ids.length) {
      const [pr, us] = await Promise.all([
        supabase.from('matrimony_profiles').select('user_id,full_name,gender,dob').in('user_id', ids),
        supabase.rpc('matrimony_admin_users'),
      ])
      const map = {}
      ;(us.data || []).forEach(u => { map[u.user_id] = u.email })
      ;(pr.data || []).forEach(p => { map[p.user_id] = p.full_name })
      setNames(map)
    }
  }, [status])
  useEffect(() => { load() }, [load])

  const reply = async (m) => {
    const txt = (replies[m.id] ?? m.admin_reply ?? '').trim()
    if (!txt) return alert('Type a reply first')
    const { error } = await supabase.from('matrimony_messages').update({ admin_reply: txt, status: 'answered' }).eq('id', m.id)
    if (error) return alert('Error: ' + error.message)
    setReplies(r => { const n = { ...r }; delete n[m.id]; return n })
    load(); if (onChanged) onChanged()
  }
  const remove = async (m) => {
    if (!window.confirm('Delete this message?')) return
    const { error } = await supabase.from('matrimony_messages').delete().eq('id', m.id)
    if (error) return alert('Error: ' + error.message)
    load(); if (onChanged) onChanged()
  }

  return (
    <div>
      <div className="mm-subtabs">
        {['open', 'answered'].map(s => <div key={s} className={`mm-subtab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s === 'open' ? 'Waiting for reply' : 'Answered'}</div>)}
      </div>
      <div className="mm-topics">
        <button type="button" className={topic === 'all' ? 'on' : ''} onClick={() => setTopic('all')}>All menus</button>
        {TOPICS.map(([k, l]) => <button type="button" key={k} className={topic === k ? 'on' : ''} onClick={() => setTopic(k)}>{TOPIC_ICON[k]} {l}</button>)}
      </div>
      {items === null && <div className="mm-empty">Loading...</div>}
      {items && items.filter(m => topic === 'all' || (m.topic || 'matrimony') === topic).length === 0 && <div className="mm-empty">No {status === 'open' ? 'new' : 'answered'} messages.</div>}
      {items && items.filter(m => topic === 'all' || (m.topic || 'matrimony') === topic).map(m => (
        <div className="card" key={m.id}>
          <div className="text-bold">{names[m.from_user] || 'User'}</div>
          <div className="mm-topic-line"><span className="mm-topic">{TOPIC_ICON[m.topic || 'matrimony']} {TOPIC_NAME[m.topic || 'matrimony']}</span>{m.ref_label && <span className="mm-ref">{m.ref_label}</span>}</div>
          <div className="mm-thread" style={{ marginTop: 8 }}>
            <div className="mm-bubble me">{m.body}<span className="mm-time">{when(m.created_at)}</span></div>
            {m.admin_reply && <div className="mm-bubble admin"><b>Your reply</b>{m.admin_reply}<span className="mm-time">{when(m.replied_at)}</span></div>}
          </div>
          <textarea className="input mm-textarea" maxLength={500} placeholder="Write your reply..."
            value={replies[m.id] ?? m.admin_reply ?? ''} onChange={e => setReplies(r => ({ ...r, [m.id]: e.target.value }))} />
          <div className="mm-row">
            <button className="btn mm-btn-pink" onClick={() => reply(m)}>{m.admin_reply ? '✏️ Update reply' : '📩 Send reply'}</button>
            <button className="btn btn-danger" onClick={() => remove(m)}>🗑 Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ the admin's inbox: phone requests, kundli requests, messages
export default function AdminInbox({ Requests }) {
  const [sub, setSub] = useState('contact')
  const [counts, setCounts] = useState({ contact: 0, kundli: 0, message: 0 })

  const loadCounts = useCallback(async () => {
    const q = (kind) => supabase.from('matrimony_contact_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('kind', kind)
    const [a, b, c] = await Promise.all([q('contact'), q('kundli'),
      supabase.from('matrimony_messages').select('id', { count: 'exact', head: true }).eq('status', 'open')])
    setCounts({ contact: a.count || 0, kundli: b.count || 0, message: c.count || 0 })
  }, [])
  useEffect(() => { loadCounts() }, [loadCounts])

  const tabs = [['contact', 'Numbers', counts.contact], ['kundli', 'Kundli', counts.kundli], ['message', 'Messages', counts.message]]
  return (
    <div>
      <div className="mm-subtabs">
        {tabs.map(([k, label, n]) => (
          <div key={k} className={`mm-subtab ${sub === k ? 'active' : ''}`} onClick={() => setSub(k)}>{label}{n ? ` (${n})` : ''}</div>
        ))}
      </div>
      {sub === 'message' ? <GeneralMessages onChanged={loadCounts} /> : <Requests key={sub} kind={sub} onChanged={loadCounts} />}
    </div>
  )
}
