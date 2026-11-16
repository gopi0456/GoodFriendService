import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import WorkerForm from './WorkerForm'
import { WorkerAvatar } from './WorkerCard'
import { hueVars } from './workerApi'
import ProfileHistory from '../engage/ProfileHistory'

const STATUS = {
  pending: ['⏳ Waiting for admin approval', 'wk-st-pending'],
  approved: ['✓ Live - visible to everyone', 'wk-st-approved'],
  rejected: ['Not approved - edit and resubmit', 'wk-st-rejected'],
}

// A user registers himself as a worker (or edits his own listing). Listings always start as pending.
export default function MyWorker({ uid }) {
  const [types, setTypes] = useState([])
  const [worker, setWorker] = useState(undefined)
  const [phone, setPhone] = useState('')
  const [editing, setEditing] = useState(false)
  const [hist, setHist] = useState(false)

  const load = useCallback(async () => {
    const [t, w] = await Promise.all([
      supabase.from('worker_types').select('*').eq('active', true).order('sort_order').order('name'),
      supabase.from('workers').select('*').eq('owner_id', uid).maybeSingle(),
    ])
    setTypes(t.data || [])
    setWorker(w.data || null)
    if (w.data) {
      const c = await supabase.from('worker_contacts').select('phone').eq('worker_id', w.data.id).maybeSingle()
      setPhone(c.data?.phone || '')
    }
  }, [uid])
  useEffect(() => { load() }, [load])

  if (worker === undefined) return <div className="wk-skel" />

  if (editing) {
    return (
      <div className="wk-pad">
        <h3 className="wk-h">{worker ? 'Edit your listing' : 'Register as a worker'}</h3>
        <WorkerForm uid={uid} types={types} worker={worker} phone={phone}
          onSaved={() => { setEditing(false); load() }} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="wk-pad">
        <div className="wk-hero">
          <div className="wk-hero-ico">🛠️</div>
          <h3>Get more work</h3>
          <p>List yourself as a plumber, carpenter, POP worker or any trade. After the admin approves, people can find and call you.</p>
          <button className="wk-primary" onClick={() => setEditing(true)}>Register as a worker</button>
        </div>
      </div>
    )
  }

  const type = types.find(t => t.id === worker.work_type_id)
  const [label, cls] = STATUS[worker.status] || STATUS.pending
  return (
    <div className="wk-pad">
      <div className={`wk-status ${cls}`}>{label}</div>
      <div className="wk-card" style={hueVars(type?.name || worker.name)}>
        <WorkerAvatar worker={worker} type={type} />
        <div className="wk-card-body">
          <div className="wk-name">{worker.name}</div>
          <div className="wk-row"><span className="wk-pill">{type?.icon} {type?.name}</span></div>
          {worker.address && <div className="wk-meta">📍 {worker.address}</div>}
          <div className="wk-meta">📞 {phone}{worker.hide_phone ? ' · hidden from users by the admin' : ''}</div>
        </div>
      </div>
      <button className="wk-primary" onClick={() => setEditing(true)}>✏️ Edit my listing</button>
      <button className="wk-ghost" onClick={() => setHist(true)}>🕘 Who contacted me</button>
      {hist && <ProfileHistory kind="worker" id={worker.id} name={worker.name} onClose={() => setHist(false)} />}
    </div>
  )
}
