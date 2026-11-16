import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import WorkerCard, { WorkerAvatar } from './WorkerCard'
import { hueVars } from './workerApi'
import ContactButtons from '../engage/ContactButtons'
import ChatRequestButton from '../engage/ChatRequestButton'
import Portal from '../matrimony/Portal'

function Sheet({ worker, type, phone, locked, onClose }) {
  return (
    <Portal onEscape={onClose}>
    <div className="wk wk-sheet-root">
    <div className="wk-sheet-overlay" onClick={onClose}>
      <div className="wk-sheet" style={hueVars(type?.name || worker.name)} onClick={e => e.stopPropagation()}>
        <div className="wk-sheet-grab" />
        <div className="wk-sheet-head">
          <WorkerAvatar worker={worker} type={type} size={84} />
          <div>
            <div className="wk-name" style={{ fontSize: 20 }}>{worker.name}</div>
            <span className="wk-pill">{type?.icon} {type?.name}</span>
          </div>
        </div>
        <div className="wk-facts">
          {worker.address && <div><span>📍 Address</span><b>{worker.address}</b></div>}
          {worker.experience_years != null && <div><span>⏱ Experience</span><b>{worker.experience_years} years</b></div>}
          {phone && !locked && <div><span>📞 Phone</span><b>{phone}</b></div>}
        </div>
        {worker.about && <p className="wk-about">{worker.about}</p>}
        <div className="wk-actions">
          <ContactButtons prefix="wk" kind="worker" id={worker.id} name={worker.name} phone={phone} locked={locked} />
        </div>
        <ChatRequestButton otherId={worker.owner_id} otherName={worker.name} context={`Worker: ${worker.name}`} />
        <button className="wk-close" onClick={onClose}>Close</button>
      </div>
    </div>
    </div>
    </Portal>
  )
}

export default function WorkerFind({ query }) {
  const [types, setTypes] = useState([])
  const [workers, setWorkers] = useState(null)
  const [phones, setPhones] = useState({})
  const [contactsOn, setContactsOn] = useState(true)
  const [typeId, setTypeId] = useState('all')
  const [open, setOpen] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('worker_types').select('*').eq('active', true).order('sort_order').order('name'),
      supabase.from('workers').select('*').eq('status', 'approved').order('created_at', { ascending: false }).range(0, 999),
      supabase.from('worker_settings').select('show_contacts').eq('id', 1).maybeSingle(),
      supabase.from('worker_contacts').select('worker_id,phone').range(0, 999),
    ]).then(([t, w, s, c]) => {
      const err = t.error || w.error
      if (err) { setError(err.message); setWorkers([]); return }
      setTypes(t.data || [])
      setWorkers(w.data || [])
      setContactsOn(s.data ? s.data.show_contacts : true)
      const map = {}; (c.data || []).forEach(x => { map[x.worker_id] = x.phone })
      setPhones(map)
    })
  }, [])

  const typeById = useMemo(() => Object.fromEntries(types.map(t => [t.id, t])), [types])
  const counts = useMemo(() => {
    const m = {}; (workers || []).forEach(w => { m[w.work_type_id] = (m[w.work_type_id] || 0) + 1 }); return m
  }, [workers])

  const q = (query || '').trim().toLowerCase()
  const shown = (workers || []).filter(w => {
    if (!typeById[w.work_type_id]) return false // type switched off by the admin
    if (typeId !== 'all' && w.work_type_id !== typeId) return false
    if (!q) return true
    return `${w.name} ${w.address || ''} ${typeById[w.work_type_id].name}`.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="wk-chips" role="tablist">
        <button className={`wk-chip ${typeId === 'all' ? 'on' : ''}`} onClick={() => setTypeId('all')}>✨ All <small>{(workers || []).length}</small></button>
        {types.map(t => (
          <button key={t.id} className={`wk-chip ${typeId === t.id ? 'on' : ''}`} onClick={() => setTypeId(t.id)}>
            {t.icon} {t.name} {counts[t.id] ? <small>{counts[t.id]}</small> : null}
          </button>
        ))}
      </div>

      {!contactsOn && <div className="wk-note">🔒 Contact numbers are hidden by the admin for now.</div>}
      {error && <div className="wk-note bad">Could not load workers: {error}. Run <b>workers.sql</b> in Supabase.</div>}

      {workers === null && [1, 2, 3].map(i => <div className="wk-skel" key={i} />)}

      {workers && shown.map(w => (
        <WorkerCard key={w.id} worker={w} type={typeById[w.work_type_id]} phone={phones[w.id]} locked={!contactsOn || !!w.hide_phone} onOpen={() => setOpen(w)} />
      ))}

      {workers && shown.length === 0 && !error && (
        <div className="wk-empty">
          <div className="wk-empty-ico">{workers.length === 0 ? '🛠️' : '🔎'}</div>
          <div className="wk-empty-t">{workers.length === 0 ? 'No workers listed yet' : 'No worker found'}</div>
          <div className="wk-empty-s">{workers.length === 0 ? 'Workers will appear here after the admin approves them.' : 'Try another work type or a different search.'}</div>
        </div>
      )}

      {open && <Sheet worker={open} type={typeById[open.work_type_id]} phone={phones[open.id]} locked={!contactsOn || !!open.hide_phone} onClose={() => setOpen(null)} />}
    </div>
  )
}
