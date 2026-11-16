import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import EventForm from './EventForm'
import { groupPhotos, hueVars, photoUrl, removeFiles } from './eventApi'
import ProfileHistory from '../engage/ProfileHistory'

const EMOJIS = ['🏛️', '🍽️', '💍', '🎂', '💐', '📸', '🎧', '💄', '🌿', '⛺', '🍰', '🪔', '🎤', '🥁', '💡', '💌', '🎁', '🚗', '👗', '🎪', '🎉', '🪩', '🎈', '🛎️', '🍬', '🍦', '🅿️', '🎆', '🕉️', '🥻', '💎', '🐎', '🎻', '💃', '🪄', '🍴', '🥤', '🛡️', '🔌', '❄️', '🎥', '🚁', '📺', '✨', '📷', '🎶', '🎹', '🎷', '🪭', '🥂', '🍾', '🍷', '🌸', '🌺', '🪷', '🦚', '🐘', '🏰', '⛲', '🛕', '⛪', '🕌', '🎠', '🎡', '🧁', '🍩', '🥗', '🍛', '🍜', '🥘', '🫓', '☕', '🎭', '🎬']

// ------------------------------------------------------------------ all profiles
function ProfileList({ onCount }) {
  const [cats, setCats] = useState([])
  const [list, setList] = useState(null)
  const [phones, setPhones] = useState({})
  const [photos, setPhotos] = useState({})
  const [status, setStatus] = useState('all')
  const [catId, setCatId] = useState('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [history, setHistory] = useState(null)

  const load = useCallback(async () => {
    const [c, p, ct, ph] = await Promise.all([
      supabase.from('event_categories').select('*').order('sort_order').order('name'),
      supabase.from('event_profiles').select('*').order('created_at', { ascending: false }).range(0, 999),
      supabase.from('event_contacts').select('event_id,phone').range(0, 999),
      supabase.from('event_photos').select('*').order('sort_order').range(0, 1999),
    ])
    if (p.error) alert('Error: ' + p.error.message + '\n\nHave you run events.sql in Supabase?')
    setCats(c.data || []); setList(p.data || [])
    const m = {}; (ct.data || []).forEach(x => { m[x.event_id] = x.phone }); setPhones(m)
    setPhotos(groupPhotos(ph.data))
    onCount && onCount((p.data || []).filter(x => x.status === 'pending').length)
  }, [onCount])
  useEffect(() => { load() }, [load])

  const patch = async (ev, fields) => {
    const { error } = await supabase.from('event_profiles').update(fields).eq('id', ev.id)
    if (error) return alert('Error: ' + error.message)
    load()
  }
  const remove = async (ev) => {
    if (!window.confirm(`Delete ${ev.name}?\n\nThe profile, phone number and all its gallery photos are removed. This cannot be undone.`)) return
    const paths = (photos[ev.id] || []).map(p => p.photo_path)
    const { error } = await supabase.from('event_profiles').delete().eq('id', ev.id)
    if (error) return alert('Error: ' + error.message)
    removeFiles(paths)
    load()
  }

  if (editing) {
    return (
      <div className="ev-pad">
        <h3 className="ev-h2">Edit {editing.name}</h3>
        <EventForm adminMode cats={cats} ev={editing} phone={phones[editing.id]} photos={photos[editing.id] || []}
          onSaved={() => { setEditing(null); load() }} onCancel={() => setEditing(null)} />
      </div>
    )
  }
  if (list === null) return <div className="ev-skel" />

  const catById = Object.fromEntries(cats.map(c => [c.id, c]))
  const count = (s) => (s === 'all' ? list.length : list.filter(x => x.status === s).length)
  const term = q.trim().toLowerCase()
  const shown = list.filter(e => (status === 'all' || e.status === status) && (catId === 'all' || e.category_id === catId) &&
    (!term || `${e.name} ${e.area || ''} ${phones[e.id] || ''}`.toLowerCase().includes(term)))

  return (
    <div>
      <div className="ev-seg">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s[0].toUpperCase() + s.slice(1)} <small>{count(s)}</small></button>
        ))}
      </div>
      <div className="ev-pad ev-filters">
        <input className="ev-input" placeholder="Search name, phone or area" value={q} onChange={e => setQ(e.target.value)} />
        <select className="ev-input" value={catId} onChange={e => setCatId(e.target.value)}>
          <option value="all">All categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {shown.map(e => {
        const c = catById[e.category_id]
        const cover = (photos[e.id] || [])[0]
        return (
          <div className="ev-card ev-admin-card" key={e.id} style={hueVars(c?.name || e.name)}>
            <div className="ev-admin-thumb">{cover ? <img src={photoUrl(cover.photo_path)} alt="" /> : <span>{c?.icon || '🎉'}</span>}</div>
            <div className="ev-body">
              <div className="ev-name">{e.name}</div>
              <div className="ev-row">
                <span className="ev-pill">{c?.icon} {c?.name}</span>
                <span className={`ev-st ev-st-${e.status}`}>{e.status}</span>
                {e.verified && <span className="ev-tag-ok">✔</span>}
                {e.featured && <span className="ev-tag-ok">⭐</span>}
              </div>
              <div className="ev-meta">📞 {phones[e.id] || 'no number'}{e.hide_phone ? ' · 🙈 hidden' : ''} · 📷 {(photos[e.id] || []).length}{e.owner_id ? ' · self-registered' : ''}</div>
              {e.area && <div className="ev-meta">📍 {e.area}</div>}
              <div className="ev-admin-actions">
                {e.status !== 'approved' && <button className="ev-small ok" onClick={() => patch(e, { status: 'approved' })}>Approve</button>}
                {e.status !== 'rejected' && <button className="ev-small bad" onClick={() => patch(e, { status: 'rejected' })}>Reject</button>}
                {e.status !== 'pending' && <button className="ev-small" onClick={() => patch(e, { status: 'pending' })}>⏳ Pending</button>}
                <button className="ev-small" onClick={() => patch(e, { verified: !e.verified })}>{e.verified ? '✔ Unverify' : '✔ Verify'}</button>
                <button className="ev-small" onClick={() => patch(e, { featured: !e.featured })}>{e.featured ? '⭐ Unfeature' : '⭐ Feature'}</button>
                <button className="ev-small" onClick={() => patch(e, { hide_phone: !e.hide_phone })}>{e.hide_phone ? '👁 Show phone' : '🙈 Hide phone'}</button>
                <button className="ev-small" onClick={() => setHistory(e)}>🕘 History</button>
                <button className="ev-small" onClick={() => setEditing(e)}>✏️ Edit</button>
                <button className="ev-small bad" onClick={() => remove(e)}>🗑 Delete</button>
              </div>
            </div>
          </div>
        )
      })}
      {shown.length === 0 && <div className="ev-empty"><div className="ev-empty-ico">🗂️</div><div className="ev-empty-t">Nothing here</div></div>}
      {history && <ProfileHistory kind="event" id={history.id} name={history.name} ownerId={history.owner_id} onClose={() => setHistory(null)} />}
    </div>
  )
}

// ------------------------------------------------------------------ add a profile
function AddProfile() {
  const [cats, setCats] = useState([])
  const [key, setKey] = useState(0)
  const [added, setAdded] = useState(0)
  useEffect(() => { supabase.from('event_categories').select('*').eq('active', true).order('sort_order').order('name').then(({ data }) => setCats(data || [])) }, [])
  return (
    <div className="ev-pad">
      {added > 0 && <div className="ev-note ok">✅ {added} profile{added > 1 ? 's' : ''} added. The form is ready for the next one.</div>}
      <EventForm key={key} adminMode cats={cats} onSaved={() => { setAdded(n => n + 1); setKey(k => k + 1) }} />
    </div>
  )
}

// ------------------------------------------------------------------ category menu
function CategoryRow({ c, onDone }) {
  const [icon, setIcon] = useState(c.icon)
  const [name, setName] = useState(c.name)
  const [active, setActive] = useState(c.active)
  const dirty = icon !== c.icon || name !== c.name || active !== c.active
  const save = async () => {
    if (name.trim().length < 2) return alert('Enter a name')
    const { error } = await supabase.from('event_categories').update({ icon: icon.trim() || '🎉', name: name.trim(), active }).eq('id', c.id)
    if (error) return alert(error.code === '23505' ? 'That category already exists' : 'Error: ' + error.message)
    onDone()
  }
  const del = async () => {
    if (!window.confirm(`Delete the category "${c.name}"?`)) return
    const { error } = await supabase.from('event_categories').delete().eq('id', c.id)
    if (error) return alert(error.code === '23503' ? 'Profiles still use this category. Switch it off instead, or move those profiles to another category first.' : 'Error: ' + error.message)
    onDone()
  }
  return (
    <div className={`ev-cat ${active ? '' : 'off'}`}>
      <input className="ev-input ev-emoji" value={icon} maxLength={4} onChange={e => setIcon(e.target.value)} />
      <input className="ev-input" value={name} onChange={e => setName(e.target.value)} />
      <label className="ev-check"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> On</label>
      <div className="ev-cat-actions">
        <button className="ev-small ok" disabled={!dirty} onClick={save}>Save</button>
        <button className="ev-small bad" onClick={del}>🗑</button>
      </div>
    </div>
  )
}

function CategoriesAdmin() {
  const [cats, setCats] = useState(null)
  const [icon, setIcon] = useState('🎉')
  const [name, setName] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.from('event_categories').select('*').order('sort_order').order('name')
    setCats(data || [])
  }, [])
  useEffect(() => { load() }, [load])
  const add = async (e) => {
    e.preventDefault()
    if (name.trim().length < 2) return alert('Enter the category name')
    const next = ((cats || []).reduce((m, c) => Math.max(m, c.sort_order), 0)) + 10
    const { error } = await supabase.from('event_categories').insert({ name: name.trim(), icon: icon.trim() || '🎉', sort_order: next })
    if (error) return alert(error.code === '23505' ? 'That category already exists' : 'Error: ' + error.message)
    setName(''); load()
  }
  if (cats === null) return <div className="ev-skel" />
  return (
    <div className="ev-pad">
      <form className="ev-admin-box" onSubmit={add}>
        <h3 className="ev-h2">Add a category</h3>
        <div className="ev-add-row">
          <input className="ev-input ev-emoji" value={icon} maxLength={4} onChange={e => setIcon(e.target.value)} aria-label="Icon" />
          <input className="ev-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Valet Parking" />
        </div>
        <div className="ev-emoji-pick">{EMOJIS.map(x => <button type="button" key={x} onClick={() => setIcon(x)}>{x}</button>)}</div>
        <button className="ev-primary" type="submit">➕ Add category</button>
      </form>
      <h3 className="ev-h2" style={{ marginTop: 18 }}>Categories ({cats.length})</h3>
      {cats.map(c => <CategoryRow key={c.id + c.name + c.icon + c.active} c={c} onDone={load} />)}
    </div>
  )
}

// ------------------------------------------------------------------ show / hide all contacts
function ContactsAdmin() {
  const [on, setOn] = useState(null)
  const [stats, setStats] = useState({ approved: 0 })
  useEffect(() => {
    supabase.from('event_settings').select('show_contacts').eq('id', 1).maybeSingle().then(({ data }) => setOn(data ? data.show_contacts : true))
    supabase.from('event_profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved').then(({ count }) => setStats({ approved: count || 0 }))
  }, [])
  const set = async (v) => {
    const { error } = await supabase.from('event_settings').update({ show_contacts: v, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) return alert('Error: ' + error.message)
    setOn(v)
  }
  if (on === null) return <div className="ev-skel" />
  return (
    <div className="ev-pad">
      <div className={`ev-admin-box ev-contacts ${on ? 'on' : 'off'}`}>
        <div className="ev-contacts-ico">{on ? '👁️' : '🙈'}</div>
        <h3 className="ev-h2">{on ? 'Contacts are visible' : 'Contacts are hidden'}</h3>
        <p>{on ? `Users can see the phone numbers of the ${stats.approved} approved profiles.` : 'No user can see any phone number right now.'}</p>
        <div className="ev-seg ev-seg-big">
          <button className={on ? 'on' : ''} onClick={() => set(true)}>👁 Display all</button>
          <button className={!on ? 'on off' : ''} onClick={() => set(false)}>🙈 Hide all</button>
        </div>
        <div className="ev-hint">One switch for every profile. You can also hide a single profile's number from its row in the list. Numbers of profiles that are not approved stay hidden either way.</div>
      </div>
    </div>
  )
}

export default function EventsAdmin() {
  const [tab, setTab] = useState('profiles')
  const [pending, setPending] = useState(0)
  const tabs = [['profiles', `Profiles${pending ? ` (${pending})` : ''}`], ['add', 'Add'], ['cats', 'Categories'], ['contacts', 'Contacts']]
  return (
    <div>
      <div className="ev-subtabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'profiles' && <ProfileList onCount={setPending} />}
      {tab === 'add' && <AddProfile />}
      {tab === 'cats' && <CategoriesAdmin />}
      {tab === 'contacts' && <ContactsAdmin />}
    </div>
  )
}
