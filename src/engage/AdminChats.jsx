import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Portal from '../matrimony/Portal'
import PageFrame from './PageFrame'
import ChatThread from './ChatThread'
import { ago } from './engageApi'

// admin: approve or stop chats between two people, and read them if needed
export default function AdminChats({ onBack }) {
  const [links, setLinks] = useState(null)
  const [tab, setTab] = useState('requested')
  const [view, setView] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('chat_links').select('*').order('created_at', { ascending: false }).range(0, 299)
    if (error) alert('Error: ' + error.message + '\n\nHave you run app-update1.sql in Supabase?')
    setLinks(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const decide = async (l, status) => {
    const { error } = await supabase.from('chat_links').update({ status }).eq('id', l.id)
    if (error) return alert('Error: ' + error.message)
    load()
  }
  const count = (s) => (links || []).filter(l => (s === 'closed' ? ['declined', 'revoked'].includes(l.status) : l.status === s)).length
  const shown = (links || []).filter(l => (tab === 'closed' ? ['declined', 'revoked'].includes(l.status) : l.status === tab))

  return (
    <PageFrame title="Chat requests" icon="💬" onBack={onBack}>
      <div className="eg-tabs">
        {[['requested', 'Requests'], ['approved', 'Approved'], ['closed', 'Closed']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l} <small>{count(k)}</small></button>
        ))}
      </div>
      <div className="eg-pad">
        {links === null && <div className="eg-empty">Loading...</div>}
        {links && shown.length === 0 && <div className="eg-empty"><div className="eg-empty-ico">💬</div><div>Nothing here.</div></div>}
        {shown.map(l => (
          <div className="eg-card" key={l.id}>
            <div className="eg-card-top"><b>{l.a_name}</b><span>→</span><b>{l.b_name}</b></div>
            <div className="eg-sub2">{l.context || 'Chat request'} · {ago(l.created_at)}</div>
            <div className="eg-actions">
              {l.status === 'requested' && <><button className="eg-small ok" onClick={() => decide(l, 'approved')}>✅ Approve chat</button><button className="eg-small bad" onClick={() => decide(l, 'declined')}>✖ Decline</button></>}
              {l.status === 'approved' && <><button className="eg-small" onClick={() => setView(l)}>👁 Read chat</button><button className="eg-small bad" onClick={() => decide(l, 'revoked')}>⛔ Switch off</button></>}
              {(l.status === 'declined' || l.status === 'revoked') && <button className="eg-small ok" onClick={() => decide(l, 'approved')}>✅ Approve again</button>}
            </div>
          </div>
        ))}
      </div>
      {view && (
        <Portal onEscape={() => setView(null)}>
          <div className="eg-overlay" onClick={() => setView(null)}>
            <div className="eg-pop eg-chatpop" onClick={e => e.stopPropagation()}>
              <div className="eg-chathead"><div><b>{view.a_name} ↔ {view.b_name}</b><small>{view.context}</small></div><button onClick={() => setView(null)} aria-label="Close">✕</button></div>
              <ChatThread link={view} uid="admin" readOnly />
            </div>
          </div>
        </Portal>
      )}
    </PageFrame>
  )
}
