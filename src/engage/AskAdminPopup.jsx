import { useState } from 'react'
import Portal from '../matrimony/Portal'
import { logContact, sendEnquiry } from './engageApi'

// shown when someone taps a hidden contact: they can ask the admin for the number
export default function AskAdminPopup({ kind, id, name, onClose }) {
  const label = kind === 'worker' ? 'Worker' : 'Event service'
  const [msg, setMsg] = useState(`Please share the contact number of ${name}.`)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const send = async () => {
    if (!msg.trim()) return
    setBusy(true)
    const { error } = await sendEnquiry({ topic: kind === 'worker' ? 'workers' : 'events', body: msg, refLabel: `${label}: ${name}` })
    setBusy(false)
    if (error) return alert('Could not send: ' + error.message + '\n\nHave you run app-update1.sql in Supabase?')
    logContact(kind, id, 'enquiry')
    setDone(true)
  }

  return (
    <Portal onEscape={onClose}>
      <div className="eg-overlay" onClick={onClose}>
        <div className="eg-pop" onClick={e => e.stopPropagation()}>
          <div className="eg-pop-ico">{done ? '✅' : '📵'}</div>
          {done ? (
            <>
              <h3>Sent to the admin</h3>
              <p>You will see the reply under <b>Contact admin</b> on the dashboard.</p>
              <button className="eg-primary" onClick={onClose}>Done</button>
            </>
          ) : (
            <>
              <h3>Contact number is hidden</h3>
              <p>This number is kept private. Ask the admin and they will share it with you.</p>
              <textarea className="eg-input" maxLength={300} value={msg} onChange={e => setMsg(e.target.value)} />
              <button className="eg-primary" disabled={busy || !msg.trim()} onClick={send}>{busy ? 'Sending...' : '✉️ Ask the admin'}</button>
              <button className="eg-ghost" onClick={onClose}>Not now</button>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
