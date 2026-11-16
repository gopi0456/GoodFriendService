import { useEffect, useState } from 'react'
import { supabase, adminEmail } from '../supabaseClient'
import './matrimony.css'
import useRelations from './useRelations'
import ErrorBoundary from './ErrorBoundary'
import MyProfile from './MyProfile'
import Browse from './Browse'
import Interests from './Interests'
import Shortlist from './Shortlist'
import AdminPanel from './AdminPanel'
import Dashboard from './Dashboard'
import UserMessages from './UserMessages'
import MyKundliCard from './MyKundliCard'
import PasswordCard from './PasswordCard'

function MatrimonyInner({ session, onBack, initialTab }) {
  const userId = session.user.id
  const isAdmin = (session.user.email || '').toLowerCase() === adminEmail.toLowerCase()
  const [tab, setTab] = useState(initialTab || 'home')
  const [me, setMe] = useState(undefined) // undefined = loading, null = no profile yet
  const [loadError, setLoadError] = useState('')
  const [staff, setStaff] = useState(null)
  const [adminCount, setAdminCount] = useState(0)
  const [unread, setUnread] = useState(0)
  const rel = useRelations(userId)

  const loadMe = async () => {
    const { data, error } = await supabase.from('matrimony_profiles').select('*').eq('user_id', userId).maybeSingle()
    if (error) { setLoadError(error.message); setMe(null); return }
    setLoadError('')
    setMe(data)
  }

  useEffect(() => { loadMe() }, [userId])
  useEffect(() => {
    supabase.from('matrimony_staff').select('*').eq('user_id', userId).maybeSingle()
      .then(({ data }) => setStaff(data || null))
  }, [userId])

  const perms = {
    isAdmin,
    add_user: isAdmin || !!staff?.can_add_user,
    add_profile: isAdmin || !!staff?.can_add_profile,
    review: isAdmin || !!staff?.can_review,
    messages: isAdmin || !!staff?.can_messages,
  }
  const canAdmin = perms.add_user || perms.add_profile || perms.review || perms.messages

  // badge for the admin tab: profiles + messages waiting
  useEffect(() => {
    if (!canAdmin) return
    const jobs = []
    if (perms.review) jobs.push(supabase.from('matrimony_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'pending'))
    if (perms.messages) jobs.push(supabase.from('matrimony_contact_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'))
    if (perms.messages) jobs.push(supabase.from('matrimony_messages').select('id', { count: 'exact', head: true }).eq('status', 'open'))
    if (perms.add_user) jobs.push(supabase.from('matrimony_password_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'))
    Promise.all(jobs).then(r => setAdminCount(r.reduce((a, x) => a + (x.count || 0), 0)))
  }, [canAdmin, perms.review, perms.messages, perms.add_user, tab])

  // unread replies from the admin
  useEffect(() => {
    supabase.from('matrimony_messages').select('id', { count: 'exact', head: true }).eq('from_user', userId).eq('reply_seen', false)
      .then(({ count }) => setUnread(count || 0))
  }, [userId, tab])

  const shell = (body) => (
    <div>
      <div className="header mm-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="header-title">💍 Matrimonial <small className="mm-ver">v13</small></div>
        <div style={{ width: 70 }} />
      </div>
      {body}
    </div>
  )

  if (me === undefined) return shell(<div className="content mm-empty">Loading...</div>)

  // A user without a profile may only see "My Profile" (and Admin, if they are staff).
  // Using the effective tab here prevents the blank page caused by rendering Browse with no profile.
  const activeTab = !me && !(tab === 'admin' && canAdmin) && tab !== 'messages' ? 'profile' : (tab === 'admin' && !canAdmin ? 'home' : tab)

  const pendingIn = rel.receivedList.filter(i => i.status === 'pending').length
  const tabs = me
    ? [['home', 'Home'], ['browse', 'Browse'], ['interests', `Interests${pendingIn ? ` (${pendingIn})` : ''}`], ['saved', 'Saved'], ['messages', `Messages${unread ? ` (${unread})` : ''}`], ['profile', 'Mine']]
    : [['profile', 'My Profile'], ['messages', `Messages${unread ? ` (${unread})` : ''}`]]
  if (canAdmin) tabs.push(['admin', `Admin${adminCount ? ` (${adminCount})` : ''}`])

  let banner = null
  if (loadError) {
    banner = <div className="mm-banner bad">Could not load matrimony data: {loadError}. Make sure the SQL files were run in Supabase.</div>
  } else if (!me) {
    banner = activeTab === 'profile' ? <div className="mm-banner warn">Create your profile to get started.</div> : null
  } else if (me.status === 'married' && activeTab === 'home') {
    banner = <div className="mm-banner ok">💍 Congratulations! Your profile is marked as married. Best wishes!</div>
  } else if (me.status === 'rejected' && activeTab === 'profile') {
    banner = <div className="mm-banner bad">Your profile was not approved. Please update it and contact the admin.</div>
  }
  if (activeTab === 'admin') banner = null

  let body
  if (activeTab === 'profile') body = <><MyKundliCard me={me} /><MyProfile userId={userId} me={me} onSaved={loadMe} /><PasswordCard userId={userId} /></>
  else if (activeTab === 'home') body = <Dashboard me={me} onGo={setTab} />
  else if (activeTab === 'messages') body = <UserMessages userId={userId} onSeen={() => setUnread(0)} />
  else if (activeTab === 'admin') body = <AdminPanel perms={perms} />
  else if (activeTab === 'browse') body = <Browse userId={userId} me={me} rel={rel} />
  else if (activeTab === 'interests') body = <Interests userId={userId} me={me} rel={rel} />
  else body = <Shortlist userId={userId} me={me} rel={rel} />

  return shell(
    <>
      <div className="tabs mm-tabs">
        {tabs.map(([k, label]) => (
          <div key={k} className={`tab ${activeTab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</div>
        ))}
      </div>
      <div className="content">
        {banner}
        {body}
      </div>
    </>
  )
}

export default function Matrimony(props) {
  return (
    <ErrorBoundary onBack={props.onBack}>
      <MatrimonyInner {...props} />
    </ErrorBoundary>
  )
}
