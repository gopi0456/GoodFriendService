import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase, adminEmail } from '../supabaseClient'
import TravelingMenu from './TravelingMenu'
import Profile from './Profile'
import Admin from './Admin'
import Matrimony from '../matrimony/Matrimony'
import PasswordPage from '../matrimony/PasswordPage'
import Workers from '../workers/Workers'
import Events from '../events/Events'
import EnquiryPage from '../engage/EnquiryPage'
import HistoryPage from '../engage/HistoryPage'
import ChatPage from '../engage/ChatPage'
import AdminEnquiries from '../engage/AdminEnquiries'
import AdminActivity from '../engage/AdminActivity'
import AdminChats from '../engage/AdminChats'
import UpdateTicker from '../notices/UpdateTicker'
import AdminNotices from '../notices/AdminNotices'
import NotificationsPage from '../notifications/NotificationsPage'
import AlertToast from '../notifications/AlertToast'
import { ICON, useAlerts } from '../notifications/useAlerts'
import { greeting, speak, speechFor } from '../notifications/voice'
import { clearPhoneBadge, setupPush } from '../notifications/push'
import { THEMES, applyTheme, getTheme, setTheme } from '../theme/theme'
import ThemePicker from '../theme/ThemePicker'

// the four menus of the top bar ("Contact admin" is a card below)
const SERVICES = [
  { key: 'matrimony', icon: '💍', title: 'Matrimonial', slug: 'matrimonial', page: 'matrimony', cta: 'Open Matrimonial' },
  { key: 'travel', icon: '🚗', title: 'Travels', slug: 'travels', page: 'traveling', cta: 'Open Travels' },
  { key: 'workers', icon: '🛠️', title: 'Workers', slug: 'workers', page: 'workers', cta: 'Find a worker' },
  { key: 'events', icon: '🎉', title: 'Events', slug: 'events', page: 'events', cta: 'Browse events' },
]

const Card = ({ icon, label, badge, onClick, admin }) => (
  <button className={`vh-card ${admin ? 'admin' : ''}`} onClick={onClick}>
    <span className="vh-c-ico">{icon}</span><b>{label}</b>{badge > 0 && <span className="vh-dot">{badge}</span>}
  </button>
)

export default function Home({ session }) {
  const [page, setPage] = useState('home')
  const [sel, setSel] = useState('matrimony')
  const [theme, setThemeState] = useState(getTheme())
  const [stats, setStats] = useState({})
  const [toast, setToast] = useState('')
  const [picker, setPicker] = useState(false)
  const [alertToast, setAlertToast] = useState(null)
  const [pushStatus, setPushStatus] = useState('unavailable')
  const homeRef = useRef(null)
  const refreshRef = useRef(() => {})
  const pageRef = useRef('home')
  const uid = session.user.id
  const isAdmin = (session.user.email || '').toLowerCase() === adminEmail.toLowerCase()
  const name = (session.user.email || 'friend').split('@')[0]

  // New alerts (someone contacted you, a chat message, the admin replied...): show a bar and SPEAK the greeting.
  const alerts = useAlerts(uid, ({ rows }) => {
    // already reading the chats: the new chat message is on screen, no need to pop up or speak
    if (pageRef.current === 'chats' && rows.every(r => r.kind === 'chat_message')) return
    const first = rows[0]
    setAlertToast({ icon: ICON[first.kind] || ICON.info, title: rows.length > 1 ? `${rows.length} new alerts` : first.title, body: rows.length > 1 ? first.title : first.body })
    speak(speechFor(rows))
  })
  refreshRef.current = alerts.refresh
  pageRef.current = page

  useEffect(() => { applyTheme(theme) }, [theme])

  // phone notifications (work with the app closed and put the count on the app icon); needs the one-time setup in PUSH-SETUP.md
  useEffect(() => {
    let alive = true
    setupPush({ onReceive: () => refreshRef.current(), onOpen: () => setPage('alerts') }).then(s => { if (alive) setPushStatus(s) })
    return () => { alive = false }
  }, [uid])
  useEffect(() => { if (page === 'alerts' || alerts.unread === 0) clearPhoneBadge() }, [page, alerts.unread])
  useEffect(() => {
    if (!alertToast) return undefined
    const id = setTimeout(() => setAlertToast(null), 4500)
    return () => clearTimeout(id)
  }, [alertToast])

  // The layer BEHIND the page is painted too, so no light strip can show below the content on any phone:
  // the dashboard page gets the dashboard colour, the other pages their own page colour.
  useEffect(() => {
    const home = page === 'home'
    document.body.classList.toggle('vh-dash', home)
    const cs = getComputedStyle(document.body)
    const color = theme === 'classic' ? (home ? '#f3f4f6' : '') : cs.getPropertyValue(home ? '--canvas' : '--page').trim()
    document.documentElement.style.backgroundColor = color
    return () => { document.body.classList.remove('vh-dash'); document.documentElement.style.backgroundColor = '' }
  }, [page, theme])

  // FIT TO SCREEN: shrink every size of the dashboard (the big number, titles, buttons, spacing) a little at a time
  // until nothing needs scrolling, so no content ever slides under the fixed header. Tall phones keep full size.
  useLayoutEffect(() => {
    const el = homeRef.current
    if (page !== 'home' || !el) return undefined
    const fit = () => {
      let k = 1
      el.style.setProperty('--k', '1')
      for (let i = 0; i < 20 && el.scrollHeight > el.clientHeight + 1 && k > 0.5; i++) {
        k = Math.round((k - 0.04) * 100) / 100
        el.style.setProperty('--k', String(k))
      }
    }
    fit()
    window.addEventListener('resize', fit)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit)
    return () => window.removeEventListener('resize', fit)
  }, [page, sel, stats, isAdmin, theme, alerts.unread])

  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(id)
  }, [toast])

  // live numbers (each one is optional: a missing table just shows no number)
  useEffect(() => {
    if (page !== 'home') return
    let alive = true
    const head = (t) => supabase.from(t).select('id', { count: 'exact', head: true })
    Promise.allSettled([
      supabase.rpc('matrimony_stats'),
      head('workers').eq('status', 'approved'),
      head('event_profiles').eq('status', 'approved'),
      head('chat_messages').neq('sender', uid).is('read_at', null),
      head('matrimony_messages').eq('from_user', uid).eq('reply_seen', false),
    ]).then(([m, w, e, c, r]) => {
      if (!alive) return
      const ok = (x) => x.status === 'fulfilled' && !x.value.error
      setStats({
        matri: ok(m) ? (Array.isArray(m.value.data) ? m.value.data[0] : m.value.data) : null,
        workers: ok(w) ? w.value.count : null,
        events: ok(e) ? e.value.count : null,
        chats: ok(c) ? c.value.count || 0 : 0,
        replies: ok(r) ? r.value.count || 0 : 0,
      })
    })
    return () => { alive = false }
  }, [page, uid])

  const pickTheme = (t) => {
    setTheme(t); setThemeState(t); setPicker(false)
    const label = THEMES.find(x => x[0] === t)[1]
    setToast(t === 'auto' ? 'Surprise me: a new colour every time you open the app' : `Theme: ${label}`)
  }
  const back = () => setPage('home')

  const pages = {
    traveling: () => <TravelingMenu onBack={back} />,
    profile: () => <Profile onBack={back} />,
    admin: () => <Admin onBack={back} />,
    workers: () => <Workers session={session} onBack={back} />,
    'workers-admin': () => <Workers session={session} initialTab="admin" onBack={back} />,
    events: () => <Events session={session} onBack={back} />,
    'events-admin': () => <Events session={session} initialTab="admin" onBack={back} />,
    password: () => <PasswordPage session={session} onBack={back} />,
    'matrimony-admin': () => <Matrimony session={session} initialTab="admin" onBack={back} />,
    matrimony: () => <Matrimony session={session} onBack={back} />,
    contact: () => <EnquiryPage session={session} onBack={back} />,
    history: () => <HistoryPage session={session} onBack={back} />,
    chats: () => <ChatPage session={session} onBack={back} />,
    alerts: () => <NotificationsPage session={session} alerts={alerts} pushStatus={pushStatus} onBack={back} onNavigate={setPage} />,
    'admin-enquiries': () => <AdminEnquiries onBack={back} />,
    'admin-activity': () => <AdminActivity onBack={back} />,
    'admin-chats': () => <AdminChats onBack={back} />,
    'admin-notices': () => <AdminNotices onBack={back} />,
  }

  const cur = SERVICES.find(s => s.key === sel)
  const m = stats.matri
  const f = {
    matrimony: { sub: 'Matches, kundli and compatibility', lead: 'join', big: m ? m.total : '—', cap: 'members registered', extra: m ? `💞 ${m.couples} couples united` : '' },
    travel: { sub: 'Rides, trips and travel details', lead: 'plan', big: 'Trips', cap: 'rides, bookings and more', extra: '' },
    workers: { sub: 'Plumber, jeweller, carpenter & more', lead: 'call', big: stats.workers != null ? stats.workers : '—', cap: 'trusted workers', extra: '' },
    events: { sub: 'Halls, catering and photography', lead: 'book', big: stats.events != null ? stats.events : '—', cap: 'event services', extra: '🏛️ 🍽️ 📸 💐 🎂 💎' },
  }[sel]

  const dashboard = (
    <div className="vh-home" ref={homeRef}>
      <div className="vh-fixed">
        <UpdateTicker />
        <div className="vh-top">
          <button className="vh-avatar" onClick={() => setPage('profile')} aria-label="My profile">{name[0].toUpperCase()}</button>
          <div className="vh-hello"><span>{greeting()}</span><b>{name}</b></div>
          <div className="vh-top-actions">
            <button className={`vh-word ${alerts.unread > 0 ? 'vh-alerts' : ''}`} onClick={() => setPage('alerts')}>Alerts {alerts.unread > 0 && <span className="vh-count">{alerts.unread}</span>}</button>
            <button className="vh-word" onClick={() => setPicker(true)} aria-label="Choose colour theme"><span className={`vh-swatch ${theme === 'auto' ? 'auto' : ''}`} />Theme</button>
          </div>
        </div>
        <div className="vh-menu" role="tablist">
          {SERVICES.map(s => (
            <button key={s.key} role="tab" className={`vh-tab ${sel === s.key ? 'on' : ''}`} aria-selected={sel === s.key} onClick={() => setSel(s.key)}>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {picker && <ThemePicker current={theme} onPick={pickTheme} onClose={() => setPicker(false)} />}
      {toast && <div className="vh-toast" role="status">{toast}</div>}
      <div className="vh-glow3" aria-hidden="true" />
      <div className="vh-body">
      <div className="vh-feature">
      <div className="vh-window">
        <div className="vh-bar"><i /><i /><i /><span>{cur.slug}</span></div>
        <div className="vh-win-body">
          <div className="vh-mark">{cur.icon}</div>
          <h1>{cur.title}</h1>
          <p>{f.sub}</p>
        </div>
      </div>
      <div className="vh-promo">
        <small>{f.lead}</small>
        <div className="vh-big">{f.big}</div>
        <div className="vh-cap">{f.cap}</div>
        {f.extra && <div className="vh-extra">{f.extra}</div>}
        <button className="vh-cta" onClick={() => setPage(cur.page)}>{cur.cta} ↗</button>
      </div>
      </div>

      <div className="vh-label">Quick access</div>
      <div className="vh-grid">
        <Card icon="💬" label="Chats" badge={stats.chats} onClick={() => setPage('chats')} />
        <Card icon="🔔" label="Alerts" badge={alerts.unread} onClick={() => setPage('alerts')} />
        <Card icon="🕘" label="My history" onClick={() => setPage('history')} />
        <Card icon="✉️" label="Contact admin" badge={stats.replies} onClick={() => setPage('contact')} />
        <Card icon="👤" label="My profile" onClick={() => setPage('profile')} />
        <Card icon="🔑" label="Change password" onClick={() => setPage('password')} />
      </div>

      {isAdmin && (
        <>
          <div className="vh-label">Admin</div>
          <div className="vh-grid row">
            <Card admin icon="⚙️" label="Main admin" onClick={() => setPage('admin')} />
            <Card admin icon="💍" label="Matrimony admin" onClick={() => setPage('matrimony-admin')} />
            <Card admin icon="🛠️" label="Workers admin" onClick={() => setPage('workers-admin')} />
            <Card admin icon="🎉" label="Events admin" onClick={() => setPage('events-admin')} />
            <Card admin icon="📥" label="Enquiries" onClick={() => setPage('admin-enquiries')} />
            <Card admin icon="🕘" label="Activity" onClick={() => setPage('admin-activity')} />
            <Card admin icon="💬" label="Chat requests" onClick={() => setPage('admin-chats')} />
            <Card admin icon="📣" label="Updates" onClick={() => setPage('admin-notices')} />
          </div>
        </>
      )}
      </div>
    </div>
  )

  return (
    <>
      {pages[page] ? pages[page]() : dashboard}
      <AlertToast toast={alertToast} onOpen={() => { setAlertToast(null); setPage('alerts') }} onClose={() => setAlertToast(null)} />
    </>
  )
}
