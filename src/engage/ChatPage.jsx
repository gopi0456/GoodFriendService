import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import PageFrame from './PageFrame'
import ChatThread from './ChatThread'
import { ago } from './engageApi'

// all my chats. Only the ones the admin approved can be opened.
export default function ChatPage({ session, onBack }) {
  const uid = session.user.id
  const [links, setLinks] = useState(null)
  const [unread, setUnread] = useState({})
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    const [a, b, u] = await Promise.all([
      supabase.from('chat_links').select('*').eq('user_a', uid),
      supabase.from('chat_links').select('*').eq('user_b', uid),
      supabase.from('chat_messages').select('link_id').neq('sender', uid).is('read_at', null),
    ])
    const all = [...(a.data || []), ...(b.data || [])].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))
    setLinks(all)
    const m = {}; (u.data || []).forEach(r => { m[r.link_id] = (m[r.link_id] || 0) + 1 }); setUnread(m)
  }, [uid])
  useEffect(() => { load() }, [load])

  const other = (l) => (l.user_a === uid ? l.b_name : l.a_name) || 'User'

  if (open) {
    return (
      <PageFrame title={other(open)} icon="💬" onBack={() => { setOpen(null); load() }}>
        {open.context && <div className="eg-ctx">{open.context}</div>}
        <ChatThread link={open} uid={uid} />
      </PageFrame>
    )
  }
  return (
    <PageFrame title="Chats" icon="💬" onBack={onBack}>
      <div className="eg-pad">
        <div className="eg-banner info">Chat with a person starts only after the admin approves it. The admin can read chats to keep everyone safe.</div>
        {links === null && <div className="eg-empty">Loading...</div>}
        {links && links.length === 0 && <div className="eg-empty"><div className="eg-empty-ico">💬</div><div>No chats yet. Tap “Request chat” on a profile to start one.</div></div>}
        {links && links.map(l => (
          <button key={l.id} className={`eg-chatrow ${l.status}`} disabled={l.status !== 'approved'} onClick={() => setOpen(l)}>
            <span className="eg-avatar">{other(l)[0].toUpperCase()}</span>
            <span className="eg-chatrow-txt"><b>{other(l)}</b><small>{l.context || ''}</small></span>
            {l.status === 'approved' && unread[l.id] > 0 && <span className="eg-unread">{unread[l.id]}</span>}
            <span className={`eg-st ${l.status}`}>{l.status === 'approved' ? ago(l.created_at) : l.status === 'requested' ? '⏳ waiting' : l.status}</span>
          </button>
        ))}
      </div>
    </PageFrame>
  )
}
