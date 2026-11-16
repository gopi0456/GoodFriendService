import { useCallback, useEffect, useState } from 'react'
import { supabase, adminEmail } from '../supabaseClient'
import { BUCKET, ageOf, heightLabel, maritalLabel } from './utils'
import { deleteLogin, genUsername, setPassword as setUserPassword } from './adminApi'
import QuickAddProfile from './QuickAddProfile'
import AdminMatch from './AdminMatch'
import KundliView from './KundliView'
import AdminKundli from './AdminKundli'
import AdminInbox from './AdminInbox'
import Portal from './Portal'
import { birthFromProfile } from './kundli'
import { Avatar } from './ProfileView'
import MyProfile from './MyProfile'

const DOMAIN = 'goodfriendservice.app'
const PERMS = [
  ['can_add_user', '➕ Add users & approve password changes'],
  ['can_add_profile', '📝 Add / edit profiles'],
  ['can_review', '✅ Approve / reject profiles'],
  ['can_messages', '📩 Handle contact messages'],
]

// ------------------------------------------------------------------ profiles waiting for review
function Profiles() {
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('matrimony_profiles').select('*')
      .eq('status', status).order('created_at', { ascending: false })
    if (error) alert('Error: ' + error.message)
    setItems(data || [])
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  const setProfileStatus = async (id, next) => {
    const { error } = await supabase.from('matrimony_profiles').update({ status: next }).eq('user_id', id)
    if (error) return alert('Error: ' + error.message)
    load()
  }

  return (
    <div>
      <div className="mm-subtabs">
        {['pending', 'approved', 'rejected', 'married'].map(s => (
          <div key={s} className={`mm-subtab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s}</div>
        ))}
      </div>
      {loading && <div className="mm-empty">Loading...</div>}
      {!loading && items.length === 0 && <div className="mm-empty">Nothing here.</div>}
      {items.map(p => (
        <div className={`card mm-card mm-theme-${p.gender}`} key={p.user_id} style={{ cursor: 'default' }}>
          <Avatar profile={p} />
          <div className="mm-card-body">
            <div className="text-bold">{p.full_name}, {ageOf(p)} ({p.gender})</div>
            <div className="text-sm">{[heightLabel(p.height_cm), maritalLabel(p.marital_status), p.religion].filter(Boolean).join(' • ')}</div>
            <div className="text-sm">{[p.education, p.occupation, p.city].filter(Boolean).join(' • ')}</div>
            {p.about && <div className="text-sm">{p.about}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {status !== 'approved' && <button className="btn btn-sm btn-success" onClick={() => setProfileStatus(p.user_id, 'approved')}>Approve</button>}
              {status !== 'rejected' && <button className="btn btn-sm btn-danger" onClick={() => setProfileStatus(p.user_id, 'rejected')}>Reject</button>}
              {status !== 'pending' && <button className="btn btn-sm mm-btn-light" onClick={() => setProfileStatus(p.user_id, 'pending')}>⏳ Set pending</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ requests to the admin: phone numbers (kind "contact") and kundlis (kind "kundli")
function Requests({ kind = 'contact', onChanged }) {
  const isKundli = kind === 'kundli'
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [people, setPeople] = useState({})
  const [phones, setPhones] = useState({})
  const [replies, setReplies] = useState({})
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('matrimony_contact_requests').select('*')
      .eq('kind', kind).eq('status', status).order('created_at', { ascending: false })
    if (error) alert('Error: ' + error.message + '\n\nHave you run matrimony-update8.sql in Supabase?')
    const rows = data || []
    setItems(rows)
    const ids = [...new Set(rows.flatMap(r => [r.from_user, r.about_user]))]
    if (ids.length) {
      const [pr, ph] = await Promise.all([
        supabase.from('matrimony_profiles').select('*').in('user_id', ids),
        isKundli ? Promise.resolve({ data: [] }) : supabase.from('matrimony_contacts').select('*').in('user_id', ids),
      ])
      const pm = {}; (pr.data || []).forEach(p => { pm[p.user_id] = p })
      const phm = {}; (ph.data || []).forEach(p => { phm[p.user_id] = p.phone })
      setPeople(pm); setPhones(phm)
    }
    setLoading(false)
  }, [status, kind, isKundli])

  useEffect(() => { load() }, [load])

  const answer = async (id, next) => {
    const { error } = await supabase.from('matrimony_contact_requests')
      .update({ status: next, admin_reply: (replies[id] || '').trim() || null }).eq('id', id)
    if (error) return alert('Error: ' + error.message)
    load(); if (onChanged) onChanged()
  }

  const who = (uid) => {
    const p = people[uid]
    return p ? `${p.full_name} (${ageOf(p)}, ${p.gender})` : 'Unknown user'
  }

  return (
    <div>
      <div className="mm-subtabs">
        {['pending', 'granted', 'declined'].map(s => (
          <div key={s} className={`mm-subtab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s}</div>
        ))}
      </div>
      {loading && <div className="mm-empty">Loading...</div>}
      {!loading && items.length === 0 && <div className="mm-empty">No {status} {isKundli ? 'kundli requests' : 'phone requests'}.</div>}
      {items.map(r => {
        const target = people[r.about_user]
        const hasTime = !!target?.birth_time
        return (
          <div className="card" key={r.id}>
            <div className="text-bold">{who(r.from_user)}</div>
            {!isKundli && <div className="text-sm">📞 {phones[r.from_user] || 'no number'}</div>}
            <div className="text-sm" style={{ margin: '6px 0' }}>{isKundli ? 'wants the kundli of' : 'wants the contact of'}</div>
            <div className="text-bold">{who(r.about_user)}</div>
            {isKundli
              ? <div className="text-sm">{hasTime ? `✓ birth time on file (${String(target.birth_time).slice(0, 5)})` : '⚠ no birth time on file'}</div>
              : <div className="text-sm">📞 {phones[r.about_user] || 'no number'}</div>}
            {r.message && <div className="mm-banner warn" style={{ marginTop: 10 }}>💬 {r.message}</div>}
            {r.status === 'pending' ? (
              <>
                <input className="input" placeholder="Optional note to the user" value={replies[r.id] || ''}
                  onChange={e => setReplies(x => ({ ...x, [r.id]: e.target.value }))} />
                {isKundli && hasTime && <button className="btn btn-sm mm-btn-light" style={{ marginTop: 0, marginBottom: 8 }} onClick={() => setPreview(birthFromProfile(target))}>📜 Preview the kundli</button>}
                <div className="mm-row" style={{ marginTop: 8 }}>
                  <button className="btn btn-success" disabled={isKundli && !hasTime} onClick={() => answer(r.id, 'granted')}>{isKundli ? '✅ Share kundli' : '✅ Release number'}</button>
                  <button className="btn btn-danger" onClick={() => answer(r.id, 'declined')}>✖ Decline</button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm">{r.admin_reply ? `Note: ${r.admin_reply}` : 'No note'}</div>
                {isKundli && r.status === 'granted' && <button className="btn btn-sm btn-danger" style={{ marginTop: 8, width: 'auto' }} onClick={() => answer(r.id, 'declined')}>↩ Take back access</button>}
              </>
            )}
          </div>
        )
      })}
      {preview && <KundliView birth={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

// ------------------------------------------------------------------ completed (married) matches
function Married() {
  const [rows, setRows] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('matrimony_success').select('*').order('married_on', { ascending: false })
    if (error) alert('Error: ' + error.message + '\n\nHave you run matrimony-update7.sql?')
    setRows(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const undo = async (r) => {
    if (!window.confirm(`Undo the marriage of ${r.groom_name} and ${r.bride_name}?\n\nBoth profiles become approved again and the couple is removed from the dashboard.`)) return
    const ids = [r.groom_id, r.bride_id].filter(Boolean)
    if (ids.length) await supabase.from('matrimony_profiles').update({ status: 'approved' }).in('user_id', ids)
    const { error } = await supabase.from('matrimony_success').delete().eq('id', r.id)
    if (error) return alert('Error: ' + error.message)
    load()
  }

  if (rows === null) return <div className="mm-empty">Loading...</div>
  return (
    <div>
      <div className="mm-banner ok">💍 {rows.length} completed match{rows.length === 1 ? '' : 'es'}. To add one, use the Match tab and tap "Mark as married".</div>
      {rows.length === 0 && <div className="mm-empty">No completed matches yet.</div>}
      {rows.map(r => (
        <div className="card" key={r.id}>
          <div className="text-bold">{r.groom_name} &amp; {r.bride_name}</div>
          <div className="text-sm">Married {r.married_on}{r.note ? ` - ${r.note}` : ''}</div>
          <button className="btn btn-sm btn-danger" style={{ marginTop: 8, width: 'auto' }} onClick={() => undo(r)}>↩ Undo</button>
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ password change requests
function PasswordRequests() {
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [users, setUsers] = useState({})
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [r, u] = await Promise.all([
      supabase.from('matrimony_password_requests').select('*').eq('status', status).order('created_at', { ascending: false }),
      supabase.rpc('matrimony_admin_users'),
    ])
    if (r.error) alert('Error: ' + r.error.message + '\n\nHave you run matrimony-update3.sql in Supabase?')
    setItems(r.data || [])
    const m = {}; (u.data || []).forEach(x => { m[x.user_id] = x }); setUsers(m)
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  const decide = async (id, next) => {
    const { error } = await supabase.from('matrimony_password_requests')
      .update({ status: next, admin_note: (notes[id] || '').trim() || null }).eq('id', id)
    if (error) return alert('Error: ' + error.message)
    load()
  }

  return (
    <div>
      <div className="mm-subtabs">
        {['pending', 'approved', 'denied', 'used'].map(s => (
          <div key={s} className={`mm-subtab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s}</div>
        ))}
      </div>
      {loading && <div className="mm-empty">Loading...</div>}
      {!loading && items.length === 0 && <div className="mm-empty">No {status} requests.</div>}
      {items.map(r => {
        const u = users[r.user_id]
        return (
          <div className="card" key={r.id}>
            <div className="text-bold">{u?.full_name || u?.email || 'Unknown user'}</div>
            <div className="text-sm">{u?.email}</div>
            <div className="text-sm">Requested {new Date(r.created_at).toLocaleString()}</div>
            {r.status === 'approved' && r.expires_at && <div className="text-sm">Approved - valid until {new Date(r.expires_at).toLocaleString()}</div>}
            {r.status === 'pending' ? (
              <>
                <input className="input" placeholder="Optional note to the user" value={notes[r.id] || ''}
                  onChange={e => setNotes(x => ({ ...x, [r.id]: e.target.value }))} />
                <div className="mm-row" style={{ marginTop: 8 }}>
                  <button className="btn btn-success" onClick={() => decide(r.id, 'approved')}>✅ Approve (24 h)</button>
                  <button className="btn btn-danger" onClick={() => decide(r.id, 'denied')}>✖ Deny</button>
                </div>
              </>
            ) : r.admin_note ? <div className="text-sm">Note: {r.admin_note}</div> : null}
          </div>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------------ access (permissions) editor - main admin only
function AccessModal({ user, onClose }) {
  const [p, setP] = useState({ can_add_user: false, can_add_profile: false, can_review: false, can_messages: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('matrimony_staff').select('*').eq('user_id', user.user_id).maybeSingle()
      .then(({ data }) => { if (data) setP({ can_add_user: data.can_add_user, can_add_profile: data.can_add_profile, can_review: data.can_review, can_messages: data.can_messages }) })
  }, [user.user_id])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('matrimony_staff').upsert({ user_id: user.user_id, ...p, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    onClose()
  }

  return (
    <Portal onEscape={onClose}>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>🔑 Access for</h3>
        <p className="text-sm" style={{ marginBottom: 12 }}>{user.email}</p>
        {PERMS.map(([k, label]) => (
          <label key={k} className="mm-check">
            <input type="checkbox" checked={p[k]} onChange={e => setP(x => ({ ...x, [k]: e.target.checked }))} />
            <span>{label}</span>
          </label>
        ))}
        <p className="text-sm" style={{ margin: '10px 0' }}>Untick everything and save to remove all access.</p>
        <div className="modal-actions">
          <button className="btn mm-btn-light" onClick={onClose}>Cancel</button>
          <button className="btn mm-btn-pink" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
    </Portal>
  )
}

// ------------------------------------------------------------------ set a new password for any user (main admin only)
function SetPasswordModal({ user, onClose }) {
  const [pw, setPw] = useState(genPassword())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const save = async () => {
    if (pw.length < 6) return alert('Password must be at least 6 characters')
    setBusy(true)
    const { msg } = await setUserPassword(user.user_id, pw)
    setBusy(false)
    if (msg) return alert(msg + '\n\n(If it says the function is not deployed or not permitted, redeploy the latest Edge Function.)')
    setDone(true)
  }
  const copy = () => {
    const text = `Login: ${user.email}\nPassword: ${pw}`
    navigator.clipboard?.writeText(text).then(() => alert('Copied'), () => alert(text))
  }

  return (
    <Portal onEscape={onClose}>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>🔐 Set password</h3>
        <p className="text-sm" style={{ margin: '4px 0 12px' }}>{user.email}</p>
        {done ? (
          <>
            <div className="mm-banner ok">✅ Password updated. Share it with the user:<br /><b>{user.email}</b><br />Password: <b>{pw}</b></div>
            <div className="modal-actions">
              <button className="btn mm-btn-light" onClick={copy}>📋 Copy</button>
              <button className="btn mm-btn-pink" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <div className="input-group"><label>New password</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={pw} onChange={e => setPw(e.target.value)} />
                <button type="button" className="btn btn-sm mm-btn-light" style={{ width: 'auto' }} onClick={() => setPw(genPassword())}>🎲</button>
              </div>
            </div>
            <p className="text-sm" style={{ marginBottom: 10 }}>The user's old password stops working immediately.</p>
            <div className="modal-actions">
              <button className="btn mm-btn-light" onClick={onClose}>Cancel</button>
              <button className="btn mm-btn-pink" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Set password'}</button>
            </div>
          </>
        )}
      </div>
    </div>
    </Portal>
  )
}

// ------------------------------------------------------------------ all registered accounts
function Users({ perms, isAdmin, onEditProfile, refreshKey }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [access, setAccess] = useState(null)
  const [pwUser, setPwUser] = useState(null)
  const [kundliFor, setKundliFor] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('matrimony_admin_users')
    if (error) alert('Error: ' + error.message + '\n\nHave you run matrimony-update2.sql in Supabase?')
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const setProfileStatus = async (id, next) => {
    const { error } = await supabase.from('matrimony_profiles').update({ status: next }).eq('user_id', id)
    if (error) return alert('Error: ' + error.message)
    load()
  }

  const deleteProfile = async (r) => {
    if (!window.confirm(`Delete the profile of ${r.full_name || r.email}?\n\nThe login stays, but the profile, phone number and photo are removed. This cannot be undone.`)) return
    const { data: p } = await supabase.from('matrimony_profiles').select('photo_path,status').eq('user_id', r.user_id).maybeSingle()
    const a = await supabase.from('matrimony_profiles').delete().eq('user_id', r.user_id)
    if (a.error) return alert('Error: ' + a.error.message)
    await supabase.from('matrimony_contacts').delete().eq('user_id', r.user_id)
    // a married profile's photo stays: it is still shown on the dashboard
    if (p?.photo_path && p.status !== 'married') supabase.storage.from(BUCKET).remove([p.photo_path])
    load()
  }
  const removeLogin = async (r) => {
    if (!window.confirm(`DELETE THE LOGIN of ${r.email}?\n\nThis removes the account and ALL its data (profile, interests, messages, and any data in your other services such as Traveling). This cannot be undone.`)) return
    const { msg } = await deleteLogin(r.user_id)
    if (msg) return alert(msg + '\n\n(If it says the function is not deployed or not permitted, redeploy the latest Edge Function.)')
    load()
  }

  const openKundli = async (r) => {
    const { data, error } = await supabase.from('matrimony_profiles')
      .select('full_name,gender,dob,birth_time,birth_place,birth_utc_offset,city').eq('user_id', r.user_id).maybeSingle()
    if (error || !data) return alert('Could not load the profile')
    if (!data.birth_time) return alert('This profile has no birth time yet. Add it with Edit profile, then open the kundli.')
    setKundliFor(birthFromProfile(data))
  }

  const term = q.trim().toLowerCase()
  const shown = rows.filter(r => !term || (r.email || '').toLowerCase().includes(term) || (r.full_name || '').toLowerCase().includes(term))
  const noProfile = rows.filter(r => !r.profile_status).length

  return (
    <div>
      <div className="mm-banner ok">👥 {rows.length} registered accounts{noProfile ? ` · ${noProfile} without a profile yet` : ''}</div>
      <input className="input" placeholder="Search by email or name" value={q} onChange={e => setQ(e.target.value)} />
      {loading && <div className="mm-empty">Loading...</div>}
      {shown.map(r => {
        const st = r.profile_status
        return (
          <div className="card" key={r.user_id}>
            <div className="text-bold">{r.full_name || '(no profile yet)'}</div>
            <div className="text-sm">{r.email}</div>
            <div className="text-sm">Registered {new Date(r.created_at).toLocaleDateString()}{r.last_sign_in_at ? ` · last login ${new Date(r.last_sign_in_at).toLocaleDateString()}` : ' · never logged in'}</div>
            <div style={{ margin: '6px 0' }}>
              <span className={`badge badge-${st === 'approved' || st === 'married' ? 'accepted' : st === 'rejected' ? 'rejected' : 'pending'}`}>{st || 'no profile'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {perms.add_profile && <button className="btn btn-sm mm-btn-light" onClick={() => onEditProfile(r.user_id, r.email)}>{st ? '✏️ Edit profile' : '📝 Add profile'}</button>}
              {perms.review && st && st !== 'approved' && <button className="btn btn-sm btn-success" onClick={() => setProfileStatus(r.user_id, 'approved')}>Approve</button>}
              {perms.review && st && st !== 'rejected' && <button className="btn btn-sm btn-danger" onClick={() => setProfileStatus(r.user_id, 'rejected')}>Reject</button>}
              {perms.review && st && st !== 'pending' && <button className="btn btn-sm mm-btn-light" onClick={() => setProfileStatus(r.user_id, 'pending')}>⏳ Set pending</button>}
              {st && <button className="btn btn-sm mm-btn-light" onClick={() => openKundli(r)}>📜 Kundli</button>}
              {isAdmin && <button className="btn btn-sm mm-btn-light" onClick={() => setAccess(r)}>🔑 Access</button>}
              {isAdmin && <button className="btn btn-sm mm-btn-light" onClick={() => setPwUser(r)}>🔐 Set password</button>}
              {isAdmin && st && <button className="btn btn-sm btn-danger" onClick={() => deleteProfile(r)}>🗑 Delete profile</button>}
              {isAdmin && (r.email || '').toLowerCase() !== adminEmail.toLowerCase() && <button className="btn btn-sm btn-danger" onClick={() => removeLogin(r)}>⛔ Delete login</button>}
            </div>
          </div>
        )
      })}
      {access && <AccessModal user={access} onClose={() => setAccess(null)} />}
      {pwUser && <SetPasswordModal user={pwUser} onClose={() => setPwUser(null)} />}
      {kundliFor && <KundliView birth={kundliFor} onClose={() => setKundliFor(null)} />}
    </div>
  )
}

// ------------------------------------------------------------------ create a login  username@goodfriendservice.app
const genPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const a = new Uint32Array(8)
  crypto.getRandomValues(a)
  return Array.from(a, n => chars[n % chars.length]).join('')
}

function AddUser({ onCreated, onLoginCreated }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState(genPassword())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const create = async (e) => {
    e.preventDefault()
    const u = username.trim().toLowerCase()
    if (!/^[a-z0-9._-]{3,30}$/.test(u)) return alert('Username: 3-30 letters, numbers, . _ -')
    if (password.length < 6) return alert('Password must be at least 6 characters')
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('matrimony-admin-create-user', { body: { username: u, password } })
      let msg = data?.error
      if (error) {
        msg = error.message
        try { const j = await error.context.json(); msg = j.error || msg } catch { /* ignore */ }
        if (/Failed to send|not found|404/i.test(msg)) msg = 'The "matrimony-admin-create-user" Edge Function is not deployed yet. Deploy it once in the Supabase dashboard (see the instructions).'
      }
      if (msg) return alert(msg)
      setDone({ email: data.email, password, user_id: data.user_id })
      onLoginCreated?.()
      setUsername(''); setPassword(genPassword())
    } finally { setBusy(false) }
  }

  const copy = () => {
    const text = `Login: ${done.email}\nPassword: ${done.password}`
    navigator.clipboard?.writeText(text).then(() => alert('Copied'), () => alert(text))
  }

  return (
    <div>
      <form className="card" onSubmit={create}>
        <h3 style={{ marginBottom: 6 }}>1️⃣ Create a login</h3>
        <p className="text-sm" style={{ marginBottom: 10 }}>Only the login is created here. Adding a profile is a separate, optional step.</p>
        <div className="input-group">
          <label>Username</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" autoCapitalize="none" value={username} onChange={e => setUsername(e.target.value)} />
            <button type="button" className="btn btn-sm mm-btn-light" style={{ width: 'auto' }} onClick={() => setUsername(genUsername())}>🎲</button>
          </div>
          <div className="text-sm" style={{ marginTop: 4 }}>Login will be: <b>{(username.trim().toLowerCase() || 'username')}@{DOMAIN}</b></div>
        </div>
        <div className="input-group">
          <label>Password</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="btn btn-sm mm-btn-light" style={{ width: 'auto' }} onClick={() => setPassword(genPassword())}>🎲</button>
          </div>
        </div>
        <button className="btn mm-btn-pink" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create login'}</button>
      </form>

      {done && (
        <div className="mm-banner ok">
          ✅ Login created. Share these details with the user (the password is not shown again):<br />
          <b>{done.email}</b><br />Password: <b>{done.password}</b>
          <div className="mm-row" style={{ marginTop: 10 }}>
            <button className="btn btn-sm mm-btn-light" onClick={copy}>📋 Copy</button>
            <button className="btn btn-sm mm-btn-pink" onClick={() => onCreated(done.user_id, done.email)}>📝 Add profile now (optional)</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ add / edit a profile for someone else
function ProfileEditor({ userId, email, onDone }) {
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    supabase.from('matrimony_profiles').select('*').eq('user_id', userId).maybeSingle()
      .then(({ data }) => setProfile(data || null))
  }, [userId])

  if (profile === undefined) return <div className="mm-empty">Loading...</div>
  return (
    <div>
      <button className="btn mm-btn-light" style={{ marginTop: 0 }} onClick={() => onDone(false)}>← Back to list</button>
      <div className="mm-banner warn" style={{ marginTop: 10 }}>{profile ? 'Editing' : 'Adding'} the profile for <b>{email}</b>. New profiles added here are approved immediately.</div>
      <MyProfile userId={userId} me={profile} adminMode onSaved={() => onDone(true)} />
    </div>
  )
}

// ------------------------------------------------------------------ panel
export default function AdminPanel({ perms }) {
  const modes = []
  if (perms.messages) modes.push(['messages', 'Messages'])
  if (perms.review) modes.push(['profiles', 'Review'])
  modes.push(['users', 'Users'])
  if (perms.review || perms.add_profile) modes.push(['match', 'Match'])
  if (perms.review || perms.add_profile) modes.push(['kundli', 'Kundli'])
  if (perms.review) modes.push(['married', 'Married'])
  if (perms.add_user || perms.add_profile) modes.push(['adduser', 'Add'])
  if (perms.add_user) modes.push(['passwords', 'Passwords'])

  const [mode, setMode] = useState(modes[0][0])
  const [editing, setEditing] = useState(null) // { userId, email }
  const [refreshKey, setRefreshKey] = useState(0)
  const [loginKey, setLoginKey] = useState(0)

  if (editing) {
    return <ProfileEditor userId={editing.userId} email={editing.email}
      onDone={(saved) => { setEditing(null); setMode(editing.back || 'users'); if (saved) setRefreshKey(k => k + 1) }} />
  }

  return (
    <div>
      <div className="mm-subtabs">
        {modes.map(([k, label]) => (
          <div key={k} className={`mm-subtab ${mode === k ? 'active' : ''}`} onClick={() => setMode(k)}>{label}</div>
        ))}
      </div>
      {mode === 'messages' && <AdminInbox Requests={Requests} />}
      {mode === 'profiles' && <Profiles />}
      {mode === 'users' && <Users perms={perms} isAdmin={perms.isAdmin} refreshKey={refreshKey}
        onEditProfile={(userId, email) => setEditing({ userId, email })} />}
      {mode === 'passwords' && <PasswordRequests />}
      {mode === 'match' && <AdminMatch canMark={perms.review} />}
      {mode === 'kundli' && <AdminKundli perms={perms} onEdit={(userId, label) => setEditing({ userId, email: label, back: 'kundli' })} />}
      {mode === 'married' && <Married />}
      {mode === 'adduser' && (
        <>
          {perms.add_user && <AddUser onCreated={(userId, email) => setEditing({ userId, email })} onLoginCreated={() => setLoginKey(k => k + 1)} />}
          {perms.add_profile && <QuickAddProfile refreshKey={loginKey} />}
        </>
      )}
    </div>
  )
}
