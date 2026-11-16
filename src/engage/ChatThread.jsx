import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { when } from './engageApi'

// One conversation. The composer exists ONLY while the admin has the chat approved.
// readOnly = the admin looking at it (for safety), no sending and nothing is marked as read.
export default function ChatThread({ link, uid, readOnly = false }) {
  const [msgs, setMsgs] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const nameOf = (id) => (id === link.user_a ? link.a_name : link.b_name) || 'User'

  const load = useCallback(async () => {
    const { data } = await supabase.from('chat_messages').select('*').eq('link_id', link.id).order('created_at', { ascending: true }).range(0, 499)
    const rows = data || []
    setMsgs(rows)
    if (!readOnly && rows.some(m => m.sender !== uid && !m.read_at)) {
      await supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('link_id', link.id).neq('sender', uid).is('read_at', null)
    }
  }, [link.id, uid, readOnly])

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t) }, [load])
  useEffect(() => { if (endRef.current && endRef.current.scrollIntoView) endRef.current.scrollIntoView({ block: 'end' }) }, [msgs && msgs.length])

  const send = async () => {
    const body = text.trim()
    if (!body) return
    setBusy(true)
    const { error } = await supabase.from('chat_messages').insert({ link_id: link.id, body })
    setBusy(false)
    if (error) return alert('Could not send: ' + error.message)
    setText(''); load()
  }

  const canSend = !readOnly && link.status === 'approved'
  return (
    <div className="eg-thread">
      <div className="eg-msgs">
        {msgs === null && <div className="eg-empty">Loading...</div>}
        {msgs && msgs.length === 0 && <div className="eg-empty"><div className="eg-empty-ico">💬</div><div>{canSend ? 'Say hello 👋' : 'No messages.'}</div></div>}
        {msgs && msgs.map(m => (
          <div key={m.id} className={`eg-bub ${m.sender === uid && !readOnly ? 'me' : 'them'}`}>
            {(readOnly || m.sender !== uid) && <b>{nameOf(m.sender)}</b>}
            {m.body}
            <span>{when(m.created_at)}{m.sender === uid && !readOnly && m.read_at ? ' · ✓✓' : ''}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {canSend ? (
        <div className="eg-composer">
          <textarea className="eg-input" rows={1} maxLength={1000} placeholder="Type a message" value={text} onChange={e => setText(e.target.value)} />
          <button className="eg-send" disabled={busy || !text.trim()} onClick={send} aria-label="Send">➤</button>
        </div>
      ) : (
        !readOnly && <div className="eg-banner">Chat is switched off by the admin.</div>
      )}
    </div>
  )
}
