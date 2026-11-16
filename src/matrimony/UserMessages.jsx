import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { TOPICS, TOPIC_ICON, TOPIC_NAME } from '../engage/engageApi'

const when = (t) => (t ? new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

// A user writes to the ADMIN (nobody else) and reads the admin's replies here.
// topic: 'matrimony' (the Matrimonial tab) or 'any' (the dashboard's "Contact admin": the user picks the menu it is about)
export default function UserMessages({ userId, onSeen, topic = 'matrimony' }) {
  const any = topic === 'any'
  const [pick, setPick] = useState(any ? 'general' : topic)
  const [items, setItems] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const seenRef = useRef(onSeen)
  seenRef.current = onSeen

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('matrimony_messages').select('*')
      .eq('from_user', userId).order('created_at', { ascending: false }).range(0, 199)
    if (error) { alert('Error: ' + error.message + '\n\nHave you run matrimony-update8.sql in Supabase?'); setItems([]); return }
    const rows = data || []
    setItems(any ? rows : rows.filter(m => (m.topic || 'matrimony') === topic))
    if (rows.some(m => !m.reply_seen)) {                      // opening this screen marks the replies as read
      await supabase.from('matrimony_messages').update({ reply_seen: true }).eq('from_user', userId).eq('reply_seen', false)
      if (seenRef.current) seenRef.current()
    }
  }, [userId, any, topic])
  useEffect(() => { load() }, [load])

  const send = async () => {
    const body = text.trim()
    if (!body) return
    setBusy(true)
    const row = { from_user: userId, body }
    if (pick !== 'matrimony') row.topic = pick            // 'matrimony' is the database default
    const { error } = await supabase.from('matrimony_messages').insert(row)
    setBusy(false)
    if (error) return alert('Could not send: ' + error.message + '\n\nHave you run app-update1.sql in Supabase?')
    setText('')
    load()
  }
  const remove = async (m) => {
    if (!window.confirm('Delete this message?')) return
    const { error } = await supabase.from('matrimony_messages').delete().eq('id', m.id)
    if (error) return alert('Error: ' + error.message)
    load()
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>{any ? '✉️ Ask the admin' : '✉️ Message the admin'}</h3>
        <p className="text-sm" style={{ marginBottom: 8 }}>{any ? 'Enquiry or question about any menu. Only the admin can read it.' : 'Only the admin can read this.'}</p>
        {any && (
          <div className="mm-topics">
            {TOPICS.map(([k, l]) => <button type="button" key={k} className={pick === k ? 'on' : ''} onClick={() => setPick(k)}>{TOPIC_ICON[k]} {l}</button>)}
          </div>
        )}
        <textarea className="input mm-textarea" maxLength={500} value={text} placeholder="Type your message..." onChange={e => setText(e.target.value)} />
        <div className="mm-chat-foot">
          <span className="text-sm">{text.length}/500</span>
          <button className="btn mm-btn-pink" style={{ width: 'auto', marginTop: 0 }} disabled={busy || !text.trim()} onClick={send}>📩 Send</button>
        </div>
      </div>

      {items === null && <div className="mm-empty">Loading...</div>}
      {items && items.length === 0 && <div className="mm-empty">No messages yet.</div>}
      {items && items.map(m => (
        <div className="mm-thread" key={m.id}>
          {(any || m.ref_label) && (
            <div className="mm-topic-line">
              {any && <span className="mm-topic">{TOPIC_ICON[m.topic || 'matrimony']} {TOPIC_NAME[m.topic || 'matrimony']}</span>}
              {m.ref_label && <span className="mm-ref">{m.ref_label}</span>}
            </div>
          )}
          <div className="mm-bubble me">{m.body}<span className="mm-time">{when(m.created_at)}</span></div>
          {m.admin_reply
            ? <div className="mm-bubble admin"><b>Admin</b>{m.admin_reply}<span className="mm-time">{when(m.replied_at)}</span></div>
            : <div className="mm-wait">⏳ Waiting for the admin's reply</div>}
          {m.status === 'open' && <button className="mm-link" onClick={() => remove(m)}>Delete</button>}
        </div>
      ))}
    </div>
  )
}
