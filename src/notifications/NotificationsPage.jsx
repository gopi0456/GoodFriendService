import { useState } from 'react'
import PageFrame from '../engage/PageFrame'
import { ago } from '../engage/engageApi'
import { ICON, markAllRead, markRead, updateParts } from './useAlerts'
import { greeting, setVoiceEnabled, speak, voiceEnabled } from './voice'
import { clearPhoneBadge } from './push'
import './alerts.css'

// where a tap on an alert takes you
const GO = { contact: 'history', chat_message: 'chats', chat_approved: 'chats', admin_reply: 'contact', interest: 'matrimony', request: 'admin-enquiries' }

export default function NotificationsPage({ session, alerts, pushStatus, onBack, onNavigate }) {
  const uid = session.user.id
  const [voice, setVoice] = useState(voiceEnabled())
  const { items, unread, refresh } = alerts

  const open = async (n) => {
    if (!n.read_at) { await markRead(n.id); refresh() }
    if (n.kind === 'update') { const { url } = updateParts(n); if (/^https:\/\//i.test(url)) window.open(url, '_blank') }   // opens the APK download
    else if (GO[n.kind] && onNavigate) onNavigate(GO[n.kind])
  }
  const readAll = async () => { await markAllRead(uid); clearPhoneBadge(); refresh() }
  const toggleVoice = () => { const v = !voice; setVoice(v); setVoiceEnabled(v) }
  const sample = () => speak(`${greeting()}! Someone is interested to contact you. Thank you for using Good Friend Service. Good luck!`, { force: true })

  return (
    <PageFrame title="Alerts" icon="🔔" onBack={onBack}>
      <div className="eg-pad">
        <div className="al-voice">
          <label className="al-switch"><input type="checkbox" checked={voice} onChange={toggleVoice} /><span><b>Voice alerts</b><small>Speaks a greeting when someone contacts you</small></span></label>
          <button className="eg-small" onClick={sample}>Play sample</button>
        </div>
        <div className="al-status">{pushStatus === 'ok' ? 'Phone notifications are on: you get alerts even when the app is closed.' : 'Alerts appear here and speak while the app is open.'}</div>

        <div className="al-head">
          <div className="eg-sub" style={{ margin: 0 }}>{unread ? `${unread} new` : 'All caught up'}</div>
          {unread > 0 && <button className="eg-small" onClick={readAll}>Mark all read</button>}
        </div>

        {items === null && <div className="eg-empty">Loading...</div>}
        {items && items.length === 0 && <div className="eg-empty"><div className="eg-empty-ico">🔔</div><div>No alerts yet. You will see here when someone contacts you.</div></div>}
        {items && items.map(n => (
          <button className={`al-row ${n.read_at ? '' : 'new'}`} key={n.id} onClick={() => open(n)}>
            <span className="al-ico">{ICON[n.kind] || ICON.info}</span>
            <span className="al-txt"><b>{n.title}</b><small>{n.body}{n.kind === 'update' ? ' · Tap to download' : ''}</small></span>
            <span className="al-time">{ago(n.created_at)}</span>
            {!n.read_at && <span className="al-dot" aria-label="Unread" />}
          </button>
        ))}
      </div>
    </PageFrame>
  )
}
