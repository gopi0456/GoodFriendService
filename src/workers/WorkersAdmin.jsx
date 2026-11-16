import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import WorkerForm from './WorkerForm'
import { WorkerAvatar } from './WorkerCard'
import { BUCKET, hueVars } from './workerApi'
import ProfileHistory from '../engage/ProfileHistory'

const EMOJIS = ['🚰', '🔧', '🪚', '⚡', '🎨', '🧱', '🔲', '🔥', '❄️', '🚗', '🌿', '🧹', '🧵', '🏗️', '🛠️', '🔌', '🪟', '🛵', '📦', '👨‍🍳', '💎', '💍', '📿', '👑', '⌚', '💈', '💅', '✂️', '📱', '💻', '📺', '🧺', '💧', '🐜', '🛋️', '🚚', '⛏️', '📹', '☀️', '☔', '🪨', '📚', '🩺', '💂', '🚿', '🛞', '🪛', '🔩', '⚙️', '🪣', '🧰', '🖌️', '📐', '🏠', '🛏️', '🚪', '🔑', '🪴', '🥖', '🐄', '🌾', '🚜', '🎸', '📷', '🎬', '🖨️', '🧴', '🧼']

// ------------------------------------------------------------------ all workers
function WorkerList({ onCount }) {
  const [types, setTypes] = useState([])
  const [workers, setWorkers] = useState(null)
  const [phones, setPhones] = useState({})
  const [status, setStatus] = useState('all')
  const [typeId, setTypeId] = useState('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [history, setHistory] = useState(null)

  const load = useCallback(async () => {
    const [t, w, c] = await Promise.all([
      supabase.from('worker_types').select('*').order('sort_order').order('name'),
      supabase.from('workers').select('*').order('created_at', { ascending: false }).range(0, 999),
      supabase.from('worker_contacts').select('worker_id,phone').range(0, 999),
    ])
    if (w.error) alert('Error: ' + w.error.message + '\n\nHave you run workers.sql in Supabase?')
    setTypes(t.data || [])
    setWorkers(w.data || [])
    const m = {}; (c.data || []).forEach(x => { m[x.worker_id] = x.phone }); setPhones(m)
    onCount && onCount((w.data || []).filter(x => x.status === 'pending').length)
  }, [onCount])
  useEffect(() => { load() }, [load])

  const setSt = async (w, next) => {
    const { error } = await supabase.from('workers').update({ status: next }).eq('id', w.id)
    if (error) return alert('Error: ' + error.message)
    load()
  }
  const toggleHide = async (w) => {
    const { error } = await supabase.from('workers').update({ hide_phone: !w.hide_phone }).eq('id', w.id)
    if (error) return alert('Error: ' + error.message + '\n\nHave you run workers-update1.sql in Supabase?')
    load()
  }
  const remove = async (w) => {
    if (!window.confirm(`Delete ${w.name}?\n\nThe listing, phone number and photo are removed. This cannot be undone.`)) return
    const { error } = await supabase.from('workers').delete().eq('id', w.id)
    if (error) return alert('Error: ' + error.message)
    if (w.photo_path) supabase.storage.from(BUCKET).remove([w.photo_path])
    load()
  }

  if (editing) {
    return (
      <div className="wk-pad">
        <h3 className="wk-h">Edit {editing.name}</h3>
        <WorkerForm adminMode types={types} worker={editing} phone={phones[editing.id]}
          onSaved={() => { setEditing(null); load() }} onCancel={() => setEditing(null)} />
      </div>
    )
  }
  if (workers === null) return <div className="wk-skel" />

  const typeById = Object.fromEntries(types.map(t => [t.id, t]))
  const count = (s) => (s === 'all' ? workers.length : workers.filter(w => w.status === s).length)
  const term = q.trim().toLowerCase()
  const shown = workers.filter(w =>
    (status === 'all' || w.status === status) && (typeId === 'all' || w.work_type_id === typeId) &&
    (!term || `${w.name} ${w.address || ''} ${phones[w.id] || ''}`.toLowerCase().includes(term)))

  return (
    <div>
      <div className="wk-seg">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s[0].toUpperCase() + s.slice(1)} <small>{count(s)}</small></button>
        ))}
      </div>
      <div className="wk-pad wk-filters">
        <input className="wk-input" placeholder="Search name, phone or area" value={q} onChange={e => setQ(e.target.value)} />
        <select className="wk-input" value={typeId} onChange={e => setTypeId(e.target.value)}>
          <option value="all">All work types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
        </select>
      </div>

      {shown.map(w => {
        const t = typeById[w.work_type_id]
        return (
          <div className="wk-card wk-admin-card" key={w.id} style={hueVars(t?.name || w.name)}>
            <WorkerAvatar worker={w} type={t} />
            <div className="wk-card-body">
              <div className="wk-name">{w.name}</div>
              <div className="wk-row">
                <span className="wk-pill">{t?.icon} {t?.name}</span>
                <span className={`wk-st wk-st-${w.status}`}>{w.status}</span>
              </div>
              <div className="wk-meta">📞 {phones[w.id] || 'no number'}{w.hide_phone ? ' · 🙈 hidden from users' : ''}{w.owner_id ? ' · self-registered' : ''}</div>
              {w.address && <div className="wk-meta">📍 {w.address}</div>}
              <div className="wk-admin-actions">
                {w.status !== 'approved' && <button className="wk-small ok" onClick={() => setSt(w, 'approved')}>Approve</button>}
                {w.status !== 'rejected' && <button className="wk-small bad" onClick={() => setSt(w, 'rejected')}>Reject</button>}
                {w.status !== 'pending' && <button className="wk-small" onClick={() => setSt(w, 'pending')}>⏳ Pending</button>}
                <button className="wk-small" onClick={() => toggleHide(w)}>{w.hide_phone ? '👁 Show phone' : '🙈 Hide phone'}</button>
                <button className="wk-small" onClick={() => setHistory(w)}>🕘 History</button>
                <button className="wk-small" onClick={() => setEditing(w)}>✏️ Edit</button>
                <button className="wk-small bad" onClick={() => remove(w)}>🗑 Delete</button>
              </div>
            </div>
          </div>
        )
      })}
      {shown.length === 0 && <div className="wk-empty"><div className="wk-empty-ico">🗂️</div><div className="wk-empty-t">Nothing here</div></div>}
      {history && <ProfileHistory kind="worker" id={history.id} name={history.name} ownerId={history.owner_id} onClose={() => setHistory(null)} />}
    </div>
  )
}

// ------------------------------------------------------------------ add a worker
function AddWorker() {
  const [types, setTypes] = useState([])
  const [key, setKey] = useState(0)
  const [added, setAdded] = useState(0)
  useEffect(() => { supabase.from('worker_types').select('*').eq('active', true).order('sort_order').order('name').then(({ data }) => setTypes(data || [])) }, [])
  return (
    <div className="wk-pad">
      {added > 0 && <div className="wk-note ok">✅ {added} worker{added > 1 ? 's' : ''} added. The form is ready for the next one.</div>}
      <WorkerForm key={key} adminMode types={types} onSaved={() => { setAdded(n => n + 1); setKey(k => k + 1) }} />
    </div>
  )
}

// ------------------------------------------------------------------ work type menu
function TypeRow({ t, onDone }) {
  const [icon, setIcon] = useState(t.icon)
  const [name, setName] = useState(t.name)
  const [active, setActive] = useState(t.active)
  const dirty = icon !== t.icon || name !== t.name || active !== t.active

  const save = async () => {
    if (name.trim().length < 2) return alert('Enter a name')
    const { error } = await supabase.from('worker_types').update({ icon: icon.trim() || '🛠️', name: name.trim(), active }).eq('id', t.id)
    if (error) return alert(error.code === '23505' ? 'That work type already exists' : 'Error: ' + error.message)
    onDone()
  }
  const del = async () => {
    if (!window.confirm(`Delete the work type "${t.name}"?`)) return
    const { error } = await supabase.from('worker_types').delete().eq('id', t.id)
    if (error) return alert(error.code === '23503' ? 'Workers still use this type. Switch it off instead, or move those workers to another type first.' : 'Error: ' + error.message)
    onDone()
  }
  return (
    <div className={`wk-type ${active ? '' : 'off'}`}>
      <input className="wk-input wk-emoji" value={icon} maxLength={4} onChange={e => setIcon(e.target.value)} />
      <input className="wk-input" value={name} onChange={e => setName(e.target.value)} />
      <label className="wk-check"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> On</label>
      <div className="wk-type-actions">
        <button className="wk-small ok" disabled={!dirty} onClick={save}>Save</button>
        <button className="wk-small bad" onClick={del}>🗑</button>
      </div>
    </div>
  )
}

function TypesAdmin() {
  const [types, setTypes] = useState(null)
  const [icon, setIcon] = useState('🛠️')
  const [name, setName] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.from('worker_types').select('*').order('sort_order').order('name')
    setTypes(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const add = async (e) => {
    e.preventDefault()
    if (name.trim().length < 2) return alert('Enter the work type name')
    const next = ((types || []).reduce((m, t) => Math.max(m, t.sort_order), 0)) + 10
    const { error } = await supabase.from('worker_types').insert({ name: name.trim(), icon: icon.trim() || '🛠️', sort_order: next })
    if (error) return alert(error.code === '23505' ? 'That work type already exists' : 'Error: ' + error.message)
    setName(''); load()
  }

  if (types === null) return <div className="wk-skel" />
  return (
    <div className="wk-pad">
      <form className="wk-admin-box" onSubmit={add}>
        <h3 className="wk-h">Add a work type</h3>
        <div className="wk-add-row">
          <input className="wk-input wk-emoji" value={icon} maxLength={4} onChange={e => setIcon(e.target.value)} aria-label="Icon" />
          <input className="wk-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Glass Fitter" />
        </div>
        <div className="wk-emoji-pick">{EMOJIS.map(x => <button type="button" key={x} onClick={() => setIcon(x)}>{x}</button>)}</div>
        <button className="wk-primary" type="submit">➕ Add work type</button>
      </form>
      <h3 className="wk-h" style={{ marginTop: 18 }}>Work types ({types.length})</h3>
      {types.map(t => <TypeRow key={t.id + t.name + t.icon + t.active} t={t} onDone={load} />)}
    </div>
  )
}

// ------------------------------------------------------------------ show / hide all contacts
function ContactsAdmin() {
  const [on, setOn] = useState(null)
  const [stats, setStats] = useState({ approved: 0 })
  useEffect(() => {
    supabase.from('worker_settings').select('show_contacts').eq('id', 1).maybeSingle().then(({ data }) => setOn(data ? data.show_contacts : true))
    supabase.from('workers').select('id', { count: 'exact', head: true }).eq('status', 'approved').then(({ count }) => setStats({ approved: count || 0 }))
  }, [])

  const set = async (v) => {
    const { error } = await supabase.from('worker_settings').update({ show_contacts: v, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) return alert('Error: ' + error.message)
    setOn(v)
  }
  if (on === null) return <div className="wk-skel" />
  return (
    <div className="wk-pad">
      <div className={`wk-admin-box wk-contacts ${on ? 'on' : 'off'}`}>
        <div className="wk-contacts-ico">{on ? '👁️' : '🙈'}</div>
        <h3 className="wk-h">{on ? 'Contacts are visible' : 'Contacts are hidden'}</h3>
        <p>{on ? `Users can see the phone numbers of the ${stats.approved} approved workers.` : 'No user can see any worker number right now.'}</p>
        <div className="wk-seg wk-seg-big">
          <button className={on ? 'on' : ''} onClick={() => set(true)}>👁 Display all</button>
          <button className={!on ? 'on off' : ''} onClick={() => set(false)}>🙈 Hide all</button>
        </div>
        <div className="wk-hint">This one switch controls every worker at once. Numbers of workers who are not approved stay hidden either way.</div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ admin shell
export default function WorkersAdmin() {
  const [tab, setTab] = useState('workers')
  const [pending, setPending] = useState(0)
  const tabs = [['workers', `Workers${pending ? ` (${pending})` : ''}`], ['add', 'Add'], ['types', 'Work types'], ['contacts', 'Contacts']]
  return (
    <div>
      <div className="wk-subtabs">
        {tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'workers' && <WorkerList onCount={setPending} />}
      {tab === 'add' && <AddWorker />}
      {tab === 'types' && <TypesAdmin />}
      {tab === 'contacts' && <ContactsAdmin />}
    </div>
  )
}
