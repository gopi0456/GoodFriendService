import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { respondInterest } from './utils'
import ProfileView, { ProfileCard } from './ProfileView'
import ScoreBadges from './ScoreBadges'

export default function Interests({ userId, me, rel }) {
  const approved = me.status === 'approved'
  const [sub, setSub] = useState(approved ? 'received' : 'contact')
  const [profiles, setProfiles] = useState({})
  const [open, setOpen] = useState(null)

  const list = sub === 'received' ? rel.receivedList : sub === 'sent' ? rel.sentList : sub === 'kundli' ? rel.kundliList : rel.requestList
  const otherId = (i) => (sub === 'received' ? i.from_user : sub === 'sent' ? i.to_user : i.about_user)

  useEffect(() => {
    const ids = [...new Set(list.map(otherId))].filter(id => !profiles[id])
    if (!ids.length) return
    supabase.from('matrimony_directory').select('*').in('user_id', ids).then(({ data }) => {
      const map = {}
      ;(data || []).forEach(p => { map[p.user_id] = p })
      setProfiles(prev => ({ ...prev, ...map }))
    })
  }, [list])

  const answer = async (e, i, status) => {
    e.stopPropagation()
    const { error } = await respondInterest(i.from_user, userId, status)
    if (error) alert('Error: ' + error.message)
    rel.reload()
  }

  const badgeClass = (s) => (s === 'declined' ? 'rejected' : s === 'granted' ? 'accepted' : s)
  const rows = list.filter(i => profiles[otherId(i)])
  const subs = approved
    ? [['received', 'Received'], ['sent', 'Sent'], ['contact', 'Phone'], ['kundli', 'Kundli']]
    : [['contact', 'Phone'], ['kundli', 'Kundli']]

  return (
    <div>
      <div className="mm-subtabs">
        {subs.map(([k, label]) => (
          <div key={k} className={`mm-subtab ${sub === k ? 'active' : ''}`} onClick={() => setSub(k)}>{label}</div>
        ))}
      </div>

      {rows.map(i => {
        const p = profiles[otherId(i)]
        return (
          <ProfileCard key={i.id} profile={p} onOpen={() => setOpen(p)}
            footer={
              <div style={{ marginTop: 6 }}>
                <ScoreBadges me={me} p={p} />
                <span className={`badge badge-${badgeClass(i.status)}`}>{i.status === 'granted' ? (sub === 'kundli' ? 'kundli allowed' : 'number released') : i.status}</span>
                {(sub === 'contact' || sub === 'kundli') && i.admin_reply && <div className="text-sm" style={{ marginTop: 4 }}>Admin: {i.admin_reply}</div>}
                {sub === 'received' && i.status === 'pending' && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-success" onClick={(e) => answer(e, i, 'accepted')}>Accept</button>
                    <button className="btn btn-sm btn-danger" onClick={(e) => answer(e, i, 'declined')}>Decline</button>
                  </div>
                )}
              </div>
            } />
        )
      })}
      {list.length === 0 && (
        <div className="mm-empty">
          {sub === 'received' ? 'No interests received yet.' : sub === 'sent' ? 'You have not sent any interests yet.' : sub === 'kundli' ? 'No kundli requests yet. Open a profile and tap "Request kundli from admin".' : 'No phone requests yet. Open a profile and send a message to the admin to ask for the mobile number.'}
        </div>
      )}

      {open && <ProfileView profile={open} userId={userId} me={me} rel={rel} onClose={() => setOpen(null)} />}
    </div>
  )
}
