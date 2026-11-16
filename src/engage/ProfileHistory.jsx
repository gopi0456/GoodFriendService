import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Portal from '../matrimony/Portal'
import HistoryList from './HistoryList'

// The contact history of ONE profile: who contacted it, and (if the person has an account) who he contacted.
// Used by the admin on every worker / event row, and by an owner for his own listing.
export default function ProfileHistory({ kind, id, name, ownerId, onClose }) {
  const [received, setReceived] = useState(null)
  const [made, setMade] = useState(null)

  useEffect(() => {
    supabase.from('contact_log').select('*').eq('target_id', id).order('created_at', { ascending: false }).range(0, 199).then(({ data }) => setReceived(data || []))
    if (ownerId) supabase.from('contact_log').select('*').eq('actor_id', ownerId).order('created_at', { ascending: false }).range(0, 199).then(({ data }) => setMade(data || []))
  }, [id, ownerId])

  const count = (m) => (received || []).filter(r => r.method === m).length
  return (
    <Portal onEscape={onClose}>
      <div className="eg-overlay" onClick={onClose}>
        <div className="eg-pop eg-wide" onClick={e => e.stopPropagation()}>
          <h3>🕘 History · {name}</h3>
          {received && (
            <div className="eg-chips">
              <span>📞 {count('call')} calls</span><span>💬 {count('whatsapp')} WhatsApp</span><span>✉️ {count('enquiry')} asked admin</span>
            </div>
          )}
          <div className="eg-sub">Contacted this {kind === 'worker' ? 'worker' : 'event service'}</div>
          {received === null ? <div className="eg-empty">Loading...</div> : <HistoryList rows={received} mode="received" empty="Nobody has contacted this profile yet." />}
          {ownerId && (
            <>
              <div className="eg-sub">Contacted by this person</div>
              {made === null ? <div className="eg-empty">Loading...</div> : <HistoryList rows={made} mode="made" empty="This person has not contacted anyone yet." />}
            </>
          )}
          <button className="eg-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </Portal>
  )
}
