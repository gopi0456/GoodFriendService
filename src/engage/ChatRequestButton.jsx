import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Portal from '../matrimony/Portal'
import ChatThread from './ChatThread'
import { getUid, requestChat } from './engageApi'

// "Request chat" with another person. Messaging is OFF until the admin approves it.
export default function ChatRequestButton({ otherId, otherName, context }) {
  const [uid, setUid] = useState(null)
  const [link, setLink] = useState(undefined)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const id = await getUid()
    setUid(id)
    if (!id || !otherId || id === otherId) { setLink(null); return }
    const [a, b] = await Promise.all([
      supabase.from('chat_links').select('*').eq('user_a', id).eq('user_b', otherId).maybeSingle(),
      supabase.from('chat_links').select('*').eq('user_a', otherId).eq('user_b', id).maybeSingle(),
    ])
    setLink(a.data || b.data || null)
  }, [otherId])
  useEffect(() => { load() }, [load])

  if (!otherId || uid === otherId || link === undefined) return null

  const ask = async () => {
    setBusy(true)
    const { error } = await requestChat({ otherId, otherName, context })
    setBusy(false)
    if (error) return alert('Could not send the request: ' + error.message + '\n\nHave you run app-update1.sql in Supabase?')
    load()
  }

  if (!link) return <button className="eg-chatbtn" disabled={busy} onClick={ask}>💬 Request chat <small>(needs admin approval)</small></button>
  if (link.status === 'requested') return <div className="eg-chatnote">⏳ Chat request sent. It starts after the admin approves it.</div>
  if (link.status !== 'approved') return <div className="eg-chatnote off">Chat is not available.</div>
  return (
    <>
      <button className="eg-chatbtn on" onClick={() => setOpen(true)}>💬 Open chat</button>
      {open && (
        <Portal onEscape={() => setOpen(false)}>
          <div className="eg-overlay" onClick={() => setOpen(false)}>
            <div className="eg-pop eg-chatpop" onClick={e => e.stopPropagation()}>
              <div className="eg-chathead"><div><b>{otherName}</b><small>{context}</small></div><button onClick={() => setOpen(false)} aria-label="Close">✕</button></div>
              <ChatThread link={link} uid={uid} />
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
