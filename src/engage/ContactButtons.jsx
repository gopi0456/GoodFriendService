import { useState } from 'react'
import { telHref, waHref } from '../workers/workerApi'
import { logContact } from './engageApi'
import AskAdminPopup from './AskAdminPopup'

// Call / WhatsApp for one profile. When the number is hidden (admin switch, or hidden for this profile),
// there is NO call link at all: tapping asks the admin instead. Every Call / WhatsApp tap is recorded.
// prefix: 'wk' (workers) or 'ev' (events) - picks the button style.
export default function ContactButtons({ prefix = 'wk', kind, id, name, phone, locked }) {
  const [ask, setAsk] = useState(false)
  if (locked || !phone) {
    return (
      <>
        <button type="button" className={`${prefix}-btn lock`} onClick={() => setAsk(true)}>🔒 Number hidden · Ask admin</button>
        {ask && <AskAdminPopup kind={kind} id={id} name={name} onClose={() => setAsk(false)} />}
      </>
    )
  }
  return (
    <>
      <a className={`${prefix}-btn call`} href={telHref(phone)} onClick={() => logContact(kind, id, 'call')}>📞 Call</a>
      <a className={`${prefix}-btn wa`} href={waHref(phone)} target="_blank" rel="noreferrer" onClick={() => logContact(kind, id, 'whatsapp')}>💬 WhatsApp</a>
    </>
  )
}
